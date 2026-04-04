import * as Haptics from 'expo-haptics';
import { supabase } from './supabase';

type NightmareConfig = {
  sensitivity: 'light' | 'standard' | 'aggressive';
  partnerNotifyEnabled: boolean;
  calibrationComplete: boolean;
  calibrationNights: number;
  baselineHR: number | null;
  baselineHRV: number | null;
};

// HR spike thresholds above baseline per sensitivity setting
const HR_SPIKE_THRESHOLDS: Record<string, number> = {
  light: 40,
  standard: 30,
  aggressive: 20,
};

// HRV drop thresholds below baseline per sensitivity setting
const HRV_DROP_THRESHOLDS: Record<string, number> = {
  light: 20,
  standard: 15,
  aggressive: 10,
};

export async function checkNightmarePattern(
  userId: string,
  config: NightmareConfig,
  currentHR: number | null,
  currentHRV: number | null,
): Promise<string | null> {
  if (!config.calibrationComplete) return null;
  if (!currentHR && !currentHRV) return null;

  const hrThreshold = HR_SPIKE_THRESHOLDS[config.sensitivity] ?? 30;
  const hrvThreshold = HRV_DROP_THRESHOLDS[config.sensitivity] ?? 15;

  const hrSpike = currentHR && config.baselineHR
    ? currentHR - config.baselineHR
    : 0;
  const hrvDrop = currentHRV && config.baselineHRV
    ? config.baselineHRV - currentHRV
    : 0;

  const isNightmarePattern = hrSpike >= hrThreshold || hrvDrop >= hrvThreshold;
  if (!isNightmarePattern) return null;

  // Insert nightmare event
  const { data } = await supabase
    .from('nightmare_events')
    .insert({
      user_id: userId,
      hr_spike_bpm: hrSpike > 0 ? Math.round(hrSpike) : null,
      hrv_drop_ms: hrvDrop > 0 ? Math.round(hrvDrop) : null,
    })
    .select('id')
    .single();

  return data?.id ?? null;
}

export async function triggerNightmareBuzz(): Promise<void> {
  try {
    // 3 pulses — distinct from standard haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(r => setTimeout(r, 300));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(r => setTimeout(r, 300));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    // Haptics not available on this device
  }
}

export const sendWatchHaptic = triggerNightmareBuzz;

export async function acknowledgeNightmareEvent(eventId: string): Promise<void> {
  await supabase
    .from('nightmare_events')
    .update({ acknowledged: true })
    .eq('id', eventId);
}

export async function markFalsePositive(eventId: string): Promise<void> {
  await supabase
    .from('nightmare_events')
    .update({ acknowledged: true, false_positive: true })
    .eq('id', eventId);
}

export async function getRecentNightmareEvents(userId: string, limit = 10) {
  const { data } = await supabase
    .from('nightmare_events')
    .select('*')
    .eq('user_id', userId)
    .order('detected_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
