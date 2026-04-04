import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Switch, ActivityIndicator,
} from 'react-native';
import { Moon, AlertTriangle, Check, ChevronLeft } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { getRecentNightmareEvents, acknowledgeNightmareEvent, markFalsePositive } from '../lib/nightmareDetector';

type Sensitivity = 'light' | 'standard' | 'aggressive';
type NightmareEvent = {
  id: string;
  detected_at: string;
  hr_spike_bpm: number | null;
  hrv_drop_ms: number | null;
  acknowledged: boolean;
  false_positive: boolean;
};

const SENSITIVITY_OPTIONS: { id: Sensitivity; label: string; desc: string }[] = [
  { id: 'light',      label: 'LIGHT',      desc: 'HR spike >40 bpm above baseline' },
  { id: 'standard',   label: 'STANDARD',   desc: 'HR spike >30 bpm above baseline' },
  { id: 'aggressive', label: 'AGGRESSIVE', desc: 'HR spike >20 bpm above baseline' },
];

export default function NightmareSettings({ onBack }: { onBack?: () => void }) {
  const { user, themeTokens: T, refreshUser } = useUser();
  const cfg = user?.nightmare_config;

  const [sensitivity, setSensitivity] = useState<Sensitivity>(cfg?.sensitivity ?? 'standard');
  const [partnerNotify, setPartnerNotify] = useState(cfg?.partnerNotifyEnabled ?? false);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<NightmareEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoadingEvents(true);
    getRecentNightmareEvents(user.id, 8)
      .then(data => setEvents(data as NightmareEvent[]))
      .finally(() => setLoadingEvents(false));
  }, [user?.id]);

  async function saveConfig() {
    if (!user?.id) return;
    setSaving(true);
    try {
      const updated = {
        ...(cfg ?? {}),
        sensitivity,
        partnerNotifyEnabled: partnerNotify,
      };
      await supabase
        .from('user_profiles')
        .update({ nightmare_config: updated })
        .eq('id', user.id);
      await refreshUser();
    } finally {
      setSaving(false);
    }
  }

  async function handleAcknowledge(id: string) {
    await acknowledgeNightmareEvent(id);
    setEvents(ev => ev.map(e => e.id === id ? { ...e, acknowledged: true } : e));
  }

  async function handleFalsePositive(id: string) {
    await markFalsePositive(id);
    setEvents(ev => ev.map(e => e.id === id ? { ...e, acknowledged: true, false_positive: true } : e));
  }

  const calibrationNights = cfg?.calibrationNights ?? 0;
  const calibrationComplete = cfg?.calibrationComplete ?? false;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { borderBottomColor: T.border + '30' }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 }} activeOpacity={0.7}>
            <ChevronLeft size={16} color={T.accent} />
            <Text style={{ fontSize: 12, color: T.accent, fontWeight: '600', letterSpacing: 1 }}>BACK</Text>
          </TouchableOpacity>
        )}
        <Moon size={20} color={T.accent} />
        <Text style={[styles.headerTitle, { color: T.text }]}>NIGHTMARE WATCH</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Calibration Status */}
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border + '30' }]}>
          <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>
            CALIBRATION
          </Text>
          {calibrationComplete ? (
            <View style={styles.row}>
              <Check size={18} color={T.green ?? '#4ade80'} />
              <Text style={[styles.calibDone, { color: T.green ?? '#4ade80' }]}>
                BASELINE ESTABLISHED
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.progressBar, { backgroundColor: T.border }]}>
                <View style={[
                  styles.progressFill,
                  { backgroundColor: T.accent, width: `${Math.min((calibrationNights / 7) * 100, 100)}%` as any },
                ]} />
              </View>
              <Text style={[styles.calibNote, { color: T.muted }]}>
                {calibrationNights} / 7 nights — wear your watch while sleeping to build your baseline
              </Text>
            </>
          )}
          {cfg?.baselineHR && (
            <Text style={[styles.baselineText, { color: T.muted }]}>
              Baseline HR: {cfg.baselineHR} bpm
              {cfg.baselineHRV ? `  ·  HRV: ${cfg.baselineHRV} ms` : ''}
            </Text>
          )}
        </View>

        {/* Sensitivity */}
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border + '30' }]}>
          <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>
            SENSITIVITY
          </Text>
          <View style={styles.chipRow}>
            {SENSITIVITY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.chip,
                  {
                    borderColor: sensitivity === opt.id ? T.accent : T.border,
                    backgroundColor: sensitivity === opt.id ? T.accent + '18' : 'transparent',
                  },
                ]}
                onPress={() => setSensitivity(opt.id)}
              >
                <Text style={[styles.chipText, { color: sensitivity === opt.id ? T.accent : T.muted }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.sensitivityDesc, { color: T.muted }]}>
            {SENSITIVITY_OPTIONS.find(o => o.id === sensitivity)?.desc}
          </Text>
        </View>

        {/* Partner Notify */}
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border + '30' }]}>
          <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>
            PARTNER ALERT
          </Text>
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: T.text }]}>Notify partner</Text>
              <Text style={[styles.toggleSub, { color: T.muted }]}>
                Send a push when a nightmare pattern is detected
              </Text>
            </View>
            <Switch
              value={partnerNotify}
              onValueChange={setPartnerNotify}
              trackColor={{ false: T.border, true: T.accent + '80' }}
              thumbColor={partnerNotify ? T.accent : T.muted}
            />
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={saveConfig}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: T.accent }]}
        >
          {saving
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={styles.saveBtnText}>SAVE SETTINGS</Text>
          }
        </TouchableOpacity>

        {/* Recent Events */}
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border + '30' }]}>
          <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>
            RECENT EVENTS
          </Text>
          {loadingEvents && <ActivityIndicator color={T.accent} style={{ marginVertical: 12 }} />}
          {!loadingEvents && events.length === 0 && (
            <Text style={[styles.noEvents, { color: T.muted }]}>No events detected yet.</Text>
          )}
          {events.map(ev => (
            <View
              key={ev.id}
              style={[styles.eventRow, { borderTopColor: T.border + '20', opacity: ev.acknowledged ? 0.45 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.eventDate, { color: T.text }]}>
                  {new Date(ev.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={[styles.eventDetail, { color: T.muted }]}>
                  {ev.hr_spike_bpm ? `HR +${ev.hr_spike_bpm} bpm` : ''}
                  {ev.hr_spike_bpm && ev.hrv_drop_ms ? '  ·  ' : ''}
                  {ev.hrv_drop_ms ? `HRV −${ev.hrv_drop_ms} ms` : ''}
                  {ev.false_positive ? '  ·  FALSE POSITIVE' : ''}
                </Text>
              </View>
              {!ev.acknowledged && (
                <View style={{ gap: 6 }}>
                  <TouchableOpacity onPress={() => handleAcknowledge(ev.id)}>
                    <Text style={{ color: T.accent, fontSize: 10, letterSpacing: 1, fontWeight: '700' }}>ACK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleFalsePositive(ev.id)}>
                    <Text style={{ color: T.muted, fontSize: 10, letterSpacing: 1 }}>FALSE</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Clinical Note */}
        <View style={[styles.clinicalNote, { borderColor: T.border + '30' }]}>
          <AlertTriangle size={14} color={T.muted} style={{ marginRight: 8 }} />
          <Text style={[styles.clinicalText, { color: T.muted }]}>
            Nightmare Watch detects autonomic arousal patterns during sleep — not clinical diagnoses. If recurring nightmares are affecting your daily life, speak with a healthcare provider.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  scroll: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 60 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '700',
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calibDone: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 4, borderRadius: 2 },
  calibNote: { fontSize: 12, lineHeight: 18 },
  baselineText: { fontSize: 11, marginTop: 8, letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  chipText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  sensitivityDesc: { fontSize: 11, lineHeight: 16 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  toggleSub: { fontSize: 11, lineHeight: 16 },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 13, letterSpacing: 2 },
  noEvents: { fontSize: 12, fontStyle: 'italic', paddingVertical: 8 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  eventDate: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  eventDetail: { fontSize: 11 },
  clinicalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  clinicalText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
