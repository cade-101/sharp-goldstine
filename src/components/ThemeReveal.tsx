import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, Pressable, Dimensions } from 'react-native';
import { ThemeTokens } from '../themes';

const { width, height } = Dimensions.get('window');

export type ThemeRevealProps = {
  newTheme: ThemeTokens;
  previousTheme?: ThemeTokens;
  onComplete: () => void;
  revealLabel?: string;
};

const REVEAL_COPY: Record<string, { label: string; line: string }> = {
  iron:        { label: 'ERA UNLOCKED',   line: 'The iron holds.' },
  ronin:       { label: 'ERA UNLOCKED',   line: '浪人 — The blade finds its path.' },
  valkyrie:    { label: 'ERA GRANTED',    line: 'She who decides who rises.' },
  forge:       { label: 'ERA UNLOCKED',   line: 'The stronghold is yours.' },
  arcane:      { label: 'ERA UNLOCKED',   line: 'The vault opens.' },
  dragonfire:  { label: 'ERA UNLOCKED',   line: 'Unleashed.' },
  void:        { label: 'ERA UNLOCKED',   line: 'Operating 10 steps ahead.' },
  verdant:     { label: 'ERA UNLOCKED',   line: 'Patient. Relentless. Rooted.' },
  form:        { label: 'ERA UNLOCKED',   line: 'Strong. Always has been.' },
  shadow:      { label: 'INITIALIZING',   line: 'Choose your era.' },
  // New themes
  hearth:      { label: 'ERA UNLOCKED',   line: 'Warm. Clear. Yours.' },
  copper:      { label: 'ERA UNLOCKED',   line: 'Earned. Forged. Ready.' },
  spartan:     { label: 'ERA UNLOCKED',   line: 'The wall holds.' },
  centurion:   { label: 'ERA UNLOCKED',   line: 'Built to last a thousand years.' },
  viking:      { label: 'ERA UNLOCKED',   line: 'The sea is just distance.' },
  shogun:      { label: 'ERA UNLOCKED',   line: 'The field is yours to command.' },
  dynasty:     { label: 'ERA UNLOCKED',   line: 'Built one day at a time.' },
  templar:     { label: 'ERA UNLOCKED',   line: 'The order holds.' },
  sanctum:     { label: 'ERA UNLOCKED',   line: 'Peace is something you build.' },
  pharaoh:     { label: 'ERA UNLOCKED',   line: 'Your work outlasts you.' },
  oasis:       { label: 'ERA UNLOCKED',   line: 'Water finds a way.' },
  kraken:      { label: 'ERA UNLOCKED',   line: 'The deep has no limits.' },
  leviathan:   { label: 'ERA UNLOCKED',   line: 'Ancient. Patient. Inevitable.' },
  wendigo:     { label: 'ERA UNLOCKED',   line: 'The forest is listening.' },
  phoenix:     { label: 'ERA UNLOCKED',   line: 'You came back. Again.' },
  nebula:      { label: 'ERA UNLOCKED',   line: 'You are made of this.' },
  aurora:      { label: 'ERA UNLOCKED',   line: 'The light always comes back.' },
  dusk:        { label: 'ERA UNLOCKED',   line: 'Between the light and dark.' },
  cedar:       { label: 'ERA UNLOCKED',   line: 'Roots first. Then reach.' },
  ember:       { label: 'ERA UNLOCKED',   line: 'Still warm. Still going.' },
  parchment:   { label: 'ERA UNLOCKED',   line: 'Knowledge is its own power.' },
  bloom:       { label: 'ERA UNLOCKED',   line: 'Something is growing. Let it.' },
  wraith:      { label: 'ERA UNLOCKED',   line: 'Unseen does not mean absent.' },
  solstice:    { label: 'ERA UNLOCKED',   line: 'The longest day. You made it.' },
  druid:       { label: 'ERA UNLOCKED',   line: 'The stones remember.' },
  grove:       { label: 'ERA UNLOCKED',   line: 'The grove grows what it needs.' },
  slate:       { label: 'ERA UNLOCKED',   line: 'Nothing unnecessary.' },
  // Bridge themes
  dustmark:    { label: 'SIGNAL FORMING', line: 'Something is taking shape...' },
  lowtide:     { label: 'SIGNAL FORMING', line: 'The tide is turning...' },
  thawline:    { label: 'SIGNAL FORMING', line: 'The frost is breaking...' },
  glassveil:   { label: 'SIGNAL FORMING', line: 'The veil is thinning...' },
  staticdrift: { label: 'SIGNAL FORMING', line: 'Signal detected. Stabilizing...' },
};

export const ThemeReveal: React.FC<ThemeRevealProps> = ({
  newTheme,
  previousTheme,
  onComplete,
  revealLabel,
}) => {
  const key = newTheme.name.toLowerCase();
  const copy = REVEAL_COPY[key] ?? { label: 'ERA UNLOCKED', line: '' };
  const label = revealLabel ?? copy.label;

  const prevBg    = previousTheme?.bg     ?? '#000000';
  const prevAccent = previousTheme?.accent ?? '#333333';
  const prevText  = previousTheme?.text   ?? '#ffffff';

  // Phase 0: split panel (old | new) — held for 800ms
  // Phase 1: new theme bleeds left across old panel (300ms)
  // Phase 2: theme name slams in, tap prompt fades in

  const [ready, setReady] = useState(false);

  // Phase 1: left panel bleed
  const bleedTranslate = useRef(new Animated.Value(0)).current;

  // Phase 2: name slam
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameScale   = useRef(new Animated.Value(0.82)).current;
  const lineOpacity = useRef(new Animated.Value(0)).current;
  const tapOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Short delay so previous screen is clearly visible before animation starts
    const t = setTimeout(() => {
      setReady(true);
      Animated.sequence([
        Animated.delay(800), // hold split for 800ms
        // New theme bleeds left: the right panel (new theme) expands to cover left
        Animated.timing(bleedTranslate, { toValue: -width * 0.5, duration: 300, useNativeDriver: true }),
        // Name slams in
        Animated.parallel([
          Animated.timing(nameOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(nameScale,   { toValue: 1, friction: 5, useNativeDriver: true }),
        ]),
        Animated.timing(lineOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(600),
        Animated.timing(tapOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 80);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    // Render nothing for the first 80ms so previous screen doesn't flash
    return <View style={[styles.root, { backgroundColor: prevBg }]} />;
  }

  return (
    <Pressable style={[styles.root, { backgroundColor: newTheme.bg }]} onPress={onComplete}>
      {/* Left half — previous theme */}
      <View style={[styles.halfLeft, { backgroundColor: prevBg }]}>
        <View style={styles.halfContent}>
          <Text style={[styles.halfLabel, { color: prevAccent }]}>
            {(previousTheme?.name ?? 'PREVIOUS').toUpperCase()}
          </Text>
          <View style={[styles.halfSwatch, { backgroundColor: prevAccent }]} />
          <Text style={[styles.halfSwatchLabel, { color: prevText, opacity: 0.4 }]}>
            {prevBg.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Right half — new theme (bleeds left) */}
      <Animated.View
        style={[
          styles.halfRight,
          { backgroundColor: newTheme.bg, transform: [{ translateX: bleedTranslate }] },
        ]}
      >
        <View style={styles.halfContent}>
          <Text style={[styles.halfLabel, { color: newTheme.accent }]}>
            {newTheme.name.toUpperCase()}
          </Text>
          <View style={[styles.halfSwatch, { backgroundColor: newTheme.accent }]} />
          <Text style={[styles.halfSwatchLabel, { color: newTheme.text, opacity: 0.4 }]}>
            {newTheme.bg.toUpperCase()}
          </Text>
        </View>
      </Animated.View>

      {/* Centre divider — hides once bleed starts */}
      <View style={[styles.dividerLine, { backgroundColor: newTheme.border }]} />

      {/* Name + copy — fades in after bleed */}
      <Animated.View style={[styles.nameContainer, { opacity: nameOpacity, transform: [{ scale: nameScale }] }]}>
        <Text style={[styles.eraLabel, { color: newTheme.muted }]}>{label}</Text>
        <Text style={[styles.themeName, { color: newTheme.accent }]}>{newTheme.name.toUpperCase()}</Text>
        <Animated.View style={{ opacity: lineOpacity, alignItems: 'center' }}>
          <View style={[styles.nameDivider, { backgroundColor: newTheme.accent }]} />
          {copy.line ? (
            <Text style={[styles.tagline, { color: newTheme.text }]}>{copy.line}</Text>
          ) : null}
        </Animated.View>
      </Animated.View>

      <Animated.Text style={[styles.tapToContinue, { opacity: tapOpacity, color: newTheme.muted }]}>
        TAP TO CONTINUE
      </Animated.Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root:           { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 9999 },

  halfLeft:       { position: 'absolute', top: 0, left: 0, width: width * 0.5, height, justifyContent: 'center', alignItems: 'center' },
  halfRight:      { position: 'absolute', top: 0, left: width * 0.5, width: width * 0.5, height, justifyContent: 'center', alignItems: 'center' },
  halfContent:    { alignItems: 'center', gap: 10 },
  halfLabel:      { fontSize: 10, fontWeight: '800', letterSpacing: 3 },
  halfSwatch:     { width: 32, height: 32, borderRadius: 8 },
  halfSwatchLabel:{ fontSize: 9, letterSpacing: 1, fontFamily: 'monospace' },

  dividerLine:    { position: 'absolute', top: 0, left: width * 0.5 - 0.5, width: 1, height, opacity: 0.4 },

  nameContainer:  { alignItems: 'center', zIndex: 10 },
  eraLabel:       { fontSize: 11, letterSpacing: 4, marginBottom: 14, fontWeight: '600' },
  themeName:      { fontSize: 52, fontWeight: '900', letterSpacing: 4 },
  nameDivider:    { width: 40, height: 2, marginTop: 18, marginBottom: 14, opacity: 0.6 },
  tagline:        { fontSize: 14, letterSpacing: 1, opacity: 0.8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

  tapToContinue:  { position: 'absolute', bottom: 60, fontSize: 11, letterSpacing: 3 },
});

export default ThemeReveal;
