import { supabase } from '../lib/supabase';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Vibration, AppState, AppStateStatus,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const FOCUS_DURATION = 52 * 60;
const BREAK_DURATION = 17 * 60;

const TIMER_START_KEY   = 'workday_timer_start';
const TIMER_MODE_KEY    = 'workday_timer_mode';
const TIMER_NOTIF_ID_KEY = 'workday_timer_notif_id';

const BRAIN_STATES = [
  { id: 'locked',    label: '🔒 Locked in', color: '#22c55e' },
  { id: 'okay',      label: '😐 Okay',       color: '#eab308' },
  { id: 'scattered', label: '🌀 Scattered',  color: '#f97316' },
  { id: 'toast',     label: '💀 Toast',      color: '#ef4444' },
];

// ── NOTIFICATIONS SETUP ────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android notification channel — ensures lock-screen visibility and sound.
Notifications.setNotificationChannelAsync('default', {
  name: 'Tether Timers',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 500, 200, 500],
  sound: 'default',
  bypassDnd: false,
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  showBadge: false,
}).catch(() => {});

// ── HELPERS ───────────────────────────────────────────────────────────────────
async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function playBeep() {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const sound = new Audio.Sound();
    await sound.loadAsync(require('../../assets/audio/beep-beep.wav'));
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.isLoaded && s.didJustFinish) sound.unloadAsync();
    });
  } catch {
    // Fall back to vibration only
  }
}

async function fireBlockEndNotification(type: 'focus' | 'break') {
  const isFocus = type === 'focus';
  Vibration.vibrate([0, 500, 200, 500]);
  await playBeep();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isFocus ? '🎯 Focus block done' : '⚡ Break over',
      body: isFocus ? 'Take a break — you earned it.' : "Back to it. Let's go.",
      sound: true,
    },
    trigger: null,
  });
}

/**
 * Schedules an OS-level notification at the exact future fire time.
 * Cancels any previously scheduled block notification first.
 * Stores the notification ID and wall-clock start time so we can
 * recover elapsed time when the app returns to foreground.
 */
async function scheduleBlockEndNotification(
  mode: 'focus' | 'break',
  secondsRemaining: number,
): Promise<void> {
  // Cancel any existing scheduled block notification
  const existingId = await AsyncStorage.getItem(TIMER_NOTIF_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const fireDate = new Date(Date.now() + secondsRemaining * 1000);
  const isFocus = mode === 'focus';

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: isFocus ? '🎯 Focus block done' : '⚡ Break over',
      body: isFocus ? 'Take a break — you earned it.' : "Back to it. Let's go.",
      sound: true,
      vibrate: [0, 500, 200, 500],
      sticky: false,
    },
    trigger: { date: fireDate, channelId: 'default' } as any,
  });

  await AsyncStorage.setItem(TIMER_NOTIF_ID_KEY, notifId);
  await AsyncStorage.setItem(TIMER_START_KEY, Date.now().toString());
  await AsyncStorage.setItem(TIMER_MODE_KEY, mode);
}

/**
 * Cancels the scheduled OS notification and clears all timer recovery keys.
 */
async function cancelScheduledBlockNotification(): Promise<void> {
  const existingId = await AsyncStorage.getItem(TIMER_NOTIF_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    await AsyncStorage.removeItem(TIMER_NOTIF_ID_KEY);
    await AsyncStorage.removeItem(TIMER_START_KEY);
    await AsyncStorage.removeItem(TIMER_MODE_KEY);
  }
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function WorkdayRhythm() {
  const { themeTokens: T } = useUser();

  const [brainState, setBrainState] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'focus' | 'break'>('idle');
  const [seconds, setSeconds] = useState(FOCUS_DURATION);
  const [blocks, setBlocks] = useState(0);
  const [permGranted, setPermGranted] = useState(false);

  // Track mode + seconds in refs so the AppState handler can read them
  const modeRef = useRef<'idle' | 'focus' | 'break'>('idle');
  const secondsRef = useRef(FOCUS_DURATION);
  const blocksRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    requestNotificationPermission().then(setPermGranted);

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, []);

  function handleAppStateChange(nextState: AppStateStatus) {
    const prev = appStateRef.current;
    appStateRef.current = nextState;

    if (prev === 'active' && nextState !== 'active') {
      // App going to background / screen locking.
      // The foreground JS setInterval won't survive — schedule the OS notification
      // at the exact future fire time so it fires even if JS is dead.
      if (modeRef.current !== 'idle' && secondsRef.current > 0) {
        scheduleBlockEndNotification(modeRef.current, secondsRef.current);
      }
    }

    if (nextState === 'active' && prev !== 'active') {
      // App coming back to foreground.
      // Cancel the OS notification — the foreground timer takes over.
      cancelScheduledBlockNotification();

      // Recalculate actual elapsed time from wall clock.
      AsyncStorage.getItem(TIMER_START_KEY).then(startStr => {
        if (!startStr || modeRef.current === 'idle') return;

        const elapsed = Math.floor((Date.now() - parseInt(startStr, 10)) / 1000);
        const totalDuration = modeRef.current === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
        const remaining = Math.max(0, totalDuration - elapsed);

        if (remaining === 0) {
          // Block ended while backgrounded — fire completion logic now.
          if (modeRef.current === 'focus') {
            const newBlocks = blocksRef.current + 1;
            blocksRef.current = newBlocks;
            setBlocks(newBlocks);
            modeRef.current = 'break';
            setMode('break');
            setSeconds(BREAK_DURATION);
            secondsRef.current = BREAK_DURATION;
            scheduleBlockEndNotification('break', BREAK_DURATION);
          } else {
            modeRef.current = 'focus';
            setMode('focus');
            setSeconds(FOCUS_DURATION);
            secondsRef.current = FOCUS_DURATION;
            scheduleBlockEndNotification('focus', FOCUS_DURATION);
          }
        } else {
          // Block still running — update UI to show correct remaining time.
          setSeconds(remaining);
          secondsRef.current = remaining;
        }
      }).catch(() => {});

      setBlocks(blocksRef.current);
    }
  }

  // Foreground timer
  useEffect(() => {
    if (mode === 'idle') return;
    modeRef.current = mode;

    const interval = setInterval(() => {
      setSeconds(s => {
        const next = s - 1;
        secondsRef.current = next;
        if (next <= 0) {
          if (modeRef.current === 'focus') {
            const newBlocks = blocksRef.current + 1;
            blocksRef.current = newBlocks;
            setBlocks(newBlocks);
            modeRef.current = 'break';
            setMode('break');
            secondsRef.current = BREAK_DURATION;
            fireBlockEndNotification('focus');
            cancelScheduledBlockNotification().then(() =>
              scheduleBlockEndNotification('break', BREAK_DURATION),
            );
            return BREAK_DURATION;
          } else {
            modeRef.current = 'focus';
            setMode('focus');
            secondsRef.current = FOCUS_DURATION;
            fireBlockEndNotification('break');
            cancelScheduledBlockNotification().then(() =>
              scheduleBlockEndNotification('focus', FOCUS_DURATION),
            );
            return FOCUS_DURATION;
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const startFocus = async () => {
    if (brainState) {
      await supabase.from('workday_sessions').insert({
        brain_state: brainState,
        blocks_completed: 0,
        date: new Date().toISOString().split('T')[0],
      });
    }
    secondsRef.current = FOCUS_DURATION;
    blocksRef.current = 0;
    setSeconds(FOCUS_DURATION);
    setBlocks(0);
    setMode('focus');
    scheduleBlockEndNotification('focus', FOCUS_DURATION);
  };

  const reset = async () => {
    cancelScheduledBlockNotification();
    if (blocks > 0) {
      await supabase
        .from('workday_sessions')
        .update({ blocks_completed: blocks })
        .eq('date', new Date().toISOString().split('T')[0]);
    }
    modeRef.current = 'idle';
    secondsRef.current = FOCUS_DURATION;
    blocksRef.current = 0;
    setMode('idle');
    setSeconds(FOCUS_DURATION);
    setBlocks(0);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: T.text }]}>Workday Rhythm</Text>

        {!permGranted && (
          <TouchableOpacity
            style={[styles.permBanner, { backgroundColor: T.card, borderColor: T.border }]}
            onPress={() => requestNotificationPermission().then(setPermGranted)}
          >
            <Text style={[styles.permText, { color: T.muted }]}>
              Tap to allow notifications — required for locked-screen timer alerts.
            </Text>
          </TouchableOpacity>
        )}

        {/* Brain State */}
        <Text style={[styles.sectionLabel, { color: T.muted }]}>How are you arriving?</Text>
        <View style={styles.brainRow}>
          {BRAIN_STATES.map(state => (
            <TouchableOpacity
              key={state.id}
              style={[
                styles.brainBtn,
                { backgroundColor: T.card, borderColor: T.border },
                brainState === state.id && { backgroundColor: state.color, borderColor: state.color },
              ]}
              onPress={() => setBrainState(state.id)}
            >
              <Text style={[styles.brainText, { color: T.text }]}>{state.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timer */}
        <View style={[styles.timerBox, { backgroundColor: T.card, borderColor: T.border }]}>
          <Text style={[styles.modeLabel, { color: T.muted }]}>
            {mode === 'idle' ? 'Ready' : mode === 'focus' ? '🎯 Focus Block' : '☕ Break'}
          </Text>
          <Text style={[styles.timer, { color: T.text }]}>{formatTime(seconds)}</Text>
          <Text style={[styles.blocksText, { color: T.muted }]}>{blocks} blocks completed today</Text>
        </View>

        {/* Controls */}
        <View style={styles.btnRow}>
          {mode === 'idle' ? (
            <TouchableOpacity style={[styles.startBtn, { backgroundColor: T.accent }]} onPress={startFocus}>
              <Text style={styles.startBtnText}>Start Focus Block</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.resetBtn, { backgroundColor: T.card, borderColor: T.border }]} onPress={reset}>
              <Text style={[styles.resetBtnText, { color: T.text }]}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.hint, { color: T.muted }]}>
          Lock your screen — notifications will fire when each block ends.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  permBanner: { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 20 },
  permText: { fontSize: 13, lineHeight: 18 },
  sectionLabel: { fontSize: 16, marginBottom: 12 },
  brainRow: { gap: 10, marginBottom: 32 },
  brainBtn: { padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  brainText: { fontSize: 15 },
  timerBox: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: 'center', marginBottom: 32 },
  modeLabel: { fontSize: 18, marginBottom: 8 },
  timer: { fontSize: 72, fontWeight: '700', letterSpacing: -2 },
  blocksText: { fontSize: 14, marginTop: 12 },
  btnRow: { alignItems: 'center', marginBottom: 24 },
  startBtn: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 16 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  resetBtn: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 16, borderWidth: 1 },
  resetBtnText: { fontSize: 18, fontWeight: '600' },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
