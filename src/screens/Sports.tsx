import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, TextInput, StatusBar, ActivityIndicator,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Trophy, Calendar, ChevronLeft, Plus, Bell } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

interface SportsProfile {
  id: string;
  sport: string;
  team_name: string;
  member_id: string | null;
}

interface SportsEvent {
  id: string;
  sports_profile_id: string;
  title: string;
  event_type: string;
  event_date: string;
  location: string;
  equipment_checklist: string[];
  reminder_sent: boolean;
}

export default function Sports({ onClose }: { onClose: () => void }) {
  const { user, themeTokens: T } = useUser();
  const [profiles, setProfiles] = useState<SportsProfile[]>([]);
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProfile, setAddingProfile] = useState(false);
  const [newSport, setNewSport] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [saving, setSaving] = useState(false);

  const isLight = T.mode === 'light';

  useEffect(() => { load(); }, []);

  async function load() {
    if (!user?.house_name) { setLoading(false); return; }
    setLoading(true);
    const [pRes, eRes] = await Promise.all([
      supabase.from('sports_profiles').select('*').eq('house_name', user.house_name),
      supabase.from('sports_events').select('*').eq('house_name', user.house_name)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(20),
    ]);
    setProfiles((pRes.data ?? []) as SportsProfile[]);
    setEvents((eRes.data ?? []) as SportsEvent[]);
    setLoading(false);
  }

  async function saveProfile() {
    if (!newSport.trim() || !user?.house_name) return;
    setSaving(true);
    await supabase.from('sports_profiles').insert({
      house_name: user.house_name,
      sport: newSport.trim(),
      team_name: newTeam.trim(),
    });
    setNewSport('');
    setNewTeam('');
    setAddingProfile(false);
    setSaving(false);
    await load();
  }

  async function scheduleEventReminder(event: SportsEvent) {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const eventDate = new Date(event.event_date);
      const reminderDate = new Date(eventDate.getTime() - 60 * 60 * 1000); // 1hr before
      if (reminderDate < new Date()) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🏆 ${event.title ?? 'Game'} in 1 hour`,
          body: event.location ? `📍 ${event.location}` : 'Check equipment and get ready.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        } as any,
      });

      await supabase.from('sports_events').update({ reminder_sent: true }).eq('id', event.id);
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, reminder_sent: true } : e));
    } catch { /* non-blocking */ }
  }

  function formatEventDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={onClose}><ChevronLeft size={22} color={T.muted} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: T.text }]}>SPORTS</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={T.accent} style={{ flex: 1 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>

          {/* Sports profiles */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: T.muted }]}>ACTIVE SPORTS</Text>
              <TouchableOpacity onPress={() => setAddingProfile(v => !v)}>
                <Plus size={18} color={T.accent} />
              </TouchableOpacity>
            </View>

            {addingProfile && (
              <View style={[styles.card, { backgroundColor: T.card, borderColor: T.accent, marginBottom: 12, gap: 10 }]}>
                <TextInput
                  style={[styles.input, { color: T.text, borderColor: T.border }]}
                  placeholder="Sport (e.g. Soccer)"
                  placeholderTextColor={T.muted}
                  value={newSport}
                  onChangeText={setNewSport}
                />
                <TextInput
                  style={[styles.input, { color: T.text, borderColor: T.border }]}
                  placeholder="Team name (optional)"
                  placeholderTextColor={T.muted}
                  value={newTeam}
                  onChangeText={setNewTeam}
                />
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: T.accent }, saving && { opacity: 0.5 }]}
                  onPress={saveProfile}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color={T.bg} size="small" /> : (
                    <Text style={{ color: T.bg, fontWeight: '800', fontSize: 13, letterSpacing: 2 }}>SAVE</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {profiles.length === 0 ? (
              <Text style={{ color: T.muted, fontSize: 13 }}>No sports added yet. Tap + to add one.</Text>
            ) : profiles.map(p => (
              <View key={p.id} style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
                <Trophy size={16} color={T.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: T.text, fontWeight: '700', fontSize: 15 }}>{p.sport}</Text>
                  {p.team_name ? <Text style={{ color: T.muted, fontSize: 12 }}>{p.team_name}</Text> : null}
                </View>
              </View>
            ))}
          </View>

          {/* Upcoming events */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: T.muted }]}>UPCOMING EVENTS</Text>
            {events.length === 0 ? (
              <Text style={{ color: T.muted, fontSize: 13, marginTop: 8 }}>No upcoming events found.</Text>
            ) : events.map(e => (
              <View key={e.id} style={[styles.eventCard, { backgroundColor: T.card, borderColor: T.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: T.text, fontWeight: '700', fontSize: 15, marginBottom: 2 }}>
                    {e.title ?? e.event_type?.toUpperCase()}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={11} color={T.muted} />
                    <Text style={{ color: T.muted, fontSize: 12 }}>{formatEventDate(e.event_date)}</Text>
                  </View>
                  {e.location ? <Text style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>📍 {e.location}</Text> : null}
                  {e.equipment_checklist?.length > 0 && (
                    <View style={{ marginTop: 6, gap: 2 }}>
                      {e.equipment_checklist.map((item, i) => (
                        <Text key={i} style={{ color: T.muted, fontSize: 11 }}>• {item}</Text>
                      ))}
                    </View>
                  )}
                </View>
                {!e.reminder_sent ? (
                  <TouchableOpacity
                    style={[styles.reminderBtn, { borderColor: T.accent }]}
                    onPress={() => scheduleEventReminder(e)}
                  >
                    <Bell size={13} color={T.accent} />
                    <Text style={{ color: T.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>REMIND</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ color: T.green, fontSize: 11, fontWeight: '700' }}>✓ SET</Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  body: { padding: 20, gap: 8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  eventCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  saveBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
