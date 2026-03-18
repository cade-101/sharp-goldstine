import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Modal, Animated,
  ActivityIndicator, Image
} from 'react-native';
import { supabase } from '../lib/supabase';
import { generateUsername, ANTHROPIC_API_KEY } from '../lib/config';

const C = {
  black: '#0a0a0a', dark: '#111111', card: '#181818', border: '#2a2a2a',
  gold: '#c9a84c', goldDim: '#7a6230', green: '#3ce08a', white: '#f0ece4',
  muted: '#666666', red: '#e03c3c', rose: '#e8748a',
};

const PROPS_LIST = [
  '🔥 BEAST', '💪 CRUSHED IT', '👑 PR QUEEN/KING', '⚡ ELECTRIC',
  '🏆 CHAMPION', '😤 UNSTOPPABLE', '🎯 LOCKED IN', '💥 DESTROYED IT',
  '🚀 LAUNCHED', '❤️ SO PROUD', '😍 SMOKESHOW', '🤝 LETS GO',
  '🧠 BIG BRAIN', '💀 KILLED IT', '✨ GLOWING', '🫡 RESPECT',
];

const HOUSE_THEMES = [
  { id: 'minecraft', label: 'Minecraft' },
  { id: 'hockey', label: 'Hockey' },
  { id: 'skating', label: 'Skating' },
  { id: 'dinosaurs', label: 'Dinosaurs' },
  { id: 'superheroes', label: 'Superheroes' },
  { id: 'space', label: 'Space' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'animals', label: 'Animals' },
  { id: 'kpop', label: 'K-pop' },
  { id: 'art', label: 'Art' },
  { id: 'music', label: 'Music' },
  { id: 'pokemon', label: 'Pokémon' },
  { id: 'lego', label: 'LEGO' },
  { id: 'roblox', label: 'Roblox' },
  { id: 'swimming', label: 'Swimming' },
];

export default function HouseholdSetup({ onComplete }: { onComplete: (data: any) => void }) {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState(generateUsername());
  const [kidsThemes, setKidsThemes] = useState<string[]>([]);
  const [houseName, setHouseName] = useState('');
  const [houseNameLoading, setHouseNameLoading] = useState(false);
  const [houseNameOptions, setHouseNameOptions] = useState<string[]>([]);
  const [selectedHouseName, setSelectedHouseName] = useState('');

  function rerollUsername() {
    setUsername(generateUsername());
  }

  function toggleTheme(id: string) {
    setKidsThemes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function generateHouseNames() {
    if (kidsThemes.length === 0) return;
    setHouseNameLoading(true);
    setStep(2);

    try {
      const themeLabels = kidsThemes.map(t => HOUSE_THEMES.find(h => h.id === t)?.label).join(', ');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `Generate 4 creative, fun, deeply specific household/family names based on these kids' interests: ${themeLabels}.

Rules:
- Go DEEP into the pop culture, not surface level
- Combine the themes in unexpected ways
- Make it sound like a legendary house/clan name
- Each should be 2-4 words max
- Should make the family laugh and feel proud
- NOT generic (not "The Gaming Family" or "Hockey House")
- Think: "The Creeper Battalion", "House Endermite", "The Diamond Sword Dojo"
- Unexpected mashups are gold

Return ONLY a JSON array of 4 strings. No explanation. No markdown.`
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '[]';
      const cleaned = text.replace(/```json|```/g, '').trim();
      const names = JSON.parse(cleaned);
      setHouseNameOptions(names);
    } catch (e) {
      setHouseNameOptions(['House Chaos', 'The Wild Bunch', 'Team Mayhem', 'The Legend Squad']);
    }

    setHouseNameLoading(false);
  }

  async function finish() {
    const data = {
      username,
      house_name: selectedHouseName || houseNameOptions[0],
      kids_themes: kidsThemes,
    };
    onComplete(data);
  }

  // Step 0 — Username
  if (step === 0) return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.stepLabel}>FIRST THINGS FIRST</Text>
        <Text style={s.title}>Your alias.</Text>
        <Text style={s.sub}>Anonymous by default. This is how you show up in Tether.</Text>

        <View style={s.usernameBox}>
          <Text style={s.usernameText}>{username}</Text>
          <TouchableOpacity style={s.rerollBtn} onPress={rerollUsername}>
            <Text style={s.rerollBtnText}>🎲 Reroll</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.orLabel}>— or type your own —</Text>
        <TextInput
          style={s.input}
          placeholder="custom username"
          placeholderTextColor={C.muted}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(1)}>
          <Text style={s.primaryBtnText}>That's me →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // Step 1 — Kids themes
  if (step === 1) return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.stepLabel}>YOUR HOUSE</Text>
        <Text style={s.title}>What are your kids into?</Text>
        <Text style={s.sub}>We'll generate your family's legendary house name.</Text>

        <View style={s.chipGrid}>
          {HOUSE_THEMES.map(theme => (
            <TouchableOpacity
              key={theme.id}
              style={[s.chip, kidsThemes.includes(theme.id) && s.chipActive]}
              onPress={() => toggleTheme(theme.id)}
            >
              <Text style={[s.chipText, kidsThemes.includes(theme.id) && s.chipTextActive]}>{theme.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, kidsThemes.length === 0 && s.btnDim]}
          onPress={generateHouseNames}
          disabled={kidsThemes.length === 0}
        >
          <Text style={s.primaryBtnText}>Generate our house name →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={() => { setHouseNameOptions(['House Tether']); setStep(2); }}>
          <Text style={s.skipBtnText}>Skip — no kids</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // Step 2 — House name selection
  return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.stepLabel}>PICK YOUR HOUSE</Text>
        <Text style={s.title}>Your family name.</Text>
        <Text style={s.sub}>This shows up everywhere in Tether.</Text>

        {houseNameLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={C.gold} size="large" />
            <Text style={s.loadingText}>Generating your legend...</Text>
          </View>
        ) : (
          <>
            {houseNameOptions.map((name, i) => (
              <TouchableOpacity
                key={i}
                style={[s.houseCard, selectedHouseName === name && s.houseCardActive]}
                onPress={() => setSelectedHouseName(name)}
              >
                <Text style={[s.houseName, selectedHouseName === name && s.houseNameActive]}>{name}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={s.rerollHouseBtn} onPress={generateHouseNames}>
              <Text style={s.rerollBtnText}>🎲 Generate more</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.primaryBtn, !selectedHouseName && s.btnDim]}
              onPress={finish}
              disabled={!selectedHouseName}
            >
              <Text style={s.primaryBtnText}>This is us →</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── PROPS MODAL ────────────────────────────────────────────
export function PropsModal({
  visible, onClose, fromUser, toUser, prExercise, prWeight, prReps
}: {
  visible: boolean;
  onClose: () => void;
  fromUser: string;
  toUser: string;
  prExercise?: string;
  prWeight?: number;
  prReps?: number;
}) {
  async function sendProps(message: string) {
    await supabase.from('props').insert({
      from_user: fromUser,
      to_user: toUser,
      message,
      seen: false,
    });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.propsOverlay}>
        <View style={s.propsSheet}>
          <Text style={s.propsTitle}>🏆 SEND PROPS</Text>
          {prExercise && (
            <View style={s.prCard}>
              <Text style={s.prCardLabel}>NEW PR</Text>
              <Text style={s.prCardExercise}>{prExercise}</Text>
              <Text style={s.prCardWeight}>{prWeight}kg × {prReps}</Text>
            </View>
          )}
          <Text style={s.propsLabel}>TAP TO SEND</Text>
          <View style={s.propsList}>
            {PROPS_LIST.map((prop, i) => (
              <TouchableOpacity key={i} style={s.propChip} onPress={() => sendProps(prop)}>
                <Text style={s.propChipText}>{prop}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.propsClose} onPress={onClose}>
            <Text style={s.propsCloseText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── PR CELEBRATION ─────────────────────────────────────────
export function PRCelebration({
  visible, exercise, weight, reps, onClose, onSendProps
}: {
  visible: boolean;
  exercise: string;
  weight: number;
  reps: number;
  onClose: () => void;
  onSendProps: () => void;
}) {
  const CELEBRATION_GIFS = [
    'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',  // confetti explosion
    'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', // celebration dance
    'https://media.giphy.com/media/l0HlNaQ6gWfllcjDO/giphy.gif',  // trophy rain
    'https://media.giphy.com/media/5xaOcLGvzHxDKjufnLW/giphy.gif', // spongebob rainbow
    'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif',  // crowd going wild
    'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',  // fireworks
    'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif',  // happy dance
    'https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif',  // winning
  ];

  const gif = CELEBRATION_GIFS[Math.floor(Math.random() * CELEBRATION_GIFS.length)];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.prOverlay}>
        <Image
          source={{ uri: gif }}
          style={s.celebGif}
          resizeMode="cover"
        />
        <View style={s.prBox}>
          <Text style={s.prEmoji}>🏆</Text>
          <Text style={s.prTitle}>NEW PR</Text>
          <Text style={s.prExercise}>{exercise}</Text>
          <Text style={s.prNumbers}>{weight}kg × {reps}</Text>
          <TouchableOpacity style={s.sendPropsBtn} onPress={onSendProps}>
            <Text style={s.sendPropsBtnText}>Send props to partner 💪</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.prClose} onPress={onClose}>
            <Text style={s.prCloseText}>Keep going →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
    celebGif: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4 },
  bg: { flex: 1, backgroundColor: C.black },
  container: { padding: 28, paddingTop: 40, flexGrow: 1 },
  stepLabel: { fontSize: 11, color: C.gold, letterSpacing: 4, marginBottom: 8 },
  title: { fontSize: 36, color: C.white, fontWeight: '700', marginBottom: 8, lineHeight: 40 },
  sub: { fontSize: 14, color: C.muted, marginBottom: 32, lineHeight: 20 },
  usernameBox: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.goldDim, padding: 24, alignItems: 'center', marginBottom: 16 },
  usernameText: { fontSize: 28, color: C.gold, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  rerollBtn: { backgroundColor: C.dark, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: C.border },
  rerollBtnText: { fontSize: 14, color: C.white, letterSpacing: 1 },
  orLabel: { textAlign: 'center', fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 12 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16, fontSize: 16, color: C.white, marginBottom: 24 },
  primaryBtn: { backgroundColor: C.gold, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: C.black, fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  btnDim: { opacity: 0.4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chipActive: { borderColor: C.gold, backgroundColor: '#1a1608' },
  chipText: { fontSize: 14, color: C.muted },
  chipTextActive: { color: C.gold, fontWeight: '600' },
  skipBtn: { alignItems: 'center', padding: 12 },
  skipBtnText: { fontSize: 13, color: C.muted, letterSpacing: 1 },
  loadingBox: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  loadingText: { fontSize: 14, color: C.muted, letterSpacing: 2 },
  houseCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 22, marginBottom: 12, alignItems: 'center' },
  houseCardActive: { borderColor: C.gold, backgroundColor: '#1a1608' },
  houseName: { fontSize: 22, color: C.white, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  houseNameActive: { color: C.gold },
  rerollHouseBtn: { alignItems: 'center', padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.border, borderRadius: 12 },

  // Props modal
  propsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  propsSheet: { backgroundColor: C.dark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  propsTitle: { fontSize: 22, color: C.gold, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 16 },
  prCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.goldDim, padding: 16, alignItems: 'center', marginBottom: 20 },
  prCardLabel: { fontSize: 10, color: C.gold, letterSpacing: 3, marginBottom: 4 },
  prCardExercise: { fontSize: 20, color: C.white, fontWeight: '700', marginBottom: 4 },
  prCardWeight: { fontSize: 16, color: C.muted },
  propsLabel: { fontSize: 10, color: C.muted, letterSpacing: 3, marginBottom: 14, textAlign: 'center' },
  propsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 },
  propChip: { backgroundColor: C.card, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border },
  propChipText: { fontSize: 14, color: C.white, fontWeight: '500' },
  propsClose: { alignItems: 'center', padding: 12 },
  propsCloseText: { fontSize: 13, color: C.muted },

  // PR celebration
  prOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  prBox: { backgroundColor: C.card, borderRadius: 24, borderWidth: 2, borderColor: C.gold, padding: 32, alignItems: 'center', width: '100%' },
  prEmoji: { fontSize: 64, marginBottom: 8 },
  prTitle: { fontSize: 48, color: C.gold, fontWeight: '900', letterSpacing: 4, marginBottom: 8 },
  prExercise: { fontSize: 20, color: C.white, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  prNumbers: { fontSize: 32, color: C.green, fontWeight: '700', marginBottom: 24 },
  sendPropsBtn: { backgroundColor: C.gold, borderRadius: 14, padding: 18, alignItems: 'center', width: '100%', marginBottom: 10 },
  sendPropsBtnText: { color: C.black, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  prClose: { padding: 12 },
  prCloseText: { fontSize: 14, color: C.muted, letterSpacing: 2 },
});
