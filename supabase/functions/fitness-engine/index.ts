import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── SYSTEM PROMPT ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an AI fitness coach for a family OS app called Tether. Users have ADHD and/or PTSD.

Rules:
- Never shame. Never lecture. Adapt silently.
- Bias toward consistency over perfection.
- Design around what users actually do, not what's ideal on paper.
- When effort is 'felt_like_shit': safety first — back off, switch body part.
- When effort is 'too_easy': small progressive challenge.
- Sneaky cardio: insert short movement prompts labeled as 'Reset walk' or 'Flush set', never 'cardio'.
- Hard stop is sacred. Always compress to fit.
- When context shows poor sleep, low brain state, or high rest days: reduce volume by 1-2 sets, prioritise feel-good movements.
- When context shows PRs trending up and high grind_good effort: bias toward progressive overload.
- Return only valid JSON. No explanation, no markdown.`;

// ── CORS ───────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

// ── SPLIT LABEL (mirrors FitnessScreen getSplitLabel) ─────────────────────────
const SPLIT_LABELS: Record<number, string[]> = {
  1: ["FULL BODY"],
  2: ["PUSH", "PULL"],
  3: ["PUSH", "PULL", "LEGS"],
  4: ["PUSH", "PULL", "LEGS", "ARMS"],
  5: ["PUSH", "PULL", "LEGS", "UPPER", "LOWER"],
  6: ["PUSH", "PULL", "LEGS", "PUSH", "PULL", "LEGS"],
};

const SPLIT_MUSCLES: Record<string, string> = {
  "PUSH":       "chest, shoulders, triceps",
  "PULL":       "back, biceps, rear delts",
  "LEGS":       "quads, hamstrings, glutes, calves",
  "ARMS":       "biceps, triceps, forearms",
  "UPPER":      "chest, back, shoulders",
  "LOWER":      "quads, hamstrings, glutes",
  "FULL BODY":  "all major muscle groups",
};

function getSplitLabel(dayNum: number, trainingDays: number[]): string | null {
  const sorted = [...trainingDays].sort((a, b) => a - b);
  const idx = sorted.indexOf(dayNum);
  if (idx === -1) return null;
  const labels = SPLIT_LABELS[sorted.length] ?? ["FULL BODY"];
  return labels[idx] ?? "FULL BODY";
}

// ── ANTHROPIC ──────────────────────────────────────────────────────────────────
async function callAnthropic(
  userMessage: string,
  maxTokens = 1024,
): Promise<unknown> {
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
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${err}`);
  }

  const data = (await resp.json()) as { content?: { text: string }[] };
  const text = data.content?.[0]?.text ?? "{}";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

// ── USER CONTEXT SNAPSHOT ──────────────────────────────────────────────────────
// Computes a daily behavior summary for Anthropic context.
// Cached for 24h in user_context_snapshots — recomputed on first session of each day.
async function getUserContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Record<string, unknown>> {
  // Check cache: fresh if < 24h old
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: cached } = await supabase
    .from("user_context_snapshots")
    .select("snapshot")
    .eq("user_id", userId)
    .gte("computed_at", since24h)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.snapshot) return cached.snapshot as Record<string, unknown>;

  // Compute fresh snapshot
  const now = new Date();
  const ago14d = new Date(now.getTime() - 14 * 86400000).toISOString();
  const ago28d = new Date(now.getTime() - 28 * 86400000).toISOString();
  const ago7d  = new Date(now.getTime() - 7  * 86400000).toISOString();

  const ago30d = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [{ data: sessions28 }, { data: perf14 }, { data: workday7 }, { data: health7 }, { count: sessions30count }, { count: sessions7count }] = await Promise.all([
    supabase.from("workout_sessions").select("started_at").eq("user_id", userId).gte("started_at", ago28d),
    supabase.from("exercise_performance").select("exercise_name, weight, reps, effort, is_pr, created_at").eq("user_id", userId).gte("created_at", ago14d),
    supabase.from("workday_sessions").select("brain_state, blocks_completed, created_at").eq("user_id", userId).gte("created_at", ago7d),
    supabase.from("health_snapshots").select("date, sleep_hours, hrv_ms, resting_hr, steps").eq("user_id", userId).gte("date", ago7d.split("T")[0]).order("date", { ascending: false }),
    supabase.from("workout_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", ago30d),
    supabase.from("workout_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", ago7d),
  ]);

  const sessions7 = (sessions28 ?? []).filter((s: any) => s.started_at >= ago7d);

  // Consistency scoring
  const s30 = sessions30count ?? 0;
  const s7 = sessions7count ?? 0;
  const consistencyScore = {
    last30Days: s30,
    last7Days: s7,
    isConsistent: s30 >= 8,   // 2x/week for a month
    isGymRat: s30 >= 12,      // 3x/week
  };

  // Cardio avoidance detection: has user ever voluntarily logged cardio?
  const { data: cardioHistory } = await supabase
    .from("exercise_performance")
    .select("exercise_name")
    .eq("user_id", userId)
    .ilike("exercise_name", "Cardio%")
    .limit(1);
  const hasLoggedCardioVoluntarily = (cardioHistory?.length ?? 0) > 0;
  const perf7 = (perf14 ?? []).filter((p: any) => p.created_at >= ago7d);

  // Effort distribution last 14d
  const effortDist: Record<string, number> = { too_easy: 0, shaky: 0, grind_good: 0, felt_like_shit: 0 };
  (perf14 ?? []).forEach((p: any) => {
    if (p.effort in effortDist) effortDist[p.effort]++;
  });

  // Top exercises by set count last 14d
  const exCounts: Record<string, number> = {};
  (perf14 ?? []).forEach((p: any) => {
    exCounts[p.exercise_name] = (exCounts[p.exercise_name] ?? 0) + 1;
  });
  const topExercises = Object.entries(exCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);

  // Brain state avg (Locked in=4, Okay=3, Scattered=2, Toast=1)
  const brainMap: Record<string, number> = { "Locked in": 4, "Okay": 3, "Scattered": 2, "Toast": 1 };
  const brainScores = (workday7 ?? []).map((w: any) => brainMap[w.brain_state] ?? 2);
  const avgBrainState = brainScores.length > 0
    ? Math.round((brainScores.reduce((a: number, b: number) => a + b, 0) / brainScores.length) * 10) / 10
    : null;

  // Rest days in a row (count backwards from today)
  const sessionDates = new Set(
    (sessions28 ?? []).map((s: any) => new Date(s.started_at).toDateString())
  );
  let restDaysInRow = 0;
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    if (sessionDates.has(d.toDateString())) break;
    restDaysInRow++;
  }

  const snapshot = {
    // Volume & frequency
    avgSessionsPerWeek: Math.round(((sessions28?.length ?? 0) / 4) * 10) / 10,
    sessionsLast7d: sessions7.length,
    totalSetsLast7d: perf7.length,
    restDaysInRow,
    // Performance
    prsLast14d: (perf14 ?? []).filter((p: any) => p.is_pr).length,
    topExercisesLast14d: topExercises,
    effortDistribution: effortDist,
    // Dominant effort signal
    dominantEffort: Object.entries(effortDist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "grind_good",
    // Wellbeing (from workday module — null if no data)
    avgBrainState7d: avgBrainState,
    // Wearable data (from health_snapshots — null if Health Connect not set up)
    sleepRolling7d: (health7 ?? []).length > 0
      ? Math.round(((health7 ?? []).reduce((s: number, h: any) => s + (h.sleep_hours ?? 0), 0) / (health7 ?? []).length) * 10) / 10
      : null,
    stepsRolling7d: (health7 ?? []).length > 0
      ? Math.round((health7 ?? []).reduce((s: number, h: any) => s + (h.steps ?? 0), 0) / (health7 ?? []).length)
      : null,
    hrvRolling7d: (health7 ?? []).filter((h: any) => h.hrv_ms != null).length > 0
      ? Math.round(((health7 ?? []).filter((h: any) => h.hrv_ms != null).reduce((s: number, h: any) => s + h.hrv_ms, 0) / (health7 ?? []).filter((h: any) => h.hrv_ms != null).length) * 10) / 10
      : null,
    latestHrv: (health7 ?? [])[0]?.hrv_ms ?? null,
    latestSleep: (health7 ?? [])[0]?.sleep_hours ?? null,
    consistency: consistencyScore,
    hasLoggedCardioVoluntarily,
    computedAt: now.toISOString(),
  };

  // Cache it
  await supabase.from("user_context_snapshots").insert({ user_id: userId, snapshot });

  return snapshot;
}

// ── FALLBACK PLANS ─────────────────────────────────────────────────────────────
const FALLBACK_PLANS: Record<number, unknown> = {
  1: {
    label: "LEGS DAY",
    exercises: [
      { id: "barbell_back_squat", name: "Barbell Back Squat", sets: 4, targetReps: "4-5", targetWeight: null, note: "Main lift — heavy, 3min rest", type: "compound", restSeconds: 180 },
      { id: "romanian_deadlift", name: "Romanian Deadlift", sets: 4, targetReps: "6-8", targetWeight: null, note: "Hamstring focus, slow descent", type: "compound", restSeconds: 120 },
      { id: "leg_press", name: "Leg Press", sets: 3, targetReps: "10-12", targetWeight: null, note: "Feet high & wide for glutes", type: "accessory", restSeconds: 90 },
      { id: "bulgarian_split_squat", name: "Bulgarian Split Squat", sets: 3, targetReps: "8 each", targetWeight: null, note: "Unilateral balance", type: "accessory", restSeconds: 90 },
      { id: "leg_curl", name: "Leg Curl", sets: 3, targetReps: "12-15", targetWeight: null, note: "Full ROM, squeeze at top", type: "accessory", restSeconds: 60 },
      { id: "standing_calf_raise", name: "Standing Calf Raise", sets: 4, targetReps: "15-20", targetWeight: null, note: "Slow & full range", type: "pump", restSeconds: 45 },
    ],
  },
  4: {
    label: "PUSH DAY",
    exercises: [
      { id: "flat_db_bench_press", name: "Flat DB Bench Press", sets: 4, targetReps: "4-6", targetWeight: null, note: "⚡ Chest weak point — full ROM, slow descent", type: "compound", restSeconds: 180 },
      { id: "incline_db_press", name: "Incline DB Press", sets: 4, targetReps: "6-8", targetWeight: null, note: "⚡ Upper chest — your gap", type: "compound", restSeconds: 120 },
      { id: "machine_chest_press", name: "Machine Chest Press", sets: 3, targetReps: "10-12", targetWeight: null, note: "Volume chest finisher", type: "accessory", restSeconds: 90 },
      { id: "seated_db_shoulder_press", name: "Seated DB Shoulder Press", sets: 4, targetReps: "8-10", targetWeight: null, note: "Controlled — no leg drive", type: "accessory", restSeconds: 90 },
      { id: "cable_lateral_raise", name: "Cable Lateral Raise", sets: 3, targetReps: "12-15", targetWeight: null, note: "Light, strict, full squeeze", type: "pump", restSeconds: 45 },
      { id: "tricep_pushdown", name: "Tricep Pushdown", sets: 3, targetReps: "12-15", targetWeight: null, note: "Lock elbows, full extension", type: "pump", restSeconds: 45 },
    ],
  },
  5: {
    label: "PULL DAY",
    exercises: [
      { id: "deadlift", name: "Deadlift", sets: 4, targetReps: "4-5", targetWeight: null, note: "Main lift — heavy, 3min rest", type: "compound", restSeconds: 180 },
      { id: "barbell_row", name: "Barbell Row", sets: 4, targetReps: "5-6", targetWeight: null, note: "Overhand, elbows back, big pull", type: "compound", restSeconds: 120 },
      { id: "lat_pulldown", name: "Lat Pulldown", sets: 3, targetReps: "10-12", targetWeight: null, note: "Wide grip, chest to bar", type: "accessory", restSeconds: 90 },
      { id: "cable_row", name: "Cable Row", sets: 3, targetReps: "12-15", targetWeight: null, note: "Close grip, full stretch & squeeze", type: "accessory", restSeconds: 75 },
      { id: "barbell_curl", name: "Barbell Curl", sets: 3, targetReps: "10-12", targetWeight: null, note: "Strict — no swinging", type: "pump", restSeconds: 60 },
      { id: "hammer_curl", name: "Hammer Curl", sets: 3, targetReps: "10-12", targetWeight: null, note: "Brachialis + forearm builder", type: "pump", restSeconds: 45 },
    ],
  },
  2: {
    label: "UPPER BODY",
    exercises: [
      { id: "db_bench_press", name: "DB Bench Press", sets: 4, targetReps: "6-8", targetWeight: null, note: "Full ROM, controlled", type: "compound", restSeconds: 120 },
      { id: "db_row", name: "DB Row", sets: 4, targetReps: "8-10", targetWeight: null, note: "Elbow close, big squeeze", type: "compound", restSeconds: 120 },
      { id: "hip_thrust", name: "Hip Thrust", sets: 4, targetReps: "10-12", targetWeight: null, note: "Glute focus — squeeze hard at top", type: "compound", restSeconds: 90 },
      { id: "shoulder_press", name: "Shoulder Press", sets: 3, targetReps: "10-12", targetWeight: null, note: "Seated or standing", type: "accessory", restSeconds: 90 },
      { id: "lateral_raise", name: "Lateral Raise", sets: 3, targetReps: "12-15", targetWeight: null, note: "Light, slow, full raise", type: "pump", restSeconds: 45 },
      { id: "bicep_curl", name: "Bicep Curl", sets: 3, targetReps: "10-12", targetWeight: null, note: "Strict, no swing", type: "pump", restSeconds: 45 },
    ],
  },
  3: {
    label: "LOWER BODY",
    exercises: [
      { id: "barbell_squat", name: "Barbell Squat", sets: 4, targetReps: "6-8", targetWeight: null, note: "Depth + control", type: "compound", restSeconds: 150 },
      { id: "romanian_deadlift", name: "Romanian Deadlift", sets: 4, targetReps: "8-10", targetWeight: null, note: "Hamstring stretch — hinge, don't squat", type: "compound", restSeconds: 120 },
      { id: "hip_thrust", name: "Hip Thrust", sets: 4, targetReps: "10-12", targetWeight: null, note: "Glute focus — squeeze hard at top", type: "compound", restSeconds: 90 },
      { id: "leg_press", name: "Leg Press", sets: 3, targetReps: "10-12", targetWeight: null, note: "Feet high for glutes", type: "accessory", restSeconds: 90 },
      { id: "leg_curl", name: "Leg Curl", sets: 3, targetReps: "12-15", targetWeight: null, note: "Full ROM both ways", type: "accessory", restSeconds: 60 },
      { id: "calf_raise", name: "Calf Raise", sets: 4, targetReps: "15-20", targetWeight: null, note: "Full range, pause at bottom", type: "pump", restSeconds: 45 },
    ],
  },
};

function getFallbackPlan(dayOfWeek: number): unknown {
  return FALLBACK_PLANS[dayOfWeek] ?? FALLBACK_PLANS[5];
}

// ── SESSION START ──────────────────────────────────────────────────────────────
async function handleSessionStart(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: Record<string, unknown>,
) {
  const hardStopMinutes = Number(payload.hardStopMinutes ?? 75);
  const mode = String(payload.mode ?? "lfg");
  const hc = (payload.healthContext ?? {}) as { sleepHours?: number | null; hrv?: number | null; restingHR?: number | null; steps?: number | null };

  // Run profile fetch, history fetch, and context computation in parallel
  const [{ data: profile }, { data: history }, context] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("theme, goals, training_days, equipment, body_focus, notes, username")
      .eq("id", userId)
      .single(),
    supabase
      .from("exercise_performance")
      .select("exercise_name, weight, reps, effort, is_pr, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80),
    getUserContext(supabase, userId),
  ]);

  // Create workout session
  const hardStopTime = new Date(Date.now() + hardStopMinutes * 60_000);
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      hard_stop_time: hardStopTime.toISOString(),
      mode,
      planned_by_ai: true,
      label: mode.toUpperCase(),
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return json({ error: "Failed to create session", detail: sessionError?.message }, 500);
  }

  const now = new Date();
  const day = now.toLocaleDateString("en-CA", { weekday: "long" });
  const todayNum = now.getDay(); // 0=Sun … 6=Sat
  const trainingDays: number[] = Array.isArray(profile?.training_days) ? profile.training_days : [];
  const splitLabel = getSplitLabel(todayNum, trainingDays);
  const splitMuscles = splitLabel ? (SPLIT_MUSCLES[splitLabel] ?? "all major muscle groups") : null;

  // Real-time health context (from device wearable, takes priority over rolling avg)
  const sleepHours = hc.sleepHours ?? (context.latestSleep as number | null);
  const hrv = hc.hrv ?? (context.latestHrv as number | null);

  const consistency = context.consistency as { last30Days: number; last7Days: number; isConsistent: boolean; isGymRat: boolean };
  const cardioVoluntary = context.hasLoggedCardioVoluntarily as boolean;

  // Build context summary for Anthropic
  const contextSummary = `
BEHAVIOR CONTEXT (use to personalise volume and intensity):
- Avg sessions/week (28d): ${context.avgSessionsPerWeek}
- Sessions this week: ${context.sessionsLast7d}
- Sessions last 30d: ${consistency.last30Days}
- Is consistent (8+ sessions/30d): ${consistency.isConsistent}
- Is gym rat (12+ sessions/30d): ${consistency.isGymRat}
- Sets logged last 7d: ${context.totalSetsLast7d}
- Rest days in a row: ${context.restDaysInRow}
- PRs hit last 14d: ${context.prsLast14d}
- Dominant effort rating last 14d: ${context.dominantEffort}
- Effort breakdown: ${JSON.stringify(context.effortDistribution)}
- Top exercises trained: ${JSON.stringify(context.topExercisesLast14d)}
- Avg workday brain state 7d (4=Locked in, 1=Toast): ${context.avgBrainState7d ?? "no data"}
- Has voluntarily logged cardio before: ${cardioVoluntary}

WEARABLE DATA (today):
- Sleep last night: ${sleepHours != null ? sleepHours + "h" : "no data"}
- HRV: ${hrv != null ? hrv + "ms" : "no data"}
- Resting HR: ${hc.restingHR != null ? hc.restingHR + "bpm" : "no data"}
- Steps today: ${hc.steps != null ? hc.steps : "no data"}
- Sleep rolling 7d avg: ${context.sleepRolling7d ?? "no data"}
- HRV rolling 7d avg: ${context.hrvRolling7d ?? "no data"}

Guidance from context:
${(context.restDaysInRow as number) >= 3 ? "- 3+ rest days: ease back in, lower intensity first exercise" : ""}
${(context.dominantEffort) === "felt_like_shit" ? "- Recent sessions felt rough: drop total volume by 2 sets, prioritise feel-good movements" : ""}
${(context.dominantEffort) === "too_easy" ? "- User is coasting: push progressive overload, suggest weight bumps" : ""}
${(context.prsLast14d as number) >= 3 ? "- On a PR streak — don't break momentum, keep progressive load" : ""}
${(context.avgBrainState7d as number | null) !== null && (context.avgBrainState7d as number) <= 2 ? "- Low brain state recently: shorter session, less complexity, compound-only" : ""}
${hrv != null && hrv < 30 ? "- HRV < 30ms (FATIGUED): reduce volume 20%, skip heavy compounds, substitute mobility or isolation work, no PR attempts" : ""}
${hrv != null && hrv >= 60 ? "- HRV > 60ms (RECOVERED): green light for PR attempts, full volume, progressive overload encouraged" : ""}
${sleepHours != null && sleepHours < 5 ? "- Sleep < 5h: compress session, no new PRs today, recovery focus — user physically cannot recover optimally" : ""}
${sleepHours != null && sleepHours >= 5 && sleepHours < 7 ? "- Sleep 5-7h: moderate intensity, avoid adding weight beyond last session's levels" : ""}`.trim();

  const prompt = `Generate a workout plan. Return only valid JSON matching the schema — no markdown, no explanation.

USER PROFILE:
- Username: ${profile?.username ?? "unknown"}
- Theme: ${profile?.theme ?? "iron"}
- Goals: ${JSON.stringify(profile?.goals ?? ["strength"])}
- Equipment: ${profile?.equipment ?? "full_gym"}
- Body focus: ${JSON.stringify(profile?.body_focus ?? [])}
- Notes: ${profile?.notes ?? "none"}
- Training days: ${JSON.stringify(profile?.training_days ?? [])}

SESSION CONTEXT:
- Mode: ${mode} (${mode === "lfg" ? "spontaneous, just get something done" : "scheduled workout per training plan"})
- Day: ${day}
- Hard stop: ${hardStopMinutes} minutes
- Equipment today: ${payload.equipment ?? profile?.equipment ?? "full_gym"}
- Injuries: ${JSON.stringify(payload.injuries ?? [])}
- Mood/brain state: ${payload.moodContext ?? "unknown"}
- Sleep context: ${payload.sleepContext ?? "unknown"}
${splitLabel
  ? `- TODAY'S SPLIT: ${splitLabel} — train ${splitMuscles}. Label the workout "${splitLabel} DAY". Do NOT train other muscle groups unless the split is FULL BODY.`
  : `- REST DAY or no training plan set — generate a light full-body maintenance session or active recovery.`
}

${contextSummary}

RECENT HISTORY (last 30 sets, newest first — use for weight suggestions and PR context):
${JSON.stringify(history?.slice(0, 30) ?? [], null, 2)}

RESPONSE SCHEMA:
{
  "label": "${splitLabel ? splitLabel + " DAY" : "FULL BODY"}",
  "exercises": [
    {
      "id": "flat_db_bench_press",
      "name": "Flat DB Bench Press",
      "sets": 4,
      "targetReps": "4-6",
      "targetWeight": 65,
      "note": "one coaching cue",
      "type": "compound",
      "restSeconds": 180
    }
  ]
}

Rules:
- Fit everything within ${hardStopMinutes} minutes. Compound = 3-4 sets, accessory = 2-3 sets.
- Order: compound lifts first, accessories after, pump/isolation last.
- 4-7 exercises total. Compress if time is tight — drop pump exercises first.
- targetWeight: pull from history if available, null if no history.
- restSeconds: compound 150-180, accessory 75-105, pump 45-60.
- If theme is 'form': include Hip Thrust, prefer DB over barbell on upper body, no heavy deadlifts.
- If injuries listed: skip or substitute affected movements silently.
- If mode is 'lfg': prioritise the user's strongest movements for a confidence hit.
- TODAY'S SPLIT is already decided above — do not override it based on history.

CARDIO REQUIREMENT (mandatory — every session must include cardiovascular work):
${cardioVoluntary
  ? `- This user has logged cardio voluntarily. Label it correctly: Elliptical, Run, Bike, etc. Include as a dedicated exercise block (type: "cardio", sets: 1, targetReps: "15-20 min", restSeconds: 0).`
  : `- This user avoids or has never logged cardio. Disguise it — NEVER use the word "cardio":
  - Start of workout: add "Pump-up circuit" (jumping jacks + high knees, 3 min, type: "warmup")
  - End of workout: add "Finisher" (AMRAP or bodyweight burnout, 5 min, type: "pump")
  - If a no-rest superset fits the session: include it mid-workout (label it as two back-to-back exercises with restSeconds: 0 between them)
  - Do not explain the cardiovascular benefit. Just include the work.`
}`;

  console.log("[fitness-engine] session_start prompt preview:", prompt.slice(0, 600));
  console.log("[fitness-engine] split:", splitLabel, "| day:", day, "| todayNum:", todayNum, "| trainingDays:", JSON.stringify(trainingDays));

  let plan: unknown;
  try {
    plan = await callAnthropic(prompt, 1024);
    console.log("[fitness-engine] Anthropic response label:", (plan as any)?.label);
  } catch (e) {
    console.error("[fitness-engine] Anthropic call failed:", String(e));
    plan = getFallbackPlan(new Date().getDay());
  }

  return json({ sessionId: session.id, plan, context });
}

// ── SET COMPLETED ──────────────────────────────────────────────────────────────
async function handleSetCompleted(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string,
  payload: Record<string, unknown>,
) {
  const exerciseName = String(payload.exerciseName ?? "");
  const weight = Number(payload.weight ?? 0);
  const reps = Number(payload.reps ?? 0);
  const effort = String(payload.effort ?? "grind_good");
  const setIndex = Number(payload.setIndex ?? 0);
  const remainingMinutes = Number(payload.remainingMinutes ?? 45);

  // PR detection
  const { data: best } = await supabase
    .from("exercise_performance")
    .select("weight, reps")
    .eq("user_id", userId)
    .eq("exercise_name", exerciseName)
    .gt("weight", 0)
    .order("weight", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isPR =
    !best ||
    weight > Number(best.weight) ||
    (weight === Number(best.weight) && reps > Number(best.reps));

  await supabase.from("exercise_performance").insert({
    session_id: sessionId,
    user_id: userId,
    exercise_name: exerciseName,
    set_index: setIndex,
    weight,
    reps,
    effort,
    is_pr: isPR,
  });

  const prompt = `A set was completed. Return only valid JSON — no markdown, no explanation.

COMPLETED SET:
- Exercise: ${exerciseName}
- Weight: ${weight}kg
- Reps: ${reps}
- Effort: ${effort}
- Is PR: ${isPR}
- Set index: ${setIndex}

REMAINING TIME: ${remainingMinutes} minutes

REMAINING PLAN:
${JSON.stringify(payload.currentPlan ?? [], null, 2)}

RESPONSE SCHEMA:
{
  "restSeconds": 105,
  "nextExercise": {
    "id": "cable_row",
    "name": "Cable Row",
    "sets": 3,
    "targetReps": "10-12",
    "targetWeight": 55,
    "note": "one coaching cue",
    "type": "accessory",
    "restSeconds": 90
  },
  "adjustments": ["Keep bench at this weight — solid grind."],
  "sneakyCardio": null
}

Rules:
- effort 'too_easy': suggest slight weight increase next set.
- effort 'shaky': suggest backing off weight. Trim remaining sets if time tight.
- effort 'grind_good': maintain load. Small bump if last set of exercise.
- effort 'felt_like_shit': safety first. Remove all remaining sets this exercise. Switch body part. No shame.
- nextExercise: first fitting exercise from currentPlan. null if session should end.
- restSeconds: compound 150-180, accessory 75-105, pump 45-60. Compress hard if < 10 min remaining.
- sneakyCardio: include if > 3 compound sets without a movement break. Label 'Reset walk' (60s) or 'Flush set'. Never use word 'cardio'.
${isPR ? "- isPR is true: acknowledgment allowed in adjustments — short, punchy, not over-the-top." : ""}`;

  let diff: unknown;
  try {
    diff = await callAnthropic(prompt, 512);
  } catch (_e) {
    const currentPlan = payload.currentPlan as unknown[] | undefined;
    diff = {
      restSeconds: effort === "felt_like_shit" ? 60 : remainingMinutes < 10 ? 45 : 90,
      nextExercise: currentPlan?.[0] ?? null,
      adjustments: [],
      sneakyCardio: null,
    };
  }

  return json({ isPR, ...(diff as Record<string, unknown>) });
}

// ── EXERCISE SKIPPED ───────────────────────────────────────────────────────────
async function handleExerciseSkipped(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string,
  payload: Record<string, unknown>,
) {
  const exerciseName = String(payload.exerciseName ?? "");
  const remainingMinutes = Number(payload.remainingMinutes ?? 45);

  await supabase.from("exercise_performance").insert({
    session_id: sessionId,
    user_id: userId,
    exercise_name: exerciseName,
    set_index: 0,
    weight: 0,
    reps: 0,
    effort: "skipped",
    is_pr: false,
  });

  const prompt = `An exercise was skipped. Return only valid JSON — no markdown, no explanation.

SKIPPED: ${exerciseName}
REMAINING TIME: ${remainingMinutes} minutes

REMAINING PLAN:
${JSON.stringify(payload.currentPlan ?? [], null, 2)}

RESPONSE SCHEMA:
{
  "nextExercise": {
    "id": "lat_pulldown",
    "name": "Lat Pulldown",
    "sets": 3,
    "targetReps": "10-12",
    "targetWeight": null,
    "note": "one coaching cue",
    "type": "accessory",
    "restSeconds": 90
  },
  "adjustments": []
}

Rules:
- Drop the skipped exercise entirely. No mention of it in adjustments.
- Pick next fitting exercise from currentPlan.
- adjustments: empty unless plan needs significant restructuring.`;

  let diff: unknown;
  try {
    diff = await callAnthropic(prompt, 256);
  } catch (_e) {
    const currentPlan = payload.currentPlan as unknown[] | undefined;
    diff = { nextExercise: currentPlan?.[0] ?? null, adjustments: [] };
  }

  return json(diff);
}

// ── SESSION END ────────────────────────────────────────────────────────────────
async function handleSessionEnd(
  supabase: ReturnType<typeof createClient>,
  _userId: string,
  sessionId: string,
  payload: Record<string, unknown>,
) {
  const endedAt = new Date().toISOString();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("started_at, label")
    .eq("id", sessionId)
    .single();

  await supabase.from("workout_sessions").update({ ended_at: endedAt }).eq("id", sessionId);

  const durationSeconds = session?.started_at
    ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
    : 0;

  return json({
    summary: {
      label: session?.label ?? "Session",
      setsCompleted: payload.completedSets ?? 0,
      prsHit: payload.prsHit ?? [],
      durationSeconds,
      endedAt,
    },
  });
}

// ── JOINT OPS START ────────────────────────────────────────────────────────────
async function handleJointOpsStart(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  partnerId: string | null,
  payload: Record<string, unknown>,
) {
  const hardStopMinutes = Number(payload.hardStopMinutes ?? 75);

  // Fetch both users' profiles and recent history in parallel
  const ids = [userId, ...(partnerId ? [partnerId] : [])];

  const [{ data: profiles }, { data: history }, context] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, username, theme, goals, equipment, body_focus, notes")
      .in("id", ids),
    supabase
      .from("exercise_performance")
      .select("user_id, exercise_name, weight, reps, effort, is_pr, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false })
      .limit(60),
    getUserContext(supabase, userId),
  ]);

  const myProfile = profiles?.find((p: any) => p.id === userId);
  const partnerProfile = profiles?.find((p: any) => p.id === partnerId);

  // Create a workout session for this user
  const hardStopTime = new Date(Date.now() + hardStopMinutes * 60_000);
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      hard_stop_time: hardStopTime.toISOString(),
      mode: "joint_ops",
      planned_by_ai: true,
      label: "JOINT OPS",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return json({ error: "Failed to create session", detail: sessionError?.message }, 500);
  }

  const day = new Date().toLocaleDateString("en-CA", { weekday: "long" });

  // Equipment: use the more restrictive of the two profiles
  const equipment = payload.equipment ?? myProfile?.equipment ?? partnerProfile?.equipment ?? "full_gym";

  const myHistory = (history ?? []).filter((r: any) => r.user_id === userId).slice(0, 30);
  const partnerHistory = (history ?? []).filter((r: any) => r.user_id === partnerId).slice(0, 30);

  const prompt = `Generate a Joint Ops workout — one plan for two people training head-to-head at the same time. Return only valid JSON — no markdown, no explanation.

PERSON A: ${myProfile?.username ?? "Partner A"} (theme: ${myProfile?.theme ?? "iron"})
- Goals: ${JSON.stringify(myProfile?.goals ?? ["strength"])}
- Body focus: ${JSON.stringify(myProfile?.body_focus ?? [])}
- Notes: ${myProfile?.notes ?? "none"}
- Recent history (newest first): ${JSON.stringify(myHistory, null, 2)}

${partnerProfile ? `PERSON B: ${partnerProfile.username ?? "Partner B"} (theme: ${partnerProfile.theme ?? "iron"})
- Goals: ${JSON.stringify(partnerProfile.goals ?? ["strength"])}
- Body focus: ${JSON.stringify(partnerProfile.body_focus ?? [])}
- Notes: ${partnerProfile.notes ?? "none"}
- Recent history (newest first): ${JSON.stringify(partnerHistory, null, 2)}` : "PERSON B: No profile found — generate for Person A only."}

SESSION CONTEXT:
- Day: ${day}
- Hard stop: ${hardStopMinutes} minutes
- Equipment: ${equipment}

Behavior context for Person A:
- Avg sessions/week (28d): ${context.avgSessionsPerWeek}
- Sessions this week: ${context.sessionsLast7d}
- Rest days in a row: ${context.restDaysInRow}
- Dominant effort: ${context.dominantEffort}
- PRs last 14d: ${context.prsLast14d}

RESPONSE SCHEMA:
{
  "label": "JOINT OPS — PUSH DAY",
  "exercises": [
    {
      "id": "flat_db_bench_press",
      "name": "Flat DB Bench Press",
      "sets": 4,
      "targetReps": "6-8",
      "targetWeight": null,
      "note": "one coaching cue",
      "type": "compound",
      "restSeconds": 120
    }
  ]
}

Rules:
- Same exercises for both people — they compete set-for-set.
- 4-6 exercises. Fit within ${hardStopMinutes} minutes including rest.
- Choose movements where both people can use independent equipment (DB/cable/machine preferred over single barbell).
- Order: compound first, then accessory, then pump.
- restSeconds: compound 90-120, accessory 60-90, pump 45. Shorter than solo — competition energy keeps rest natural.
- If both users have different weak points, pick movements that hit both. Overlap > specificity.
- targetWeight: null (each person sets their own load — they're competing on effort and reps, not matched weight).
- label: include "JOINT OPS — " prefix.`;

  let plan: unknown;
  try {
    plan = await callAnthropic(prompt, 1024);
  } catch (_e) {
    plan = getFallbackPlan(new Date().getDay());
  }

  return json({ sessionId: session.id, plan });
}

// ── WEEKLY BRIEF ──────────────────────────────────────────────────────────────
async function handleWeeklyBrief(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  const trainingDays = (payload.trainingDays as number[]) ?? [];
  const weekStartDate = (payload.weekStartDate as string) ?? new Date().toISOString().split("T")[0];

  if (!trainingDays.length) {
    return json({ weekTheme: "Rest week — no training days set", dayBriefs: {}, monthPhase: "Prep", weeklyTarget: "Set your training days" });
  }

  // Build split map for each training day
  const sorted = [...trainingDays].sort((a, b) => a - b);
  const labels = SPLIT_LABELS[sorted.length] ?? ["FULL BODY"];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const dayLines = sorted.map((dayNum, i) => {
    const split = labels[i] ?? "FULL BODY";
    const muscles = SPLIT_MUSCLES[split] ?? "all muscle groups";
    return `- ${DAY_NAMES[dayNum]} (day ${dayNum}): ${split} — ${muscles}`;
  }).join("\n");

  // Recent session context
  const ago28d = new Date(Date.now() - 28 * 86400000).toISOString();
  const { data: recentSessions } = await supabase
    .from("workout_sessions")
    .select("label, date, started_at")
    .eq("user_id", userId)
    .gte("started_at", ago28d)
    .order("started_at", { ascending: false })
    .limit(6);

  const sessionSummary = (recentSessions ?? []).length > 0
    ? (recentSessions ?? []).map((s: Record<string, string>) => `${s.date}: ${s.label}`).join(", ")
    : "No recent sessions";

  // Week number in month
  const weekStart = new Date(weekStartDate);
  const monthWeek = Math.ceil(weekStart.getDate() / 7);

  const prompt = `Generate a weekly training brief for a home gym athlete. Keep it punchy and direct — no fluff.

TRAINING DAYS THIS WEEK:
${dayLines}

RECENT SESSIONS (last 28 days): ${sessionSummary}
WEEK: Week ${monthWeek} of ${weekStart.toLocaleString("en-US", { month: "long" })}

Return ONLY valid JSON:
{
  "weekTheme": "Short punchy theme e.g. 'Strength focus — push the main lifts'",
  "dayBriefs": {
    "${sorted[0]}": { "focus": "Primary focus 1 line", "mainLifts": ["Lift 1", "Lift 2", "Lift 3"], "note": "Optional coaching note — ⚡ if weak point week" }
  },
  "monthPhase": "e.g. Volume building | Intensity peak | Deload",
  "weeklyTarget": "e.g. 3 sessions, progressive overload on squat and bench"
}

Include a dayBriefs entry for each training day number: ${sorted.join(", ")}.
Match the main lifts to the split (PUSH = bench/shoulder press/triceps, PULL = deadlift/row/pulldown, LEGS = squat/RDL/leg press).`;

  let brief: Record<string, unknown>;
  try {
    brief = await callAnthropic(prompt, 600) as Record<string, unknown>;
  } catch {
    // Fallback brief
    const dayBriefs: Record<string, unknown> = {};
    sorted.forEach((dayNum, i) => {
      const split = labels[i] ?? "FULL BODY";
      dayBriefs[String(dayNum)] = {
        focus: SPLIT_MUSCLES[split] ?? "Full body",
        mainLifts: split === "PUSH" ? ["Bench Press", "Shoulder Press", "Tricep Work"]
          : split === "PULL" ? ["Deadlift", "Barbell Row", "Lat Pulldown"]
          : split === "LEGS" ? ["Squat", "RDL", "Leg Press"]
          : ["Main compound", "Accessory", "Finisher"],
      };
    });
    brief = {
      weekTheme: "Stay consistent — every rep counts",
      dayBriefs,
      monthPhase: "Building",
      weeklyTarget: `${sorted.length} sessions this week`,
    };
  }

  return json(brief);
}

// ── MAIN ROUTER ────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as {
      event: string;
      userId: string;
      partnerId?: string | null;
      sessionId?: string;
      payload: Record<string, unknown>;
    };

    const { event, userId, partnerId = null, sessionId = "", payload } = body;

    if (!userId) return json({ error: "userId required" }, 400);
    if (!payload) return json({ error: "payload required" }, 400);

    switch (event) {
      case "session_start":
        return handleSessionStart(supabase, userId, payload);
      case "joint_ops_start":
        return handleJointOpsStart(supabase, userId, partnerId, payload);
      case "set_completed":
        return handleSetCompleted(supabase, userId, sessionId, payload);
      case "exercise_skipped":
        return handleExerciseSkipped(supabase, userId, sessionId, payload);
      case "session_end":
        return handleSessionEnd(supabase, userId, sessionId, payload);
      case "weekly_brief":
        return handleWeeklyBrief(supabase, userId, payload);
      default:
        return json({ error: `Unknown event type: ${event}` }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
