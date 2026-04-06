import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Alert, ActivityIndicator, ScrollView, Modal, TextInput, Platform, AppState, Linking,
} from 'react-native';
import { searchTracks, getValidAccessToken, type SpotifyTrack } from '../lib/spotifyService';
import QRCode from 'react-native-qrcode-svg';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { getTheme, THEME_CATEGORIES, THEME_PAIRS, type ThemePairEntry } from '../themes';
import { getThemeUnlockProgress, type UnlockTaskResult } from '../lib/themeUnlockTasks';
import { ChevronLeft, ChevronRight, CheckCircle, Circle } from 'lucide-react-native';
import { requestHealthPermissions, checkHealthPermissions } from '../lib/healthConnect';
import ValkyrieLightning from '../components/ValkyrieLightning';
import ThemeReveal from '../components/ThemeReveal';

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

  // Theme reveal state
  const [showEraUnlock, setShowEraUnlock] = useState(false);
  const [unlockedTheme, setUnlockedTheme] = useState<any>(null);
  const [previousTheme, setPreviousTheme] = useState<any>(null);

  // Household linking
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Health Connect
  const [healthPermsGranted, setHealthPermsGranted] = useState<boolean | null>(null);
  const [requestingHealth, setRequestingHealth] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    checkHealthPermissions().then(setHealthPermsGranted);
  }, []);

  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', async (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        // User returned from Health Connect settings — re-check
        const granted = await checkHealthPermissions();
        setHealthPermsGranted(granted);
        setRequestingHealth(false);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  function handleRequestHealthPerms() {
    setRequestingHealth(true);
    requestHealthPermissions(); // opens HC settings, returns void
    // result is picked up by the AppState listener above when user returns
  }

  // Admin — Valkyrie grant (spectre.labs only)
  const isAdmin = user?.username === 'spectre.labs';
  const [grantUsername, setGrantUsername] = useState('');
  const [granting, setGranting] = useState(false);
  const [changingTheme, setChangingTheme] = useState(false);
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

  async function handleChangeTheme(newTheme: string) {
    if (!user?.id || changingTheme) return;
    if (newTheme === 'valkyrie' && user.theme !== 'valkyrie' && !user.valkyrie_seen && !isAdmin) {
      Alert.alert('Locked', 'VALKYRIE must be granted by command.');
      return;
    }
    setChangingTheme(true);
    const prev = getTheme(user.theme ?? 'shadow');
    await supabase.from('user_profiles').update({ theme: newTheme }).eq('id', user.id);
    await refreshUser();
    setPreviousTheme(prev);
    setUnlockedTheme(getTheme(newTheme));
    setShowEraUnlock(true);
    setChangingTheme(false);
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

    await supabase.from('user_profiles').update({ theme: 'valkyrie', valkyrie_seen: false }).eq('id', profile.id);
    await supabase.from('household_events').insert({
      user_id: user?.id,
      event_type: 'valkyrie_granted',
      payload: { granted_to: target },
    });

    setGranting(false);
    setGrantUsername('');
    Alert.alert('⚡ Granted', `VALKYRIE unlocked for @${target}.`);
  }

  // Spotify alarm linking
  const [alarmSearchText, setAlarmSearchText] = useState('');
  const [alarmSearchResults, setAlarmSearchResults] = useState<SpotifyTrack[]>([]);
  const [alarmSearching, setAlarmSearching] = useState(false);
  const [savedAlarmUri, setSavedAlarmUri] = useState<string | null>((user as any)?.spotify_alarm_uri ?? null);
  const [savedAlarmName, setSavedAlarmName] = useState<string | null>(null);

  async function handleAlarmSearch() {
    if (!alarmSearchText.trim() || !user) return;
    setAlarmSearching(true);
    try {
      const token = await getValidAccessToken(user as any);
      if (!token) { Alert.alert('Spotify not connected', 'Connect Spotify first in the Household section.'); return; }
      const results = await searchTracks(alarmSearchText.trim(), token);
      setAlarmSearchResults(results);
    } catch { /* non-blocking */ } finally {
      setAlarmSearching(false);
    }
  }

  async function handleSelectAlarmTrack(track: SpotifyTrack) {
    if (!user?.id) return;
    await supabase.from('user_profiles').update({ spotify_alarm_uri: track.uri }).eq('id', user.id);
    setSavedAlarmUri(track.uri);
    setSavedAlarmName(`${track.name} — ${track.artists[0]?.name ?? ''}`);
    setAlarmSearchResults([]);
    setAlarmSearchText('');
  }

  async function handleClearAlarm() {
    if (!user?.id) return;
    await supabase.from('user_profiles').update({ spotify_alarm_uri: null }).eq('id', user.id);
    setSavedAlarmUri(null);
    setSavedAlarmName(null);
  }

  // Theme picker drill-down
  const [pickerCategory, setPickerCategory] = useState<string | null>(null);
  const [pickerPair, setPickerPair] = useState<ThemePairEntry | null>(null);
  const [pairProgress, setPairProgress] = useState<UnlockTaskResult[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  useEffect(() => {
    if (!pickerPair || !user?.id) { setPairProgress([]); return; }
    const key = pickerPair.dark ?? pickerPair.standalone ?? '';
    if (!key) return;
    setLoadingProgress(true);
    getThemeUnlockProgress(user.id, key, user.house_name ?? null)
      .then(r => setPairProgress(r.tasks))
      .catch(() => setPairProgress([]))
      .finally(() => setLoadingProgress(false));
  }, [pickerPair, user?.id]);

  function pairsForCategory(catId: string): ThemePairEntry[] {
    const cat = THEME_CATEGORIES.find(c => c.id === catId);
    if (!cat) return [];
    return THEME_PAIRS.filter(p => {
      const keys = [p.dark, p.warm, p.standalone].filter(Boolean) as string[];
      return keys.some(k => cat.themes.includes(k));
    });
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

        <Text style={[styles.heading, { color: text }]}>SETTINGS</Text>
        <Text style={[styles.sub, { color: muted }]}>@{user?.username ?? '—'}</Text>

        {/* Account */}
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

        {/* ── THEME PICKER — 3-level drill-down ─────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
            {(pickerCategory || pickerPair) ? (
              <TouchableOpacity
                onPress={() => {
                  if (pickerPair) { setPickerPair(null); setPairProgress([]); }
                  else setPickerCategory(null);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeft size={16} color={muted} />
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.sectionTitle, { color: muted, marginBottom: 0, flex: 1 }]}>
              {pickerPair
                ? (pickerPair.label ?? 'THEME DETAIL').toUpperCase()
                : pickerCategory
                  ? (THEME_CATEGORIES.find(c => c.id === pickerCategory)?.label ?? 'THEMES')
                  : 'THEME'}
            </Text>
          </View>

          {pickerPair ? (
            /* ── LEVEL 3: PAIR DETAIL ──────────────────────────────────────── */
            (() => {
              const darkKey  = pickerPair.dark;
              const warmKey  = pickerPair.warm;
              const soloKey  = pickerPair.standalone;
              const darkT    = darkKey ? getTheme(darkKey) : null;
              const warmT    = warmKey ? getTheme(warmKey) : null;
              const soloT    = soloKey ? getTheme(soloKey) : null;
              const isUnlocked = (k: string) =>
                k === 'shadow' || user?.unlocked_themes?.includes(k) || isAdmin;

              const applyTheme = (k: string) => {
                if (!isUnlocked(k)) {
                  Alert.alert('Theme Locked', 'Complete the unlock tasks to apply this era.');
                  return;
                }
                setPickerPair(null);
                setPairProgress([]);
                setPickerCategory(null);
                handleChangeTheme(k);
              };

              return (
                <View style={{ gap: 12 }}>
                  {/* Swatches row */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {darkT && darkKey ? (
                      <TouchableOpacity
                        style={[
                          styles.swatchCard,
                          { backgroundColor: darkT.bg, borderColor: user?.theme === darkKey ? darkT.accent : border },
                          !isUnlocked(darkKey) && { opacity: 0.45 },
                        ]}
                        onPress={() => applyTheme(darkKey)}
                      >
                        <View style={[styles.swatchDot, { backgroundColor: darkT.accent }]} />
                        <Text style={[styles.swatchName, { color: darkT.accent }]}>{darkT.name}</Text>
                        <Text style={[styles.swatchPill, { color: darkT.muted }]}>DARK</Text>
                        {user?.theme === darkKey && (
                          <CheckCircle size={14} color={darkT.accent} style={{ marginTop: 4 }} />
                        )}
                        {!isUnlocked(darkKey) && (
                          <Text style={[styles.swatchLocked, { color: darkT.muted }]}>LOCKED</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                    {warmT && warmKey ? (
                      <TouchableOpacity
                        style={[
                          styles.swatchCard,
                          { backgroundColor: warmT.bg, borderColor: user?.theme === warmKey ? warmT.accent : border },
                          !isUnlocked(warmKey) && { opacity: 0.45 },
                        ]}
                        onPress={() => applyTheme(warmKey)}
                      >
                        <View style={[styles.swatchDot, { backgroundColor: warmT.accent }]} />
                        <Text style={[styles.swatchName, { color: warmT.accent }]}>{warmT.name}</Text>
                        <Text style={[styles.swatchPill, { color: warmT.muted }]}>WARM</Text>
                        {user?.theme === warmKey && (
                          <CheckCircle size={14} color={warmT.accent} style={{ marginTop: 4 }} />
                        )}
                        {!isUnlocked(warmKey) && (
                          <Text style={[styles.swatchLocked, { color: warmT.muted }]}>LOCKED</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                    {soloT && soloKey ? (
                      <TouchableOpacity
                        style={[
                          styles.swatchCard,
                          { flex: 1, backgroundColor: soloT.bg, borderColor: user?.theme === soloKey ? soloT.accent : border },
                          !isUnlocked(soloKey) && { opacity: 0.45 },
                        ]}
                        onPress={() => applyTheme(soloKey)}
                      >
                        <View style={[styles.swatchDot, { backgroundColor: soloT.accent }]} />
                        <Text style={[styles.swatchName, { color: soloT.accent }]}>{soloT.name}</Text>
                        {user?.theme === soloKey && (
                          <CheckCircle size={14} color={soloT.accent} style={{ marginTop: 4 }} />
                        )}
                        {!isUnlocked(soloKey) && (
                          <Text style={[styles.swatchLocked, { color: soloT.muted }]}>LOCKED</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Unlock tasks */}
                  {loadingProgress ? (
                    <ActivityIndicator color={accent} size="small" style={{ marginTop: 8 }} />
                  ) : pairProgress.length > 0 ? (
                    <View style={{ gap: 10, marginTop: 4 }}>
                      <Text style={[styles.sectionTitle, { color: muted, marginBottom: 4 }]}>UNLOCK TASKS</Text>
                      {pairProgress.map((task, i) => (
                        <View key={i} style={{ gap: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {task.complete
                              ? <CheckCircle size={14} color={accent} />
                              : <Circle size={14} color={muted} />}
                            <Text style={[styles.taskDesc, { color: task.complete ? text : muted }]}>
                              {task.description}
                            </Text>
                          </View>
                          {/* Progress bar */}
                          <View style={[styles.progressTrack, { backgroundColor: border }]}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  backgroundColor: accent,
                                  width: `${Math.round((task.current / task.target) * 100)}%` as any,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.progressLabel, { color: muted }]}>
                            {task.current} / {task.target}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })()
          ) : pickerCategory ? (
            /* ── LEVEL 2: PAIRS IN CATEGORY ──────────────────────────────────── */
            pairsForCategory(pickerCategory).map((pair, idx) => {
              const darkT = pair.dark ? getTheme(pair.dark) : null;
              const warmT = pair.warm ? getTheme(pair.warm) : null;
              const soloT = pair.standalone ? getTheme(pair.standalone) : null;
              const currentTheme = user?.theme ?? 'shadow';
              const isActive =
                currentTheme === pair.dark ||
                currentTheme === pair.warm ||
                currentTheme === pair.standalone;
              const accentColor = darkT?.accent ?? soloT?.accent ?? accent;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.themeRow,
                    { borderColor: isActive ? accentColor : border },
                  ]}
                  onPress={() => setPickerPair(pair)}
                >
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {darkT && <View style={[styles.themeDot, { backgroundColor: darkT.accent }]} />}
                    {warmT && <View style={[styles.themeDot, { backgroundColor: warmT.accent }]} />}
                    {soloT && <View style={[styles.themeDot, { backgroundColor: soloT.accent }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.themeLabel, { color: isActive ? accentColor : text }]}>
                      {pair.label}
                    </Text>
                    {pair.dark && pair.warm ? (
                      <Text style={[styles.themeSub, { color: muted }]}>Dark · Warm</Text>
                    ) : (
                      <Text style={[styles.themeSub, { color: muted }]}>Standalone</Text>
                    )}
                  </View>
                  {isActive && <CheckCircle size={14} color={accentColor} />}
                  <ChevronRight size={14} color={muted} />
                </TouchableOpacity>
              );
            })
          ) : (
            /* ── LEVEL 1: CATEGORIES ─────────────────────────────────────────── */
            THEME_CATEGORIES.map(cat => {
              const count = pairsForCategory(cat.id).length;
              const activeInCat = pairsForCategory(cat.id).some(p =>
                [p.dark, p.warm, p.standalone].includes(user?.theme ?? '')
              );
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.themeRow, { borderColor: activeInCat ? accent : border }]}
                  onPress={() => setPickerCategory(cat.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.themeLabel, { color: activeInCat ? accent : text }]}>
                      {cat.label}
                    </Text>
                    <Text style={[styles.themeSub, { color: muted }]}>{count} {count === 1 ? 'era' : 'eras'}</Text>
                  </View>
                  {activeInCat && <CheckCircle size={14} color={accent} />}
                  <ChevronRight size={14} color={muted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Units */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: muted }]}>UNITS</Text>
          <View style={[styles.row, { alignItems: 'center' }]}>
            <Text style={[styles.rowLabel, { color: text, flex: 1 }]}>Weight unit</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['kg', 'lbs'] as const).map(unit => (
                <TouchableOpacity
                  key={unit}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
                    borderColor: (user?.weight_unit ?? 'lbs') === unit ? accent : border,
                    backgroundColor: (user?.weight_unit ?? 'lbs') === unit ? accent : 'transparent',
                  }}
                  onPress={async () => {
                    await supabase.from('user_profiles').update({ weight_unit: unit }).eq('id', user!.id);
                    await refreshUser();
                  }}
                >
                  <Text style={{ color: (user?.weight_unit ?? 'lbs') === unit ? C.black : muted, fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>
                    {unit.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Hydration */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: muted }]}>HYDRATION</Text>
          <View style={[styles.row, { alignItems: 'center', marginBottom: 12 }]}>
            <Text style={[styles.rowLabel, { color: text, flex: 1 }]}>Daily water goal (units)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[6, 8, 10, 12].map(n => {
                const active = ((user as any)?.water_goal_units ?? 8) === n;
                return (
                  <TouchableOpacity
                    key={n}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: active ? accent : border, backgroundColor: active ? accent : 'transparent' }}
                    onPress={async () => { await supabase.from('user_profiles').update({ water_goal_units: n }).eq('id', user!.id); await refreshUser(); }}
                  >
                    <Text style={{ color: active ? C.black : muted, fontWeight: '700', fontSize: 13 }}>{n}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={[styles.row, { alignItems: 'center' }]}>
            <Text style={[styles.rowLabel, { color: text, flex: 1 }]}>Default container</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['bottle', 'cup', 'tumbler', 'biggulp'] as const).map(k => {
                const labels = { bottle: '💧', cup: '🥤', tumbler: '🫗', biggulp: '🪣' };
                const active = ((user as any)?.default_water_container ?? 'bottle') === k;
                return (
                  <TouchableOpacity
                    key={k}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: active ? accent : border, backgroundColor: active ? accent : 'transparent' }}
                    onPress={async () => { await supabase.from('user_profiles').update({ default_water_container: k }).eq('id', user!.id); await refreshUser(); }}
                  >
                    <Text style={{ fontSize: 16 }}>{labels[k]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Household */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: muted }]}>HOUSEHOLD</Text>
          {user?.house_name ? (
            <>
              <Row label="Linked to" value={user.house_name} textColor={text} />
              <TouchableOpacity style={[styles.row, styles.rowBtn]} onPress={() => setShowQR(true)}>
                <Text style={[styles.rowLabel, { color: accent }]}>Share household QR</Text>
              </TouchableOpacity>
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
                {joining ? <ActivityIndicator color={C.black} /> : <Text style={styles.joinBtnText}>JOIN HOUSEHOLD</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Health Connect — Android only */}
        {Platform.OS === 'android' && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.sectionTitle, { color: muted }]}>HEALTH CONNECT</Text>
            <Text style={[styles.privacyNote, { color: muted, marginBottom: 12 }]}>
              Grants Tether read access to sleep, heart rate, HRV, and steps from Health Connect.
            </Text>
            <View style={[styles.row, { alignItems: 'center' }]}>
              <Text style={[styles.rowLabel, { color: text, flex: 1 }]}>Status</Text>
              {healthPermsGranted === null
                ? <Text style={{ color: muted, fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>CHECKING…</Text>
                : healthPermsGranted
                  ? <Text style={{ color: '#3ce08a', fontWeight: '800', fontSize: 14, letterSpacing: 1 }}>✅ GRANTED</Text>
                  : <Text style={{ color: muted, fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>NOT GRANTED</Text>
              }
            </View>
            {!healthPermsGranted && (
              <TouchableOpacity
                style={[styles.joinBtn, { backgroundColor: accent, marginTop: 8 }, requestingHealth && { opacity: 0.5 }]}
                onPress={handleRequestHealthPerms}
                disabled={requestingHealth}
              >
                {requestingHealth
                  ? <ActivityIndicator color={C.black} />
                  : <Text style={styles.joinBtnText}>GRANT ACCESS</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Nutrition */}
        {(user?.macro_tier ?? 0) >= 1 && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.sectionTitle, { color: muted }]}>NUTRITION</Text>

            {/* Current tier display */}
            <View style={[styles.row, { alignItems: 'center' }]}>
              <Text style={[styles.rowLabel, { color: text, flex: 1 }]}>Tracking level</Text>
              <Text style={{ color: accent, fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>
                {(user?.macro_tier ?? 1) >= 3 ? 'FULL MACROS' : (user?.macro_tier ?? 1) >= 2 ? 'PROTEIN + CALORIES' : 'PROTEIN ONLY'}
              </Text>
            </View>

            {/* Upgrade to protein + calories (auto unlocks after 3 weeks of tier 1) */}
            {(user?.macro_tier ?? 0) === 1 && (() => {
              const unlockedAt = user?.consistency_unlocked_at ? new Date(user.consistency_unlocked_at) : null;
              const threeWeeksAgo = new Date(Date.now() - 21 * 86400000);
              return unlockedAt && unlockedAt < threeWeeksAgo;
            })() && (
              <TouchableOpacity
                style={[styles.joinBtn, { backgroundColor: accent, marginTop: 8 }]}
                onPress={async () => {
                  await supabase.from('user_profiles').update({ macro_tier: 2 }).eq('id', user!.id);
                  await refreshUser();
                }}
              >
                <Text style={styles.joinBtnText}>ADD CALORIE AWARENESS</Text>
              </TouchableOpacity>
            )}

            {/* Full macros toggle — manual only, never auto-suggested more than once */}
            {(user?.macro_tier ?? 0) >= 1 && (user?.macro_tier ?? 0) < 3 && (() => {
              const unlockedAt = user?.consistency_unlocked_at ? new Date(user.consistency_unlocked_at) : null;
              const threeWeeksAgo = new Date(Date.now() - 21 * 86400000);
              return (user?.macro_tier ?? 0) >= 2 || (unlockedAt && unlockedAt < threeWeeksAgo);
            })() && (
              <View style={[styles.row, { alignItems: 'center', marginTop: 4 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: text }]}>Open full macro tracking</Text>
                  <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                    Protein · Calories · Carbs · Fat · Water
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: border }}
                  onPress={() => Alert.alert(
                    'Enable full macros?',
                    'Shows protein, calories, carbs, fat and water. You can turn this off in Settings anytime.',
                    [
                      { text: 'Not yet', style: 'cancel' },
                      { text: 'Enable', onPress: async () => {
                        await supabase.from('user_profiles').update({ macro_tier: 3 }).eq('id', user!.id);
                        await refreshUser();
                      }},
                    ]
                  )}
                >
                  <Text style={{ color: muted, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>ENABLE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Spotify Alarm */}
        {user?.spotify_access_token ? (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.sectionTitle, { color: muted }]}>ALARM MUSIC</Text>
            {savedAlarmUri ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 20 }}>🎵</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: text }]} numberOfLines={1}>
                      {savedAlarmName ?? savedAlarmUri}
                    </Text>
                    <Text style={[styles.themeSub, { color: muted }]}>Plays when alarm fires</Text>
                  </View>
                  <TouchableOpacity onPress={() => savedAlarmUri && Linking.openURL(savedAlarmUri)}>
                    <Text style={{ color: accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>▶ TEST</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: border }}
                  onPress={handleClearAlarm}
                >
                  <Text style={{ color: muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>REMOVE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={{ color: muted, fontSize: 13, lineHeight: 20 }}>
                  Pick a Spotify track to open when your morning alarm fires.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.grantInput, { flex: 1, color: text, borderColor: border, backgroundColor: cardBg, marginBottom: 0 }]}
                    placeholder="Search tracks…"
                    placeholderTextColor={muted}
                    value={alarmSearchText}
                    onChangeText={setAlarmSearchText}
                    onSubmitEditing={handleAlarmSearch}
                    returnKeyType="search"
                  />
                  <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: accent, paddingHorizontal: 16, marginTop: 0 }, alarmSearching && { opacity: 0.5 }]}
                    onPress={handleAlarmSearch}
                    disabled={alarmSearching}
                  >
                    {alarmSearching
                      ? <ActivityIndicator color={C.black} size="small" />
                      : <Text style={[styles.joinBtnText, { fontSize: 12 }]}>GO</Text>}
                  </TouchableOpacity>
                </View>
                {alarmSearchResults.map(track => (
                  <TouchableOpacity
                    key={track.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: border }}
                    onPress={() => handleSelectAlarmTrack(track)}
                  >
                    <Text style={{ fontSize: 18 }}>🎵</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, { color: text }]} numberOfLines={1}>{track.name}</Text>
                      <Text style={[styles.themeSub, { color: muted }]}>{track.artists[0]?.name ?? ''}</Text>
                    </View>
                    <Text style={{ color: accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>SELECT</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Privacy */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: muted }]}>PRIVACY</Text>
          <Text style={[styles.privacyNote, { color: muted }]}>
            Tether stores no real name. Your identifier is your username only. Email, if provided, is used solely for account recovery and is never shared.
          </Text>
        </View>

        {/* Kill Switch */}
        <View style={[styles.section, styles.dangerSection, { backgroundColor: cardBg, borderColor: C.redDim }]}>
          <Text style={[styles.sectionTitle, { color: C.red }]}>DELETE ALL MY DATA</Text>
          <Text style={[styles.dangerNote, { color: muted }]}>
            Permanently deletes everything: workouts, budget, session history, your username, and your account. This cannot be undone.
          </Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteModal(true)}>
            <Text style={styles.deleteBtnText}>DELETE ALL MY DATA</Text>
          </TouchableOpacity>
        </View>

        {/* Admin — Valkyrie grant */}
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
            <TouchableOpacity style={[styles.grantBtn, granting && { opacity: 0.5 }]} onPress={handleGrantValkyrie} disabled={granting}>
              {granting ? <ActivityIndicator color="#0d0618" /> : <Text style={styles.grantBtnText}>GRANT VALKYRIE</Text>}
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

      {/* Theme reveal — fires on every theme switch */}
      {showEraUnlock && unlockedTheme && (
        <ThemeReveal
          newTheme={unlockedTheme}
          previousTheme={previousTheme ?? undefined}
          onComplete={() => setShowEraUnlock(false)}
        />
      )}

      {/* Household QR modal */}
      <Modal visible={showQR} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.modalTitle, { color: text }]}>SCAN TO JOIN</Text>
            <Text style={[styles.modalBody, { color: muted }]}>Have your partner scan this to join {user?.house_name}.</Text>
            <View style={styles.qrWrap}>
              <QRCode
                value={`tether://join?house=${encodeURIComponent(user?.house_name ?? '')}`}
                size={200}
                color={text}
                backgroundColor={cardBg}
              />
            </View>
            <Text style={[styles.qrName, { color: accent }]}>{user?.house_name}</Text>
            <TouchableOpacity style={[styles.modalCancel, { borderColor: border, marginTop: 16 }]} onPress={() => setShowQR(false)}>
              <Text style={[styles.modalCancelText, { color: text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: cardBg, borderColor: C.red }]}>
            <Text style={[styles.modalTitle, { color: C.red }]}>ARE YOU SURE?</Text>
            <Text style={[styles.modalBody, { color: text }]}>This deletes your account and all data permanently. There is no recovery.</Text>
            {deleting ? (
              <View style={styles.deletingRow}>
                <ActivityIndicator color={C.red} />
                <Text style={[styles.deletingText, { color: muted }]}>Deleting…</Text>
              </View>
            ) : (
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalCancel, { borderColor: border }]} onPress={() => setDeleteModal(false)}>
                  <Text style={[styles.modalCancelText, { color: text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={handleDeleteAccount}>
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
  section: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  privacyNote: { fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  rowBtn: { justifyContent: 'flex-start' },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600' },
  dangerSection: { borderWidth: 1.5 },
  dangerNote: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  deleteBtn: { backgroundColor: C.red, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
  footer: { fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 18, letterSpacing: 0.5 },
  joinBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  joinBtnText: { color: '#0a0a0a', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 10, padding: 14, marginBottom: 8 },
  themeDot: { width: 12, height: 12, borderRadius: 6 },
  themeLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  themeSub: { fontSize: 11, letterSpacing: 0.5 },
  swatchCard: { flex: 1, borderRadius: 12, borderWidth: 1.5, padding: 14, alignItems: 'center', gap: 6 },
  swatchDot: { width: 20, height: 20, borderRadius: 10 },
  swatchName: { fontSize: 11, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  swatchPill: { fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  swatchLocked: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  taskDesc: { fontSize: 12, flex: 1, lineHeight: 17 },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  progressLabel: { fontSize: 10, letterSpacing: 1 },
  grantInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10 },
  grantBtn: { backgroundColor: '#c0c8d8', borderRadius: 10, padding: 14, alignItems: 'center' },
  grantBtnText: { color: '#0d0618', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { width: '100%', borderRadius: 16, borderWidth: 1.5, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  modalBody: { fontSize: 14, lineHeight: 22, marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  modalCancelText: { fontWeight: '600', fontSize: 14 },
  modalConfirm: { flex: 1, backgroundColor: C.red, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  deletingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  deletingText: { fontSize: 14 },
  qrWrap: { alignItems: 'center', marginVertical: 20 },
  qrName: { textAlign: 'center', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});