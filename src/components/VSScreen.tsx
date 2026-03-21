import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// ── TYPES ──────────────────────────────────────────────────────────────────────

export interface VSUser {
  username: string;
  theme: string;
  rank: number;
  wins: number;
  losses: number;
  streak: number;
}

export interface VSScreenProps {
  userA: VSUser;
  userB: VSUser;
  mode: 'joint_ops' | 'ghost_protocol';
  ghostScore?: number;      // Person A's locked score for ghost_protocol mode
  shitTalkCount?: number;
  onBegin: () => void;
}

// ── THEME COLOUR MAP ───────────────────────────────────────────────────────────

const THEME_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  iron:     { bg: '#0a0a0a', accent: '#c9a84c', text: '#f0ece4' },
  form:     { bg: '#fdf6f0', accent: '#e8748a', text: '#2a1a14' },
  ronin:    { bg: '#060608', accent: '#c41e3a', text: '#f5e6c8' },
  valkyrie: { bg: '#0d0618', accent: '#c0c8d8', text: '#e8f0ff' },
  default:  { bg: '#0a0a0a', accent: '#ffffff', text: '#f0ece4' },
};

function themeColors(t: string) {
  return THEME_COLORS[t] ?? THEME_COLORS.default;
}

// ── VS CONFIG ─────────────────────────────────────────────────────────────────

interface VSConfig {
  centerText: string;
  divideColor: string;
  animationStyle: 'clash' | 'mirror' | 'storm';
}

export function getVSConfig(themeA: string, themeB: string): VSConfig {
  const key = [themeA, themeB].sort().join('/');
  switch (key) {
    case 'ronin/valkyrie':
      return { centerText: 'Discipline vs Power.', divideColor: '#8a1a50', animationStyle: 'clash' };
    case 'ronin/ronin':
      return { centerText: 'The blade meets itself.', divideColor: '#c41e3a', animationStyle: 'mirror' };
    case 'valkyrie/valkyrie':
      return { centerText: 'The field divides.', divideColor: '#e8f0ff', animationStyle: 'storm' };
    case 'iron/ronin':
      return { centerText: 'Precision vs Firepower.', divideColor: '#a07010', animationStyle: 'clash' };
    case 'form/ronin':
      return { centerText: 'The mountain vs the bloom.', divideColor: '#c45068', animationStyle: 'mirror' };
    default:
      return { centerText: 'The field awaits.', divideColor: '#ffffff', animationStyle: 'clash' };
  }
}

const RANK_LABELS = ['RECRUIT', 'SOLDIER', 'VETERAN', 'ELITE', 'COMMANDER', 'LEGENDARY'];
function rankLabel(rank: number) {
  return RANK_LABELS[Math.min(rank, RANK_LABELS.length - 1)] ?? 'RECRUIT';
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function VSScreen({ userA, userB, mode, ghostScore, shitTalkCount, onBegin }: VSScreenProps) {
  const config = getVSConfig(userA.theme, userB.theme);
  const colA = themeColors(userA.theme);
  const colB = themeColors(userB.theme);

  const rankDiff = Math.abs(userA.rank - userB.rank);
  const higherIsA = userA.rank > userB.rank;

  // Animation refs
  const splitAnim = useRef(new Animated.Value(0)).current;
  const fillAnim  = useRef(new Animated.Value(0)).current;
  const nameAnim  = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const modeLabelAnim = useRef(new Animated.Value(0)).current;
  const beginAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Split (200ms)
      Animated.timing(splitAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      // Fill colours (300ms)
      Animated.timing(fillAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Names slam in (400ms)
      Animated.timing(nameAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Stats fade (300ms)
      Animated.timing(statsAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Mode label
      Animated.timing(modeLabelAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      // 3s hold
      Animated.delay(3000),
      // BEGIN button
      Animated.timing(beginAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const nameASlide = nameAnim.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] });
  const nameBSlide = nameAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

  return (
    <View style={styles.container}>
      {/* Left side — User A */}
      <Animated.View style={[styles.side, styles.sideLeft, { backgroundColor: colA.bg, opacity: fillAnim }]}>
        {rankDiff >= 2 && higherIsA && (
          <View style={[styles.glow, { backgroundColor: colA.accent }]} />
        )}

        <Animated.Text style={[styles.username, { color: colA.accent, transform: [{ translateX: nameASlide }] }]}>
          @{userA.username}
        </Animated.Text>
        <Animated.Text style={[styles.rankLabel, { color: colA.text, opacity: statsAnim }]}>
          {rankLabel(userA.rank)}
        </Animated.Text>
        {rankDiff >= 2 && !higherIsA && (
          <Animated.View style={[styles.challengerBadge, { opacity: statsAnim }]}>
            <Text style={styles.challengerText}>CHALLENGER</Text>
          </Animated.View>
        )}

        <Animated.View style={[styles.statsBlock, { opacity: statsAnim }]}>
          <StatRow label="W" value={userA.wins} color={colA.accent} />
          <StatRow label="L" value={userA.losses} color={colA.text} />
          <StatRow label="🔥" value={userA.streak} color={colA.accent} />
        </Animated.View>
      </Animated.View>

      {/* Right side — User B */}
      <Animated.View style={[styles.side, styles.sideRight, { backgroundColor: colB.bg, opacity: fillAnim }]}>
        {rankDiff >= 2 && !higherIsA && (
          <View style={[styles.glow, styles.glowRight, { backgroundColor: colB.accent }]} />
        )}

        <Animated.Text style={[styles.username, { color: colB.accent, textAlign: 'right', transform: [{ translateX: nameBSlide }] }]}>
          @{userB.username}
        </Animated.Text>
        <Animated.Text style={[styles.rankLabel, { color: colB.text, textAlign: 'right', opacity: statsAnim }]}>
          {rankLabel(userB.rank)}
        </Animated.Text>
        {rankDiff >= 2 && higherIsA && (
          <Animated.View style={[styles.challengerBadge, styles.challengerRight, { opacity: statsAnim }]}>
            <Text style={styles.challengerText}>CHALLENGER</Text>
          </Animated.View>
        )}

        <Animated.View style={[styles.statsBlock, styles.statsRight, { opacity: statsAnim }]}>
          <StatRow label="W" value={userB.wins} color={colB.accent} right />
          <StatRow label="L" value={userB.losses} color={colB.text} right />
          <StatRow label="🔥" value={userB.streak} color={colB.accent} right />
        </Animated.View>
      </Animated.View>

      {/* Center divide */}
      <Animated.View style={[styles.divide, { backgroundColor: config.divideColor, transform: [{ scaleY: splitAnim }] }]} />

      {/* Center overlay — mode label + center text */}
      <View style={styles.centerOverlay} pointerEvents="none">
        <Animated.Text style={[styles.modeLabel, { opacity: modeLabelAnim }]}>
          {mode === 'joint_ops' ? 'JOINT OPS' : 'GHOST PROTOCOL'}
        </Animated.Text>
        <Animated.Text style={[styles.centerText, { color: config.divideColor, opacity: statsAnim }]}>
          {config.centerText}
        </Animated.Text>

        {mode === 'ghost_protocol' && ghostScore !== undefined && (
          <Animated.View style={[styles.ghostInfo, { opacity: statsAnim }]}>
            <Text style={styles.ghostScore}>{ghostScore} pts</Text>
            <Text style={styles.ghostSub}>They went first. Now it's your turn.</Text>
            {!!shitTalkCount && (
              <Text style={styles.shitTalkCount}>{shitTalkCount} messages waiting.</Text>
            )}
          </Animated.View>
        )}

        {mode === 'joint_ops' && !!shitTalkCount && (
          <Animated.Text style={[styles.shitTalkCount, { opacity: statsAnim }]}>
            {shitTalkCount} messages waiting.
          </Animated.Text>
        )}
      </View>

      {/* BEGIN button */}
      <Animated.View style={[styles.beginWrapper, { opacity: beginAnim }]}>
        <TouchableOpacity style={[styles.beginBtn, { borderColor: config.divideColor }]} onPress={onBegin}>
          <Text style={[styles.beginText, { color: config.divideColor }]}>BEGIN</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function StatRow({ label, value, color, right }: { label: string; value: number; color: string; right?: boolean }) {
  return (
    <View style={[styles.statRow, right && { flexDirection: 'row-reverse' }]}>
      <Text style={[styles.statLabel, { color, opacity: 0.7 }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },

  side: { flex: 1, padding: 24, paddingTop: 80, overflow: 'hidden' },
  sideLeft: { alignItems: 'flex-start' },
  sideRight: { alignItems: 'flex-end' },

  glow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.08,
  },
  glowRight: { left: 0, right: 0 },

  username: { fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  rankLabel: { fontSize: 11, letterSpacing: 3, marginBottom: 16, opacity: 0.8 },

  challengerBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 12,
  },
  challengerRight: { alignSelf: 'flex-end' },
  challengerText: { fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 2 },

  statsBlock: { gap: 6, marginTop: 8 },
  statsRight: { alignItems: 'flex-end' },

  statRow: { flexDirection: 'row', gap: 8, alignItems: 'baseline' },
  statLabel: { fontSize: 11, letterSpacing: 2, fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '700' },

  divide: {
    position: 'absolute',
    left: width / 2 - 1,
    top: 0,
    width: 2,
    height: height,
    transformOrigin: 'top',
  },

  centerOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  } as any,
  modeLabel: {
    fontSize: 10, color: '#888', letterSpacing: 4, fontWeight: '700',
    marginBottom: 8, textAlign: 'center',
  },
  centerText: {
    fontSize: 16, fontWeight: '700', letterSpacing: 1,
    textAlign: 'center', paddingHorizontal: 32,
  },

  ghostInfo: { marginTop: 16, alignItems: 'center' },
  ghostScore: { fontSize: 36, color: '#fff', fontWeight: '900', letterSpacing: 2 },
  ghostSub: { fontSize: 12, color: '#888', marginTop: 4, textAlign: 'center' },
  shitTalkCount: { fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center', letterSpacing: 1 },

  beginWrapper: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  beginBtn: {
    borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 64,
  },
  beginText: { fontSize: 20, fontWeight: '900', letterSpacing: 6 },
});
