import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Modal, Alert
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { logEvent } from '../lib/logEvent';
import type { FitnessMode } from './FitnessMode';

const WORKOUTS: Record<number, any> = {
  1: {
    name: 'LEGS', label: 'MONDAY · LEGS DAY', subtitle: '75 MIN · QUADS / HAMS / GLUTES / CALVES',
    exercises: [
      { name: 'Barbell Back Squat', target: '4×5', note: 'Main lift — heavy, 3min rest', sets: 4, isMain: true },
      { name: 'Romanian Deadlift', target: '4×6', note: 'Hamstring focus, slow descent', sets: 4 },
      { name: 'Leg Press', target: '3×10', note: 'Feet high & wide for glutes', sets: 3 },
      { name: 'Bulgarian Split Squat', target: '3×8ea', note: 'Unilateral balance', sets: 3 },
      { name: 'Leg Curl', target: '3×12', note: 'Full ROM, squeeze at top', sets: 3 },
      { name: 'Standing Calf Raise', target: '4×15', note: 'Slow & full range', sets: 4 },
    ],
  },
  4: {
    name: 'PUSH', label: 'THURSDAY · PUSH DAY', subtitle: '75 MIN · CHEST / SHOULDERS / TRICEPS',
    exercises: [
      { name: 'Flat DB Bench Press', target: '4×6', note: '⚡ WEAK POINT — full ROM, slow down', sets: 4, isWeak: true },
      { name: 'Incline DB Press', target: '4×8', note: '⚡ Upper chest — your gap', sets: 4, isWeak: true },
      { name: 'Machine Chest Press', target: '3×10', note: 'Volume chest finisher', sets: 3, isWeak: true },
      { name: 'Seated DB Shoulder Press', target: '4×8', note: 'Controlled — no leg drive', sets: 4 },
      { name: 'Cable Lateral Raise', target: '3×15', note: 'Light, strict, full squeeze', sets: 3 },
      { name: 'Tricep Pushdown', target: '3×12', note: 'Lock elbows, full extension', sets: 3 },
      { name: 'Overhead Tricep Extension', target: '3×10', note: 'Long head — cable or DB', sets: 3 },
    ],
  },
  5: {
    name: 'PULL', label: 'FRIDAY · PULL DAY', subtitle: '75 MIN · BACK / BICEPS / FOREARMS',
    exercises: [
      { name: 'Deadlift', target: '4×5', note: 'Main lift — heavy, 3min rest', sets: 4, isMain: true },
      { name: 'Barbell Row', target: '4×6', note: 'Overhand, elbows back, big pull', sets: 4 },
      { name: 'Lat Pulldown', target: '3×10', note: 'Wide grip, chest to bar', sets: 3 },
      { name: 'Cable Row', target: '3×12', note: 'Close grip, full stretch & squeeze', sets: 3 },
      { name: 'Barbell Curl', target: '3×10', note: 'Strict — no swinging', sets: 3 },
      { name: 'Hammer Curl', target: '3×12', note: 'Brachialis + forearm builder', sets: 3 },
      { name: 'Wrist Roller', target: '3×fail', note: 'Forearm finisher', sets: 3 },
    ],
  },
};

function adaptWorkout(workout: any, minutesRemaining: number) {
  if (minutesRemaining >= 60) return workout;
  const exercises = workout.exercises.map((ex: any) => ({ ...ex }));
  if (minutesRemaining >= 45) return { ...workout, exercises: exercises.map((ex: any) => ex.isMain ? ex : { ...ex, sets: Math.max(2, ex.sets - 1) }) };
  if (minutesRemaining >= 30) {
    const mainCount = exercises.filter((e: any) => e.isMain).length;
    const trimmed = exercises.slice(0, mainCount + Math.ceil(exercises.length * 0.6));
    return { ...workout, exercises: trimmed.map((ex: any) => ex.isMain ? ex : { ...ex, sets: 2 }) };
  }
  if (minutesRemaining >= 15) return { ...workout, exercises: exercises.filter((e: any) => e.isMain).map((ex: any) => ({ ...ex, sets: 3 })) };
  return null;
}

function getRestTimes(minutesRemaining: number) {
  if (minutesRemaining >= 60) return { main: 180, accessory: 90 };
  if (minutesRemaining >= 45) return { main: 120, accessory: 60 };
  return { main: 90, accessory: 45 };
}

function getTodayWorkout() {
  const day = new Date().getDay();
  return [1, 4, 5].includes(day) ? WORKOUTS[day] : WORKOUTS[5];
}

function makeStyles(C: { black: string; dark: string; card: string; border: string; gold: string; goldDim: string; red: string; green: string; white: string; muted: string }) {
  return StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.black },
  homeHeader: { padding: 24, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  dayLabel: { fontSize: 11, color: C.gold, letterSpacing: 3, marginBottom: 4 },
  homeTitle: { fontSize: 52, color: C.white, fontWeight: '700', letterSpacing: 2, lineHeight: 56 },
  homeSub: { fontSize: 11, color: C.muted, marginTop: 4, letterSpacing: 1 },
  weekStrip: { flexDirection: 'row', padding: 14, gap: 5, borderBottomWidth: 1, borderBottomColor: C.border },
  weekDay: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: C.border, backgroundColor: C.dark },
  weekDayGym: { borderColor: C.goldDim },
  weekDayToday: { backgroundColor: C.gold, borderColor: C.gold },
  wdLabel: { fontSize: 8, color: C.muted, letterSpacing: 1 },
  wdLabelToday: { color: C.black },
  wdType: { fontSize: 10, color: C.white, fontWeight: '600', marginTop: 2 },
  wdTypeToday: { color: C.black },
  todayCard: { margin: 16, marginBottom: 0, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  tcHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tcLabel: { fontSize: 9, color: C.gold, letterSpacing: 3 },
  tcTitle: { fontSize: 32, color: C.white, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  tcBadge: { backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.goldDim },
  tcBadgeText: { fontSize: 10, color: C.gold },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e', gap: 10 },
  exNum: { fontSize: 18, color: C.gold, fontWeight: '700', width: 22, textAlign: 'center' },
  exName: { fontSize: 13, color: C.white, fontWeight: '500' },
  exDetail: { fontSize: 10, color: C.muted, marginTop: 1 },
  prChip: { backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: C.goldDim },
  prChipText: { fontSize: 9, color: C.gold },
  startBtn: { margin: 16, marginBottom: 8, backgroundColor: C.gold, borderRadius: 14, padding: 20, alignItems: 'center' },
  startBtnText: { color: C.black, fontSize: 22, fontWeight: '700', letterSpacing: 3 },
  lfgBtn: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#0d0000', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#660011' },
  lfgBtnText: { color: '#ff2233', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  histBtn: { marginHorizontal: 16, marginBottom: 32, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  histBtnText: { fontSize: 11, color: C.muted, letterSpacing: 2 },
  wkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  wkBack: { fontSize: 12, color: C.muted, letterSpacing: 1 },
  wkTitle: { fontSize: 38, color: C.white, fontWeight: '700', letterSpacing: 2, textAlign: 'right' },
  wkSub: { fontSize: 10, color: C.gold, textAlign: 'right', marginTop: 2 },
  timerBar: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.dark, gap: 10 },
  timerDisp: { fontSize: 32, color: C.gold, fontWeight: '700', minWidth: 80, letterSpacing: 2 },
  restBtns: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'flex-end' },
  rBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  rBtnGold: { backgroundColor: C.gold, borderColor: C.gold },
  rBtnText: { fontSize: 11, color: C.white, letterSpacing: 1 },
  exCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  exCardActive: { borderColor: C.gold },
  exCardHead: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  ecTitle: { fontSize: 20, color: C.white, fontWeight: '700', letterSpacing: 1 },
  ecSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  ecBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  ecBadgePr: { borderColor: C.goldDim, backgroundColor: 'rgba(201,168,76,0.08)' },
  ecBadgeText: { fontSize: 10, color: C.muted },
  ecBadgeTextPr: { color: C.gold },
  setLog: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: C.border },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e1e', gap: 7 },
  setLbl: { fontSize: 9, color: C.muted, width: 36 },
  setIn: { flex: 1, backgroundColor: C.dark, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 9, textAlign: 'center', fontSize: 14, color: C.white, maxWidth: 90 },
  setOk: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.dark },
  setOkDone: { backgroundColor: C.green, borderColor: C.green },
  setOkText: { fontSize: 10, color: C.muted, letterSpacing: 1 },
  setOkTextDone: { color: C.black },
  addSetBtn: { marginTop: 10, marginBottom: 8, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 9, alignItems: 'center' },
  addSetText: { fontSize: 10, color: C.muted, letterSpacing: 2 },
  nextExBtn: { backgroundColor: C.gold, borderRadius: 10, padding: 14, alignItems: 'center' },
  nextExText: { color: C.black, fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  finishBtn: { borderWidth: 1, borderColor: C.green, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  finishBtnText: { fontSize: 22, color: C.green, fontWeight: '700', letterSpacing: 3 },
  restOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' },
  restLabel: { fontSize: 11, color: C.muted, letterSpacing: 4, marginBottom: 8 },
  restTime: { fontSize: 88, color: C.gold, fontWeight: '700', letterSpacing: 4, lineHeight: 96 },
  restSkip: { marginTop: 32, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  restSkipText: { fontSize: 12, color: C.white, letterSpacing: 2 },
  doneTitle: { fontSize: 80, color: C.gold, fontWeight: '700', letterSpacing: 3, lineHeight: 84 },
  doneSub: { fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 32, marginTop: 6 },
  doneStats: { width: '100%', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 24 },
  dsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  dsLabel: { fontSize: 10, color: C.muted, letterSpacing: 1 },
  dsVal: { fontSize: 24, color: C.white, fontWeight: '700' },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  histTitle: { fontSize: 42, color: C.white, fontWeight: '700', letterSpacing: 2 },
  histEmpty: { textAlign: 'center', paddingTop: 60, fontSize: 14, color: C.muted, letterSpacing: 2, lineHeight: 28 },
  histCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 10 },
  histTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  histType: { fontSize: 26, color: C.white, fontWeight: '700', letterSpacing: 1 },
  histDate: { fontSize: 10, color: C.muted },
  histStats: { flexDirection: 'row', gap: 16 },
  histStat: { fontSize: 10, color: C.muted },
  prRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  prTag: { backgroundColor: 'rgba(201,168,76,0.1)', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: C.goldDim },
  prTagText: { fontSize: 9, color: C.gold },
  });
}

export default function GymScreen({
  onSelectMode,
}: {
  onSelectMode?: (mode: FitnessMode) => void;
}) {
  const { user, themeTokens } = useUser();
  const C = {
    black: themeTokens.bg, dark: themeTokens.dark, card: themeTokens.card,
    border: themeTokens.border, gold: themeTokens.accent, goldDim: themeTokens.accentDim,
    red: themeTokens.red, green: themeTokens.green, white: themeTokens.text, muted: themeTokens.muted,
  };
  const s = makeStyles(C);
  const [screen, setScreen] = useState<'home' | 'workout' | 'complete' | 'history'>('home');
  const [prs, setPrs] = useState<Record<string, { w: number; r: number }>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [activeEx, setActiveEx] = useState(0);
  const [setData, setSetData] = useState<Record<number, any[]>>({});
  const [elapsed, setElapsed] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const timerRef = useRef<any>(null);
  const [restVisible, setRestVisible] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const restRef = useRef<any>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data } = await supabase.from('gym_sessions').select('*').eq('athlete', 'cade').order('created_at', { ascending: false }).limit(20);
    if (data) {
      setHistory(data);
      const prMap: Record<string, { w: number; r: number }> = {};
      data.forEach((s: any) => {
        if (s.set_log) {
          Object.entries(s.set_log).forEach(([exName, rows]: any) => {
            rows.forEach((row: any) => {
              if (row.done && row.w && row.r) {
                const w = parseFloat(row.w), r = parseInt(row.r);
                if (!prMap[exName] || w > prMap[exName].w || (w === prMap[exName].w && r > prMap[exName].r)) prMap[exName] = { w, r };
              }
            });
          });
        }
      });
      setPrs(prMap);
    }
  }

  function startSession() {
    const w = getTodayWorkout();
    const adapted = adaptWorkout(w, 75);
    if (!adapted) { Alert.alert('Not enough time', 'Less than 15 minutes — session skipped. No guilt.'); return; }
    setSession(adapted); setSessionStart(new Date()); setActiveEx(0); setSetData({}); setElapsed(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    setScreen('workout');
    if (user?.id) logEvent(user.id, 'workout_start', { workout: adapted.name });
  }

  function formatTime(sec: number) { return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`; }
  function getSetRows(ex: any, ei: number) { if (!setData[ei]) return Array(ex.sets).fill(null).map(() => ({ w: '', r: '', done: false })); return setData[ei]; }

  function updateSetField(ei: number, si: number, field: string, val: string) {
    setSetData(prev => { const rows = prev[ei] ? [...prev[ei]] : Array(session.exercises[ei].sets).fill(null).map(() => ({ w: '', r: '', done: false })); rows[si] = { ...rows[si], [field]: val }; return { ...prev, [ei]: rows }; });
  }

  function toggleSetDone(ei: number, si: number) {
    setSetData(prev => {
      const ex = session.exercises[ei];
      const rows = prev[ei] ? [...prev[ei]] : Array(ex.sets).fill(null).map(() => ({ w: '', r: '', done: false }));
      const updated = { ...rows[si], done: !rows[si].done };
      const newRows = [...rows]; newRows[si] = updated;
      if (updated.done && updated.w && updated.r) checkPR(ex.name, parseFloat(updated.w), parseInt(updated.r));
      return { ...prev, [ei]: newRows };
    });
  }

  function checkPR(name: string, w: number, r: number) {
    setPrs(prev => { const pr = prev[name]; if (!pr || w > pr.w || (w === pr.w && r > pr.r)) return { ...prev, [name]: { w, r } }; return prev; });
  }

  function addSet(ei: number) { setSetData(prev => { const rows = prev[ei] ? [...prev[ei]] : []; return { ...prev, [ei]: [...rows, { w: '', r: '', done: false }] }; }); }

  async function finishSession() {
    clearInterval(timerRef.current);
    let sets = 0, reps = 0, newPrs: string[] = [];
    const setLog: Record<string, any[]> = {};
    session.exercises.forEach((ex: any, i: number) => {
      const rows = setData[i] || []; setLog[ex.name] = rows;
      rows.forEach((r: any) => { if (r.done) { sets++; reps += parseInt(r.r) || 0; const pr = prs[ex.name]; if (!pr || parseFloat(r.w) > pr.w) newPrs.push(ex.name); } });
    });
    await supabase.from('gym_sessions').insert({ athlete: 'cade', workout_type: session.name, duration_seconds: elapsed, sets_completed: sets, reps_completed: reps, set_log: setLog, prs_hit: newPrs, started_on_time: true, date: new Date().toISOString().split('T')[0] });
    setHistory(prev => [{ workout_type: session.name, duration_seconds: elapsed, sets_completed: sets, reps_completed: reps, prs_hit: newPrs, date: new Date().toISOString().split('T')[0] }, ...prev]);
    if (user?.id && newPrs.length > 0) logEvent(user.id, 'pr_hit', { exercises: newPrs, workout: session.name });
    setScreen('complete');
  }

  function startRest(sec: number) {
    setRestTime(sec); setRestVisible(true); clearInterval(restRef.current);
    restRef.current = setInterval(() => { setRestTime(t => { if (t <= 1) { clearInterval(restRef.current); setRestVisible(false); return 0; } return t - 1; }); }, 1000);
  }

  function skipRest() { clearInterval(restRef.current); setRestVisible(false); }

  const minutesLeft = sessionStart ? Math.max(0, 75 - Math.floor(elapsed / 60)) : 75;
  const restTimes = getRestTimes(minutesLeft);

  if (screen === 'home') {
    const today = getTodayWorkout();
    const day = new Date().getDay();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const gymDays = [1, 4, 5];
    return (
      <SafeAreaView style={s.bg}>
        <StatusBar barStyle="light-content" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.homeHeader}>
            <Text style={s.dayLabel}>{today.label}</Text>
            <Text style={s.homeTitle}>{today.name}</Text>
            <Text style={s.homeSub}>{today.subtitle}</Text>
          </View>
          <View style={s.weekStrip}>
            {days.map((d, i) => (
              <View key={i} style={[s.weekDay, gymDays.includes(i) && s.weekDayGym, i === day && s.weekDayToday]}>
                <Text style={[s.wdLabel, i === day && s.wdLabelToday]}>{d}</Text>
                <Text style={[s.wdType, i === day && s.wdTypeToday]}>{i === 1 ? 'LEGS' : i === 4 ? 'PUSH' : i === 5 ? 'PULL' : '—'}</Text>
              </View>
            ))}
          </View>
          <View style={s.todayCard}>
            <View style={s.tcHeader}>
              <View><Text style={s.tcLabel}>TODAY'S WORKOUT</Text><Text style={s.tcTitle}>{today.name} DAY</Text></View>
              <View style={s.tcBadge}><Text style={s.tcBadgeText}>75 MIN</Text></View>
            </View>
            {today.exercises.map((ex: any, i: number) => (
              <View key={i} style={[s.exRow, i === today.exercises.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={s.exNum}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.exName}>{ex.name}{ex.isWeak ? ' ⚡' : ''}{ex.isMain ? ' 💪' : ''}</Text>
                  <Text style={s.exDetail}>{ex.target} · {ex.note}</Text>
                </View>
                {prs[ex.name] && <View style={s.prChip}><Text style={s.prChipText}>{prs[ex.name].w}×{prs[ex.name].r}</Text></View>}
              </View>
            ))}
          </View>
          <TouchableOpacity style={s.startBtn} onPress={startSession}><Text style={s.startBtnText}>START WORKOUT</Text></TouchableOpacity>
          <TouchableOpacity style={s.lfgBtn} onPress={() => onSelectMode?.('beast')}>
            <Text style={s.lfgBtnText}>🔥 BEAST MODE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.histBtn} onPress={() => setScreen('history')}><Text style={s.histBtnText}>VIEW HISTORY</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'workout') {
    return (
      <SafeAreaView style={s.bg}>
        <StatusBar barStyle="light-content" />
        <View style={s.wkHeader}>
          <TouchableOpacity onPress={() => Alert.alert('End workout?', '', [{ text: 'Cancel' }, { text: 'End', onPress: () => { clearInterval(timerRef.current); setScreen('home'); } }])}>
            <Text style={s.wkBack}>← BACK</Text>
          </TouchableOpacity>
          <View><Text style={s.wkTitle}>{session?.name}</Text><Text style={s.wkSub}>{new Date().toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</Text></View>
        </View>
        <View style={s.timerBar}>
          <Text style={s.timerDisp}>{formatTime(elapsed)}</Text>
          <View style={s.restBtns}>
            <TouchableOpacity style={s.rBtn} onPress={() => startRest(restTimes.accessory)}><Text style={s.rBtnText}>{restTimes.accessory}s</Text></TouchableOpacity>
            <TouchableOpacity style={s.rBtn} onPress={() => startRest(120)}><Text style={s.rBtnText}>2m</Text></TouchableOpacity>
            <TouchableOpacity style={[s.rBtn, s.rBtnGold]} onPress={() => startRest(restTimes.main)}><Text style={[s.rBtnText, { color: C.black }]}>{Math.floor(restTimes.main / 60)}m</Text></TouchableOpacity>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {session?.exercises.map((ex: any, ei: number) => {
            const isActive = ei === activeEx; const rows = getSetRows(ex, ei); const pr = prs[ex.name];
            return (
              <View key={ei} style={[s.exCard, isActive && s.exCardActive]}>
                <TouchableOpacity style={s.exCardHead} onPress={() => setActiveEx(ei)}>
                  <View style={{ flex: 1 }}><Text style={s.ecTitle}>{ex.name}{ex.isWeak ? ' ⚡' : ''}{ex.isMain ? ' 💪' : ''}</Text><Text style={s.ecSub}>{ex.target} · {ex.note}</Text></View>
                  <View style={[s.ecBadge, pr && s.ecBadgePr]}><Text style={[s.ecBadgeText, pr && s.ecBadgeTextPr]}>{pr ? `${pr.w}×${pr.r}` : ex.target}</Text></View>
                </TouchableOpacity>
                {isActive && (
                  <View style={s.setLog}>
                    {rows.map((row: any, si: number) => (
                      <View key={si} style={s.setRow}>
                        <Text style={s.setLbl}>SET {si + 1}</Text>
                        <TextInput style={s.setIn} placeholder="weight" placeholderTextColor={C.muted} keyboardType="decimal-pad" value={row.w} onChangeText={v => updateSetField(ei, si, 'w', v)} />
                        <TextInput style={s.setIn} placeholder="reps" placeholderTextColor={C.muted} keyboardType="numeric" value={row.r} onChangeText={v => updateSetField(ei, si, 'r', v)} />
                        <TouchableOpacity style={[s.setOk, row.done && s.setOkDone]} onPress={() => toggleSetDone(ei, si)}>
                          <Text style={[s.setOkText, row.done && s.setOkTextDone]}>{row.done ? '✓' : 'DONE'}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity style={s.addSetBtn} onPress={() => addSet(ei)}><Text style={s.addSetText}>+ ADD SET</Text></TouchableOpacity>
                    <TouchableOpacity style={s.nextExBtn} onPress={() => { if (ei + 1 < session.exercises.length) setActiveEx(ei + 1); else finishSession(); }}>
                      <Text style={s.nextExText}>{ei < session.exercises.length - 1 ? 'NEXT EXERCISE →' : 'FINISH →'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          <TouchableOpacity style={s.finishBtn} onPress={finishSession}><Text style={s.finishBtnText}>FINISH WORKOUT</Text></TouchableOpacity>
        </ScrollView>
        <Modal visible={restVisible} transparent animationType="fade">
          <View style={s.restOverlay}>
            <Text style={s.restLabel}>REST</Text>
            <Text style={s.restTime}>{formatTime(restTime)}</Text>
            <TouchableOpacity style={s.restSkip} onPress={skipRest}><Text style={s.restSkipText}>SKIP REST</Text></TouchableOpacity>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'complete') {
    let sets = 0, reps = 0;
    Object.values(setData).forEach((rows: any) => { if (rows) rows.forEach((r: any) => { if (r.done) { sets++; reps += parseInt(r.r) || 0; } }); });
    return (
      <SafeAreaView style={[s.bg, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>🏆</Text>
        <Text style={s.doneTitle}>DONE</Text>
        <Text style={s.doneSub}>{session?.name} DAY COMPLETE</Text>
        <View style={s.doneStats}>
          <View style={s.dsRow}><Text style={s.dsLabel}>DURATION</Text><Text style={[s.dsVal, { color: C.gold }]}>{formatTime(elapsed)}</Text></View>
          <View style={s.dsRow}><Text style={s.dsLabel}>SETS LOGGED</Text><Text style={s.dsVal}>{sets}</Text></View>
          <View style={[s.dsRow, { borderBottomWidth: 0 }]}><Text style={s.dsLabel}>TOTAL REPS</Text><Text style={[s.dsVal, { color: C.green }]}>{reps}</Text></View>
        </View>
        <TouchableOpacity style={s.startBtn} onPress={() => { setScreen('home'); loadData(); }}><Text style={s.startBtnText}>BACK TO HOME</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.bg}>
      <View style={s.histHeader}>
        <Text style={s.histTitle}>HISTORY</Text>
        <TouchableOpacity onPress={() => setScreen('home')}><Text style={s.wkBack}>← BACK</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {history.length === 0 ? (
          <Text style={s.histEmpty}>NO SESSIONS YET{'\n'}GET AFTER IT</Text>
        ) : history.map((h: any, i: number) => (
          <View key={i} style={s.histCard}>
            <View style={s.histTop}><Text style={s.histType}>{h.workout_type}</Text><Text style={s.histDate}>{h.date}</Text></View>
            <View style={s.histStats}>
              <Text style={s.histStat}>TIME <Text style={{ color: C.white }}>{formatTime(h.duration_seconds)}</Text></Text>
              <Text style={s.histStat}>SETS <Text style={{ color: C.white }}>{h.sets_completed}</Text></Text>
              <Text style={s.histStat}>REPS <Text style={{ color: C.white }}>{h.reps_completed}</Text></Text>
            </View>
            {h.prs_hit?.length > 0 && (
              <View style={s.prRow}>{h.prs_hit.map((p: string, j: number) => (<View key={j} style={s.prTag}><Text style={s.prTagText}>🏆 {p}</Text></View>))}</View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

