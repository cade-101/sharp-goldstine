import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { RONIN } from '../themes/ronin';

const { width, height } = Dimensions.get('window');

interface RoninInkWashProps {
  onComplete: () => void;
}

export default function RoninInkWash({ onComplete }: RoninInkWashProps) {
  const inkScale = useRef(new Animated.Value(0)).current;
  const inkOpacity = useRef(new Animated.Value(1)).current;
  const kanjiOpacity = useRef(new Animated.Value(0)).current;
  const kanjiScale = useRef(new Animated.Value(0.6)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Ink spreads from top-left
      Animated.timing(inkScale, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      // Kanji forms in center
      Animated.parallel([
        Animated.timing(kanjiOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(kanjiScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Hold
      Animated.delay(400),
      // Fade to UI
      Animated.parallel([
        Animated.timing(inkOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(kanjiOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onComplete());
  }, []);

  const inkTranslate = inkScale.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.5, 0],
  });

  return (
    <Animated.View style={[styles.container, { opacity: inkOpacity }]}>
      {/* Ink wash blob spreading from top-left */}
      <Animated.View
        style={[
          styles.inkBlob,
          {
            transform: [
              { scale: inkScale },
              { translateX: inkTranslate },
            ],
          },
        ]}
      />
      {/* Kanji 浪人 in center */}
      <Animated.Text
        style={[
          styles.kanji,
          {
            opacity: kanjiOpacity,
            transform: [{ scale: kanjiScale }],
          },
        ]}
      >
        浪人
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RONIN.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  inkBlob: {
    position: 'absolute',
    top: -height * 0.3,
    left: -width * 0.3,
    width: width * 2.5,
    height: height * 2,
    borderRadius: width,
    backgroundColor: '#0d0d12',
    transformOrigin: 'top left',
  },
  kanji: {
    fontSize: 96,
    color: RONIN.text,
    fontWeight: '300',
    letterSpacing: 8,
    textShadowColor: RONIN.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
});
