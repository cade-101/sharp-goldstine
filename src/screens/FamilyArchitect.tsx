import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, TextInput, StatusBar, ActivityIndicator,
} from 'react-native';
import { ChevronLeft, ChevronRight, Check, Plus, Trash2, Users } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

interface Member {
  name: string;
  role: 'adult' | 'child' | 'teen' | 'toddler';
  avatar_emoji: string;
}

interface ChoreRow {
  title: string;
  assigned_to: string;
  points: number;
  recurrence: 'daily' | 'weekly';
}

interface MorningStep {
  label: string;
  minutes: number;
}

const ROLE_LABELS: Record<Member['role'], string> = {
  adult: 'Adult', teen: 'Teen (13-17)', child: 'Child (5-12)', toddler: 'Toddler (<5)',
};

const ROLE_EMOJIS: Record<Member['role'], string> = {
  adult: '🧑', teen: '🧒', child: '👦', toddler: '👶',
};

const DEFAULT_MORNING_STEPS: MorningStep[] = [
  { label: 'Wake up / no phone', minutes: 5 },
  { label: 'Wash face + brush teeth', minutes: 10 },
  { label: 'Get dressed', minutes: 10 },
  { label: 'Breakfast', minutes: 15 },
];

const DEFAULT_CHORES: ChoreRow[] = [
  { title: 'Clear dinner table', assigned_to: '', points: 2, recurrence: 'daily' },
  { title: 'Load dishwasher', assigned_to: '', points: 2, recurrence: 'daily' },
  { title: 'Take out trash', assigned_to: '', points: 3, recurrence: 'weekly' },
  { title: 'Tidy bedroom', assigned_to: '', points: 2, recurrence: 'daily' },
];

export default function FamilyArchitect({ onClose }: { onClose: () => void }) {
  const { user, themeTokens: T } = useUser();
  const [session, setSession] = useState(0);
  const [saving, setSaving] = useState(false);

  // Session 1 — Members
  const [members, setMembers] = useState<Member[]>([
    { name: '', role: 'adult', avatar_emoji: '🧑' },
  ]);

  // Session 2 — Work/commute
  const [workNote, setWorkNote] = useState('');
  const [commuteNote, setCommuteNote] = useState('');

  // Session 3 — Kids/school
  const [schoolNote, setSchoolNote] = useState('');
  const [pickupNote, setPickupNote] = useState('');

  // Session 4 — Morning sequence
  const [morningSteps, setMorningSteps] = useState<MorningStep[]>(DEFAULT_MORNING_STEPS);

  // Session 5 — Chores
  const [chores, setChores] = useState<ChoreRow[]>(DEFAULT_CHORES);

  const houseName = user?.house_name ?? '';
  const isLight = T.mode === 'light';

  // ── SAVE HELPERS ──────────────────────────────────────────────────────────────

  async function saveSession1() {
    if (!houseName) return;
    const rows = members.filter(m => m.name.trim()).map(m => ({
      house_name: houseName,
      name: m.name.trim(),
      role: m.role,
      avatar_emoji: ROLE_EMOJIS[m.role],
    }));
    if (rows.length) await supabase.from('household_members').insert(rows);
  }

  async function saveSession2() {
    if (!houseName) return;
    await supabase.from('family_architect_progress').upsert({
      house_name: houseName,
      data: { work_note: workNote, commute_note: commuteNote },
      current_session: 2,
    }, { onConflict: 'house_name' });
  }

  async function saveSession3() {
    if (!houseName) return;
    await supabase.from('family_architect_progress').upsert({
      house_name: houseName,
      data: { school_note: schoolNote, pickup_note: pickupNote },
      current_session: 3,
    }, { onConflict: 'house_name' });
  }

  async function saveSession4() {
    if (!houseName) return;
    await supabase.from('morning_sequences').insert({
      house_name: houseName,
      steps: morningSteps,
      total_minutes: morningSteps.reduce((s, m) => s + m.minutes, 0),
    });
  }

  async function saveSession5() {
    if (!houseName) return;
    const rows = chores.filter(c => c.title.trim()).map(c => ({
      house_name: houseName,
      title: c.title.trim(),
      assigned_to: c.assigned_to || null,
      points: c.points,
      recurrence: c.recurrence,
    }));
    if (rows.length) await supabase.from('chore_definitions').insert(rows);
  }

  async function saveSession6() {
    if (!houseName) return;
    await supabase.from('family_architect_progress').upsert({
      house_name: houseName,
      current_session: 6,
      completed: true,
    }, { onConflict: 'house_name' });
  }

  const SAVE_FNS = [saveSession1, saveSession2, saveSession3, saveSession4, saveSession5, saveSession6];

  async function handleNext() {
    setSaving(true);
    try { await SAVE_FNS[session](); } catch { /* non-blocking */ }
    setSaving(false);
    if (session >= 5) { onClose(); return; }
    setSession(s => s + 1);
  }

  // ── MEMBER HELPERS ────────────────────────────────────────────────────────────

  function updateMember(i: number, patch: Partial<Member>) {
    setMembers(prev => prev.map((m, j) => j === i ? { ...m, ...patch } : m));
  }

  // ── SESSION RENDERERS ─────────────────────────────────────────────────────────

  function renderSession() {
    switch (session) {
      case 0: return (
        <View style={styles.body}>
          <Text style={[styles.sessionLabel, { color: T.muted }]}>SESSION 1 OF 6</Text>
          <Text style={[styles.sessionTitle, { color: T.text }]}>Who's in the house?</Text>
          <Text style={[styles.sessionSub, { color: T.muted }]}>Add everyone. Kids, partners, whoever lives here.</Text>
          <View style={{ gap: 12, marginTop: 8 }}>
            {members.map((m, i) => (
              <View key={i} style={[styles.memberRow, { backgroundColor: T.card, borderColor: T.border }]}>
                <Text style={{ fontSize: 22 }}>{ROLE_EMOJIS[m.role]}</Text>
                <TextInput
                  style={[styles.nameInput, { color: T.text, borderColor: T.border }]}
                  placeholder="Name"
                  placeholderTextColor={T.muted}
                  value={m.name}
                  onChangeText={v => updateMember(i, { name: v })}
                />
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {(['adult','teen','child','toddler'] as Member['role'][]).map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.rolePill, { borderColor: m.role === role ? T.accent : T.border, backgroundColor: m.role === role ? T.accentBg : 'transparent' }]}
                      onPress={() => updateMember(i, { role })}
                    >
                      <Text style={{ fontSize: 9, color: m.role === role ? T.accent : T.muted, fontWeight: '700', letterSpacing: 1 }}>
                        {role.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {members.length > 1 && (
                  <TouchableOpacity onPress={() => setMembers(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 size={14} color={T.muted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addBtn, { borderColor: T.accent }]}
              onPress={() => setMembers(prev => [...prev, { name: '', role: 'child', avatar_emoji: '👦' }])}
            >
              <Plus size={16} color={T.accent} />
              <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>ADD PERSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      );

      case 1: return (
        <View style={styles.body}>
          <Text style={[styles.sessionLabel, { color: T.muted }]}>SESSION 2 OF 6</Text>
          <Text style={[styles.sessionTitle, { color: T.text }]}>Work & Commute</Text>
          <Text style={[styles.sessionSub, { color: T.muted }]}>Helps Tether understand your schedule patterns.</Text>
          <View style={{ gap: 16, marginTop: 8 }}>
            <View>
              <Text style={[styles.fieldLabel, { color: T.muted }]}>WORK SCHEDULE</Text>
              <TextInput
                style={[styles.textArea, { color: T.text, borderColor: T.border, backgroundColor: T.card }]}
                placeholder="e.g. Mon–Fri 9am–5pm, remote Wednesdays"
                placeholderTextColor={T.muted}
                value={workNote}
                onChangeText={setWorkNote}
                multiline
              />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: T.muted }]}>COMMUTE</Text>
              <TextInput
                style={[styles.textArea, { color: T.text, borderColor: T.border, backgroundColor: T.card }]}
                placeholder="e.g. 35 min each way, drive"
                placeholderTextColor={T.muted}
                value={commuteNote}
                onChangeText={setCommuteNote}
                multiline
              />
            </View>
          </View>
        </View>
      );

      case 2: return (
        <View style={styles.body}>
          <Text style={[styles.sessionLabel, { color: T.muted }]}>SESSION 3 OF 6</Text>
          <Text style={[styles.sessionTitle, { color: T.text }]}>Kids & School</Text>
          <Text style={[styles.sessionSub, { color: T.muted }]}>School times, pickup, activities — whatever matters.</Text>
          <View style={{ gap: 16, marginTop: 8 }}>
            <View>
              <Text style={[styles.fieldLabel, { color: T.muted }]}>SCHOOL HOURS</Text>
              <TextInput
                style={[styles.textArea, { color: T.text, borderColor: T.border, backgroundColor: T.card }]}
                placeholder="e.g. 8:30am drop-off, 3pm pickup"
                placeholderTextColor={T.muted}
                value={schoolNote}
                onChangeText={setSchoolNote}
                multiline
              />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: T.muted }]}>AFTER-SCHOOL / ACTIVITIES</Text>
              <TextInput
                style={[styles.textArea, { color: T.text, borderColor: T.border, backgroundColor: T.card }]}
                placeholder="e.g. Soccer Tues/Thurs, Grandma pickup Fridays"
                placeholderTextColor={T.muted}
                value={pickupNote}
                onChangeText={setPickupNote}
                multiline
              />
            </View>
          </View>
        </View>
      );

      case 3: return (
        <View style={styles.body}>
          <Text style={[styles.sessionLabel, { color: T.muted }]}>SESSION 4 OF 6</Text>
          <Text style={[styles.sessionTitle, { color: T.text }]}>Morning Sequence</Text>
          <Text style={[styles.sessionSub, { color: T.muted }]}>Build your household's morning flow. Adjust times.</Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            {morningSteps.map((step, i) => (
              <View key={i} style={[styles.stepRow, { backgroundColor: T.card, borderColor: T.border }]}>
                <TextInput
                  style={[styles.stepInput, { color: T.text }]}
                  value={step.label}
                  onChangeText={v => setMorningSteps(prev => prev.map((s, j) => j === i ? { ...s, label: v } : s))}
                  placeholderTextColor={T.muted}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TouchableOpacity onPress={() => setMorningSteps(prev => prev.map((s, j) => j === i ? { ...s, minutes: Math.max(1, s.minutes - 5) } : s))}>
                    <Text style={{ color: T.muted, fontSize: 18, width: 24, textAlign: 'center' }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700', width: 36, textAlign: 'center' }}>{step.minutes}m</Text>
                  <TouchableOpacity onPress={() => setMorningSteps(prev => prev.map((s, j) => j === i ? { ...s, minutes: s.minutes + 5 } : s))}>
                    <Text style={{ color: T.muted, fontSize: 18, width: 24, textAlign: 'center' }}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMorningSteps(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 size={13} color={T.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addBtn, { borderColor: T.accent }]}
              onPress={() => setMorningSteps(prev => [...prev, { label: '', minutes: 10 }])}
            >
              <Plus size={16} color={T.accent} />
              <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>ADD STEP</Text>
            </TouchableOpacity>
            <Text style={{ color: T.muted, fontSize: 12, textAlign: 'right' }}>
              Total: {morningSteps.reduce((s, m) => s + m.minutes, 0)} min
            </Text>
          </View>
        </View>
      );

      case 4: return (
        <View style={styles.body}>
          <Text style={[styles.sessionLabel, { color: T.muted }]}>SESSION 5 OF 6</Text>
          <Text style={[styles.sessionTitle, { color: T.text }]}>Chore Chart</Text>
          <Text style={[styles.sessionSub, { color: T.muted }]}>Assign jobs. Points auto-flow to allowance.</Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            {chores.map((c, i) => (
              <View key={i} style={[styles.choreRow, { backgroundColor: T.card, borderColor: T.border }]}>
                <TextInput
                  style={[styles.choreInput, { color: T.text }]}
                  value={c.title}
                  onChangeText={v => setChores(prev => prev.map((r, j) => j === i ? { ...r, title: v } : r))}
                  placeholderTextColor={T.muted}
                  placeholder="Chore name"
                />
                <TextInput
                  style={[styles.choreAssign, { color: T.text, borderColor: T.border }]}
                  value={c.assigned_to}
                  onChangeText={v => setChores(prev => prev.map((r, j) => j === i ? { ...r, assigned_to: v } : r))}
                  placeholderTextColor={T.muted}
                  placeholder="Who?"
                />
                <TouchableOpacity onPress={() => setChores(prev => prev.filter((_, j) => j !== i))}>
                  <Trash2 size={13} color={T.muted} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addBtn, { borderColor: T.accent }]}
              onPress={() => setChores(prev => [...prev, { title: '', assigned_to: '', points: 2, recurrence: 'daily' }])}
            >
              <Plus size={16} color={T.accent} />
              <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>ADD CHORE</Text>
            </TouchableOpacity>
          </View>
        </View>
      );

      case 5: return (
        <View style={[styles.body, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
          <Users size={52} color={T.accent} />
          <Text style={[styles.sessionLabel, { color: T.muted, textAlign: 'center', marginTop: 20 }]}>SESSION 6 OF 6</Text>
          <Text style={[styles.sessionTitle, { color: T.text, textAlign: 'center' }]}>You're set up.</Text>
          <Text style={[styles.sessionSub, { color: T.muted, textAlign: 'center' }]}>
            Chore chart, morning routine, and household members are saved.{'\n'}
            You can adjust any of this from the Family tab.
          </Text>
        </View>
      );

      default: return null;
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={session > 0 ? () => setSession(s => s - 1) : onClose} style={styles.backBtn}>
          <ChevronLeft size={20} color={T.muted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: T.text }]}>FAMILY ARCHITECT</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              { backgroundColor: i <= session ? T.accent : T.border },
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {renderSession()}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { borderTopColor: T.border }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: T.accent }, saving && { opacity: 0.6 }]}
          onPress={handleNext}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={T.bg} />
            : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {session === 5
                  ? <Check size={18} color={T.bg} />
                  : <ChevronRight size={18} color={T.bg} />}
                <Text style={[styles.nextBtnText, { color: T.bg }]}>
                  {session === 5 ? 'FINISH' : 'NEXT'}
                </Text>
              </View>
            )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center' },
  progressDot: { width: 28, height: 4, borderRadius: 2 },
  body: { padding: 24, gap: 6 },
  sessionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  sessionTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },
  sessionSub: { fontSize: 14, lineHeight: 21, marginBottom: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 14, minHeight: 72, textAlignVertical: 'top', lineHeight: 21 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  nameInput: { flex: 1, borderBottomWidth: 1, paddingVertical: 4, fontSize: 15, fontWeight: '600' },
  rolePill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, borderStyle: 'dashed', paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  stepInput: { flex: 1, fontSize: 14 },
  choreRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  choreInput: { flex: 2, fontSize: 13 },
  choreAssign: { flex: 1, borderBottomWidth: 1, fontSize: 12, paddingVertical: 2 },
  footer: { padding: 20, borderTopWidth: 1 },
  nextBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { fontSize: 15, fontWeight: '800', letterSpacing: 2 },
});
