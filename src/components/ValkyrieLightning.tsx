import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { VALKYRIE } from '../themes/valkyrie';

const { width, height } = Dimensions.get('window');

interface ValkyrieLightningProps {
  onComplete: () => void;
}

export default function ValkyrieLightning({ onComplete }: ValkyrieLightningProps) {
  const crackScaleY = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const crackWidth = useRef(new Animated.Value(2)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Lightning crack splits screen top to bottom (200ms)
      Animated.timing(crackScaleY, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // White flash (100ms)
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      // Crack widens briefly
      Animated.timing(crackWidth, {
        toValue: 8,
        duration: 120,
        useNativeDriver: false,
      }),
      // Settles and flash fades
      Animated.parallel([
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(crackWidth, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]),
      Animated.delay(200),
      // Fade out entire overlay
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      {/* Lightning crack line */}
      <Animated.View
        style={[
          styles.crack,
          {
            width: crackWidth,
            transform: [{ scaleY: crackScaleY }],
          },
        ]}
      />
      {/* White flash overlay */}
      <Animated.View style={[styles.flash, { opacity: flashOpacity }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: VALKYRIE.bg,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 999,
  },
  crack: {
    position: 'absolute',
    top: 0,
    height: height,
    backgroundColor: VALKYRIE.accentBright,
    shadowColor: VALKYRIE.accentBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    transformOrigin: 'top',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: VALKYRIE.accentBright,
  },
});
