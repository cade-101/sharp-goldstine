import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, ActivityIndicator
} from 'react-native';
import { ANTHROPIC_API_KEY } from '../lib/config';
import { supabase } from '../lib/supabase';

const C = {
  black: '#0a0a0a', dark: '#111111', card: '#181818', border: '#2a2a2a',
  gold: '#c9a84c', goldDim: '#7a6230', green: '#3ce08a', white: '#f0ece4',
  muted: '#666666', red: '#ff2233',
};

const EQUIPMENT_OPTIONS = [
  { id: 'none', label: 'Nothing', sub: 'Bodyweight only' },
  { id: 'bowflex', label: 'Bowflex / Dumbbells', sub: 'Home weights' },
  { id: 'bands', label: 'Resistance Bands', sub: 'Portable' },
  { id: 'pullup', label: 'Pull-up Bar', sub: 'Doorframe' },
  { id: 'chair', label: 'Chair / Desk', sub: 'Office ready' },
];

const DURATION_OPTIONS = [
  { id: '3', label: '3 min', sub: 'Invisible' },
  { id: '5', label: '5 min', sub: 'Quick break' },
  { id: '7', label: '7 min', sub: 'Full hit' },
];

const FOCUS_OPTIONS = [
  'Upper body', 'Lower body', 'Core', 'Full body', 'Cardio burst', 'Mobility'
];

export default function QuickHits() {
  const [equipment, setEquipment] = useState('none');
  const [duration, setDuration] = useState('5');
  const [focus, setFocus] = useState('Full body');
  const [loading, setLoading] = useState(false);
  const [workout, setWorkout] = useState<any>(null);
  const [phase, setPhase] = useState<'setup' | 'workout' | 'done'>('setup');
  const [currentEx, setCurrentEx] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const restRef = React.useRef<any>(null);
  const [dailyCount, setDailyCount] = useState(0);

  async function generateWorkout() {
    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Generate a ${duration}-minute quick home workout for someone with ADHD who is on a WFH break.

Equipment available: ${equipment}
Focus: ${focus}
Duration: ${duration} minutes

Rules:
- 3-5 exercises max
- Each exercise needs clear reps or time
- No equipment needed beyond what's listed
- Should not make person sweaty/disheveled (they're at work)
- ADHD friendly — clear, simple instructions
- If equipment is "none" use only bodyweight (pushups, squats, lunges, planks, wall sits, etc)
- Make it feel achievable and energizing, not punishing

Return ONLY a JSON object like this (no markdown, no explanation):
{
  "title": "short punchy workout name",
  "exercises": [
    { "name": "exercise name", "reps": "10 reps or 30 seconds", "note": "one quick tip" }
  ],
  "vibe": "one sentence hype line"
}`
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '{}';
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setWorkout(parsed);
      setPhase('workout');
      setCurrentEx(0);
    } catch (e) {
      setWorkout({
        title: 'DESK DESTROYER',
        vibe: "You've got 5 minutes. Let's use them.",
        exercises: [
          { name: 'Wall Sit', reps: '45 seconds', note: 'Back flat, thighs parallel' },
          { name: 'Push-ups', reps: '10 reps', note: 'Full range, slow down' },
          { name: 'Standing March', reps: '30 seconds', note: 'High knees, pump arms' },
          { name: 'Plank', reps: '30 seconds', note: 'Squeeze everything' },
          { name: 'Air Squats', reps: '15 reps', note: 'Chest up, drive through heels' },
        ]
      });
      setPhase('workout');
      setCurrentEx(0);
    }
    setLoading(false);
  }

  function nextExercise() {
    clearInterval(restRef.current);
    setRestRunning(false);
    if (currentEx + 1 >= workout.exercises.length) {
      finishWorkout();
    } else {
      setCurrentEx(prev => prev + 1);
    }
  }

  function startRest(sec: number) {
    setRestTimer(sec);
    setRestRunning(true);
    clearInterval(restRef.current);
    restRef.current = setInterval(() => {
      setRestTimer(t => {
        if (t <= 1) { clearInterval(restRef.current); setRestRunning(false); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  async function finishWorkout() {
    clearInterval(restRef.current);
    setPhase('done');
    const newCount = dailyCount + 1;
    setDailyCount(newCount);
    await supabase.from('gym_sessions').insert({
      athlete: 'cade',
      workout_type: `QUICK HIT — ${workout.title}`,
      duration_seconds: parseInt(duration) * 60,
      sets_completed: workout.exercises.length,
      reps_completed: 0,
      set_log: {},
      prs_hit: [],
      started_on_time: true,
      date: new Date().toISOString().split('T')[0],
    });
  }

  // ── SETUP ──────────────────────────────────────────────
  if (phase === 'setup') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.label}>WFH BREAK</Text>
        <Text style={s.title}>Quick Hit</Text>
        <Text style={s.sub}>3-7 min. No sweat. Full send.</Text>

        <Text style={s.sectionLabel}>EQUIPMENT</Text>
        {EQUIPMENT_OPTIONS.map(eq => (
          <TouchableOpacity
            key={eq.id}
            style={[s.optCard, equipment === eq.id && s.optCardActive]}
            onPress={() => setEquipment(eq.id)}
          >
            <Text style={[s.optLabel, equipment === eq.id && s.optLabelActive]}>{eq.label}</Text>
            <Text style={s.optSub}>{eq.sub}</Text>
          </TouchableOpacity>
        ))}

        <Text style={s.sectionLabel}>DURATION</Text>
        <View style={s.durationRow}>
          {DURATION_OPTIONS.map(d => (
            <TouchableOpacity
              key={d.id}
              style={[s.durationChip, duration === d.id && s.durationChipActive]}
              onPress={() => setDuration(d.id)}
            >
              <Text style={[s.durationLabel, duration === d.id && s.durationLabelActive]}>{d.label}</Text>
              <Text style={s.durationSub}>{d.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>FOCUS</Text>
        <View style={s.focusGrid}>
          {FOCUS_OPTIONS.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.focusChip, focus === f && s.focusChipActive]}
              onPress={() => setFocus(f)}
            >
              <Text style={[s.focusText, focus === f && s.focusTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.goBtn} onPress={generateWorkout} disabled={loading}>
          {loading
            ? <ActivityIndicator color={C.black} />
            : <Text style={s.goBtnText}>GENERATE 🔥</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── WORKOUT ────────────────────────────────────────────
  if (phase === 'workout' && workout) {
    const ex = workout.exercises[currentEx];
    const progress = ((currentEx) / workout.exercises.length) * 100;

    return (
      <SafeAreaView style={s.bg}>
        <StatusBar barStyle="light-content" />
        <View style={s.wkContainer}>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>

          <Text style={s.wkTitle}>{workout.title}</Text>
          <Text style={s.wkVibe}>{workout.vibe}</Text>

          <View style={s.exBox}>
            <Text style={s.exCount}>{currentEx + 1} / {workout.exercises.length}</Text>
            <Text style={s.exName}>{ex.name}</Text>
            <Text style={s.exReps}>{ex.reps}</Text>
            <Text style={s.exNote}>{ex.note}</Text>
          </View>

          {restRunning ? (
            <View style={s.restBox}>
              <Text style={s.restLabel}>REST</Text>
              <Text style={s.restTimer}>{restTimer}s</Text>
              <TouchableOpacity style={s.skipRestBtn} onPress={() => { clearInterval(restRef.current); setRestRunning(false); }}>
                <Text style={s.skipRestText}>SKIP →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.btnStack}>
              <TouchableOpacity style={s.doneBtn} onPress={nextExercise}>
                <Text style={s.doneBtnText}>
                  {currentEx < workout.exercises.length - 1 ? 'DONE →' : 'FINISH 💥'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.restBtn} onPress={() => startRest(20)}>
                <Text style={s.restBtnText}>20s rest</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.exerciseList}>
            {workout.exercises.map((e: any, i: number) => (
              <Text key={i} style={[s.exListItem, i === currentEx && s.exListItemActive, i < currentEx && s.exListItemDone]}>
                {i < currentEx ? '✓ ' : i === currentEx ? '▶ ' : '  '}{e.name}
              </Text>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── DONE ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <View style={s.doneContainer}>
        <Text style={s.doneEmoji}>💥</Text>
        <Text style={s.doneTitle}>DONE.</Text>
        <Text style={s.doneSub}>{duration} minutes.{'\n'}Back to work, legend.</Text>
        <View style={s.doneStats}>
          <Text style={s.doneStatLabel}>TODAY'S HITS</Text>
          <Text style={s.doneStatNum}>{dailyCount}</Text>
          <Text style={s.doneStatSub}>of 5 goal</Text>
        </View>
        <TouchableOpacity style={s.goBtn} onPress={() => { setPhase('setup'); setWorkout(null); }}>
          <Text style={s.goBtnText}>ANOTHER ONE 🔥</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.black },
  container: { padding: 24, paddingTop: 20 },
  label: { fontSize: 11, color: C.gold, letterSpacing: 4, marginBottom: 4 },
  title: { fontSize: 42, color: C.white, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  sub: { fontSize: 14, color: C.muted, marginBottom: 28 },
  sectionLabel: { fontSize: 10, color: C.muted, letterSpacing: 3, marginBottom: 10, marginTop: 8 },
  optCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  optCardActive: { borderColor: C.gold, backgroundColor: '#1a1608' },
  optLabel: { fontSize: 16, color: C.white, fontWeight: '600' },
  optLabelActive: { color: C.gold },
  optSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  durationRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  durationChip: { flex: 1, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, alignItems: 'center' },
  durationChipActive: { borderColor: C.gold, backgroundColor: '#1a1608' },
  durationLabel: { fontSize: 18, color: C.white, fontWeight: '700' },
  durationLabelActive: { color: C.gold },
  durationSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  focusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  focusChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  focusChipActive: { borderColor: C.gold, backgroundColor: '#1a1608' },
  focusText: { fontSize: 13, color: C.muted },
  focusTextActive: { color: C.gold, fontWeight: '600' },
  goBtn: { backgroundColor: C.gold, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 32 },
  goBtnText: { color: C.black, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  wkContainer: { flex: 1, padding: 24 },
  progressBar: { height: 3, backgroundColor: C.border, borderRadius: 2, marginBottom: 20, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: C.gold, borderRadius: 2 },
  wkTitle: { fontSize: 11, color: C.gold, letterSpacing: 4, marginBottom: 4 },
  wkVibe: { fontSize: 14, color: C.muted, marginBottom: 24, fontStyle: 'italic' },
  exBox: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.goldDim, padding: 28, alignItems: 'center', marginBottom: 20, flex: 1, justifyContent: 'center' },
  exCount: { fontSize: 11, color: C.muted, letterSpacing: 3, marginBottom: 8 },
  exName: { fontSize: 32, color: C.white, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginBottom: 10 },
  exReps: { fontSize: 22, color: C.gold, fontWeight: '700', marginBottom: 10 },
  exNote: { fontSize: 13, color: C.muted, textAlign: 'center', fontStyle: 'italic' },
  restBox: { alignItems: 'center', marginBottom: 16 },
  restLabel: { fontSize: 11, color: C.muted, letterSpacing: 4, marginBottom: 4 },
  restTimer: { fontSize: 64, color: C.gold, fontWeight: '900', lineHeight: 68 },
  skipRestBtn: { marginTop: 8, padding: 10 },
  skipRestText: { fontSize: 14, color: C.muted, letterSpacing: 2 },
  btnStack: { gap: 10, marginBottom: 20 },
  doneBtn: { backgroundColor: C.gold, borderRadius: 14, padding: 20, alignItems: 'center' },
  doneBtnText: { color: C.black, fontSize: 24, fontWeight: '900', letterSpacing: 3 },
  restBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  restBtnText: { color: C.muted, fontSize: 14, letterSpacing: 2 },
  exerciseList: { gap: 6 },
  exListItem: { fontSize: 12, color: C.muted, letterSpacing: 1 },
  exListItemActive: { color: C.gold, fontWeight: '600' },
  exListItemDone: { color: C.green },
  doneContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  doneEmoji: { fontSize: 72, marginBottom: 12 },
  doneTitle: { fontSize: 72, color: C.white, fontWeight: '900', letterSpacing: 4, lineHeight: 72 },
  doneSub: { fontSize: 16, color: C.muted, textAlign: 'center', lineHeight: 26, marginTop: 12, marginBottom: 28 },
  doneStats: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center', marginBottom: 28, width: '100%' },
  doneStatLabel: { fontSize: 10, color: C.muted, letterSpacing: 3, marginBottom: 4 },
  doneStatNum: { fontSize: 56, color: C.gold, fontWeight: '900', lineHeight: 60 },
  doneStatSub: { fontSize: 12, color: C.muted, marginTop: 2 },
});
