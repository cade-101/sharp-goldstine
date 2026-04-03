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

async function getAccountBalance(
  supabase: any,
  userId: string,
  account: string,
): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  const { data: income } = await supabase
    .from("budget_expenses")
    .select("amount")
    .eq("user_id", userId)
    .eq("envelope_id", "income")
    .eq("account", account)
    .gte("date", thirtyDaysAgo);

  const { data: expenses } = await supabase
    .from("budget_expenses")
    .select("amount")
    .eq("user_id", userId)
    .eq("account", account)
    .neq("envelope_id", "income")
    .gte("date", thirtyDaysAgo);

  const totalIn  = (income ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
  const totalOut = (expenses ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
  return totalIn - totalOut;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { userId } = await req.json() as { userId: string };
    if (!userId) return json({ error: "missing userId" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    const todayDay = today.getDate();

    const [committedResult, profileResult] = await Promise.all([
      supabase
        .from("committed_bills")
        .select("merchant, amount, due_day, account, is_auto_pay")
        .eq("user_id", userId)
        .eq("active", true),
      supabase
        .from("user_profiles")
        .select("push_token")
        .eq("id", userId)
        .single(),
    ]);

    const committed = committedResult.data ?? [];
    const pushToken = profileResult.data?.push_token;

    // Bills due in next 48 hours
    const upcoming = committed.filter((bill: any) => {
      const daysUntil = bill.due_day - todayDay;
      return daysUntil >= 0 && daysUntil <= 2;
    });

    if (!upcoming.length) {
      return json({ checked: true, alerts: 0 });
    }

    const BUFFER = 50; // Always keep $50 in account
    const alerts: any[] = [];

    for (const bill of upcoming) {
      const balance = await getAccountBalance(supabase, userId, bill.account);
      const needed = bill.amount + BUFFER;
      if (balance < needed) {
        const shortfall = Math.ceil(needed - balance);
        const dueText = bill.due_day === todayDay ? "today" : "tomorrow";
        alerts.push({
          bill: bill.merchant,
          amount: bill.amount,
          account: bill.account,
          dueDay: bill.due_day,
          shortfall,
          action: `Transfer $${shortfall} to ${bill.account} — ${bill.merchant} hits ${dueText}`,
        });
      }
    }

    // Send one push per alert
    for (const alert of alerts) {
      if (pushToken) {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: pushToken,
            title: "⚠️ Transfer needed",
            body: alert.action,
            data: { type: "buffer_alert", ...alert },
            sound: "default",
          }),
        });
      }
    }

    // Log
    await supabase.from("user_events").insert({
      user_id: userId,
      event_type: "buffer_check",
      metadata: { billsChecked: upcoming.length, alertsFired: alerts.length },
      created_at: new Date().toISOString(),
    });

    return json({ checked: true, alerts: alerts.length, details: alerts });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
