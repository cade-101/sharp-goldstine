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

const ENVELOPE_MAP: Record<string, string> = {
  grocery: "groceries",
  groceries: "groceries",
  food: "groceries",
  produce: "groceries",
  meat: "groceries",
  dairy: "groceries",
  bakery: "groceries",
  fuel: "fuel",
  gas: "fuel",
  vehicle: "vehicle",
  auto: "vehicle",
  entertainment: "entertainment",
  restaurant: "entertainment",
  dining: "entertainment",
  personal: "overflow",
  household: "groceries",
  cleaning: "groceries",
  other: "overflow",
};

function mapCategory(raw: string): string {
  const key = (raw ?? "other").toLowerCase().trim();
  return ENVELOPE_MAP[key] ?? "overflow";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const { base64Image, mimeType, userId, householdId } = await req.json();

    if (!base64Image || !userId) {
      return json({ error: "Missing required fields" }, 400);
    }

    // ── Call Anthropic Vision ───────────────────────────────────────────────
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return json({ error: "Missing API key" }, 500);

    const visionResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType ?? "image/jpeg",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: `Parse this receipt or grocery screenshot.
Extract the store name and each line item.
For each item pick ONE category from: grocery, fuel, vehicle, entertainment, household, personal, other.
Return ONLY valid JSON — no markdown, no explanation:
{
  "store": "Store Name or null",
  "items": [
    { "name": "Item Name", "price": 9.99, "category": "grocery" }
  ]
}`,
            },
          ],
        }],
      }),
    });

    if (!visionResp.ok) {
      const err = await visionResp.text();
      return json({ error: `Vision failed: ${err}` }, 500);
    }

    const visionData = await visionResp.json();
    const raw = visionData.content?.[0]?.text ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed: { store?: string; items?: Array<{ name: string; price: number; category: string }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return json({ error: "Failed to parse vision response", raw }, 422);
    }

    const items = parsed.items ?? [];
    if (items.length === 0) {
      return json({ itemsLogged: 0, routedTo: [], store: parsed.store ?? null });
    }

    // ── Log to budget_expenses ──────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date().toISOString().split("T")[0];
    const envelopesHit = new Set<string>();

    const rows = items.map((item) => {
      const envelope = mapCategory(item.category);
      envelopesHit.add(envelope);
      return {
        user_id: userId,
        envelope_id: envelope,
        amount: Math.abs(item.price ?? 0),
        note: item.name,
        date: today,
      };
    });

    await supabase.from("budget_expenses").insert(rows);

    // ── Log grocery nudge if applicable ────────────────────────────────────
    if (householdId && parsed.store) {
      const groceryItems = items.filter(
        (i) => mapCategory(i.category) === "groceries",
      );
      if (groceryItems.length > 0) {
        await supabase.from("grocery_nudges").insert({
          household_id: householdId,
          item_name: groceryItems.map((i) => i.name).join(", "),
          store: parsed.store,
          discount_pct: 0,
          sale_price: 0,
          reason: `${groceryItems.length} item${groceryItems.length !== 1 ? "s" : ""} logged from receipt`,
          dismissed: false,
        });
      }
    }

    return json({
      itemsLogged: rows.length,
      routedTo: [...envelopesHit],
      store: parsed.store ?? null,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
