import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { ANTHROPIC_API_KEY } from '../lib/config';
import { useUser } from '../context/UserContext';

type Screen = 'input' | 'loading' | 'pick';

export default function HouseholdSetupScreen() {
  const { user, themeTokens: C, refreshUser } = useUser();

  const [screen, setScreen] = useState<Screen>('input');
  const [kidsInfo, setKidsInfo] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);

  async function generateNames() {
    if (!kidsInfo.trim()) return;
    setScreen('loading');

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
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `You are naming a household for a family app. The name is their permanent call sign — it links them in the system, shows up in Joint Ops, and is how their partner finds them. It should feel earned. Like a band name or a unit patch, not a username.

Crew info: ${kidsInfo}

Generate 3 call signs. Rules:
- No spaces. CamelCase or TitleCase.
- 1-3 words max.
- Go for the unexpected intersection — not the obvious mashup. Don't just glue interests together. Find the weird overlap, the surprising combo, the name that makes you go "...yeah, that's them."
- Draw from unexpected vocabulary: scientific terms, eras, mythology, obscure references, sports slang, Latin, whatever fits.
- Each name should feel like it could only belong to THIS specific crew. If it could belong to any family with a hockey kid, it's not good enough.
- Family-friendly but not soft.

Bad examples (too generic): "ThePuckPack", "DinoLabHQ", "HockeyKids", "TheSquad"
Good examples (specific, earned, surprising): "CretaceousEnforcers", "BrickAndBoneUnited", "VelociraptorLineChange", "TheTriassicPowerPlay", "NightShiftDynasty"

Return ONLY a JSON array of 3 strings. No markdown, no explanation:
["Name1", "Name2", "Name3"]`,
          }],
        }),
      });

      const data = await response.json();
      const text: string = data.content?.[0]?.text ?? '[]';
      const cleaned = text.replace(/```json|```/g, '').trim();
      const names = JSON.parse(cleaned) as string[];
      setSuggestions(names.slice(0, 3));
      setSelected(names[0] ?? '');
      setScreen('pick');
    } catch {
      setSuggestions(['NightShiftDynasty', 'ChaosAndOrder', 'TheIrreducibles']);
      setSelected('TheSquad');
      setScreen('pick');
    }
  }

  async function confirm() {
    const name = (showCustom ? customName : selected).trim();
    if (!name || !user) return;
    setSaving(true);
    await supabase.from('user_profiles').update({ house_name: name }).eq('id', user.id);
    await supabase.from('household_settings').upsert({ house_name: name }, { onConflict: 'house_name' });
    await refreshUser();
    setSaving(false);
  }

  const accentColor = C.accent;
  const confirmDisabled = showCustom ? !customName.trim() : !selected;

  // ── INPUT ──────────────────────────────────────────────────────
  if (screen === 'input') return (
    <SafeAreaView style={[s.bg, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.mode === 'light' ? 'dark-content' : 'light-content'} />
      <ScrollView contentContainerStyle={s.container}>
        <Text style={[s.title, { color: C.text }]}>Name Your Crew</Text>
        <Text style={[s.sub, { color: C.muted }]}>
          Tell us about your household — the kids, what they're into, whatever makes your crew yours.
        </Text>

        <Text style={[s.label, { color: accentColor }]}>TELL US ABOUT YOUR CREW</Text>
        <TextInput
          style={[s.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
          placeholder={'e.g. Andy (10) loves hockey and LEGO. Pax (7) is obsessed with dinosaurs. Hendrix (4) is into everything.'}
          placeholderTextColor={C.muted}
          value={kidsInfo}
          onChangeText={setKidsInfo}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: accentColor }, !kidsInfo.trim() && s.btnDim]}
          onPress={generateNames}
          disabled={!kidsInfo.trim()}
        >
          <Text style={[s.primaryBtnText, { color: C.bg }]}>GENERATE NAMES</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── LOADING ────────────────────────────────────────────────────
  if (screen === 'loading') return (
    <SafeAreaView style={[s.bg, { backgroundColor: C.bg }]}>
      <View style={s.centered}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={[s.loadingText, { color: C.muted }]}>Building your call sign...</Text>
      </View>
    </SafeAreaView>
  );

  // ── PICK ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.bg, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.mode === 'light' ? 'dark-content' : 'light-content'} />
      <ScrollView contentContainerStyle={s.container}>
        <Text style={[s.title, { color: C.text }]}>Pick Your Call Sign</Text>
        <Text style={[s.sub, { color: C.muted }]}>
          This links you and your partner inside Tether. You can always change it in Settings.
        </Text>

        {suggestions.map(name => (
          <TouchableOpacity
            key={name}
            style={[s.nameCard, { backgroundColor: C.card, borderColor: selected === name && !showCustom ? accentColor : C.border }]}
            onPress={() => { setSelected(name); setShowCustom(false); }}
          >
            <Text style={[s.namePrimary, { color: selected === name && !showCustom ? accentColor : C.text }]}>{name}</Text>
            {selected === name && !showCustom && (
              <Text style={[s.checkmark, { color: accentColor }]}>✓</Text>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[s.nameCard, { backgroundColor: C.card, borderColor: showCustom ? accentColor : C.border }]}
          onPress={() => setShowCustom(true)}
        >
          <Text style={[s.namePrimary, { color: showCustom ? accentColor : C.muted }]}>Something else...</Text>
          {showCustom && <Text style={[s.checkmark, { color: accentColor }]}>✓</Text>}
        </TouchableOpacity>

        {showCustom && (
          <TextInput
            style={[s.input, { backgroundColor: C.card, borderColor: accentColor, color: C.text, marginTop: 8 }]}
            placeholder="e.g. TheSandersSquad"
            placeholderTextColor={C.muted}
            value={customName}
            onChangeText={setCustomName}
            autoFocus
            autoCapitalize="words"
          />
        )}

        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: accentColor, marginTop: 24 }, confirmDisabled && s.btnDim]}
          onPress={confirm}
          disabled={confirmDisabled || saving}
        >
          {saving
            ? <ActivityIndicator color={C.bg} />
            : <Text style={[s.primaryBtnText, { color: C.bg }]}>LOCK IT IN</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={() => setScreen('input')}>
          <Text style={[s.backBtnText, { color: C.muted }]}>← try different info</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  container: { padding: 28, paddingTop: 48, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  sub: { fontSize: 14, lineHeight: 22, marginBottom: 32 },
  label: { fontSize: 10, letterSpacing: 4, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 15, marginBottom: 8, minHeight: 100 },
  primaryBtn: { borderRadius: 14, padding: 20, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', letterSpacing: 3 },
  btnDim: { opacity: 0.4 },
  loadingText: { fontSize: 14, letterSpacing: 2, marginTop: 16 },
  nameCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, padding: 20, marginBottom: 10 },
  namePrimary: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  checkmark: { fontSize: 20, fontWeight: '700' },
  backBtn: { alignItems: 'center', padding: 16, marginTop: 8 },
  backBtnText: { fontSize: 13, letterSpacing: 1 },
});
