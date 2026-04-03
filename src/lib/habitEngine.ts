import { supabase } from './supabase';
import type { CrashLevel } from './crashDetector';

export type HabitTier = 1 | 2 | 3;

export const HABITS: Record<HabitTier, string[]> = {
  1: [
    'Drink a glass of water',
    'Brush teeth',
    'Get 800 steps',
    'Eat something today',
    'Open a window',
  ],
  2: [
    '10 min morning routine',
    'Make bed',
    '20 min movement',
    "Prep tomorrow's clothes",
    'One BLITZ mission',
  ],
  3: [
    'Full gym session',
    'Complete BLITZ',
    'Meal prep',
    'Weekly review',
    'Full Workday Rhythm day',
  ],
};

export type HabitState = {
  habitText: string;
  habitId: string;
  tier: HabitTier;
  streak: number;
  completionRate: number;
  graduated: boolean;
};

export async function getCurrentHabit(userId: string, crashLevel: CrashLevel): Promise<HabitState> {
  const defaultHabit: HabitState = {
    habitText: HABITS[1][0],
    habitId: 'water',
    tier: 1,
    streak: 0,
    completionRate: 0,
    graduated: false,
  };

  // Crash overrides everything — always water
  if (crashLevel === 'critical' || crashLevel === 'crash') return defaultHabit;

  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

    const { data: history } = await supabase
      .from('habit_tracking')
      .select('habit_id, habit_text, completed, date, tier')
      .eq('user_id', userId)
      .gte('date', fourteenDaysAgo)
      .order('date', { ascending: false });

    if (!history?.length) return defaultHabit;

    // Find current active habit (most recent non-graduated)
    const active = history.find(h => h.tier !== 0);
    if (!active) return defaultHabit;

    const sameHabit = history.filter(h => h.habit_id === active.habit_id && h.tier !== 0);
    const completed = sameHabit.filter(h => h.completed);
    const completionRate = sameHabit.length > 0 ? completed.length / Math.max(sameHabit.length, 14) : 0;

    // Count consecutive completed days
    let streak = 0;
    const sortedDates = [...completed].sort((a, b) => b.date.localeCompare(a.date));
    let prev = new Date();
    prev.setHours(0, 0, 0, 0);
    for (const row of sortedDates) {
      const d = new Date(row.date);
      const diffDays = Math.round((prev.getTime() - d.getTime()) / 86400000);
      if (diffDays <= 1) { streak++; prev = d; }
      else break;
    }

    // Graduate if 80%+ completion for 10+ distinct days
    const distinctDays = new Set(completed.map(h => h.date)).size;
    if (distinctDays >= 10 && completionRate >= 0.8) {
      await graduateHabit(userId, active.habit_id, active.tier as HabitTier);
      const nextHabit = await pickNextHabit(userId, active.tier as HabitTier);
      return { ...nextHabit, streak: 0, completionRate: 0, graduated: false };
    }

    return {
      habitText: active.habit_text ?? active.habit_id,
      habitId: active.habit_id,
      tier: (active.tier ?? 1) as HabitTier,
      streak,
      completionRate,
      graduated: false,
    };
  } catch {
    return defaultHabit;
  }
}

async function graduateHabit(userId: string, habitId: string, currentTier: HabitTier): Promise<void> {
  // Mark all entries for this habit as graduated (tier 0)
  await supabase
    .from('habit_tracking')
    .update({ tier: 0 })
    .eq('user_id', userId)
    .eq('habit_id', habitId);

  // Silent push — just acknowledgment, nothing more
  const { data: p } = await supabase
    .from('user_profiles')
    .select('push_token')
    .eq('id', userId)
    .single();

  if (p?.push_token) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: p.push_token,
        title: "You've been showing up.",
        body: 'We noticed.',
        sound: 'default',
      }),
    }).catch(() => {});
  }
}

async function pickNextHabit(userId: string, currentTier: HabitTier): Promise<HabitState> {
  // Find graduated habits to avoid repeating
  const { data: graduated } = await supabase
    .from('habit_tracking')
    .select('habit_id')
    .eq('user_id', userId)
    .eq('tier', 0);

  const graduatedIds = new Set(graduated?.map(h => h.habit_id) ?? []);

  // Try next in same tier, then next tier
  const nextTier = (currentTier < 3 ? currentTier + 1 : 3) as HabitTier;
  const candidates = HABITS[nextTier].filter(h => !graduatedIds.has(h));
  const habitText = candidates[0] ?? HABITS[nextTier][0];
  const habitId = habitText.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Insert first entry for new habit
  await supabase.from('habit_tracking').insert({
    user_id: userId,
    habit_id: habitId,
    habit_text: habitText,
    tier: nextTier,
    completed: false,
    date: new Date().toISOString().split('T')[0],
  });

  return {
    habitText,
    habitId,
    tier: nextTier,
    streak: 0,
    completionRate: 0,
    graduated: false,
  };
}

export async function logHabitComplete(userId: string, habitId: string, habitText: string, tier: HabitTier): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await supabase.from('habit_tracking').upsert({
    user_id: userId,
    habit_id: habitId,
    habit_text: habitText,
    tier,
    completed: true,
    date: today,
  }, { onConflict: 'user_id,habit_id,date' });
}
