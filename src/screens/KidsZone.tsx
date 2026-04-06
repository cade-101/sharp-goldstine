import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, Animated,
} from 'react-native';
import { ChevronLeft, CheckSquare, Square, Flame } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HouseholdMember {
  id: string;
  display_name: string;
  role: string;
  age: number | null;
  avatar_emoji: string;
  household_id: string;
}

interface ChoreDefinition {
  id: string;
  name: string;
  icon_emoji: string;
  frequency: string;
  difficulty: string;
  allowance_amount: number;
  member_id: string;
}

interface ChoreLog {
  id: string;
  chore_id: string;
  completed_at: string | null;
  skipped: boolean;
}

interface AllowanceLedger {
  id: string;
  member_id: string;
  amount: number;
  type: string;
}

// ── Coin jar animation ────────────────────────────────────────────────────────

function CoinJar({ balance, goal }: { balance: number; goal: number }) {
  const T = useUser().themeTokens;
  const fillPct = goal > 0 ? Math.min(balance / goal, 1) : 0;

  return (
    <View style={styles.jarWrapper}>
      <View style={[styles.jar, { borderColor: T.accent }]}>
        <View style={[styles.jarFill, { height: `${fillPct * 100}%` as any, backgroundColor: T.accent + '50' }]} />
      </View>
      <Text style={[styles.jarBalance, { color: T.accent }]}>${balance.toFixed(2)}</Text>
      {goal > 0 && (
        <Text style={[styles.jarGoal, { color: T.muted }]}>goal ${goal.toFixed(0)}</Text>
      )}
    </View>
  );
}

// ── Streak dots ───────────────────────────────────────────────────────────────

function StreakDots({ streak, logs }: { streak: number; logs: ChoreLog[] }) {
  const T = useUser().themeTokens;
  const today = new Date();
  const dots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dayStr = d.toISOString().split('T')[0];
    const hasLog = logs.some(l => l.completed_at && l.completed_at.startsWith(dayStr));
    return { dayStr, hasLog };
  });

  return (
    <View style={styles.streakRow}>
      {dots.map((dot, i) => (
        <View
          key={i}
          style={[
            styles.streakDot,
            { backgroundColor: dot.hasLog ? T.accent : T.border },
          ]}
        />
      ))}
      {streak > 0 && (
        <View style={styles.streakBadge}>
          <Flame size={12} color={T.accent} />
          <Text style={[styles.streakText, { color: T.accent }]}>{streak}</Text>
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function KidsZone() {
  const { user, themeTokens: T } = useUser();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [chores, setChores] = useState<ChoreDefinition[]>([]);
  const [logs, setLogs] = useState<ChoreLog[]>([]);
  const [ledger, setLedger] = useState<AllowanceLedger[]>([]);
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [loading, setLoading] = useState(true);

  const householdId = user?.house_name ?? null;

  useEffect(() => {
    if (!householdId) { setLoading(false); return; }
    load();
  }, [householdId]);

  async function load() {
    setLoading(true);
    const [membersRes, choresRes, logsRes, ledgerRes] = await Promise.all([
      supabase.from('household_members').select('*').eq('household_id', householdId!).in('role', ['child', 'teen', 'toddler']),
      supabase.from('chore_definitions').select('*').eq('household_id', householdId!).eq('active', true),
      supabase.from('chore_logs').select('*').eq('household_id', householdId!).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('allowance_ledger').select('*').eq('household_id', householdId!),
    ]);
    setMembers(membersRes.data ?? []);
    setChores(choresRes.data ?? []);
    setLogs(logsRes.data ?? []);
    setLedger(ledgerRes.data ?? []);
    setLoading(false);
  }

  async function toggleChore(chore: ChoreDefinition, memberId: string) {
    if (!user?.id) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = logs.find(l => l.chore_id === chore.id && l.completed_at?.startsWith(todayStr));

    if (existing) {
      await supabase.from('chore_logs').delete().eq('id', existing.id);
      if (chore.allowance_amount > 0) {
        await supabase.from('allowance_ledger').delete().eq('household_id', householdId!).eq('chore_id', chore.id).eq('type', 'earned').gte('created_at', new Date().toISOString().split('T')[0]);
      }
    } else {
      const { data } = await supabase.from('chore_logs').insert({
        household_id: householdId,
        chore_id: chore.id,
        member_id: memberId,
        completed_at: new Date().toISOString(),
        logged_by_user_id: user.id,
      }).select().single();
      if (data && chore.allowance_amount > 0) {
        await supabase.from('allowance_ledger').insert({
          household_id: householdId,
          member_id: memberId,
          amount: chore.allowance_amount,
          type: 'earned',
          chore_id: chore.id,
          note: `Completed: ${chore.name}`,
        });
      }
    }
    load();
  }

  function getMemberBalance(memberId: string): number {
    return ledger
      .filter(l => l.member_id === memberId)
      .reduce((sum, l) => sum + (l.type === 'paid_out' || l.type === 'deduction' ? -l.amount : l.amount), 0);
  }

  function getMemberStreak(memberId: string): number {
    const memberLogs = logs.filter(l => l.completed_at && !l.skipped);
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      if (memberLogs.some(l => l.completed_at?.startsWith(dayStr))) streak++;
      else break;
    }
    return streak;
  }

  async function cashOut(member: HouseholdMember) {
    const balance = getMemberBalance(member.id);
    if (balance <= 0) { Alert.alert('No balance', `${member.display_name} has no balance to cash out.`); return; }
    Alert.alert(`Cash out $${balance.toFixed(2)}?`, `This will mark $${balance.toFixed(2)} as paid to ${member.display_name}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'CASH OUT', onPress: async () => {
        await supabase.from('allowance_ledger').insert({
          household_id: householdId,
          member_id: member.id,
          amount: balance,
          type: 'paid_out',
          note: 'Cashed out',
        });
        load();
      }},
    ]);
  }

  if (!householdId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: T.muted }]}>No household linked.</Text>
          <Text style={[styles.emptySub, { color: T.muted }]}>Link a household in Settings to use Kids Zone.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // ── Detail view ──────────────────────────────────────────────────────────────

  if (selectedMember) {
    const memberChores = chores.filter(c => c.member_id === selectedMember.id);
    const memberLogs = logs.filter(l => memberChores.some(c => c.id === l.chore_id));
    const balance = getMemberBalance(selectedMember.id);
    const streak = getMemberStreak(selectedMember.id);

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: T.card, borderColor: T.border }]}
              onPress={() => setSelectedMember(null)}
            >
              <ChevronLeft size={16} color={T.accent} />
              <Text style={[styles.backText, { color: T.accent }]}>KIDS</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar + name */}
          <View style={styles.memberHeader}>
            <Text style={styles.avatarLarge}>{selectedMember.avatar_emoji}</Text>
            <Text style={[styles.memberName, { color: T.text }]}>{selectedMember.display_name}</Text>
            {selectedMember.age && <Text style={[styles.memberAge, { color: T.muted }]}>Age {selectedMember.age}</Text>}
            <StreakDots streak={streak} logs={memberLogs} />
          </View>

          {/* Coin jar */}
          <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>ALLOWANCE</Text>
            <CoinJar balance={balance} goal={20} />
            <TouchableOpacity
              style={[styles.cashOutBtn, { backgroundColor: T.accent }]}
              onPress={() => cashOut(selectedMember)}
            >
              <Text style={[styles.cashOutText, { color: T.bg }]}>CASH OUT</Text>
            </TouchableOpacity>
          </View>

          {/* Chores */}
          <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>TODAY'S CHORES</Text>
            {memberChores.length === 0 && (
              <Text style={[styles.emptyText, { color: T.muted }]}>No chores assigned.</Text>
            )}
            {memberChores.map(chore => {
              const done = memberLogs.some(l => l.chore_id === chore.id && l.completed_at?.startsWith(todayStr));
              return (
                <TouchableOpacity
                  key={chore.id}
                  style={styles.choreRow}
                  onPress={() => toggleChore(chore, selectedMember.id)}
                >
                  {done
                    ? <CheckSquare size={22} color={T.green} />
                    : <Square size={22} color={T.muted} />}
                  <Text style={styles.choreEmoji}>{chore.icon_emoji}</Text>
                  <Text style={[styles.choreName, { color: done ? T.muted : T.text }, done && styles.strikethrough]}>
                    {chore.name}
                  </Text>
                  {chore.difficulty === 'hard' && (
                    <View style={[styles.hardBadge, { borderColor: T.gold }]}>
                      <Text style={[styles.hardText, { color: T.gold }]}>⚡ GOOD DAY</Text>
                    </View>
                  )}
                  {chore.allowance_amount > 0 && (
                    <Text style={[styles.allowanceChip, { color: T.accent }]}>+${chore.allowance_amount.toFixed(2)}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Home view ────────────────────────────────────────────────────────────────

  const todayChores = chores.filter(c => c.frequency === 'daily');
  const allDone = todayChores.every(c => logs.some(l => l.chore_id === c.id && l.completed_at?.startsWith(todayStr)));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.heading, { color: T.text }]}>KIDS ZONE</Text>
        <Text style={[styles.sub, { color: T.muted }]}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</Text>

        {/* Member chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
          {members.map(m => {
            const streak = getMemberStreak(m.id);
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.memberChip, { backgroundColor: T.card, borderColor: T.border }]}
                onPress={() => setSelectedMember(m)}
              >
                <Text style={styles.avatarMid}>{m.avatar_emoji}</Text>
                <Text style={[styles.chipName, { color: T.text }]}>{m.display_name}</Text>
                {streak > 0 && (
                  <View style={styles.chipStreak}>
                    <Flame size={10} color={T.accent} />
                    <Text style={[styles.chipStreakNum, { color: T.accent }]}>{streak}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Today's chores */}
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
          <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>TODAY'S CHORES</Text>
          {allDone && todayChores.length > 0 ? (
            <Text style={[styles.allDone, { color: T.green }]}>All chores done today</Text>
          ) : todayChores.length === 0 ? (
            <Text style={[styles.emptyText, { color: T.muted }]}>No chores set up yet.</Text>
          ) : todayChores.map(chore => {
            const member = members.find(m => m.id === chore.member_id);
            const done = logs.some(l => l.chore_id === chore.id && l.completed_at?.startsWith(todayStr));
            return (
              <TouchableOpacity
                key={chore.id}
                style={styles.choreRow}
                onPress={() => member && toggleChore(chore, member.id)}
              >
                {done
                  ? <CheckSquare size={20} color={T.green} />
                  : <Square size={20} color={T.muted} />}
                <Text style={styles.choreEmoji}>{member?.avatar_emoji ?? '🧒'}</Text>
                <Text style={styles.choreEmoji}>{chore.icon_emoji}</Text>
                <Text style={[styles.choreName, { color: done ? T.muted : T.text }, done && styles.strikethrough]}>
                  {chore.name}
                </Text>
                {chore.difficulty === 'hard' && (
                  <View style={[styles.hardBadge, { borderColor: T.gold }]}>
                    <Text style={[styles.hardText, { color: T.gold }]}>⚡</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {members.length === 0 && (
          <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={[styles.emptyTitle, { color: T.muted }]}>No kids added yet.</Text>
            <Text style={[styles.emptySub, { color: T.muted }]}>Set up your household from Settings to add family members.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  scroll:         { padding: 20, paddingBottom: 40 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  heading:        { fontSize: 24, fontWeight: '900', letterSpacing: 3, marginBottom: 2 },
  sub:            { fontSize: 11, letterSpacing: 2, marginBottom: 20, opacity: 0.6 },
  header:         { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  backText:       { fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  memberHeader:   { alignItems: 'center', marginBottom: 20 },
  avatarLarge:    { fontSize: 64, marginBottom: 8 },
  avatarMid:      { fontSize: 36, marginBottom: 4 },
  memberName:     { fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  memberAge:      { fontSize: 12, opacity: 0.6, marginTop: 2 },
  card:           { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionLabel:   { fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 12, borderLeftWidth: 3, paddingLeft: 10 },
  choreRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' },
  choreEmoji:     { fontSize: 18 },
  choreName:      { flex: 1, fontSize: 15, fontWeight: '500' },
  strikethrough:  { textDecorationLine: 'line-through', opacity: 0.5 },
  hardBadge:      { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  hardText:       { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  allowanceChip:  { fontSize: 12, fontWeight: '700' },
  allDone:        { fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 12 },
  emptyText:      { fontSize: 13, opacity: 0.5, paddingVertical: 8 },
  emptyTitle:     { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  emptySub:       { fontSize: 13, textAlign: 'center', opacity: 0.6, lineHeight: 20 },
  memberScroll:   { marginBottom: 16 },
  memberChip:     { alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 12, marginRight: 10, minWidth: 80 },
  chipName:       { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  chipStreak:     { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  chipStreakNum:  { fontSize: 10, fontWeight: '700' },
  streakRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  streakDot:      { width: 10, height: 10, borderRadius: 5 },
  streakBadge:    { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 4 },
  streakText:     { fontSize: 12, fontWeight: '700' },
  jarWrapper:     { alignItems: 'center', marginVertical: 12 },
  jar:            { width: 120, height: 160, borderRadius: 40, borderWidth: 2, overflow: 'hidden', justifyContent: 'flex-end' },
  jarFill:        { width: '100%' },
  jarBalance:     { fontSize: 28, fontWeight: '900', marginTop: 8 },
  jarGoal:        { fontSize: 11, opacity: 0.6 },
  cashOutBtn:     { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  cashOutText:    { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
});
