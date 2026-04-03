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
      max_tokens: 512,
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
    const { userId, dailyMatrix } = await req.json();
    if (!userId || !dailyMatrix) return json({ error: "missing userId or dailyMatrix" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const prompt = `You are analyzing a user's behavioral data matrix to find meaningful correlations.

Daily data (last 14 days):
${JSON.stringify(dailyMatrix)}

Look for patterns like:
- Days with low sleep AND high caffeine_sugar_count (fight-or-flight signal)
- Days with low hrv_ms AND brain_state = emergency (recovery needed)
- Caffeine spike days followed by poor sleep
- Workout days correlating with better brain state next day
- alcohol_units correlating with next-day hrv_ms drops

Return ONLY valid JSON:
{
  "patterns": [
    {
      "signal": "short description",
      "confidence": "high|medium|low",
      "recommendation": "one gentle sentence",
      "data_points": 0
    }
  ],
  "overall_trend": "improving|stable|declining",
  "highlight": "the single most interesting pattern found"
}

Rules:
- Never diagnose. Never alarm. Just observe.
- Frame as "we noticed" not "you have"
- Only report patterns with 3+ data points
- Keep recommendations gentle and actionable
- If no meaningful patterns found, return {"patterns":[],"overall_trend":"stable","highlight":null}`;

    const result = await callAnthropic(prompt) as any;

    // Store insights alongside the daily_matrix snapshot
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("user_context_snapshots").upsert({
      user_id: userId,
      snapshot_date: today,
      daily_matrix: dailyMatrix,
      pattern_insights: result,
      computed_at: new Date().toISOString(),
    }, { onConflict: "user_id,snapshot_date" });

    return json({ success: true, insights: result });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
