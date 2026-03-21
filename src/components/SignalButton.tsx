import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';

const DEFAULT_SIGNALS = [
  { emoji: '💙', text: 'Thinking of you' },
  { emoji: '💪', text: "You've got this" },
  { emoji: '🏆', text: 'Proud of you' },
  { emoji: '📡', text: 'Check in when you can' },
  { emoji: '🚨', text: 'Need backup' },
  { emoji: '☕', text: 'Coffee break?' },
  { emoji: '🌙', text: 'Rest up — big day tomorrow' },
  { emoji: '🔥', text: 'On fire today' },
];

interface Signal {
  emoji: string;
  text: string;
}

export default function SignalButton() {
  const { user, themeTokens: T } = useUser();
  const [open, setOpen] = useState(false);
  const [signals, setSignals] = useState<Signal[]>(DEFAULT_SIGNALS);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('your partner');
  const [sending, setSending] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const slideAnim = useRef(new Animated.Value(400)).current;

  // Load household data on mount
  useEffect(() => {
    if (!user?.house_name) return;
    loadHouseholdData();
  }, [user?.house_name]);

  async function loadHouseholdData() {
    if (!user?.house_name || !user?.id) return;

    // Find partner
    const { data: partner } = await supabase
      .from('user_profiles')
      .select('id, username')
      .eq('house_name', user.house_name)
      .neq('id', user.id)
      .single();

    if (partner) {
      setPartnerId(partner.id);
      setPartnerName(partner.username ?? 'your partner');
    }

    // Load signal library
    const { data: settings } = await supabase
      .from('household_settings')
      .select('signal_library')
      .eq('house_name', user.house_name)
      .single();

    if (settings?.signal_library && Array.isArray(settings.signal_library) && settings.signal_library.length > 0) {
      setSignals([...DEFAULT_SIGNALS, ...settings.signal_library]);
    }
  }

  function openSheet() {
    setOpen(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }

  function closeSheet() {
    Animated.timing(slideAnim, {
      toValue: 500,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  }

  async function sendSignal(signal: Signal) {
    if (!user?.id || !partnerId) {
      Alert.alert('No partner found', 'Link a household first in Settings.');
      return;
    }
    setSending(true);
    const message = `${signal.emoji} ${signal.text}`;
    const { error } = await supabase.from('props').insert({
      from_user: user.username ?? user.id,
      to_user: partnerId,
      message,
      seen: false,
      event_type: 'signal',
    });
    setSending(false);
    if (error) {
      Alert.alert('Failed to send', error.message);
    } else {
      closeSheet();
    }
  }

  async function saveCustomSignal() {
    const trimmed = newMsg.trim();
    if (!trimmed || !user?.house_name) return;

    const custom: Signal = { emoji: '✉️', text: trimmed };
    const updated = [...signals, custom];

    // Persist to household_settings.signal_library (custom entries only)
    const customOnly = updated.filter(s => !DEFAULT_SIGNALS.some(d => d.text === s.text));
    await supabase
      .from('household_settings')
      .update({ signal_library: customOnly })
      .eq('house_name', user.house_name);

    setSignals(updated);
    setNewMsg('');
  }

  if (!user) return null;

  const s = styles(T);

  return (
    <>
      {/* Floating button */}
      <TouchableOpacity style={s.fab} onPress={openSheet} activeOpacity={0.85}>
        <Text style={s.fabIcon}>📡</Text>
      </TouchableOpacity>

      {/* Bottom sheet modal */}
      <Modal visible={open} transparent animationType="none" onRequestClose={closeSheet}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closeSheet} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kvContainer}
          pointerEvents="box-none"
        >
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
            {/* Handle */}
            <View style={s.handle} />
            <Text style={s.sheetTitle}>SIGNAL {partnerName.toUpperCase()}</Text>
            <Text style={s.sheetSub}>Tap to send — they'll see it on next open</Text>

            {sending && (
              <ActivityIndicator color={T.accent} style={{ marginVertical: 12 }} />
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              {signals.map((sig, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.signalRow}
                  onPress={() => sendSignal(sig)}
                  disabled={sending}
                  activeOpacity={0.7}
                >
                  <Text style={s.signalEmoji}>{sig.emoji}</Text>
                  <Text style={s.signalText}>{sig.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Custom signal input */}
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                placeholder="Add custom signal..."
                placeholderTextColor={T.muted}
                value={newMsg}
                onChangeText={setNewMsg}
                maxLength={80}
                returnKeyType="done"
                onSubmitEditing={saveCustomSignal}
              />
              <TouchableOpacity style={s.addBtn} onPress={saveCustomSignal}>
                <Text style={s.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function styles(T: ReturnType<typeof import('../themes').getTheme>) {
  return StyleSheet.create({
    fab: {
      position: 'absolute',
      bottom: 90,
      right: 20,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: T.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: T.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 999,
    },
    fabIcon: {
      fontSize: 22,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    kvContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: T.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: T.border,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: T.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 2,
      color: T.accent,
      textAlign: 'center',
      marginBottom: 4,
    },
    sheetSub: {
      fontSize: 11,
      color: T.muted,
      textAlign: 'center',
      marginBottom: 16,
      letterSpacing: 0.5,
    },
    signalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
    },
    signalEmoji: {
      fontSize: 22,
      marginRight: 14,
      width: 32,
      textAlign: 'center',
    },
    signalText: {
      fontSize: 15,
      color: T.text,
      fontWeight: '500',
    },
    inputRow: {
      flexDirection: 'row',
      marginTop: 16,
      gap: 10,
    },
    input: {
      flex: 1,
      backgroundColor: T.dark,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: T.text,
      fontSize: 14,
    },
    addBtn: {
      backgroundColor: T.accent,
      width: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: {
      color: '#000',
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 26,
    },
  });
}
