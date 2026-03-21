import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { VALKYRIE } from '../themes/valkyrie';

const { width } = Dimensions.get('window');

interface ValkyriePRCelebrationProps {
  onComplete: () => void;
}

export default function ValkyriePRCelebration({ onComplete }: ValkyriePRCelebrationProps) {
  const shockwaveScale = useRef(new Animated.Value(0)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0.9)).current;
  const goldFlash = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(-140)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Silver shockwave radiates from center
      Animated.parallel([
        Animated.timing(shockwaveScale, {
          toValue: 3.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(shockwaveOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Gold flash
      Animated.sequence([
        Animated.timing(goldFlash, {
          toValue: 0.7,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(goldFlash, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // "VALKYRIE PR" slams in
      Animated.parallel([
        Animated.spring(textY, {
          toValue: 0,
          tension: 130,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(800),
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Silver shockwave */}
      <Animated.View
        style={[
          styles.shockwave,
          {
            transform: [{ scale: shockwaveScale }],
            opacity: shockwaveOpacity,
          },
        ]}
      />
      {/* Gold flash */}
      <Animated.View style={[styles.goldOverlay, { opacity: goldFlash }]} />
      {/* VALKYRIE PR text */}
      <Animated.Text
        style={[
          styles.prText,
          {
            transform: [{ translateY: textY }],
            opacity: textOpacity,
          },
        ]}
      >
        VALKYRIE PR
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
  shockwave: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: VALKYRIE.accent,
    backgroundColor: 'transparent',
  },
  goldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: VALKYRIE.gold,
  },
  prText: {
    fontSize: 52,
    color: VALKYRIE.text,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: VALKYRIE.accentBright,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
});
