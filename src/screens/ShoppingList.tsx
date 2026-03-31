import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, TextInput, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/logEvent';

// ── TYPES ─────────────────────────────────────────────────────────────────────
type ListType = 'household' | 'personal' | 'unit';

interface Item {
  id: string;
  item: string;
  list_type: ListType;
  tagged_to: string | null;
  completed: boolean;
  added_by: string | null;
}

interface Suggestion {
  item: string;
  reason: string;
}

const KIDS = ['Andy', 'Pax', 'Hendrix'] as const;

const TABS: Array<{ id: ListType; label: string; icon: string }> = [
  { id: 'household', label: 'HOUSEHOLD', icon: '🏠' },
  { id: 'personal',  label: 'PERSONAL',  icon: '👤' },
  { id: 'unit',      label: 'THE UNIT',  icon: '👦' },
];

export default function ShoppingList({ onClose }: { onClose: () => void }) {
  const { user, themeTokens: T } = useUser();
  const s = makeStyles(T);

  const [activeTab, setActiveTab] = useState<ListType>('household');
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState('');
  const [taggedTo, setTaggedTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadItems();
    loadSuggestions();
    // Real-time subscription for household list
    if (user?.house_name) {
      const channel = supabase
        .channel('shopping-list')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'shopping_list_items',
          filter: `house_name=eq.${user.house_name}`,
        }, () => loadItems())
        .subscribe();
      subscriptionRef.current = channel;
    }
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    };
  }, [user?.house_name, user?.id]);

  async function loadItems() {
    if (!user?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('shopping_list_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (activeTab === 'household' && user.house_name) {
        query = query.eq('house_name', user.house_name).eq('list_type', 'household');
      } else {
        query = query.eq('user_id', user.id).eq('list_type', activeTab);
      }

      const { data } = await query;
      setItems(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadItems(); }, [activeTab]);

  async function loadSuggestions() {
    if (!user?.id) return;
    setLoadingSuggestions(true);
    try {
      const allSuggestions: Suggestion[] = [];

      // 1. Pantry running low — items expiring within 5 days
      if (user.house_name) {
        const cutoff = new Date(Date.now() + 5 * 86400000).toISOString();
        const { data: lowItems } = await supabase
          .from('pantry_items')
          .select('name, estimated_empty_at')
          .eq('household_id', user.house_name)
          .lte('estimated_empty_at', cutoff)
          .order('estimated_empty_at', { ascending: true })
          .limit(4);

        if (lowItems?.length) {
          lowItems.forEach(pi => {
            const days = pi.estimated_empty_at
              ? Math.round((new Date(pi.estimated_empty_at).getTime() - Date.now()) / 86400000)
              : null;
            allSuggestions.push({
              item: pi.name,
              reason: days !== null && days <= 0 ? '⚠ Pantry empty' : `⚠ Pantry: ~${days}d left`,
            });
          });
        }
      }

      // 2. Frequently bought groceries from expense history
      const { data: expenses } = await supabase
        .from('budget_expenses')
        .select('note')
        .eq('user_id', user.id)
        .eq('envelope_id', 'groceries')
        .not('note', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (expenses?.length) {
        const counts: Record<string, number> = {};
        expenses.forEach(e => {
          const key = (e.note ?? '').toLowerCase().trim();
          if (key) counts[key] = (counts[key] ?? 0) + 1;
        });

        const existingNames = new Set(allSuggestions.map(s => s.item.toLowerCase()));
        Object.entries(counts)
          .filter(([item, count]) => count >= 2 && !existingNames.has(item))
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4 - allSuggestions.length)
          .forEach(([item, count]) => {
            allSuggestions.push({
              item: item.charAt(0).toUpperCase() + item.slice(1),
              reason: `Bought ${count}× recently`,
            });
          });
      }

      setSuggestions(allSuggestions);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function addItem() {
    const text = newItem.trim();
    if (!text || !user?.id) return;

    const row: Record<string, unknown> = {
      user_id: user.id,
      list_type: activeTab,
      item: activeTab === 'unit' && taggedTo ? `${taggedTo} — ${text}` : text,
      tagged_to: activeTab === 'unit' ? taggedTo : null,
      completed: false,
      added_by: user.username ?? null,
    };

    if (activeTab === 'household' && user.house_name) {
      row.house_name = user.house_name;
    }

    await supabase.from('shopping_list_items').insert(row);
    logEvent(user.id, 'supply_run_add', { item: row.item, list_type: activeTab });
    setNewItem('');
    setTaggedTo(null);
    loadItems();
  }

  async function toggleItem(id: string, completed: boolean) {
    await supabase.from('shopping_list_items').update({ completed: !completed }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !completed } : i));
  }

  async function clearCompleted() {
    const ids = items.filter(i => i.completed).map(i => i.id);
    if (!ids.length) return;
    await supabase.from('shopping_list_items').delete().in('id', ids);
    setItems(prev => prev.filter(i => !i.completed));
  }

  async function addSuggestion(item: Suggestion) {
    if (!user?.id) return;
    const row: Record<string, unknown> = {
      user_id: user.id,
      list_type: 'household',
      item: item.item,
      tagged_to: null,
      completed: false,
      added_by: user.username ?? null,
    };
    if (user.house_name) row.house_name = user.house_name;
    await supabase.from('shopping_list_items').insert(row);
    setSuggestions(prev => prev.filter(s => s.item !== item.item));
    if (activeTab === 'household') loadItems();
  }

  async function addAllSuggestions() {
    await Promise.all(suggestions.map(addSuggestion));
    setSuggestions([]);
    if (activeTab === 'household') loadItems();
  }

  const activeItems = items.filter(i => !i.completed);
  const completedItems = items.filter(i => i.completed);

  return (
    <View style={s.overlay}>
      <SafeAreaView style={s.container}>
        <StatusBar barStyle={T.mode === 'light' ? 'dark-content' : 'light-content'} />

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>THE ARMORY</Text>
            <Text style={s.subtitle}>SUPPLY RUN</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[s.tab, activeTab === tab.id && s.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.75}
            >
              <Text style={s.tabIcon}>{tab.icon}</Text>
              <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Add item input */}
        <View style={s.inputSection}>
          {activeTab === 'unit' && (
            <View style={s.kidRow}>
              {KIDS.map(kid => (
                <TouchableOpacity
                  key={kid}
                  style={[s.kidTag, taggedTo === kid && s.kidTagActive]}
                  onPress={() => setTaggedTo(taggedTo === kid ? null : kid)}
                >
                  <Text style={[s.kidTagText, taggedTo === kid && s.kidTagTextActive]}>
                    {kid}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={s.inputRow}>
            <TextInput
              ref={inputRef}
              style={s.input}
              value={newItem}
              onChangeText={setNewItem}
              placeholder={activeTab === 'unit' ? 'Item name...' : '+ ADD ITEM'}
              placeholderTextColor={T.muted}
              returnKeyType="done"
              onSubmitEditing={addItem}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[s.addBtn, !newItem.trim() && s.addBtnDisabled]}
              onPress={addItem}
              disabled={!newItem.trim()}
            >
              <Text style={s.addBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>

          {/* AI Suggestions */}
          {suggestions.length > 0 && !loadingSuggestions && (
            <View style={s.suggestBox}>
              <Text style={s.suggestTitle}>🤖 AI SUGGESTIONS</Text>
              {suggestions.map(sg => (
                <View key={sg.item} style={s.suggestRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.suggestItem}>{sg.item}</Text>
                    <Text style={s.suggestReason}>{sg.reason}</Text>
                  </View>
                  <TouchableOpacity onPress={() => addSuggestion(sg)} style={s.suggestAdd}>
                    <Text style={s.suggestAddText}>+ ADD</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={s.suggestActions}>
                <TouchableOpacity style={s.addAllBtn} onPress={addAllSuggestions}>
                  <Text style={s.addAllText}>ADD ALL</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSuggestions([])}>
                  <Text style={s.dismissText}>DISMISS</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Active items */}
          {loading ? (
            <ActivityIndicator color={T.accent} style={{ marginTop: 24 }} />
          ) : activeItems.length === 0 && completedItems.length === 0 ? (
            <Text style={s.empty}>No items yet. Add something above.</Text>
          ) : (
            <>
              {activeItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={s.itemRow}
                  onPress={() => toggleItem(item.id, item.completed)}
                  activeOpacity={0.7}
                >
                  <View style={s.checkbox} />
                  <Text style={s.itemText}>{item.item}</Text>
                </TouchableOpacity>
              ))}

              {completedItems.length > 0 && (
                <>
                  <View style={s.divider} />
                  {completedItems.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.itemRow}
                      onPress={() => toggleItem(item.id, item.completed)}
                      activeOpacity={0.7}
                    >
                      <View style={s.checkboxDone} />
                      <Text style={s.itemTextDone}>{item.item}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={s.clearBtn} onPress={clearCompleted}>
                    <Text style={s.clearText}>CLEAR COMPLETED</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(T: ReturnType<typeof import('../themes').getTheme>) {
  const isLight = T.mode === 'light';
  return StyleSheet.create({
    overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: T.bg, zIndex: 100,
    },
    container: { flex: 1 },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: 20, paddingBottom: 12,
    },
    title: { color: T.text, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
    subtitle: { color: T.accent, fontSize: 11, fontWeight: '700', letterSpacing: 3, marginTop: 2 },
    closeBtn: { padding: 8 },
    closeText: { color: T.muted, fontSize: 20 },

    // Tabs
    tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
    tab: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
      backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
      borderRadius: 10, paddingVertical: 10,
    },
    tabActive: { borderColor: T.accent },
    tabIcon: { fontSize: 14 },
    tabLabel: { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    tabLabelActive: { color: T.accent },

    // Input
    inputSection: { paddingHorizontal: 20, marginBottom: 12 },
    kidRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    kidTag: {
      paddingHorizontal: 12, paddingVertical: 6,
      backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 20,
    },
    kidTagActive: { borderColor: T.accent, backgroundColor: T.accent + '22' },
    kidTagText: { color: T.muted, fontSize: 12, fontWeight: '600' },
    kidTagTextActive: { color: T.accent },
    inputRow: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
      color: T.text, fontSize: 15,
    },
    addBtn: {
      backgroundColor: T.accent, borderRadius: 10,
      paddingHorizontal: 16, justifyContent: 'center',
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: { color: isLight ? '#fff' : T.bg, fontWeight: '800', fontSize: 13, letterSpacing: 1 },

    // List
    list: { flex: 1, paddingHorizontal: 20 },
    empty: { color: T.muted, fontSize: 14, textAlign: 'center', marginTop: 32 },

    itemRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: T.border + '60',
    },
    checkbox: {
      width: 20, height: 20, borderRadius: 4,
      borderWidth: 1.5, borderColor: T.muted,
    },
    checkboxDone: {
      width: 20, height: 20, borderRadius: 4,
      backgroundColor: T.accent, borderWidth: 1.5, borderColor: T.accent,
    },
    itemText: { flex: 1, color: T.text, fontSize: 15 },
    itemTextDone: { flex: 1, color: T.muted, fontSize: 15, textDecorationLine: 'line-through' },

    divider: { height: 1, backgroundColor: T.border, marginVertical: 8 },
    clearBtn: { alignItems: 'center', paddingVertical: 14 },
    clearText: { color: T.muted, fontSize: 12, fontWeight: '700', letterSpacing: 2 },

    // AI Suggestions
    suggestBox: {
      backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
      borderRadius: 12, padding: 16, marginBottom: 16,
    },
    suggestTitle: {
      color: T.text, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 12,
    },
    suggestRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.border + '60',
    },
    suggestItem: { color: T.text, fontSize: 14 },
    suggestReason: { color: T.muted, fontSize: 11, marginTop: 2 },
    suggestAdd: { paddingHorizontal: 10, paddingVertical: 6 },
    suggestAddText: { color: T.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
    suggestActions: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      paddingTop: 12, marginTop: 4,
    },
    addAllBtn: {
      backgroundColor: T.accent, borderRadius: 8,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    addAllText: { color: isLight ? '#fff' : T.bg, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
    dismissText: { color: T.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  });
}
