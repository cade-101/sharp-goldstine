import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { GroceryNudgeCard } from '../components/GroceryNudgeCard';

const INTEL_EDGE_URL = 'https://rzutjhmaoagjdrjefvzh.supabase.co/functions/v1/intel-processor';

// ── BRAIN STATE ───────────────────────────────────────────────────────────────
const BRAIN_STATES = [
  { id: 'locked_in', label: 'LOCKED IN', emoji: '🎯', desc: 'Clear head, ready to execute' },
  { id: 'drifting', label: 'DRIFTING', emoji: '🌊', desc: 'Scattered — need a mission' },
  { id: 'flow', label: 'FLOW STATE', emoji: '⚡', desc: 'Everything is clicking' },
  { id: 'emergency', label: 'EMERGENCY', emoji: '🚨', desc: 'Overwhelmed — need backup' },
] as const;

type BrainStateId = typeof BRAIN_STATES[number]['id'];

// ── HELPERS ────────────────────────────────────────────────────────────────────
function getGreeting(hour: number, themeName: string): string {
  const timeGreet = hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING';

  const greetings: Record<string, Record<string, string>> = {
    iron: {
      MORNING: 'MORNING BRIEFING. SUIT UP.',
      AFTERNOON: "SITREP — WHAT'S THE STATUS?",
      EVENING: "DEBRIEF. HOW'D THE DAY GO.",
    },
    ronin: {
      MORNING: '\u5922\u660e\u3051 \u2014 THE BLADE IS SHARPEST AT DAWN.',
      AFTERNOON: '\u5348\u5f8c \u2014 STAY FOCUSED ON THE MISSION.',
      EVENING: '\u5915\u66ae\u308c \u2014 A RONIN REFLECTS AT DUSK.',
    },
    valkyrie: {
      MORNING: 'THE VALKYRJUR RISE. TODAY WE CLAIM GLORY.',
      AFTERNOON: 'HOLD THE LINE. VALHALLA WATCHES.',
      EVENING: 'THE SHIELD WALL RESTS. WELL FOUGHT.',
    },
    form: {
      MORNING: "Good morning \u2014 what are we building today?",
      AFTERNOON: "How's the energy? Let's keep it moving.",
      EVENING: 'Winding down. You showed up.',
    },
  };

  return greetings[themeName]?.[timeGreet] ?? greetings.iron[timeGreet];
}

function timeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function dateString(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function WarRoom() {
  const { user, themeTokens: T } = useUser();
  const navigation = useNavigation<any>();

  const [now, setNow] = useState(timeString());
  const [brainState, setBrainState] = useState<BrainStateId | null>(null);
  const [savingBrain, setSavingBrain] = useState(false);

  // Incoming signals (unread props)
  const [signals, setSignals] = useState<Array<{ id: string; from_user: string; message: string; created_at: string }>>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);

  // Partner status
  const [partner, setPartner] = useState<{ username: string; theme: string } | null>(null);

  // Missions (stored locally in memory between mounts, simple strings)
  const [missions, setMissions] = useState<string[]>(['', '', '']);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  // Intel Drop
  const [intelDropping, setIntelDropping] = useState(false);
  const [intelResult, setIntelResult] = useState<{ itemsLogged: number; routedTo: string[]; store?: string } | null>(null);

  // Grocery nudges
  const [nudges, setNudges] = useState<Array<{
    id: string; item_name: string; store: string; discount_pct: number; sale_price: number; reason: string;
  }>>([]);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setNow(timeString()), 30000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(useCallback(() => {
    loadSignals();
    loadPartner();
    loadNudges();
  }, [user?.house_name, user?.id]));

  async function loadSignals() {
    if (!user?.id) return;
    setLoadingSignals(true);
    const { data } = await supabase
      .from('props')
      .select('id, from_user, message, created_at')
      .eq('to_user', user.id)
      .eq('seen', false)
      .eq('event_type', 'signal')
      .order('created_at', { ascending: false })
      .limit(5);
    setSignals(data ?? []);
    setLoadingSignals(false);
  }

  async function dismissSignal(id: string) {
    await supabase.from('props').update({ seen: true }).eq('id', id);
    setSignals(prev => prev.filter(s => s.id !== id));
  }

  async function loadPartner() {
    if (!user?.house_name || !user?.id) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('username, theme')
      .eq('house_name', user.house_name)
      .neq('id', user.id)
      .single();
    setPartner(data ?? null);
  }

  async function loadNudges() {
    if (!user?.house_name) return;
    const { data } = await supabase
      .from('grocery_nudges')
      .select('id, item_name, store, discount_pct, sale_price, reason')
      .eq('household_id', user.house_name)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(5);
    setNudges(data ?? []);
  }

  async function dismissNudge(id: string) {
    await supabase.from('grocery_nudges').update({ dismissed: true }).eq('id', id);
    setNudges(prev => prev.filter(n => n.id !== id));
  }

  async function handleIntelDrop() {
    if (!user?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to use Intel Drop.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    setIntelDropping(true);
    setIntelResult(null);

    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const fetchResp = await fetch(asset.uri);
      const blob = await fetchResp.blob();
      const { error: uploadErr } = await supabase.storage
        .from('intel-drops')
        .upload(path, blob, { contentType: asset.mimeType ?? 'image/jpeg' });

      if (uploadErr) throw new Error(uploadErr.message);

      // Call Edge Function
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const resp = await fetch(INTEL_EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrl: path,
          userId: user.id,
          householdId: user.house_name,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? 'Processing failed');

      setIntelResult({
        itemsLogged: data.itemsLogged,
        routedTo: data.routedTo,
        store: data.store,
      });
    } catch (err) {
      Alert.alert('Intel Drop failed', String(err));
    } finally {
      setIntelDropping(false);
    }
  }

  async function selectBrainState(state: BrainStateId) {
    if (!user?.id) return;
    setSavingBrain(true);
    setBrainState(state);
    await supabase.from('user_context_snapshots').insert({
      user_id: user.id,
      brain_state: state,
      captured_at: new Date().toISOString(),
    });
    setSavingBrain(false);
  }

  function saveMission(idx: number) {
    const updated = [...missions];
    updated[idx] = editText;
    setMissions(updated);
    setEditingIdx(null);
    setEditText('');
  }

  const s = makeStyles(T);
  const hour = new Date().getHours();
  const greeting = getGreeting(hour, user?.theme ?? 'iron');
  const themeBadge = (user?.theme ?? 'iron').toUpperCase();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={T.mode === 'light' ? 'dark-content' : 'light-content'} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── MORNING BRIEFING HEADER ─────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <Text style={s.clock}>{now}</Text>
            <View style={s.themeBadge}>
              <Text style={s.themeBadgeText}>{themeBadge}</Text>
            </View>
          </View>
          <Text style={s.date}>{dateString()}</Text>
          <Text style={s.greeting}>{greeting}</Text>
          {user?.username && (
            <Text style={s.callsign}>OPERATIVE: {user.username.toUpperCase()}</Text>
          )}
        </View>

        {/* ── INTEL DROP ──────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <TouchableOpacity
            style={s.intelBtn}
            onPress={handleIntelDrop}
            disabled={intelDropping}
            activeOpacity={0.8}
          >
            {intelDropping ? (
              <ActivityIndicator color={T.bg} size="small" />
            ) : (
              <Text style={s.intelIcon}>📸</Text>
            )}
            <View>
              <Text style={s.intelLabel}>INTEL DROP</Text>
              <Text style={s.intelSub}>
                {intelDropping ? 'Analyzing receipt...' : 'Receipt or cart screenshot → auto-sorted'}
              </Text>
            </View>
          </TouchableOpacity>
          {intelResult && (
            <View style={s.intelResult}>
              <Text style={s.intelResultText}>
                ✓ {intelResult.itemsLogged} items logged
                {intelResult.store ? ` from ${intelResult.store}` : ''}
                {' → '}{intelResult.routedTo.join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* ── GROCERY NUDGES ───────────────────────────────────────────────────── */}
        {nudges.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>INTEL — DEALS DETECTED</Text>
            {nudges.map(n => (
              <GroceryNudgeCard
                key={n.id}
                itemName={n.item_name}
                store={n.store}
                discountPct={n.discount_pct}
                salePrice={n.sale_price}
                reason={n.reason}
                onDismiss={() => dismissNudge(n.id)}
              />
            ))}
          </View>
        )}

        {/* ── BRAIN STATE ─────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>BRAIN STATE</Text>
          <View style={s.brainGrid}>
            {BRAIN_STATES.map(bs => {
              const active = brainState === bs.id;
              return (
                <TouchableOpacity
                  key={bs.id}
                  style={[s.brainCard, active && s.brainCardActive]}
                  onPress={() => selectBrainState(bs.id)}
                  disabled={savingBrain}
                  activeOpacity={0.75}
                >
                  <Text style={s.brainEmoji}>{bs.emoji}</Text>
                  <Text style={[s.brainLabel, active && s.brainLabelActive]}>{bs.label}</Text>
                  <Text style={s.brainDesc}>{bs.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── TODAY'S MISSIONS ─────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>TODAY'S MISSIONS</Text>
          {missions.map((m, i) => (
            <View key={i} style={s.missionRow}>
              <Text style={s.missionNum}>{i + 1}</Text>
              {editingIdx === i ? (
                <TextInput
                  style={s.missionInput}
                  value={editText}
                  onChangeText={setEditText}
                  onSubmitEditing={() => saveMission(i)}
                  onBlur={() => saveMission(i)}
                  autoFocus
                  returnKeyType="done"
                  placeholderTextColor={T.muted}
                  placeholder="Enter mission..."
                />
              ) : (
                <TouchableOpacity
                  style={s.missionTextWrap}
                  onPress={() => { setEditingIdx(i); setEditText(m); }}
                  activeOpacity={0.7}
                >
                  <Text style={m ? s.missionText : s.missionPlaceholder}>
                    {m || 'TAP TO SET MISSION...'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* ── INCOMING SIGNALS ─────────────────────────────────────────────────── */}
        {(signals.length > 0 || loadingSignals) && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>INCOMING SIGNALS</Text>
            {loadingSignals ? (
              <ActivityIndicator color={T.accent} />
            ) : (
              signals.map(sig => (
                <View key={sig.id} style={s.signalCard}>
                  <View style={s.signalContent}>
                    <Text style={s.signalFrom}>{sig.from_user}</Text>
                    <Text style={s.signalMsg}>{sig.message}</Text>
                  </View>
                  <TouchableOpacity style={s.dismissBtn} onPress={() => dismissSignal(sig.id)}>
                    <Text style={s.dismissText}>✓</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── ALLIED FORCES ────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ALLIED FORCES</Text>
          <View style={s.allyCard}>
            {partner ? (
              <>
                <View style={s.allyDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.allyName}>{partner.username?.toUpperCase()}</Text>
                  <Text style={s.allyTheme}>OPERATIVE — {partner.theme?.toUpperCase()}</Text>
                </View>
                <Text style={s.allyStatus}>LINKED</Text>
              </>
            ) : (
              <Text style={s.muted}>No partner linked — invite in Settings</Text>
            )}
          </View>
          {user?.house_name && (
            <Text style={s.houseName}>⌂ {user.house_name}</Text>
          )}
        </View>

        {/* ── QUICK ACTIONS ────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>QUICK ACCESS</Text>
          <View style={s.quickRow}>
            {[
              { label: 'WORK', icon: '⏱', screen: 'Workday' },
              { label: 'FIT', icon: '💪', screen: 'Fitness' },
              { label: 'ARMORY', icon: '💰', screen: 'Budget' },
              { label: 'OPS', icon: '⚙️', screen: 'Settings' },
            ].map(q => (
              <TouchableOpacity
                key={q.screen}
                style={s.quickBtn}
                onPress={() => navigation.navigate(q.screen)}
                activeOpacity={0.75}
              >
                <Text style={s.quickIcon}>{q.icon}</Text>
                <Text style={s.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
function makeStyles(T: ReturnType<typeof import('../themes').getTheme>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    scroll: { paddingHorizontal: 20 },
    header: {
      paddingTop: 20,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
      marginBottom: 24,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    clock: {
      fontSize: 38,
      fontWeight: '900',
      color: T.text,
      letterSpacing: -1,
    },
    themeBadge: {
      backgroundColor: T.accentBg,
      borderWidth: 1,
      borderColor: T.accent,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    themeBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: T.accent,
      letterSpacing: 2,
    },
    date: {
      fontSize: 11,
      color: T.muted,
      letterSpacing: 2,
      marginBottom: 12,
    },
    greeting: {
      fontSize: 16,
      fontWeight: '700',
      color: T.text,
      lineHeight: 22,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    callsign: {
      fontSize: 10,
      color: T.muted,
      letterSpacing: 3,
    },
    section: {
      marginBottom: 28,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: T.accent,
      letterSpacing: 3,
      marginBottom: 12,
    },
    // Brain state
    brainGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    brainCard: {
      width: '47%',
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 12,
      padding: 14,
      alignItems: 'flex-start',
    },
    brainCardActive: {
      borderColor: T.accent,
      backgroundColor: T.accentBg,
    },
    brainEmoji: {
      fontSize: 22,
      marginBottom: 6,
    },
    brainLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: T.muted,
      letterSpacing: 1.5,
      marginBottom: 4,
    },
    brainLabelActive: {
      color: T.accent,
    },
    brainDesc: {
      fontSize: 10,
      color: T.muted,
      lineHeight: 14,
    },
    // Missions
    missionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: T.border,
      paddingVertical: 14,
      gap: 12,
    },
    missionNum: {
      fontSize: 13,
      fontWeight: '800',
      color: T.accent,
      width: 16,
      textAlign: 'center',
    },
    missionTextWrap: { flex: 1 },
    missionText: {
      fontSize: 14,
      color: T.text,
      fontWeight: '500',
    },
    missionPlaceholder: {
      fontSize: 12,
      color: T.muted,
      letterSpacing: 1,
    },
    missionInput: {
      flex: 1,
      fontSize: 14,
      color: T.text,
      paddingVertical: 0,
    },
    // Signals
    signalCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.accent,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
    },
    signalContent: { flex: 1 },
    signalFrom: {
      fontSize: 10,
      fontWeight: '800',
      color: T.accent,
      letterSpacing: 2,
      marginBottom: 4,
    },
    signalMsg: {
      fontSize: 14,
      color: T.text,
    },
    dismissBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: T.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: T.accent,
    },
    dismissText: {
      color: T.accent,
      fontSize: 16,
      fontWeight: '800',
    },
    // Allied Forces
    allyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    allyDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: T.green,
    },
    allyName: {
      fontSize: 14,
      fontWeight: '800',
      color: T.text,
      letterSpacing: 1,
    },
    allyTheme: {
      fontSize: 10,
      color: T.muted,
      letterSpacing: 1.5,
      marginTop: 2,
    },
    allyStatus: {
      fontSize: 9,
      fontWeight: '800',
      color: T.green,
      letterSpacing: 2,
    },
    houseName: {
      fontSize: 11,
      color: T.muted,
      textAlign: 'center',
      marginTop: 10,
      letterSpacing: 1,
    },
    muted: {
      fontSize: 13,
      color: T.muted,
    },
    // Quick access
    quickRow: {
      flexDirection: 'row',
      gap: 10,
    },
    quickBtn: {
      flex: 1,
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    quickIcon: {
      fontSize: 22,
      marginBottom: 6,
    },
    quickLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: T.muted,
      letterSpacing: 1.5,
    },
    // Intel Drop
    intelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: T.card,
      borderWidth: 2,
      borderColor: T.accent,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    intelIcon: {
      fontSize: 28,
    },
    intelLabel: {
      fontSize: 14,
      fontWeight: '900',
      color: T.accent,
      letterSpacing: 2,
    },
    intelSub: {
      fontSize: 11,
      color: T.muted,
      marginTop: 2,
    },
    intelResult: {
      marginTop: 10,
      backgroundColor: T.accentBg,
      borderRadius: 8,
      padding: 12,
    },
    intelResultText: {
      fontSize: 12,
      color: T.accent,
      fontWeight: '600',
    },
  });
}
