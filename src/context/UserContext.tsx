import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';

const BIOMETRIC_EMAIL_KEY = 'tether_bio_email';
const BIOMETRIC_PASS_KEY = 'tether_bio_pass';
export const PENDING_DELETE_KEY = 'tether_pending_delete';

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
};

type UserContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  deleteAccount: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
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
      supabase.from('props').delete().eq('from_user_id', userId),
      supabase.from('props').delete().eq('to_user_id', userId),
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
      supabase.from('props').delete().eq('from_user_id', pendingId),
      supabase.from('props').delete().eq('to_user_id', pendingId),
      supabase.from('household_events').delete().eq('triggered_by', pendingId),
    ]);
    await supabase.from('user_profiles').delete().eq('id', pendingId);
    await supabase.auth.signOut();
    await SecureStore.deleteItemAsync(PENDING_DELETE_KEY);
  }

  return (
    <UserContext.Provider value={{ user, loading, signOut, deleteAccount }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
