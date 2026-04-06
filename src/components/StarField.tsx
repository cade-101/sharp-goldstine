import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

interface Star {
  id: number;
  top: number;
  left: number;
  size: number;
  opacity: number;
}

export default function StarField() {
  const stars = useMemo<Star[]>(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() < 0.8 ? 1 : 2,
      opacity: 0.04 + Math.random() * 0.08,
    }))
  , []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map(star => (
        <View
          key={star.id}
          style={{
            position: 'absolute',
            top: `${star.top}%` as any,
            left: `${star.left}%` as any,
            width: star.size,
            height: star.size,
            borderRadius: star.size,
            backgroundColor: '#ffffff',
            opacity: star.opacity,
          }}
        />
      ))}
    </View>
  );
}
