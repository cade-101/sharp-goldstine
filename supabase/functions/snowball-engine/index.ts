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

async function callAnthropic(prompt: string): Promise<unknown> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await resp.json() as { content?: { text: string }[] };
  const text = data.content?.[0]?.text ?? "{}";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { userId, trigger } = await req.json() as { userId: string; trigger: "payday" | "weekly" | "manual" };
    if (!userId) return json({ error: "missing userId" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [expensesResult, committedResult, debtsResult, incomeResult, profileResult] = await Promise.all([
      supabase
        .from("budget_expenses")
        .select("envelope_id, amount, date")
        .eq("user_id", userId)
        .gte("date", thirtyDaysAgo.split("T")[0]),
      supabase
        .from("committed_bills")
        .select("merchant, amount, due_day, account")
        .eq("user_id", userId),
      supabase
        .from("debt_accounts")
        .select("name, predicted_balance, minimum_payment, interest_rate, snowball_priority")
        .eq("user_id", userId)
        .eq("active", true)
        .order("predicted_balance", { ascending: true }),
      supabase
        .from("budget_expenses")
        .select("amount, date")
        .eq("user_id", userId)
        .eq("envelope_id", "income")
        .gte("date", thirtyDaysAgo.split("T")[0]),
      supabase
        .from("user_profiles")
        .select("push_token")
        .eq("id", userId)
        .single(),
    ]);

    const expenses = expensesResult.data ?? [];
    const committed = committedResult.data ?? [];
    const debts = debtsResult.data ?? [];
    const income = incomeResult.data ?? [];
    const pushToken = profileResult.data?.push_token;

    const totalIncome = income.reduce((s, r) => s + (r.amount ?? 0), 0);

    // Aggregate spending by envelope
    const spendingByCategory: Record<string, number> = {};
    for (const e of expenses) {
      if (e.envelope_id === "income") continue;
      spendingByCategory[e.envelope_id] = (spendingByCategory[e.envelope_id] ?? 0) + (e.amount ?? 0);
    }

    const prompt = `You are a financial coach for someone with ADHD.
Give ONE action only. Never overwhelm.

Income last 30 days: $${totalIncome.toFixed(2)}
Committed bills: ${JSON.stringify(committed)}
Spending by category: ${JSON.stringify(spendingByCategory)}
Debts (snowball order — smallest first): ${JSON.stringify(debts)}
Trigger: ${trigger ?? "manual"}

Rules:
- ONE action only
- Dollar amount must be specific
- Account must be specific
- Time must be specific if relevant
- No financial jargon
- No lectures
- If trigger is payday: give the transfer sequence for today
- If trigger is weekly: give the single best move this week
- If debts exist: always include snowball payment in payday sequence

Return ONLY JSON:
{
  "action": "Transfer $X from [account] to [account/debt]",
  "why": "one sentence, plain language",
  "timing": "do this now / by Friday / this weekend",
  "category": "debt|buffer|savings|envelope"
}`;

    const result = await callAnthropic(prompt) as any;

    // Send push
    if (pushToken && result?.action) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: pushToken,
          title: "💰 Your move",
          body: result.action,
          data: { type: "snowball_action", ...result },
          sound: "default",
        }),
      });
    }

    // Log event
    await supabase.from("user_events").insert({
      user_id: userId,
      event_type: "snowball_action_sent",
      metadata: { trigger, action: result?.action },
      created_at: new Date().toISOString(),
    });

    return json({ success: true, result });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
