import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, RefreshControl
} from 'react-native';
import { supabase } from '../lib/supabase';

const C = {
  black: '#0a0a0a',
  dark: '#111111',
  card: '#181818',
  border: '#2a2a2a',
  gold: '#c9a84c',
  goldDim: '#7a6230',
  green: '#3ce08a',
  white: '#f0ece4',
  muted: '#666666',
  rose: '#e8748a',
  roseDim: '#7a3040',
  roseCard: '#1e1218',
};

// Scoring constants
const POINTS = {
  session: 10,
  pr: 25,
  onTime: 5,
  volumeWin: 15,
};

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function calcScore(sessions: any[]) {
  let score = 0;
  let sessionCount = 0;
  let prCount = 0;
  let onTimeCount = 0;

  sessions.forEach(s => {
    score += POINTS.session;
    sessionCount++;
    if (s.prs_hit?.length > 0) {
      score += POINTS.pr * s.prs_hit.length;
      prCount += s.prs_hit.length;
    }
    if (s.started_on_time) {
      score += POINTS.onTime;
      onTimeCount++;
    }
  });

  return { score, sessionCount, prCount, onTimeCount };
}

function getExerciseVolumes(sessions: any[]) {
  const volumes: Record<string, number> = {};
  sessions.forEach(s => {
    if (s.set_log) {
      Object.entries(s.set_log).forEach(([exName, rows]: any) => {
        let vol = 0;
        rows.forEach((row: any) => {
          if (row.done && row.w && row.r) {
            vol += parseFloat(row.w) * parseInt(row.r);
          }
        });
        if (vol > 0) {
          volumes[exName] = (volumes[exName] || 0) + vol;
        }
      });
    }
  });
  return volumes;
}

export default function BattleMode() {
  const [cadeData, setCadeData] = useState<any>(null);
  const [dData, setDData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTimeCade, setAllTimeCade] = useState<any>(null);
  const [allTimeD, setAllTimeD] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const weekStart = getWeekStart();

    const [{ data: cadeSessions }, { data: dSessions }, { data: cadeAll }, { data: dAll }] = await Promise.all([
      supabase.from('gym_sessions').select('*').eq('athlete', 'cade').gte('created_at', weekStart),
      supabase.from('gym_sessions').select('*').eq('athlete', 'danielle').gte('created_at', weekStart),
      supabase.from('gym_sessions').select('*').eq('athlete', 'cade'),
      supabase.from('gym_sessions').select('*').eq('athlete', 'danielle'),
    ]);

    if (cadeSessions) setCadeData(calcScore(cadeSessions));
    if (dSessions) setDData(calcScore(dSessions));
    if (cadeAll) setAllTimeCade(calcScore(cadeAll));
    if (dAll) setAllTimeD(calcScore(dAll));

    // Calculate volume battles this week
    if (cadeSessions && dSessions) {
      const cadeVols = getExerciseVolumes(cadeSessions);
      const dVols = getExerciseVolumes(dSessions);

      // Add volume win points
      const shared = Object.keys({ ...cadeVols, ...dVols });
      let cadeVolPts = 0, dVolPts = 0;
      shared.forEach(ex => {
        const cv = cadeVols[ex] || 0;
        const dv = dVols[ex] || 0;
        if (cv > dv) cadeVolPts += POINTS.volumeWin;
        else if (dv > cv) dVolPts += POINTS.volumeWin;
      });

      setCadeData((prev: any) => prev ? { ...prev, score: prev.score + cadeVolPts, volumeWins: cadeVolPts / POINTS.volumeWin } : prev);
      setDData((prev: any) => prev ? { ...prev, score: prev.score + dVolPts, volumeWins: dVolPts / POINTS.volumeWin } : prev);
    }

    setLoading(false);
    setRefreshing(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
  }

  if (loading) return (
    <SafeAreaView style={s.bg}>
      <View style={s.center}>
        <Text style={s.loadingText}>LOADING BATTLE DATA...</Text>
      </View>
    </SafeAreaView>
  );

  const cadeScore = cadeData?.score || 0;
  const dScore = dData?.score || 0;
  const cadeLeading = cadeScore >= dScore;
  const tied = cadeScore === dScore;
  const diff = Math.abs(cadeScore - dScore);

  return (
    <SafeAreaView style={s.bg}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerLabel}>THIS WEEK</Text>
          <Text style={s.headerTitle}>BATTLE MODE</Text>
          <Text style={s.headerSub}>
            {tied ? '⚔️ TIED — it\'s on' : cadeLeading ? `💀 CADE +${diff} pts` : `🌸 D +${diff} pts`}
          </Text>
        </View>

        {/* Score cards */}
        <View style={s.scoreRow}>
          {/* Cade */}
          <View style={[s.scoreCard, cadeLeading && !tied && s.scoreCardWinning]}>
            <Text style={s.athleteName}>CADE</Text>
            {cadeLeading && !tied && <Text style={s.crownEmoji}>👑</Text>}
            <Text style={[s.scoreNum, cadeLeading && !tied && { color: C.gold }]}>{cadeScore}</Text>
            <Text style={s.scoreLabel}>pts</Text>
            <View style={s.statRows}>
              <View style={s.statRow}>
                <Text style={s.statLabel}>Sessions</Text>
                <Text style={s.statVal}>{cadeData?.sessionCount || 0}</Text>
              </View>
              <View style={s.statRow}>
                <Text style={s.statLabel}>PRs</Text>
                <Text style={[s.statVal, { color: C.gold }]}>{cadeData?.prCount || 0}</Text>
              </View>
              <View style={s.statRow}>
                <Text style={s.statLabel}>On time</Text>
                <Text style={s.statVal}>{cadeData?.onTimeCount || 0}</Text>
              </View>
              <View style={s.statRow}>
                <Text style={s.statLabel}>Vol wins</Text>
                <Text style={[s.statVal, { color: C.green }]}>{cadeData?.volumeWins || 0}</Text>
              </View>
            </View>
          </View>

          <View style={s.vsBox}>
            <Text style={s.vsText}>VS</Text>
          </View>

          {/* D */}
          <View style={[s.scoreCard, s.scoreCardD, !cadeLeading && !tied && s.scoreCardWinningD]}>
            <Text style={[s.athleteName, { color: C.rose }]}>D</Text>
            {!cadeLeading && !tied && <Text style={s.crownEmoji}>👑</Text>}
            <Text style={[s.scoreNum, !cadeLeading && !tied && { color: C.rose }]}>{dScore}</Text>
            <Text style={s.scoreLabel}>pts</Text>
            <View style={s.statRows}>
              <View style={s.statRow}>
                <Text style={s.statLabel}>Sessions</Text>
                <Text style={s.statVal}>{dData?.sessionCount || 0}</Text>
              </View>
              <View style={s.statRow}>
                <Text style={s.statLabel}>PRs</Text>
                <Text style={[s.statVal, { color: C.rose }]}>{dData?.prCount || 0}</Text>
              </View>
              <View style={s.statRow}>
                <Text style={s.statLabel}>On time</Text>
                <Text style={s.statVal}>{dData?.onTimeCount || 0}</Text>
              </View>
              <View style={s.statRow}>
                <Text style={s.statLabel}>Vol wins</Text>
                <Text style={[s.statVal, { color: C.rose }]}>{dData?.volumeWins || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Saturday prize */}
        <View style={s.prizeCard}>
          <Text style={s.prizeLabel}>🏆 WINNER PICKS</Text>
          <Text style={s.prizeTitle}>Saturday Activity</Text>
          <Text style={s.prizeSub}>
            {tied
              ? 'Currently tied — someone needs to pull ahead'
              : cadeLeading
              ? `Cade's call this Saturday`
              : `D's call this Saturday`}
          </Text>
        </View>

        {/* Scoring legend */}
        <View style={s.legendCard}>
          <Text style={s.legendTitle}>HOW POINTS WORK</Text>
          <View style={s.legendRow}><Text style={s.legendItem}>Session completed</Text><Text style={s.legendPts}>+{POINTS.session} pts</Text></View>
          <View style={s.legendRow}><Text style={s.legendItem}>PR hit</Text><Text style={[s.legendPts, { color: C.gold }]}>+{POINTS.pr} pts</Text></View>
          <View style={s.legendRow}><Text style={s.legendItem}>On-time start</Text><Text style={s.legendPts}>+{POINTS.onTime} pts</Text></View>
          <View style={[s.legendRow, { borderBottomWidth: 0 }]}><Text style={s.legendItem}>Exercise volume win</Text><Text style={[s.legendPts, { color: C.green }]}>+{POINTS.volumeWin} pts</Text></View>
        </View>

        {/* All time */}
        <View style={s.allTimeCard}>
          <Text style={s.legendTitle}>ALL TIME</Text>
          <View style={s.allTimeRow}>
            <View style={s.allTimeAthlete}>
              <Text style={s.allTimeName}>CADE</Text>
              <Text style={s.allTimeScore}>{allTimeCade?.score || 0}</Text>
              <Text style={s.allTimeSub}>{allTimeCade?.sessionCount || 0} sessions · {allTimeCade?.prCount || 0} PRs</Text>
            </View>
            <View style={s.allTimeDivider} />
            <View style={[s.allTimeAthlete, { alignItems: 'flex-end' }]}>
              <Text style={[s.allTimeName, { color: C.rose }]}>D</Text>
              <Text style={[s.allTimeScore, { color: C.rose }]}>{allTimeD?.score || 0}</Text>
              <Text style={s.allTimeSub}>{allTimeD?.sessionCount || 0} sessions · {allTimeD?.prCount || 0} PRs</Text>
            </View>
          </View>
        </View>

        <Text style={s.refreshHint}>↓ pull to refresh</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.black },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: C.muted, fontSize: 12, letterSpacing: 3 },
  header: { padding: 24, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  headerLabel: { fontSize: 11, color: C.gold, letterSpacing: 4, marginBottom: 4 },
  headerTitle: { fontSize: 48, color: C.white, fontWeight: '700', letterSpacing: 3, lineHeight: 52 },
  headerSub: { fontSize: 14, color: C.muted, marginTop: 6, letterSpacing: 1 },
  scoreRow: { flexDirection: 'row', padding: 16, gap: 8, alignItems: 'center' },
  scoreCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: 'center' },
  scoreCardD: { backgroundColor: C.roseCard },
  scoreCardWinning: { borderColor: C.gold, backgroundColor: '#1a1608' },
  scoreCardWinningD: { borderColor: C.rose, backgroundColor: '#1e1218' },
  athleteName: { fontSize: 11, color: C.muted, letterSpacing: 3, marginBottom: 4 },
  crownEmoji: { fontSize: 20, marginBottom: 2 },
  scoreNum: { fontSize: 56, color: C.white, fontWeight: '700', lineHeight: 60 },
  scoreLabel: { fontSize: 11, color: C.muted, letterSpacing: 2, marginBottom: 12 },
  statRows: { width: '100%', gap: 6 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 10, color: C.muted },
  statVal: { fontSize: 12, color: C.white, fontWeight: '600' },
  vsBox: { width: 32, alignItems: 'center' },
  vsText: { fontSize: 14, color: C.muted, fontWeight: '700', letterSpacing: 2 },
  prizeCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.goldDim, padding: 18 },
  prizeLabel: { fontSize: 10, color: C.gold, letterSpacing: 3, marginBottom: 4 },
  prizeTitle: { fontSize: 24, color: C.white, fontWeight: '700', letterSpacing: 1 },
  prizeSub: { fontSize: 12, color: C.muted, marginTop: 4 },
  legendCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 18 },
  legendTitle: { fontSize: 10, color: C.muted, letterSpacing: 3, marginBottom: 14 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  legendItem: { fontSize: 13, color: C.white },
  legendPts: { fontSize: 13, color: C.green, fontWeight: '600' },
  allTimeCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 18 },
  allTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  allTimeAthlete: { flex: 1 },
  allTimeDivider: { width: 1, height: 60, backgroundColor: C.border, marginHorizontal: 16 },
  allTimeName: { fontSize: 11, color: C.muted, letterSpacing: 3, marginBottom: 2 },
  allTimeScore: { fontSize: 42, color: C.white, fontWeight: '700', lineHeight: 46 },
  allTimeSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  refreshHint: { textAlign: 'center', fontSize: 10, color: '#333', letterSpacing: 2, paddingVertical: 20 },
});
