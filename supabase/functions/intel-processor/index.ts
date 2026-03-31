import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

// ── INCOME DETECTION ──────────────────────────────────────────────────────────
function isIncome(item: { name: string; amount: number; is_income?: boolean }): boolean {
  if (item.is_income === true) return true;
  const desc = (item.name ?? "").toLowerCase();
  return /deposit|received|payroll|direct deposit|credit/i.test(desc);
}

// ── REGEX ENVELOPE MAP ────────────────────────────────────────────────────────
const ENVELOPE_MAP: [RegExp, string][] = [
  [/tim horton|tims|starbucks|coffee/i, "coffee"],
  [/vape|vapor|smoke|tobacco|nicotine/i, "nicotine"],
  [/superstore|safeway|walmart|sobeys|no frills|iga|coop|grocery|metro|loblaws|food basics/i, "groceries"],
  [/costco/i, "groceries"],
  [/shell|esso|petro|husky|pioneer|fuel|gas station|circle k|ultramar/i, "fuel"],
  [/mcdonald|subway|pizza|kfc|burger|wendy|a&w|takeout|skip|uber eats|doordash|harvey|dairy queen|popeyes|taco bell/i, "food"],
  [/netflix|spotify|disney|crave|amazon prime|apple.*sub|youtube.*premium/i, "subscriptions"],
  [/cibc.*visa|td.*visa|rbc.*visa|scotiabank.*visa|credit card|cc payment|visa payment|mastercard payment/i, "debt_payment"],
  [/insurance|intact|wawanesa|co-operators|aviva|state farm/i, "insurance"],
  [/phone|telus|bell|rogers|koodo|virgin mobile|wind|freedom mobile/i, "phone"],
  [/andy|school|daycare|childcare|child care/i, "kids_andy"],
  [/pharmacy|shoppers|rexall|medical|dental|doctor|clinic|health|physio/i, "health"],
  [/haircut|salon|spa|barber|nails/i, "personal_care"],
  [/e-transfer|interac/i, "unknown_transfer"],
];

function categorize(name: string): string {
  for (const [re, envelope] of ENVELOPE_MAP) {
    if (re.test(name)) return envelope;
  }
  return "overflow";
}

// ── PANTRY CATEGORY MAP ───────────────────────────────────────────────────────
// Maps pantry category → pantry location tab
const PANTRY_LOCATION: Record<string, string> = {
  produce: "fridge",
  dairy: "fridge",
  meat: "fridge",
  meat_frozen: "freezer",
  frozen: "freezer",
  pantry_dry: "pantry",
  beverages: "pantry",
  condiments: "pantry",
  snacks: "pantry",
  household: "household",
  kids_item: "kids",
  personal_care: "household",
  bakery: "pantry",
};

const PANTRY_CATEGORIES = new Set(Object.keys(PANTRY_LOCATION));

function isPantryCategory(cat: string): boolean {
  return PANTRY_CATEGORIES.has(cat);
}

// ── RECURRENCE DETECTION ──────────────────────────────────────────────────────
function detectRecurrence(dates: string[]): string | null {
  if (dates.length < 2) return null;
  const sorted = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(Math.round((sorted[i] - sorted[i - 1]) / 86400000));
  }
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avg >= 5 && avg <= 9) return "weekly";
  if (avg >= 12 && avg <= 17) return "biweekly";
  if (avg >= 25 && avg <= 35) return "monthly";
  return "irregular";
}

// ── IMAGE FINGERPRINT ─────────────────────────────────────────────────────────
function imageFingerprint(b64: string): string {
  const len = b64.length;
  return b64.slice(0, 20) + b64.slice(Math.floor(len / 2) - 10, Math.floor(len / 2) + 10) + b64.slice(-20);
}

// ── UPSERT PANTRY ITEM ────────────────────────────────────────────────────────
async function upsertPantryItem(
  supabase: ReturnType<typeof createClient>,
  householdId: string,
  item: { name: string; category: string; quantity: number; unit: string; price?: number },
  store: string | null,
  userId: string,
): Promise<boolean> {
  const location = PANTRY_LOCATION[item.category] ?? "pantry";
  const now = new Date().toISOString();

  // Check if item already exists in pantry
  const { data: existing } = await supabase
    .from("pantry_items")
    .select("id, quantity")
    .eq("household_id", householdId)
    .ilike("name", item.name)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update quantity (add to existing)
    await supabase.from("pantry_items")
      .update({ quantity: (existing.quantity ?? 0) + item.quantity, purchased_at: now })
      .eq("id", existing.id);
  } else {
    // New pantry entry
    await supabase.from("pantry_items").insert({
      household_id: householdId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      location,
      purchased_at: now,
      added_via: "intel",
    });
  }

  // Always log to purchase_history
  await supabase.from("purchase_history").insert({
    user_id: userId,
    household_id: householdId,
    item_name: item.name,
    item_category: item.category,
    store: store ?? null,
    quantity: item.quantity,
    price_paid: item.price ?? null,
    purchased_at: now,
  });

  // Update household_item_preferences (rolling avg)
  const { data: pref } = await supabase
    .from("household_item_preferences")
    .select("id, last_purchased_at, avg_purchase_interval_days")
    .eq("household_id", householdId)
    .ilike("item_name", item.name)
    .limit(1)
    .maybeSingle();

  if (pref) {
    const lastMs = pref.last_purchased_at ? new Date(pref.last_purchased_at).getTime() : null;
    const nowMs = Date.now();
    let newAvg = pref.avg_purchase_interval_days ?? null;
    if (lastMs) {
      const days = Math.round((nowMs - lastMs) / 86400000);
      if (days > 1 && days < 365) {
        newAvg = newAvg ? Math.round((newAvg + days) / 2) : days;
      }
    }
    await supabase.from("household_item_preferences").update({
      last_purchased_at: now,
      usual_store: store ?? undefined,
      avg_purchase_interval_days: newAvg ?? undefined,
      updated_at: now,
    }).eq("id", pref.id);
  } else {
    await supabase.from("household_item_preferences").insert({
      household_id: householdId,
      item_name: item.name,
      usual_store: store ?? null,
      last_purchased_at: now,
      updated_at: now,
    });
  }

  return true;
}

// ── PROCESS FINANCIAL ITEMS ───────────────────────────────────────────────────
async function processFinancialItems(
  supabase: ReturnType<typeof createClient>,
  items: Array<{ name: string; amount: number; is_income?: boolean; recipient?: string }>,
  userId: string,
  fingerprint: string,
  today: string,
  dayBefore: string,
  dayAfter: string,
): Promise<{ itemsLogged: number; incomeLogged: number; clarifications: string[] }> {
  let itemsLogged = 0;
  let incomeLogged = 0;
  const clarifications: string[] = [];

  for (const item of items) {
    const amount = Math.abs(item.amount ?? 0);
    if (amount === 0) continue;

    const income = isIncome(item);

    if (income) {
      const { data: existingInc } = await supabase
        .from("income_transactions").select("id")
        .eq("user_id", userId).eq("amount", amount).eq("note", item.name)
        .gte("date", dayBefore).lte("date", dayAfter).limit(1);

      if (existingInc && existingInc.length > 0) continue;

      const { error: incErr } = await supabase.from("income_transactions").insert({
        user_id: userId, amount,
        source: item.recipient ?? item.name, note: item.name,
        category: "income", date: today, receipt_fingerprint: fingerprint,
      });

      if (incErr) {
        const { error: fbErr } = await supabase.from("income_transactions").insert({
          user_id: userId, amount,
          source: item.recipient ?? item.name, note: item.name,
          category: "income", date: today,
        });
        if (!fbErr) incomeLogged++;
      } else {
        incomeLogged++;
      }

      // Recurrence detection
      const source = item.recipient ?? item.name;
      const { data: incHistory } = await supabase.from("income_transactions")
        .select("date").eq("user_id", userId).eq("source", source)
        .order("date", { ascending: true }).limit(12);
      if (incHistory && incHistory.length >= 2) {
        const rec = detectRecurrence(incHistory.map((h: { date: string }) => h.date));
        if (rec) {
          await supabase.from("income_transactions").update({ recurrence: rec })
            .eq("user_id", userId).eq("source", source).eq("date", today);
        }
      }

    } else {
      const envelope = categorize(item.name);

      const { data: existingExp } = await supabase
        .from("budget_expenses").select("id")
        .eq("user_id", userId).eq("amount", amount).eq("note", item.name)
        .gte("date", dayBefore).lte("date", dayAfter).limit(1);

      if (existingExp && existingExp.length > 0) continue;

      if (envelope === "unknown_transfer") {
        await supabase.from("armory_clarifications").insert({
          user_id: userId, transaction_name: item.name,
          amount, date: today, recipient: item.recipient ?? null, status: "pending",
        });
        clarifications.push(item.name);

        const { error: pendErr } = await supabase.from("budget_expenses").insert({
          user_id: userId, envelope_id: "pending", amount,
          note: item.name, recipient: item.recipient ?? null,
          date: today, receipt_fingerprint: fingerprint,
        });
        if (pendErr) {
          await supabase.from("budget_expenses").insert({
            user_id: userId, envelope_id: "pending", amount, note: item.name, date: today,
          });
        }
        itemsLogged++;
        continue;
      }

      const { error: expErr } = await supabase.from("budget_expenses").insert({
        user_id: userId, envelope_id: envelope, amount,
        note: item.name, recipient: item.recipient ?? null,
        date: today, receipt_fingerprint: fingerprint,
      });

      if (expErr) {
        const { error: fbErr } = await supabase.from("budget_expenses").insert({
          user_id: userId, envelope_id: envelope, amount, note: item.name, date: today,
        });
        if (!fbErr) itemsLogged++;
      } else {
        itemsLogged++;
      }

      // Recurrence for recurring bills
      if (["debt_payment", "phone", "subscriptions", "insurance"].includes(envelope) && item.recipient) {
        const { data: history } = await supabase.from("budget_expenses")
          .select("date").eq("user_id", userId).eq("envelope_id", envelope)
          .eq("recipient", item.recipient).order("date", { ascending: true }).limit(12);
        if (history && history.length >= 2) {
          const rec = detectRecurrence(history.map((h: { date: string }) => h.date));
          if (rec) {
            await supabase.from("budget_expenses").update({ recurrence: rec })
              .eq("user_id", userId).eq("envelope_id", envelope)
              .eq("recipient", item.recipient).eq("date", today);
          }
        }
      }
    }
  }

  return { itemsLogged, incomeLogged, clarifications };
}

// ── HANDLE IMAGE INPUT ────────────────────────────────────────────────────────
async function handleImage(
  supabase: ReturnType<typeof createClient>,
  payload: {
    base64Image: string; mimeType?: string;
    userId: string; householdId?: string;
  },
  anthropicKey: string,
) {
  const { base64Image, mimeType, userId, householdId } = payload;
  const fingerprint = imageFingerprint(base64Image);
  const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Whole-image duplicate check
  const { data: dupeExpense } = await supabase.from("budget_expenses")
    .select("id").eq("user_id", userId).eq("receipt_fingerprint", fingerprint)
    .gte("created_at", since1h).limit(1).maybeSingle();
  const { data: dupeIncome } = await supabase.from("income_transactions")
    .select("id").eq("user_id", userId).eq("receipt_fingerprint", fingerprint)
    .gte("created_at", since1h).limit(1).maybeSingle();

  if (dupeExpense || dupeIncome) {
    return { itemsLogged: 0, incomeLogged: 0, pantryLogged: 0, duplicate: true };
  }

  const visionResp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType ?? "image/jpeg", data: base64Image },
          },
          {
            type: "text",
            text: `You are parsing purchase or financial evidence. This could be a store receipt, bank screenshot, grocery bag photo, product photo, Costco haul, online order screenshot, or any proof of purchase.

Extract ALL items you can identify into two groups:

GROUP 1 — FINANCIAL TRANSACTIONS (receipts, bank statements, pay stubs):
For each transaction: name, amount, is_income, recipient

GROUP 2 — PANTRY/GROCERY ITEMS (individual products, groceries, household goods):
For each product: name, quantity, unit, category, price_per_unit

Categories for pantry items (pick the best match):
produce, dairy, meat, meat_frozen, frozen, pantry_dry, beverages, condiments, snacks, household, kids_item, personal_care, bakery

RULES:
- If you see individual products (e.g., milk, eggs, bread, detergent, shampoo) → GROUP 2
- If you see a receipt total or bank transaction → GROUP 1
- A grocery receipt may have BOTH: the store charge goes in GROUP 1 (as a financial item), individual line items go in GROUP 2 (as pantry items)
- Estimate quantity as 1 if not visible. Use "unit" for things like eggs/cans, "bag" for produce bags, "L" for liquids, "kg" for meat
- For pantry items with prices, extract price_per_unit if visible, else null

Return ONLY valid JSON:
{
  "document_type": "receipt|bank_statement|pay_stub|product_photo|grocery_haul|screenshot",
  "store": "Store name or null",
  "financial_items": [
    { "name": "Superstore", "amount": 87.42, "is_income": false, "recipient": "Superstore" }
  ],
  "pantry_items": [
    { "name": "2% Milk", "quantity": 2, "unit": "L", "category": "dairy", "price_per_unit": 4.99 },
    { "name": "Chicken Breast", "quantity": 1, "unit": "kg", "category": "meat", "price_per_unit": 12.50 }
  ]
}`,
          },
        ],
      }],
    }),
  });

  if (!visionResp.ok) {
    const err = await visionResp.text();
    console.log("[intel] Anthropic error:", err.slice(0, 300));
    return { itemsLogged: 0, incomeLogged: 0, pantryLogged: 0, message: "Filed for later processing" };
  }

  const visionData = await visionResp.json();
  const raw = visionData.content?.[0]?.text ?? "{}";
  console.log("[intel] raw:", raw.slice(0, 400));

  let parsed: {
    document_type?: string;
    store?: string;
    financial_items?: Array<{ name: string; amount: number; is_income?: boolean; recipient?: string }>;
    pantry_items?: Array<{ name: string; quantity: number; unit: string; category: string; price_per_unit?: number }>;
    // legacy shape fallback
    items?: Array<{ name: string; amount: number; is_income?: boolean; recipient?: string }>;
  };

  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { itemsLogged: 0, incomeLogged: 0, pantryLogged: 0, message: "Filed for later processing" };
  }

  const today = new Date().toISOString().split("T")[0];
  const dayBefore = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const dayAfter = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  // Support legacy `items` shape
  const financialItems = parsed.financial_items ?? parsed.items ?? [];
  const pantryItems = parsed.pantry_items ?? [];

  // Process financial items
  const { itemsLogged, incomeLogged, clarifications } = await processFinancialItems(
    supabase, financialItems, userId, fingerprint, today, dayBefore, dayAfter,
  );

  // Process pantry items
  let pantryLogged = 0;
  if (householdId && pantryItems.length > 0) {
    for (const pi of pantryItems) {
      if (!pi.name || !pi.category) continue;
      if (!isPantryCategory(pi.category)) continue;
      try {
        await upsertPantryItem(supabase, householdId, {
          name: pi.name,
          category: pi.category,
          quantity: pi.quantity ?? 1,
          unit: pi.unit ?? "unit",
          price: pi.price_per_unit,
        }, parsed.store ?? null, userId);
        pantryLogged++;
      } catch (e) {
        console.log("[intel] pantry insert error:", String(e));
      }
    }
  }

  // Grocery nudge
  if (householdId && parsed.store) {
    const hasGroceries = financialItems.some(i => !isIncome(i) && categorize(i.name) === "groceries");
    if (hasGroceries || pantryLogged > 0) {
      await supabase.from("grocery_nudges").insert({
        household_id: householdId, item_name: parsed.store, store: parsed.store,
        discount_pct: 0, sale_price: 0, reason: "Receipt scanned", dismissed: false,
      }).select();
    }
  }

  return { itemsLogged, incomeLogged, pantryLogged, clarifications, store: parsed.store ?? null };
}

// ── HANDLE TEXT/VOICE INPUT ───────────────────────────────────────────────────
async function handleText(
  supabase: ReturnType<typeof createClient>,
  payload: {
    text: string; userId: string; householdId?: string;
  },
  anthropicKey: string,
) {
  const { text, userId, householdId } = payload;

  const parseResp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are parsing a brain dump from a busy parent. Extract actionable items into three groups.

Brain dump text:
"${text}"

GROUP 1 — FINANCIAL: Any mention of spending, paying, buying at a store, transactions
- name: merchant or description
- amount: dollar amount (0 if not mentioned)
- is_income: true if money coming in
- recipient: who paid/received

GROUP 2 — PANTRY/GROCERY: Any items to buy or items they have (groceries, household goods, etc.)
- name: item name
- quantity: number (1 if not specified)
- unit: "unit", "L", "kg", "bag", etc.
- category: produce|dairy|meat|frozen|pantry_dry|beverages|condiments|snacks|household|kids_item|personal_care|bakery
- action: "need" (add to shopping list) or "have" (add to pantry)

GROUP 3 — CALENDAR: Any events, appointments, tasks with a time/date
- title: event name
- date_hint: the date/time mentioned (e.g. "Thursday", "tomorrow 3pm", "March 15")
- type: "appointment"|"reminder"|"task"

Return ONLY valid JSON:
{
  "financial_items": [...],
  "pantry_items": [...],
  "calendar_items": [
    { "title": "Dentist appointment", "date_hint": "Thursday 2pm", "type": "appointment" }
  ]
}`,
      }],
    }),
  });

  if (!parseResp.ok) {
    return { itemsLogged: 0, incomeLogged: 0, pantryLogged: 0, message: "Filed for later" };
  }

  const parseData = await parseResp.json();
  const raw = parseData.content?.[0]?.text ?? "{}";

  let parsed: {
    financial_items?: Array<{ name: string; amount: number; is_income?: boolean; recipient?: string }>;
    pantry_items?: Array<{ name: string; quantity: number; unit: string; category: string; action?: string }>;
    calendar_items?: Array<{ title: string; date_hint: string; type: string }>;
  };

  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { itemsLogged: 0, incomeLogged: 0, pantryLogged: 0, message: "Filed for later" };
  }

  const today = new Date().toISOString().split("T")[0];
  const dayBefore = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const dayAfter = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const fingerprint = `text_${Date.now()}_${userId.slice(0, 8)}`;

  const financialItems = parsed.financial_items ?? [];
  const pantryItems = parsed.pantry_items ?? [];
  const calendarItems = parsed.calendar_items ?? [];

  // Process financial items
  const { itemsLogged, incomeLogged, clarifications } = await processFinancialItems(
    supabase, financialItems, userId, fingerprint, today, dayBefore, dayAfter,
  );

  // Process pantry items
  let pantryLogged = 0;
  let shoppingLogged = 0;
  const shoppingNeeds: Array<{ name: string; category: string; quantity: number; unit: string }> = [];
  if (householdId) {
    for (const pi of pantryItems) {
      if (!pi.name || !pi.category) continue;
      try {
        if (pi.action === "need") {
          // Return for client to add to shopping list
          shoppingLogged++;
          shoppingNeeds.push({ name: pi.name, category: pi.category, quantity: pi.quantity ?? 1, unit: pi.unit ?? "unit" });
        } else {
          // "have" — add to pantry
          if (isPantryCategory(pi.category)) {
            await upsertPantryItem(supabase, householdId, {
              name: pi.name,
              category: pi.category,
              quantity: pi.quantity ?? 1,
              unit: pi.unit ?? "unit",
            }, null, userId);
            pantryLogged++;
          }
        }
      } catch (e) {
        console.log("[intel] pantry/shopping insert error:", String(e));
      }
    }
  }

  return {
    itemsLogged, incomeLogged, pantryLogged,
    shoppingNeeds, clarifications, calendarItems,
  };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    console.log("[intel] request received");
    const body = await req.json();
    const { type = "image", userId, householdId } = body;

    if (!userId) return json({ error: "Missing userId" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      console.log("[intel] FAIL: ANTHROPIC_API_KEY not set");
      return json({ itemsLogged: 0, message: "Filed for later processing" });
    }

    if (type === "image") {
      const { base64Image, mimeType } = body;
      if (!base64Image) return json({ error: "Missing base64Image" }, 400);
      console.log("[intel] image | base64 length:", base64Image.length);
      const result = await handleImage(supabase, { base64Image, mimeType, userId, householdId }, anthropicKey);
      console.log("[intel] image done:", JSON.stringify(result).slice(0, 200));
      return json(result);
    }

    if (type === "text" || type === "voice") {
      const { text } = body;
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return json({ error: "Missing text" }, 400);
      }
      console.log("[intel] text | length:", text.length);
      const result = await handleText(supabase, { text: text.trim(), userId, householdId }, anthropicKey);
      console.log("[intel] text done:", JSON.stringify(result).slice(0, 200));
      return json(result);
    }

    return json({ error: "Invalid type" }, 400);

  } catch (err) {
    console.log("[intel] Unhandled error:", String(err));
    return json({ itemsLogged: 0, message: "Filed for later processing" });
  }
});
