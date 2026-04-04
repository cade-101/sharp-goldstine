import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import {
  Eye, Shield, Archive, Radio, Dumbbell, Heart,
  Target, Zap, Skull, ChevronLeft,
} from 'lucide-react-native';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { awardOpsPoints } from '../lib/opsPoints';

const { width: SW } = Dimensions.get('window');
const HALF = (SW - 48) / 2;

type UpgradeDef = {
  id: string;
  side: 'shared' | 'personal';
  name: string;
  cost: number;
  desc: string;
  Icon: React.ComponentType<any>;
  requires: string | null;
};

const UPGRADES: UpgradeDef[] = [
  { id: 'watchtower',    side: 'shared',    name: 'WATCHTOWER',     cost: 7,  desc: 'Unlocks weekly pattern report',       Icon: Eye,      requires: null },
  { id: 'armory_vault',  side: 'shared',    name: 'ARMORY VAULT',   cost: 14, desc: 'Budget history beyond 30 days',       Icon: Shield,   requires: null },
  { id: 'intel_archive', side: 'shared',    name: 'INTEL ARCHIVE',  cost: 21, desc: 'Full intel drop history searchable',  Icon: Archive,  requires: 'watchtower' },
  { id: 'command_link',  side: 'shared',    name: 'COMMAND LINK',   cost: 30, desc: 'Live partner status in War Room',     Icon: Radio,    requires: 'watchtower' },
  { id: 'barracks',      side: 'personal',  name: 'BARRACKS',       cost: 5,  desc: 'Unlock workout split customization',  Icon: Dumbbell, requires: null },
  { id: 'medic_bay',     side: 'personal',  name: 'MEDIC BAY',      cost: 10, desc: 'Nightmare detection activates',       Icon: Heart,    requires: null },
  { id: 'war_room_ext',  side: 'personal',  name: 'WAR ROOM EXT',   cost: 20, desc: 'Custom mission templates',            Icon: Target,   requires: 'barracks' },
  { id: 'signal_tower',  side: 'personal',  name: 'SIGNAL TOWER',   cost: 15, desc: 'Custom push notification timing',     Icon: Zap,      requires: null },
];

const LEVEL_THRESHOLDS = [0, 3, 6, 10, 15];

type HomeBaseRow = {
  household_id: string;
  level: number;
  user1_id: string | null;
  user2_id: string | null;
  user1_upgrades: string[];
  user2_upgrades: string[];
  shared_upgrades: string[];
  last_zombie_siege: string | null;
  siege_survived: boolean | null;
};

function calcLevel(u1: string[], u2: string[], shared: string[]): number {
  const total = u1.length + u2.length + shared.length;
  let lv = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (total >= LEVEL_THRESHOLDS[i]) lv = i + 1;
  }
  return Math.min(lv, 5);
}

function calcSiegeResult(u1: string[], u2: string[], shared: string[], level: number): boolean {
  const streakScore = u1.length + u2.length + shared.length;
  return streakScore >= level * 3;
}

export default function HomeBase() {
  const { user, themeTokens: T } = useUser();
  const [base, setBase] = useState<HomeBaseRow | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<{ username?: string; theme?: string; unlocked_themes?: string[]; ops_points?: number } | null>(null);
  const [myOps, setMyOps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmUpgrade, setConfirmUpgrade] = useState<UpgradeDef | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const amUser1 = base?.user1_id === user?.id;
  const myUpgrades: string[] = amUser1 ? (base?.user1_upgrades ?? []) : (base?.user2_upgrades ?? []);
  const partnerUpgrades: string[] = amUser1 ? (base?.user2_upgrades ?? []) : (base?.user1_upgrades ?? []);
  const sharedUpgrades: string[] = base?.shared_upgrades ?? [];
  const baseLevel = base ? calcLevel(base.user1_upgrades, base.user2_upgrades, base.shared_upgrades) : 1;

  const totalUpgrades = myUpgrades.length + partnerUpgrades.length + sharedUpgrades.length;
  const nextLevelAt = LEVEL_THRESHOLDS[Math.min(baseLevel, 4)] ?? 15;
  const prevLevelAt = LEVEL_THRESHOLDS[baseLevel - 1] ?? 0;
  const xpPct = nextLevelAt > prevLevelAt ? (totalUpgrades - prevLevelAt) / (nextLevelAt - prevLevelAt) : 1;

  const loadData = useCallback(async () => {
    if (!user?.id || !user.house_name) { setLoading(false); return; }

    const [baseRes, meRes] = await Promise.all([
      supabase.from('home_base').select('*').eq('household_id', user.house_name).maybeSingle(),
      supabase.from('user_profiles').select('ops_points').eq('id', user.id).single(),
    ]);

    setMyOps(meRes.data?.ops_points ?? 0);

    if (baseRes.data) {
      setBase(baseRes.data as HomeBaseRow);
      // Load partner profile
      const partnerId = baseRes.data.user1_id === user.id ? baseRes.data.user2_id : baseRes.data.user1_id;
      if (partnerId) {
        const { data: pData } = await supabase
          .from('user_profiles')
          .select('username, theme, unlocked_themes, ops_points')
          .eq('id', partnerId)
          .single();
        setPartnerProfile(pData);
      }
    } else {
      // Create home base for this household
      const { data: newBase } = await supabase
        .from('home_base')
        .insert({ household_id: user.house_name, user1_id: user.id, level: 1 })
        .select()
        .single();
      if (newBase) setBase(newBase as HomeBaseRow);
    }
    setLoading(false);
  }, [user?.id, user?.house_name]);

  useEffect(() => { loadData(); }, [loadData]);

  // Check zombie siege
  useEffect(() => {
    if (!base || !user?.id || baseLevel < 2) return;
    const siegeInterval = 21 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const lastSiege = base.last_zombie_siege ? new Date(base.last_zombie_siege).getTime() : 0;
    if (now - lastSiege < siegeInterval) return;

    // Run siege
    const survived = calcSiegeResult(base.user1_upgrades, base.user2_upgrades, base.shared_upgrades, baseLevel);
    supabase.from('home_base').update({
      last_zombie_siege: new Date().toISOString(),
      siege_survived: survived,
    }).eq('household_id', user.house_name!).then(() => {
      if (survived) {
        awardOpsPoints(user.id, 10, 'siege_survived');
        if (base.user2_id) awardOpsPoints(base.user2_id, 10, 'siege_survived');
      }
      loadData();
    });
  }, [base?.household_id]);

  async function purchaseUpgrade(upgrade: UpgradeDef) {
    if (!user?.id || !base) return;
    if (myOps < upgrade.cost) return;
    setPurchasing(true);
    try {
      const newMyUpgrades = upgrade.side === 'personal'
        ? [...myUpgrades, upgrade.id]
        : myUpgrades;
      const newShared = upgrade.side === 'shared'
        ? [...sharedUpgrades, upgrade.id]
        : sharedUpgrades;

      const updatePayload = upgrade.side === 'shared'
        ? { shared_upgrades: newShared }
        : amUser1
          ? { user1_upgrades: newMyUpgrades }
          : { user2_upgrades: newMyUpgrades };

      await supabase.from('home_base').update(updatePayload).eq('household_id', base.household_id);
      await supabase.from('user_profiles').update({ ops_points: myOps - upgrade.cost }).eq('id', user.id);
      setMyOps(p => p - upgrade.cost);
      await loadData();
    } finally {
      setPurchasing(false);
      setConfirmUpgrade(null);
    }
  }

  function isUnlocked(id: string) {
    return myUpgrades.includes(id) || sharedUpgrades.includes(id);
  }

  function canPurchase(upgrade: UpgradeDef): boolean {
    if (isUnlocked(upgrade.id)) return false;
    if (upgrade.requires && !isUnlocked(upgrade.requires)) return false;
    return myOps >= upgrade.cost;
  }

  function renderUpgradeCard(upgrade: UpgradeDef, viewOnly = false) {
    const unlocked = isUnlocked(upgrade.id);
    const locked = !unlocked;
    const affordable = canPurchase(upgrade);
    const reqMissing = upgrade.requires && !isUnlocked(upgrade.requires);
    const { Icon } = upgrade;

    return (
      <TouchableOpacity
        key={upgrade.id}
        style={[
          styles.upgradeCard,
          {
            borderColor: unlocked ? T.accent : reqMissing ? T.border + '40' : T.border,
            borderStyle: locked ? 'dashed' : 'solid',
            backgroundColor: unlocked ? T.accent + '12' : T.card,
            opacity: reqMissing ? 0.4 : 1,
          },
        ]}
        onPress={() => !viewOnly && locked && affordable ? setConfirmUpgrade(upgrade) : undefined}
        activeOpacity={viewOnly || unlocked ? 1 : 0.75}
        disabled={viewOnly || unlocked || !affordable}
      >
        <Icon size={18} color={unlocked ? T.accent : T.muted} style={{ marginBottom: 6 }} />
        <Text style={[styles.upgradeName, { color: unlocked ? T.accent : T.text }]}>{upgrade.name}</Text>
        <Text style={[styles.upgradeDesc, { color: T.muted }]}>{upgrade.desc}</Text>
        {locked && !reqMissing && (
          <View style={[styles.costBadge, { backgroundColor: affordable ? T.accent + '20' : T.border }]}>
            <Text style={{ fontSize: 9, color: affordable ? T.accent : T.muted, fontWeight: '700' }}>⬡ {upgrade.cost}</Text>
          </View>
        )}
        {unlocked && <Text style={{ fontSize: 9, color: T.accent, marginTop: 4, letterSpacing: 1 }}>✓ ACTIVE</Text>}
      </TouchableOpacity>
    );
  }

  if (!user) return null;

  if (!user.house_name) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 32, marginBottom: 16 }}>🏚️</Text>
          <Text style={[styles.headerTitle, { color: T.text }]}>NO HOUSEHOLD</Text>
          <Text style={{ color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            Set up a household in Settings to unlock Home Base.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
        <ActivityIndicator color={T.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const personalUpgrades = UPGRADES.filter(u => u.side === 'personal');
  const sharedUpgradesDefs = UPGRADES.filter(u => u.side === 'shared');

  const siegeDaysAgo = base?.last_zombie_siege
    ? Math.round((Date.now() - new Date(base.last_zombie_siege).getTime()) / 86400000)
    : null;
  const nextSiegeIn = siegeDaysAgo !== null ? Math.max(0, 21 - siegeDaysAgo) : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: T.border + '30' }]}>
        <Text style={[styles.headerTitle, { color: T.text }]}>HOME BASE</Text>
        <Text style={[styles.headerSub, { color: T.muted }]}>{user.house_name?.toUpperCase()}</Text>
        <View style={[styles.opsBadge, { backgroundColor: T.accent + '18', borderColor: T.accent + '40' }]}>
          <Text style={{ fontSize: 11, color: T.accent, fontWeight: '700', letterSpacing: 1 }}>⬡ {myOps} OPS PTS</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Base Level */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={[styles.baseLevelNum, { color: T.accent }]}>{baseLevel}</Text>
          <Text style={[styles.baseLevelLabel, { color: T.muted }]}>BASE LEVEL</Text>
          <View style={[styles.xpTrack, { backgroundColor: T.border }]}>
            <View style={[styles.xpFill, { width: `${Math.min(xpPct * 100, 100)}%` as any, backgroundColor: T.accent }]} />
          </View>
          <Text style={{ color: T.muted, fontSize: 10, letterSpacing: 1, marginTop: 4 }}>
            {totalUpgrades} / {nextLevelAt} upgrades to level {Math.min(baseLevel + 1, 5)}
          </Text>
        </View>

        {/* Split View */}
        <View style={styles.splitRow}>
          {/* MY HALF */}
          <View style={[styles.half, { backgroundColor: T.accent + '08', borderColor: T.accent + '30' }]}>
            <Text style={[styles.halfTitle, { color: T.accent }]}>{user.username?.toUpperCase() ?? 'YOU'}</Text>
            <View style={styles.themeDots}>
              {(user.unlocked_themes ?? ['iron']).map(th => (
                <View key={th} style={[styles.themeDot, { backgroundColor: T.accent }]} />
              ))}
            </View>
            {personalUpgrades.map(u => renderUpgradeCard(u))}
          </View>

          {/* PARTNER HALF */}
          <View style={[styles.half, { backgroundColor: T.blue ? T.blue + '08' : T.border + '10', borderColor: T.border + '30' }]}>
            {partnerProfile ? (
              <>
                <Text style={[styles.halfTitle, { color: T.text }]}>{partnerProfile.username?.toUpperCase() ?? 'PARTNER'}</Text>
                <View style={styles.themeDots}>
                  {(partnerProfile.unlocked_themes ?? ['iron']).map(th => (
                    <View key={th} style={[styles.themeDot, { backgroundColor: T.muted }]} />
                  ))}
                </View>
                {personalUpgrades.map(u => renderUpgradeCard(u, true))}
              </>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
                <Text style={{ color: T.muted, fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>UNLINKED</Text>
                <Text style={{ color: T.muted, fontSize: 10, marginTop: 8, textAlign: 'center', letterSpacing: 1 }}>
                  Share household name to link a partner
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Shared Infrastructure */}
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border + '30', marginTop: 16 }]}>
          <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.accent }]}>SHARED INFRASTRUCTURE</Text>
          <View style={styles.upgradeGrid}>
            {sharedUpgradesDefs.map(u => renderUpgradeCard(u))}
          </View>
        </View>

        {/* Zombie Siege */}
        {baseLevel >= 2 && (
          <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border + '30' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Skull size={18} color={T.muted} />
              <Text style={[styles.sectionLabel, { color: T.muted, borderLeftColor: T.red ?? '#ef4444', marginBottom: 0 }]}>ZOMBIE SIEGE</Text>
            </View>
            {!base?.last_zombie_siege ? (
              <Text style={{ color: T.muted, fontSize: 12, lineHeight: 18 }}>
                SIEGE INCOMING — your base will be tested soon.
              </Text>
            ) : base.siege_survived ? (
              <>
                <Text style={{ color: T.green ?? '#4ade80', fontSize: 12, fontWeight: '700' }}>
                  LAST SIEGE: {new Date(base.last_zombie_siege).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — SURVIVED ✓
                </Text>
                {nextSiegeIn !== null && (
                  <Text style={{ color: T.muted, fontSize: 11, marginTop: 6 }}>
                    Next siege in {nextSiegeIn} day{nextSiegeIn !== 1 ? 's' : ''}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={{ color: T.red ?? '#ef4444', fontSize: 12, fontWeight: '700' }}>
                  LAST SIEGE: {new Date(base.last_zombie_siege).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — BASE DAMAGED
                </Text>
                <Text style={{ color: T.muted, fontSize: 11, marginTop: 6, lineHeight: 18 }}>
                  Log 3 consecutive days across any module to repair.
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Confirm Purchase Modal */}
      <Modal visible={!!confirmUpgrade} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={[styles.modalTitle, { color: T.text }]}>{confirmUpgrade?.name}</Text>
            <Text style={[styles.modalDesc, { color: T.muted }]}>{confirmUpgrade?.desc}</Text>
            <Text style={[styles.modalCost, { color: T.accent }]}>⬡ {confirmUpgrade?.cost} ops pts</Text>
            <Text style={{ color: T.muted, fontSize: 11, marginBottom: 20 }}>You have ⬡ {myOps}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setConfirmUpgrade(null)}
                style={[styles.modalBtn, { borderColor: T.border, flex: 1 }]}
              >
                <Text style={{ color: T.muted, fontSize: 12, letterSpacing: 1 }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmUpgrade && purchaseUpgrade(confirmUpgrade)}
                disabled={purchasing}
                style={[styles.modalBtn, { backgroundColor: T.accent, borderColor: T.accent, flex: 1 }]}
              >
                {purchasing
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={{ color: '#000', fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>PURCHASE</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  headerSub: { flex: 1, fontSize: 11, letterSpacing: 2 },
  opsBadge: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  scroll: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 60 },
  baseLevelNum: { fontSize: 56, fontWeight: '900', lineHeight: 60 },
  baseLevelLabel: { fontSize: 10, letterSpacing: 4, marginBottom: 10 },
  xpTrack: { height: 4, width: 200, borderRadius: 2, overflow: 'hidden' },
  xpFill: { height: 4, borderRadius: 2 },
  splitRow: { flexDirection: 'row', gap: 12 },
  half: {
    flex: 1,
    width: HALF,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  halfTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  themeDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  themeDot: { width: 6, height: 6, borderRadius: 3 },
  upgradeCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  upgradeName: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  upgradeDesc: { fontSize: 9, lineHeight: 13 },
  costBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  upgradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '700',
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  modalDesc: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  modalCost: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  modalBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
