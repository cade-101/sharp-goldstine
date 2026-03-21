import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { RONIN } from '../themes/ronin';

const { width, height } = Dimensions.get('window');

interface RoninPRCelebrationProps {
  onComplete: () => void;
}

export default function RoninPRCelebration({ onComplete }: RoninPRCelebrationProps) {
  const shockwaveScale = useRef(new Animated.Value(0)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0.8)).current;
  const goldFlash = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(-120)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Red shockwave radiates from center
      Animated.parallel([
        Animated.timing(shockwaveScale, {
          toValue: 3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(shockwaveOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Gold flash overlay
      Animated.sequence([
        Animated.timing(goldFlash, {
          toValue: 0.6,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(goldFlash, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // "NEW PR" slams down from top
      Animated.parallel([
        Animated.spring(textY, {
          toValue: 0,
          tension: 120,
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
      // Fade out
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Shockwave */}
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
      {/* NEW PR text */}
      <Animated.Text
        style={[
          styles.prText,
          {
            transform: [{ translateY: textY }],
            opacity: textOpacity,
          },
        ]}
      >
        NEW PR
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
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: RONIN.accent,
    backgroundColor: 'transparent',
  },
  goldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RONIN.gold,
  },
  prText: {
    fontSize: 72,
    color: RONIN.text,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: RONIN.accent,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
});
