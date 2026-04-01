import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Pressable, Dimensions } from 'react-native';
import { ThemeTokens } from '../themes';

const { width, height } = Dimensions.get('window');

interface Props {
  newTheme: ThemeTokens;
  onComplete: () => void;
}

export const ShadowThemeUnlock: React.FC<Props> = ({ newTheme, onComplete }) => {
  const splitLeft   = useRef(new Animated.Value(0)).current;
  const splitRight  = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameScale   = useRef(new Animated.Value(0.8)).current;
  const fillOpacity = useRef(new Animated.Value(0)).current;
  const tapOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(splitLeft,  { toValue: -width * 0.5, duration: 400, useNativeDriver: true }),
        Animated.timing(splitRight, { toValue:  width * 0.5, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(fillOpacity,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(nameScale,   { toValue: 1, useNativeDriver: true }),
      ]),
      Animated.delay(800),
      Animated.timing(tapOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Pressable style={[styles.root, { backgroundColor: newTheme.dark }]} onPress={onComplete}>
      <Animated.View style={[styles.panel, styles.panelLeft,  { backgroundColor: '#0a0a0a', transform: [{ translateX: splitLeft  }] }]} />
      <Animated.View style={[styles.panel, styles.panelRight, { backgroundColor: '#0a0a0a', transform: [{ translateX: splitRight }] }]} />
      <Animated.View style={[styles.fill, { backgroundColor: newTheme.bg, opacity: fillOpacity }]} />
      <Animated.View style={[styles.nameContainer, { opacity: nameOpacity, transform: [{ scale: nameScale }] }]}>
        <Text style={[styles.era,       { color: newTheme.muted  }]}>ERA UNLOCKED</Text>
        <Text style={[styles.themeName, { color: newTheme.accent }]}>{newTheme.name}</Text>
        <View style={[styles.divider,   { backgroundColor: newTheme.accent }]} />
      </Animated.View>
      <Animated.Text style={[styles.tapToContinue, { opacity: tapOpacity, color: newTheme.muted }]}>
        TAP TO CONTINUE
      </Animated.Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root:          { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  panel:         { position: 'absolute', top: 0, width: width * 0.5, height },
  panelLeft:     { left: 0 },
  panelRight:    { right: 0 },
  fill:          { ...StyleSheet.absoluteFillObject },
  nameContainer: { alignItems: 'center', zIndex: 10 },
  era:           { fontSize: 11, letterSpacing: 4, marginBottom: 12, fontWeight: '500' },
  themeName:     { fontSize: 48, fontWeight: '800', letterSpacing: 6 },
  divider:       { width: 40, height: 2, marginTop: 16, opacity: 0.6 },
  tapToContinue: { position: 'absolute', bottom: 60, fontSize: 11, letterSpacing: 3 },
});

export default ShadowThemeUnlock;