import { supabase } from './supabase';
import { callEdgeFunction } from './callEdgeFunction';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function computeWeeklyPatterns(userId: string): Promise<void> {
  // Only run if last computation was > 7 days ago
  const { data: lastSnap } = await supabase
    .from('user_context_snapshots')
    .select('computed_at')
    .eq('user_id', userId)
    .not('daily_matrix', 'is', null)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSnap?.computed_at) {
    const age = Date.now() - new Date(lastSnap.computed_at).getTime();
    if (age < SEVEN_DAYS_MS) return;
  }

  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString();
    const fourteenDaysAgoDate = fourteenDaysAgo.toISOString().split('T')[0];

    const [eventsResult, healthResult] = await Promise.all([
      supabase
        .from('user_events')
        .select('event_type, metadata, created_at')
        .eq('user_id', userId)
        .gte('created_at', fourteenDaysAgoStr)
        .order('created_at', { ascending: true }),
      supabase
        .from('health_snapshots')
        .select('date, sleep_hours, hrv_ms, steps, resting_hr, caffeine_sugar_ml, alcohol_units, water_ml')
        .eq('user_id', userId)
        .gte('date', fourteenDaysAgoDate)
        .order('date', { ascending: true }),
    ]);

    const events = eventsResult.data ?? [];
    const health = healthResult.data ?? [];

    // Build daily matrix
    const days: Record<string, any> = {};

    for (const h of health) {
      days[h.date] = { ...h };
    }
    for (const e of events) {
      const date = e.created_at.split('T')[0];
      const meta = (e.metadata ?? {}) as any;
      days[date] = days[date] ?? {};

      if (e.event_type === 'brain_state_set') {
        days[date].brain_state = meta.state;
      }
      if (e.event_type === 'drink_logged' && meta.drink_type === 'caffeine_sugar') {
        days[date].caffeine_sugar_count = (days[date].caffeine_sugar_count ?? 0) + 1;
      }
      if (e.event_type === 'workout_start') {
        days[date].worked_out = true;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    await supabase.from('user_context_snapshots').upsert({
      user_id: userId,
      snapshot_date: today,
      daily_matrix: days,
      computed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,snapshot_date' });

    // Fire pattern-engine edge function asynchronously — don't await, don't block
    callEdgeFunction('pattern-engine', { userId, dailyMatrix: days }).catch(() => {});
  } catch {
    // Non-blocking — pattern engine should never break the app
  }
}
