import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Modal, Alert,
  Animated
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import type { FitnessMode } from './FitnessMode';

// ── COLORS ────────────────────────────────────────────────
const C = {
  bg: '#fdf6f0',
  bg2: '#f5ede4',
  card: '#ffffff',
  border: '#f0d8cc',
  text: '#2a1a14',
  muted: '#b8967e',
  rose: '#e8748a',
  roseDim: '#c45068',
  roseLight: '#fde8ed',
  roseBorder: '#f4b8c4',
  pink: '#f9c4d0',
  pinkLight: '#fff0f3',
  peach: '#f4a07a',
  green: '#6abf8a',
  greenLight: '#d8f0e4',
  heart: '#e8748a',
};

// ── WORKOUT TEMPLATES ─────────────────────────────────────
const TEMPLATES: Record<string, any> = {
  'upper-lower': {
    2: { name: 'Upper Body 💕', label: 'TUESDAY · UPPER BODY', exercises: [
      { name: 'DB Bench Press', target: '4×8', note: 'Full ROM, controlled', sets: 4 },
      { name: 'DB Row', target: '4×10', note: 'Elbow close, big squeeze', sets: 4 },
      { name: 'Shoulder Press', target: '3×10', note: 'Seated or standing', sets: 3 },
      { name: 'Lat Pulldown', target: '3×12', note: 'Wide grip, chest to bar', sets: 3 },
      { name: 'Lateral Raise', target: '3×15', note: 'Light, slow, full raise', sets: 3 },
      { name: 'Bicep Curl', target: '3×12', note: 'Strict, no swing', sets: 3 },
      { name: 'Tricep Pushdown', target: '3×12', note: 'Lock elbows, extend fully', sets: 3 },
    ]},
    3: { name: 'Lower Body 🌸', label: 'WEDNESDAY · LOWER BODY', exercises: [
      { name: 'Barbell Squat', target: '4×8', note: 'Depth + control', sets: 4 },
      { name: 'Romanian Deadlift', target: '4×10', note: 'Hamstring stretch — hinge, don\'t squat', sets: 4 },
      { name: 'Hip Thrust', target: '4×12', note: 'Glute focus — squeeze hard at top 🍑', sets: 4, isPriority: true },
      { name: 'Leg Press', target: '3×12', note: 'Feet high for glutes', sets: 3 },
      { name: 'Leg Curl', target: '3×12', note: 'Full ROM both ways', sets: 3 },
      { name: 'Calf Raise', target: '4×15', note: 'Full range, pause at bottom', sets: 4 },
    ]},
  },
  'full-full': {
    2: { name: 'Full Body A 🌺', label: 'TUESDAY · FULL BODY A', exercises: [
      { name: 'Barbell Squat', target: '4×6', note: 'Lower body main lift', sets: 4 },
      { name: 'DB Bench Press', target: '4×8', note: 'Upper push', sets: 4 },
      { name: 'DB Row', target: '4×8', note: 'Upper pull', sets: 4 },
      { name: 'Hip Thrust', target: '3×12', note: 'Glute builder 🍑', sets: 3, isPriority: true },
      { name: 'Lateral Raise', target: '3×15', note: 'Shoulder shape', sets: 3 },
      { name: 'Plank', target: '3×45s', note: 'Core — hold tight', sets: 3 },
    ]},
    3: { name: 'Full Body B 🌸', label: 'WEDNESDAY · FULL BODY B', exercises: [
      { name: 'Romanian Deadlift', target: '4×8', note: 'Hamstring + glute focus', sets: 4 },
      { name: 'Shoulder Press', target: '4×8', note: 'Push strength', sets: 4 },
      { name: 'Lat Pulldown', target: '4×10', note: 'Back width', sets: 4 },
      { name: 'Bulgarian Split Squat', target: '3×10', note: 'Unilateral legs', sets: 3 },
      { name: 'Bicep Curl', target: '3×12', note: 'Arms 💪', sets: 3 },
      { name: 'Cable Crunch', target: '3×15', note: 'Core strength', sets: 3 },
    ]},
  },
  'push-pull': {
    2: { name: 'Push + Pull 💪', label: 'TUESDAY · PUSH + PULL', exercises: [
      { name: 'DB Bench Press', target: '4×8', note: 'Chest — full ROM', sets: 4 },
      { name: 'Barbell Row', target: '4×8', note: 'Back — elbows back', sets: 4 },
      { name: 'Incline DB Press', target: '3×10', note: 'Upper chest', sets: 3 },
      { name: 'Lat Pulldown', target: '3×10', note: 'Back width', sets: 3 },
      { name: 'Shoulder Press', target: '3×10', note: 'Seated DB', sets: 3 },
      { name: 'Bicep Curl', target: '3×12', note: 'Strict', sets: 3 },
      { name: 'Tricep Pushdown', target: '3×12', note: 'Cable', sets: 3 },
    ]},
    3: { name: 'Legs 🌸', label: 'WEDNESDAY · LEGS', exercises: [
      { name: 'Barbell Squat', target: '4×6', note: 'Heavy', sets: 4 },
      { name: 'Romanian Deadlift', target: '4×8', note: 'Slow descent', sets: 4 },
      { name: 'Hip Thrust', target: '4×12', note: 'Glutes 🍑', sets: 4, isPriority: true },
      { name: 'Leg Press', target: '3×12', note: 'Feet high for glutes', sets: 3 },
      { name: 'Leg Curl', target: '3×12', note: 'Full ROM', sets: 3 },
      { name: 'Calf Raise', target: '4×15', note: 'Full range', sets: 4 },
    ]},
  },
  'legs-upper': {
    2: { name: 'Legs 🌺', label: 'TUESDAY · LEGS', exercises: [
      { name: 'Barbell Squat', target: '4×6', note: 'Main lift', sets: 4 },
      { name: 'Romanian Deadlift', target: '4×8', note: 'Hamstring focus', sets: 4 },
      { name: 'Hip Thrust', target: '4×12', note: 'Glutes 🍑', sets: 4, isPriority: true },
      { name: 'Leg Press', target: '3×12', note: 'Volume', sets: 3 },
      { name: 'Leg Curl', target: '3×12', note: 'Full ROM', sets: 3 },
      { name: 'Calf Raise', target: '4×15', note: 'Full range', sets: 4 },
    ]},
    3: { name: 'Upper Body 💕', label: 'WEDNESDAY · UPPER BODY', exercises: [
      { name: 'DB Bench Press', target: '4×8', note: 'Chest', sets: 4 },
      { name: 'DB Row', target: '4×10', note: 'Back', sets: 4 },
      { name: 'Shoulder Press', target: '3×10', note: 'Seated DB', sets: 3 },
      { name: 'Lat Pulldown', target: '3×12', note: 'Back width', sets: 3 },
      { name: 'Lateral Raise', target: '3×15', note: 'Shoulder shape', sets: 3 },
      { name: 'Bicep Curl', target: '3×12', note: 'Strict', sets: 3 },
      { name: 'Tricep Pushdown', target: '3×12', note: 'Cable', sets: 3 },
    ]},
  },
};

const SPLIT_OPTIONS = [
  { key: 'upper-lower', label: 'Upper / Lower 💕', sub: 'Tue upper body · Wed lower body' },
  { key: 'full-full', label: 'Full Body / Full Body 🌺', sub: 'Both days hit everything' },
  { key: 'push-pull', label: 'Push+Pull / Legs 💪', sub: 'Tue chest+back · Wed legs' },
  { key: 'legs-upper', label: 'Legs / Upper 🍑', sub: 'Tue legs · Wed upper body' },
];

const FOCUS_OPTIONS = ['Glutes 🍑', 'Hamstrings', 'Upper Body', 'Core & Abs', 'Shoulders', 'Arms', 'Back', 'Balanced 🌸'];

const INTENSITY_OPTIONS = [
  { key: 'heavy', label: 'Heavy & hard 💪', sub: 'Low reps, big weights, push limits' },
  { key: 'moderate', label: 'Moderate & consistent 🌸', sub: 'Medium weight, solid reps, steady progress' },
  { key: 'hypertrophy', label: 'Pump & volume 🔥', sub: 'Higher reps, feel the burn, shape focus' },
];

export default function GymScreenD({
  onSelectMode: _onSelectMode,
}: {
  onSelectMode?: (mode: FitnessMode) => void;
} = {}) {
  void _onSelectMode;
  const [profile, setProfile] = useState<any>(null);
  const [screen, setScreen] = useState<'loading' | 'onboard' | 'home' | 'workout' | 'complete' | 'history'>('loading');
  const [program, setProgram] = useState<any>(null);

  const [session, setSession] = useState<any>(null);
  const [activeEx, setActiveEx] = useState(0);
  const [setData, setSetData] = useState<Record<number, any[]>>({});
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  const [restVisible, setRestVisible] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const restRef = useRef<any>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [prs, setPrs] = useState<Record<string, { w: number; r: number }>>({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: sessions } = await supabase
      .from('gym_sessions')
      .select('*')
      .eq('athlete', 'danielle')
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: profileData } = await supabase
      .from('gym_profiles')
      .select('*')
      .eq('athlete', 'danielle')
      .single();

    if (sessions) {
      setHistory(sessions);
      const prMap: Record<string, { w: number; r: number }> = {};
      sessions.forEach((s: any) => {
        if (s.set_log) {
          Object.entries(s.set_log).forEach(([exName, rows]: any) => {
            rows.forEach((row: any) => {
              if (row.done && row.w && row.r) {
                const w = parseFloat(row.w), r = parseInt(row.r);
                if (!prMap[exName] || w > prMap[exName].w) prMap[exName] = { w, r };
              }
            });
          });
        }
      });
      setPrs(prMap);
    }

    if (profileData) {
      setProfile(profileData);
      setProgram(buildProgram(profileData));
      setScreen('home');
    } else {
      setScreen('onboard');
    }
  }

  function buildProgram(prof: any) {
    return TEMPLATES[prof.split] || TEMPLATES['upper-lower'];
  }

  async function saveProfile(prof: any) {
    await supabase.from('gym_profiles').upsert({ athlete: 'danielle', ...prof });
    setProfile(prof);
    setProgram(buildProgram(prof));
    setScreen('home');
  }

  function getTodayWorkout() {
    if (!program) return null;
    const day = new Date().getDay();
    return program[day] || program[2];
  }

  function formatTime(sec: number) {
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  }

  function startSession() {
    const w = getTodayWorkout();
    if (!w) return;
    setSession(w);
    setActiveEx(0);
    setSetData({});
    setElapsed(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    setScreen('workout');
  }

  function getSetRows(ex: any, ei: number) {
    if (!setData[ei]) return Array(ex.sets).fill(null).map(() => ({ w: '', r: '', done: false }));
    return setData[ei];
  }

  function updateSetField(ei: number, si: number, field: string, val: string) {
    setSetData(prev => {
      const rows = prev[ei] ? [...prev[ei]] : Array(session.exercises[ei].sets).fill(null).map(() => ({ w: '', r: '', done: false }));
      rows[si] = { ...rows[si], [field]: val };
      return { ...prev, [ei]: rows };
    });
  }

  function toggleSetDone(ei: number, si: number) {
    setSetData(prev => {
      const ex = session.exercises[ei];
      const rows = prev[ei] ? [...prev[ei]] : Array(ex.sets).fill(null).map(() => ({ w: '', r: '', done: false }));
      const updated = { ...rows[si], done: !rows[si].done };
      const newRows = [...rows];
      newRows[si] = updated;
      if (updated.done && updated.w && updated.r) {
        checkPR(ex.name, parseFloat(updated.w), parseInt(updated.r));
      }
      return { ...prev, [ei]: newRows };
    });
  }

  function checkPR(name: string, w: number, r: number) {
    setPrs(prev => {
      const pr = prev[name];
      if (!pr || w > pr.w || (w === pr.w && r > pr.r)) return { ...prev, [name]: { w, r } };
      return prev;
    });
  }

  function addSet(ei: number) {
    setSetData(prev => {
      const rows = prev[ei] ? [...prev[ei]] : [];
      return { ...prev, [ei]: [...rows, { w: '', r: '', done: false }] };
    });
  }

  async function finishSession() {
    clearInterval(timerRef.current);
    let sets = 0, reps = 0, newPrs: string[] = [];
    const setLog: Record<string, any[]> = {};

    session.exercises.forEach((ex: any, i: number) => {
      const rows = setData[i] || [];
      setLog[ex.name] = rows;
      rows.forEach((r: any) => {
        if (r.done) {
          sets++;
          reps += parseInt(r.r) || 0;
          const pr = prs[ex.name];
          if (!pr || parseFloat(r.w) > pr.w) newPrs.push(ex.name);
        }
      });
    });

    await supabase.from('gym_sessions').insert({
      athlete: 'danielle',
      workout_type: session.name,
      duration_seconds: elapsed,
      sets_completed: sets,
      reps_completed: reps,
      set_log: setLog,
      prs_hit: newPrs,
      started_on_time: true,
      date: new Date().toISOString().split('T')[0],
    });

    setHistory(prev => [{ workout_type: session.name, duration_seconds: elapsed, sets_completed: sets, reps_completed: reps, prs_hit: newPrs, date: new Date().toISOString().split('T')[0] }, ...prev]);
    setScreen('complete');
  }

  function startRest(sec: number) {
    setRestTime(sec);
    setRestVisible(true);
    clearInterval(restRef.current);
    restRef.current = setInterval(() => {
      setRestTime(t => {
        if (t <= 1) { clearInterval(restRef.current); setRestVisible(false); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  function skipRest() {
    clearInterval(restRef.current);
    setRestVisible(false);
  }

  if (screen === 'loading') return (
    <View style={s.loading}>
      <Text style={s.loadingText}>form. 🌸</Text>
    </View>
  );

  if (screen === 'onboard') return (
    <OnboardScreen onComplete={saveProfile} />
  );

  // ── HOME ──────────────────────────────────────────────
  if (screen === 'home') {
    const workout = getTodayWorkout();
    const day = new Date().getDay();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const gymDays = [2, 3];

    return (
      <SafeAreaView style={s.homeBg}>
        <StatusBar barStyle="dark-content" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.homeHeader}>
            <Text style={s.homeGreeting}>💕 {workout?.label || 'FORM'}</Text>
            <Text style={s.homeTitle}>{workout?.name || 'Rest day 🌸'}</Text>
            <Text style={s.homeSub}>75 min · strength training</Text>
          </View>

          <View style={s.weekStrip}>
            {days.map((d, i) => (
              <View key={i} style={[s.weekDay, gymDays.includes(i) && s.weekDayGym, i === day && s.weekDayToday]}>
                <Text style={[s.wdLabel, i === day && s.wdLabelToday]}>{d}</Text>
                <Text style={[s.wdType, i === day && s.wdTypeToday]}>
                  {gymDays.includes(i) ? '♥' : '—'}
                </Text>
              </View>
            ))}
          </View>

          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.shLabel}>TODAY'S WORKOUT 🌺</Text>
                <Text style={s.shTitle}>{workout?.name}</Text>
              </View>
              <View style={s.shBadge}><Text style={s.shBadgeText}>75 MIN</Text></View>
            </View>
            {workout?.exercises.map((ex: any, i: number) => (
              <View key={i} style={[s.exRowP, i === workout.exercises.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={s.exNumP}>♥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.exNameP}>{ex.name}{ex.isPriority ? ' ⭐' : ''}</Text>
                  <Text style={s.exDetailP}>{ex.target} · {ex.note}</Text>
                </View>
                {prs[ex.name] && (
                  <View style={s.prChip}>
                    <Text style={s.prChipText}>{prs[ex.name].w}×{prs[ex.name].r}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.startBtn} onPress={startSession}>
            <Text style={s.startBtnText}>Begin session 🌸</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.histBtn} onPress={() => setScreen('history')}>
            <Text style={s.histBtnText}>VIEW HISTORY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.resetBtn} onPress={() =>
            Alert.alert('Reset program? 🌸', 'This will clear your program settings.', [
              { text: 'Cancel' },
              { text: 'Reset', style: 'destructive', onPress: async () => { await supabase.from('gym_profiles').delete().eq('athlete', 'danielle'); setScreen('onboard'); setProfile(null); } }
            ])
          }>
            <Text style={s.resetBtnText}>change program</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── WORKOUT ───────────────────────────────────────────
  if (screen === 'workout') {
    return (
      <SafeAreaView style={s.wkBg}>
        <StatusBar barStyle="dark-content" />
        <View style={s.wkHeader}>
          <TouchableOpacity onPress={() => Alert.alert('End session? 🌸', '', [{ text: 'Keep going 💪' }, { text: 'End', onPress: () => { clearInterval(timerRef.current); setScreen('home'); } }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.roseBorder, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 }} activeOpacity={0.7}>
            <ChevronLeft size={16} color={C.rose} /><Text style={{ fontSize: 12, color: C.rose, fontWeight: '600', letterSpacing: 1 }}>END</Text>
          </TouchableOpacity>
          <View>
            <Text style={s.wkTitle}>{session?.name}</Text>
            <Text style={s.wkDate}>{new Date().toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.timerBar}>
          <Text style={s.timerDisp}>{formatTime(elapsed)}</Text>
          <View style={s.restBtns}>
            <TouchableOpacity style={s.rBtn} onPress={() => startRest(60)}><Text style={s.rBtnText}>60s</Text></TouchableOpacity>
            <TouchableOpacity style={s.rBtn} onPress={() => startRest(90)}><Text style={s.rBtnText}>90s</Text></TouchableOpacity>
            <TouchableOpacity style={[s.rBtn, s.rBtnPrimary]} onPress={() => startRest(120)}><Text style={[s.rBtnText, s.rBtnTextPrimary]}>2m</Text></TouchableOpacity>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {session?.exercises.map((ex: any, ei: number) => {
            const isActive = ei === activeEx;
            const rows = getSetRows(ex, ei);
            const pr = prs[ex.name];
            return (
              <View key={ei} style={[s.exCard, isActive && s.exCardActive]}>
                <TouchableOpacity style={s.exCardHead} onPress={() => setActiveEx(ei)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.ecTitle}>{ex.name}{ex.isPriority ? ' ⭐' : ''}</Text>
                    <Text style={s.ecSub}>{ex.target} · {ex.note}</Text>
                  </View>
                  <View style={[s.ecBadge, pr && s.ecBadgePr]}>
                    <Text style={[s.ecBadgeText, pr && s.ecBadgeTextPr]}>{pr ? `${pr.w}×${pr.r}` : ex.target}</Text>
                  </View>
                </TouchableOpacity>

                {isActive && (
                  <View style={s.setLog}>
                    {rows.map((row: any, si: number) => (
                      <View key={si} style={s.setRow}>
                        <Text style={s.setLbl}>SET {si + 1}</Text>
                        <TextInput style={s.setIn} placeholder="weight" placeholderTextColor={C.muted} keyboardType="decimal-pad" value={row.w} onChangeText={v => updateSetField(ei, si, 'w', v)} />
                        <TextInput style={s.setIn} placeholder="reps" placeholderTextColor={C.muted} keyboardType="numeric" value={row.r} onChangeText={v => updateSetField(ei, si, 'r', v)} />
                        <TouchableOpacity style={[s.setOk, row.done && s.setOkDone]} onPress={() => toggleSetDone(ei, si)}>
                          <Text style={[s.setOkText, row.done && s.setOkTextDone]}>{row.done ? '♥' : 'done'}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity style={s.addSetBtn} onPress={() => addSet(ei)}>
                      <Text style={s.addSetText}>+ add set 🌸</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.nextExBtn} onPress={() => {
                      if (ei + 1 < session.exercises.length) setActiveEx(ei + 1);
                      else finishSession();
                    }}>
                      <Text style={s.nextExText}>{ei < session.exercises.length - 1 ? 'Next exercise →' : 'Finish 💕'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          <TouchableOpacity style={s.finishBtn} onPress={finishSession}>
            <Text style={s.finishBtnText}>Finish session 🌸</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={restVisible} transparent animationType="fade">
          <View style={s.restOverlay}>
            <Text style={s.restLabel}>REST 💕</Text>
            <Text style={s.restTime}>{formatTime(restTime)}</Text>
            <TouchableOpacity style={s.restSkip} onPress={skipRest}>
              <Text style={s.restSkipText}>skip rest 🌸</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────
  if (screen === 'complete') {
    let sets = 0, reps = 0;
    Object.values(setData).forEach((rows: any) => {
      if (rows) rows.forEach((r: any) => { if (r.done) { sets++; reps += parseInt(r.r) || 0; } });
    });
    return (
      <SafeAreaView style={[s.homeBg, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 64, marginBottom: 12 }}>💕🏆💕</Text>
        <Text style={s.doneTitle}>Done.</Text>
        <Text style={s.doneSub}>{session?.name?.toUpperCase()} COMPLETE 🌸</Text>
        <View style={s.doneStats}>
          <View style={s.dsRow}><Text style={s.dsLabel}>DURATION</Text><Text style={[s.dsVal, { color: C.rose }]}>{formatTime(elapsed)}</Text></View>
          <View style={s.dsRow}><Text style={s.dsLabel}>SETS LOGGED</Text><Text style={s.dsVal}>{sets}</Text></View>
          <View style={[s.dsRow, { borderBottomWidth: 0 }]}><Text style={s.dsLabel}>TOTAL REPS</Text><Text style={s.dsVal}>{reps}</Text></View>
        </View>
        <TouchableOpacity style={s.startBtn} onPress={() => { setScreen('home'); loadData(); }}>
          <Text style={s.startBtnText}>Back to home 🌺</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── HISTORY ───────────────────────────────────────────
  return (
    <SafeAreaView style={s.homeBg}>
      <View style={s.histHeader}>
        <Text style={s.histTitle}>History 💕</Text>
        <TouchableOpacity onPress={() => setScreen('home')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.roseBorder, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 }} activeOpacity={0.7}><ChevronLeft size={16} color={C.rose} /><Text style={{ fontSize: 12, color: C.rose, fontWeight: '600', letterSpacing: 1 }}>BACK</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {history.length === 0 ? (
          <Text style={s.histEmpty}>No sessions yet.{'\n'}You've got this! 💪🌸</Text>
        ) : history.map((h: any, i: number) => (
          <View key={i} style={s.histCard}>
            <View style={s.histTop}>
              <Text style={s.histType}>{h.workout_type}</Text>
              <Text style={s.histDate}>{h.date}</Text>
            </View>
            <View style={s.histStats}>
              <Text style={s.histStat}>TIME <Text style={{ color: C.text }}>{formatTime(h.duration_seconds)}</Text></Text>
              <Text style={s.histStat}>SETS <Text style={{ color: C.text }}>{h.sets_completed}</Text></Text>
              <Text style={s.histStat}>REPS <Text style={{ color: C.text }}>{h.reps_completed}</Text></Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── ONBOARD ───────────────────────────────────────────────
function OnboardScreen({ onComplete }: { onComplete: (prof: any) => void }) {
  const [step, setStep] = useState(0);
  const [split, setSplit] = useState<string | null>(null);
  const [focuses, setFocuses] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  function nextStep() {
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setStep(s => s + 1);
  }

  function toggleFocus(f: string) {
    setFocuses(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  return (
    <View style={s.onboardBg}>
      <StatusBar barStyle="light-content" />
      <Text style={s.onboardWatermark}>form.</Text>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
        <ScrollView contentContainerStyle={s.onboardInner} showsVerticalScrollIndicator={false}>
          <View style={s.obProgress}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[s.obDot, i <= step && s.obDotActive]} />
            ))}
          </View>

          <Animated.View style={{ opacity: fade }}>
            {step === 0 && (
              <View>
                <Text style={s.obGreeting}>Welcome, Danielle 💕</Text>
                <Text style={s.obTitle}>Let's build{'\n'}your program.</Text>
                <Text style={s.obSub}>A few quick questions and your tracker is ready. 🌸</Text>
                <TouchableOpacity style={s.obNext} onPress={nextStep}>
                  <Text style={s.obNextText}>Let's go →</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 1 && (
              <View>
                <Text style={s.obStep}>Step 1 of 3 💕</Text>
                <Text style={s.obQuestion}>What kind of split do you want?</Text>
                {SPLIT_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.key} style={[s.obOpt, split === opt.key && s.obOptSelected]} onPress={() => setSplit(opt.key)}>
                    <Text style={[s.obOptLabel, split === opt.key && s.obOptLabelSelected]}>{opt.label}</Text>
                    <Text style={[s.obOptSub, split === opt.key && s.obOptSubSelected]}>{opt.sub}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[s.obNext, !split && s.obNextDim]} onPress={() => split && nextStep()}>
                  <Text style={s.obNextText}>Continue →</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && (
              <View>
                <Text style={s.obStep}>Step 2 of 3 🌸</Text>
                <Text style={s.obQuestion}>Any areas you want to prioritize?</Text>
                <View style={s.chipRow}>
                  {FOCUS_OPTIONS.map(f => (
                    <TouchableOpacity key={f} style={[s.chip, focuses.includes(f) && s.chipSelected]} onPress={() => toggleFocus(f)}>
                      <Text style={[s.chipText, focuses.includes(f) && s.chipTextSelected]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={s.obNext} onPress={nextStep}>
                  <Text style={s.obNextText}>Continue →</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <View>
                <Text style={s.obStep}>Step 3 of 3 💪</Text>
                <Text style={s.obQuestion}>How do you like to train?</Text>
                {INTENSITY_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.key} style={[s.obOpt, intensity === opt.key && s.obOptSelected]} onPress={() => setIntensity(opt.key)}>
                    <Text style={[s.obOptLabel, intensity === opt.key && s.obOptLabelSelected]}>{opt.label}</Text>
                    <Text style={[s.obOptSub, intensity === opt.key && s.obOptSubSelected]}>{opt.sub}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[s.obNext, !intensity && s.obNextDim]} onPress={() => intensity && onComplete({ split: split || 'upper-lower', focuses, intensity })}>
                  <Text style={s.obNextText}>Build my program 💕</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────
const s = StyleSheet.create({
  loading: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 42, color: C.rose, fontStyle: 'italic' },
  onboardBg: { flex: 1, backgroundColor: '#2a1a1e' },
  onboardWatermark: { position: 'absolute', fontSize: 120, color: '#3a2a2e', alignSelf: 'center', top: '28%', opacity: 0.6, fontStyle: 'italic' },
  onboardInner: { padding: 28, paddingTop: 20 },
  obProgress: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  obDot: { flex: 1, height: 2, backgroundColor: '#4a3a3e', borderRadius: 1 },
  obDotActive: { backgroundColor: C.rose },
  obGreeting: { fontSize: 12, color: C.rose, letterSpacing: 3, marginBottom: 10 },
  obTitle: { fontSize: 40, color: C.bg, fontStyle: 'italic', lineHeight: 46, marginBottom: 10 },
  obSub: { fontSize: 12, color: '#9a8a8e', lineHeight: 18, marginBottom: 40 },
  obStep: { fontSize: 11, color: C.rose, letterSpacing: 3, marginBottom: 14 },
  obQuestion: { fontSize: 22, color: C.bg, fontStyle: 'italic', marginBottom: 20 },
  obOpt: { padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#4a3a3e', marginBottom: 10 },
  obOptSelected: { borderColor: C.rose, backgroundColor: 'rgba(232,116,138,0.12)' },
  obOptLabel: { fontSize: 17, color: '#c0b0b5' },
  obOptLabelSelected: { color: C.bg },
  obOptSub: { fontSize: 11, color: '#7a6a6e', marginTop: 3 },
  obOptSubSelected: { color: C.rose },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#4a3a3e' },
  chipSelected: { borderColor: C.rose, backgroundColor: 'rgba(232,116,138,0.18)' },
  chipText: { fontSize: 12, color: '#c0b0b5' },
  chipTextSelected: { color: C.bg },
  obNext: { backgroundColor: C.rose, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
  obNextDim: { opacity: 0.4 },
  obNextText: { color: '#fff', fontSize: 20, fontStyle: 'italic', letterSpacing: 1 },
  homeBg: { flex: 1, backgroundColor: C.bg },
  homeHeader: { padding: 24, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  homeGreeting: { fontSize: 10, color: C.rose, letterSpacing: 3, marginBottom: 4 },
  homeTitle: { fontSize: 46, color: C.text, fontStyle: 'italic', lineHeight: 50 },
  homeSub: { fontSize: 10, color: C.muted, marginTop: 6 },
  weekStrip: { flexDirection: 'row', padding: 14, paddingHorizontal: 16, gap: 5, borderBottomWidth: 1, borderBottomColor: C.border },
  weekDay: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg2 },
  weekDayGym: { borderColor: C.roseBorder },
  weekDayToday: { backgroundColor: C.rose, borderColor: C.rose },
  wdLabel: { fontSize: 8, color: C.muted },
  wdLabelToday: { color: '#fff' },
  wdType: { fontSize: 14, color: C.text, fontWeight: '600', marginTop: 2 },
  wdTypeToday: { color: '#fff' },
  sectionCard: { margin: 16, marginBottom: 0, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  sectionHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shLabel: { fontSize: 9, color: C.rose, letterSpacing: 3 },
  shTitle: { fontSize: 28, fontStyle: 'italic', marginTop: 2, color: C.text },
  shBadge: { backgroundColor: C.roseLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.roseBorder },
  shBadgeText: { fontSize: 10, color: C.roseDim },
  exRowP: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f8f0ec', gap: 10 },
  exNumP: { fontSize: 16, color: C.rose, width: 20, textAlign: 'center' },
  exNameP: { fontSize: 14, fontWeight: '500', color: C.text },
  exDetailP: { fontSize: 10, color: C.muted, marginTop: 1 },
  prChip: { backgroundColor: C.roseLight, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: C.roseBorder },
  prChipText: { fontSize: 9, color: C.roseDim },
  startBtn: { margin: 16, marginBottom: 8, backgroundColor: C.rose, borderRadius: 14, padding: 18, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 22, fontStyle: 'italic', letterSpacing: 1 },
  histBtn: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  histBtnText: { fontSize: 11, color: C.muted, letterSpacing: 2 },
  resetBtn: { marginHorizontal: 16, marginBottom: 32, alignItems: 'center', padding: 8 },
  resetBtnText: { fontSize: 10, color: C.muted },
  wkBg: { flex: 1, backgroundColor: C.bg },
  wkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 20, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  wkBack: { fontSize: 12, color: C.muted },
  wkTitle: { fontSize: 36, fontStyle: 'italic', textAlign: 'right', color: C.text },
  wkDate: { fontSize: 10, color: C.rose, textAlign: 'right', marginTop: 2 },
  timerBar: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card, gap: 10 },
  timerDisp: { fontSize: 28, color: C.rose, minWidth: 75 },
  restBtns: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'flex-end' },
  rBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg2 },
  rBtnPrimary: { backgroundColor: C.rose, borderColor: C.rose },
  rBtnText: { fontSize: 11, color: C.text },
  rBtnTextPrimary: { color: '#fff' },
  exCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  exCardActive: { borderColor: C.rose },
  exCardHead: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  ecTitle: { fontSize: 20, fontStyle: 'italic', color: C.text },
  ecSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  ecBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg2 },
  ecBadgePr: { borderColor: C.roseBorder, backgroundColor: C.roseLight },
  ecBadgeText: { fontSize: 10, color: C.muted },
  ecBadgeTextPr: { color: C.roseDim },
  setLog: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: C.border },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8f0ec', gap: 7 },
  setLbl: { fontSize: 9, color: C.muted, width: 34 },
  setIn: { flex: 1, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 9, textAlign: 'center', fontSize: 14, color: C.text, maxWidth: 90 },
  setOk: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg2 },
  setOkDone: { backgroundColor: C.rose, borderColor: C.rose },
  setOkText: { fontSize: 10, color: C.muted },
  setOkTextDone: { color: '#fff' },
  addSetBtn: { marginTop: 10, marginBottom: 8, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 9, alignItems: 'center' },
  addSetText: { fontSize: 10, color: C.muted },
  nextExBtn: { backgroundColor: C.rose, borderRadius: 10, padding: 14, alignItems: 'center' },
  nextExText: { color: '#fff', fontSize: 18, fontStyle: 'italic' },
  finishBtn: { borderWidth: 1, borderColor: C.rose, borderRadius: 12, padding: 16, alignItems: 'center', margin: 4, marginTop: 8 },
  finishBtnText: { fontSize: 22, color: C.rose, fontStyle: 'italic', letterSpacing: 1 },
  restOverlay: { flex: 1, backgroundColor: 'rgba(253,246,240,0.97)', justifyContent: 'center', alignItems: 'center' },
  restLabel: { fontSize: 11, color: C.muted, letterSpacing: 4, marginBottom: 8 },
  restTime: { fontSize: 88, color: C.rose, fontStyle: 'italic', lineHeight: 96 },
  restSkip: { marginTop: 32, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  restSkipText: { fontSize: 12, color: C.muted, letterSpacing: 2 },
  doneTitle: { fontSize: 68, color: C.rose, fontStyle: 'italic', lineHeight: 72 },
  doneSub: { fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 32, marginTop: 6 },
  doneStats: { width: '100%', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 24 },
  dsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8f0ec' },
  dsLabel: { fontSize: 10, color: C.muted, letterSpacing: 1 },
  dsVal: { fontSize: 24, fontStyle: 'italic', color: C.text },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16 },
  histTitle: { fontSize: 44, fontStyle: 'italic', color: C.text },
  histEmpty: { textAlign: 'center', paddingTop: 60, fontSize: 18, fontStyle: 'italic', color: C.muted, lineHeight: 32 },
  histCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 10 },
  histTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  histType: { fontSize: 26, fontStyle: 'italic', color: C.text },
  histDate: { fontSize: 10, color: C.muted },
  histStats: { flexDirection: 'row', gap: 16 },
  histStat: { fontSize: 10, color: C.muted },
});
