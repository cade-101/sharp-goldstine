import { supabase } from './supabase';

export type CrashLevel = 'nominal' | 'watch' | 'crash' | 'critical';

export type CrashResponse = {
  missionCount: number;
  missions: string[] | null;
  intensityState: 'baseline' | 'recovery' | 'survival';
  greeting: string | null;
};

export const SCIENCE_CARDS: Record<string, { title: string; body: string; link: string | null }> = {
  whyHard: {
    title: "WHY IT'S HARD RIGHT NOW",
    body: "Your brain's dopamine system is running on empty. This isn't laziness — it's neurochemistry. ADHD brains produce less dopamine at baseline. Stress depletes what's left. You're not broken. You're running a marathon on half a tank.",
    link: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4827420/',
  },
  whyDifferent: {
    title: 'WHY 3 WEEKS AGO FELT DIFFERENT',
    body: "You were in a momentum loop. Each completed task released dopamine → made the next task easier. Momentum is a neurological state, not a personality trait. It can be rebuilt. Starting with one glass of water.",
    link: null,
  },
  notLazy: {
    title: "YOU'RE NOT LAZY",
    body: "Laziness is not doing something you could easily do. What you're experiencing is doing something genuinely hard while making it look easy to everyone around you. That's the opposite of lazy.",
    link: 'https://www.additudemag.com/adhd-paralysis-causes-and-solutions/',
  },
  brainScience: {
    title: "WHAT'S HAPPENING IN YOUR BRAIN",
    body: "Executive function (planning, starting tasks, regulating emotion) runs on prefrontal cortex. Depression and ADHD both reduce blood flow there. It's genuinely harder to start things right now. Not metaphorically. Literally.",
    link: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3280612/',
  },
};

// ⚠️ Science cards require clinical review before displaying to users.
// Flag: CJ's mom to review before enabling showScienceCards = true.
export const SCIENCE_CARDS_ENABLED = false;

export async function assessCrashLevel(userId: string, healthData: any): Promise<CrashLevel> {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [eventsResult, brainStatesResult, workoutsResult] = await Promise.all([
      supabase
        .from('user_events')
        .select('event_type, metadata, created_at')
        .eq('user_id', userId)
        .gte('created_at', fiveDaysAgo),
      supabase
        .from('user_context_snapshots')
        .select('computed_at, snapshot')
        .eq('user_id', userId)
        .order('computed_at', { ascending: false })
        .limit(5),
      supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .gte('started_at', fourteenDaysAgo),
    ]);

    const events = eventsResult.data ?? [];
    const snapshots = brainStatesResult.data ?? [];

    let score = 0;

    // No missions completed in 5 days
    const missionsCompleted = events.filter(e => e.event_type === 'mission_complete').length;
    if (missionsCompleted === 0) score += 2;

    // Brain state EMERGENCY/CRITICAL repeated
    const criticalCount = snapshots.filter(s =>
      s.snapshot?.brainState === 'CRITICAL' || s.snapshot?.brainState === 'emergency'
    ).length;
    if (criticalCount >= 3) score += 3;
    else if (criticalCount >= 2) score += 1;

    // No workout in 14 days
    if ((workoutsResult.data?.length ?? 0) === 0) score += 2;

    // Poor sleep 3+ nights
    const poorSleepNights = (healthData?.recentNights ?? []).filter((n: any) => n.hours < 5).length;
    if (poorSleepNights >= 3) score += 2;

    // Caffeine/sugar spike (5+ in 5 days — Tim Hortons signal)
    const caffeineSpike = events.filter(
      e => e.event_type === 'drink_logged' && (e.metadata as any)?.drink_type === 'caffeine_sugar'
    ).length;
    if (caffeineSpike >= 5) score += 1;

    // Low HRV
    if (healthData?.hrv && healthData.hrv < 25) score += 2;

    if (score >= 7) return 'critical';
    if (score >= 4) return 'crash';
    if (score >= 2) return 'watch';
    return 'nominal';
  } catch {
    return 'nominal';
  }
}

export function getCrashResponse(level: CrashLevel): CrashResponse {
  switch (level) {
    case 'critical':
      return {
        missionCount: 1,
        missions: ['Drink a glass of water'],
        intensityState: 'survival',
        greeting: null, // just time + date, nothing else
      };
    case 'crash':
      return {
        missionCount: 2,
        missions: ['Drink a glass of water', 'Get outside for 5 minutes'],
        intensityState: 'survival',
        greeting: 'One thing today.',
      };
    case 'watch':
      return {
        missionCount: 3,
        missions: null,
        intensityState: 'recovery',
        greeting: null,
      };
    default:
      return {
        missionCount: 3,
        missions: null,
        intensityState: 'baseline',
        greeting: null,
      };
  }
}

const SCIENCE_CARD_KEYS = Object.keys(SCIENCE_CARDS);

export async function getTodayScienceCard(userId: string): Promise<typeof SCIENCE_CARDS[string] | null> {
  if (!SCIENCE_CARDS_ENABLED) return null;
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const { data: recent } = await supabase
      .from('user_events')
      .select('metadata')
      .eq('user_id', userId)
      .eq('event_type', 'science_card_shown' as any)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(2);

    const shownToday = recent?.find(r => (r.metadata as any)?.date === today);
    if (shownToday) return null; // Already shown one today

    const lastKey = recent?.[0] ? (recent[0].metadata as any)?.card_key : null;
    const available = SCIENCE_CARD_KEYS.filter(k => k !== lastKey);
    const cardKey = available[Math.floor(Math.random() * available.length)];

    await supabase.from('user_events').insert({
      user_id: userId,
      event_type: 'science_card_shown',
      metadata: { card_key: cardKey, date: today },
    });

    return SCIENCE_CARDS[cardKey];
  } catch {
    return null;
  }
}
