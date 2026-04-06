import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, TextInput, StatusBar, Vibration,
} from 'react-native';
import * as Speech from 'expo-speech';
import { BookOpen, Pause, Play, Square, Coffee, ChevronLeft } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

type Screen = 'setup' | 'active' | 'break' | 'done';

const SUBJECTS = ['Math', 'Reading', 'Writing', 'Science', 'History', 'French', 'Other'];
const WORK_BLOCK = 25 * 60;  // 25 min Pomodoro
const BREAK_BLOCK = 5 * 60;  // 5 min break
const BREAK_REMINDER_THRESHOLD = 30 * 60; // suggest break after 30 min continuous

export default function Homework({ onClose }: { onClose: () => void }) {
  const { user, themeTokens: T } = useUser();
  const [screen, setScreen] = useState<Screen>('setup');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Break tracking
  const [breakCount, setBreakCount] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const breakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sinceLastBreak = useRef(0);

  const isLight = T.mode === 'light';

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breakTimerRef.current) clearInterval(breakTimerRef.current);
      Speech.stop();
    };
  }, []);

  function startTimer() {
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      sinceLastBreak.current += 1;
      setElapsed(elapsedRef.current);

      // Suggest break after BREAK_REMINDER_THRESHOLD
      if (sinceLastBreak.current === BREAK_REMINDER_THRESHOLD) {
        Speech.speak("You've been working for 30 minutes. Consider taking a short break.", {
          language: 'en-US', rate: 0.9,
        });
        Vibration.vibrate(300);
      }
    }, 1000);
    setTimerRunning(true);
  }

  function pauseTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTimerRunning(false);
  }

  function startBreak() {
    pauseTimer();
    setBreakElapsed(0);
    setBreakCount(c => c + 1);
    sinceLastBreak.current = 0;
    setScreen('break');

    breakTimerRef.current = setInterval(() => {
      setBreakElapsed(b => {
        if (b >= BREAK_BLOCK - 1) {
          clearInterval(breakTimerRef.current!);
          Speech.speak("Break is over. Back to work!", { language: 'en-US', rate: 0.9 });
          Vibration.vibrate([0, 200, 100, 200]);
          setScreen('active');
          startTimer();
          return 0;
        }
        return b + 1;
      });
    }, 1000);
  }

  async function finishSession() {
    pauseTimer();
    if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    Speech.stop();
    setScreen('done');

    if (user?.id) {
      const chosenSubject = subject === 'Other' ? customSubject : subject;
      try {
        await supabase.from('homework_sessions').insert({
          house_name: user.house_name ?? '',
          subject: chosenSubject,
          duration_seconds: elapsedRef.current,
          break_count: breakCount,
          completed: true,
        });
      } catch { /* non-blocking */ }
    }
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const chosenSubject = subject === 'Other' ? customSubject : subject;

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />
        <View style={[styles.header, { borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={onClose}><ChevronLeft size={22} color={T.muted} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: T.text }]}>HOMEWORK</Text>
          <View style={{ width: 32 }} />
        </View>
        <ScrollView contentContainerStyle={styles.setupBody}>
          <BookOpen size={36} color={T.accent} style={{ marginBottom: 16 }} />
          <Text style={[styles.title, { color: T.text }]}>What are we working on?</Text>
          <View style={styles.subjectGrid}>
            {SUBJECTS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.subjectChip, { borderColor: subject === s ? T.accent : T.border, backgroundColor: subject === s ? T.accentBg : T.card }]}
                onPress={() => setSubject(s)}
              >
                <Text style={{ color: subject === s ? T.accent : T.muted, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>{s.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {subject === 'Other' && (
            <TextInput
              style={[styles.customInput, { color: T.text, borderColor: T.border, backgroundColor: T.card }]}
              placeholder="What subject?"
              placeholderTextColor={T.muted}
              value={customSubject}
              onChangeText={setCustomSubject}
            />
          )}
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: T.accent }, !subject && { opacity: 0.4 }]}
            onPress={() => { if (!subject) return; setScreen('active'); startTimer(); }}
            disabled={!subject}
          >
            <Play size={18} color={T.bg} />
            <Text style={[styles.startBtnText, { color: T.bg }]}>START SESSION</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── BREAK ──────────────────────────────────────────────────────────────────
  if (screen === 'break') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />
        <View style={[styles.centreBody]}>
          <Coffee size={48} color={T.accent} />
          <Text style={[styles.breakLabel, { color: T.accent }]}>BREAK</Text>
          <Text style={[styles.timerDisplay, { color: T.text }]}>{formatTime(BREAK_BLOCK - breakElapsed)}</Text>
          <Text style={[styles.timerSub, { color: T.muted }]}>Step away. Back soon.</Text>
          <TouchableOpacity
            style={[styles.skipBreakBtn, { borderColor: T.border }]}
            onPress={() => {
              if (breakTimerRef.current) clearInterval(breakTimerRef.current);
              sinceLastBreak.current = 0;
              setScreen('active');
              startTimer();
            }}
          >
            <Text style={{ color: T.muted, fontSize: 12, letterSpacing: 2 }}>SKIP BREAK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── DONE ───────────────────────────────────────────────────────────────────
  if (screen === 'done') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />
        <View style={styles.centreBody}>
          <Text style={{ fontSize: 52 }}>📚</Text>
          <Text style={[styles.doneTitle, { color: T.accent }]}>SESSION DONE</Text>
          <Text style={[styles.doneStat, { color: T.text }]}>{chosenSubject}</Text>
          <Text style={[styles.doneStat, { color: T.muted }]}>{formatTime(elapsedRef.current)} worked · {breakCount} break{breakCount !== 1 ? 's' : ''}</Text>
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: T.accent, marginTop: 24 }]} onPress={onClose}>
            <Text style={[styles.startBtnText, { color: T.bg }]}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── ACTIVE ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={finishSession}><ChevronLeft size={22} color={T.muted} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: T.text }]}>{chosenSubject.toUpperCase()}</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.centreBody}>
        <Text style={[styles.timerDisplay, { color: T.text }]}>{formatTime(elapsed)}</Text>
        <Text style={[styles.timerSub, { color: T.muted }]}>TIME ON TASK</Text>

        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: T.card, borderColor: T.border }]}
            onPress={timerRunning ? pauseTimer : startTimer}
          >
            {timerRunning ? <Pause size={22} color={T.accent} /> : <Play size={22} color={T.accent} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: T.card, borderColor: T.border }]}
            onPress={startBreak}
          >
            <Coffee size={22} color={T.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: T.card, borderColor: T.border }]}
            onPress={finishSession}
          >
            <Square size={22} color={T.muted} />
          </TouchableOpacity>
        </View>

        {breakCount > 0 && (
          <Text style={[styles.timerSub, { color: T.muted, marginTop: 12 }]}>
            {breakCount} break{breakCount !== 1 ? 's' : ''} taken
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  setupBody: { padding: 28, alignItems: 'center', gap: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center', letterSpacing: -0.3 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  subjectChip: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  customInput: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginTop: 8 },
  startBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  centreBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  timerDisplay: { fontSize: 72, fontWeight: '200', fontVariant: ['tabular-nums'], letterSpacing: -2 },
  timerSub: { fontSize: 11, letterSpacing: 3, fontWeight: '600' },
  controlRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  controlBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  breakLabel: { fontSize: 24, fontWeight: '900', letterSpacing: 4 },
  skipBreakBtn: { marginTop: 20, borderWidth: 1, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  doneTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  doneStat: { fontSize: 16, fontWeight: '600' },
});
