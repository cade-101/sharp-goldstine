import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet, View } from 'react-native';

interface Props {
  checked: boolean;
  onToggle: () => void;
  color?: string;
  size?: number;
}

export default function AnimatedCheckbox({ checked, onToggle, color = '#c9a84c', size = 22 }: Props) {
  const scale  = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const border = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    if (checked) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, tension: 200, friction: 8 }),
        Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 8 }),
      ]).start();
      Animated.timing(border, { toValue: 1, duration: 150, useNativeDriver: false }).start();
    } else {
      Animated.timing(scale,  { toValue: 0, duration: 120, useNativeDriver: true }).start();
      Animated.timing(border, { toValue: 0, duration: 150, useNativeDriver: false }).start();
    }
  }, [checked]);

  const borderColor = border.interpolate({ inputRange: [0, 1], outputRange: ['#444444', color] });

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={[styles.box, { width: size, height: size, borderRadius: size * 0.25 }]}>
      <Animated.View style={[styles.box, { width: size, height: size, borderRadius: size * 0.25, borderColor }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color, transform: [{ scale }], borderRadius: size * 0.2 }]} />
        {checked && (
          <View style={styles.checkmark}>
            <Animated.Text style={[styles.checkText, { transform: [{ scale }] }]}>✓</Animated.Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  checkmark: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#0a0a0a',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
});
