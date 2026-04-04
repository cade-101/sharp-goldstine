import { supabase } from './supabase';
import { logEvent } from './logEvent';

export async function awardOpsPoints(userId: string, amount: number, reason: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('ops_points')
      .eq('id', userId)
      .single();
    const current = data?.ops_points ?? 0;
    await supabase
      .from('user_profiles')
      .update({ ops_points: current + amount })
      .eq('id', userId);
    logEvent(userId, 'ops_points_earned' as any, { amount, reason, total: current + amount }).catch(() => {});
  } catch {
    // Non-blocking
  }
}
