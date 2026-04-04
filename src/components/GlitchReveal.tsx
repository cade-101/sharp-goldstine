import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet,
  Dimensions, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';

const { width: SW, height: SH } = Dimensions.get('window');

type Props = {
  themeKey: string;
  themeName: string;
  bridgeName: string;
  currentProgress: number;
  targetProgress: number;
  onDismiss: () => void;
};

// 200 random noise squares
const NOISE_SQUARES = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  x: Math.random() * SW,
  y: Math.random() * SH,
  opacity: Math.random() * 0.6,
}));

export default function GlitchReveal({
  themeKey, themeName, bridgeName, currentProgress, targetProgress, onDismiss,
}: Props) {
  const { themeTokens: T } = useUser();

  // Phase state
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [showTap, setShowTap] = useState(false);
  const [noiseVisible, setNoiseVisible] = useState(false);

  // Animated values
  const edgeOpacity = useRef(new Animated.Value(1)).current;
  const blackOverlay = useRef(new Animated.Value(0)).current;
  const signalOpacity = useRef(new Animated.Value(0)).current;
  const bridgeOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(300)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const noiseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Phase 1 — edge flicker (0–800ms)
    let flicker = 0;
    const flickerIv = setInterval(() => {
      edgeOpacity.setValue(Math.random() > 0.5 ? 1 : 0.3);
      flicker++;
      if (flicker > 8) clearInterval(flickerIv);
    }, 80);

    const p2Timer = setTimeout(() => {
      // Phase 2 — blackout + noise (800–1600ms)
      setPhase(2);
      Animated.timing(blackOverlay, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start(() => {
        setNoiseVisible(true);
        // noise flicker
        let nf = 0;
        const niv = setInterval(() => {
          noiseAnim.setValue(Math.random());
          nf++;
          if (nf > 12) clearInterval(niv);
        }, 60);
      });

      const p3Timer = setTimeout(() => {
        // Phase 3 — signal text (1600–2400ms)
        setPhase(3);
        Animated.sequence([
          Animated.timing(signalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(300),
          Animated.timing(bridgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        const p4Timer = setTimeout(() => {
          // Phase 4 — card slides up
          setPhase(4);
          Animated.parallel([
            Animated.spring(cardTranslate, { toValue: 0, useNativeDriver: true, tension: 50, friction: 9 }),
            Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]).start();
          setTimeout(() => setShowTap(true), 600);
        }, 800);

        return () => clearTimeout(p4Timer);
      }, 800);

      return () => clearTimeout(p3Timer);
    }, 800);

    return () => {
      clearTimeout(p2Timer);
      clearInterval(flickerIv);
    };
  }, []);

  async function handleDismiss() {
    await AsyncStorage.setItem(`glitch_shown_${themeKey}`, '1');
    onDismiss();
  }

  const pct = Math.round((currentProgress / targetProgress) * 100);
  const fillWidth = Math.min(pct, 100);

  return (
    <TouchableOpacity style={styles.root} onPress={phase === 4 ? handleDismiss : undefined} activeOpacity={1}>
      <StatusBar hidden />

      {/* Phase 1: edge lines */}
      {phase === 1 && (
        <>
          <Animated.View style={[styles.edgeTop,    { opacity: edgeOpacity, backgroundColor: T.accent }]} />
          <Animated.View style={[styles.edgeBottom, { opacity: edgeOpacity, backgroundColor: T.accent }]} />
          <Animated.View style={[styles.edgeLeft,   { opacity: edgeOpacity, backgroundColor: T.accent }]} />
          <Animated.View style={[styles.edgeRight,  { opacity: edgeOpacity, backgroundColor: T.accent }]} />
        </>
      )}

      {/* Black overlay */}
      <Animated.View style={[styles.blackOverlay, { opacity: blackOverlay }]} />

      {/* Noise squares */}
      {noiseVisible && NOISE_SQUARES.map(sq => (
        <Animated.View
          key={sq.id}
          style={{
            position: 'absolute',
            left: sq.x,
            top: sq.y,
            width: 2,
            height: 2,
            backgroundColor: T.accent,
            opacity: noiseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, sq.opacity] }),
          }}
        />
      ))}

      {/* Phase 3: signal text */}
      {(phase === 3 || phase === 4) && (
        <View style={styles.signalContainer}>
          <Animated.Text style={[styles.signalLabel, { color: T.accent, opacity: signalOpacity }]}>
            SIGNAL DETECTED
          </Animated.Text>
          <Animated.Text style={[styles.bridgeLabel, { color: T.text, opacity: bridgeOpacity }]}>
            {bridgeName}
          </Animated.Text>
        </View>
      )}

      {/* Phase 4: reveal card */}
      {phase === 4 && (
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: T.card, borderColor: T.accent, transform: [{ translateY: cardTranslate }], opacity: cardOpacity },
          ]}
        >
          <Text style={[styles.cardEyebrow, { color: T.accent }]}>UNKNOWN ERA DETECTED</Text>
          <Text style={[styles.cardTitle, { color: T.text }]}>{themeName}</Text>
          <View style={[styles.divider, { backgroundColor: T.border }]} />

          <Text style={[styles.progressLabel, { color: T.muted }]}>YOUR PROGRESS</Text>
          <View style={[styles.progressTrack, { backgroundColor: T.border }]}>
            <View style={[styles.progressFill, { width: `${fillWidth}%` as any, backgroundColor: T.accent }]} />
          </View>
          <Text style={[styles.progressCount, { color: T.muted }]}>
            {currentProgress} / {targetProgress}
          </Text>
          <Text style={[styles.encouragement, { color: T.muted }]}>
            Keep going. Something is forming.
          </Text>

          {showTap && (
            <Text style={[styles.tapLabel, { color: T.muted }]}>TAP TO CONTINUE</Text>
          )}
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  blackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  edgeTop:    { position: 'absolute', top: 0,    left: 0, right: 0,  height: 2 },
  edgeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0,  height: 2 },
  edgeLeft:   { position: 'absolute', left: 0,   top: 0,  bottom: 0, width: 2 },
  edgeRight:  { position: 'absolute', right: 0,  top: 0,  bottom: 0, width: 2 },
  signalContainer: {
    position: 'absolute',
    top: SH * 0.35,
    alignItems: 'center',
  },
  signalLabel: {
    fontSize: 11,
    letterSpacing: 8,
    fontWeight: '700',
    marginBottom: 20,
  },
  bridgeLabel: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 4,
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 32,
    paddingBottom: 48,
  },
  cardEyebrow: {
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressCount: {
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 12,
  },
  encouragement: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  tapLabel: {
    fontSize: 10,
    letterSpacing: 3,
    textAlign: 'center',
  },
});
