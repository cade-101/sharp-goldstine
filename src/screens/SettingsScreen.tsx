import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Alert, ActivityIndicator, ScrollView, Modal, TextInput,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import ValkyrieLightning from '../components/ValkyrieLightning';

const C = {
  black: '#0a0a0a', dark: '#111111', card: '#181818', border: '#2a2a2a',
  gold: '#c9a84c', white: '#f0ece4', muted: '#666666', red: '#e03c3c',
  redDim: '#7a1c1c',
};

export default function SettingsScreen() {
  const { user, signOut, deleteAccount, refreshUser } = useUser();
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Household linking
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);

  // Admin — Valkyrie grant (spectre.labs only)
  const isAdmin = user?.username === 'spectre.labs';
  const [grantUsername, setGrantUsername] = useState('');
  const [granting, setGranting] = useState(false);
  const [showLightning, setShowLightning] = useState(
    user?.theme === 'valkyrie' && !user?.valkyrie_seen
  );

  async function handleJoinHousehold() {
    const name = joinName.trim();
    if (!name || !user) return;
    setJoining(true);
    await supabase.from('user_profiles').update({ house_name: name }).eq('id', user.id);
    await supabase.from('household_settings').upsert({ house_name: name }, { onConflict: 'house_name' });
    await refreshUser();
    setJoining(false);
    setJoinName('');
  }

  async function handleLeaveHousehold() {
    if (!user) return;
    Alert.alert('Leave household?', 'You\'ll be unlinked from your partner. They keep their household.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        await supabase.from('user_profiles').update({ house_name: null }).eq('id', user.id);
        await refreshUser();
      }},
    ]);
  }

  async function handleGrantValkyrie() {
    if (!grantUsername.trim()) return;
    setGranting(true);
    const target = grantUsername.trim().toLowerCase();
    const { data: profile, error: fetchErr } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', target)
      .maybeSingle();

    if (fetchErr || !profile) {
      Alert.alert('User not found', `No account with username "${target}".`);
      setGranting(false);
      return;
    }

    await supabase.from('user_profiles').update({ theme: 'valkyrie' }).eq('id', profile.id);
    await supabase.from('household_events').insert({
      user_id: user?.id,
      event_type: 'valkyrie_granted',
      payload: { granted_to: target },
    });

    setGranting(false);
    setGrantUsername('');
    Alert.alert('⚡ Granted', `VALKYRIE unlocked for @${target}.`);
  }

  const isForm = user?.theme === 'form';
  const accent = isForm ? '#e8748a' : C.gold;
  const bg = isForm ? '#fdf6f0' : C.black;
  const cardBg = isForm ? '#fff8f4' : C.card;
  const border = isForm ? '#f0d8cc' : C.border;
  const text = isForm ? '#2a1a14' : C.white;
  const muted = isForm ? '#b8967e' : C.muted;

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
      // deleteAccount signs out — UserProvider will clear user and navigate to AuthScreen
    } catch (e) {
      setDeleting(false);
      Alert.alert('Something went wrong', 'Your local data was cleared. Server deletion will retry next time you sign in.');
    }
  }

  async function handleLightningComplete() {
    setShowLightning(false);
    if (user?.id) {
      await supabase.from('user_profiles').update({ valkyrie_seen: true }).eq('id', user.id);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle={isForm ? 'dark-content' : 'light-content'} />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <Text style={[styles.heading, { color: text }]}>SETTINGS</Text>
        <Text style={[styles.sub, { color: muted }]}>
          @{user?.username ?? '—'}
        </Text>

        {/* Account section */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: muted }]}>ACCOUNT</Text>

          <Row label="Username" value={`@${user?.username ?? '—'}`} textColor={text} />
          <Row label="Theme" value={user?.theme?.toUpperCase() ?? '—'} textColor={text} />
          <Row label="House" value={user?.house_name ?? 'Not linked'} textColor={text} />

          <TouchableOpacity
            style={[styles.row, styles.rowBtn]}
            onPress={() => Alert.alert('Sign out', 'Sign out of Tether?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ])}
          >
            <Text style={[styles.rowLabel, { color: accent }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Household section */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: muted }]}>HOUSEHOLD</Text>

          {user?.house_name ? (
            <>
              <Row label="Linked to" value={user.house_name} textColor={text} />
              <TouchableOpacity style={[styles.row, styles.rowBtn]} onPress={handleLeaveHousehold}>
                <Text style={[styles.rowLabel, { color: C.red }]}>Leave household</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.privacyNote, { color: muted, marginBottom: 12 }]}>
                Enter the household name your partner set up to link your accounts.
              </Text>
              <TextInput
                style={[styles.grantInput, { color: text, borderColor: border, backgroundColor: bg }]}
                placeholder="e.g. ThePuckPack"
                placeholderTextColor={muted}
                value={joinName}
                onChangeText={setJoinName}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={[styles.joinBtn, { backgroundColor: accent }, (!joinName.trim() || joining) && { opacity: 0.4 }]}
                onPress={handleJoinHousehold}
                disabled={!joinName.trim() || joining}
              >
                {joining
                  ? <ActivityIndicator color={C.black} />
                  : <Text style={styles.joinBtnText}>JOIN HOUSEHOLD</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Privacy section */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: muted }]}>PRIVACY</Text>
          <Text style={[styles.privacyNote, { color: muted }]}>
            Tether stores no real name. Your identifier is your username only. Email, if provided, is used solely for account recovery and is never shared.
          </Text>
        </View>

        {/* Feu Follet section — Kill Switch */}
        <View style={[styles.section, styles.dangerSection, { backgroundColor: cardBg, borderColor: C.redDim }]}>
          <Text style={[styles.sectionTitle, { color: C.red }]}>DELETE ALL MY DATA</Text>
          <Text style={[styles.dangerNote, { color: muted }]}>
            Permanently deletes everything: workouts, budget, session history, your username, and your account. This cannot be undone.
          </Text>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setDeleteModal(true)}
          >
            <Text style={styles.deleteBtnText}>DELETE ALL MY DATA</Text>
          </TouchableOpacity>
        </View>

        {/* Admin — Valkyrie grant (spectre.labs only) */}
        {isAdmin && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor: '#3d2a5a' }]}>
            <Text style={[styles.sectionTitle, { color: '#c0c8d8' }]}>⚡ GRANT VALKYRIE</Text>
            <TextInput
              style={[styles.grantInput, { color: text, borderColor: border, backgroundColor: cardBg }]}
              placeholder="username"
              placeholderTextColor={muted}
              value={grantUsername}
              onChangeText={setGrantUsername}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.grantBtn, granting && { opacity: 0.5 }]}
              onPress={handleGrantValkyrie}
              disabled={granting}
            >
              {granting
                ? <ActivityIndicator color="#0d0618" />
                : <Text style={styles.grantBtnText}>GRANT VALKYRIE</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.footer, { color: muted }]}>
          Tether — Feu Follet Ethics Charter v1.0{'\n'}
          No advertising. No data selling. No real names.
        </Text>
      </ScrollView>

      {/* Valkyrie unlock sequence */}
      {showLightning && <ValkyrieLightning onComplete={handleLightningComplete} />}

      {/* Confirm Delete Modal */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: cardBg, borderColor: C.red }]}>
            <Text style={[styles.modalTitle, { color: C.red }]}>ARE YOU SURE?</Text>
            <Text style={[styles.modalBody, { color: text }]}>
              This deletes your account and all data permanently. There is no recovery.
            </Text>

            {deleting ? (
              <View style={styles.deletingRow}>
                <ActivityIndicator color={C.red} />
                <Text style={[styles.deletingText, { color: muted }]}>Deleting…</Text>
              </View>
            ) : (
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalCancel, { borderColor: border }]}
                  onPress={() => setDeleteModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirm}
                  onPress={handleDeleteAccount}
                >
                  <Text style={styles.modalConfirmText}>DELETE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value, textColor }: { label: string; value: string; textColor: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: textColor, opacity: 0.6 }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },
  heading: { fontSize: 24, fontWeight: '900', letterSpacing: 3, marginBottom: 4 },
  sub: { fontSize: 13, letterSpacing: 1, marginBottom: 28 },

  section: {
    borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12,
  },
  privacyNote: { fontSize: 13, lineHeight: 20 },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  rowBtn: { justifyContent: 'flex-start' },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600' },

  dangerSection: { borderWidth: 1.5 },
  dangerNote: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  deleteBtn: {
    backgroundColor: C.red, borderRadius: 8, paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },

  footer: { fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 18, letterSpacing: 0.5 },
  joinBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  joinBtnText: { color: '#0a0a0a', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
  grantInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10 },
  grantBtn: { backgroundColor: '#c0c8d8', borderRadius: 10, padding: 14, alignItems: 'center' },
  grantBtnText: { color: '#0d0618', fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modal: {
    width: '100%', borderRadius: 16, borderWidth: 1.5,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  modalBody: { fontSize: 14, lineHeight: 22, marginBottom: 24 },

  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: { fontWeight: '600', fontSize: 14 },
  modalConfirm: {
    flex: 1, backgroundColor: C.red, borderRadius: 8, paddingVertical: 13,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  deletingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  deletingText: { fontSize: 14 },
});
