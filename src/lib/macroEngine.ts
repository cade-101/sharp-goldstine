import { supabase } from './supabase';
import { logEvent } from './logEvent';

export async function checkMacroTierUnlock(userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('macro_tier, goal_unlocked, push_token')
    .eq('id', userId)
    .single();

  if (!profile?.goal_unlocked) return;
  if ((profile?.macro_tier ?? 0) >= 1) return;

  await supabase
    .from('user_profiles')
    .update({ macro_tier: 1 })
    .eq('id', userId);

  if (profile?.push_token) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.push_token,
        title: 'Fuel unlocked.',
        body: "One number. Protein. That's it for now. Open the War Room.",
        sound: 'default',
      }),
    }).catch(() => {});
  }
}

export function getDailyProteinTarget(sessionsLast30: number): number {
  if (sessionsLast30 >= 16) return 180;
  if (sessionsLast30 >= 10) return 160;
  if (sessionsLast30 >= 6)  return 140;
  return 120;
}

export function getDailyCalorieTarget(sessionsLast30: number): number {
  if (sessionsLast30 >= 16) return 2800;
  if (sessionsLast30 >= 10) return 2500;
  return 2200;
}

export async function logNutrition(userId: string, data: {
  protein_g?: number;
  calories?: number;
  carbs_g?: number;
  fat_g?: number;
  water_ml?: number;
  log_level: 'simple' | 'standard' | 'full';
}): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await supabase.from('nutrition_logs').upsert({
    user_id: userId,
    date: today,
    ...data,
  }, { onConflict: 'user_id,date' });

  await logEvent(userId, 'nutrition_logged' as any, { log_level: data.log_level });
}
