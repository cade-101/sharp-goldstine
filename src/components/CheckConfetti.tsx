import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  initialX: number;
}

interface Props {
  trigger: boolean;
  color?: string;
  count?: number;
}

const COLORS = ['#f9c74f', '#f3722c', '#43aa8b', '#577590', '#f8961e', '#90be6d'];

export default function CheckConfetti({ trigger, color, count = 10 }: Props) {
  const particles = useRef<Particle[]>(
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return {
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        color: color ?? COLORS[i % COLORS.length],
        initialX: Math.cos(angle) * (20 + Math.random() * 30),
      };
    })
  ).current;

  useEffect(() => {
    if (!trigger) return;

    particles.forEach((p, i) => {
      const angle = (i / count) * Math.PI * 2;
      const dist  = 25 + Math.random() * 35;
      const dx    = Math.cos(angle) * dist;
      const dy    = -(Math.sin(angle) * dist + 10 + Math.random() * 20);

      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(1);
      p.scale.setValue(0);

      Animated.parallel([
        Animated.spring(p.scale,   { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
        Animated.timing(p.x,       { toValue: dx, duration: 500, useNativeDriver: true }),
        Animated.timing(p.y,       { toValue: dy, duration: 500, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(p.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]).start(() => {
        p.x.setValue(0);
        p.y.setValue(0);
        p.opacity.setValue(0);
        p.scale.setValue(0);
      });
    });
  }, [trigger]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: -3,
    marginTop: -3,
  },
});
