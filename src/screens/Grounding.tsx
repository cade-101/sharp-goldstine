import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Animated, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import {
  Wind, Eye, Hand, Ear, Smile, Zap, Brain, ChevronLeft,
  Activity, Target, AlertTriangle, Headphones,
} from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/logEvent';
import { incrementThemeMetric } from '../lib/themeUnlocks';
import { awardOpsPoints } from '../lib/opsPoints';

type SessionType = 'box_breathing' | '54321' | 'body_scan' | 'rage_drain' | 'intel_dump' | 'guided_breathing' | 'guided_body_scan';
type Screen = 'home' | 'active' | 'complete';

const SESSION_TYPES: {
  id: SessionType;
  label: string;
  subtitle: string;
  Icon: React.ComponentType<any>;
  durationMin: number;
}[] = [
  { id: 'box_breathing', label: 'BOX BREATHING', subtitle: '4-4-4-4 reset', Icon: Wind, durationMin: 4 },
  { id: '54321',         label: '5-4-3-2-1',     subtitle: 'Sensory anchor', Icon: Eye,  durationMin: 3 },
  { id: 'body_scan',     label: 'BODY SCAN',      subtitle: 'Head to feet',  Icon: Activity, durationMin: 5 },
  { id: 'rage_drain',    label: 'RAGE DRAIN',     subtitle: 'Physical reset', Icon: Zap, durationMin: 2 },
  { id: 'intel_dump',        label: 'INTEL DUMP',          subtitle: 'Brain drain',         Icon: Brain,       durationMin: 5  },
  { id: 'guided_breathing',  label: 'GUIDED BREATHING',    subtitle: '5-min narrated reset', Icon: Headphones,  durationMin: 5  },
  { id: 'guided_body_scan',  label: 'GUIDED BODY SCAN',    subtitle: '10-min head to feet',  Icon: Headphones,  durationMin: 10 },
];

const BRAIN_STATE_OPTIONS = [
  { id: 'better',   label: 'BETTER',    color: '#4ade80' },
  { id: 'same',     label: 'SAME',      color: '#c9a84c' },
  { id: 'worse',    label: 'WORSE',     color: '#ef4444' },
];

// ── BOX BREATHING ─────────────────────────────────────────────────────────────
function BoxBreathing({ T }: { T: any }) {
  const [phase, setPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [countdown, setCountdown] = useState(4);
  const scale = useRef(new Animated.Value(0.5)).current;

  const PHASES: Array<{ key: typeof phase; label: string; color: string; targetScale: number }> = [
    { key: 'inhale', label: 'INHALE', color: T.accent, targetScale: 1.0 },
    { key: 'hold1',  label: 'HOLD',   color: T.gold ?? '#c9a84c', targetScale: 1.0 },
    { key: 'exhale', label: 'EXHALE', color: T.blue ?? '#60a5fa', targetScale: 0.5 },
    { key: 'hold2',  label: 'HOLD',   color: T.muted, targetScale: 0.5 },
  ];

  useEffect(() => {
    const phaseIdx = PHASES.findIndex(p => p.key === phase);
    const phaseObj = PHASES[phaseIdx];

    Animated.timing(scale, {
      toValue: phaseObj.targetScale,
      duration: phase === 'inhale' || phase === 'exhale' ? 3800 : 200,
      useNativeDriver: true,
    }).start();

    let secs = 4;
    setCountdown(secs);
    const iv = setInterval(() => {
      secs--;
      if (secs <= 0) {
        clearInterval(iv);
        const next = PHASES[(phaseIdx + 1) % PHASES.length].key;
        setPhase(next);
      } else {
        setCountdown(secs);
      }
    }, 1000);

    return () => clearInterval(iv);
  }, [phase]);

  const phaseObj = PHASES.find(p => p.key === phase)!;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <Animated.View style={{
        width: 180,
        height: 180,
        borderWidth: 3,
        borderColor: phaseObj.color,
        borderRadius: 18,
        transform: [{ scale }],
        shadowColor: phaseObj.color,
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 8,
      }} />
      <Text style={{ color: phaseObj.color, fontSize: 28, fontWeight: '800', letterSpacing: 4, marginTop: 40 }}>
        {phaseObj.label}
      </Text>
      <Text style={{ color: T.muted, fontSize: 48, fontWeight: '200', marginTop: 8 }}>
        {countdown}
      </Text>
      <Text style={{ color: T.muted, fontSize: 11, letterSpacing: 3, marginTop: 16 }}>
        BOX BREATHING — 4·4·4·4
      </Text>
    </View>
  );
}

// ── 5-4-3-2-1 GROUNDING ───────────────────────────────────────────────────────
const SENSE_STEPS = [
  { count: 5, sense: 'SEE', prompt: 'Name 5 things you can see right now', Icon: Eye },
  { count: 4, sense: 'TOUCH', prompt: 'Name 4 things you can feel or touch', Icon: Hand },
  { count: 3, sense: 'HEAR', prompt: 'Name 3 sounds you can hear', Icon: Ear },
  { count: 2, sense: 'SMELL', prompt: 'Name 2 things you can smell', Icon: Wind },
  { count: 1, sense: 'TASTE', prompt: 'Name 1 thing you can taste', Icon: Smile },
];

function Sensing({ T }: { T: any }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [inputs, setInputs] = useState<string[]>([]);

  const step = SENSE_STEPS[stepIdx];
  const done = stepIdx >= SENSE_STEPS.length;

  function advance() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIdx < SENSE_STEPS.length - 1) {
      setStepIdx(s => s + 1);
      setInputs([]);
    } else {
      setStepIdx(SENSE_STEPS.length); // mark done
    }
  }

  if (done) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 48 }}>✓</Text>
        <Text style={{ color: T.accent, fontSize: 22, fontWeight: '800', letterSpacing: 3, marginTop: 16 }}>
          ANCHORED
        </Text>
        <Text style={{ color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
          You've completed the 5-4-3-2-1 grounding sequence. Your nervous system is returning to baseline.
        </Text>
      </View>
    );
  }

  const { Icon } = step;

  return (
    <View style={{ flex: 1, paddingHorizontal: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
        <Icon size={32} color={T.accent} />
        <View style={{ marginLeft: 14 }}>
          <Text style={{ color: T.accent, fontSize: 28, fontWeight: '800' }}>{step.count}</Text>
          <Text style={{ color: T.muted, fontSize: 11, letterSpacing: 3 }}>THINGS TO {step.sense}</Text>
        </View>
      </View>
      <Text style={{ color: T.text, fontSize: 15, lineHeight: 22, marginBottom: 24 }}>
        {step.prompt}
      </Text>
      {Array.from({ length: step.count }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: T.muted, fontSize: 13, width: 20 }}>{i + 1}.</Text>
          <TextInput
            style={{
              flex: 1,
              borderBottomWidth: 1,
              borderBottomColor: inputs[i] ? T.accent : T.border,
              color: T.text,
              fontSize: 15,
              paddingVertical: 6,
              paddingHorizontal: 4,
            }}
            placeholderTextColor={T.muted}
            placeholder="..."
            value={inputs[i] ?? ''}
            onChangeText={val => {
              const next = [...inputs];
              next[i] = val;
              setInputs(next);
            }}
          />
        </View>
      ))}
      <TouchableOpacity
        onPress={advance}
        style={{
          marginTop: 24,
          backgroundColor: T.accent + '20',
          borderWidth: 1,
          borderColor: T.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: T.accent, fontWeight: '700', letterSpacing: 2 }}>
          {stepIdx < SENSE_STEPS.length - 1 ? 'NEXT →' : 'COMPLETE ✓'}
        </Text>
      </TouchableOpacity>
      <Text style={{ color: T.muted, fontSize: 10, textAlign: 'center', letterSpacing: 2, marginTop: 12 }}>
        STEP {stepIdx + 1} / {SENSE_STEPS.length}
      </Text>
    </View>
  );
}

// ── BODY SCAN ─────────────────────────────────────────────────────────────────
const SCAN_STEPS = [
  { zone: 'HEAD & FACE', prompt: 'Soften your jaw. Unclench your teeth. Let your forehead relax.' },
  { zone: 'NECK & SHOULDERS', prompt: 'Roll your shoulders back. Release any tension you\'re carrying here.' },
  { zone: 'CHEST & BREATHING', prompt: 'Take one slow breath in. Feel your chest rise. Let it fall completely.' },
  { zone: 'ARMS & HANDS', prompt: 'Shake out your hands gently. Open your palms. Let go of the grip.' },
  { zone: 'CORE & STOMACH', prompt: 'Notice any tightness in your stomach. Breathe into it. Soften.' },
  { zone: 'LEGS & HIPS', prompt: 'Feel your legs. Unclench your glutes. Let your hips settle heavy.' },
  { zone: 'FEET & GROUND', prompt: 'Feel the floor beneath your feet. You are here. You are safe.' },
];

function BodyScan({ T }: { T: any }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [autoProgress, setAutoProgress] = useState(true);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!autoProgress) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 15000,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished && stepIdx < SCAN_STEPS.length - 1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStepIdx(s => s + 1);
      }
    });
    return () => anim.stop();
  }, [stepIdx, autoProgress]);

  const done = stepIdx >= SCAN_STEPS.length;

  if (done) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 48 }}>🌊</Text>
        <Text style={{ color: T.accent, fontSize: 22, fontWeight: '800', letterSpacing: 3, marginTop: 16 }}>
          SCAN COMPLETE
        </Text>
        <Text style={{ color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
          Full body released. Sit in the quiet for a moment before moving on.
        </Text>
      </View>
    );
  }

  const step = SCAN_STEPS[stepIdx];
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ flex: 1, paddingHorizontal: 4 }}>
      <Text style={{ color: T.muted, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
        ZONE {stepIdx + 1} / {SCAN_STEPS.length}
      </Text>
      <Text style={{ color: T.accent, fontSize: 20, fontWeight: '800', letterSpacing: 2, marginBottom: 16 }}>
        {step.zone}
      </Text>
      <Text style={{ color: T.text, fontSize: 16, lineHeight: 26, flex: 1 }}>
        {step.prompt}
      </Text>
      <View style={{ marginBottom: 20 }}>
        <View style={{ height: 3, backgroundColor: T.border, borderRadius: 2, overflow: 'hidden' }}>
          <Animated.View style={{ height: 3, width: barWidth, backgroundColor: T.accent, borderRadius: 2 }} />
        </View>
        <Text style={{ color: T.muted, fontSize: 10, letterSpacing: 2, marginTop: 6 }}>
          AUTO-ADVANCING IN 15s
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          setAutoProgress(false);
          if (stepIdx < SCAN_STEPS.length - 1) {
            setStepIdx(s => s + 1);
            setAutoProgress(true);
          } else {
            setStepIdx(SCAN_STEPS.length);
          }
        }}
        style={{
          borderWidth: 1,
          borderColor: T.border,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: T.muted, fontSize: 12, letterSpacing: 2 }}>NEXT ZONE →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── RAGE DRAIN ────────────────────────────────────────────────────────────────
const RAGE_STEPS = [
  { prompt: 'CLENCH YOUR FISTS as tight as you can for 5 seconds.', seconds: 5, haptic: 'heavy' },
  { prompt: 'RELEASE fully. Feel the tension drain from your hands.', seconds: 5, haptic: 'light' },
  { prompt: 'STOMP YOUR FEET 10 times. Hard. Right now.', seconds: 6, haptic: 'medium' },
  { prompt: 'SHAKE YOUR HANDS out fast for 5 seconds. Let it out.', seconds: 5, haptic: 'light' },
  { prompt: 'ONE LONG EXHALE through your mouth. Push it all out.', seconds: 6, haptic: 'light' },
];

function RageDrain({ T }: { T: any }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [countdown, setCountdown] = useState(RAGE_STEPS[0].seconds);
  const [running, setRunning] = useState(false);

  function startStep() {
    setRunning(true);
    const step = RAGE_STEPS[stepIdx];
    if (step.haptic === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (step.haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let secs = step.seconds;
    const iv = setInterval(() => {
      secs--;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(iv);
        setRunning(false);
        if (stepIdx < RAGE_STEPS.length - 1) {
          const next = stepIdx + 1;
          setStepIdx(next);
          setCountdown(RAGE_STEPS[next].seconds);
        } else {
          setStepIdx(RAGE_STEPS.length);
        }
      }
    }, 1000);
  }

  const done = stepIdx >= RAGE_STEPS.length;

  if (done) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 48 }}>💥</Text>
        <Text style={{ color: T.accent, fontSize: 22, fontWeight: '800', letterSpacing: 3, marginTop: 16 }}>
          DRAINED
        </Text>
        <Text style={{ color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
          The surge is gone. Your nervous system downregulated. Good work.
        </Text>
      </View>
    );
  }

  const step = RAGE_STEPS[stepIdx];

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
      <Text style={{ color: T.muted, fontSize: 10, letterSpacing: 3, marginBottom: 16 }}>
        STEP {stepIdx + 1} / {RAGE_STEPS.length}
      </Text>
      <Text style={{ color: T.text, fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 28, marginBottom: 40 }}>
        {step.prompt}
      </Text>
      {running ? (
        <Text style={{ color: T.accent, fontSize: 72, fontWeight: '200' }}>
          {countdown}
        </Text>
      ) : (
        <TouchableOpacity
          onPress={startStep}
          style={{
            backgroundColor: T.accent,
            borderRadius: 16,
            paddingVertical: 18,
            paddingHorizontal: 40,
          }}
        >
          <Text style={{ color: '#000', fontWeight: '800', fontSize: 16, letterSpacing: 2 }}>
            {stepIdx === 0 ? 'BEGIN' : 'NEXT'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── INTEL DUMP ────────────────────────────────────────────────────────────────
function IntelDump({ T }: { T: any }) {
  const [text, setText] = useState('');
  const [dumped, setDumped] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  if (dumped) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 48 }}>🗑️</Text>
        <Text style={{ color: T.accent, fontSize: 22, fontWeight: '800', letterSpacing: 3, marginTop: 16 }}>
          DUMPED
        </Text>
        <Text style={{ color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
          It's out of your head. The weight you were carrying is now on paper, not on you.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: T.muted, fontSize: 11, letterSpacing: 2 }}>DUMP EVERYTHING</Text>
          <Text style={{ color: T.muted, fontSize: 11 }}>
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </Text>
        </View>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: T.card,
            borderRadius: 12,
            padding: 16,
            color: T.text,
            fontSize: 15,
            lineHeight: 24,
            borderWidth: 1,
            borderColor: T.border,
            textAlignVertical: 'top',
          }}
          multiline
          placeholder="Write everything that's in your head. Don't edit, don't filter. Just drain it..."
          placeholderTextColor={T.muted}
          value={text}
          onChangeText={setText}
          autoFocus
        />
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setDumped(true);
          }}
          style={{
            backgroundColor: T.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 14,
          }}
        >
          <Text style={{ color: '#000', fontWeight: '800', fontSize: 15, letterSpacing: 2 }}>DRAIN IT</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── GUIDED MEDITATION ─────────────────────────────────────────────────────────

interface ScriptLine { text: string; pauseAfter: number }

const BOX_BREATHING_SCRIPT: ScriptLine[] = [
  { text: 'Close your eyes. Settle in. Breathe out completely.', pauseAfter: 4000 },
  { text: 'Inhale slowly through your nose for four counts.', pauseAfter: 5000 },
  { text: 'Hold. Keep it steady. Four counts.', pauseAfter: 5000 },
  { text: 'Exhale fully through your mouth. Four counts.', pauseAfter: 5000 },
  { text: 'Hold empty. Four counts.', pauseAfter: 5000 },
  { text: 'Inhale again. Slow and steady.', pauseAfter: 5000 },
  { text: 'Hold. You are safe.', pauseAfter: 5000 },
  { text: 'Exhale. Let it go completely.', pauseAfter: 5000 },
  { text: 'Hold. Still. Quiet.', pauseAfter: 5000 },
  { text: 'One more round. Inhale.', pauseAfter: 5000 },
  { text: 'Hold.', pauseAfter: 5000 },
  { text: 'Exhale.', pauseAfter: 5000 },
  { text: 'Hold. And release.', pauseAfter: 4000 },
  { text: 'Good. Breathe normally. You reset.', pauseAfter: 3000 },
];

const BODY_SCAN_SCRIPT: ScriptLine[] = [
  { text: 'Close your eyes. Feel the full weight of your body.', pauseAfter: 4000 },
  { text: 'Start at the top of your head. Notice any tightness. Let it go.', pauseAfter: 6000 },
  { text: 'Move down to your forehead and jaw. Unclench. Soften.', pauseAfter: 6000 },
  { text: 'Your neck and shoulders. Drop them away from your ears.', pauseAfter: 6000 },
  { text: 'Your chest. Notice it rise and fall. You are breathing.', pauseAfter: 6000 },
  { text: 'Your arms. Heavy. Warm. At rest.', pauseAfter: 5000 },
  { text: 'Your hands. Open them slightly. Release any grip.', pauseAfter: 5000 },
  { text: 'Your belly. Soft. No holding here.', pauseAfter: 5000 },
  { text: 'Your lower back. Let it press into whatever is beneath you.', pauseAfter: 6000 },
  { text: 'Your hips and thighs. Heavy and still.', pauseAfter: 5000 },
  { text: 'Your knees and calves. No tension required here.', pauseAfter: 5000 },
  { text: 'Your feet. Let them be heavy. Rooted.', pauseAfter: 6000 },
  { text: 'Scan back up. Notice if anything wants attention.', pauseAfter: 6000 },
  { text: 'Breathe into it. Just notice. No fixing needed.', pauseAfter: 6000 },
  { text: 'Take one slow, full breath. And when you are ready, open your eyes.', pauseAfter: 5000 },
  { text: 'You did the work. That was enough.', pauseAfter: 3000 },
];

function GuidedMeditation({ type, T, onComplete }: { type: 'guided_breathing' | 'guided_body_scan'; T: any; onComplete: () => void }) {
  const script = type === 'guided_breathing' ? BOX_BREATHING_SCRIPT : BODY_SCAN_SCRIPT;
  const [lineIdx, setLineIdx] = useState(0);
  const [done, setDone] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(1)).current;

  function speakLine(idx: number) {
    if (idx >= script.length) {
      Speech.stop();
      setDone(true);
      onComplete();
      return;
    }
    const line = script[idx];
    Speech.speak(line.text, {
      language: 'en-US',
      pitch: 0.95,
      rate: 0.85,
      onDone: () => {
        // Fade out then advance
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setLineIdx(idx + 1);
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
          timeoutRef.current = setTimeout(() => speakLine(idx + 1), line.pauseAfter);
        });
      },
    });
  }

  useEffect(() => {
    speakLine(0);
    return () => {
      Speech.stop();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const progress = Math.min(lineIdx / script.length, 1);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 32 }}>
      {/* Progress bar */}
      <View style={{ width: '100%', height: 2, backgroundColor: T.border, borderRadius: 2 }}>
        <View style={{ width: `${Math.round(progress * 100)}%` as any, height: 2, backgroundColor: T.accent, borderRadius: 2 }} />
      </View>

      {done ? (
        <Text style={{ color: T.accent, fontSize: 22, fontWeight: '800', letterSpacing: 3 }}>COMPLETE</Text>
      ) : (
        <Animated.Text style={{ color: T.text, fontSize: 18, lineHeight: 28, textAlign: 'center', opacity, letterSpacing: 0.3 }}>
          {script[lineIdx]?.text ?? ''}
        </Animated.Text>
      )}

      <Text style={{ color: T.muted, fontSize: 11, letterSpacing: 2 }}>
        {lineIdx + 1} / {script.length}
      </Text>

      <TouchableOpacity
        onPress={() => { Speech.stop(); if (timeoutRef.current) clearTimeout(timeoutRef.current); onComplete(); }}
        style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: T.border }}
      >
        <Text style={{ color: T.muted, fontSize: 11, letterSpacing: 2 }}>END SESSION</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Grounding() {
  const { user, themeTokens: T } = useUser();
  const [screen, setScreen] = useState<Screen>('home');
  const [activeType, setActiveType] = useState<SessionType | null>(null);
  const [brainStateAfter, setBrainStateAfter] = useState<string | null>(null);
  const sessionStart = useRef<number>(0);

  function startSession(type: SessionType) {
    sessionStart.current = Date.now();
    setActiveType(type);
    setScreen('active');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function finishSession() {
    const duration = Math.round((Date.now() - sessionStart.current) / 1000);
    setScreen('complete');

    if (user?.id && activeType) {
      try {
        await supabase.from('grounding_sessions').insert({
          user_id: user.id,
          session_type: activeType,
          duration_seconds: duration,
          completed: true,
        });
        await logEvent(user.id, 'grounding_session', { type: activeType, duration });
        incrementThemeMetric(user.id, 'module_days').catch(() => {});
        awardOpsPoints(user.id, 2, 'grounding_complete').catch(() => {});
      } catch {
        // Non-blocking
      }
    }
  }

  async function saveBrainState(state: string) {
    setBrainStateAfter(state);
    if (user?.id && activeType) {
      await supabase
        .from('grounding_sessions')
        .update({ brain_state_after: state })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
    }
  }

  function reset() {
    setScreen('home');
    setActiveType(null);
    setBrainStateAfter(null);
  }

  const activeInfo = SESSION_TYPES.find(s => s.id === activeType);

  // ── HOME ──
  if (screen === 'home') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.homeContainer}>
          <Text style={[styles.headerTitle, { color: T.text }]}>GROUNDING</Text>
          <Text style={[styles.headerSub, { color: T.muted }]}>
            RESET YOUR NERVOUS SYSTEM
          </Text>
          <View style={styles.grid}>
            {SESSION_TYPES.map(st => {
              const { Icon } = st;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[styles.sessionCard, { backgroundColor: T.card, borderColor: T.border + '40' }]}
                  onPress={() => startSession(st.id)}
                  activeOpacity={0.75}
                >
                  <Icon size={28} color={T.accent} style={{ marginBottom: 12 }} />
                  <Text style={[styles.cardLabel, { color: T.text }]}>{st.label}</Text>
                  <Text style={[styles.cardSub, { color: T.muted }]}>{st.subtitle}</Text>
                  <Text style={[styles.cardDuration, { color: T.muted }]}>~{st.durationMin} min</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── ACTIVE SESSION ──
  if (screen === 'active' && activeType) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.sessionHeader}>
          <TouchableOpacity onPress={reset} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 }} activeOpacity={0.7}>
            <ChevronLeft size={16} color={T.accent} />
            <Text style={{ fontSize: 12, color: T.accent, fontWeight: '600', letterSpacing: 1 }}>BACK</Text>
          </TouchableOpacity>
          <Text style={[styles.sessionTitle, { color: T.text }]}>{activeInfo?.label}</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.sessionBody}>
          {activeType === 'box_breathing'     && <BoxBreathing T={T} />}
          {activeType === '54321'              && <Sensing T={T} />}
          {activeType === 'body_scan'          && <BodyScan T={T} />}
          {activeType === 'rage_drain'         && <RageDrain T={T} />}
          {activeType === 'intel_dump'         && <IntelDump T={T} />}
          {(activeType === 'guided_breathing' || activeType === 'guided_body_scan') && (
            <GuidedMeditation type={activeType} T={T} onComplete={finishSession} />
          )}
        </View>
        {activeType !== 'guided_breathing' && activeType !== 'guided_body_scan' && (
          <TouchableOpacity
            onPress={finishSession}
            style={[styles.doneBtn, { backgroundColor: T.accent + '18', borderColor: T.accent }]}
          >
            <Text style={[styles.doneBtnText, { color: T.accent }]}>I'M DONE — LOG SESSION</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // ── COMPLETE ──
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.completeContainer}>
        <Text style={[styles.completeTitle, { color: T.accent }]}>SESSION COMPLETE</Text>
        <Text style={[styles.completeSub, { color: T.muted }]}>
          {activeInfo?.label} — {Math.round((Date.now() - sessionStart.current) / 60000)} min
        </Text>

        {!brainStateAfter ? (
          <>
            <Text style={[styles.checkInLabel, { color: T.text }]}>
              How do you feel now?
            </Text>
            <View style={styles.brainRow}>
              {BRAIN_STATE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.brainBtn, { borderColor: opt.color }]}
                  onPress={() => saveBrainState(opt.id)}
                >
                  <Text style={[styles.brainBtnText, { color: opt.color }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <Text style={[styles.brainSaved, { color: T.green ?? '#4ade80' }]}>
            ✓ LOGGED — {brainStateAfter.toUpperCase()}
          </Text>
        )}

        <TouchableOpacity onPress={reset} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginTop: 16 }} activeOpacity={0.7}>
          <ChevronLeft size={16} color={T.accent} />
          <Text style={{ fontSize: 12, color: T.accent, fontWeight: '600', letterSpacing: 1 }}>BACK</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  homeContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 4 },
  headerSub: { fontSize: 11, letterSpacing: 3, marginTop: 4, marginBottom: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sessionCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  cardSub: { fontSize: 11, marginTop: 3, letterSpacing: 0.5 },
  cardDuration: { fontSize: 10, marginTop: 8, letterSpacing: 1 },

  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 60 },
  backLabel: { fontSize: 11, letterSpacing: 1 },
  sessionTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  sessionBody: { flex: 1, paddingHorizontal: 20, paddingBottom: 8 },
  doneBtn: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: { fontWeight: '700', fontSize: 13, letterSpacing: 2 },

  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  completeTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 4 },
  completeSub: { fontSize: 12, letterSpacing: 2, marginTop: 8, marginBottom: 40 },
  checkInLabel: { fontSize: 16, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  brainRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  brainBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  brainBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  brainSaved: { fontSize: 16, fontWeight: '800', letterSpacing: 2, marginBottom: 32 },
  backToHome: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backToHomeText: { fontSize: 11, letterSpacing: 2 },
});
