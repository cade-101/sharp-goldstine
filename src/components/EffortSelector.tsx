import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { EffortRating } from '../lib/fitnessTypes';

const CHIPS: { value: EffortRating; label: string }[] = [
  { value: 'too_easy',        label: 'Too easy 😴'             },
  { value: 'shaky',           label: 'Shaky 😬'                },
  { value: 'grind_good',      label: 'Grind but good 💪'       },
  { value: 'felt_like_shit',  label: 'That felt like shit 💀'  },
];

interface Props {
  value: EffortRating | null;
  onChange: (v: EffortRating) => void;
  /** Optional: tint colour for the selected chip. Defaults to gold. */
  accentColor?: string;
}

export default function EffortSelector({ value, onChange, accentColor = '#c9a84c' }: Props) {
  return (
    <View style={s.grid}>
      {CHIPS.map((chip) => {
        const selected = chip.value === value;
        return (
          <TouchableOpacity
            key={chip.value}
            style={[
              s.chip,
              selected && { backgroundColor: accentColor, borderColor: accentColor },
            ]}
            onPress={() => onChange(chip.value)}
            activeOpacity={0.75}
          >
            <Text style={[s.label, selected && s.labelSelected]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    width: '47%',
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  labelSelected: {
    color: '#0a0a0a',
  },
});
