import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView
} from 'react-native';

const BRAIN_STATES = [
  { id: 'locked', label: '🔒 Locked in', color: '#22c55e' },
  { id: 'okay', label: '😐 Okay', color: '#eab308' },
  { id: 'scattered', label: '🌀 Scattered', color: '#f97316' },
  { id: 'toast', label: '💀 Toast', color: '#ef4444' },
];

const FOCUS_DURATION = 52 * 60;
const BREAK_DURATION = 17 * 60;

export default function WorkdayRhythm() {
  const [brainState, setBrainState] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'focus' | 'break'>('idle');
  const [seconds, setSeconds] = useState(FOCUS_DURATION);
  const [blocks, setBlocks] = useState(0);

  useEffect(() => {
    if (mode === 'idle') return;
    const interval = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          if (mode === 'focus') {
            setBlocks(b => b + 1);
            setMode('break');
            return BREAK_DURATION;
          } else {
            setMode('focus');
            return FOCUS_DURATION;
          }
        }
        return s - 1;
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
      date: new Date().toISOString().split('T')[0]
    });
  }
  setMode('focus');
  setSeconds(FOCUS_DURATION);
};

  const reset = async () => {
  if (blocks > 0) {
    await supabase
      .from('workday_sessions')
      .update({ blocks_completed: blocks })
      .eq('date', new Date().toISOString().split('T')[0]);
  }
  setMode('idle');
  setSeconds(FOCUS_DURATION);
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Workday Rhythm</Text>

        {/* Brain State */}
        <Text style={styles.sectionLabel}>How are you arriving?</Text>
        <View style={styles.brainRow}>
          {BRAIN_STATES.map(state => (
            <TouchableOpacity
              key={state.id}
              style={[styles.brainBtn, brainState === state.id && { backgroundColor: state.color }]}
              onPress={() => setBrainState(state.id)}
            >
              <Text style={styles.brainText}>{state.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timer */}
        <View style={styles.timerBox}>
          <Text style={styles.modeLabel}>
            {mode === 'idle' ? 'Ready' : mode === 'focus' ? '🎯 Focus Block' : '☕ Break'}
          </Text>
          <Text style={styles.timer}>{formatTime(seconds)}</Text>
          <Text style={styles.blocksText}>{blocks} blocks completed today</Text>
        </View>

        {/* Controls */}
        <View style={styles.btnRow}>
          {mode === 'idle' ? (
            <TouchableOpacity style={styles.startBtn} onPress={startFocus}>
              <Text style={styles.startBtnText}>Start Focus Block</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: { padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#ffffff', marginBottom: 32 },
  sectionLabel: { fontSize: 16, color: '#888', marginBottom: 12 },
  brainRow: { gap: 10, marginBottom: 32 },
  brainBtn: {
    padding: 14, borderRadius: 12,
    backgroundColor: '#1e1e1e', alignItems: 'center'
  },
  brainText: { color: '#fff', fontSize: 15 },
  timerBox: {
    backgroundColor: '#1e1e1e', borderRadius: 20,
    padding: 32, alignItems: 'center', marginBottom: 32
  },
  modeLabel: { fontSize: 18, color: '#888', marginBottom: 8 },
  timer: { fontSize: 72, fontWeight: '700', color: '#ffffff', letterSpacing: -2 },
  blocksText: { fontSize: 14, color: '#555', marginTop: 12 },
  btnRow: { alignItems: 'center' },
  startBtn: {
    backgroundColor: '#22c55e', paddingVertical: 16,
    paddingHorizontal: 48, borderRadius: 16
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  resetBtn: {
    backgroundColor: '#333', paddingVertical: 16,
    paddingHorizontal: 48, borderRadius: 16
  },
  resetBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});