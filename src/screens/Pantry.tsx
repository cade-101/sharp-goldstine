import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import {
  getPantryByLocation, daysUntilEmpty, getStatusColor, markConsumed,
  refreshEstimates, getRunningLow, type PantryItem,
} from '../lib/consumptionEngine';

const TABS = [
  { key: 'fridge', label: 'FRIDGE', icon: '❄️' },
  { key: 'freezer', label: 'FREEZER', icon: '🧊' },
  { key: 'pantry', label: 'PANTRY', icon: '🥫' },
  { key: 'household', label: 'HOUSE', icon: '🧴' },
  { key: 'kids', label: 'KIDS', icon: '🧸' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function Pantry() {
  const { user, themeTokens: T } = useUser();
  const [activeTab, setActiveTab] = useState<TabKey>('fridge');
  const [pantryData, setPantryData] = useState<Record<string, PantryItem[]>>({});
  const [runningLow, setRunningLow] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const houseName = user?.house_name;

  useFocusEffect(useCallback(() => {
    if (houseName) loadAll();
  }, [houseName]));

  async function loadAll() {
    if (!houseName) return;
    setLoading(true);
    try {
      await refreshEstimates(houseName);
      const [grouped, low] = await Promise.all([
        getPantryByLocation(houseName),
        getRunningLow(houseName, 5),
      ]);
      setPantryData(grouped);
      setRunningLow(low);
    } catch (e) {
      console.log('[Pantry] load error:', e);
    }
    setLoading(false);
  }

  async function handleConsume(item: PantryItem) {
    Alert.alert(
      `Use ${item.name}?`,
      `Mark 1 ${item.unit} as consumed`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'USED IT', onPress: async () => {
            await markConsumed(item.id);
            loadAll();
          },
        },
      ],
    );
  }

  async function handleRemove(item: PantryItem) {
    Alert.alert(
      `Remove ${item.name}?`,
      'Remove from pantry entirely',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'REMOVE', style: 'destructive', onPress: async () => {
            await supabase.from('pantry_items').delete().eq('id', item.id);
            loadAll();
          },
        },
      ],
    );
  }

  const items = pantryData[activeTab] ?? [];
  const s = styles(T);

  function renderItem(item: PantryItem) {
    const days = daysUntilEmpty(item);
    const color = getStatusColor(item);
    const expanded = expandedId === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => setExpandedId(expanded ? null : item.id)}
        style={s.item}
        activeOpacity={0.7}
      >
        <View style={s.itemMain}>
          <View style={[s.statusDot, { backgroundColor: color }]} />
          <View style={s.itemText}>
            <Text style={s.itemName}>{item.name}</Text>
            <Text style={s.itemMeta}>
              {item.quantity} {item.unit}
              {days !== null ? ` · ${days <= 0 ? 'EMPTY' : `~${days}d left`}` : ''}
            </Text>
          </View>
          <Text style={s.expandArrow}>{expanded ? '▲' : '▼'}</Text>
        </View>

        {expanded && (
          <View style={s.itemDetail}>
            <Text style={s.itemDetailText}>Category: {item.category}</Text>
            {item.purchased_at && (
              <Text style={s.itemDetailText}>
                Last stocked: {new Date(item.purchased_at).toLocaleDateString('en-CA')}
              </Text>
            )}
            {item.estimated_empty_at && (
              <Text style={s.itemDetailText}>
                Est. empty: {new Date(item.estimated_empty_at).toLocaleDateString('en-CA')}
              </Text>
            )}
            <View style={s.itemActions}>
              <TouchableOpacity onPress={() => handleConsume(item)} style={[s.actionBtn, s.actionUse]}>
                <Text style={s.actionBtnUseText}>USED IT</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRemove(item)} style={[s.actionBtn, s.actionRemove]}>
                <Text style={s.actionBtnText}>REMOVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.background} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>PANTRY</Text>
        {houseName && <Text style={s.houseName}>⌂ {houseName}</Text>}
      </View>

      {/* Running Low Banner */}
      {runningLow.length > 0 && (
        <View style={s.lowBanner}>
          <Text style={s.lowBannerTitle}>⚠ RUNNING LOW ({runningLow.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.lowScroll}>
            {runningLow.map(item => (
              <View key={item.id} style={s.lowChip}>
                <Text style={s.lowChipText}>{item.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
          >
            <Text style={s.tabIcon}>{tab.icon}</Text>
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
            </Text>
            {(pantryData[tab.key]?.length ?? 0) > 0 && (
              <View style={s.tabCount}>
                <Text style={s.tabCountText}>{pantryData[tab.key].length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator color={T.accent} />
          <Text style={s.loadingText}>SCANNING INVENTORY...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyIcon}>{TABS.find(t => t.key === activeTab)?.icon}</Text>
          <Text style={s.emptyTitle}>NOTHING HERE</Text>
          <Text style={s.emptySubtitle}>
            Drop a grocery receipt or photo in Intel{'\n'}to auto-populate your pantry.
          </Text>
        </View>
      ) : (
        <ScrollView style={s.list} contentContainerStyle={s.listContent}>
          {items.map(renderItem)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = (T: ReturnType<typeof import('../themes').getTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: T.text, letterSpacing: 3 },
  houseName: { fontSize: 12, color: T.textMuted, letterSpacing: 1 },

  lowBanner: {
    backgroundColor: '#1a1500', borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#eab308', paddingHorizontal: 16, paddingVertical: 10,
  },
  lowBannerTitle: { fontSize: 11, fontWeight: '800', color: '#eab308', letterSpacing: 2, marginBottom: 8 },
  lowScroll: {},
  lowChip: {
    backgroundColor: '#2d2200', borderWidth: 1, borderColor: '#eab308',
    borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8,
  },
  lowChipText: { fontSize: 12, color: '#eab308', fontWeight: '700' },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderColor: T.border,
    backgroundColor: T.surface,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
    position: 'relative',
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: T.accent },
  tabIcon: { fontSize: 16, marginBottom: 2 },
  tabLabel: { fontSize: 9, fontWeight: '700', color: T.textMuted, letterSpacing: 1 },
  tabLabelActive: { color: T.accent },
  tabCount: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: T.accent, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  tabCountText: { fontSize: 9, color: '#000', fontWeight: '900' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: T.textMuted, fontSize: 12, letterSpacing: 2 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: T.textMuted, letterSpacing: 3, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: T.textMuted, textAlign: 'center', lineHeight: 20 },

  list: { flex: 1 },
  listContent: { paddingVertical: 8 },

  item: {
    marginHorizontal: 16, marginVertical: 4,
    backgroundColor: T.surface, borderRadius: 8,
    borderWidth: 1, borderColor: T.border,
    overflow: 'hidden',
  },
  itemMain: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  itemText: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: T.text },
  itemMeta: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  expandArrow: { color: T.textMuted, fontSize: 10, marginLeft: 8 },

  itemDetail: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: T.border,
    paddingTop: 10,
  },
  itemDetailText: { fontSize: 12, color: T.textMuted, marginBottom: 4 },
  itemActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center',
  },
  actionUse: { backgroundColor: T.accent },
  actionRemove: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' },
  actionBtnUseText: { fontSize: 11, fontWeight: '900', color: '#000', letterSpacing: 1 },
  actionBtnText: { fontSize: 11, fontWeight: '900', color: T.text, letterSpacing: 1 },
});
