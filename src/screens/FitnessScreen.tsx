import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Modal, Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Calendar from 'expo-calendar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import EffortSelector from '../components/EffortSelector';
import { PropsModal, PRCelebration } from './HouseholdSetup';
import RoninPRCelebration from '../components/RoninPRCelebration';
import RoninInkWash from '../components/RoninInkWash';
import ValkyriePRCelebration from '../components/ValkyriePRCelebration';
import JointOps from './JointOps';
import BeastMode from './BeastMode';
import QuickHits from './QuickHits';
import type { Exercise, CompletedSet, SessionPlan, PlanDiff, EffortRating } from '../lib/fitnessTypes';
import {
  SPOTIFY_DISCOVERY, makeSpotifyRedirectUri,
  getSpotifyScopes, saveSpotifyTokens,
  searchTracks, addTrackToPlaylist, createPlaylist, getPlaybackState,
  getSpotifyMe, getHouseholdPlaylistId, saveHouseholdPlaylistId,
  exchangeCodeForTokens, getValidAccessToken,
  SpotifyTrack,
} from '../lib/spotifyService';
import { SPOTIFY_CLIENT_ID as SPOT_ID } from '../lib/config';
import { callEdgeFunction } from '../lib/callEdgeFunction';

WebBrowser.maybeCompleteAuthSession();

import { ThemeTokens } from '../themes';

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const SPOTIFY_REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'tether', path: 'spotify' });

const MODES = [
  { id: 'plan',   icon: '📋', label: 'PLAN',       sub: 'Your scheduled workout. Week view included.',        color: null },
  { id: 'lfg',    icon: '🔥', label: 'LFG',        sub: 'Throw the plan out the window. Just get it done.',   color: null },
  { id: 'beast',  icon: '💀', label: 'BEAST',      sub: 'Audio only. Heavy. Aggression out. No mercy.',       color: '#ff2233' },
  { id: 'quick',  icon: '⚡', label: 'QUICK HITS', sub: '3-7 min. Invisible. No sweat. Do it at your desk.',  color: null },
  { id: 'joint',  icon: '🤝', label: 'JOINT OPS',  sub: 'Same workout. Both of you. Head-to-head.',           color: null },
] as const;

type ModeId = typeof MODES[number]['id'];

const SPLIT_LABELS: Record<number, string[]> = {
  1: ['FULL'],
  2: ['FULL A', 'FULL B'],
  3: ['LEGS', 'PUSH', 'PULL'],
  4: ['LEGS', 'PUSH', 'PULL', 'FULL'],
  5: ['PUSH', 'PULL', 'LEGS', 'FULL', 'CONDITIONING'],
  6: ['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'CONDITIONING'],
  7: ['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'LEGS', 'FULL'],
};
const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_MON_FIRST = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const SPLIT_MUSCLES: Record<string, string> = {
  'PUSH': 'Chest · Shoulders · Triceps',
  'PULL': 'Back · Biceps · Rear Delts',
  'LEGS': 'Quads · Glutes · Hamstrings',
  'FULL': 'Full Body',
  'FULL A': 'Upper Body',
  'FULL B': 'Lower Body',
  'CONDITIONING': 'Cardio · Core',
};

const SPLIT_MAIN_LIFTS: Record<string, string[]> = {
  'PUSH': ['Bench Press', 'Shoulder Press', 'Tricep Work'],
  'PULL': ['Deadlift', 'Barbell Row', 'Lat Pulldown'],
  'LEGS': ['Squat', 'RDL', 'Leg Press'],
  'FULL': ['Squat', 'Bench Press', 'Row'],
  'FULL A': ['Bench Press', 'Row', 'Shoulder Press'],
  'FULL B': ['Squat', 'RDL', 'Leg Press'],
  'CONDITIONING': ['Cardio', 'Core Work'],
};

const SPLIT_ABBREV: Record<string, string> = {
  'PUSH': 'P', 'PULL': 'PL', 'LEGS': 'L',
  'FULL': 'F', 'FULL A': 'FA', 'FULL B': 'FB', 'CONDITIONING': 'C',
};

// ── HELPERS ────────────────────────────────────────────────────────────────────
function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

function getWeekDays(): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getSplitLabel(dayNum: number, trainingDays: number[]): string | null {
  const sorted = [...trainingDays].sort((a, b) => a - b);
  const idx = sorted.indexOf(dayNum);
  if (idx === -1) return null;
  const labels = SPLIT_LABELS[sorted.length] ?? ['FULL'];
  return labels[idx] ?? 'FULL';
}

function callEngine(body: object): Promise<unknown> {
  return callEdgeFunction('fitness-engine', body);
}

// ── TYPES ──────────────────────────────────────────────────────────────────────
type Screen = 'home' | 'loading' | 'workout' | 'complete' | 'history' | 'beast' | 'quick' | 'joint_ops' | 'props_inbox' | 'spotify_search';

interface SetEntry { weight: string; reps: string; }

interface WeeklyBrief {
  weekTheme: string;
  dayBriefs: Record<string, { focus: string; mainLifts: string[]; note?: string }>;
  monthPhase: string;
  weeklyTarget: string;
  generatedAt?: string;
}

interface PREntry {
  id: string;
  userId: string;
  username: string;
  exerciseName: string;
  weight: number;
  reps: number;
  createdAt: string;
}

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function FitnessScreen() {
  const { user, themeTokens: C, healthData } = useUser();
  const isForm = C.mode === 'light';
  const s = makeStyles(C);

  // Navigation
  const [screen, setScreen] = useState<Screen>('home');

  // Session config
  const [hardStopMinutes, setHardStopMinutes] = useState(75);
  const [hardStopMode, setHardStopMode] = useState<'duration' | 'time'>('duration');
  const [leaveByTime, setLeaveByTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [sessionMode, setSessionMode] = useState<'plan' | 'lfg'>('plan');

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<CompletedSet[]>([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [setEntry, setSetEntry] = useState<SetEntry>({ weight: '', reps: '' });
  const [effort, setEffort] = useState<EffortRating | null>(null);
  const [adjustments, setAdjustments] = useState<string[]>([]);
  const [sneakyCardio, setSneakyCardio] = useState<{ label: string; durationSeconds: number } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Timers
  const [restSeconds, setRestSeconds] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hardStopTimeRef = useRef<Date>(new Date());

  // History + PRs
  const [history, setHistory] = useState<any[]>([]);
  const [prMap, setPrMap] = useState<Record<string, { weight: number; reps: number }>>({});
  const [recentPRs, setRecentPRs] = useState<PREntry[]>([]);

  // Partner
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerUsername, setPartnerUsername] = useState('');
  const [partnerTheme, setPartnerTheme] = useState('iron');
  const [jointOpsInvite, setJointOpsInvite] = useState(false);

  // Props
  const [unseenCount, setUnseenCount] = useState(0);
  const [propsInbox, setPropsInbox] = useState<any[]>([]);
  const [propsModalVisible, setPropsModalVisible] = useState(false);
  const [propsTarget, setPropsTarget] = useState<{ toUser: string; exercise?: string; weight?: number; reps?: number } | null>(null);

  // PR celebration
  const [celebVisible, setCelebVisible] = useState(false);
  const [celebPR, setCelebPR] = useState<{ exercise: string; weight: number; reps: number } | null>(null);

  // MED EVAC
  const [medEvacCount, setMedEvacCount] = useState<Record<string, number>>({});

  // Calendar / weekly brief
  const [calendarTab, setCalendarTab] = useState<'week' | 'month'>('week');
  const [weekExpanded, setWeekExpanded] = useState(false);
  const [weeklyBrief, setWeeklyBrief] = useState<WeeklyBrief | null>(null);
  const [monthSessions, setMonthSessions] = useState<Record<string, string>>({}); // date → label

  // Theme animations
  const [showInkWash, setShowInkWash] = useState(false);

  // Cardio log
  const [showCardioModal, setShowCardioModal] = useState(false);
  const [cardioType, setCardioType] = useState('Elliptical');
  const [cardioDuration, setCardioDuration] = useState('');
  const [cardioLogging, setCardioLogging] = useState(false);

  // Spotify — local token state so refreshes don't require UserContext reload
  const [spotifyToken, setSpotifyToken] = useState<string | null>(user?.spotify_access_token ?? null);
  const [spotifyPlaylistId, setSpotifyPlaylistId] = useState<string | null>(null);
  const [spotifyTrackName, setSpotifyTrackName] = useState<string | null>(null);
  const [spotifySearchQuery, setSpotifySearchQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [spotifySearching, setSpotifySearching] = useState(false);

  // Spotify OAuth — PKCE flow for refresh token support
  const [authRequest, authResponse, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: SPOT_ID,
      scopes: getSpotifyScopes().split(' '),
      redirectUri: SPOTIFY_REDIRECT_URI,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    SPOTIFY_DISCOVERY
  );

  useEffect(() => {
    loadAll();
    // Restore token from stored profile, refreshing if expired
    if (user) {
      getValidAccessToken(user).then(tok => {
        if (tok) { setSpotifyToken(tok); handleSpotifyConnected(tok); }
      });
    }
  }, []);

  // Listen for incoming Joint Ops invites while on this screen
  useEffect(() => {
    if (!user?.house_name || !user?.id) return;
    const channel = supabase.channel(`fitness_invites_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'household_events',
        filter: `to_user=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new.event_type === 'joint_ops_invite') {
          setJointOpsInvite(true);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.house_name, user?.id]);

  useEffect(() => {
    if (authResponse?.type === 'success' && user && authRequest?.codeVerifier) {
      const { code } = authResponse.params;
      exchangeCodeForTokens(code, authRequest.codeVerifier, SPOTIFY_REDIRECT_URI)
        .then(tokens => {
          saveSpotifyTokens(user.id, tokens.access_token, tokens.refresh_token, tokens.expires_in);
          setSpotifyToken(tokens.access_token);
          handleSpotifyConnected(tokens.access_token);
        })
        .catch(() => Alert.alert('Spotify', 'Could not complete sign-in. Try again.'));
    }
  }, [authResponse]);

  async function loadAll() {
    await Promise.all([loadHistory(), loadPartner(), loadUnseenProps(), loadMonthSessions(), loadWeeklyBrief()]);
  }

  async function loadHistory() {
    if (!user) return;
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, label, started_at, ended_at, date')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(20);
    if (sessions) setHistory(sessions);

    const { data: perf } = await supabase
      .from('exercise_performance')
      .select('exercise_name, weight, reps')
      .eq('user_id', user.id)
      .gt('weight', 0)
      .order('weight', { ascending: false });
    if (perf) {
      const map: Record<string, { weight: number; reps: number }> = {};
      perf.forEach((row: any) => {
        if (!map[row.exercise_name] || row.weight > map[row.exercise_name].weight) {
          map[row.exercise_name] = { weight: row.weight, reps: row.reps };
        }
      });
      setPrMap(map);
    }
  }

  async function loadPartner() {
    if (!user?.house_name) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('id, username, theme')
      .eq('house_name', user.house_name)
      .neq('id', user.id)
      .maybeSingle();
    if (data) {
      setPartnerId(data.id);
      setPartnerUsername(data.username ?? 'partner');
      setPartnerTheme(data.theme ?? 'iron');
      await loadRecentPRs(user.id, data.id, user.username ?? 'you', data.username ?? 'partner');
    } else {
      await loadRecentPRs(user.id, null, user.username ?? 'you', '');
    }
  }

  async function loadRecentPRs(uid: string, pid: string | null, myName: string, pName: string) {
    const ids = [uid, ...(pid ? [pid] : [])];
    const { data } = await supabase
      .from('exercise_performance')
      .select('id, user_id, exercise_name, weight, reps, created_at')
      .in('user_id', ids)
      .eq('is_pr', true)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) {
      setRecentPRs(data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        username: r.user_id === uid ? myName : pName,
        exerciseName: r.exercise_name,
        weight: r.weight,
        reps: r.reps,
        createdAt: r.created_at,
      })));
    }
  }

  async function loadMonthSessions() {
    if (!user) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data } = await supabase
      .from('workout_sessions')
      .select('date, label')
      .eq('user_id', user.id)
      .gte('date', monthStart)
      .order('date');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s: any) => { if (s.date) map[s.date] = s.label ?? ''; });
      setMonthSessions(map);
    }
  }

  async function loadWeeklyBrief() {
    if (!user) return;
    const cacheKey = `weekly_brief_${user.id}`;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed: WeeklyBrief = JSON.parse(cached);
        const age = Date.now() - new Date(parsed.generatedAt ?? 0).getTime();
        if (age < 7 * 24 * 60 * 60 * 1000) {
          setWeeklyBrief(parsed);
          return;
        }
      }
    } catch {}

    try {
      const today = new Date();
      const dow = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((dow + 6) % 7));
      const weekStartDate = monday.toISOString().split('T')[0];

      const brief = await callEngine({
        event: 'weekly_brief',
        userId: user.id,
        payload: {
          trainingDays: user.training_days ?? [],
          weekStartDate,
        },
      }) as WeeklyBrief;

      brief.generatedAt = new Date().toISOString();
      setWeeklyBrief(brief);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(brief));
    } catch (e) {
      console.log('[weekly brief] failed:', e);
    }
  }

  async function loadUnseenProps() {
    if (!user) return;
    const { data } = await supabase
      .from('props')
      .select('id, from_user, message, created_at, event_type')
      .eq('to_user', user.id)
      .eq('seen', false)
      .order('created_at', { ascending: false });
    setUnseenCount(data?.length ?? 0);
  }

  async function openPropsInbox() {
    if (!user) return;
    const { data } = await supabase
      .from('props')
      .select('id, from_user, message, created_at, event_type')
      .eq('to_user', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setPropsInbox(data ?? []);
    // Mark all as seen
    await supabase.from('props').update({ seen: true }).eq('to_user', user.id).eq('seen', false);
    setUnseenCount(0);
    setScreen('props_inbox');
  }

  async function handleSpotifyConnected(accessToken: string) {
    if (!user?.house_name) return;
    try {
      const me = await getSpotifyMe(accessToken);
      // Check for existing household playlist
      let plId = await getHouseholdPlaylistId(user.house_name);
      if (!plId) {
        const pl = await createPlaylist(me.id, 'Tether Gym 💪', accessToken);
        plId = pl.id;
        await saveHouseholdPlaylistId(user.house_name, plId);
      }
      setSpotifyPlaylistId(plId);
      // Get current playback
      const state = await getPlaybackState(accessToken);
      if (state?.item) setSpotifyTrackName(state.item.name);
    } catch { /* ignore - best effort */ }
  }

  async function handleSpotifySearch() {
    if (!spotifySearchQuery.trim() || !spotifyToken) return;
    setSpotifySearching(true);
    try {
      const results = await searchTracks(spotifySearchQuery, spotifyToken);
      setSpotifyResults(results);
    } catch { /* ignore */ }
    setSpotifySearching(false);
  }

  async function addTrack(track: SpotifyTrack) {
    if (!spotifyPlaylistId || !spotifyToken) return;
    try {
      await addTrackToPlaylist(spotifyPlaylistId, track.uri, spotifyToken);
      Alert.alert('Added!', `"${track.name}" added to Tether Gym 💪`);
      setScreen('home');
    } catch { Alert.alert('Error', 'Could not add track'); }
  }

  async function syncWithPartner() {
    if (!spotifyToken || !user) return;
    try {
      const myState = await getPlaybackState(spotifyToken);
      if (!myState?.item || !partnerId) return;
      // Notify via household_events — partner app polls and plays same position
      await supabase.from('household_events').insert({
        event_type: 'spotify_sync',
        from_user: user.id,
        to_user: partnerId,
        household_id: user.house_name,
        event_data: {
          track_uri: myState.item.uri,
          position_ms: myState.progress_ms,
          context_uri: myState.context?.uri,
        },
      });
      Alert.alert('Sync sent', 'Partner will be asked to sync on their next app open.');
    } catch { Alert.alert('Error', 'Could not sync'); }
  }

  // ── HARD STOP HELPERS ──────────────────────────────────────────────────────
  function getHardStopDate(): Date {
    if (hardStopMode === 'time' && leaveByTime) {
      return new Date(leaveByTime.getTime() - 5 * 60 * 1000); // 5 min buffer
    }
    return new Date(Date.now() + hardStopMinutes * 60_000);
  }

  function getEffectiveMinutes(): number {
    if (hardStopMode === 'time' && leaveByTime) {
      return Math.max(15, Math.round((leaveByTime.getTime() - 5 * 60 * 1000 - Date.now()) / 60_000));
    }
    return hardStopMinutes;
  }

  // ── CALENDAR ──────────────────────────────────────────────────────────────
  async function addWorkoutToCalendar(workoutLabel: string, startTime: Date, durationMinutes: number) {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') return;
      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const target = cals.find(c => c.allowsModifications) ?? cals[0];
      if (!target) return;
      const theme = (user?.theme ?? 'tether').toUpperCase();
      await Calendar.createEventAsync(target.id, {
        title: `${theme} — ${workoutLabel}`,
        startDate: startTime,
        endDate: new Date(startTime.getTime() + durationMinutes * 60 * 1000),
        notes: 'Logged via Tether',
        alarms: [],
      });
    } catch (e) {
      console.log('[calendar] addWorkoutToCalendar failed:', e);
    }
  }

  async function scheduleMonthCalendar() {
    if (!user?.training_days?.length) return;
    const alreadyDone = await AsyncStorage.getItem(`cal_scheduled_${user.id}`);
    if (alreadyDone) return;
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') return;
      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const target = cals.find(c => c.allowsModifications);
      if (!target) return;
      const theme = (user.theme ?? 'tether').toUpperCase();
      const sorted = [...user.training_days].sort((a, b) => a - b);
      const splitLabels = SPLIT_LABELS[sorted.length] ?? ['FULL'];
      const today = new Date();
      for (let week = 0; week < 4; week++) {
        for (let i = 0; i < sorted.length; i++) {
          const dayNum = sorted[i];
          const split = splitLabels[i] ?? 'FULL';
          const daysUntil = (dayNum - today.getDay() + 7) % 7;
          const eventDate = new Date(today);
          eventDate.setDate(today.getDate() + daysUntil + week * 7);
          eventDate.setHours(7, 0, 0, 0);
          if (eventDate <= today && week === 0) continue; // skip past days this week
          await Calendar.createEventAsync(target.id, {
            title: `${theme} — ${split} DAY`,
            startDate: eventDate,
            endDate: new Date(eventDate.getTime() + 75 * 60 * 1000),
            notes: 'Scheduled by Tether',
            alarms: [{ relativeOffset: -15 }],
          });
        }
      }
      await AsyncStorage.setItem(`cal_scheduled_${user.id}`, new Date().toISOString());
    } catch (e) {
      console.log('[calendar] scheduleMonthCalendar failed:', e);
    }
  }

  // ── SESSION CONTROL ────────────────────────────────────────────────────────
  async function startSession() {
    if (!user) return;
    setScreen('loading');
    setCompletedSets([]);
    setExerciseIndex(0);
    setCurrentSetIndex(0);
    setAdjustments([]);
    setSneakyCardio(null);
    setEffort(null);
    setSetEntry({ weight: '', reps: '' });

    try {
      const result = await callEngine({
        event: 'session_start',
        userId: user.id,
        payload: {
          mode: sessionMode,
          hardStopMinutes: getEffectiveMinutes(),
          equipment: user.equipment ?? 'full_gym',
          injuries: [],
          moodContext: 'unknown',
          sleepContext: healthData?.sleep?.hours != null
            ? (healthData.sleep.hours < 5 ? 'poor' : healthData.sleep.hours < 7 ? 'moderate' : 'good')
            : 'unknown',
          healthContext: {
            sleepHours: healthData?.sleep?.hours ?? null,
            hrv: healthData?.hrv ?? null,
            restingHR: healthData?.restingHR ?? null,
            steps: healthData?.steps ?? null,
          },
        },
      }) as { sessionId: string; plan: SessionPlan };

      setSessionId(result.sessionId);
      setPlan(result.plan);
      hardStopTimeRef.current = getHardStopDate();
      setElapsed(0);
      clearInterval(sessionTimerRef.current!);
      sessionTimerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      if (user?.theme === 'ronin') setShowInkWash(true);
      addWorkoutToCalendar(result.plan?.label ?? 'WORKOUT', new Date(), getEffectiveMinutes());
      setScreen('workout');
    } catch {
      Alert.alert('Could not start session', 'Check your connection and try again.');
      setScreen('home');
    }
  }

  async function logSet() {
    if (!sessionId || !plan || !user || !effort) return;
    const ex = plan.exercises[exerciseIndex];
    const weight = parseFloat(setEntry.weight) || 0;
    const reps = parseInt(setEntry.reps) || 0;
    const minsLeft = Math.max(0, Math.floor((hardStopTimeRef.current.getTime() - Date.now()) / 60000));
    const currentPlan = plan.exercises.slice(exerciseIndex);

    setPlanLoading(true);
    try {
      const result = await callEngine({
        event: 'set_completed',
        userId: user.id,
        sessionId,
        payload: { exerciseName: ex.name, exerciseId: ex.id, setIndex: currentSetIndex, weight, reps, effort, remainingMinutes: minsLeft, currentPlan },
      }) as { isPR: boolean } & PlanDiff;

      const completed: CompletedSet = { exerciseId: ex.id, exerciseName: ex.name, weight, reps, effort, isPR: result.isPR, timestamp: new Date() };
      setCompletedSets(prev => [...prev, completed]);

      if (result.isPR) {
        setCelebPR({ exercise: ex.name, weight, reps });
        setCelebVisible(true);
      }

      if (result.adjustments?.length) setAdjustments(result.adjustments);
      if (result.sneakyCardio) setSneakyCardio(result.sneakyCardio);

      const setsForThisEx = completedSets.filter(s => s.exerciseId === ex.id).length + 1;
      let nextExIndex = exerciseIndex;
      let nextSetIdx = currentSetIndex + 1;

      if (setsForThisEx >= ex.sets) {
        if (result.nextExercise) {
          const nIdx = plan.exercises.findIndex(e => e.id === result.nextExercise!.id);
          nextExIndex = nIdx >= 0 ? nIdx : exerciseIndex + 1;
        } else {
          nextExIndex = exerciseIndex + 1;
        }
        nextSetIdx = 0;
      }

      if (nextExIndex >= plan.exercises.length || result.nextExercise === null) {
        finishSession(); return;
      }

      setExerciseIndex(nextExIndex);
      setCurrentSetIndex(nextSetIdx);
      setSetEntry({ weight: '', reps: '' });
      setEffort(null);
      startRest(result.restSeconds ?? ex.restSeconds);
    } catch {
      const setsForThisEx = completedSets.filter(s => s.exerciseId === ex.id).length + 1;
      if (setsForThisEx >= ex.sets) {
        const next = exerciseIndex + 1;
        if (next >= plan.exercises.length) { finishSession(); return; }
        setExerciseIndex(next);
        setCurrentSetIndex(0);
      } else {
        setCurrentSetIndex(prev => prev + 1);
      }
      setSetEntry({ weight: '', reps: '' });
      setEffort(null);
      startRest(ex.restSeconds);
    } finally {
      setPlanLoading(false);
    }
  }

  async function skipExercise() {
    if (!sessionId || !plan || !user) return;
    const ex = plan.exercises[exerciseIndex];
    const minsLeft = Math.max(0, Math.floor((hardStopTimeRef.current.getTime() - Date.now()) / 60000));
    try {
      const result = await callEngine({
        event: 'exercise_skipped',
        userId: user.id,
        sessionId,
        payload: { exerciseName: ex.name, exerciseId: ex.id, remainingMinutes: minsLeft, currentPlan: plan.exercises.slice(exerciseIndex + 1) },
      }) as { nextExercise: Exercise | null; adjustments: string[] };
      if (result.adjustments?.length) setAdjustments(result.adjustments);
      const next = exerciseIndex + 1;
      if (next >= plan.exercises.length || !result.nextExercise) { finishSession(); return; }
      setExerciseIndex(next);
      setCurrentSetIndex(0);
      setSetEntry({ weight: '', reps: '' });
      setEffort(null);
    } catch {
      const next = exerciseIndex + 1;
      if (next >= plan.exercises.length) { finishSession(); return; }
      setExerciseIndex(next);
      setCurrentSetIndex(0);
    }
  }

  async function logCardio() {
    if (!user) return;
    const durationMinutes = parseInt(cardioDuration) || 0;
    if (!durationMinutes) return;
    setCardioLogging(true);
    try {
      const exerciseName = `Cardio — ${cardioType}`;
      // Check existing PR (longest session)
      const { data: existing } = await supabase
        .from('exercise_performance')
        .select('reps')
        .eq('user_id', user.id)
        .eq('exercise_name', exerciseName)
        .order('reps', { ascending: false })
        .limit(1)
        .maybeSingle();
      const isPR = !existing || durationMinutes > (existing.reps ?? 0);
      await supabase.from('exercise_performance').insert({
        user_id: user.id,
        exercise_name: exerciseName,
        weight: 0,
        reps: durationMinutes,
        effort: 3,
        is_pr: isPR,
      });
      setShowCardioModal(false);
      setCardioDuration('');
      Alert.alert(isPR ? '🏆 NEW PR!' : 'LOGGED', `${cardioType} · ${durationMinutes} min${isPR ? '\nPersonal best!' : ''}`);
    } catch {
      Alert.alert('Error', 'Could not log cardio. Try again.');
    } finally {
      setCardioLogging(false);
    }
  }

  async function medEvac() {
    if (!plan || !user) return;
    const ex = plan.exercises[exerciseIndex];
    const count = (medEvacCount[ex.name] ?? 0) + 1;

    let msg = 'Flag this area as injured? It will be removed from today and future sessions until cleared (1 week).';
    if (count === 2) msg = 'Flagged again. Recommending you see a doctor. Cleared in 2 weeks.';

    Alert.alert('🚑 MED EVAC', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: async () => {
        setMedEvacCount(prev => ({ ...prev, [ex.name]: count }));
        const clearDays = count >= 2 ? 14 : 7;
        const clearDate = new Date();
        clearDate.setDate(clearDate.getDate() + clearDays);
        try {
          await supabase.from('injury_flags').insert({
            user_id: user.id,
            exercise_name: ex.name,
            body_part: ex.name,
            severity: count >= 2 ? 'severe' : 'moderate',
            active: true,
            date: new Date().toISOString().split('T')[0],
          });
        } catch { /* best effort */ }
        if (count >= 2) {
          Alert.alert('See a doctor', 'This area has been flagged twice. Please get it checked out.');
        }
        // Skip to next exercise
        const next = exerciseIndex + 1;
        if (next >= plan.exercises.length) { finishSession(); return; }
        setExerciseIndex(next);
        setCurrentSetIndex(0);
        setSetEntry({ weight: '', reps: '' });
        setEffort(null);
      }},
    ]);
  }

  async function finishSession() {
    clearInterval(sessionTimerRef.current!);
    clearInterval(restRef.current!);
    if (!sessionId || !user) { setScreen('complete'); return; }
    const prsHit = completedSets.filter(s => s.isPR).map(s => s.exerciseName);
    try {
      await callEngine({ event: 'session_end', userId: user.id, sessionId, payload: { completedSets: completedSets.length, prsHit } });
    } catch { /* best effort */ }
    await loadHistory();
    setScreen('complete');
  }

  function startRest(seconds: number) {
    clearInterval(restRef.current!);
    setRestSeconds(seconds);
    setRestRunning(true);
    restRef.current = setInterval(() => {
      setRestSeconds(t => {
        if (t <= 1) { clearInterval(restRef.current!); setRestRunning(false); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  function skipRest() {
    clearInterval(restRef.current!);
    setRestRunning(false);
    setRestSeconds(0);
  }

  useEffect(() => {
    return () => { clearInterval(sessionTimerRef.current!); clearInterval(restRef.current!); };
  }, []);

  // ── SUB-SCREENS ────────────────────────────────────────────────────────────
  if (screen === 'beast') return <BeastMode onBack={() => setScreen('home')} />;
  if (screen === 'quick') return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TouchableOpacity style={s.backBtn} onPress={() => setScreen('home')}>
        <Text style={s.backBtnText}>← BACK</Text>
      </TouchableOpacity>
      <QuickHits />
    </View>
  );
  if (screen === 'joint_ops') return (
    <JointOps
      user={user!}
      partnerId={partnerId}
      partnerUsername={partnerUsername}
      partnerTheme={partnerTheme}
      C={C}
      onBack={() => { setJointOpsInvite(false); setScreen('home'); }}
    />
  );

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (screen === 'home') {
    const trainingDays = user?.training_days ?? [];
    const weekDays = getWeekDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isSpotifyConnected = !!spotifyToken && (user?.spotify_token_expiry ?? 0) > Date.now() - 60000;

    return (
      <SafeAreaView style={s.bg}>
        <StatusBar barStyle={C.mode === 'dark' ? 'light-content' : 'dark-content'} />
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.homeHeader}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={s.dayLabel}>
                  {new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
                </Text>
                <Text style={s.homeTitle}>{({
                  iron: 'THE IRON', ronin: 'THE DOJO', valkyrie: 'THE FIELD',
                  forge: 'THE FORGE', arcane: 'THE SANCTUM', dragonfire: 'THE PIT',
                  void: 'THE GRID', verdant: 'THE GROVE', form: 'THE STUDIO',
                } as Record<string, string>)[user?.theme ?? 'iron'] ?? 'THE IRON'}</Text>
                <Text style={s.homeSub}>Anthropic-powered · adapts as you lift</Text>
              </View>
              {unseenCount > 0 && (
                <TouchableOpacity style={[s.propsBadge, { backgroundColor: C.accent }]} onPress={openPropsInbox}>
                  <Text style={[s.propsBadgeText, { color: C.bg }]}>💪 {unseenCount}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Joint Ops invite banner */}
          {jointOpsInvite && partnerId && (
            <TouchableOpacity
              style={{ backgroundColor: C.accent, margin: 16, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => { setJointOpsInvite(false); setScreen('joint_ops'); }}
            >
              <Text style={{ color: C.bg, fontWeight: '900', fontSize: 14, letterSpacing: 2 }}>⚔️ {partnerUsername.toUpperCase()} IS CALLING</Text>
              <Text style={{ color: C.bg, fontWeight: '700', fontSize: 12 }}>JOIN JOINT OPS →</Text>
            </TouchableOpacity>
          )}

          {/* Hard stop picker */}
          <View style={s.hardStopRow}>
            <Text style={s.hardStopLabel}>HARD STOP</Text>
            <View style={s.hardStopChips}>
              {[45, 60, 75, 90].map(m => {
                const active = hardStopMode === 'duration' && hardStopMinutes === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[s.stopChip, active && { backgroundColor: C.accent, borderColor: C.accent }]}
                    onPress={() => { setHardStopMinutes(m); setHardStopMode('duration'); setLeaveByTime(null); }}
                  >
                    <Text style={[s.stopChipText, active && { color: C.bg }]}>{m}m</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[s.leaveByBtn, hardStopMode === 'time' && { borderColor: C.accent }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[s.leaveByLabel, { color: C.muted }]}>LEAVE BY</Text>
              <Text style={[s.leaveByTime, { color: hardStopMode === 'time' ? C.accent : C.text }]}>
                {leaveByTime
                  ? leaveByTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                  : '—'}
              </Text>
            </TouchableOpacity>
          </View>

          {showTimePicker && (
            <DateTimePicker
              mode="time"
              value={leaveByTime ?? new Date()}
              display="spinner"
              onChange={(_, selected) => {
                setShowTimePicker(false);
                if (selected) {
                  setLeaveByTime(selected);
                  setHardStopMode('time');
                }
              }}
            />
          )}

          {/* Mode grid */}
          <View style={s.modeGrid}>
            {MODES.map((mode) => {
              const isFullWidth = mode.id === 'joint';
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    s.modeCard,
                    isFullWidth && s.modeCardFull,
                    mode.id === 'beast' && s.beastCard,
                  ]}
                  onPress={() => {
                    if (mode.id === 'plan') { setSessionMode('plan'); startSession(); }
                    else if (mode.id === 'lfg') { setSessionMode('lfg'); startSession(); }
                    else if (mode.id === 'beast') setScreen('beast');
                    else if (mode.id === 'quick') setScreen('quick');
                    else if (mode.id === 'joint') {
                      if (!partnerId) { Alert.alert('No partner found', 'Make sure you and your partner have the same house name set up.'); return; }
                      setScreen('joint_ops');
                    }
                  }}
                >
                  <Text style={s.modeIcon}>{mode.icon}</Text>
                  <Text style={[s.modeLabel, { color: mode.color ?? C.accent }]}>{mode.label}</Text>
                  <Text style={s.modeSub}>{mode.sub}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[s.modeCard, s.modeCardFull, { borderColor: C.border }]}
              onPress={() => setShowCardioModal(true)}
            >
              <Text style={s.modeIcon}>🏃</Text>
              <Text style={[s.modeLabel, { color: C.accent }]}>LOG CARDIO</Text>
              <Text style={s.modeSub}>Elliptical, run, bike — log duration + track PRs.</Text>
            </TouchableOpacity>
          </View>

          {/* ── CALENDAR SECTION ──────────────────────────────────────────── */}
          {trainingDays.length > 0 && (() => {
            // Month grid helper
            const now2 = new Date();
            const firstOfMonth = new Date(now2.getFullYear(), now2.getMonth(), 1);
            const lastOfMonth  = new Date(now2.getFullYear(), now2.getMonth() + 1, 0);
            const startOffset  = (firstOfMonth.getDay() + 6) % 7; // Mon=0
            const gridStart    = new Date(firstOfMonth);
            gridStart.setDate(firstOfMonth.getDate() - startOffset);
            const monthGrid: Date[][] = [];
            const cur = new Date(gridStart);
            while (cur <= lastOfMonth || monthGrid.length < 4) {
              const week: Date[] = [];
              for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
              monthGrid.push(week);
              if (cur > lastOfMonth && monthGrid.length >= 4) break;
            }

            return (
              <View style={s.section}>
                {/* Tab bar */}
                <View style={s.calTabRow}>
                  {(['week', 'month'] as const).map(tab => (
                    <TouchableOpacity key={tab} style={[s.calTab, calendarTab === tab && { borderBottomColor: C.accent }]} onPress={() => setCalendarTab(tab)}>
                      <Text style={[s.calTabText, { color: calendarTab === tab ? C.accent : C.muted }]}>
                        {tab === 'week' ? 'THIS WEEK' : 'THIS MONTH'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── WEEK TAB ──────────────────────────────────────────────── */}
                {calendarTab === 'week' && (
                  <View>
                    {/* Compact strip — tappable to expand */}
                    <TouchableOpacity activeOpacity={0.8} onPress={() => setWeekExpanded(e => !e)}>
                      <View style={s.weekStrip}>
                        {weekDays.map((d, i) => {
                          const dayNum = d.getDay();
                          const split  = getSplitLabel(dayNum, trainingDays);
                          const isToday = d.getTime() === today.getTime();
                          const isPast  = d.getTime() < today.getTime();
                          const dateStr = d.toISOString().split('T')[0];
                          const done    = !!monthSessions[dateStr];
                          return (
                            <View key={i} style={[s.weekDay,
                              isToday && { borderColor: C.accent },
                              done && { backgroundColor: C.accent + '22' },
                            ]}>
                              <Text style={[s.weekDayName, isPast && !done && { color: C.muted }, isToday && { color: C.accent }]}>
                                {DAY_SHORT[dayNum]}
                              </Text>
                              {done ? (
                                <Text style={{ fontSize: 10, color: C.accent }}>✓</Text>
                              ) : split ? (
                                <Text style={[s.weekDayLabel, isPast && { color: C.muted }, isToday && { color: C.accent }]}>{split.slice(0,2)}</Text>
                              ) : (
                                <Text style={[s.weekDayRest, { color: C.muted }]}>—</Text>
                              )}
                            </View>
                          );
                        })}
                        <View style={s.expandArrow}>
                          <Text style={{ color: C.muted, fontSize: 10 }}>{weekExpanded ? '▲' : '▼'}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Expanded day cards */}
                    {weekExpanded && (
                      <View style={{ marginTop: 10, gap: 8 }}>
                        {weeklyBrief?.weekTheme ? (
                          <Text style={[s.briefTheme, { color: C.accent }]}>{weeklyBrief.weekTheme}</Text>
                        ) : null}
                        {weekDays.map((d, i) => {
                          const dayNum  = d.getDay();
                          const split   = getSplitLabel(dayNum, trainingDays);
                          const isToday = d.getTime() === today.getTime();
                          const isPast  = d.getTime() < today.getTime();
                          const dateStr = d.toISOString().split('T')[0];
                          const done    = !!monthSessions[dateStr];
                          const brief   = weeklyBrief?.dayBriefs?.[String(dayNum)];
                          const muscles = split ? SPLIT_MUSCLES[split] : null;
                          const lifts   = brief?.mainLifts ?? (split ? SPLIT_MAIN_LIFTS[split] : null);

                          if (!split) {
                            // Rest day — compact row
                            return (
                              <View key={i} style={[s.dayCardRest, { borderColor: C.border }]}>
                                <Text style={[s.dayCardDayName, { color: C.muted }]}>{DAY_SHORT[dayNum]}</Text>
                                <Text style={[s.dayCardRestLabel, { color: C.muted }]}>REST</Text>
                              </View>
                            );
                          }

                          return (
                            <View key={i} style={[s.dayCard,
                              { borderColor: isToday ? C.accent : C.border, backgroundColor: C.card },
                              done && { borderColor: C.green ?? C.accent },
                            ]}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View>
                                  <Text style={[s.dayCardDayName, { color: isToday ? C.accent : (isPast && !done ? C.muted : C.text) }]}>
                                    {DAY_MON_FIRST[(i + 0) % 7]} {done ? '✓' : ''}
                                  </Text>
                                  <Text style={[s.dayCardSplit, { color: isToday ? C.accent : C.text }]}>{split} DAY</Text>
                                  {muscles && <Text style={[s.dayCardMuscles, { color: C.muted }]}>{muscles}</Text>}
                                </View>
                                {isToday && <View style={[s.todayPip, { backgroundColor: C.accent }]} />}
                              </View>
                              {lifts && (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                                  {lifts.map((l: string) => (
                                    <View key={l} style={[s.liftChip, { borderColor: C.border }]}>
                                      <Text style={[s.liftChipText, { color: C.text }]}>{l}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                              {brief?.focus && (
                                <Text style={[s.dayCardFocus, { color: C.muted }]} numberOfLines={2}>{brief.focus}</Text>
                              )}
                              {brief?.note && (
                                <Text style={[s.dayCardNote, { color: C.accent }]}>{brief.note}</Text>
                              )}
                            </View>
                          );
                        })}
                        {weeklyBrief?.weeklyTarget && (
                          <Text style={[s.weeklyTarget, { color: C.muted }]}>TARGET: {weeklyBrief.weeklyTarget}</Text>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* ── MONTH TAB ─────────────────────────────────────────────── */}
                {calendarTab === 'month' && (
                  <View>
                    {/* Day header row */}
                    <View style={s.monthDayHeaders}>
                      {DAY_MON_FIRST.map(d => (
                        <Text key={d} style={[s.monthDayHeader, { color: C.muted }]}>{d.slice(0,1)}</Text>
                      ))}
                    </View>

                    {/* Calendar grid */}
                    {monthGrid.map((week, wi) => (
                      <View key={wi} style={s.monthRow}>
                        {week.map((d, di) => {
                          const dayNum  = d.getDay();
                          const split   = getSplitLabel(dayNum, trainingDays);
                          const abbrev  = split ? (SPLIT_ABBREV[split] ?? split.slice(0,1)) : null;
                          const isToday = d.toDateString() === today.toDateString();
                          const dateStr = d.toISOString().split('T')[0];
                          const done    = !!monthSessions[dateStr];
                          const inMonth = d.getMonth() === now2.getMonth();
                          const isFuture = d > today;

                          return (
                            <View key={di} style={s.monthCell}>
                              <Text style={[s.monthCellDate, {
                                color: isToday ? C.accent : inMonth ? C.text : C.muted,
                                fontWeight: isToday ? '700' : '400',
                              }]}>{d.getDate()}</Text>
                              {split && inMonth && (
                                <View style={[s.monthDot,
                                  done && { backgroundColor: C.accent },
                                  !done && !isFuture && { backgroundColor: C.muted },
                                  isFuture && !done && { borderWidth: 1, borderColor: C.accent },
                                ]}>
                                  {abbrev && <Text style={[s.monthDotText, { color: done ? C.bg : (isFuture ? C.accent : C.bg) }]}>{abbrev}</Text>}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))}

                    {/* Month stats */}
                    {(() => {
                      const daysInMonth = lastOfMonth.getDate();
                      let planned = 0;
                      for (let d2 = 1; d2 <= daysInMonth; d2++) {
                        const dt = new Date(now2.getFullYear(), now2.getMonth(), d2);
                        if (trainingDays.includes(dt.getDay())) planned++;
                      }
                      const completed2 = Object.keys(monthSessions).filter(ds => ds.startsWith(`${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,'0')}`)).length;
                      const monthPRs  = recentPRs.filter(p => new Date(p.createdAt).getMonth() === now2.getMonth()).length;

                      return (
                        <View style={[s.monthStats, { borderColor: C.border }]}>
                          <View style={s.monthStatRow}>
                            <Text style={[s.monthStatLabel, { color: C.muted }]}>SESSIONS</Text>
                            <Text style={[s.monthStatVal, { color: C.text }]}>{completed2} / {planned}</Text>
                          </View>
                          {monthPRs > 0 && (
                            <View style={s.monthStatRow}>
                              <Text style={[s.monthStatLabel, { color: C.muted }]}>PRs THIS MONTH</Text>
                              <Text style={[s.monthStatVal, { color: C.accent }]}>{monthPRs} 🏆</Text>
                            </View>
                          )}
                          {weeklyBrief?.monthPhase && (
                            <View style={s.monthStatRow}>
                              <Text style={[s.monthStatLabel, { color: C.muted }]}>PHASE</Text>
                              <Text style={[s.monthStatVal, { color: C.text, fontSize: 13 }]}>{weeklyBrief.monthPhase}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                )}
              </View>
            );
          })()}

          {/* Recent PRs */}
          {recentPRs.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>RECENT PRs</Text>
              {recentPRs.map((pr) => {
                const isMe = pr.userId === user?.id;
                return (
                  <View key={pr.id} style={[s.prCard, { backgroundColor: C.card, borderColor: C.border }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={[s.prUsername, { color: isMe ? C.accent : C.green }]}>
                          {isMe ? 'YOU' : pr.username.toUpperCase()}
                        </Text>
                        <Text style={[s.prBadge, { color: C.muted }]}>PR 🏆</Text>
                      </View>
                      <Text style={[s.prExercise, { color: C.text }]}>{pr.exerciseName}</Text>
                      <Text style={[s.prWeightReps, { color: C.muted }]}>
                        {pr.weight}kg × {pr.reps} · {new Date(pr.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    {!isMe && partnerId && (
                      <TouchableOpacity
                        style={[s.sendPropsBtn, { borderColor: C.accent }]}
                        onPress={() => {
                          setPropsTarget({ toUser: partnerId, exercise: pr.exerciseName, weight: pr.weight, reps: pr.reps });
                          setPropsModalVisible(true);
                        }}
                      >
                        <Text style={[s.sendPropsBtnText, { color: C.accent }]}>Send Props 💪</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Spotify widget */}
          {isSpotifyConnected ? (
            <View style={[s.section, s.spotifyWidget]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={{ color: '#1DB954', fontSize: 18 }}>♫</Text>
                <Text style={[s.sectionLabel, { marginBottom: 0 }]}>TETHER GYM PLAYLIST</Text>
              </View>
              {spotifyTrackName && (
                <Text style={[s.spotifyNowPlaying, { color: C.muted }]}>Now: {spotifyTrackName}</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[s.spotifyBtn, { borderColor: '#1DB954' }]}
                  onPress={() => setScreen('spotify_search')}
                >
                  <Text style={[s.spotifyBtnText, { color: '#1DB954' }]}>+ Add track</Text>
                </TouchableOpacity>
                {partnerId && (
                  <TouchableOpacity
                    style={[s.spotifyBtn, { borderColor: C.border }]}
                    onPress={syncWithPartner}
                  >
                    <Text style={[s.spotifyBtnText, { color: C.muted }]}>Sync with partner</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : SPOT_ID ? (
            <View style={s.section}>
              <TouchableOpacity
                style={[s.spotifyConnect, { borderColor: '#1DB954' }]}
                onPress={() => promptAsync()}
              >
                <Text style={s.spotifyConnectText}>♫  Connect Spotify</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* History */}
          <TouchableOpacity style={s.histBtn} onPress={() => setScreen('history')}>
            <Text style={s.histBtnText}>VIEW HISTORY</Text>
          </TouchableOpacity>

        </ScrollView>

        {/* Props Modal */}
        {propsTarget && (
          <PropsModal
            visible={propsModalVisible}
            onClose={() => { setPropsModalVisible(false); setPropsTarget(null); }}
            fromUser={user?.id ?? ''}
            toUser={propsTarget.toUser}
            prExercise={propsTarget.exercise}
            prWeight={propsTarget.weight}
            prReps={propsTarget.reps}
          />
        )}

        {/* Cardio Log Modal */}
        <CardioModal
          visible={showCardioModal}
          cardioType={cardioType}
          cardioDuration={cardioDuration}
          loading={cardioLogging}
          C={C}
          onTypeChange={setCardioType}
          onDurationChange={setCardioDuration}
          onLog={logCardio}
          onClose={() => { setShowCardioModal(false); setCardioDuration(''); }}
        />
      </SafeAreaView>
    );
  }

  // ── PROPS INBOX ───────────────────────────────────────────────────────────
  if (screen === 'props_inbox') {
    return (
      <SafeAreaView style={s.bg}>
        <View style={s.histHeader}>
          <Text style={[s.histTitle, { color: C.text }]}>PROPS 💪</Text>
          <TouchableOpacity onPress={() => setScreen('home')}>
            <Text style={s.backBtnText}>← BACK</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {propsInbox.length === 0 ? (
            <Text style={[s.emptyText, { color: C.muted }]}>No props yet. Go hit a PR.</Text>
          ) : propsInbox.map((p, i) => (
            <View key={i} style={[s.histCard, { backgroundColor: C.card, borderColor: p.event_type === 'shit_talk' ? C.red : C.accentDim }]}>
              <Text style={[s.histType, { color: p.event_type === 'shit_talk' ? C.red : C.accent, fontSize: 16 }]}>{p.message}</Text>
              <Text style={[s.histDate, { color: C.muted, marginTop: 4 }]}>
                {p.event_type === 'shit_talk' ? '💀 Shit talk' : '💪 Props'} · {new Date(p.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── SPOTIFY SEARCH ────────────────────────────────────────────────────────
  if (screen === 'spotify_search') {
    return (
      <SafeAreaView style={s.bg}>
        <View style={s.histHeader}>
          <Text style={[s.histTitle, { color: '#1DB954', fontSize: 24 }]}>ADD TRACK</Text>
          <TouchableOpacity onPress={() => setScreen('home')}>
            <Text style={s.backBtnText}>← BACK</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16, flexDirection: 'row', gap: 10 }}>
          <TextInput
            style={[s.searchInput, { backgroundColor: C.card, borderColor: C.border, color: C.text, flex: 1 }]}
            placeholder="Search tracks..."
            placeholderTextColor={C.muted}
            value={spotifySearchQuery}
            onChangeText={setSpotifySearchQuery}
            onSubmitEditing={handleSpotifySearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[s.searchBtn, { backgroundColor: '#1DB954' }]}
            onPress={handleSpotifySearch}
          >
            {spotifySearching ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.searchBtnText}>GO</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
          {spotifyResults.map((track, i) => (
            <TouchableOpacity
              key={i}
              style={[s.histCard, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => addTrack(track)}
            >
              <Text style={[s.histType, { color: C.text, fontSize: 15 }]}>{track.name}</Text>
              <Text style={[s.histDate, { color: C.muted }]}>{track.artists.map(a => a.name).join(', ')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <SafeAreaView style={[s.bg, s.center]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={[s.loadingText, { color: C.accent, marginTop: 20 }]}>
          {isForm ? 'Building your program...' : 'LOADING SESSION...'}
        </Text>
        <Text style={[s.loadingText, { color: C.muted, fontSize: 12, marginTop: 8 }]}>
          Anthropic is reading your history
        </Text>
      </SafeAreaView>
    );
  }

  // ── WORKOUT ───────────────────────────────────────────────────────────────
  if (screen === 'workout' && plan) {
    const ex = plan.exercises[exerciseIndex];
    const totalSets = plan.exercises.reduce((a, e) => a + e.sets, 0);
    const progress = totalSets > 0 ? completedSets.length / totalSets : 0;
    const minsLeft = Math.max(0, Math.floor((hardStopTimeRef.current.getTime() - Date.now()) / 60000));
    const pr = prMap[ex?.name];
    const nextEx = plan.exercises[exerciseIndex + 1];

    return (
      <SafeAreaView style={s.bg}>
        <StatusBar barStyle={C.mode === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={s.wkHeader}>
          <TouchableOpacity onPress={() =>
            Alert.alert('End workout?', 'Progress will be saved.', [
              { text: 'Keep going' },
              { text: 'End', style: 'destructive', onPress: finishSession },
            ])
          }>
            <Text style={s.backBtnText}>← END</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.wkTitle}>{plan.label}</Text>
            <Text style={[s.wkSub, { color: C.accent }]}>{formatTime(elapsed)} · {minsLeft}m left</Text>
          </View>
        </View>

        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: C.accent }]} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {adjustments.length > 0 && (
            <View style={[s.adjustCard, { borderColor: C.accentDim }]}>
              {adjustments.map((a, i) => (
                <Text key={i} style={[s.adjustText, { color: C.accent }]}>{a}</Text>
              ))}
              <TouchableOpacity onPress={() => setAdjustments([])}>
                <Text style={[s.adjustDismiss, { color: C.muted }]}>dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {sneakyCardio && (
            <View style={[s.adjustCard, { borderColor: C.border }]}>
              <Text style={[s.adjustText, { color: C.muted }]}>{sneakyCardio.label} · {sneakyCardio.durationSeconds}s</Text>
              <TouchableOpacity onPress={() => setSneakyCardio(null)}>
                <Text style={[s.adjustDismiss, { color: C.muted }]}>done</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[s.exCard, { borderColor: C.accent }]}>
            <View style={s.exCardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[s.exName, { color: C.text }]}>{ex?.name}</Text>
                <Text style={[s.exMeta, { color: C.muted }]}>
                  {ex?.sets} sets · {ex?.targetReps} reps
                  {ex?.targetWeight ? ` · ${ex.targetWeight}${user?.weight_unit ?? 'lbs'} suggested` : ''}
                </Text>
                {ex?.note ? <Text style={[s.exNote, { color: C.muted }]}>{ex.note}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={[s.setBadge, { backgroundColor: C.accentBg, borderColor: C.accentDim }]}>
                  <Text style={[s.setBadgeText, { color: C.accent }]}>SET {currentSetIndex + 1}</Text>
                </View>
                {pr && (
                  <View style={[s.prBadgeBox, { backgroundColor: C.accentBg, borderColor: C.accentDim }]}>
                    <Text style={[s.prBadgeBoxText, { color: C.accent }]}>PR {pr.weight}×{pr.reps}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={s.inputRow}>
              <View style={s.inputWrap}>
                <Text style={[s.inputLabel, { color: C.muted }]}>WEIGHT ({(user?.weight_unit ?? 'lbs').toUpperCase()})</Text>
                <TextInput
                  style={[s.input, { backgroundColor: C.dark, borderColor: C.border, color: C.text }]}
                  placeholder={ex?.targetWeight ? String(ex.targetWeight) : '0'}
                  placeholderTextColor={C.muted}
                  keyboardType="decimal-pad"
                  value={setEntry.weight}
                  onChangeText={v => setSetEntry(p => ({ ...p, weight: v }))}
                />
              </View>
              <View style={s.inputWrap}>
                <Text style={[s.inputLabel, { color: C.muted }]}>REPS</Text>
                <TextInput
                  style={[s.input, { backgroundColor: C.dark, borderColor: C.border, color: C.text }]}
                  placeholder={ex?.targetReps ?? 'reps'}
                  placeholderTextColor={C.muted}
                  keyboardType="numeric"
                  value={setEntry.reps}
                  onChangeText={v => setSetEntry(p => ({ ...p, reps: v }))}
                />
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={[s.inputLabel, { color: C.muted, marginBottom: 8 }]}>HOW DID THAT FEEL?</Text>
              <EffortSelector value={effort} onChange={setEffort} accentColor={C.accent} />
            </View>

            <TouchableOpacity
              style={[s.logBtn, { backgroundColor: effort ? C.accent : C.dark, borderColor: effort ? C.accent : C.border }]}
              onPress={logSet}
              disabled={!effort || planLoading}
            >
              {planLoading
                ? <ActivityIndicator color={C.bg} size="small" />
                : <Text style={[s.logBtnText, { color: effort ? C.bg : C.muted }]}>
                    {isForm ? 'Log set →' : 'LOG SET →'}
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 10, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#7a1c1c' }}
              onPress={medEvac}
            >
              <Text style={{ color: '#e03c3c', fontSize: 12, fontWeight: '700', letterSpacing: 2 }}>🚑 MED EVAC</Text>
            </TouchableOpacity>
          </View>

          {restRunning && (
            <View style={[s.restBox, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[s.restLabel, { color: C.muted }]}>REST</Text>
              <Text style={[s.restTime, { color: C.accent }]}>{formatTime(restSeconds)}</Text>
              <TouchableOpacity style={[s.skipRestBtn, { borderColor: C.border }]} onPress={skipRest}>
                <Text style={[s.skipRestText, { color: C.muted }]}>SKIP REST</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[s.skipBtn, { borderColor: C.border }]} onPress={skipExercise}>
            <Text style={[s.skipBtnText, { color: C.muted }]}>Skip exercise →</Text>
          </TouchableOpacity>

          {nextEx && (
            <View style={[s.nextPreview, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[s.nextLabel, { color: C.muted }]}>NEXT UP</Text>
              <Text style={[s.nextName, { color: C.text }]}>{nextEx.name}</Text>
              <Text style={[s.nextMeta, { color: C.muted }]}>{nextEx.sets} sets · {nextEx.targetReps}</Text>
            </View>
          )}

          <TouchableOpacity style={[s.finishBtn, { borderColor: C.green }]} onPress={finishSession}>
            <Text style={[s.finishBtnText, { color: C.green }]}>
              {isForm ? 'Finish session 🌸' : 'FINISH WORKOUT'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* PR Celebration — theme-aware */}
        {celebPR && celebVisible && user?.theme === 'ronin' && (
          <RoninPRCelebration onComplete={() => setCelebVisible(false)} />
        )}
        {celebPR && celebVisible && user?.theme === 'valkyrie' && (
          <ValkyriePRCelebration onComplete={() => setCelebVisible(false)} />
        )}
        {celebPR && !['ronin', 'valkyrie'].includes(user?.theme ?? '') && (
          <PRCelebration
            visible={celebVisible}
            exercise={celebPR.exercise}
            weight={celebPR.weight}
            reps={celebPR.reps}
            onClose={() => setCelebVisible(false)}
            onSendProps={() => {
              setCelebVisible(false);
              if (partnerId) {
                setPropsTarget({ toUser: partnerId, exercise: celebPR.exercise, weight: celebPR.weight, reps: celebPR.reps });
                setPropsModalVisible(true);
              }
            }}
          />
        )}

        {/* Ronin session-start ink wash */}
        {showInkWash && <RoninInkWash onComplete={() => setShowInkWash(false)} />}
        {propsTarget && (
          <PropsModal
            visible={propsModalVisible}
            onClose={() => { setPropsModalVisible(false); setPropsTarget(null); }}
            fromUser={user?.id ?? ''}
            toUser={propsTarget.toUser}
            prExercise={propsTarget.exercise}
            prWeight={propsTarget.weight}
            prReps={propsTarget.reps}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if (screen === 'complete') {
    const prsHit = [...new Set(completedSets.filter(s => s.isPR).map(s => s.exerciseName))];
    return (
      <SafeAreaView style={[s.bg, s.center, { padding: 24 }]}>
        <Text style={{ fontSize: 56, marginBottom: 12 }}>{isForm ? '💕' : '🏆'}</Text>
        <Text style={[s.doneTitle, { color: C.accent }]}>{isForm ? 'Done.' : 'DONE'}</Text>
        <Text style={[s.doneSub, { color: C.muted }]}>{plan?.label ?? 'SESSION'} COMPLETE</Text>

        <View style={[s.doneStats, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.statRow}>
            <Text style={[s.statLabel, { color: C.muted }]}>DURATION</Text>
            <Text style={[s.statVal, { color: C.accent }]}>{formatTime(elapsed)}</Text>
          </View>
          <View style={s.statRow}>
            <Text style={[s.statLabel, { color: C.muted }]}>SETS LOGGED</Text>
            <Text style={[s.statVal, { color: C.text }]}>{completedSets.length}</Text>
          </View>
          {prsHit.length > 0 && (
            <View style={[s.statRow, { borderBottomWidth: 0 }]}>
              <Text style={[s.statLabel, { color: C.muted }]}>PRs HIT</Text>
              <Text style={[s.statVal, { color: C.green }]}>{prsHit.length}</Text>
            </View>
          )}
        </View>

        {prsHit.length > 0 && (
          <View style={s.prList}>
            {prsHit.map((name, i) => (
              <View key={i} style={[s.prTag, { backgroundColor: C.accentBg, borderColor: C.accentDim }]}>
                <Text style={[s.prTagText, { color: C.accent }]}>🏆 {name}</Text>
              </View>
            ))}
          </View>
        )}

        {partnerId && prsHit.length > 0 && (
          <TouchableOpacity
            style={[s.startBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.accent, marginTop: 12 }]}
            onPress={() => {
              setPropsTarget({ toUser: partnerId });
              setPropsModalVisible(true);
            }}
          >
            <Text style={[s.startBtnText, { color: C.accent, fontSize: 16 }]}>Send props to partner 💪</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.startBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginTop: 12 }]}
          onPress={() => setShowCardioModal(true)}
        >
          <Text style={[s.startBtnText, { color: C.muted, fontSize: 14 }]}>🏃 LOG CARDIO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.startBtn, { backgroundColor: C.accent, marginTop: 12 }]}
          onPress={() => { setScreen('home'); loadHistory(); }}
        >
          <Text style={[s.startBtnText, { color: C.bg }]}>
            {isForm ? 'Back to home 🌺' : 'BACK TO HOME'}
          </Text>
        </TouchableOpacity>

        {propsTarget && (
          <PropsModal
            visible={propsModalVisible}
            onClose={() => { setPropsModalVisible(false); setPropsTarget(null); }}
            fromUser={user?.id ?? ''}
            toUser={propsTarget.toUser}
          />
        )}

        <CardioModal
          visible={showCardioModal}
          cardioType={cardioType}
          cardioDuration={cardioDuration}
          loading={cardioLogging}
          C={C}
          onTypeChange={setCardioType}
          onDurationChange={setCardioDuration}
          onLog={logCardio}
          onClose={() => { setShowCardioModal(false); setCardioDuration(''); }}
        />
      </SafeAreaView>
    );
  }

  // ── HISTORY ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.bg}>
      <View style={s.histHeader}>
        <Text style={[s.histTitle, { color: C.text }]}>{isForm ? 'History 💕' : 'HISTORY'}</Text>
        <TouchableOpacity onPress={() => setScreen('home')}>
          <Text style={s.backBtnText}>← BACK</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {history.length === 0 ? (
          <Text style={[s.emptyText, { color: C.muted }]}>
            {isForm ? "No sessions yet.\nYou\u2019ve got this! \uD83D\uDCAA" : 'NO SESSIONS YET\nGET AFTER IT'}
          </Text>
        ) : history.map((h, i) => (
          <View key={i} style={[s.histCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={s.histTop}>
              <Text style={[s.histType, { color: C.text }]}>{h.label ?? 'Session'}</Text>
              <Text style={[s.histDate, { color: C.muted }]}>{h.date}</Text>
            </View>
            {h.ended_at && h.started_at && (
              <Text style={[s.histDur, { color: C.muted }]}>
                {formatTime(Math.floor((new Date(h.ended_at).getTime() - new Date(h.started_at).getTime()) / 1000))}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── CARDIO MODAL ──────────────────────────────────────────────────────────────
const CARDIO_TYPES = ['Elliptical', 'Run', 'Bike', 'Row', 'Swim', 'Walk', 'Stairmaster', 'Jump Rope'];

function CardioModal({ visible, cardioType, cardioDuration, loading, C, onTypeChange, onDurationChange, onLog, onClose }: {
  visible: boolean;
  cardioType: string;
  cardioDuration: string;
  loading: boolean;
  C: ThemeTokens;
  onTypeChange: (t: string) => void;
  onDurationChange: (d: string) => void;
  onLog: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={{ backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
          <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700', letterSpacing: 3, marginBottom: 16 }}>LOG CARDIO</Text>

          <Text style={{ color: C.muted, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CARDIO_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: cardioType === t ? C.accent : C.border, backgroundColor: cardioType === t ? C.accentBg : C.dark }}
                  onPress={() => onTypeChange(t)}
                >
                  <Text style={{ color: cardioType === t ? C.accent : C.muted, fontWeight: '600', fontSize: 12 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={{ color: C.muted, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>DURATION (MINUTES)</Text>
          <TextInput
            style={{ backgroundColor: C.dark, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, color: C.text, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 20 }}
            placeholder="0"
            placeholderTextColor={C.muted}
            keyboardType="numeric"
            value={cardioDuration}
            onChangeText={onDurationChange}
          />

          <TouchableOpacity
            style={{ backgroundColor: cardioDuration ? C.accent : C.dark, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 }}
            onPress={onLog}
            disabled={!cardioDuration || loading}
          >
            {loading
              ? <ActivityIndicator color={C.bg} />
              : <Text style={{ color: cardioDuration ? C.bg : C.muted, fontWeight: '700', fontSize: 14, letterSpacing: 2 }}>LOG IT →</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', padding: 12 }}>
            <Text style={{ color: C.muted, fontSize: 12 }}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
function makeStyles(C: ThemeTokens) {
  return StyleSheet.create({
    bg:            { flex: 1, backgroundColor: C.bg },
    center:        { justifyContent: 'center', alignItems: 'center' },
    backBtn:       { padding: 16 },
    backBtnText:   { fontSize: 12, color: C.muted, letterSpacing: 1 },

    // Home
    homeHeader:    { padding: 24, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: C.border },
    dayLabel:      { fontSize: 10, color: C.accent, letterSpacing: 3, marginBottom: 4 },
    homeTitle:     { fontSize: 52, color: C.text, fontWeight: '700', letterSpacing: 2, lineHeight: 56 },
    homeSub:       { fontSize: 11, color: C.muted, marginTop: 4 },

    propsBadge:    { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
    propsBadgeText:{ fontSize: 13, fontWeight: '700' },

    hardStopRow:   { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
    hardStopLabel: { fontSize: 10, color: C.muted, letterSpacing: 2, width: 70 },
    hardStopChips: { flexDirection: 'row', gap: 6, flex: 1 },
    stopChip:      { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.dark, alignItems: 'center' },
    stopChipText:  { fontSize: 12, color: C.muted, fontWeight: '600' },
    leaveByBtn:    { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', backgroundColor: C.dark },
    leaveByLabel:  { fontSize: 8, letterSpacing: 1, fontWeight: '700' },
    leaveByTime:   { fontSize: 13, fontWeight: '700', marginTop: 2 },

    modeGrid:      { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
    modeCard:      { width: '47%', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, gap: 4 },
    modeCardFull:  { width: '100%' },
    beastCard:     { borderColor: '#660011', backgroundColor: '#0d0000' },
    modeIcon:      { fontSize: 28 },
    modeLabel:     { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
    modeSub:       { fontSize: 10, color: C.muted },

    // Week + PR sections
    section:       { marginHorizontal: 16, marginBottom: 16 },
    sectionLabel:  { fontSize: 10, color: C.muted, letterSpacing: 3, marginBottom: 10 },

    // Calendar tabs
    calTabRow:     { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 12 },
    calTab:        { flex: 1, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent', alignItems: 'center' },
    calTabText:    { fontSize: 10, fontWeight: '700', letterSpacing: 2 },

    // Compact week strip
    weekStrip:     { flexDirection: 'row', gap: 3, alignItems: 'center' },
    weekDay:       { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 5, alignItems: 'center', gap: 3 },
    weekDayName:   { fontSize: 8, color: C.text, fontWeight: '700', letterSpacing: 0.5 },
    weekDayLabel:  { fontSize: 8, color: C.text, fontWeight: '600', textAlign: 'center' },
    weekDayRest:   { fontSize: 8 },
    expandArrow:   { paddingLeft: 6 },

    // Expanded week cards
    briefTheme:    { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    dayCard:       { borderRadius: 12, borderWidth: 1, padding: 14 },
    dayCardRest:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 4 },
    dayCardDayName:{ fontSize: 9, fontWeight: '700', letterSpacing: 2 },
    dayCardRestLabel: { fontSize: 9, letterSpacing: 1 },
    dayCardSplit:  { fontSize: 18, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
    dayCardMuscles:{ fontSize: 10, marginTop: 2, letterSpacing: 0.5 },
    dayCardFocus:  { fontSize: 11, marginTop: 8, lineHeight: 16 },
    dayCardNote:   { fontSize: 11, fontWeight: '700', marginTop: 4 },
    liftChip:      { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    liftChipText:  { fontSize: 10, fontWeight: '600' },
    todayPip:      { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
    weeklyTarget:  { fontSize: 10, letterSpacing: 1, textAlign: 'center', marginTop: 4 },

    // Month grid
    monthDayHeaders:{ flexDirection: 'row', marginBottom: 4 },
    monthDayHeader: { flex: 1, textAlign: 'center', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
    monthRow:      { flexDirection: 'row', marginBottom: 4 },
    monthCell:     { flex: 1, alignItems: 'center', minHeight: 40, gap: 2 },
    monthCellDate: { fontSize: 10 },
    monthDot:      { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    monthDotText:  { fontSize: 8, fontWeight: '800' },
    monthStats:    { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10, gap: 8 },
    monthStatRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    monthStatLabel:{ fontSize: 9, letterSpacing: 2, fontWeight: '700' },
    monthStatVal:  { fontSize: 16, fontWeight: '700' },

    prCard:        { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
    prUsername:    { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
    prBadge:       { fontSize: 10 },
    prExercise:    { fontSize: 16, fontWeight: '700' },
    prWeightReps:  { fontSize: 11, marginTop: 2 },
    sendPropsBtn:  { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 },
    sendPropsBtnText: { fontSize: 12, fontWeight: '600' },

    // Spotify
    spotifyWidget: { borderRadius: 12, borderWidth: 1, borderColor: '#1DB954', backgroundColor: C.card, padding: 16 },
    spotifyNowPlaying: { fontSize: 11, fontStyle: 'italic', marginBottom: 4 },
    spotifyBtn:    { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
    spotifyBtnText:{ fontSize: 12, fontWeight: '600' },
    spotifyConnect:{ borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
    spotifyConnectText: { fontSize: 15, color: '#1DB954', fontWeight: '600', letterSpacing: 1 },
    searchInput:   { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
    searchBtn:     { borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center', minWidth: 60 },
    searchBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

    histBtn:       { marginHorizontal: 16, marginBottom: 32, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    histBtnText:   { fontSize: 11, color: C.muted, letterSpacing: 2 },
    loadingText:   { fontSize: 16, fontWeight: '600', letterSpacing: 1 },

    // Workout
    wkHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    wkTitle:       { fontSize: 28, color: C.text, fontWeight: '700', letterSpacing: 1 },
    wkSub:         { fontSize: 11, marginTop: 2 },
    progressBg:    { height: 3, backgroundColor: C.border, overflow: 'hidden' },
    progressFill:  { height: 3 },
    adjustCard:    { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 10 },
    adjustText:    { fontSize: 13, fontWeight: '500', marginBottom: 4 },
    adjustDismiss: { fontSize: 10, letterSpacing: 1, textAlign: 'right', marginTop: 4 },
    exCard:        { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
    exCardHead:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    exName:        { fontSize: 22, fontWeight: '700', letterSpacing: 0.5, lineHeight: 28 },
    exMeta:        { fontSize: 11, marginTop: 3 },
    exNote:        { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
    setBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    setBadgeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    prBadgeBox:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
    prBadgeBoxText:{ fontSize: 9, fontWeight: '600' },
    inputRow:      { flexDirection: 'row', gap: 10, marginBottom: 4 },
    inputWrap:     { flex: 1 },
    inputLabel:    { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
    input:         { borderWidth: 1, borderRadius: 10, padding: 14, textAlign: 'center', fontSize: 20, fontWeight: '700' },
    logBtn:        { marginTop: 16, borderRadius: 12, borderWidth: 1, padding: 18, alignItems: 'center' },
    logBtnText:    { fontSize: 18, fontWeight: '700', letterSpacing: 2 },
    restBox:       { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 12 },
    restLabel:     { fontSize: 10, letterSpacing: 4, marginBottom: 4 },
    restTime:      { fontSize: 64, fontWeight: '700', letterSpacing: 2, lineHeight: 68 },
    skipRestBtn:   { marginTop: 16, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10, borderWidth: 1 },
    skipRestText:  { fontSize: 12, letterSpacing: 2 },
    skipBtn:       { borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center', marginBottom: 12 },
    skipBtnText:   { fontSize: 12, letterSpacing: 1 },
    nextPreview:   { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
    nextLabel:     { fontSize: 9, letterSpacing: 3, marginBottom: 4 },
    nextName:      { fontSize: 16, fontWeight: '600' },
    nextMeta:      { fontSize: 10, marginTop: 2 },
    finishBtn:     { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center', marginBottom: 8, marginTop: 4 },
    finishBtnText: { fontSize: 18, fontWeight: '700', letterSpacing: 2 },

    // Complete
    startBtn:      { width: '100%', borderRadius: 14, padding: 20, alignItems: 'center' },
    startBtnText:  { fontSize: 20, fontWeight: '700', letterSpacing: 2 },
    doneTitle:     { fontSize: 72, fontWeight: '700', letterSpacing: 3, lineHeight: 76 },
    doneSub:       { fontSize: 12, letterSpacing: 2, marginBottom: 24, marginTop: 6 },
    doneStats:     { width: '100%', borderRadius: 14, borderWidth: 1, padding: 20, marginBottom: 16 },
    statRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    statLabel:     { fontSize: 10, letterSpacing: 1 },
    statVal:       { fontSize: 24, fontWeight: '700' },
    prList:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
    prTag:         { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
    prTagText:     { fontSize: 11, fontWeight: '600' },

    // History / Inbox
    histHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
    histTitle:     { fontSize: 38, fontWeight: '700', letterSpacing: 1 },
    emptyText:     { textAlign: 'center', paddingTop: 60, fontSize: 15, lineHeight: 28, letterSpacing: 1 },
    histCard:      { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10 },
    histTop:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    histType:      { fontSize: 20, fontWeight: '700' },
    histDate:      { fontSize: 10 },
    histDur:       { fontSize: 12 },
  });
}
