import { supabase } from './supabase';
import { callEdgeFunction } from './callEdgeFunction';

export async function checkGoalUnlock(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('goal_unlocked, consistency_unlocked_at, push_token')
    .eq('id', userId)
    .single();

  if (profile?.goal_unlocked) return false;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('workout_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('started_at', thirtyDaysAgo);

  if ((count ?? 0) < 8) return false;

  await supabase
    .from('user_profiles')
    .update({
      goal_unlocked: true,
      consistency_unlocked_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profile?.push_token) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.push_token,
        title: "You've been showing up.",
        body: 'Time to pick a target. Open Tether when you have 2 minutes.',
        sound: 'default',
      }),
    }).catch(() => {});
  }

  return true;
}

export async function generateGoalOptions(userId: string) {
  try {
    const result = await callEdgeFunction('fitness-engine', {
      event: 'generate_goals',
      payload: { userId },
    }) as any;
    return result?.goals ?? [];
  } catch {
    return [];
  }
}

export async function updateGoalProgress(userId: string, exerciseName: string, currentWeight: number) {
  const { data: goal } = await supabase
    .from('user_goals')
    .select('id, goal_text, target_value, current_value')
    .eq('user_id', userId)
    .eq('goal_type', 'strength')
    .eq('achieved', false)
    .maybeSingle();

  if (!goal) return;
  if (!goal.goal_text.toLowerCase().includes(exerciseName.toLowerCase())) return;

  await supabase
    .from('user_goals')
    .update({
      current_value: currentWeight,
      achieved: goal.target_value != null && currentWeight >= goal.target_value,
      achieved_at: goal.target_value != null && currentWeight >= goal.target_value
        ? new Date().toISOString()
        : null,
    })
    .eq('id', goal.id);
}
