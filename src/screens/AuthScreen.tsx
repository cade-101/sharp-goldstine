import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { generateUsername } from '../lib/config';

const C = {
  black: '#0a0a0a',
  dark: '#111111',
  card: '#181818',
  border: '#2a2a2a',
  gold: '#c9a84c',
  white: '#f0ece4',
  muted: '#666666',
  red: '#e03c3c',
  rose: '#e8748a',
};

const THEMES = [
  { id: 'iron',       label: 'IRON',       sub: 'Modern Military · Dark · Gold',          color: '#c9a84c', bg: '#0a0a0a' },
  { id: 'ronin',      label: 'RONIN',      sub: 'Feudal Japan · Ink Black · Blood Red',   color: '#c41e3a', bg: '#060608' },
  { id: 'valkyrie',   label: 'VALKYRIE',   sub: 'Norse · Deep Violet · Silver',           color: '#c0c8d8', bg: '#0d0618' },
  { id: 'forge',      label: 'FORGE',      sub: 'Medieval · Stone · Firelight Red',       color: '#c0392b', bg: '#0d0908' },
  { id: 'arcane',     label: 'ARCANE',     sub: 'Wizards · Deep Purple · Spell Gold',     color: '#7c4dff', bg: '#08060f' },
  { id: 'dragonfire', label: 'DRAGONFIRE', sub: 'Dragons · Charcoal · Ember Orange',      color: '#f4511e', bg: '#0a0605' },
  { id: 'void',       label: 'VOID',       sub: 'Sci-Fi · Near Black · Electric Blue',    color: '#00b0ff', bg: '#040608' },
  { id: 'verdant',    label: 'VERDANT',    sub: 'Ranger · Deep Forest · Earth Gold',      color: '#4caf50', bg: '#060c08' },
];

const GOALS = ['Build muscle', 'Lose fat', 'Get stronger', 'Just move', 'All of the above'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NUMS = [1, 2, 3, 4, 5, 6, 0];
const EQUIPMENT = [
  { id: 'full', label: 'Full gym', sub: 'Barbells, cables, machines' },
  { id: 'some', label: 'Some equipment', sub: 'Dumbbells + basics' },
  { id: 'home', label: 'Home / no equipment', sub: 'Bodyweight only' },
  { id: 'varies', label: 'Varies', sub: 'Gym + travel mix' },
];
const BODY_FOCUS = ['Glutes', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Balanced'];

const BIOMETRIC_EMAIL_KEY = 'tether_bio_email';
const BIOMETRIC_PASS_KEY = 'tether_bio_pass';
export const EPHEMERAL_SESSION_KEY = 'tether_ephemeral_session';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup' | 'onboard'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  // Biometrics
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnrolled, setBioEnrolled] = useState(false);
  const [bioType, setBioType] = useState('Biometrics');

  // Username for signup
  const [username, setUsername] = useState(() => generateUsername());

  // Onboarding state
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState('');
  const [goal, setGoal] = useState('');
  const [trainingDays, setTrainingDays] = useState<number[]>([]);
  const [equipment, setEquipment] = useState('');
  const [bodyFocus, setBodyFocus] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [newUserId, setNewUserId] = useState('');

  useEffect(() => {
    checkBiometrics();
  }, []);

  async function checkBiometrics() {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const savedEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);

    if (compatible) {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
      // Fingerprint only — no Face ID
      if (!hasFingerprint) {
        setBioAvailable(false);
        setBioEnrolled(false);
        return;
      }
      setBioType('Fingerprint');
    }

    setBioAvailable(compatible && enrolled && !!savedEmail);
    setBioEnrolled(enrolled);
  }

  async function handleBiometricLogin() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Sign in to Tether`,
      cancelLabel: 'Use password',
      disableDeviceFallback: false,
    });

    if (!result.success) return;

    const savedEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    const savedPass = await SecureStore.getItemAsync(BIOMETRIC_PASS_KEY);
    if (!savedEmail || !savedPass) {
      setError('No saved credentials. Please log in with email and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: savedEmail, password: savedPass });
      if (error) {
        // Stale credentials — clear them so the biometric button goes away
        if (error.message.toLowerCase().includes('invalid')) {
          await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
          await SecureStore.deleteItemAsync(BIOMETRIC_PASS_KEY);
          setBioAvailable(false);
        }
        setError(error.message);
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function offerBiometricSave(loginEmail: string, loginPassword: string) {
    if (!bioEnrolled) return;
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (!types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return;

    Alert.alert(
      `Save with ${bioType}?`,
      `Skip the password next time.`,
      [
        {
          text: 'Yes, save',
          onPress: async () => {
            await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, loginEmail);
            await SecureStore.setItemAsync(BIOMETRIC_PASS_KEY, loginPassword);
            setBioAvailable(true);
          },
        },
        { text: 'Not now', style: 'cancel' },
      ]
    );
  }

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      if (!keepSignedIn) {
        await SecureStore.setItemAsync(EPHEMERAL_SESSION_KEY, 'true');
      } else {
        await SecureStore.deleteItemAsync(EPHEMERAL_SESSION_KEY);
      }
      await offerBiometricSave(email, password);
    }
    setLoading(false);
  }

  async function handleSignup() {
    if (!password) {
      setError('Password is required.');
      return;
    }
    setLoading(true);
    setError('');

    let userId: string;

    if (email.trim()) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) { setError(error.message); setLoading(false); return; }
      userId = data.user!.id;
    } else {
      // No email — anonymous account, password used locally for biometric vault only
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) { setError(error.message); setLoading(false); return; }
      userId = data.user!.id;
    }

    if (!keepSignedIn) {
      await SecureStore.setItemAsync(EPHEMERAL_SESSION_KEY, 'true');
    } else {
      await SecureStore.deleteItemAsync(EPHEMERAL_SESSION_KEY);
    }
    setNewUserId(userId);
    setMode('onboard');
    setLoading(false);
  }

  async function finishOnboarding() {
    setLoading(true);
    await supabase.from('user_profiles').upsert({
      id: newUserId,
      username,
      theme,
      goals: [goal],
      training_days: trainingDays,
      equipment,
      body_focus: bodyFocus,
      notes,
    });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }
    setLoading(false);
  }

  function toggleDay(dayNum: number) {
    setTrainingDays(prev =>
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
    );
  }

  function toggleFocus(f: string) {
    setBodyFocus(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  }

  // ── LOGIN ──────────────────────────────────────────────
  if (mode === 'login') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.authContainer}>
          <Text style={s.logo}>TETHER</Text>
          <Text style={s.logoSub}>your family's operating system</Text>

          {bioAvailable && (
            <TouchableOpacity style={s.bioBtn} onPress={handleBiometricLogin}>
              <Text style={s.bioBtnText}>👆  Sign in with Fingerprint</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={C.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={C.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={s.checkboxRow} onPress={() => setKeepSignedIn(v => !v)}>
            <View style={[s.checkbox, keepSignedIn && s.checkboxChecked]}>
              {keepSignedIn && <Text style={s.checkboxTick}>✓</Text>}
            </View>
            <Text style={s.checkboxLabel}>Keep me signed in</Text>
          </TouchableOpacity>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity style={s.primaryBtn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={C.black} /> : <Text style={s.primaryBtnText}>LOG IN</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={() => { setMode('signup'); setError(''); }}>
            <Text style={s.secondaryBtnText}>New here? Create account →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ── SIGNUP ─────────────────────────────────────────────
  if (mode === 'signup') return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.authContainer}>
          <Text style={s.logo}>TETHER</Text>
          <Text style={s.logoSub}>create your account</Text>

          {/* Username block */}
          <View style={s.usernameBlock}>
            <Text style={s.usernameLabel}>YOUR CODENAME</Text>
            <Text style={s.usernameValue}>{username}</Text>
            <TouchableOpacity style={s.rerollBtn} onPress={() => setUsername(generateUsername())}>
              <Text style={s.rerollText}>↻  reroll</Text>
            </TouchableOpacity>
          </View>

          {/* Password — always required */}
          <TextInput
            style={s.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor={C.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Email — optional */}
          <Text style={s.fieldLabel}>Optional — for backup only. We will never contact you.</Text>
          <TextInput
            style={s.input}
            placeholder="Email (optional)"
            placeholderTextColor={C.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity style={s.primaryBtn} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color={C.black} /> : <Text style={s.primaryBtnText}>CREATE ACCOUNT</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={() => { setMode('login'); setError(''); }}>
            <Text style={s.secondaryBtnText}>Already have an account? Log in →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ── ONBOARDING ─────────────────────────────────────────
  return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.onboardContainer}>

        {/* Progress */}
        <View style={s.progressRow}>
          {[0,1,2,3,4].map(i => (
            <View key={i} style={[s.progressDot, i <= step && s.progressDotActive]} />
          ))}
        </View>

        {/* Step 0 — Theme */}
        {step === 0 && (
          <View>
            <Text style={s.obStep}>Hey, {username}</Text>
            <Text style={s.obQuestion}>Pick your vibe.</Text>
            {THEMES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[s.themeCard, theme === t.id && { borderColor: t.color }]}
                onPress={() => setTheme(t.id)}
              >
                <View style={[s.themeColorDot, { backgroundColor: t.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.themeLabel, theme === t.id && { color: t.color }]}>{t.label}</Text>
                  <Text style={s.themeSub}>{t.sub}</Text>
                </View>
                {theme === t.id && <Text style={[s.checkmark, { color: t.color }]}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.primaryBtn, !theme && s.btnDim]} onPress={() => theme && setStep(1)}>
              <Text style={s.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1 — Goal */}
        {step === 1 && (
          <View>
            <Text style={s.obStep}>Step 1 of 4</Text>
            <Text style={s.obQuestion}>What are you training for?</Text>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g}
                style={[s.optCard, goal === g && s.optCardActive]}
                onPress={() => setGoal(g)}
              >
                <Text style={[s.optLabel, goal === g && s.optLabelActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.primaryBtn, !goal && s.btnDim]} onPress={() => goal && setStep(2)}>
              <Text style={s.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2 — Training days */}
        {step === 2 && (
          <View>
            <Text style={s.obStep}>Step 2 of 4</Text>
            <Text style={s.obQuestion}>Which days can you train?</Text>
            <View style={s.dayGrid}>
              {DAYS.map((day, i) => (
                <TouchableOpacity
                  key={day}
                  style={[s.dayChip, trainingDays.includes(DAY_NUMS[i]) && s.dayChipActive]}
                  onPress={() => toggleDay(DAY_NUMS[i])}
                >
                  <Text style={[s.dayChipText, trainingDays.includes(DAY_NUMS[i]) && s.dayChipTextActive]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.primaryBtn, trainingDays.length === 0 && s.btnDim]} onPress={() => trainingDays.length > 0 && setStep(3)}>
              <Text style={s.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3 — Equipment */}
        {step === 3 && (
          <View>
            <Text style={s.obStep}>Step 3 of 4</Text>
            <Text style={s.obQuestion}>What's your gym situation?</Text>
            {EQUIPMENT.map(eq => (
              <TouchableOpacity
                key={eq.id}
                style={[s.optCard, equipment === eq.id && s.optCardActive]}
                onPress={() => setEquipment(eq.id)}
              >
                <Text style={[s.optLabel, equipment === eq.id && s.optLabelActive]}>{eq.label}</Text>
                <Text style={s.optSub}>{eq.sub}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.primaryBtn, !equipment && s.btnDim]} onPress={() => equipment && setStep(4)}>
              <Text style={s.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4 — Body focus + notes */}
        {step === 4 && (
          <View>
            <Text style={s.obStep}>Step 4 of 4</Text>
            <Text style={s.obQuestion}>Any areas to prioritize?</Text>
            <View style={s.chipGrid}>
              {BODY_FOCUS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.focusChip, bodyFocus.includes(f) && s.focusChipActive]}
                  onPress={() => toggleFocus(f)}
                >
                  <Text style={[s.focusChipText, bodyFocus.includes(f) && s.focusChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.notesLabel}>Anything else? (injuries, goals, notes)</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="e.g. bigger shoulders, bad knees, post-partum..."
              placeholderTextColor={C.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <TouchableOpacity style={s.primaryBtn} onPress={finishOnboarding} disabled={loading}>
              {loading ? <ActivityIndicator color={C.black} /> : <Text style={s.primaryBtnText}>{"LET'S GO \uD83D\uDD25"}</Text>}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.black },
  authContainer: { padding: 28, paddingTop: 60, flexGrow: 1, justifyContent: 'center' },
  logo: { fontSize: 52, color: C.white, fontWeight: '900', letterSpacing: 6, textAlign: 'center', marginBottom: 6 },
  logoSub: { fontSize: 12, color: C.muted, letterSpacing: 3, textAlign: 'center', marginBottom: 40 },
  // Biometrics
  bioBtn: { backgroundColor: C.card, borderWidth: 1, borderColor: C.gold, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 24 },
  bioBtnText: { color: C.gold, fontSize: 16, fontWeight: '600', letterSpacing: 1 },
  // Username
  usernameBlock: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.gold, padding: 20, alignItems: 'center', marginBottom: 24 },
  usernameLabel: { fontSize: 10, color: C.gold, letterSpacing: 4, marginBottom: 8 },
  usernameValue: { fontSize: 26, color: C.white, fontWeight: '700', textAlign: 'center', letterSpacing: 1, marginBottom: 12 },
  rerollBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  rerollText: { fontSize: 13, color: C.muted, letterSpacing: 1 },
  // Field label
  fieldLabel: { fontSize: 11, color: C.muted, letterSpacing: 0.5, marginBottom: 8, lineHeight: 16 },
  // Inputs
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16, fontSize: 16, color: C.white, marginBottom: 14 },
  error: { color: C.red, fontSize: 13, marginBottom: 14, textAlign: 'center' },
  primaryBtn: { backgroundColor: C.gold, borderRadius: 14, padding: 20, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  primaryBtnText: { color: C.black, fontSize: 18, fontWeight: '700', letterSpacing: 3 },
  btnDim: { opacity: 0.4 },
  secondaryBtn: { alignItems: 'center', padding: 12 },
  secondaryBtnText: { color: C.muted, fontSize: 14, letterSpacing: 1 },
  // Onboarding
  onboardContainer: { padding: 24, paddingTop: 20, flexGrow: 1 },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  progressDot: { flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2 },
  progressDotActive: { backgroundColor: C.gold },
  obStep: { fontSize: 11, color: C.gold, letterSpacing: 3, marginBottom: 10 },
  obQuestion: { fontSize: 28, color: C.white, fontWeight: '700', marginBottom: 24, lineHeight: 34 },
  themeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 10, gap: 14 },
  themeColorDot: { width: 16, height: 16, borderRadius: 8 },
  themeLabel: { fontSize: 18, color: C.white, fontWeight: '700', letterSpacing: 1 },
  themeSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  checkmark: { fontSize: 20, fontWeight: '700' },
  optCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 10 },
  optCardActive: { borderColor: C.gold, backgroundColor: '#1a1608' },
  optLabel: { fontSize: 17, color: C.white },
  optLabelActive: { color: C.gold, fontWeight: '600' },
  optSub: { fontSize: 11, color: C.muted, marginTop: 3 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  dayChip: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, minWidth: 70, alignItems: 'center' },
  dayChipActive: { borderColor: C.gold, backgroundColor: '#1a1608' },
  dayChipText: { fontSize: 14, color: C.muted, fontWeight: '600' },
  dayChipTextActive: { color: C.gold },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  focusChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  focusChipActive: { borderColor: C.gold, backgroundColor: '#1a1608' },
  focusChipText: { fontSize: 13, color: C.muted },
  focusChipTextActive: { color: C.gold, fontWeight: '600' },
  notesLabel: { fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { borderColor: C.gold, backgroundColor: '#1a1608' },
  checkboxTick: { fontSize: 13, color: C.gold, fontWeight: '700' },
  checkboxLabel: { fontSize: 14, color: C.muted, letterSpacing: 0.5 },
});
