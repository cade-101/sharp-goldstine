import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import EffortSelector from '../components/EffortSelector';
import { PropsModal } from './HouseholdSetup';
import type { EffortRating } from '../lib/fitnessTypes';

// ── DEFAULT SHIT TALK ──────────────────────────────────────────────────────────
const DEFAULT_SHIT_TALK = [
  "That all you got? 😴",
  "My grandma lifts more. 👵",
  "Called it 💀",
  "Cute warm-up 🌸",
  "Is that sweat or tears? 😂",
  "I'm not even breathing hard 🤙",
  "See you at the finish line... eventually.",
  "That's not a PR, that's a cry for help.",
  "Thought you were ready for this 👀",
  "Sending thoughts and prayers to your ego 🙏",
];

const EDGE_URL = 'https://rzutjhmaoagjdrjefvzh.supabase.co/functions/v1/fitness-engine';

// ── TYPES ──────────────────────────────────────────────────────────────────────
type JointScreen = 'invite' | 'waiting' | 'active' | 'complete';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  targetReps: string;
  targetWeight?: number | null;
  restSeconds: number;
  note?: string;
}

interface JointScore {
  sessions: number;
  prs: number;
  onTime: number;
  volumeWins: number;
  total: number;
}

interface Props {
  user: {
    id: string;
    username?: string;
    house_name?: string;
    theme?: string;
    equipment?: string;
  };
  partnerId: string | null;
  partnerUsername: string;
  C: {
    bg: string; dark: string; card: string; border: string;
    accent: string; accentDim: string; accentBg: string;
    text: string; muted: string; green: string; red: string;
    mode: 'dark' | 'light';
  };
  onBack: () => void;
}

// ── HELPERS ────────────────────────────────────────────────────────────────────
function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

function callEngine(body: object): Promise<unknown> {
  return fetch(EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => { if (!r.ok) throw new Error(`Engine ${r.status}`); return r.json(); });
}

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function JointOps({ user, partnerId, partnerUsername, C, onBack }: Props) {
  const [screen, setScreen] = useState<JointScreen>('invite');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [setEntry, setSetEntry] = useState({ weight: '', reps: '' });
  const [effort, setEffort] = useState<EffortRating | null>(null);
  const [loading, setLoading] = useState(false);

  // Timers
  const [restSeconds, setRestSeconds] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scoring
  const [myScore, setMyScore] = useState<JointScore>({ sessions: 0, prs: 0, onTime: 0, volumeWins: 0, total: 0 });
  const [partnerScore, setPartnerScore] = useState<JointScore>({ sessions: 0, prs: 0, onTime: 0, volumeWins: 0, total: 0 });

  // Shit talk
  const [shitTalkLib, setShitTalkLib] = useState<string[]>(DEFAULT_SHIT_TALK);
  const [shitTalkModal, setShitTalkModal] = useState(false);
  const [incomingShitTalk, setIncomingShitTalk] = useState<string | null>(null);

  // Props
  const [propsModal, setPropsModal] = useState(false);

  // Completion
  const [completedSets, setCompletedSets] = useState<{ exerciseName: string; weight: number; reps: number; isPR: boolean }[]>([]);

  const s = makeStyles(C);
  const myName = user.username ?? 'YOU';

  useEffect(() => {
    loadShitTalkLib();
    checkForExistingInvite();

    return () => {
      clearInterval(sessionTimerRef.current!);
      clearInterval(restRef.current!);
    };
  }, []);

  // Subscribe to incoming shit talk + partner joining
  useEffect(() => {
    if (!user.house_name) return;

    const channel = supabase.channel(`joint_ops_${user.house_name}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'props',
        filter: `to_user=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new.event_type === 'shit_talk') {
          setIncomingShitTalk(payload.new.message);
          setTimeout(() => setIncomingShitTalk(null), 4000);
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'household_events',
        filter: `household_id=eq.${user.house_name}`,
      }, (payload: any) => {
        if (payload.new.event_type === 'joint_ops_join' && payload.new.from_user !== user.id) {
          // Partner joined — start the workout
          if (screen === 'waiting') startJointWorkout();
        }
        if (payload.new.event_type === 'joint_ops_invite' && payload.new.to_user === user.id && screen === 'invite') {
          Alert.alert(
            `⚔️ ${partnerUsername} started JOINT OPS`,
            'Join now?',
            [
              { text: 'Join', onPress: joinExistingSession },
              { text: 'Not now', style: 'cancel' },
            ]
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [screen]);

  // Real-time scoring: watch exercise_performance for partner rows
  useEffect(() => {
    if (screen !== 'active' || !sessionId || !partnerId) return;

    const channel = supabase.channel(`joint_score_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'exercise_performance',
        filter: `user_id=eq.${partnerId}`,
      }, (payload: any) => {
        const row = payload.new;
        if (row.is_pr) {
          setPartnerScore(prev => ({ ...prev, prs: prev.prs + 1, total: prev.total + 25 }));
        }
        // Check volume win for this exercise
        const myBestForEx = completedSets
          .filter(s => s.exerciseName === row.exercise_name)
          .reduce((best, s) => Math.max(best, s.weight * s.reps), 0);
        const partnerVol = row.weight * row.reps;
        if (partnerVol > myBestForEx) {
          setPartnerScore(prev => ({ ...prev, volumeWins: prev.volumeWins + 1, total: prev.total + 15 }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [screen, sessionId, partnerId, completedSets]);

  async function loadShitTalkLib() {
    if (!user.house_name) return;
    const { data } = await supabase
      .from('household_settings')
      .select('shit_talk_library')
      .eq('house_name', user.house_name)
      .maybeSingle();
    const lib = data?.shit_talk_library;
    if (Array.isArray(lib) && lib.length > 0) setShitTalkLib(lib);
    else await seedShitTalkLib();
  }

  async function seedShitTalkLib() {
    if (!user.house_name) return;
    await supabase.from('household_settings').upsert({
      house_name: user.house_name,
      shit_talk_library: DEFAULT_SHIT_TALK,
    });
  }

  async function checkForExistingInvite() {
    if (!partnerId || !user.house_name) return;
    const { data } = await supabase
      .from('household_events')
      .select('id, event_data')
      .eq('household_id', user.house_name)
      .eq('event_type', 'joint_ops_invite')
      .eq('to_user', user.id)
      .eq('seen', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      Alert.alert(
        `⚔️ ${partnerUsername} wants to do JOINT OPS`,
        'Join their session?',
        [
          { text: 'Join now', onPress: joinExistingSession },
          { text: 'Start my own', style: 'cancel' },
        ]
      );
    }
  }

  async function sendInvite() {
    if (!partnerId || !user.house_name) return;
    setLoading(true);
    await supabase.from('household_events').insert({
      event_type: 'joint_ops_invite',
      from_user: user.id,
      to_user: partnerId,
      household_id: user.house_name,
      event_data: {},
      seen: false,
    });
    setLoading(false);
    setScreen('waiting');
    startJointWorkout(); // Host starts immediately; partner joins when ready
  }

  async function joinExistingSession() {
    if (!user.house_name) return;
    // Mark invite as seen
    await supabase
      .from('household_events')
      .update({ seen: true })
      .eq('household_id', user.house_name)
      .eq('event_type', 'joint_ops_invite')
      .eq('to_user', user.id);
    // Notify partner that we joined
    await supabase.from('household_events').insert({
      event_type: 'joint_ops_join',
      from_user: user.id,
      to_user: partnerId,
      household_id: user.house_name,
      event_data: {},
      seen: false,
    });
    await startJointWorkout();
  }

  async function startJointWorkout() {
    setLoading(true);
    try {
      const result = await callEngine({
        event: 'joint_ops_start',
        userId: user.id,
        partnerId,
        payload: {
          hardStopMinutes: 75,
          equipment: user.equipment ?? 'full_gym',
        },
      }) as { sessionId: string; plan: { exercises: Exercise[]; label: string } };

      setSessionId(result.sessionId);
      setExercises(result.plan.exercises);

      // Start timers
      setElapsed(0);
      clearInterval(sessionTimerRef.current!);
      sessionTimerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

      // +10 pts for session start (on time)
      setMyScore(prev => ({ ...prev, sessions: 1, onTime: 1, total: 15 }));

      setScreen('active');
    } catch {
      Alert.alert('Could not load session', 'Check connection and try again.');
    }
    setLoading(false);
  }

  async function logSet() {
    if (!sessionId || !exercises.length || !effort) return;
    const ex = exercises[exerciseIndex];
    const weight = parseFloat(setEntry.weight) || 0;
    const reps = parseInt(setEntry.reps) || 0;

    try {
      const result = await callEngine({
        event: 'set_completed',
        userId: user.id,
        sessionId,
        payload: {
          exerciseName: ex.name,
          exerciseId: ex.id,
          setIndex: currentSetIndex,
          weight,
          reps,
          effort,
          remainingMinutes: 60,
          currentPlan: exercises.slice(exerciseIndex),
        },
      }) as { isPR: boolean; restSeconds?: number };

      const entry = { exerciseName: ex.name, weight, reps, isPR: result.isPR ?? false };
      setCompletedSets(prev => [...prev, entry]);

      // Update my score
      let pts = 0;
      if (result.isPR) pts += 25;
      // Volume win vs partner's last set
      setMyScore(prev => ({
        ...prev,
        prs: result.isPR ? prev.prs + 1 : prev.prs,
        total: prev.total + pts,
      }));

      // Advance
      const setsForThisEx = completedSets.filter(s => s.exerciseName === ex.name).length + 1;
      if (setsForThisEx >= ex.sets) {
        const next = exerciseIndex + 1;
        if (next >= exercises.length) { await finishSession(); return; }
        setExerciseIndex(next);
        setCurrentSetIndex(0);
      } else {
        setCurrentSetIndex(currentSetIndex + 1);
      }

      setSetEntry({ weight: '', reps: '' });
      setEffort(null);
      startRest(result.restSeconds ?? ex.restSeconds);
    } catch { /* fallback advance */ }
  }

  async function finishSession() {
    clearInterval(sessionTimerRef.current!);
    clearInterval(restRef.current!);
    if (sessionId) {
      try {
        await callEngine({
          event: 'session_end',
          userId: user.id,
          sessionId,
          payload: { completedSets: completedSets.length, prsHit: completedSets.filter(s => s.isPR).map(s => s.exerciseName) },
        });
      } catch { /* best effort */ }
    }
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

  async function sendShitTalk(msg: string) {
    if (!partnerId) return;
    await supabase.from('props').insert({
      from_user: user.id,
      to_user: partnerId,
      message: msg,
      event_type: 'shit_talk',
      seen: false,
    });
    setShitTalkModal(false);
  }

  // ── INVITE SCREEN ──────────────────────────────────────────────────────────
  if (screen === 'invite') return (
    <SafeAreaView style={[s.bg, { flex: 1 }]}>
      <StatusBar barStyle={C.mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.backText}>← BACK</Text>
        </TouchableOpacity>
      </View>
      <View style={[s.center, { flex: 1, padding: 32 }]}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>⚔️</Text>
        <Text style={[s.bigTitle, { color: C.accent }]}>JOINT OPS</Text>
        <Text style={[s.sub, { color: C.muted, textAlign: 'center', marginBottom: 40 }]}>
          {partnerId
            ? `This will notify ${partnerUsername} to join.\nSame workout. Head-to-head. No mercy.`
            : 'No partner found. Make sure you both have the same house name set up in your profiles.'}
        </Text>
        {partnerId && (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: C.accent }]}
            onPress={sendInvite}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={C.bg} />
              : <Text style={[s.primaryBtnText, { color: C.bg }]}>ACTIVATE JOINT OPS ⚔️</Text>
            }
          </TouchableOpacity>
        )}
        <TouchableOpacity style={{ marginTop: 16 }} onPress={onBack}>
          <Text style={[s.sub, { color: C.muted }]}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // ── WAITING SCREEN ─────────────────────────────────────────────────────────
  if (screen === 'waiting') return (
    <SafeAreaView style={[s.bg, { flex: 1 }]}>
      <View style={[s.center, { flex: 1, padding: 32 }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={[s.bigTitle, { color: C.accent, marginTop: 24, fontSize: 28 }]}>
          Waiting for {partnerUsername}...
        </Text>
        <Text style={[s.sub, { color: C.muted, textAlign: 'center', marginTop: 12 }]}>
          Invite sent. Starting your plan now — they can join mid-session.
        </Text>
      </View>
    </SafeAreaView>
  );

  // ── ACTIVE WORKOUT ─────────────────────────────────────────────────────────
  if (screen === 'active') {
    const ex = exercises[exerciseIndex];
    if (!ex) { finishSession(); return null; }
    const nextEx = exercises[exerciseIndex + 1];

    return (
      <SafeAreaView style={s.bg}>
        <StatusBar barStyle={C.mode === 'dark' ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.bigTitle, { color: C.accent, fontSize: 20 }]}>JOINT OPS ⚔️</Text>
          <Text style={[s.sub, { color: C.muted }]}>{formatTime(elapsed)}</Text>
        </View>

        {/* Scoreboard */}
        <View style={[s.scoreRow, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.scoreCol}>
            <Text style={[s.scoreName, { color: C.accent }]}>{myName.toUpperCase()}</Text>
            <Text style={[s.scoreNum, { color: C.accent }]}>{myScore.total}</Text>
            <Text style={[s.scoreSub, { color: C.muted }]}>{myScore.prs} PRs · {myScore.sessions} sessions</Text>
          </View>
          <Text style={[s.scoreVS, { color: C.muted }]}>VS</Text>
          <View style={[s.scoreCol, { alignItems: 'flex-end' }]}>
            <Text style={[s.scoreName, { color: '#e8748a' }]}>{partnerUsername.toUpperCase()}</Text>
            <Text style={[s.scoreNum, { color: '#e8748a' }]}>{partnerScore.total}</Text>
            <Text style={[s.scoreSub, { color: C.muted }]}>{partnerScore.prs} PRs · {partnerScore.sessions} sessions</Text>
          </View>
        </View>

        {/* Incoming shit talk toast */}
        {incomingShitTalk && (
          <View style={[s.shitTalkToast, { backgroundColor: C.red }]}>
            <Text style={s.shitTalkToastText}>💀 {incomingShitTalk}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>

          {/* Current exercise */}
          <View style={[s.exCard, { borderColor: C.accent, backgroundColor: C.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.exName, { color: C.text }]}>{ex.name}</Text>
                <Text style={[s.sub, { color: C.muted }]}>
                  SET {currentSetIndex + 1} of {ex.sets} · {ex.targetReps} reps
                </Text>
              </View>
            </View>

            {/* Weight + reps */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: C.muted }]}>WEIGHT (kg)</Text>
                <TouchableOpacity style={[s.input, { backgroundColor: C.dark, borderColor: C.border }]}>
                  <Text style={[{ color: C.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }]}>
                    {setEntry.weight || (ex.targetWeight ? String(ex.targetWeight) : '—')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: C.muted }]}>REPS</Text>
                <TouchableOpacity style={[s.input, { backgroundColor: C.dark, borderColor: C.border }]}>
                  <Text style={[{ color: C.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }]}>
                    {setEntry.reps || ex.targetReps}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <EffortSelector value={effort} onChange={setEffort} accentColor={C.accent} />

            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: 14, backgroundColor: effort ? C.accent : C.dark, borderColor: effort ? C.accent : C.border, borderWidth: 1 }]}
              onPress={logSet}
              disabled={!effort}
            >
              <Text style={[s.primaryBtnText, { color: effort ? C.bg : C.muted }]}>LOG SET →</Text>
            </TouchableOpacity>
          </View>

          {/* Rest timer */}
          {restRunning && (
            <View style={[s.restBox, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[s.sub, { color: C.muted, letterSpacing: 4 }]}>REST</Text>
              <Text style={[s.restTime, { color: C.accent }]}>{formatTime(restSeconds)}</Text>
              <TouchableOpacity onPress={() => { clearInterval(restRef.current!); setRestRunning(false); setRestSeconds(0); }}>
                <Text style={[s.sub, { color: C.muted }]}>SKIP</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Next up */}
          {nextEx && (
            <View style={[s.nextPreview, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[s.inputLabel, { color: C.muted }]}>NEXT UP</Text>
              <Text style={[s.exName, { color: C.text, fontSize: 16 }]}>{nextEx.name}</Text>
              <Text style={[s.sub, { color: C.muted }]}>{nextEx.sets} sets · {nextEx.targetReps}</Text>
            </View>
          )}

          {/* Action row: shit talk + props + finish */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity
              style={[s.actionBtn, { borderColor: C.red, flex: 1 }]}
              onPress={() => setShitTalkModal(true)}
            >
              <Text style={[s.actionBtnText, { color: C.red }]}>💀 SHIT TALK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { borderColor: C.accent, flex: 1 }]}
              onPress={() => setPropsModal(true)}
            >
              <Text style={[s.actionBtnText, { color: C.accent }]}>💪 PROPS</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.actionBtn, { borderColor: C.green, marginTop: 8 }]}
            onPress={() => Alert.alert('Finish Joint Ops?', '', [
              { text: 'Keep going' },
              { text: 'Finish', style: 'destructive', onPress: finishSession },
            ])}
          >
            <Text style={[s.actionBtnText, { color: C.green }]}>FINISH JOINT OPS</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Shit Talk Modal */}
        <Modal visible={shitTalkModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { backgroundColor: C.dark }]}>
              <Text style={[s.bigTitle, { color: C.red, fontSize: 20, marginBottom: 16 }]}>💀 SHIT TALK</Text>
              <ScrollView>
                {shitTalkLib.map((msg, i) => (
                  <TouchableOpacity key={i} style={[s.shitTalkChip, { borderColor: C.red }]} onPress={() => sendShitTalk(msg)}>
                    <Text style={[s.sub, { color: C.text }]}>{msg}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShitTalkModal(false)}>
                <Text style={[s.sub, { color: C.muted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Props Modal */}
        {partnerId && (
          <PropsModal
            visible={propsModal}
            onClose={() => setPropsModal(false)}
            fromUser={user.id}
            toUser={partnerId}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── COMPLETE ───────────────────────────────────────────────────────────────
  const iWon = myScore.total >= partnerScore.total;
  const tied = myScore.total === partnerScore.total;
  const myPRs = completedSets.filter(s => s.isPR);

  return (
    <SafeAreaView style={[s.bg, { flex: 1 }]}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 64, textAlign: 'center', marginBottom: 12 }}>
          {tied ? '🤝' : iWon ? '👑' : '💀'}
        </Text>
        <Text style={[s.bigTitle, { color: C.accent, textAlign: 'center', marginBottom: 4 }]}>
          {tied ? 'TIED' : iWon ? 'YOU WIN' : `${partnerUsername.toUpperCase()} WINS`}
        </Text>
        <Text style={[s.sub, { color: C.muted, textAlign: 'center', marginBottom: 32 }]}>JOINT OPS COMPLETE</Text>

        {/* Final scores */}
        <View style={[s.scoreRow, { backgroundColor: C.card, borderColor: C.border, marginBottom: 20 }]}>
          <View style={s.scoreCol}>
            <Text style={[s.scoreName, { color: iWon && !tied ? C.accent : C.muted }]}>{myName.toUpperCase()}</Text>
            <Text style={[s.scoreNum, { color: iWon && !tied ? C.accent : C.text, fontSize: 48 }]}>{myScore.total}</Text>
            <Text style={[s.scoreSub, { color: C.muted }]}>{myScore.prs} PRs · {myScore.sessions} sess</Text>
          </View>
          <Text style={[s.scoreVS, { color: C.muted }]}>VS</Text>
          <View style={[s.scoreCol, { alignItems: 'flex-end' }]}>
            <Text style={[s.scoreName, { color: !iWon && !tied ? '#e8748a' : C.muted }]}>{partnerUsername.toUpperCase()}</Text>
            <Text style={[s.scoreNum, { color: !iWon && !tied ? '#e8748a' : C.text, fontSize: 48 }]}>{partnerScore.total}</Text>
            <Text style={[s.scoreSub, { color: C.muted }]}>{partnerScore.prs} PRs · {partnerScore.sessions} sess</Text>
          </View>
        </View>

        {/* My PRs */}
        {myPRs.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[s.inputLabel, { color: C.muted, marginBottom: 8 }]}>YOUR PRs</Text>
            {myPRs.map((pr, i) => (
              <View key={i} style={[s.exCard, { backgroundColor: C.card, borderColor: C.accentDim }]}>
                <Text style={[s.sub, { color: C.accent }]}>🏆 {pr.exerciseName} — {pr.weight}kg × {pr.reps}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={{ gap: 10 }}>
          {partnerId && (
            <>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: C.accent }]}
                onPress={() => setPropsModal(true)}
              >
                <Text style={[s.primaryBtnText, { color: C.bg }]}>Send Props 💪</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: C.dark, borderWidth: 1, borderColor: C.red }]}
                onPress={() => setShitTalkModal(true)}
              >
                <Text style={[s.primaryBtnText, { color: C.red }]}>One more shit talk 💀</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: C.dark, borderWidth: 1, borderColor: C.border }]}
            onPress={onBack}
          >
            <Text style={[s.primaryBtnText, { color: C.muted }]}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {partnerId && (
        <PropsModal
          visible={propsModal}
          onClose={() => setPropsModal(false)}
          fromUser={user.id}
          toUser={partnerId}
        />
      )}
      <Modal visible={shitTalkModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: C.dark }]}>
            <Text style={[s.bigTitle, { color: C.red, fontSize: 20, marginBottom: 16 }]}>💀 FINAL WORDS</Text>
            <ScrollView>
              {shitTalkLib.map((msg, i) => (
                <TouchableOpacity key={i} style={[s.shitTalkChip, { borderColor: C.red }]} onPress={() => sendShitTalk(msg)}>
                  <Text style={[s.sub, { color: C.text }]}>{msg}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShitTalkModal(false)}>
              <Text style={[s.sub, { color: C.muted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(C: { bg: string; dark: string; card: string; border: string; accent: string; accentDim: string; accentBg: string; text: string; muted: string; green: string; red: string; mode: 'dark' | 'light' }) {
  return StyleSheet.create({
    bg:              { flex: 1, backgroundColor: C.bg },
    center:          { alignItems: 'center', justifyContent: 'center' },
    header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    backText:        { fontSize: 12, color: C.muted, letterSpacing: 1 },
    bigTitle:        { fontSize: 42, color: C.text, fontWeight: '900', letterSpacing: 2 },
    sub:             { fontSize: 13, color: C.muted },
    inputLabel:      { fontSize: 9, letterSpacing: 2, marginBottom: 4, color: C.muted },
    input:           { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' },
    exName:          { fontSize: 22, fontWeight: '700', letterSpacing: 0.5 },
    exCard:          { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
    nextPreview:     { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
    primaryBtn:      { borderRadius: 14, padding: 20, alignItems: 'center' },
    primaryBtnText:  { fontSize: 18, fontWeight: '700', letterSpacing: 2 },
    actionBtn:       { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center' },
    actionBtnText:   { fontSize: 14, fontWeight: '700', letterSpacing: 2 },
    scoreRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 16, marginHorizontal: 0, marginBottom: 12 },
    scoreCol:        { flex: 1 },
    scoreName:       { fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 4 },
    scoreNum:        { fontSize: 36, fontWeight: '900', letterSpacing: 1, lineHeight: 40 },
    scoreSub:        { fontSize: 10, marginTop: 4 },
    scoreVS:         { fontSize: 14, fontWeight: '700', letterSpacing: 2, marginHorizontal: 12 },
    restBox:         { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 12 },
    restTime:        { fontSize: 64, fontWeight: '700', letterSpacing: 2, lineHeight: 68 },
    shitTalkToast:   { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 12, alignItems: 'center' },
    shitTalkToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalSheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48, maxHeight: '70%' },
    shitTalkChip:    { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  });
}
