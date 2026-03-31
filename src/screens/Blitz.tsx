import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, ActivityIndicator, ScrollView, Animated,
  AppState, AppStateStatus, Vibration, Linking, Alert,
} from 'react-native';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/logEvent';
import { ANTHROPIC_API_KEY } from '../lib/config';
import { getHouseholdPlaylistId, getValidAccessToken } from '../lib/spotifyService';

// ── TYPES ──────────────────────────────────────────────────────────────────────
type MissionStatus = 'locked_in' | 'holding' | 'scattered' | 'critical';
type Screen = 'status' | 'mission' | 'debrief' | 'report';

interface Mission {
  room: string;
  zone: string;
  minutes: number;
  emoji: string;
}

interface CompletedMission {
  room: string;
  zone: string;
  elapsed: number;
}

const STATUS_OPTIONS: Array<{
  id: MissionStatus;
  label: string;
  desc: string;
  emoji: string;
}> = [
  { id: 'locked_in', label: 'LOCKED IN',  desc: 'Ready to move',                       emoji: '⚔️' },
  { id: 'holding',   label: 'HOLDING',    desc: 'Slow and steady',                      emoji: '🛡️' },
  { id: 'scattered', label: 'SCATTERED',  desc: 'Need direction',                       emoji: '🗡️' },
  { id: 'critical',  label: 'CRITICAL',   desc: "Surrounded. Don't know where to start.", emoji: '🏴' },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function Blitz({ onClose }: { onClose: () => void }) {
  const { user, themeTokens: T } = useUser();
  const s = makeStyles(T);

  const [screen, setScreen] = useState<Screen>('status');
  const [status, setStatus] = useState<MissionStatus | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(false);

  // Timer — counts UP, synced via ref for background
  const [elapsed, setElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const timerActiveRef = useRef(false);
  const missionRef = useRef<Mission | null>(null);
  const bgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Session tracking
  const [completed, setCompleted] = useState<CompletedMission[]>([]);
  const [areasSecured, setAreasSecured] = useState<string[]>([]);

  // Debrief
  const [debriefCount, setDebriefCount] = useState(0);
  const debriefRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Spotify
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const spotifyConnected = !!user?.spotify_access_token;

  // Celebration flash
  const flashAnim = useRef(new Animated.Value(0)).current;

  // ── LIFECYCLE ────────────────────────────────────────────────────────────────
  useEffect(() => {
    requestNotificationPermission();
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
      if (timerRef.current) clearInterval(timerRef.current);
      if (bgTimerRef.current) clearInterval(bgTimerRef.current);
      if (debriefRef.current) clearInterval(debriefRef.current);
    };
  }, []);

  useEffect(() => {
    if (user?.house_name) {
      getHouseholdPlaylistId(user.house_name).then(setPlaylistId);
    }
  }, [user?.house_name]);

  // ── BACKGROUND TIMER ─────────────────────────────────────────────────────────
  function handleAppStateChange(nextState: AppStateStatus) {
    const prev = appStateRef.current;
    appStateRef.current = nextState;

    if (prev === 'active' && nextState !== 'active') {
      // Going to background — hand off to bg timer
      if (timerActiveRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        startBgTimer();
      }
    } else if (nextState === 'active') {
      // Returning to foreground — sync elapsed from ref
      stopBgTimer();
      if (timerActiveRef.current) {
        setElapsed(elapsedRef.current);
        startFgTimer();
      }
    }
  }

  function startBgTimer() {
    if (bgTimerRef.current) return;
    bgTimerRef.current = setInterval(() => {
      if (!timerActiveRef.current) { stopBgTimer(); return; }
      elapsedRef.current += 1;
      const m = missionRef.current;
      if (m && elapsedRef.current >= m.minutes * 60) {
        stopBgTimer();
        fireMissionCompleteNotification(m.room, m.zone);
      }
    }, 1000);
  }

  function stopBgTimer() {
    if (bgTimerRef.current) { clearInterval(bgTimerRef.current); bgTimerRef.current = null; }
  }

  function startFgTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  }

  function stopFgTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function startTimer() {
    elapsedRef.current = 0;
    timerActiveRef.current = true;
    setElapsed(0);
    setTimerActive(true);
    startFgTimer();
  }

  function stopTimer() {
    timerActiveRef.current = false;
    setTimerActive(false);
    stopFgTimer();
    stopBgTimer();
  }

  // ── NOTIFICATIONS + AUDIO ────────────────────────────────────────────────────
  async function requestNotificationPermission() {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async function fireMissionCompleteNotification(room: string, zone: string) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'AREA SECURED',
        body: `${room} — ${zone}. Stand down or continue.`,
        sound: true,
      },
      trigger: null,
    });
    Vibration.vibrate([0, 300, 200, 300]);
    await playBeep();
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

  // ── MISSION FETCH ────────────────────────────────────────────────────────────
  async function fetchMission(s: MissionStatus) {
    setLoading(true);
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 120,
          system: `You are a field commander generating household missions for someone with ADHD who may be overwhelmed.
Rules:
- Never give more than one mission at a time
- Never reference what else needs doing
- Never say "clean" — use directional language: clear, hold, secure, sweep
- Missions are a location + a direction + a time limit only
- Location: room name in CAPS (LIVING ROOM, KITCHEN, BEDROOM, BATHROOM, OFFICE, HALLWAY)
- Direction: compass corner or zone (SW CORNER, NORTH WALL, CENTER FLOOR, EAST SHELF, ENTRY ZONE, MAIN SURFACE)
- Time: 10-20 minutes only. Never more.
- CRITICAL energy: 10-15 min max, very small zone
- LOCKED IN energy: up to 20 min, larger sweep
- No explanation. No encouragement. Just the mission.
- Return JSON only: { "room": "ROOM NAME", "zone": "ZONE NAME", "minutes": 15, "emoji": "⚔️" }
- Emoji: ⚔️ for locked_in, 🛡️ for holding, 🗡️ for scattered, 🏴 for critical`,
          messages: [{
            role: 'user',
            content: `Energy level: ${s.toUpperCase()}. Generate one mission. Return JSON only.`,
          }],
        }),
      });
      const data = await resp.json();
      const raw = data.content?.[0]?.text ?? '{}';
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned) as Mission;
      missionRef.current = parsed;
      setMission(parsed);
    } catch {
      const fallback: Mission = { room: 'LIVING ROOM', zone: 'SW CORNER', minutes: 15, emoji: '🏴' };
      missionRef.current = fallback;
      setMission(fallback);
    } finally {
      setLoading(false);
      startTimer();
      setScreen('mission');
    }
  }

  function handleSelectStatus(s: MissionStatus) {
    setStatus(s);
    fetchMission(s);
    if (user?.id) logEvent(user.id, 'blitz_start', { status: s });
  }

  // ── COMPLETE / REASSIGN ──────────────────────────────────────────────────────
  function handleComplete() {
    stopTimer();
    if (!mission) return;

    const newCompleted = [...completed, { room: mission.room, zone: mission.zone, elapsed: elapsedRef.current }];
    setCompleted(newCompleted);

    if (!areasSecured.includes(mission.room)) {
      setAreasSecured(prev => [...prev, mission.room]);
    }

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    Vibration.vibrate([0, 300, 200, 300]);

    startDebrief(newCompleted.length >= 3 ? 'report' : 'mission');
  }

  function startDebrief(nextScreen: Screen) {
    setScreen('debrief');
    setDebriefCount(120);
    debriefRef.current = setInterval(() => {
      setDebriefCount(c => {
        if (c <= 1) {
          clearInterval(debriefRef.current!);
          if (nextScreen === 'mission') fetchMission(status!);
          else setScreen('report');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function handleReassign() {
    stopTimer();
    if (status) fetchMission(status);
  }

  function skipDebrief() {
    if (debriefRef.current) clearInterval(debriefRef.current);
    if (completed.length >= 3) setScreen('report');
    else fetchMission(status!);
  }

  // ── SESSION LOG ──────────────────────────────────────────────────────────────
  async function handleLogToWarRoom() {
    if (!user?.id) return;
    const totalElapsed = completed.reduce((sum, m) => sum + m.elapsed, 0);
    await supabase.from('field_reset_sessions').insert({
      user_id: user.id,
      mission_status: status,
      missions_complete: completed.length,
      minutes_in_field: Math.round(totalElapsed / 60),
      areas_secured: areasSecured,
    });
    logEvent(user.id, 'blitz_complete', {
      missions: completed.length,
      minutes: Math.round(totalElapsed / 60),
      areas: areasSecured,
    });

    // After 3 total BLITZ sessions, suggest adding a weekly calendar block
    const { count } = await supabase
      .from('field_reset_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (count === 3) {
      Alert.alert(
        'Add BLITZ to your calendar?',
        "You've done 3 sessions. Want to block 10 minutes every day for it?",
        [
          { text: 'Not yet', style: 'cancel' },
          { text: 'Yes — add it', onPress: addBlitzToCalendar },
        ],
      );
    }

    onClose();
  }

  async function addBlitzToCalendar() {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') return;
      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const target = cals.find(c => c.allowsModifications) ?? cals[0];
      if (!target) return;
      const today = new Date();
      for (let d = 0; d < 28; d++) {
        const eventDate = new Date(today);
        eventDate.setDate(today.getDate() + d);
        eventDate.setHours(7, 30, 0, 0);
        await Calendar.createEventAsync(target.id, {
          title: 'BLITZ — Field Reset',
          startDate: eventDate,
          endDate: new Date(eventDate.getTime() + 10 * 60 * 1000),
          notes: 'Scheduled by Tether',
          alarms: [{ relativeOffset: -5 }],
        });
      }
    } catch (e) {
      console.log('[calendar] addBlitzToCalendar failed:', e);
    }
  }

  // ── SPOTIFY BAR ──────────────────────────────────────────────────────────────
  function SpotifyBar() {
    if (spotifyConnected && playlistId) {
      return (
        <TouchableOpacity
          style={s.spotifyBar}
          onPress={() => Linking.openURL(`spotify:playlist:${playlistId}`)}
          activeOpacity={0.8}
        >
          <Text style={s.spotifyIcon}>🎵</Text>
          <Text style={s.spotifyName}>Tether Gym 💪</Text>
          <Text style={s.spotifyPlay}>▶ PLAY</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={s.spotifyBarUnlinked} onPress={onClose} activeOpacity={0.8}>
        <Text style={s.spotifyUnlinkedText}>🎵 Connect Spotify for battle music</Text>
      </TouchableOpacity>
    );
  }

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── STATUS SCREEN ────────────────────────────────────────────────────────────
  if (screen === 'status') {
    return (
      <View style={s.overlay}>
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content" />
          <View style={s.header}>
            <Text style={s.title}>🔥 BLITZ</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.subtitle}>Mission Status. No wrong answer.</Text>

          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={T.accent} size="large" />
              <Text style={s.loadingText}>DEPLOYING MISSION...</Text>
            </View>
          ) : (
            <View style={s.statusGrid}>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={s.statusCard}
                  onPress={() => handleSelectStatus(opt.id)}
                  activeOpacity={0.75}
                >
                  <Text style={s.statusEmoji}>{opt.emoji}</Text>
                  <Text style={s.statusLabel}>{opt.label}</Text>
                  <Text style={s.statusDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  // ── DEBRIEF SCREEN ───────────────────────────────────────────────────────────
  if (screen === 'debrief') {
    return (
      <View style={s.overlay}>
        <SafeAreaView style={s.container}>
          <Animated.View style={[s.celebrationFlash, { opacity: flashAnim }]} />
          <View style={s.debriefWrap}>
            <Text style={s.areaSecured}>AREA SECURED</Text>
            <Text style={s.missionRoomDebrief}>{mission?.room}</Text>
            <Text style={s.debriefLabel}>DEBRIEF</Text>
            <Text style={s.debriefTimer}>{formatTime(debriefCount)}</Text>
            <Text style={s.debriefSub}>2 minutes. Rest.</Text>
            <TouchableOpacity onPress={skipDebrief} style={s.skipDebrief}>
              <Text style={s.skipDebriefText}>SKIP</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── MISSION SCREEN ───────────────────────────────────────────────────────────
  if (screen === 'mission' && mission) {
    return (
      <View style={s.overlay}>
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content" />
          <View style={s.header}>
            <Text style={s.title}>🔥 BLITZ</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={T.accent} size="large" />
              <Text style={s.loadingText}>REASSIGNING...</Text>
            </View>
          ) : (
            <>
              <SpotifyBar />

              <View style={s.missionCard}>
                <Text style={s.missionBadge}>{mission.emoji}  MISSION</Text>
                <Text style={s.missionRoomLarge}>{mission.room}</Text>
                <Text style={s.missionZone}>{mission.zone}</Text>
                <Text style={s.missionTime}>{mission.minutes} MINUTES</Text>
                <View style={s.timerRow}>
                  <Text style={s.timerLabel}>IN THE FIELD</Text>
                  <Text style={s.timerValue}>{formatTime(elapsed)}</Text>
                </View>
              </View>

              {completed.length > 0 && (
                <Text style={s.missionCount}>
                  {completed.length} area{completed.length !== 1 ? 's' : ''} secured this session
                </Text>
              )}

              <View style={s.actionRow}>
                <TouchableOpacity style={s.completeBtn} onPress={handleComplete} activeOpacity={0.8}>
                  <Text style={s.completeBtnText}>COMPLETE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.reassignBtn} onPress={handleReassign} activeOpacity={0.8}>
                  <Text style={s.reassignBtnText}>REASSIGN</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onClose} style={s.standDownLink}>
                <Text style={s.standDownLinkText}>STAND DOWN</Text>
              </TouchableOpacity>
            </>
          )}
        </SafeAreaView>
      </View>
    );
  }

  // ── BLITZ REPORT SCREEN ──────────────────────────────────────────────────────
  if (screen === 'report') {
    const totalSecs = completed.reduce((sum, m) => sum + m.elapsed, 0);
    return (
      <View style={s.overlay}>
        <SafeAreaView style={s.container}>
          <StatusBar barStyle="light-content" />
          <ScrollView contentContainerStyle={s.reportScroll}>
            <Text style={s.reportTitle}>BLITZ REPORT</Text>
            <Text style={s.reportMissions}>
              {mission?.emoji}  {completed.length} MISSION{completed.length !== 1 ? 'S' : ''} COMPLETE
            </Text>
            <Text style={s.reportTime}>⏱  {formatTime(totalSecs)} IN THE FIELD</Text>

            {areasSecured.length > 0 && (
              <View style={s.areasWrap}>
                <Text style={s.areasLabel}>AREAS SECURED</Text>
                <Text style={s.areasValue}>{areasSecured.join(' · ')}</Text>
              </View>
            )}

            <View style={s.reportActions}>
              <TouchableOpacity style={s.logBtn} onPress={handleLogToWarRoom} activeOpacity={0.8}>
                <Text style={s.logBtnText}>LOG TO WAR ROOM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.continueBtn}
                onPress={() => { setScreen('status'); setStatus(null); }}
                activeOpacity={0.8}
              >
                <Text style={s.continueBtnText}>CONTINUE</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleLogToWarRoom} style={s.standDownBtn}>
              <Text style={s.standDownText}>STAND DOWN</Text>
            </TouchableOpacity>
            <Text style={s.standDownNote}>Done for now. Logged as a win regardless.</Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return null;
}

// ── STYLES ────────────────────────────────────────────────────────────────────
function makeStyles(T: ReturnType<typeof import('../themes').getTheme>) {
  const isLight = T.mode === 'light';
  return StyleSheet.create({
    overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: T.bg, zIndex: 100,
    },
    container: { flex: 1 },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 20, paddingBottom: 8,
    },
    title: { fontSize: 20, fontWeight: '900', letterSpacing: 3, color: T.text },
    subtitle: { color: T.muted, fontSize: 14, paddingHorizontal: 20, marginBottom: 24 },
    closeBtn: { padding: 8 },
    closeText: { color: T.muted, fontSize: 20 },

    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingText: { color: T.muted, fontSize: 13, letterSpacing: 2 },

    // Spotify bar
    spotifyBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      marginHorizontal: 20, marginBottom: 12,
      backgroundColor: T.card,
      borderWidth: 1.5, borderColor: T.accent,
      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    },
    spotifyIcon: { fontSize: 18 },
    spotifyName: { flex: 1, color: T.text, fontWeight: '700', fontSize: 14, letterSpacing: 1 },
    spotifyPlay: { color: T.accent, fontWeight: '800', fontSize: 13, letterSpacing: 2 },
    spotifyBarUnlinked: {
      marginHorizontal: 20, marginBottom: 12,
      backgroundColor: T.card,
      borderWidth: 1, borderColor: T.border,
      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
      alignItems: 'center',
    },
    spotifyUnlinkedText: { color: T.muted, fontSize: 13 },

    // Status screen
    statusGrid: { padding: 20, gap: 12 },
    statusCard: {
      backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
      borderRadius: 14, padding: 20,
    },
    statusEmoji: { fontSize: 28, marginBottom: 8 },
    statusLabel: { color: T.text, fontSize: 16, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
    statusDesc: { color: T.muted, fontSize: 13 },

    // Mission screen
    missionCard: {
      margin: 20, marginTop: 0,
      backgroundColor: T.card, borderWidth: 1.5, borderColor: T.accent,
      borderRadius: 16, padding: 28,
    },
    missionBadge: { color: T.accent, fontSize: 13, fontWeight: '700', letterSpacing: 2, marginBottom: 20 },
    missionRoomLarge: { color: T.text, fontSize: 32, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
    missionZone: { color: T.muted, fontSize: 18, fontWeight: '700', letterSpacing: 1, marginBottom: 16 },
    missionTime: { color: T.text, fontSize: 22, fontWeight: '800', letterSpacing: 1, marginBottom: 20 },
    timerRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderTopWidth: 1, borderTopColor: T.border, paddingTop: 16,
    },
    timerLabel: { color: T.muted, fontSize: 11, letterSpacing: 2 },
    timerValue: { color: T.accent, fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
    missionCount: { color: T.muted, fontSize: 12, textAlign: 'center', letterSpacing: 1, marginBottom: 8 },
    actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 4 },
    completeBtn: {
      flex: 2, backgroundColor: T.accent, borderRadius: 12,
      paddingVertical: 16, alignItems: 'center',
    },
    completeBtnText: { color: isLight ? '#fff' : T.bg, fontWeight: '800', fontSize: 15, letterSpacing: 2 },
    reassignBtn: {
      flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
      borderRadius: 12, paddingVertical: 16, alignItems: 'center',
    },
    reassignBtnText: { color: T.muted, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
    standDownLink: { alignItems: 'center', marginTop: 20 },
    standDownLinkText: { color: T.muted, fontSize: 12, letterSpacing: 2 },

    // Debrief screen
    celebrationFlash: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: T.accent, zIndex: -1,
    },
    debriefWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    areaSecured: { color: T.accent, fontSize: 28, fontWeight: '900', letterSpacing: 3 },
    missionRoomDebrief: { color: T.text, fontSize: 20, fontWeight: '700', letterSpacing: 2, marginBottom: 32 },
    debriefLabel: { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 3 },
    debriefTimer: { color: T.text, fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'] },
    debriefSub: { color: T.muted, fontSize: 14, letterSpacing: 1 },
    skipDebrief: { marginTop: 32 },
    skipDebriefText: { color: T.muted, fontSize: 12, letterSpacing: 2 },

    // Blitz report
    reportScroll: { padding: 24, paddingTop: 40, gap: 12 },
    reportTitle: { color: T.text, fontSize: 24, fontWeight: '900', letterSpacing: 3, marginBottom: 16 },
    reportMissions: { color: T.text, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
    reportTime: { color: T.muted, fontSize: 16 },
    areasWrap: {
      backgroundColor: T.card, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: T.border, marginTop: 8,
    },
    areasLabel: { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
    areasValue: { color: T.text, fontSize: 15, fontWeight: '600' },
    reportActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    logBtn: {
      flex: 1, backgroundColor: T.accent, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    logBtnText: { color: isLight ? '#fff' : T.bg, fontWeight: '800', fontSize: 13, letterSpacing: 1.5 },
    continueBtn: {
      flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
      borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    },
    continueBtnText: { color: T.text, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
    standDownBtn: { alignItems: 'center', marginTop: 16 },
    standDownText: { color: T.muted, fontWeight: '700', fontSize: 13, letterSpacing: 2 },
    standDownNote: { color: T.muted, fontSize: 11, textAlign: 'center', marginTop: 6 },
  });
}
