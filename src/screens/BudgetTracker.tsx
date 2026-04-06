import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Modal, ActivityIndicator, Alert
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { awardOpsPoints } from '../lib/opsPoints';
import { supabase } from '../lib/supabase';
import { ANTHROPIC_API_KEY } from '../lib/config';
import { useUser } from '../context/UserContext';
import { incrementThemeMetric } from '../lib/themeUnlocks';

import { ThemeTokens } from '../themes';
import { pickAndParseFinancialImage, ParsedTransaction } from '../lib/parseFinancialImage';
import ShoppingList from './ShoppingList';

function makeStyles(T: ThemeTokens) {
  return StyleSheet.create({
    bg:             { flex: 1, backgroundColor: T.bg },
    paydayBanner:   { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingBottom: 16, backgroundColor: T.dark, borderBottomWidth: 1, borderBottomColor: T.border },
    paydayLabel:    { fontSize: 10, color: T.muted, letterSpacing: 3, marginBottom: 2 },
    paydayDays:     { fontSize: 32, color: T.accent, fontWeight: '700', letterSpacing: 1 },
    paydayRight:    { alignItems: 'flex-end' as const },
    header:         { padding: 20, paddingBottom: 8 },
    headerLabel:    { fontSize: 10, color: T.muted, letterSpacing: 3 },
    headerTitle:    { fontSize: 42, color: T.text, fontWeight: '700', letterSpacing: 2 },
    committedRow:   { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingHorizontal: 20, paddingBottom: 8 },
    committedLabel: { fontSize: 10, color: T.muted, letterSpacing: 2 },
    committedAmt:   { fontSize: 13, color: T.red, fontWeight: '600' },
    envelopeCard:   { marginHorizontal: 16, marginBottom: 10, backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16 },
    envTop:         { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 10 },
    envName:        { fontSize: 14, color: T.text, fontWeight: '500' },
    envRemaining:   { fontSize: 14, color: T.green, fontWeight: '600' },
    progressBg:     { height: 4, backgroundColor: T.border, borderRadius: 2, marginBottom: 6, overflow: 'hidden' as const },
    progressFill:   { height: 4, borderRadius: 2 },
    envBottom:      { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
    envSpent:       { fontSize: 11, color: T.muted },
    envBudget:      { fontSize: 11, color: T.muted },
    scanBtn:        { marginHorizontal: 16, marginBottom: 8, backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 18, alignItems: 'center' as const },
    scanBtnText:    { color: T.text, fontSize: 16, fontWeight: '600', letterSpacing: 1 },
    affordBtn:      { margin: 16, marginBottom: 8, backgroundColor: T.accent, borderRadius: 14, padding: 20, alignItems: 'center' as const },
    affordBtnText:  { color: T.bg, fontSize: 20, fontWeight: '700', letterSpacing: 1 },
    actionRow:      { flexDirection: 'row' as const, gap: 10, marginHorizontal: 16, marginBottom: 16 },
    actionBtn:      { flex: 1, backgroundColor: T.card, borderRadius: 12, padding: 16, alignItems: 'center' as const, borderWidth: 1, borderColor: T.border },
    actionBtnText:  { color: T.text, fontSize: 14, fontWeight: '500' },
    supplyRunBtn:   { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 16 },
    supplyRunIcon:  { fontSize: 28 },
    supplyRunLabel: { color: T.text, fontSize: 15, fontWeight: '800' as const, letterSpacing: 2 },
    supplyRunSub:   { color: T.muted, fontSize: 12, marginTop: 2 },
    resetBtn:       { marginHorizontal: 16, marginBottom: 32, borderRadius: 12, padding: 14, alignItems: 'center' as const, borderWidth: 1, borderColor: T.red + '55' },
    resetBtnText:   { color: T.red, fontSize: 12, fontWeight: '600', letterSpacing: 2 },
    formContainer:  { padding: 24 },
    back:           { fontSize: 12, color: T.muted, letterSpacing: 2, marginBottom: 20 },
    formTitle:      { fontSize: 36, color: T.text, fontWeight: '700', letterSpacing: 2, marginBottom: 28 },
    formLabel:      { fontSize: 10, color: T.muted, letterSpacing: 3, marginBottom: 8 },
    input:          { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 14, fontSize: 16, color: T.text, marginBottom: 20 },
    chipRow:        { flexDirection: 'row' as const, gap: 8, paddingRight: 16 },
    chipGrid:       { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 24 },
    chip:           { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.card, minWidth: 120 },
    chipText:       { fontSize: 13, color: T.text, fontWeight: '500' },
    chipSub:        { fontSize: 10, color: T.muted, marginTop: 2 },
    askBtn:         { backgroundColor: T.accent, borderRadius: 14, padding: 20, alignItems: 'center' as const, marginBottom: 24 },
    askBtnDim:      { opacity: 0.4 },
    askBtnText:     { color: T.bg, fontSize: 22, fontWeight: '700', letterSpacing: 3 },
    resultCard:     { backgroundColor: T.card, borderRadius: 16, borderWidth: 2, padding: 20, marginBottom: 24 },
    resultAnswer:   { fontSize: 32, fontWeight: '700', marginBottom: 12, letterSpacing: 2 },
    resultText:     { fontSize: 15, color: T.text, lineHeight: 22 },
    logItBtn:       { marginTop: 16, backgroundColor: T.green, borderRadius: 10, padding: 14, alignItems: 'center' as const },
    logItBtnText:   { color: T.bg, fontSize: 16, fontWeight: '700' },
    histHeader:     { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 20, borderBottomWidth: 1, borderBottomColor: T.border },
    histTitle:      { fontSize: 36, color: T.text, fontWeight: '700', letterSpacing: 2 },
    histCard:       { backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
    histTop:        { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 4 },
    histEnv:        { fontSize: 14, color: T.text, fontWeight: '500' },
    histAmount:     { fontSize: 16, fontWeight: '700' },
    histNote:       { fontSize: 12, color: T.muted, marginBottom: 4 },
    histDate:       { fontSize: 10, color: T.muted },
    incomeBadge:    { fontSize: 9, color: T.green, letterSpacing: 2, fontWeight: '700', marginBottom: 2 },
    empty:          { textAlign: 'center' as const, color: T.muted, fontSize: 14, paddingTop: 60, letterSpacing: 2 },
    // Scan review
    scanSection:    { marginBottom: 16 },
    scanCatLabel:   { fontSize: 10, color: T.muted, letterSpacing: 3, marginHorizontal: 16, marginBottom: 8, marginTop: 8 },
    scanItem:       { marginHorizontal: 16, marginBottom: 8, backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14 },
    scanRow:        { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    scanMerchant:   { fontSize: 15, color: T.text, fontWeight: '600', flex: 1 },
    scanAmt:        { fontSize: 15, fontWeight: '700' },
    scanMeta:       { flexDirection: 'row' as const, gap: 8, marginTop: 4 },
    scanConf:       { fontSize: 10, letterSpacing: 1 },
    scanDelete:     { padding: 4 },
    scanDeleteTxt:  { fontSize: 18, color: T.muted },
    logAllBtn:      { margin: 16, backgroundColor: T.accent, borderRadius: 14, padding: 20, alignItems: 'center' as const },
    logAllBtnText:  { color: T.bg, fontSize: 18, fontWeight: '700', letterSpacing: 2 },
    // Envelope detail
    detailHeader:   { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.border },
    detailName:     { fontSize: 28, color: T.text, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    detailStats:    { flexDirection: 'row' as const, gap: 24, marginTop: 8 },
    detailStat:     { alignItems: 'flex-start' as const },
    detailStatLabel:{ fontSize: 9, color: T.muted, letterSpacing: 2, marginBottom: 2 },
    detailStatVal:  { fontSize: 20, fontWeight: '700' },
    monthHeader:    { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    monthLabel:     { fontSize: 10, color: T.muted, letterSpacing: 3 },
    monthClear:     { fontSize: 10, color: T.red, letterSpacing: 1 },
    detailCard:     { marginHorizontal: 16, marginBottom: 6, backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12 },
    detailRow:      { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    detailNote:     { fontSize: 14, color: T.text, fontWeight: '500', flex: 1 },
    detailAmt:      { fontSize: 15, fontWeight: '700', marginLeft: 8 },
    detailDate:     { fontSize: 10, color: T.muted, marginTop: 3 },
    refileBtn:      { marginTop: 6, alignSelf: 'flex-start' as const, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: T.border },
    refileBtnText:  { fontSize: 10, color: T.muted, letterSpacing: 1 },
    // Refile modal
    modalOverlay:   { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' as const },
    modalSheet:     { backgroundColor: T.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
    modalTitle:     { fontSize: 14, color: T.muted, letterSpacing: 2, marginBottom: 16 },
    modalOption:    { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
    modalOptionText:{ fontSize: 16, color: T.text, fontWeight: '500' },
    modalCancel:    { marginTop: 16, alignItems: 'center' as const },
    modalCancelText:{ fontSize: 14, color: T.muted, letterSpacing: 2 },
  });
}

// Bi-weekly pay: every 2nd Friday
function getNextPayday(): Date {
  const base = new Date('2026-03-13');
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

function getMonthKey(dateStr: string): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function isIncome(e: any): boolean {
  return (
    e.category === 'income' ||
    e.envelope_id === 'income' ||
    parseFloat(e.amount) < 0 // negative amount in budget_expenses = money in
  );
}

const DEFAULT_ENVELOPES = [
  { id: 'groceries',     name: 'Groceries 🛒',    budget: 400, color: '#3ce08a' },
  { id: 'fuel',          name: 'Fuel ⛽',          budget: 200, color: '#c9a84c' },
  { id: 'vehicle',       name: 'Vehicle 🚗',       budget: 100, color: '#4a9eff' },
  { id: 'entertainment', name: 'Entertainment 🎮', budget: 150, color: '#a78bfa' },
  { id: 'emergency',     name: 'Emergency 🚨',     budget: 200, color: '#e03c3c' },
  { id: 'overflow',      name: 'Overflow 💰',      budget: 100, color: '#666666' },
  { id: 'spectre',       name: 'Spectre 💼',       budget: 500, color: '#38bdf8' },
  { id: 'kids_activities', name: 'Kids Activities 🏃', budget: 200, color: '#f59e0b' },
  { id: 'school',          name: 'School 📚',          budget: 100, color: '#34d399' },
  { id: 'clothing',        name: 'Clothing 👕',         budget: 100, color: '#f472b6' },
  { id: 'subscriptions',   name: 'Subscriptions 📺',   budget: 80,  color: '#818cf8' },
  { id: 'home_repair',     name: 'Home Repair 🔧',      budget: 150, color: '#94a3b8' },
];

type Screen = 'home' | 'log' | 'afford' | 'history' | 'scan_review' | 'envelope_detail';

export default function BudgetTracker() {
  const { user, themeTokens: T } = useUser();
  const s = makeStyles(T);

  const [envelopes] = useState(DEFAULT_ENVELOPES);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [screen, setScreen] = useState<Screen>('home');
  const [showSupplyRun, setShowSupplyRun] = useState(false);

  // Scan
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResults, setScanResults] = useState<ParsedTransaction[]>([]);
  const [committedTotal, setCommittedTotal] = useState(0);

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

  // Envelope detail
  const [selectedEnvelope, setSelectedEnvelope] = useState<typeof DEFAULT_ENVELOPES[0] | null>(null);
  const [refileTarget, setRefileTarget] = useState<any>(null); // transaction being refiled

  const daysLeft = daysUntilPayday();

  useEffect(() => { loadData(); loadCommittedBills(); }, []);

  async function loadData() {
    if (!user?.id) return;
    const { data } = await supabase
      .from('budget_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (data) setExpenses(data);
  }

  async function loadCommittedBills() {
    if (!user?.id) return;
    const { data } = await supabase
      .from('committed_bills')
      .select('amount')
      .eq('user_id', user.id);
    if (data) {
      const total = data.reduce((sum, b) => sum + Math.abs(parseFloat(b.amount)), 0);
      setCommittedTotal(total);
    }
  }

  // ── DELETE ────────────────────────────────────────────

  async function deleteTransaction(id: string) {
    await supabase.from('budget_expenses').delete().eq('id', id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  function confirmDeleteTransaction(e: any) {
    Alert.alert(
      'Remove transaction?',
      `${e.note || e.envelope_id} — $${Math.abs(parseFloat(e.amount)).toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteTransaction(e.id) },
      ],
    );
  }

  async function clearByMonth(monthKey: string, envelopeId?: string) {
    if (!user?.id) return;
    Alert.alert(
      `Clear ${monthKey}?`,
      envelopeId
        ? `Remove all ${envelopeId} transactions from ${monthKey}.`
        : `Remove all transactions from ${monthKey}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive', onPress: async () => {
            const toDelete = expenses.filter(e => {
              const same = getMonthKey(e.date) === monthKey;
              return envelopeId ? same && e.envelope_id === envelopeId : same;
            });
            const ids = toDelete.map(e => e.id);
            if (ids.length) {
              await supabase.from('budget_expenses').delete().in('id', ids);
              setExpenses(prev => prev.filter(e => !ids.includes(e.id)));
            }
          },
        },
      ],
    );
  }

  function confirmClearAll() {
    Alert.alert(
      'Clear all transactions?',
      'Removes every logged expense. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all', style: 'destructive', onPress: async () => {
            if (!user?.id) return;
            await supabase.from('budget_expenses').delete().eq('user_id', user.id);
            setExpenses([]);
          },
        },
      ],
    );
  }

  function confirmClearOld() {
    Alert.alert(
      'Clear old transactions?',
      'Remove all transactions older than 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear old', style: 'destructive', onPress: async () => {
            if (!user?.id) return;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            await supabase
              .from('budget_expenses')
              .delete()
              .eq('user_id', user.id)
              .lt('date', thirtyDaysAgo.toISOString().split('T')[0]);
            loadData();
          },
        },
      ],
    );
  }

  function showClearOptions() {
    Alert.alert(
      'Clear transactions',
      'Choose what to clear',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear older than 30 days', onPress: confirmClearOld },
        { text: 'Clear ALL', style: 'destructive', onPress: confirmClearAll },
      ],
    );
  }

  // ── FULL RESET ────────────────────────────────────────

  function confirmFullReset() {
    Alert.alert(
      '⚠️ Full Armory Reset',
      'Deletes ALL transactions, committed bills, and pending clarifications. Envelopes start fresh. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'RESET EVERYTHING', style: 'destructive', onPress: async () => {
            if (!user?.id) return;
            await Promise.all([
              supabase.from('budget_expenses').delete().eq('user_id', user.id),
              supabase.from('committed_bills').delete().eq('user_id', user.id),
              supabase.from('armory_clarifications').delete().eq('user_id', user.id),
            ]);
            setExpenses([]);
            setCommittedTotal(0);
            Alert.alert('Done', 'The Armory is clean. Start fresh.');
          },
        },
      ],
    );
  }

  // ── REFILE ────────────────────────────────────────────

  async function refileTransaction(transactionId: string, newEnvelopeId: string) {
    await supabase
      .from('budget_expenses')
      .update({ envelope_id: newEnvelopeId })
      .eq('id', transactionId);
    setExpenses(prev =>
      prev.map(e => e.id === transactionId ? { ...e, envelope_id: newEnvelopeId } : e)
    );
    setRefileTarget(null);
  }

  // ── SCAN ──────────────────────────────────────────────

  async function scanStatement() {
    setScanLoading(true);
    try {
      const results = await pickAndParseFinancialImage();
      if (results && results.length > 0) {
        setScanResults(results);
        setScreen('scan_review');
      } else if (results !== null) {
        Alert.alert('Nothing found', 'Could not extract transactions from that image.');
      }
    } catch {
      Alert.alert('Error', 'Failed to parse image. Try a clearer screenshot.');
    }
    setScanLoading(false);
  }

  async function logAllScanned() {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];

    const expenses_to_log = scanResults
      .filter(t => t.category !== 'income')
      .map(t => ({
        user_id: user.id,
        envelope_id: t.envelope,
        amount: Math.abs(t.amount),
        note: t.merchant,
        date: t.date || today,
        category: t.category,
      }));

    // Income goes to income_transactions if it exists, otherwise log with negative amount
    const income_to_log = scanResults
      .filter(t => t.category === 'income')
      .map(t => ({
        user_id: user.id,
        envelope_id: 'income',
        amount: -Math.abs(t.amount), // negative = money in
        note: t.merchant,
        date: t.date || today,
        category: 'income',
      }));

    if (expenses_to_log.length > 0) {
      await supabase.from('budget_expenses').insert(expenses_to_log);
    }
    if (income_to_log.length > 0) {
      await supabase.from('budget_expenses').insert(income_to_log);
    }

    const recurring = scanResults.filter(t => t.is_recurring && t.category === 'auto_payment');
    if (recurring.length > 0) {
      const bills = recurring.map(t => ({
        user_id: user.id,
        merchant: t.merchant,
        amount: Math.abs(t.amount),
        is_auto_pay: true,
        envelope_id: t.envelope,
        last_seen: t.date || today,
      }));
      await supabase.from('committed_bills').insert(bills);
    }

    await loadData();
    await loadCommittedBills();
    setScanResults([]);
    setScreen('home');
  }

  // ── CALCULATIONS ──────────────────────────────────────

  function getSpent(envelopeId: string) {
    return expenses
      .filter(e => e.envelope_id === envelopeId && !isIncome(e))
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

  // ── LOG EXPENSE ───────────────────────────────────────

  async function logExpense() {
    if (!logEnvelope || !logAmount) return;
    const expense = {
      user_id: user?.id,
      envelope_id: logEnvelope,
      amount: parseFloat(logAmount),
      note: logNote,
      date: new Date().toISOString().split('T')[0],
    };
    await supabase.from('budget_expenses').insert(expense);
    if (user?.id) {
      incrementThemeMetric(user.id, 'budget_days').catch(() => {});
      awardOpsPoints(user.id, 1, 'budget_logged').catch(() => {});
    }
    setExpenses(prev => [{ ...expense, created_at: new Date().toISOString() }, ...prev]);
    setLogAmount('');
    setLogNote('');
    setLogEnvelope('');
    setScreen('home');
  }

  // ── CAN I AFFORD ──────────────────────────────────────

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

Be direct. No sugar coating. ADHD brain needs clarity not paragraphs.`,
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || 'Could not get a response.';
      const isYes = text.trim().toUpperCase().startsWith('YES');
      setAffordResult({ text, isYes });
    } catch {
      setAffordResult({ text: 'Could not connect. Check your internet.', isYes: false });
    }

    setAffordLoading(false);
  }

  // ── ENVELOPE DETAIL HELPERS ───────────────────────────

  function getEnvelopeTransactions(envelopeId: string) {
    return expenses.filter(e => e.envelope_id === envelopeId);
  }

  function groupByMonth(txns: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    for (const t of txns) {
      const key = getMonthKey(t.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return groups;
  }

  // ── HOME ──────────────────────────────────────────────

  if (screen === 'home') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle={T.mode === 'light' ? 'dark-content' : 'light-content'} />
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={s.paydayBanner}>
          <View>
            <Text style={s.paydayLabel}>PAYDAY IN</Text>
            <Text style={s.paydayDays}>{daysLeft} days</Text>
          </View>
          <View style={s.paydayRight}>
            <Text style={s.paydayLabel}>TOTAL LEFT</Text>
            <Text style={[s.paydayDays, { color: getTotalRemaining() < 100 ? T.red : T.green }]}>
              ${getTotalRemaining().toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={s.header}>
          <Text style={s.headerLabel}>THIS PAY PERIOD</Text>
          <Text style={s.headerTitle}>THE ARMORY</Text>
        </View>

        {committedTotal > 0 && (
          <View style={s.committedRow}>
            <Text style={s.committedLabel}>COMMITTED (auto-pay)</Text>
            <Text style={s.committedAmt}>-${committedTotal.toFixed(0)} spoken for</Text>
          </View>
        )}

        {/* Envelopes — tap to drill in */}
        {envelopes.map(env => {
          const spent = getSpent(env.id);
          const remaining = getRemaining(env.id);
          const pct = Math.min(spent / env.budget, 1);
          const over = remaining < 0;
          return (
            <TouchableOpacity
              key={env.id}
              style={s.envelopeCard}
              onPress={() => { setSelectedEnvelope(env); setScreen('envelope_detail'); }}
              activeOpacity={0.75}
            >
              <View style={s.envTop}>
                <Text style={s.envName}>{env.name}</Text>
                <Text style={[s.envRemaining, over && { color: T.red }]}>
                  {over ? `-$${Math.abs(remaining).toFixed(0)} over` : `$${remaining.toFixed(0)} left`}
                </Text>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct * 100}%`, backgroundColor: over ? T.red : env.color }]} />
              </View>
              <View style={s.envBottom}>
                <Text style={s.envSpent}>spent ${spent.toFixed(0)}</Text>
                <Text style={s.envBudget}>of ${env.budget}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={s.scanBtn} onPress={scanStatement} disabled={scanLoading}>
          {scanLoading
            ? <ActivityIndicator color={T.accent} />
            : <Text style={s.scanBtnText}>📸 Scan statement</Text>
          }
        </TouchableOpacity>

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

        <TouchableOpacity style={s.supplyRunBtn} onPress={() => setShowSupplyRun(true)} activeOpacity={0.8}>
          <Text style={s.supplyRunIcon}>📋</Text>
          <View>
            <Text style={s.supplyRunLabel}>SUPPLY RUN</Text>
            <Text style={s.supplyRunSub}>Shopping lists — household, personal, the unit</Text>
          </View>
        </TouchableOpacity>

        {/* Full reset — bottom of screen, low prominence */}
        <TouchableOpacity style={s.resetBtn} onPress={confirmFullReset}>
          <Text style={s.resetBtnText}>⚠️ RESET ARMORY</Text>
        </TouchableOpacity>

      </ScrollView>

      {showSupplyRun && (
        <ShoppingList onClose={() => setShowSupplyRun(false)} />
      )}
    </SafeAreaView>
  );

  // ── ENVELOPE DETAIL ───────────────────────────────────

  if (screen === 'envelope_detail' && selectedEnvelope) {
    const txns = getEnvelopeTransactions(selectedEnvelope.id);
    const grouped = groupByMonth(txns);
    const months = Object.keys(grouped);
    const spent = getSpent(selectedEnvelope.id);
    const remaining = getRemaining(selectedEnvelope.id);
    const over = remaining < 0;
    const incomeTxns = txns.filter(e => isIncome(e));
    const expenseTxns = txns.filter(e => !isIncome(e));

    return (
      <SafeAreaView style={s.bg}>
        <StatusBar barStyle={T.mode === 'light' ? 'dark-content' : 'light-content'} />

        {/* Header */}
        <View style={s.detailHeader}>
          <TouchableOpacity
            onPress={() => setScreen('home')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={16} color={T.accent} />
            <Text style={{ fontSize: 12, color: T.accent, fontWeight: '600', letterSpacing: 1 }}>BACK</Text>
          </TouchableOpacity>
          <Text style={s.detailName}>{selectedEnvelope.name}</Text>
          <View style={s.detailStats}>
            <View style={s.detailStat}>
              <Text style={s.detailStatLabel}>SPENT</Text>
              <Text style={[s.detailStatVal, { color: selectedEnvelope.color }]}>${spent.toFixed(0)}</Text>
            </View>
            <View style={s.detailStat}>
              <Text style={s.detailStatLabel}>BUDGET</Text>
              <Text style={[s.detailStatVal, { color: T.muted }]}>${selectedEnvelope.budget}</Text>
            </View>
            <View style={s.detailStat}>
              <Text style={s.detailStatLabel}>REMAINING</Text>
              <Text style={[s.detailStatVal, { color: over ? T.red : T.green }]}>
                {over ? `-$${Math.abs(remaining).toFixed(0)}` : `$${remaining.toFixed(0)}`}
              </Text>
            </View>
            {incomeTxns.length > 0 && (
              <View style={s.detailStat}>
                <Text style={s.detailStatLabel}>INCOME</Text>
                <Text style={[s.detailStatVal, { color: T.green }]}>
                  +${incomeTxns.reduce((s, e) => s + Math.abs(parseFloat(e.amount)), 0).toFixed(0)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView>
          {txns.length === 0 && (
            <Text style={s.empty}>No transactions yet.</Text>
          )}

          {months.map(month => (
            <View key={month}>
              <View style={s.monthHeader}>
                <Text style={s.monthLabel}>{month.toUpperCase()}</Text>
                <TouchableOpacity onPress={() => clearByMonth(month, selectedEnvelope.id)}>
                  <Text style={s.monthClear}>CLEAR MONTH</Text>
                </TouchableOpacity>
              </View>

              {grouped[month].map((e, i) => {
                const income = isIncome(e);
                return (
                  <View key={e.id ?? i} style={s.detailCard}>
                    <View style={s.detailRow}>
                      <View style={{ flex: 1 }}>
                        {income && <Text style={s.incomeBadge}>INCOME</Text>}
                        <Text style={s.detailNote}>{e.note || e.envelope_id}</Text>
                        <Text style={s.detailDate}>{e.date}</Text>
                      </View>
                      <Text style={[s.detailAmt, { color: income ? T.green : selectedEnvelope.color }]}>
                        {income ? '+' : '-'}${Math.abs(parseFloat(e.amount)).toFixed(2)}
                      </Text>
                    </View>

                    {/* Action buttons */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        style={s.refileBtn}
                        onPress={() => setRefileTarget(e)}
                      >
                        <Text style={s.refileBtnText}>REFILE →</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.refileBtn, { borderColor: T.red + '55' }]}
                        onPress={() => confirmDeleteTransaction(e)}
                      >
                        <Text style={[s.refileBtnText, { color: T.red }]}>REMOVE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Refile modal */}
        <Modal visible={!!refileTarget} transparent animationType="slide">
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setRefileTarget(null)}>
            <View style={s.modalSheet}>
              <Text style={s.modalTitle}>REFILE TO WHICH ENVELOPE?</Text>
              {envelopes
                .filter(env => env.id !== selectedEnvelope.id)
                .map(env => (
                  <TouchableOpacity
                    key={env.id}
                    style={s.modalOption}
                    onPress={() => refileTarget && refileTransaction(refileTarget.id, env.id)}
                  >
                    <Text style={[s.modalOptionText, { color: env.color }]}>{env.name}</Text>
                  </TouchableOpacity>
                ))
              }
              <TouchableOpacity style={s.modalCancel} onPress={() => setRefileTarget(null)}>
                <Text style={s.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── CAN I AFFORD THIS ─────────────────────────────────

  if (screen === 'afford') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle={T.mode === 'light' ? 'dark-content' : 'light-content'} />
      <ScrollView contentContainerStyle={s.formContainer}>
        <TouchableOpacity onPress={() => setScreen('home')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 20 }} activeOpacity={0.7}><ChevronLeft size={16} color={T.accent} /><Text style={{ fontSize: 12, color: T.accent, fontWeight: '600', letterSpacing: 1 }}>BACK</Text></TouchableOpacity>
        <Text style={s.formTitle}>Can I afford this?</Text>

        <Text style={s.formLabel}>WHAT IS IT</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. new headphones, dinner out..."
          placeholderTextColor={T.muted}
          value={affordItem}
          onChangeText={setAffordItem}
        />

        <Text style={s.formLabel}>HOW MUCH</Text>
        <TextInput
          style={s.input}
          placeholder="$0.00"
          placeholderTextColor={T.muted}
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
            ? <ActivityIndicator color={T.bg} />
            : <Text style={s.askBtnText}>ASK</Text>
          }
        </TouchableOpacity>

        {affordResult && (
          <View style={[s.resultCard, { borderColor: affordResult.isYes ? T.green : T.red }]}>
            <Text style={[s.resultAnswer, { color: affordResult.isYes ? T.green : T.red }]}>
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
      <StatusBar barStyle={T.mode === 'light' ? 'dark-content' : 'light-content'} />
      <ScrollView contentContainerStyle={s.formContainer}>
        <TouchableOpacity onPress={() => setScreen('home')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 20 }} activeOpacity={0.7}><ChevronLeft size={16} color={T.accent} /><Text style={{ fontSize: 12, color: T.accent, fontWeight: '600', letterSpacing: 1 }}>BACK</Text></TouchableOpacity>
        <Text style={s.formTitle}>Log Expense</Text>

        <Text style={s.formLabel}>AMOUNT</Text>
        <TextInput
          style={s.input}
          placeholder="$0.00"
          placeholderTextColor={T.muted}
          keyboardType="decimal-pad"
          value={logAmount}
          onChangeText={setLogAmount}
        />

        <Text style={s.formLabel}>NOTE (optional)</Text>
        <TextInput
          style={s.input}
          placeholder="what was it?"
          placeholderTextColor={T.muted}
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

  // ── SCAN REVIEW ───────────────────────────────────────

  if (screen === 'scan_review') {
    const categories = ['auto_payment', 'bill', 'expense', 'income', 'transfer'] as const;
    const catLabels: Record<string, string> = {
      auto_payment: 'AUTO PAYMENTS',
      bill: 'BILLS',
      expense: 'EXPENSES',
      income: '💰 INCOME',
      transfer: 'TRANSFERS',
    };
    const confColor: Record<string, string> = {
      high: T.green, medium: T.accent, low: T.muted,
    };

    return (
      <SafeAreaView style={s.bg}>
        <StatusBar barStyle={T.mode === 'light' ? 'dark-content' : 'light-content'} />
        <View style={s.histHeader}>
          <Text style={s.histTitle}>STATEMENT</Text>
          <TouchableOpacity onPress={() => { setScanResults([]); setScreen('home'); }}>
            <Text style={s.back}>✕ CANCEL</Text>
          </TouchableOpacity>
        </View>
        <ScrollView>
          {categories.map(cat => {
            const items = scanResults.filter(t => t.category === cat);
            if (items.length === 0) return null;
            return (
              <View key={cat} style={s.scanSection}>
                <Text style={s.scanCatLabel}>{catLabels[cat]}</Text>
                {items.map((t, i) => (
                  <View key={i} style={[s.scanItem, cat === 'income' && { borderColor: T.green + '55' }]}>
                    <View style={s.scanRow}>
                      <Text style={s.scanMerchant}>{t.merchant}</Text>
                      <Text style={[s.scanAmt, { color: cat === 'income' ? T.green : (t.amount < 0 ? T.red : T.green) }]}>
                        {cat === 'income' ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        style={s.scanDelete}
                        onPress={() => setScanResults(prev => prev.filter((_, j) => j !== i))}
                      >
                        <Text style={s.scanDeleteTxt}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={s.scanMeta}>
                      <Text style={[s.scanConf, { color: confColor[t.confidence] }]}>
                        {t.confidence.toUpperCase()}
                      </Text>
                      {t.is_recurring && (
                        <Text style={[s.scanConf, { color: T.accent }]}>● RECURRING</Text>
                      )}
                      <Text style={[s.scanConf, { color: T.muted }]}>{t.envelope}</Text>
                      {t.date && <Text style={[s.scanConf, { color: T.muted }]}>{t.date}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
          <TouchableOpacity style={s.logAllBtn} onPress={logAllScanned}>
            <Text style={s.logAllBtnText}>
              LOG ALL ({scanResults.filter(t => t.category !== 'income').length} expenses
              {scanResults.filter(t => t.category === 'income').length > 0
                ? ` + ${scanResults.filter(t => t.category === 'income').length} income`
                : ''})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── HISTORY ───────────────────────────────────────────

  const grouped = groupByMonth(expenses);
  const months = Object.keys(grouped);

  return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle={T.mode === 'light' ? 'dark-content' : 'light-content'} />
      <View style={s.histHeader}>
        <Text style={s.histTitle}>HISTORY</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={showClearOptions}>
            <Text style={[s.back, { color: T.red }]}>CLEAR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('home')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 }} activeOpacity={0.7}><ChevronLeft size={16} color={T.accent} /><Text style={{ fontSize: 12, color: T.accent, fontWeight: '600', letterSpacing: 1 }}>BACK</Text></TouchableOpacity>
        </View>
      </View>
      <Text style={{ color: T.muted, fontSize: 10, letterSpacing: 1, paddingHorizontal: 16, paddingBottom: 8 }}>
        HOLD ROW TO DELETE
      </Text>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {expenses.length === 0 ? (
          <Text style={s.empty}>No expenses logged yet.</Text>
        ) : months.map(month => (
          <View key={month}>
            <View style={[s.monthHeader, { paddingHorizontal: 0 }]}>
              <Text style={s.monthLabel}>{month.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => clearByMonth(month)}>
                <Text style={s.monthClear}>CLEAR MONTH</Text>
              </TouchableOpacity>
            </View>
            {grouped[month].map((e, i) => {
              const env = envelopes.find(env => env.id === e.envelope_id);
              const income = isIncome(e);
              return (
                <TouchableOpacity
                  key={e.id ?? i}
                  style={[s.histCard, income && { borderColor: T.green + '55' }]}
                  onLongPress={() => confirmDeleteTransaction(e)}
                  delayLongPress={400}
                  activeOpacity={0.75}
                >
                  <View style={s.histTop}>
                    <View style={{ flex: 1 }}>
                      {income && <Text style={s.incomeBadge}>INCOME</Text>}
                      <Text style={s.histEnv}>{env?.name || e.envelope_id}</Text>
                    </View>
                    <Text style={[s.histAmount, { color: income ? T.green : (env?.color || T.text) }]}>
                      {income ? '+' : '-'}${Math.abs(parseFloat(e.amount)).toFixed(2)}
                    </Text>
                  </View>
                  {e.note ? <Text style={s.histNote}>{e.note}</Text> : null}
                  <Text style={s.histDate}>{e.date}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
