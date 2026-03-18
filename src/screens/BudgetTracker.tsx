import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Modal, ActivityIndicator, Alert
} from 'react-native';
import { supabase } from '../lib/supabase';
import { ANTHROPIC_API_KEY } from '../lib/config';

const C = {
  black: '#0a0a0a',
  dark: '#111111',
  card: '#181818',
  border: '#2a2a2a',
  gold: '#c9a84c',
  goldDim: '#7a6230',
  green: '#3ce08a',
  greenDim: '#1a5a3a',
  red: '#e03c3c',
  redDim: '#5a1a1a',
  white: '#f0ece4',
  muted: '#666666',
  blue: '#4a9eff',
};

// Bi-weekly pay: every 2nd Friday
function getNextPayday(): Date {
  const base = new Date('2026-03-13'); // known payday — adjust as needed
  const today = new Date();
  const msPerDay = 86400000;
  const daysSinceBase = Math.floor((today.getTime() - base.getTime()) / msPerDay);
  const cycleDay = ((daysSinceBase % 14) + 14) % 14;
  const daysUntilNext = cycleDay === 0 ? 14 : 14 - cycleDay;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntilNext);
  return next;
}

function daysUntilPayday(): number {
  const next = getNextPayday();
  const today = new Date();
  return Math.ceil((next.getTime() - today.getTime()) / 86400000);
}

const DEFAULT_ENVELOPES = [
  { id: 'groceries', name: 'Groceries 🛒', budget: 400, color: C.green },
  { id: 'fuel', name: 'Fuel ⛽', budget: 200, color: C.gold },
  { id: 'vehicle', name: 'Vehicle 🚗', budget: 100, color: C.blue },
  { id: 'entertainment', name: 'Entertainment 🎮', budget: 150, color: '#a78bfa' },
  { id: 'emergency', name: 'Emergency 🚨', budget: 200, color: C.red },
  { id: 'overflow', name: 'Overflow 💰', budget: 100, color: C.muted },
  { id: 'spectre', name: 'Spectre 💼', budget: 500, color: '#38bdf8' },
];

export default function BudgetTracker() {
  const [envelopes, setEnvelopes] = useState(DEFAULT_ENVELOPES);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [screen, setScreen] = useState<'home' | 'log' | 'afford' | 'history'>('home');

  // Log expense
  const [logEnvelope, setLogEnvelope] = useState('');
  const [logAmount, setLogAmount] = useState('');
  const [logNote, setLogNote] = useState('');

  // Can I afford this
  const [affordAmount, setAffordAmount] = useState('');
  const [affordItem, setAffordItem] = useState('');
  const [affordEnvelope, setAffordEnvelope] = useState('');
  const [affordResult, setAffordResult] = useState<any>(null);
  const [affordLoading, setAffordLoading] = useState(false);

  const daysLeft = daysUntilPayday();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const startOfPeriod = new Date();
    startOfPeriod.setDate(startOfPeriod.getDate() - (14 - daysLeft));

    const { data } = await supabase
      .from('budget_expenses')
      .select('*')
      .gte('created_at', startOfPeriod.toISOString())
      .order('created_at', { ascending: false });

    if (data) setExpenses(data);
  }

  function getSpent(envelopeId: string) {
    return expenses
      .filter(e => e.envelope_id === envelopeId)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
  }

  function getRemaining(envelopeId: string) {
    const env = envelopes.find(e => e.id === envelopeId);
    if (!env) return 0;
    return env.budget - getSpent(envelopeId);
  }

  function getTotalRemaining() {
    return envelopes.reduce((sum, e) => sum + getRemaining(e.id), 0);
  }

  async function logExpense() {
    if (!logEnvelope || !logAmount) return;
    const expense = {
      envelope_id: logEnvelope,
      amount: parseFloat(logAmount),
      note: logNote,
      date: new Date().toISOString().split('T')[0],
    };
    await supabase.from('budget_expenses').insert(expense);
    setExpenses(prev => [{ ...expense, created_at: new Date().toISOString() }, ...prev]);
    setLogAmount('');
    setLogNote('');
    setLogEnvelope('');
    setScreen('home');
  }

  async function canIAffordThis() {
    if (!affordAmount || !affordEnvelope) return;
    setAffordLoading(true);
    setAffordResult(null);

    const amount = parseFloat(affordAmount);
    const remaining = getRemaining(affordEnvelope);
    const env = envelopes.find(e => e.id === affordEnvelope);

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
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `You are a brutally honest ADHD-friendly budget advisor. No lectures, no fluff. Answer in 3 parts:
1. YES or NO (big and clear)
2. One sentence consequence if yes
3. One sentence alternative if no

Budget context:
- Item: ${affordItem || 'this purchase'}
- Amount: $${amount}
- Envelope: ${env?.name}
- Envelope remaining: $${remaining.toFixed(2)}
- Days until payday: ${daysLeft}
- Total budget remaining across all envelopes: $${getTotalRemaining().toFixed(2)}

Be direct. No sugar coating. ADHD brain needs clarity not paragraphs.`
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || 'Could not get a response.';
      const isYes = text.trim().toUpperCase().startsWith('YES');
      setAffordResult({ text, isYes });
    } catch (e) {
      setAffordResult({ text: 'Could not connect. Check your internet.', isYes: false });
    }

    setAffordLoading(false);
  }

  // ── HOME ──────────────────────────────────────────────
  if (screen === 'home') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Payday countdown */}
        <View style={s.paydayBanner}>
          <View>
            <Text style={s.paydayLabel}>PAYDAY IN</Text>
            <Text style={s.paydayDays}>{daysLeft} days</Text>
          </View>
          <View style={s.paydayRight}>
            <Text style={s.paydayLabel}>TOTAL LEFT</Text>
            <Text style={[s.paydayDays, { color: getTotalRemaining() < 100 ? C.red : C.green }]}>
              ${getTotalRemaining().toFixed(0)}
            </Text>
          </View>
        </View>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerLabel}>THIS PAY PERIOD</Text>
          <Text style={s.headerTitle}>BUDGET</Text>
        </View>

        {/* Envelopes */}
        {envelopes.map(env => {
          const spent = getSpent(env.id);
          const remaining = getRemaining(env.id);
          const pct = Math.min(spent / env.budget, 1);
          const over = remaining < 0;
          return (
            <View key={env.id} style={s.envelopeCard}>
              <View style={s.envTop}>
                <Text style={s.envName}>{env.name}</Text>
                <Text style={[s.envRemaining, over && { color: C.red }]}>
                  {over ? `-$${Math.abs(remaining).toFixed(0)} over` : `$${remaining.toFixed(0)} left`}
                </Text>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct * 100}%`, backgroundColor: over ? C.red : env.color }]} />
              </View>
              <View style={s.envBottom}>
                <Text style={s.envSpent}>spent ${spent.toFixed(0)}</Text>
                <Text style={s.envBudget}>of ${env.budget}</Text>
              </View>
            </View>
          );
        })}

        {/* Action buttons */}
        <TouchableOpacity style={s.affordBtn} onPress={() => { setAffordResult(null); setScreen('afford'); }}>
          <Text style={s.affordBtnText}>💸 Can I afford this?</Text>
        </TouchableOpacity>

        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => setScreen('log')}>
            <Text style={s.actionBtnText}>+ Log expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => setScreen('history')}>
            <Text style={s.actionBtnText}>📋 History</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );

  // ── CAN I AFFORD THIS ─────────────────────────────────
  if (screen === 'afford') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.formContainer}>
        <TouchableOpacity onPress={() => setScreen('home')}><Text style={s.back}>← BACK</Text></TouchableOpacity>
        <Text style={s.formTitle}>Can I afford this?</Text>

        <Text style={s.formLabel}>WHAT IS IT</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. new headphones, dinner out..."
          placeholderTextColor={C.muted}
          value={affordItem}
          onChangeText={setAffordItem}
        />

        <Text style={s.formLabel}>HOW MUCH</Text>
        <TextInput
          style={s.input}
          placeholder="$0.00"
          placeholderTextColor={C.muted}
          keyboardType="decimal-pad"
          value={affordAmount}
          onChangeText={setAffordAmount}
        />

        <Text style={s.formLabel}>WHICH ENVELOPE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <View style={s.chipRow}>
            {envelopes.map(env => (
              <TouchableOpacity
                key={env.id}
                style={[s.chip, affordEnvelope === env.id && { borderColor: env.color, backgroundColor: env.color + '22' }]}
                onPress={() => setAffordEnvelope(env.id)}
              >
                <Text style={[s.chipText, affordEnvelope === env.id && { color: env.color }]}>{env.name}</Text>
                <Text style={s.chipSub}>${getRemaining(env.id).toFixed(0)} left</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[s.askBtn, (!affordAmount || !affordEnvelope) && s.askBtnDim]}
          onPress={canIAffordThis}
          disabled={affordLoading || !affordAmount || !affordEnvelope}
        >
          {affordLoading
            ? <ActivityIndicator color={C.black} />
            : <Text style={s.askBtnText}>ASK</Text>
          }
        </TouchableOpacity>

        {affordResult && (
          <View style={[s.resultCard, { borderColor: affordResult.isYes ? C.green : C.red }]}>
            <Text style={[s.resultAnswer, { color: affordResult.isYes ? C.green : C.red }]}>
              {affordResult.isYes ? '✅ YES' : '❌ NO'}
            </Text>
            <Text style={s.resultText}>{affordResult.text}</Text>
            {affordResult.isYes && (
              <TouchableOpacity
                style={s.logItBtn}
                onPress={() => {
                  setLogAmount(affordAmount);
                  setLogNote(affordItem);
                  setLogEnvelope(affordEnvelope);
                  setScreen('log');
                }}
              >
                <Text style={s.logItBtnText}>Log it →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  // ── LOG EXPENSE ───────────────────────────────────────
  if (screen === 'log') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.formContainer}>
        <TouchableOpacity onPress={() => setScreen('home')}><Text style={s.back}>← BACK</Text></TouchableOpacity>
        <Text style={s.formTitle}>Log Expense</Text>

        <Text style={s.formLabel}>AMOUNT</Text>
        <TextInput
          style={s.input}
          placeholder="$0.00"
          placeholderTextColor={C.muted}
          keyboardType="decimal-pad"
          value={logAmount}
          onChangeText={setLogAmount}
        />

        <Text style={s.formLabel}>NOTE (optional)</Text>
        <TextInput
          style={s.input}
          placeholder="what was it?"
          placeholderTextColor={C.muted}
          value={logNote}
          onChangeText={setLogNote}
        />

        <Text style={s.formLabel}>ENVELOPE</Text>
        <View style={s.chipGrid}>
          {envelopes.map(env => (
            <TouchableOpacity
              key={env.id}
              style={[s.chip, logEnvelope === env.id && { borderColor: env.color, backgroundColor: env.color + '22' }]}
              onPress={() => setLogEnvelope(env.id)}
            >
              <Text style={[s.chipText, logEnvelope === env.id && { color: env.color }]}>{env.name}</Text>
              <Text style={s.chipSub}>${getRemaining(env.id).toFixed(0)} left</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.askBtn, (!logAmount || !logEnvelope) && s.askBtnDim]}
          onPress={logExpense}
          disabled={!logAmount || !logEnvelope}
        >
          <Text style={s.askBtnText}>LOG IT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── HISTORY ───────────────────────────────────────────
  return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <View style={s.histHeader}>
        <Text style={s.histTitle}>HISTORY</Text>
        <TouchableOpacity onPress={() => setScreen('home')}><Text style={s.back}>← BACK</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {expenses.length === 0 ? (
          <Text style={s.empty}>No expenses logged yet.</Text>
        ) : expenses.map((e, i) => {
          const env = envelopes.find(env => env.id === e.envelope_id);
          return (
            <View key={i} style={s.histCard}>
              <View style={s.histTop}>
                <Text style={s.histEnv}>{env?.name || e.envelope_id}</Text>
                <Text style={[s.histAmount, { color: env?.color || C.white }]}>-${parseFloat(e.amount).toFixed(2)}</Text>
              </View>
              {e.note ? <Text style={s.histNote}>{e.note}</Text> : null}
              <Text style={s.histDate}>{e.date}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.black },
  paydayBanner: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingBottom: 16, backgroundColor: C.dark, borderBottomWidth: 1, borderBottomColor: C.border },
  paydayLabel: { fontSize: 10, color: C.muted, letterSpacing: 3, marginBottom: 2 },
  paydayDays: { fontSize: 32, color: C.gold, fontWeight: '700', letterSpacing: 1 },
  paydayRight: { alignItems: 'flex-end' },
  header: { padding: 20, paddingBottom: 8 },
  headerLabel: { fontSize: 10, color: C.muted, letterSpacing: 3 },
  headerTitle: { fontSize: 42, color: C.white, fontWeight: '700', letterSpacing: 2 },
  envelopeCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  envTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  envName: { fontSize: 14, color: C.white, fontWeight: '500' },
  envRemaining: { fontSize: 14, color: C.green, fontWeight: '600' },
  progressBg: { height: 4, backgroundColor: C.border, borderRadius: 2, marginBottom: 6, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  envBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  envSpent: { fontSize: 11, color: C.muted },
  envBudget: { fontSize: 11, color: C.muted },
  affordBtn: { margin: 16, marginBottom: 8, backgroundColor: C.gold, borderRadius: 14, padding: 20, alignItems: 'center' },
  affordBtnText: { color: C.black, fontSize: 20, fontWeight: '700', letterSpacing: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 32 },
  actionBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  actionBtnText: { color: C.white, fontSize: 14, fontWeight: '500' },
  formContainer: { padding: 24 },
  back: { fontSize: 12, color: C.muted, letterSpacing: 2, marginBottom: 20 },
  formTitle: { fontSize: 36, color: C.white, fontWeight: '700', letterSpacing: 2, marginBottom: 28 },
  formLabel: { fontSize: 10, color: C.muted, letterSpacing: 3, marginBottom: 8 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, fontSize: 16, color: C.white, marginBottom: 20 },
  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, minWidth: 120 },
  chipText: { fontSize: 13, color: C.white, fontWeight: '500' },
  chipSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  askBtn: { backgroundColor: C.gold, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 24 },
  askBtnDim: { opacity: 0.4 },
  askBtnText: { color: C.black, fontSize: 22, fontWeight: '700', letterSpacing: 3 },
  resultCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 2, padding: 20, marginBottom: 24 },
  resultAnswer: { fontSize: 32, fontWeight: '700', marginBottom: 12, letterSpacing: 2 },
  resultText: { fontSize: 15, color: C.white, lineHeight: 22 },
  logItBtn: { marginTop: 16, backgroundColor: C.green, borderRadius: 10, padding: 14, alignItems: 'center' },
  logItBtnText: { color: C.black, fontSize: 16, fontWeight: '700' },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  histTitle: { fontSize: 36, color: C.white, fontWeight: '700', letterSpacing: 2 },
  histCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  histTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  histEnv: { fontSize: 14, color: C.white, fontWeight: '500' },
  histAmount: { fontSize: 16, fontWeight: '700' },
  histNote: { fontSize: 12, color: C.muted, marginBottom: 4 },
  histDate: { fontSize: 10, color: C.muted },
  empty: { textAlign: 'center', color: C.muted, fontSize: 14, paddingTop: 60, letterSpacing: 2 },
});
