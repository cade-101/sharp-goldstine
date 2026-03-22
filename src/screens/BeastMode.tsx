import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Vibration, Animated, Alert
} from 'react-native';
import * as Speech from 'expo-speech';
import { supabase } from '../lib/supabase';

const C = {
  black: '#000000',
  dark: '#0a0a0a',
  card: '#111111',
  border: '#1a1a1a',
  red: '#ff2233',
  redDim: '#660011',
  white: '#ffffff',
  muted: '#444444',
  gold: '#c9a84c',
};

// Beast Mode workouts by day
const BEAST_WORKOUTS: Record<number, any[]> = {
  1: [ // Monday — Legs
    { name: 'Barbell Back Squat', reps: '5 reps — HEAVY', rest: 45 },
    { name: 'Romanian Deadlift', reps: '8 reps — feel it', rest: 45 },
    { name: 'Leg Press', reps: '12 reps — feet high', rest: 30 },
    { name: 'Bulgarian Split Squat', reps: '8 each leg', rest: 30 },
    { name: 'Leg Curl', reps: '12 reps — squeeze', rest: 30 },
    { name: 'Standing Calf Raise', reps: '20 reps — burn it', rest: 20 },
  ],
  4: [ // Thursday — Push
    { name: 'Flat DB Bench Press', reps: '6 reps — CHEST WEAK POINT, own it', rest: 45 },
    { name: 'Incline DB Press', reps: '8 reps — upper chest', rest: 45 },
    { name: 'Machine Chest Press', reps: '10 reps — volume', rest: 30 },
    { name: 'Seated DB Shoulder Press', reps: '8 reps — no leg drive', rest: 30 },
    { name: 'Cable Lateral Raise', reps: '15 reps — strict', rest: 20 },
    { name: 'Tricep Pushdown', reps: '12 reps — lock it out', rest: 20 },
    { name: 'Overhead Tricep Extension', reps: '10 reps — long head', rest: 20 },
  ],
  5: [ // Friday — Pull
    { name: 'Deadlift', reps: '5 reps — HEAVY, rip it off the floor', rest: 45 },
    { name: 'Barbell Row', reps: '6 reps — elbows back hard', rest: 45 },
    { name: 'Lat Pulldown', reps: '10 reps — chest to bar', rest: 30 },
    { name: 'Cable Row', reps: '12 reps — full stretch', rest: 30 },
    { name: 'Barbell Curl', reps: '10 reps — strict, no swinging', rest: 20 },
    { name: 'Hammer Curl', reps: '12 reps — forearm killer', rest: 20 },
    { name: 'Wrist Roller', reps: 'to failure — finish it', rest: 0 },
  ],
};

const TRASH_TALK = [
  "Let's f***ing GO. You came here for a reason.",
  "Stop thinking. Start moving. NOW.",
  "Your brain is lying to you. You're not tired. GO.",
  "Every rep is a middle finger to whatever's in your head.",
  "You don't get to quit. Not today.",
  "This is the part where most people stop. You're not most people.",
  "Shut up and lift.",
  "The only thing leaving this gym is your stress.",
  "Nobody's coming to save you. Pick it up.",
  "You showed up. That was the hard part. NOW FINISH.",
];

const BETWEEN_SET = [
  "REST IS OVER. Next exercise.",
  "GO. Right now.",
  "Move. Don't think.",
  "Clock's ticking. Let's go.",
  "Next one. Let's get it.",
];

function getTodayWorkout() {
  const day = new Date().getDay();
  return BEAST_WORKOUTS[day] || BEAST_WORKOUTS[5];
}

function getRandomTrashTalk() {
  return TRASH_TALK[Math.floor(Math.random() * TRASH_TALK.length)];
}

function getRandomBetweenSet() {
  return BETWEEN_SET[Math.floor(Math.random() * BETWEEN_SET.length)];
}

function speak(text: string) {
  Speech.stop();
  Speech.speak(text.replace(/\*\*\*/g, ''), {
    rate: 0.95,
    pitch: 0.85,
    language: 'en-US',
  });
}

export default function BeastMode({ onBack }: { onBack?: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'active' | 'rest' | 'done'>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [trashLine, setTrashLine] = useState('');
  const sessionStart = useRef<number>(0);
  const timerRef = useRef<any>(null);
  const restRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const workout = getTodayWorkout();
  const current = workout[currentIdx];

  useEffect(() => {
    return () => {
      Speech.stop();
      clearInterval(timerRef.current);
      clearInterval(restRef.current);
    };
  }, []);

  // Pulse animation
  useEffect(() => {
    if (phase === 'active') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [phase]);

  function startBeast() {
    sessionStart.current = Date.now();
    setPhase('active');
    setCurrentIdx(0);
    setElapsed(0);

    // Session timer
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart.current) / 1000));
    }, 1000);

    const line = getRandomTrashTalk();
    setTrashLine(line);
    speak(`Beast Mode activated. ${line} First up — ${workout[0].name}. ${workout[0].reps}.`);
    Vibration.vibrate(500);
  }

  function nextExercise() {
    Speech.stop();
    clearInterval(restRef.current);

    const next = currentIdx + 1;

    if (next >= workout.length) {
      finishSession();
      return;
    }

    const restDur = current.rest;

    if (restDur > 0) {
      setPhase('rest');
      setRestSeconds(restDur);
      Vibration.vibrate([0, 200, 100, 200]);

      let remaining = restDur;
      restRef.current = setInterval(() => {
        remaining--;
        setRestSeconds(remaining);
        if (remaining <= 0) {
          clearInterval(restRef.current);
          setCurrentIdx(next);
          setPhase('active');
          const line = getRandomBetweenSet();
          setTrashLine(line);
          speak(`${line} ${workout[next].name}. ${workout[next].reps}.`);
          Vibration.vibrate(300);
        }
      }, 1000);
    } else {
      setCurrentIdx(next);
      setPhase('active');
      const line = getRandomBetweenSet();
      setTrashLine(line);
      speak(`${workout[next].name}. ${workout[next].reps}.`);
    }
  }

  function skipRest() {
    clearInterval(restRef.current);
    const next = currentIdx + 1;
    if (next >= workout.length) { finishSession(); return; }
    setCurrentIdx(next);
    setPhase('active');
    const line = getRandomBetweenSet();
    setTrashLine(line);
    speak(`${line} ${workout[next].name}. ${workout[next].reps}.`);
    Vibration.vibrate(200);
  }

  async function finishSession() {
    clearInterval(timerRef.current);
    clearInterval(restRef.current);
    Speech.stop();
    setPhase('done');
    Vibration.vibrate([0, 300, 200, 300, 200, 500]);
    setTimeout(() => speak("You did it. Get out of here. Go be a person."), 500);

    const totalSecs = Math.floor((Date.now() - sessionStart.current) / 1000);
    await supabase.from('gym_sessions').insert({
      athlete: 'cade',
      workout_type: 'BEAST MODE',
      duration_seconds: totalSecs,
      sets_completed: workout.length,
      reps_completed: 0,
      set_log: {},
      prs_hit: [],
      started_on_time: true,
      date: new Date().toISOString().split('T')[0],
    });
  }

  function formatTime(sec: number) {
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  }

  // ── INTRO ──────────────────────────────────────────────
  if (phase === 'intro') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      {onBack && (
        <TouchableOpacity style={{ padding: 16, paddingBottom: 0 }} onPress={onBack}>
          <Text style={{ color: C.muted, fontSize: 12, letterSpacing: 1 }}>← BACK</Text>
        </TouchableOpacity>
      )}
      <View style={s.introContainer}>
        <Text style={s.introLabel}>YOU SURE ABOUT THIS?</Text>
        <Text style={s.introTitle}>BEAST{'\n'}MODE</Text>
        <Text style={s.introSub}>No tracking. No mercy.{'\n'}65 minutes. Audio only.{'\n'}Just you and the bar.</Text>

        <View style={s.introWorkout}>
          {workout.map((ex, i) => (
            <Text key={i} style={s.introEx}>
              <Text style={s.introExNum}>{i + 1}. </Text>{ex.name}
            </Text>
          ))}
        </View>

        <TouchableOpacity style={s.lfgBtn} onPress={startBeast}>
          <Text style={s.lfgBtnText}>LFG 🔥</Text>
        </TouchableOpacity>

        <Text style={s.introWarning}>Audio will guide you. Keep screen on.</Text>
      </View>
    </SafeAreaView>
  );

  // ── ACTIVE ─────────────────────────────────────────────
  if (phase === 'active') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      {onBack && (
        <TouchableOpacity
          style={{ padding: 16, paddingBottom: 0 }}
          onPress={() => Alert.alert('Stand Down?', 'End this session?', [
            { text: 'Keep going', style: 'cancel' },
            { text: 'Stand Down', style: 'destructive', onPress: onBack },
          ])}
        >
          <Text style={{ color: C.muted, fontSize: 12, letterSpacing: 1 }}>← STAND DOWN</Text>
        </TouchableOpacity>
      )}
      <View style={s.activeContainer}>

        <View style={s.progressRow}>
          {workout.map((_, i) => (
            <View key={i} style={[s.progressDot, i < currentIdx && s.progressDotDone, i === currentIdx && s.progressDotActive]} />
          ))}
        </View>

        <Text style={s.elapsedTime}>{formatTime(elapsed)}</Text>

        <Animated.View style={[s.exerciseBox, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={s.exerciseNum}>{currentIdx + 1} / {workout.length}</Text>
          <Text style={s.exerciseName}>{current.name}</Text>
          <Text style={s.exerciseReps}>{current.reps}</Text>
        </Animated.View>

        <Text style={s.trashLine}>{trashLine}</Text>

        <TouchableOpacity style={s.doneSetBtn} onPress={nextExercise}>
          <Text style={s.doneSetBtnText}>
            {currentIdx < workout.length - 1 ? 'DONE →' : 'FINISH 💀'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.repeatBtn} onPress={() => speak(`${current.name}. ${current.reps}.`)}>
          <Text style={s.repeatBtnText}>🔊 Repeat</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );

  // ── REST ───────────────────────────────────────────────
  if (phase === 'rest') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <View style={s.restContainer}>
        <Text style={s.restLabel}>REST</Text>
        <Text style={s.restTimer}>{restSeconds}</Text>
        <Text style={s.restNext}>NEXT: {workout[currentIdx + 1]?.name || 'DONE'}</Text>
        <TouchableOpacity style={s.skipRestBtn} onPress={skipRest}>
          <Text style={s.skipRestBtnText}>SKIP REST →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // ── DONE ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <View style={s.doneContainer}>
        <Text style={s.doneEmoji}>💀</Text>
        <Text style={s.doneTitle}>DONE.</Text>
        <Text style={s.doneSub}>Beast Mode complete.{'\n'}{formatTime(elapsed)} of pure suffering.</Text>
        <Text style={s.doneQuote}>Go be a person now.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.black },

  // Intro
  introContainer: { flex: 1, padding: 28, justifyContent: 'center' },
  introLabel: { fontSize: 11, color: C.red, letterSpacing: 4, marginBottom: 8 },
  introTitle: { fontSize: 72, color: C.white, fontWeight: '900', letterSpacing: 4, lineHeight: 72, marginBottom: 16 },
  introSub: { fontSize: 15, color: C.muted, lineHeight: 24, marginBottom: 28 },
  introWorkout: { marginBottom: 32, backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  introEx: { fontSize: 13, color: C.muted, paddingVertical: 3 },
  introExNum: { color: C.red, fontWeight: '700' },
  lfgBtn: { backgroundColor: C.red, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  lfgBtnText: { color: C.white, fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  introWarning: { textAlign: 'center', fontSize: 11, color: C.muted, letterSpacing: 1 },

  // Active
  activeContainer: { flex: 1, padding: 24, justifyContent: 'space-between', paddingTop: 20, paddingBottom: 40 },
  progressRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 },
  progressDot: { flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2 },
  progressDotDone: { backgroundColor: C.redDim },
  progressDotActive: { backgroundColor: C.red },
  elapsedTime: { textAlign: 'center', fontSize: 16, color: C.muted, letterSpacing: 3, marginBottom: 20 },
  exerciseBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.redDim, padding: 32, marginBottom: 24 },
  exerciseNum: { fontSize: 12, color: C.red, letterSpacing: 4, marginBottom: 12 },
  exerciseName: { fontSize: 36, color: C.white, fontWeight: '900', textAlign: 'center', letterSpacing: 1, lineHeight: 42, marginBottom: 16 },
  exerciseReps: { fontSize: 18, color: C.muted, textAlign: 'center', lineHeight: 24 },
  trashLine: { fontSize: 13, color: C.redDim, textAlign: 'center', fontStyle: 'italic', marginBottom: 20, lineHeight: 20 },
  doneSetBtn: { backgroundColor: C.red, borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 10 },
  doneSetBtnText: { color: C.white, fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  repeatBtn: { alignItems: 'center', padding: 12 },
  repeatBtnText: { fontSize: 14, color: C.muted, letterSpacing: 2 },

  // Rest
  restContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  restLabel: { fontSize: 12, color: C.muted, letterSpacing: 5, marginBottom: 12 },
  restTimer: { fontSize: 120, color: C.red, fontWeight: '900', lineHeight: 120 },
  restNext: { fontSize: 14, color: C.muted, letterSpacing: 2, marginTop: 16, marginBottom: 40 },
  skipRestBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 40 },
  skipRestBtnText: { fontSize: 16, color: C.white, letterSpacing: 3 },

  // Done
  doneContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  doneEmoji: { fontSize: 80, marginBottom: 20 },
  doneTitle: { fontSize: 80, color: C.white, fontWeight: '900', letterSpacing: 4, lineHeight: 80 },
  doneSub: { fontSize: 16, color: C.muted, textAlign: 'center', lineHeight: 26, marginTop: 16 },
  doneQuote: { fontSize: 14, color: C.red, marginTop: 24, letterSpacing: 2, fontStyle: 'italic' },
});
