import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { getTheme, ThemeTokens } from '../themes'; // Assuming this is correct
import { getAllHealthData, type HealthData } from '../lib/healthConnect';
import { setupClarifyCategory, checkAndSendPendingClarifications } from '../lib/downtimeDetector';
import { incrementThemeMetric } from '../lib/themeUnlocks';
import Constants from 'expo-constants';

const BIOMETRIC_EMAIL_KEY = 'tether_bio_email';
const BIOMETRIC_PASS_KEY = 'tether_bio_pass';
export const PENDING_DELETE_KEY = 'tether_pending_delete';
const EPHEMERAL_SESSION_KEY = 'tether_ephemeral_session';

type User = {
  id: string;
  email?: string;
  username?: string;
  athlete?: string;
  theme: string;
  fitnessLabel?: string;
  house_name?: string;
  training_days?: number[];
  goals?: string[];
  equipment?: string;
  body_focus?: string[];
  spotify_access_token?: string | null;
  spotify_refresh_token?: string | null;
  spotify_token_expiry?: number | null;
  valkyrie_seen?: boolean;
  household_setup_seen?: boolean;
  unlocked_themes?: string[];
  consistency_unlocked_at?: string | null;
  rank?: number;
  weight_unit?: 'kg' | 'lbs';
  water_goal_units?: number;
  default_water_container?: string;
  macro_tier?: number;
  goal_unlocked?: boolean;
};

type UserContextType = {
  user: User | null;
  loading: boolean;
  themeTokens: ThemeTokens;
  healthData: HealthData;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isDefaultTheme: boolean;
  goalUnlockReady: boolean;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  themeTokens: getTheme('iron'),
  healthData: null,
  signOut: async () => {},
  deleteAccount: async () => {},
  refreshUser: async () => {},
  isDefaultTheme: true,
  goalUnlockReady: false,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<HealthData>(null);
  const [goalUnlockReady, setGoalUnlockReady] = useState(false);



  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // If user logged in without "Keep me signed in", sign them out on next open
        const ephemeral = await SecureStore.getItemAsync(EPHEMERAL_SESSION_KEY);
        if (ephemeral === 'true') {
          await SecureStore.deleteItemAsync(EPHEMERAL_SESSION_KEY);
          await supabase.auth.signOut();
          return;
        }
        loadProfile(session.user.id);
        // Flush any queued deletion from a previous offline attempt
        flushPendingDelete(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadProfile(session.user.id);
      else { setUser(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setUser(data);
    setLoading(false);

    // Register push token and store in user_profiles
    registerPushToken(userId);

    // Pull wearable data in background — non-blocking
    syncHealthData(userId, data);

    // Set up interactive push categories and check for pending clarifications
    setupClarifyCategory();
    checkAndSendPendingClarifications(userId);
  }

async function syncHealthData(userId: string, currentProfile?: User) {
  try {
    const data = await getAllHealthData();
    if (!data) return;

    setHealthData(data);

    const { data: snapshot } = await supabase.from('user_context_snapshots')
      .select('snapshot')
      .eq('user_id', userId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const context = snapshot?.snapshot;
    if (context) {
      const updates: Partial<User> = {};
      const unlocked = new Set(currentProfile?.unlocked_themes ?? ['iron']);

      if (context.consistency?.isConsistent && !currentProfile?.goal_unlocked && !currentProfile?.consistency_unlocked_at) {
        await checkGoalUnlock(userId);
      }

      if (context.prsLast14d >= 3) unlocked.add('dragonfire');
      if (context.avgBrainState7d >= 3.5) unlocked.add('arcane');

      if (unlocked.size !== (currentProfile?.unlocked_themes?.length ?? 0)) {
        updates.unlocked_themes = Array.from(unlocked);
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('user_profiles').update(updates).eq('id', userId);
        refreshUser();
      }
    }

    await supabase.from('health_snapshots').upsert({
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      sleep_hours: data.sleep?.hours ?? null,
      sleep_start: data.sleep?.startTime ?? null,
      sleep_end: data.sleep?.endTime ?? null,
      resting_hr: data.restingHR ?? null,
      avg_hr: data.avgHR ?? null,
      hrv_ms: data.hrv ?? null,
      steps: data.steps ?? null,
    }, { onConflict: 'user_id,date' });
    incrementThemeMetric(userId, 'wearable_consistency').catch(() => {});
  } catch (e) {
    console.warn('Health Connect unavailable or failed to sync data. Not a blocking error.', e);
  }
}

  function isExpoGo() {
    return Constants.expoGoConfig !== null;
  }

  async function registerPushToken(userId: string) {
    // Skip entirely inside Expo Go
    if (isExpoGo()) {
      console.log('Skipping push token registration in Expo Go');
      return;
    }

    try {
      // Only register if permission already granted — never prompt during auth flow
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      await supabase
        .from('user_profiles')
        .update({ push_token: token })
        .eq('id', userId);
    } catch {
      // Not a physical device or permissions denied — fine
    }
  }

  async function refreshUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) loadProfile(session.user.id);
  }

  async function checkGoalUnlock(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('started_at', thirtyDaysAgo);

    if (count && count >= 8) {
      await supabase.from('user_profiles').update({ consistency_unlocked_at: new Date().toISOString() }).eq('id', userId);
      setGoalUnlockReady(true);
      refreshUser();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function deleteAccount() {
    const userId = user?.id;
    if (!userId) return;

    // 1. Clear local secure storage immediately (works offline)
    await Promise.allSettled([
      SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_PASS_KEY),
    ]);

    // 2. Queue deletion in case we go offline mid-flight
    await SecureStore.setItemAsync(PENDING_DELETE_KEY, userId);

    // 3. Cascade delete all server-side rows keyed to this user
    await Promise.allSettled([
      supabase.from('exercise_performance').delete().eq('user_id', userId),
      supabase.from('workout_sessions').delete().eq('user_id', userId),
      supabase.from('workday_sessions').delete().eq('user_id', userId),
      supabase.from('budget_expenses').delete().eq('user_id', userId),
      supabase.from('user_context_snapshots').delete().eq('user_id', userId),
      supabase.from('props').delete().eq('from_user', userId),
      supabase.from('props').delete().eq('to_user', userId),
      supabase.from('household_events').delete().eq('triggered_by', userId),
    ]);

    // 4. Delete profile last (auth identity anchor)
    await supabase.from('user_profiles').delete().eq('id', userId);

    // 5. Sign out of Supabase auth
    await supabase.auth.signOut();

    // 6. Clear the pending flag — deletion succeeded
    await SecureStore.deleteItemAsync(PENDING_DELETE_KEY);

    setUser(null);
  }

  /** If a previous session queued a deletion (offline), flush it now. */
  async function flushPendingDelete(currentUserId: string) {
    const pendingId = await SecureStore.getItemAsync(PENDING_DELETE_KEY);
    if (!pendingId) return;

    // Only flush if it matches the signed-in user (safety guard)
    if (pendingId !== currentUserId) {
      await SecureStore.deleteItemAsync(PENDING_DELETE_KEY);
      return;
    }

    await Promise.allSettled([
      supabase.from('exercise_performance').delete().eq('user_id', pendingId),
      supabase.from('workout_sessions').delete().eq('user_id', pendingId),
      supabase.from('workday_sessions').delete().eq('user_id', pendingId),
      supabase.from('budget_expenses').delete().eq('user_id', pendingId),
      supabase.from('user_context_snapshots').delete().eq('user_id', pendingId),
      supabase.from('props').delete().eq('from_user', pendingId),
      supabase.from('props').delete().eq('to_user', pendingId),
      supabase.from('household_events').delete().eq('triggered_by', pendingId),
    ]);
    await supabase.from('user_profiles').delete().eq('id', pendingId);
    await supabase.auth.signOut();
    await SecureStore.deleteItemAsync(PENDING_DELETE_KEY);
  }

  const themeTokens = getTheme(user?.theme ?? null);
  const isDefaultTheme = !user?.theme || user.theme.toUpperCase() === 'SHADOW';

  return (
    <UserContext.Provider value={{ user, loading, themeTokens, healthData, signOut, deleteAccount, refreshUser, isDefaultTheme, goalUnlockReady }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
