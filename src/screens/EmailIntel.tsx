import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { Mail, AlertCircle, Calendar, BookOpen, Info, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { fetchGmailInbox, fetchOutlookInbox, categorizeEmails, saveEmailIntel, type EmailCategory } from '../lib/emailEngine';

interface EmailIntelRow {
  id: string;
  subject: string;
  snippet: string;
  category: EmailCategory;
  importance: string;
  received_at: string;
  actioned: boolean;
}

interface Connection {
  id: string;
  provider: string;
  email_address: string;
  access_token: string;
}

const CATEGORY_ICONS: Record<EmailCategory, React.ComponentType<any>> = {
  bill:        AlertCircle,
  appointment: Calendar,
  school:      BookOpen,
  action:      Mail,
  info:        Info,
  ignore:      Info,
};

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  bill: 'BILL', appointment: 'APPT', school: 'SCHOOL', action: 'ACTION', info: 'INFO', ignore: 'IGNORE',
};

const CATEGORY_COLORS: Record<EmailCategory, string> = {
  bill: '#ef4444', appointment: '#60a5fa', school: '#f59e0b',
  action: '#c084fc', info: '#6b7280', ignore: '#374151',
};

export default function EmailIntel({ onClose }: { onClose: () => void }) {
  const { user, themeTokens: T } = useUser();
  const [intel, setIntel] = useState<EmailIntelRow[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EmailCategory | 'all'>('all');

  const isLight = T.mode === 'light';

  useEffect(() => { load(); }, []);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    const [connRes, intelRes] = await Promise.all([
      supabase.from('email_connections').select('*').eq('user_id', user.id).eq('active', true),
      supabase.from('email_intel').select('*').eq('user_id', user.id)
        .order('received_at', { ascending: false }).limit(50),
    ]);
    setConnections((connRes.data ?? []) as Connection[]);
    setIntel((intelRes.data ?? []) as EmailIntelRow[]);
    setLoading(false);
  }

  async function scanInbox() {
    if (!user?.id || connections.length === 0) return;
    setScanning(true);
    for (const conn of connections) {
      try {
        const raw = conn.provider === 'gmail'
          ? await fetchGmailInbox(conn.access_token)
          : await fetchOutlookInbox(conn.access_token);
        const categorized = await categorizeEmails(raw);
        await saveEmailIntel(user.id, conn.id, categorized);
      } catch { /* skip failed connections */ }
    }
    await load();
    setScanning(false);
  }

  async function markActioned(id: string) {
    await supabase.from('email_intel').update({ actioned: true }).eq('id', id);
    setIntel(prev => prev.map(e => e.id === id ? { ...e, actioned: true } : e));
  }

  const filtered = activeCategory === 'all'
    ? intel.filter(e => !e.actioned)
    : intel.filter(e => e.category === activeCategory && !e.actioned);

  const highImportance = intel.filter(e => e.importance === 'high' && !e.actioned);

  const categories: Array<EmailCategory | 'all'> = ['all', 'action', 'bill', 'appointment', 'school', 'info'];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />

      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={onClose}><ChevronLeft size={22} color={T.muted} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: T.text }]}>EMAIL INTEL</Text>
        <TouchableOpacity onPress={scanInbox} disabled={scanning || connections.length === 0}>
          {scanning ? <ActivityIndicator color={T.accent} size="small" /> : <RefreshCw size={18} color={T.accent} />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={T.accent} style={{ flex: 1 }} />
      ) : connections.length === 0 ? (
        <View style={styles.emptyState}>
          <Mail size={40} color={T.muted} />
          <Text style={[styles.emptyTitle, { color: T.text }]}>No email connected</Text>
          <Text style={[styles.emptySub, { color: T.muted }]}>
            Connect Gmail or Outlook in Settings to scan your inbox.{'\n'}Only subject lines and snippets are read.
          </Text>
        </View>
      ) : (
        <>
          {/* High importance banner */}
          {highImportance.length > 0 && (
            <View style={[styles.urgentBanner, { backgroundColor: T.red + '18', borderColor: T.red }]}>
              <AlertCircle size={14} color={T.red} />
              <Text style={{ color: T.red, fontSize: 12, fontWeight: '700', flex: 1 }}>
                {highImportance.length} high-importance item{highImportance.length !== 1 ? 's' : ''} need attention
              </Text>
            </View>
          )}

          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, { borderColor: activeCategory === cat ? T.accent : T.border, backgroundColor: activeCategory === cat ? T.accentBg : 'transparent' }]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={{ color: activeCategory === cat ? T.accent : T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
                  {cat === 'all' ? 'ALL' : CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.list}>
            {filtered.length === 0 ? (
              <Text style={{ color: T.muted, textAlign: 'center', marginTop: 32, fontSize: 14 }}>
                Nothing here. Tap the refresh icon to scan.
              </Text>
            ) : filtered.map(e => {
              const Icon = CATEGORY_ICONS[e.category] ?? Info;
              const catColor = CATEGORY_COLORS[e.category] ?? T.muted;
              return (
                <View key={e.id} style={[styles.emailCard, { backgroundColor: T.card, borderColor: e.importance === 'high' ? T.red : T.border }]}>
                  <View style={[styles.catDot, { backgroundColor: catColor }]}>
                    <Icon size={12} color="#fff" />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.emailSubject, { color: T.text }]} numberOfLines={1}>{e.subject}</Text>
                      {e.importance === 'high' && (
                        <View style={[styles.importanceBadge, { backgroundColor: T.red }]}>
                          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>!</Text>
                        </View>
                      )}
                    </View>
                    {e.snippet ? (
                      <Text style={{ color: T.muted, fontSize: 12, lineHeight: 17 }} numberOfLines={2}>{e.snippet}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => markActioned(e.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: T.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>DONE</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  urgentBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, marginBottom: 0, borderWidth: 1, borderRadius: 10, padding: 12 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emailCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  catDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emailSubject: { fontSize: 13, fontWeight: '700', flex: 1 },
  importanceBadge: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
