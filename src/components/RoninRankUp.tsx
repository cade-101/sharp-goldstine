import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { RONIN } from '../themes/ronin';

const { width, height } = Dimensions.get('window');

interface RoninRankUpProps {
  rankKanji: string;
  onComplete: () => void;
}

// Individual petal
function Petal({ delay, startX }: { delay: number; startX: number }) {
  const y = useRef(new Animated.Value(-30)).current;
  const x = useRef(new Animated.Value(startX)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(y, { toValue: height + 40, duration: 2800, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(x, { toValue: startX + 18, duration: 700, useNativeDriver: true }),
          Animated.timing(x, { toValue: startX - 12, duration: 700, useNativeDriver: true }),
          Animated.timing(x, { toValue: startX + 10, duration: 700, useNativeDriver: true }),
          Animated.timing(x, { toValue: startX, duration: 700, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.petal,
        { transform: [{ translateY: y }, { translateX: x }], opacity },
      ]}
    />
  );
}

const PETALS = [
  { delay: 0,   startX: width * 0.2 },
  { delay: 200, startX: width * 0.4 },
  { delay: 100, startX: width * 0.6 },
  { delay: 350, startX: width * 0.3 },
  { delay: 500, startX: width * 0.7 },
];

export default function RoninRankUp({ rankKanji, onComplete }: RoninRankUpProps) {
  const kanjiOpacity = useRef(new Animated.Value(0)).current;
  const kanjiScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(400),
      // Rank kanji appears
      Animated.parallel([
        Animated.spring(kanjiScale, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(kanjiOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1200),
      // Dissolves
      Animated.timing(kanjiOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {PETALS.map((p, i) => (
        <Petal key={i} delay={p.delay} startX={p.startX} />
      ))}
      <Animated.Text
        style={[
          styles.rankKanji,
          {
            opacity: kanjiOpacity,
            transform: [{ scale: kanjiScale }],
          },
        ]}
      >
        {rankKanji}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  petal: {
    position: 'absolute',
    top: 0,
    width: 12,
    height: 18,
    borderRadius: 9,
    backgroundColor: RONIN.accentSoft,
    opacity: 0.85,
  },
  rankKanji: {
    fontSize: 128,
    color: RONIN.text,
    fontWeight: '300',
    letterSpacing: 4,
    textShadowColor: RONIN.accentSoft,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
});
