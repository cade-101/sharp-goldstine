import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useUser } from '../context/UserContext';

interface Props {
  itemName: string;
  store: string;
  discountPct: number;
  salePrice: number;
  reason: string;
  onDismiss: () => void;
}

export function GroceryNudgeCard({
  itemName, store, discountPct, salePrice, reason, onDismiss,
}: Props) {
  const { themeTokens: T } = useUser();

  return (
    <View style={[styles.card, { borderLeftColor: T.accent, backgroundColor: T.card }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headline, { color: T.accent }]}>
            🛒 {itemName} — {discountPct}% off at {store}
          </Text>
          <Text style={[styles.price, { color: T.green }]}>${salePrice.toFixed(2)}</Text>
          <Text style={[styles.reason, { color: T.muted }]}>{reason}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.dismissText, { color: T.muted }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  headline: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  reason: {
    fontSize: 11,
    lineHeight: 16,
  },
  dismissBtn: {
    paddingTop: 2,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
