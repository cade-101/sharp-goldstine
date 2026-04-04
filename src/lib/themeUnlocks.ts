import { supabase } from './supabase';

export type UnlockMetric =
  | 'workout_days'
  | 'budget_days'
  | 'module_days'
  | 'wearable_consistency';

export type ThemeUnlockState = 'locked' | 'bridging' | 'unlocked';

export type ThemeProgressEntry = {
  state: ThemeUnlockState;
  current: number;
  target: number;
  bridgeStartedAt: string | null;
  unlockedAt: string | null;
  glitchReadyAt?: string | null;
};

export type ThemeProgressMap = Record<string, ThemeProgressEntry>;

type HiddenThemeConfig = {
  key: string;
  fullKey: string;
  bridgeKey: string;
  metric: UnlockMetric;
  target: number;
  bridgeDays: number;
};

export const HIDDEN_THEME_CONFIGS: HiddenThemeConfig[] = [
  { key: 'marauder',   fullKey: 'MARAUDER',   bridgeKey: 'DUSTMARK',    metric: 'workout_days',        target: 60, bridgeDays: 3 },
  { key: 'blacktide',  fullKey: 'BLACKTIDE',  bridgeKey: 'LOWTIDE',     metric: 'budget_days',         target: 45, bridgeDays: 3 },
  { key: 'frostborn',  fullKey: 'FROSTBORN',  bridgeKey: 'THAWLINE',    metric: 'workout_days',        target: 90, bridgeDays: 4 },
  { key: 'mimic',      fullKey: 'MIMIC',      bridgeKey: 'GLASSVEIL',   metric: 'module_days',         target: 60, bridgeDays: 4 },
  { key: 'synthraid',  fullKey: 'SYNTHRAID',  bridgeKey: 'STATICDRIFT', metric: 'wearable_consistency',target: 50, bridgeDays: 5 },
  { key: 'elven',      fullKey: 'ELVEN',      bridgeKey: 'GREENLEAF',   metric: 'module_days',         target: 45, bridgeDays: 5 },
];

export function createInitialThemeProgress(): ThemeProgressMap {
  const progress: ThemeProgressMap = {};
  for (const config of HIDDEN_THEME_CONFIGS) {
    progress[config.key] = { state: 'locked', current: 0, target: config.target, bridgeStartedAt: null, unlockedAt: null };
  }
  return progress;
}

function shouldStartBridge(entry: ThemeProgressEntry): boolean {
  return entry.state === 'locked' && entry.current >= entry.target;
}

function shouldCompleteBridge(entry: ThemeProgressEntry, bridgeDays: number): boolean {
  if (entry.state !== 'bridging' || !entry.bridgeStartedAt) return false;
  const elapsed = Date.now() - new Date(entry.bridgeStartedAt).getTime();
  return elapsed >= bridgeDays * 24 * 60 * 60 * 1000;
}

async function queueBridgeNotification(userId: string, config: HiddenThemeConfig): Promise<void> {
  const { data: p } = await supabase
    .from('user_profiles')
    .select('push_token')
    .eq('id', userId)
    .single();
  if (!p?.push_token) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: p.push_token,
      title: 'NEW ERA DETECTED',
      body: 'An unknown signal is forming. Keep going.',
      sound: 'default',
      data: { type: 'bridge_detected', themeKey: config.key },
    }),
  }).catch(() => {});
}

async function queueUnlockNotification(userId: string, config: HiddenThemeConfig): Promise<void> {
  const { data: p } = await supabase
    .from('user_profiles')
    .select('push_token')
    .eq('id', userId)
    .single();
  if (!p?.push_token) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: p.push_token,
      title: 'ERA UNLOCKED',
      body: `${config.fullKey} is now available. Open Tether.`,
      sound: 'default',
      data: { type: 'era_unlocked', themeKey: config.key },
    }),
  }).catch(() => {});
}

export async function incrementThemeMetric(
  userId: string,
  metric: UnlockMetric,
  value = 1,
): Promise<void> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('theme_progress')
      .eq('id', userId)
      .single();

    const progress: ThemeProgressMap = data?.theme_progress ?? createInitialThemeProgress();

    const affected = HIDDEN_THEME_CONFIGS.filter(c => c.metric === metric);
    let changed = false;

    for (const config of affected) {
      const entry = progress[config.key] ?? { state: 'locked', current: 0, target: config.target, bridgeStartedAt: null, unlockedAt: null };

      if (entry.state === 'unlocked') continue;

      if (entry.state === 'locked') {
        const prevCurrent = entry.current;
        entry.current = Math.min(entry.current + value, entry.target);
        // Set glitch flag when crossing 50% for the first time
        if (!entry.glitchReadyAt && entry.current / entry.target >= 0.5 && prevCurrent / entry.target < 0.5) {
          entry.glitchReadyAt = new Date().toISOString();
        }
        if (shouldStartBridge(entry)) {
          entry.state = 'bridging';
          entry.bridgeStartedAt = new Date().toISOString();
          changed = true;
          queueBridgeNotification(userId, config).catch(() => {});
        } else {
          changed = true;
        }
      }

      if (entry.state === 'bridging' && shouldCompleteBridge(entry, config.bridgeDays)) {
        entry.state = 'unlocked';
        entry.unlockedAt = new Date().toISOString();
        changed = true;
        queueUnlockNotification(userId, config).catch(() => {});
      }

      progress[config.key] = entry;
    }

    if (changed) {
      await supabase
        .from('user_profiles')
        .update({ theme_progress: progress })
        .eq('id', userId);
    }
  } catch {
    // Non-blocking — theme progress should never crash the app
  }
}

export async function getThemeProgress(userId: string): Promise<ThemeProgressMap> {
  const { data } = await supabase
    .from('user_profiles')
    .select('theme_progress')
    .eq('id', userId)
    .single();
  return data?.theme_progress ?? createInitialThemeProgress();
}
