import { supabase } from './supabase';

export interface UnlockTask {
  description: string;
  metric: string;
  target: number;
}

export interface UnlockTaskResult {
  description: string;
  target: number;
  current: number;
  complete: boolean;
}

export interface UnlockProgress {
  tasks: UnlockTaskResult[];
  totalPct: number;
}

export const THEME_UNLOCK_TASKS: Record<string, { tasks: UnlockTask[] }> = {
  spartan: { tasks: [
    { description: 'Complete 30 workouts without skipping a scheduled day', metric: 'consecutive_workout_days', target: 30 },
  ]},
  viking: { tasks: [
    { description: 'Complete 5 Joint Ops sessions with your partner', metric: 'joint_ops_count', target: 5 },
  ]},
  wendigo: { tasks: [
    { description: 'Log the app at 3am or later, 3 separate times', metric: 'late_night_logs', target: 3 },
  ]},
  pharaoh: { tasks: [
    { description: 'Have 90 days of data in the app', metric: 'total_days', target: 90 },
  ]},
  wraith: { tasks: [
    { description: 'Complete 5 grounding sessions between 10pm and 6am', metric: 'night_grounding', target: 5 },
  ]},
  druid: { tasks: [
    { description: 'Log both a workout AND grounding session on the same day, 30 times', metric: 'body_mind_days', target: 30 },
  ]},
  kraken: { tasks: [
    { description: 'Have 3 nightmare events detected by the app', metric: 'nightmare_count', target: 3 },
  ]},
  phoenix: { tasks: [
    { description: 'Return to the app after a 14+ day gap', metric: 'return_after_gap', target: 1 },
  ]},
  nebula: { tasks: [
    { description: 'Sync wearable data for 30 consecutive days', metric: 'wearable_consistency', target: 30 },
  ]},
  shogun: { tasks: [
    { description: 'Both partners use the app on the same day for 21 consecutive days', metric: 'couple_active_days', target: 21 },
  ]},
};

export async function getThemeUnlockProgress(
  userId: string,
  themeKey: string,
  householdId: string | null,
): Promise<UnlockProgress> {
  const config = THEME_UNLOCK_TASKS[themeKey.toLowerCase()];
  if (!config) return { tasks: [], totalPct: 100 };

  const results: UnlockTaskResult[] = [];

  for (const task of config.tasks) {
    let current = 0;

    try {
      switch (task.metric) {
        case 'total_days': {
          const { data: firstEvent } = await supabase
            .from('user_events')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          if (firstEvent) {
            current = Math.floor((Date.now() - new Date(firstEvent.created_at).getTime()) / 86400000);
          }
          break;
        }
        case 'nightmare_count': {
          const { count } = await supabase
            .from('nightmare_events')
            .select('id', { count: 'exact' })
            .eq('user_id', userId);
          current = count ?? 0;
          break;
        }
        case 'late_night_logs': {
          const { data } = await supabase
            .from('user_events')
            .select('created_at')
            .eq('user_id', userId);
          const lateNight = (data ?? []).filter((e: { created_at: string }) => {
            const h = new Date(e.created_at).getHours();
            return h >= 3 && h < 6;
          });
          const uniqueDays = new Set(lateNight.map((e: { created_at: string }) => e.created_at.split('T')[0]));
          current = uniqueDays.size;
          break;
        }
        case 'night_grounding': {
          const { data } = await supabase
            .from('grounding_sessions')
            .select('created_at')
            .eq('user_id', userId);
          const night = (data ?? []).filter((e: { created_at: string }) => {
            const h = new Date(e.created_at).getHours();
            return h >= 22 || h < 6;
          });
          current = night.length;
          break;
        }
        case 'joint_ops_count': {
          const { count } = await supabase
            .from('user_events')
            .select('id', { count: 'exact' })
            .eq('user_id', userId)
            .eq('event_type', 'joint_ops_complete');
          current = count ?? 0;
          break;
        }
        case 'return_after_gap': {
          const { data } = await supabase
            .from('user_events')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
          const events = data ?? [];
          let hasGap = false;
          for (let i = 1; i < events.length; i++) {
            const gap = new Date((events[i] as { created_at: string }).created_at).getTime()
              - new Date((events[i - 1] as { created_at: string }).created_at).getTime();
            if (gap >= 14 * 86400000) { hasGap = true; break; }
          }
          current = hasGap ? 1 : 0;
          break;
        }
        case 'wearable_consistency': {
          const { data } = await supabase
            .from('health_snapshots')
            .select('date')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(30);
          current = data?.length ?? 0;
          break;
        }
        case 'couple_active_days': {
          if (!householdId) { current = 0; break; }
          const { data: members } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('house_name', householdId);
          if (!members || members.length < 2) { current = 0; break; }
          const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
          const eventResults = await Promise.all(
            members.map((m: { id: string }) =>
              supabase.from('user_events').select('created_at')
                .eq('user_id', m.id).gte('created_at', thirtyDaysAgo)
            )
          );
          const daySets = eventResults.map(r =>
            new Set((r.data ?? []).map((e: { created_at: string }) => e.created_at.split('T')[0]))
          );
          if (daySets.length >= 2) {
            let sharedDays = 0;
            daySets[0].forEach(day => { if (daySets[1].has(day)) sharedDays++; });
            current = sharedDays;
          }
          break;
        }
        case 'consecutive_workout_days': {
          const { data } = await supabase
            .from('workout_sessions')
            .select('started_at')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(60);
          const sessionDays = new Set(
            (data ?? []).map((s: { started_at: string }) => s.started_at.split('T')[0])
          );
          current = sessionDays.size;
          break;
        }
        case 'body_mind_days': {
          const thirtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
          const [workouts, groundings] = await Promise.all([
            supabase.from('workout_sessions').select('started_at').eq('user_id', userId).gte('started_at', thirtyDaysAgo),
            supabase.from('grounding_sessions').select('created_at').eq('user_id', userId).gte('created_at', thirtyDaysAgo),
          ]);
          const workoutDays = new Set((workouts.data ?? []).map((s: { started_at: string }) => s.started_at.split('T')[0]));
          const groundingDays = new Set((groundings.data ?? []).map((s: { created_at: string }) => s.created_at.split('T')[0]));
          let shared = 0;
          workoutDays.forEach(day => { if (groundingDays.has(day)) shared++; });
          current = shared;
          break;
        }
        default:
          current = 0;
      }
    } catch {
      current = 0;
    }

    results.push({
      description: task.description,
      target: task.target,
      current: Math.min(current, task.target),
      complete: current >= task.target,
    });
  }

  const completedCount = results.filter(t => t.complete).length;
  const totalPct = results.length > 0 ? Math.round((completedCount / results.length) * 100) : 100;

  return { tasks: results, totalPct };
}

/** Queue a theme for the War Room unlock moment. */
export async function queueThemeUnlockReady(userId: string, themeKey: string): Promise<void> {
  const { data } = await supabase
    .from('user_profiles')
    .select('theme_unlock_ready')
    .eq('id', userId)
    .single();
  const existing: string[] = data?.theme_unlock_ready ?? [];
  if (existing.includes(themeKey)) return;
  await supabase
    .from('user_profiles')
    .update({ theme_unlock_ready: [...existing, themeKey] })
    .eq('id', userId);
}

/** Remove a theme from the unlock queue after the user chooses. */
export async function dequeueThemeUnlock(userId: string, themeKey: string): Promise<void> {
  const { data } = await supabase
    .from('user_profiles')
    .select('theme_unlock_ready')
    .eq('id', userId)
    .single();
  const existing: string[] = data?.theme_unlock_ready ?? [];
  await supabase
    .from('user_profiles')
    .update({ theme_unlock_ready: existing.filter(k => k !== themeKey) })
    .eq('id', userId);
}
