import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, TextInput, ActivityIndicator, Alert,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/sendPushNotification';
import { ANTHROPIC_API_KEY } from '../lib/config';
import { logEvent } from '../lib/logEvent';
import { callEdgeFunction } from '../lib/callEdgeFunction';
import { incrementThemeMetric } from '../lib/themeUnlocks';
import { GroceryNudgeCard } from '../components/GroceryNudgeCard';
import Blitz from './Blitz';
import ShoppingList from './ShoppingList';
import Pantry from './Pantry';
import * as Calendar from 'expo-calendar';
import {
  Zap, Target, Wind, AlertTriangle, ChevronRight,
  Moon, Heart, Activity, Footprints,
  Droplets, Coffee, Wine, GlassWater, Flame, Shield,
  Timer, Dumbbell, Wallet, Settings2,
} from 'lucide-react-native';

const MISSIONS_KEY = 'warroom_missions';
const MISSIONS_DATE_KEY = 'warroom_missions_date';

// ── BRAIN STATE ───────────────────────────────────────────────────────────────
const BRAIN_STATES = [
  { id: 'locked_in', label: 'LOCKED IN', Icon: Target, desc: 'Clear head, ready to execute' },
  { id: 'drifting',  label: 'DRIFTING',  Icon: Wind,   desc: 'Scattered — need a mission' },
  { id: 'flow',      label: 'FLOW STATE',Icon: Zap,    desc: 'Everything is clicking' },
  { id: 'emergency', label: 'EMERGENCY', Icon: AlertTriangle, desc: 'Overwhelmed — need backup' },
] as const;

type BrainStateId = typeof BRAIN_STATES[number]['id'];

// ── HELPERS ────────────────────────────────────────────────────────────────────
function getGreeting(hour: number, themeName: string): string {
  const timeGreet = hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING';

  const greetings: Record<string, Record<string, string>> = {
    iron: {
      MORNING: 'MORNING BRIEFING. SUIT UP.',
      AFTERNOON: "SITREP — WHAT'S THE STATUS?",
      EVENING: "DEBRIEF. HOW'D THE DAY GO.",
    },
    ronin: {
      MORNING: '\u5922\u660e\u3051 \u2014 THE BLADE IS SHARPEST AT DAWN.',
      AFTERNOON: '\u5348\u5f8c \u2014 STAY FOCUSED ON THE MISSION.',
      EVENING: '\u5915\u66ae\u308c \u2014 A RONIN REFLECTS AT DUSK.',
    },
    valkyrie: {
      MORNING: 'THE VALKYRJUR RISE. TODAY WE CLAIM GLORY.',
      AFTERNOON: 'HOLD THE LINE. VALHALLA WATCHES.',
      EVENING: 'THE SHIELD WALL RESTS. WELL FOUGHT.',
    },
    form: {
      MORNING: "Good morning \u2014 what are we building today?",
      AFTERNOON: "How's the energy? Let's keep it moving.",
      EVENING: 'Winding down. You showed up.',
    },
  };

  return greetings[themeName]?.[timeGreet] ?? greetings.iron[timeGreet];
}

function timeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function dateString(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
}

interface MissionStep {
  text: string;
  done: boolean;
}

interface Mission {
  text: string;
  steps: MissionStep[];
  expanded: boolean;
  done: boolean;
}

async function generateSubSteps(missionText: string): Promise<string[]> {
  if (!missionText.trim()) return [];
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: 'You are an ADHD task breakdown assistant. Break household missions into exactly 3 tiny, actionable steps. Keep each step under 6 words. Return JSON array of strings only.',
        messages: [{ role: 'user', content: missionText }],
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.log('[WarRoom] AI breakdown failed:', e);
    return [];
  }
}

// ── INTEL TYPES ───────────────────────────────────────────────────────────────
type IntelMode = 'photo' | 'screenshot' | 'voice' | 'text';
type IntelQueueItem = {
  id: string;
  type: 'image' | 'text';
  content: string;
  mimeType?: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  summary?: string;
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function WarRoom() {
  const { user, themeTokens: T, healthData, goalUnlockReady, refreshUser } = useUser();
  const navigation = useNavigation<any>();

  const [now, setNow] = useState(timeString());
  const [brainState, setBrainState] = useState<BrainStateId | null>(null);
  const [savingBrain, setSavingBrain] = useState(false);
  
  // Consistency / Goal tracking
  const [consistency, setConsistency] = useState<{ last30Days: number; isConsistent: boolean } | null>(null);
  const [loadingConsistency, setLoadingConsistency] = useState(false);
  const [reconExpanded, setReconExpanded] = useState(false);

  // Incoming signals (unread props)
  const [signals, setSignals] = useState<Array<{ id: string; from_user: string; message: string; created_at: string }>>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);

  // Partner status
  const [partner, setPartner] = useState<{ id: string; username: string; theme: string } | null>(null);

  // Missions (stored locally in memory between mounts, simple strings)
  const [missions, setMissions] = useState<Mission[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  // Intel Overlay
  const [showIntelOverlay, setShowIntelOverlay] = useState(false);
  const [intelMode, setIntelMode] = useState<IntelMode>('photo');
  const [intelTextInput, setIntelTextInput] = useState('');
  const [intelQueue, setIntelQueue] = useState<IntelQueueItem[]>([]);
  const [intelFiling, setIntelFiling] = useState(false);
  const intelInputRef = useRef<TextInput>(null);

  // Legacy single-result (kept for backward compat with existing result display)
  const [intelDropping, setIntelDropping] = useState(false);
  const [intelResult, setIntelResult] = useState<{ itemsLogged: number; incomeLogged?: number; pantryLogged?: number; clarifications?: string[]; store?: string } | null>(null);

  // Blitz
  const [showBlitz, setShowBlitz] = useState(false);
  const [partnerBrainState, setPartnerBrainState] = useState<string | null>(null);

  // Supply Run
  const [showSupplyRun, setShowSupplyRun] = useState(false);
  const [showPantry, setShowPantry] = useState(false);

  // Goal unlock
  const [showGoalSelector, setShowGoalSelector] = useState(false);
  const [selectingGoal, setSelectingGoal] = useState(false);
  const [activeGoal, setActiveGoal] = useState<{ id: string; goal_text: string; goal_type: string; target_value: number | null; target_unit: string | null; target_date: string | null; current_value: number | null } | null>(null);
  const [goalOptions, setGoalOptions] = useState<Array<{ icon: string; text: string; type: string; target_value?: number; target_unit?: string; target_date?: string }>>([]);
  const [customGoalText, setCustomGoalText] = useState('');
  const [showCustomGoal, setShowCustomGoal] = useState(false);

  // Nutrition check-in
  const [todayNutritionCheck, setTodayNutritionCheck] = useState<string | null>(null);

  const [waterLog, setWaterLog] = useState<Array<{ id: string; amount_ml: number; container: string; drink_type: string; logged_at: string }>>([]);
  const [showContainerPicker, setShowContainerPicker] = useState(false);

  // Calendar
  const [calEvents, setCalEvents] = useState<Array<{ id: string; title: string; startDate: string }>>([]);
  const [calPermission, setCalPermission] = useState(false);

  // Grocery nudges
  const [nudges, setNudges] = useState<Array<{
    id: string; item_name: string; store: string; discount_pct: number; sale_price: number; reason: string;
  }>>([]);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setNow(timeString()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Load missions from AsyncStorage, reset if it's a new day
  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const savedDate = await AsyncStorage.getItem(MISSIONS_DATE_KEY);
      const raw = await AsyncStorage.getItem(MISSIONS_KEY);
      let parsed: any[] = [];
      try { parsed = raw ? JSON.parse(raw) : []; } catch {}

      // Migration check: convert string[] to Mission[]
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        parsed = parsed.map(t => ({ text: t, steps: [], expanded: false, done: false }));
      }

      if (savedDate !== today) {
        // New day — reset missions, pre-populate training mission if today is a training day
        await AsyncStorage.setItem(MISSIONS_DATE_KEY, today);
        const initial: Mission[] = Array.from({ length: 3 }, () => ({
          text: '', steps: [], expanded: false, done: false
        }));

        const trainingDays: number[] = (user as any)?.training_days ?? [];
        const todayDow = new Date().getDay();
        if (trainingDays.includes(todayDow)) {
          const SPLIT_LABELS: Record<number, string[]> = {
            1: ['FULL'], 2: ['FULL A', 'FULL B'], 3: ['LEGS', 'PUSH', 'PULL'],
            4: ['LEGS', 'PUSH', 'PULL', 'FULL'], 5: ['PUSH', 'PULL', 'LEGS', 'FULL', 'CONDITIONING'],
            6: ['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'CONDITIONING'],
            7: ['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'LEGS', 'FULL'],
          };
          const sorted = [...trainingDays].sort((a, b) => a - b);
          const idx = sorted.indexOf(todayDow);
          const labels = SPLIT_LABELS[sorted.length] ?? ['FULL'];
          const split = labels[idx] ?? 'FULL';
          const theme = ((user as any)?.theme ?? 'tether').toUpperCase();
          const missionText = `${theme} — ${split} DAY 💪`;
          initial[0].text = missionText;
          const steps = await generateSubSteps(missionText);
          initial[0].steps = steps.map(s => ({ text: s, done: false }));
          initial[0].expanded = true;
        }
        await AsyncStorage.setItem(MISSIONS_KEY, JSON.stringify(initial));
        setMissions(initial);
      } else {
        if (parsed.length === 0) {
          parsed = Array.from({ length: 3 }, () => ({ text: '', steps: [], expanded: false, done: false }));
        }
        setMissions(parsed);
      }
    })();
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    loadSignals();
    loadPartner();
    loadNudges();
    loadCalendar();
    loadConsistencyData();
    loadActiveGoal();
    if (goalUnlockReady && !user?.goal_unlocked) loadGoalOptions();
    // Load today's nutrition check-in
    if (user?.id && (user?.macro_tier ?? 0) >= 1) {
      const today = new Date().toISOString().split('T')[0];
      supabase.from('nutrition_logs')
        .select('log_level')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()
        .then(({ data }) => setTodayNutritionCheck(data?.log_level ?? null));
    }
  }, [user?.house_name, user?.id, user?.goal_unlocked, user?.rank, user?.macro_tier, goalUnlockReady]));

  async function loadConsistency() {
    if (user?.id) loadConsistencyData();
  }

  async function loadActiveGoal() {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_goals')
      .select('id, goal_text, goal_type, target_value, target_unit, target_date, current_value')
      .eq('user_id', user.id)
      .eq('achieved', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveGoal(data ?? null);
  }

  async function loadGoalOptions() {
    if (!user?.id) return;
    const weightUnit = user?.weight_unit ?? 'lbs';

    // Pull top exercise from context snapshot
    const { data: snap } = await supabase
      .from('user_context_snapshots')
      .select('snapshot')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const topExercise: string | null = snap?.snapshot?.topExercisesLast14d?.[0] ?? null;

    // Get current PR for that exercise
    let strengthOption: { icon: string; text: string; type: string; target_value: number; target_unit: string; target_date: string } | null = null;
    if (topExercise) {
      const { data: prRow } = await supabase
        .from('exercise_performance')
        .select('weight')
        .eq('user_id', user.id)
        .eq('exercise_name', topExercise)
        .order('weight', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prRow?.weight) {
        const current = prRow.weight as number;
        // Round target up to next clean milestone
        const increment = weightUnit === 'kg' ? 10 : 25;
        const target = Math.ceil((current * 1.2) / increment) * increment;
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + 3);
        const monthName = targetDate.toLocaleString('default', { month: 'long' });
        strengthOption = {
          icon: '⬆️',
          text: `${topExercise} ${target}${weightUnit} by ${monthName}`,
          type: 'strength',
          target_value: target,
          target_unit: weightUnit,
          target_date: targetDate.toISOString().split('T')[0],
        };
      }
    }

    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const targetDateStr = threeMonths.toISOString().split('T')[0];

    const options = [
      ...(strengthOption ? [strengthOption] : []),
      { icon: '🏃', text: 'Run a 5K', type: 'cardio', target_value: 5, target_unit: 'km', target_date: targetDateStr },
      { icon: '💪', text: 'Hit 10 pull-ups unbroken', type: 'bodyweight', target_value: 10, target_unit: 'reps', target_date: targetDateStr },
      { icon: '🎯', text: 'Something else →', type: 'custom' },
    ];
    setGoalOptions(options);
  }

  async function loadConsistencyData() {
    if (!user?.id) return;
    setLoadingConsistency(true);
    const { data } = await supabase
      .from('user_context_snapshots')
      .select('snapshot')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.snapshot?.consistency) {
      setConsistency(data.snapshot.consistency);
    }
    setLoadingConsistency(false);
  }

  async function loadSignals() {
    if (!user?.id) return;
    setLoadingSignals(true);
    const { data } = await supabase
      .from('props')
      .select('id, from_user, message, created_at')
      .eq('to_user', user.id)
      .eq('seen', false)
      .eq('event_type', 'signal')
      .order('created_at', { ascending: false })
      .limit(5);
    setSignals(data ?? []);
    setLoadingSignals(false);
  }

  async function dismissSignal(id: string) {
    await supabase.from('props').update({ seen: true }).eq('id', id);
    setSignals(prev => prev.filter(s => s.id !== id));
    if (user?.id) logEvent(user.id, 'envelope_open', { prop_id: id });
  }

  async function loadPartner() {
    if (!user?.house_name || !user?.id) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('id, username, theme')
      .eq('house_name', user.house_name)
      .neq('id', user.id)
      .single();
    setPartner(data ?? null);
    if (data?.id) {
      const { data: snap } = await supabase
        .from('user_context_snapshots')
        .select('brain_state')
        .eq('user_id', data.id)
        .order('captured_at', { ascending: false })
        .limit(1)
        .single();
      setPartnerBrainState(snap?.brain_state ?? null);
    }
  }

  async function loadNudges() {
    if (!user?.house_name) return;
    const { data } = await supabase
      .from('grocery_nudges')
      .select('id, item_name, store, discount_pct, sale_price, reason')
      .eq('household_id', user.house_name)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(5);
    setNudges(data ?? []);
  }

  async function dismissNudge(id: string) {
    await supabase.from('grocery_nudges').update({ dismissed: true }).eq('id', id);
    setNudges(prev => prev.filter(n => n.id !== id));
  }

  async function loadCalendar() {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') return;
    setCalPermission(true);
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);
    const events = await Calendar.getEventsAsync(
      cals.map(c => c.id),
      start,
      end
    );
    setCalEvents(
      events
        .filter(e => e.title)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 4)
        .map(e => ({
          id: e.id,
          title: e.title,
          startDate: String(e.startDate),
        }))
    );
  }

  function formatEventTime(iso: string): string {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'pm' : 'am';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')}${ampm}`;
  }

  // ── INTEL OVERLAY HANDLERS ──────────────────────────────────────────────────
  async function handlePickImage(fromCamera: boolean) {
    if (!user?.id) return;
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', `Allow ${fromCamera ? 'camera' : 'photo library'} access.`);
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
        });

    if (result.canceled || !result.assets[0]?.base64) return;

    const asset = result.assets[0];
    const queueId = `img_${Date.now()}`;
    const newItem: IntelQueueItem = {
      id: queueId, type: 'image',
      content: asset.base64!,
      mimeType: asset.mimeType ?? 'image/jpeg',
      status: 'processing',
    };
    setIntelQueue(q => [...q, newItem]);

    // Process immediately
    try {
      const raw = await callEdgeFunction('intel-processor', {
        type: 'image',
        base64Image: asset.base64,
        mimeType: asset.mimeType ?? 'image/jpeg',
        userId: user.id,
        householdId: user.house_name,
      });
      const data = raw as {
        itemsLogged?: number; incomeLogged?: number; pantryLogged?: number;
        clarifications?: string[]; store?: string; duplicate?: boolean;
      };
      const parts = [];
      if ((data.itemsLogged ?? 0) > 0) parts.push(`${data.itemsLogged} expenses`);
      if ((data.incomeLogged ?? 0) > 0) parts.push(`${data.incomeLogged} income`);
      if ((data.pantryLogged ?? 0) > 0) parts.push(`${data.pantryLogged} pantry items`);
      if (data.duplicate) parts.push('already logged');
      const summary = parts.length ? `✓ ${parts.join(' · ')}${data.store ? ` from ${data.store}` : ''}` : '✓ Filed';
      setIntelQueue(q => q.map(i => i.id === queueId ? { ...i, status: 'done', summary } : i));
      logEvent(user.id, 'intel_drop', { store: data.store, items_logged: data.itemsLogged });
      incrementThemeMetric(user.id, 'module_days').catch(() => {});
    } catch {
      setIntelQueue(q => q.map(i => i.id === queueId ? { ...i, status: 'failed', summary: 'Failed — will retry' } : i));
    }
  }

  function addTextToQueue() {
    const text = intelTextInput.trim();
    if (!text) return;
    const queueId = `txt_${Date.now()}`;
    setIntelQueue(q => [...q, { id: queueId, type: 'text', content: text, status: 'pending' }]);
    setIntelTextInput('');
    intelInputRef.current?.clear();
  }

  async function handleFiledAndForgotten() {
    if (!user?.id) return;
    // Add any unsent text first
    const remaining = intelTextInput.trim();
    let currentQueue = [...intelQueue];
    if (remaining) {
      const queueId = `txt_${Date.now()}`;
      const newItem: IntelQueueItem = { id: queueId, type: 'text', content: remaining, status: 'pending' };
      currentQueue.push(newItem);
      setIntelQueue(currentQueue);
      setIntelTextInput('');
    }

    setIntelFiling(true);

    // Process all pending text items
    const pending = currentQueue.filter(i => i.type === 'text' && i.status === 'pending');

    for (const item of pending) {
      setIntelQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
      try {
        const raw = await callEdgeFunction('intel-processor', {
          type: 'text',
          text: item.content,
          userId: user.id,
          householdId: user.house_name,
        });
        const data = raw as {
          itemsLogged?: number; incomeLogged?: number; pantryLogged?: number;
          shoppingNeeds?: Array<{ name: string; category: string; quantity: number; unit: string }>;
          clarifications?: string[];
          calendarItems?: Array<{ title: string; date_hint: string; type: string }>;
        };
        const parts = [];
        if ((data.itemsLogged ?? 0) > 0) parts.push(`${data.itemsLogged} expenses`);
        if ((data.incomeLogged ?? 0) > 0) parts.push(`${data.incomeLogged} income`);
        if ((data.pantryLogged ?? 0) > 0) parts.push(`${data.pantryLogged} pantry`);
        if ((data.shoppingNeeds?.length ?? 0) > 0) parts.push(`${data.shoppingNeeds!.length} to shopping`);
        if ((data.calendarItems?.length ?? 0) > 0) parts.push(`${data.calendarItems!.length} events noted`);
        const summary = parts.length ? `✓ ${parts.join(' · ')}` : '✓ Filed';
        setIntelQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'done', summary } : i));
        logEvent(user.id, 'intel_text', { items: data.itemsLogged });
        incrementThemeMetric(user.id, 'module_days').catch(() => {});
      } catch {
        setIntelQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'failed', summary: 'Failed' } : i));
      }
    }

    setIntelFiling(false);
    // Close after brief delay so user sees the result
    setTimeout(() => {
      setShowIntelOverlay(false);
      setIntelQueue([]);
    }, 1500);
  }

  // ── WATER TRACKER ──────────────────────────────────────────────────────────
  const CONTAINERS = {
    bottle:   { label: 'Water bottle', emoji: '💧', ml: 500,  type: 'water' },
    cup:      { label: 'Cup / glass',  emoji: '🥤', ml: 250,  type: 'water' },
    tumbler:  { label: 'Tumbler',      emoji: '🫗', ml: 750,  type: 'water' },
    biggulp:  { label: 'Big gulp',     emoji: '🪣', ml: 1000, type: 'water' },
    pepsi:    { label: 'Pepsi / pop',  emoji: '🥤', ml: 355,  type: 'caffeine_sugar' },
    coffee:   { label: 'Coffee',       emoji: '☕', ml: 250,  type: 'caffeine' },
    alcohol:  { label: 'Drink',        emoji: '🍺', ml: 355,  type: 'alcohol' },
    other:    { label: 'Other',        emoji: '💬', ml: 250,  type: 'other' },
  } as const;
  type ContainerKey = keyof typeof CONTAINERS;

  const today = new Date().toISOString().split('T')[0];
  const waterKey = `water_log_${user?.id}_${today}`;
  const waterGoal = (user as any)?.water_goal_units ?? 8;
  const defaultContainer: ContainerKey = ((user as any)?.default_water_container ?? 'bottle') as ContainerKey;

  useEffect(() => {
    AsyncStorage.getItem(waterKey).then(raw => {
      if (raw) {
        try { setWaterLog(JSON.parse(raw)); } catch {}
      }
    });
  }, [waterKey]);

  async function logWater(containerKey: ContainerKey) {
    if (!user?.id) return;
    const c = CONTAINERS[containerKey];
    const entry = { id: `w_${Date.now()}`, amount_ml: c.ml, container: containerKey, drink_type: c.type, logged_at: new Date().toISOString() };
    const newLog = [...waterLog, entry];
    setWaterLog(newLog);
    setShowContainerPicker(false);
    await AsyncStorage.setItem(waterKey, JSON.stringify(newLog));
    const totalMl = newLog.reduce((sum, e) => sum + e.amount_ml, 0);
    await supabase.from('health_snapshots').upsert({ user_id: user.id, date: today, water_ml: totalMl }, { onConflict: 'user_id,date' });
    logEvent(user.id, 'drink_logged', { drink_type: c.type, amount_ml: c.ml, container: containerKey });
    incrementThemeMetric(user.id, 'module_days').catch(() => {});
  }

  async function undoLastWater() {
    if (!waterLog.length) return;
    const newLog = waterLog.slice(0, -1);
    setWaterLog(newLog);
    await AsyncStorage.setItem(waterKey, JSON.stringify(newLog));
  }

  async function selectBrainState(state: BrainStateId) {
    if (!user?.id) return;
    setSavingBrain(true);
    setBrainState(state);
    await supabase.from('user_context_snapshots').insert({
      user_id: user.id,
      brain_state: state,
      captured_at: new Date().toISOString(),
    });
    logEvent(user.id, 'brain_state_set', { state });
    incrementThemeMetric(user.id, 'module_days').catch(() => {});
    if (state === 'emergency' && partner?.id) {
      sendPushNotification(
        partner.id,
        '🚨 BACKUP NEEDED',
        `${user.username ?? 'Your partner'} is in EMERGENCY mode — check in.`,
      );
    }
    setSavingBrain(false);
  }

  function toggleStep(missionIdx: number, stepIdx: number) {
    const updated = [...missions];
    const m = updated[missionIdx];
    m.steps[stepIdx].done = !m.steps[stepIdx].done;
    m.done = m.steps.length > 0 && m.steps.every(s => s.done);
    setMissions(updated);
    AsyncStorage.setItem(MISSIONS_KEY, JSON.stringify(updated));
  }

  function toggleExpand(idx: number) {
    const updated = [...missions];
    updated[idx].expanded = !updated[idx].expanded;
    setMissions(updated);
    AsyncStorage.setItem(MISSIONS_KEY, JSON.stringify(updated));
  }

  async function saveMission(idx: number) {
    const text = editText.trim();
    if (!text) {
      const updated = [...missions];
      updated[idx] = { text: '', steps: [], expanded: false, done: false };
      setMissions(updated);
      AsyncStorage.setItem(MISSIONS_KEY, JSON.stringify(updated));
      setEditingIdx(null);
      setEditText('');
      return;
    }

    const updated = [...missions];
    const prevText = updated[idx]?.text || '';
    
    if (text !== prevText) {
      updated[idx] = { text, steps: [], expanded: false, done: false };
      setMissions([...updated]);
      
      const steps = await generateSubSteps(text);
      if (steps.length > 0) {
        updated[idx].steps = steps.map(s => ({ text: s, done: false }));
        updated[idx].expanded = true;
        setMissions([...updated]);
      }
    }

    AsyncStorage.setItem(MISSIONS_KEY, JSON.stringify(updated));
    setEditingIdx(null);
    setEditText('');
  }

  const s = makeStyles(T);
  const hour = new Date().getHours();
  const greeting = getGreeting(hour, user?.theme ?? 'iron');
  const userRank = user?.rank ?? 1;
  const themeBadge = (user?.theme ?? 'iron').toUpperCase();

  async function handleSetGoal(option: { text: string; type: string; target_value?: number; target_unit?: string; target_date?: string }) {
    if (!user?.id) return;
    setSelectingGoal(true);
    await supabase.from('user_goals').insert({
      user_id: user.id,
      goal_text: option.text,
      goal_type: option.type,
      target_value: option.target_value ?? null,
      target_unit: option.target_unit ?? null,
      target_date: option.target_date ?? null,
      current_value: null,
    });
    await supabase.from('user_profiles').update({ macro_tier: 1, goal_unlocked: true }).eq('id', user.id);
    await refreshUser();
    await loadActiveGoal();
    setSelectingGoal(false);
    setCustomGoalText('');
    setShowCustomGoal(false);
  }

  async function logNutritionCheck(level: 'crushed' | 'close' | 'missed') {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const proteinGoal = getProteinGoal();
    const proteinMap = { crushed: proteinGoal, close: Math.round(proteinGoal * 0.8), missed: Math.round(proteinGoal * 0.5) };
    await supabase.from('nutrition_logs').upsert({
      user_id: user.id,
      date: today,
      protein_g: proteinMap[level],
      log_level: level,
    }, { onConflict: 'user_id,date' });
    setTodayNutritionCheck(level);
  }

  function getProteinGoal(): number {
    const sessions = consistency?.last30Days ?? 0;
    if (sessions >= 16) return 180;
    if (sessions >= 10) return 160;
    if (sessions >= 6) return 140;
    return 120;
  }

  function getCalorieGoal(): number {
    const sessions = consistency?.last30Days ?? 0;
    if (sessions >= 16) return 2800;
    if (sessions >= 10) return 2500;
    return 2200;
  }

  return (
    <SafeAreaView style={s.safe}>
        {/* ── GOAL UNLOCK MOMENT ──────────────────────────────────────────────── */}
        {goalUnlockReady && !user?.goal_unlocked && (
          <Modal visible={true} animationType="fade" statusBarTranslucent>
            <View style={{ flex: 1, backgroundColor: T.bg }}>
              <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                {/* Hero */}
                <View style={{ paddingHorizontal: 28, paddingTop: 80, paddingBottom: 32, borderBottomWidth: 1, borderBottomColor: T.border }}>
                  <Text style={{ fontSize: 11, color: T.accent, fontWeight: '800', letterSpacing: 4, marginBottom: 20 }}>
                    CONSISTENCY UNLOCKED
                  </Text>
                  <Text style={{ fontSize: 34, fontWeight: '900', color: T.text, lineHeight: 40, letterSpacing: -0.5, marginBottom: 16 }}>
                    YOU'VE BEEN{'\n'}SHOWING UP.
                  </Text>
                  <Text style={{ fontSize: 15, color: T.muted, lineHeight: 22 }}>
                    {consistency?.last30Days ?? 0} sessions in the last month.{'\n'}Time to aim at something.
                  </Text>
                </View>

                {/* Goal options */}
                <View style={{ padding: 24, gap: 12 }}>
                  <Text style={{ fontSize: 10, color: T.muted, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>
                    BASED ON YOUR LAST MONTH, YOU COULD:
                  </Text>

                  {goalOptions.filter(o => o.type !== 'custom').map(opt => (
                    <TouchableOpacity
                      key={opt.text}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 16,
                        backgroundColor: T.card, borderWidth: 1.5, borderColor: T.border,
                        borderRadius: 14, padding: 20,
                        opacity: selectingGoal ? 0.5 : 1,
                      }}
                      onPress={() => handleSetGoal(opt)}
                      disabled={selectingGoal}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: T.text, lineHeight: 20 }}>
                          {opt.text}
                        </Text>
                        {opt.target_date && (
                          <Text style={{ fontSize: 11, color: T.muted, marginTop: 4, letterSpacing: 0.5 }}>
                            Target: {new Date(opt.target_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </Text>
                        )}
                      </View>
                      {selectingGoal ? <ActivityIndicator color={T.accent} /> : <Text style={{ color: T.accent, fontSize: 20 }}>›</Text>}
                    </TouchableOpacity>
                  ))}

                  {/* Something else */}
                  {!showCustomGoal ? (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 16,
                        borderWidth: 1, borderColor: T.border, borderStyle: 'dashed',
                        borderRadius: 14, padding: 20,
                      }}
                      onPress={() => setShowCustomGoal(true)}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 28 }}>🎯</Text>
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: T.muted }}>Something else →</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ backgroundColor: T.card, borderWidth: 1.5, borderColor: T.accent, borderRadius: 14, padding: 20, gap: 12 }}>
                      <Text style={{ fontSize: 11, color: T.accent, fontWeight: '800', letterSpacing: 2 }}>YOUR GOAL</Text>
                      <TextInput
                        style={{ fontSize: 15, color: T.text, borderBottomWidth: 1, borderBottomColor: T.border, paddingBottom: 8 }}
                        value={customGoalText}
                        onChangeText={setCustomGoalText}
                        placeholder="e.g. Run a half marathon by October"
                        placeholderTextColor={T.muted}
                        autoFocus
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        style={{ backgroundColor: T.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', opacity: customGoalText.trim() ? 1 : 0.4 }}
                        onPress={() => customGoalText.trim() && handleSetGoal({ text: customGoalText.trim(), type: 'custom' })}
                        disabled={!customGoalText.trim() || selectingGoal}
                      >
                        {selectingGoal
                          ? <ActivityIndicator color={T.bg} />
                          : <Text style={{ color: T.bg, fontWeight: '900', fontSize: 14, letterSpacing: 2 }}>SET THIS GOAL</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </Modal>
        )}
      <StatusBar barStyle={T.mode === 'light' ? 'dark-content' : 'light-content'} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── MORNING BRIEFING HEADER ─────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <Text style={s.clock}>{now}</Text>
            <View style={s.themeBadge}>
              <Text style={s.themeBadgeText}>{themeBadge}</Text>
            </View>
          </View>
          <Text style={s.date}>{dateString()}</Text>
          <Text style={s.greeting}>{greeting}</Text>
          {user?.username && (
            <Text style={s.callsign}>OPERATIVE: {user.username.toUpperCase()}</Text>
          )}
          <View style={{ height: 1, backgroundColor: T.border, opacity: 0.3, marginVertical: 16, marginHorizontal: -20 }} />
        </View>

        {/* ── HEALTH RECON STRIP ───────────────────────────────────────────────── */}
        {healthData && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            <View style={s.healthPill}>
              <Moon size={13} color={(healthData.sleep?.hours ?? 99) < 5 ? T.red : T.muted} />
              <Text style={[s.healthValue, (healthData.sleep?.hours ?? 99) < 5 ? { color: T.red } : {}]}>
                {healthData.sleep?.hours != null ? `${healthData.sleep.hours}h` : '--'}
              </Text>
              <Text style={s.healthLabel}>SLEEP</Text>
            </View>
            <View style={s.healthPill}>
              <Heart size={13} color={T.muted} />
              <Text style={s.healthValue}>{healthData.restingHR ?? '--'}</Text>
              <Text style={s.healthLabel}>HR</Text>
            </View>
            <View style={s.healthPill}>
              <Activity size={13} color={
                healthData.hrv == null ? T.muted :
                healthData.hrv > 50 ? T.green :
                healthData.hrv > 30 ? '#f59e0b' : T.red
              } />
              <Text style={[s.healthValue,
                healthData.hrv == null ? {} :
                healthData.hrv > 50 ? { color: T.green } :
                healthData.hrv > 30 ? { color: '#f59e0b' } :
                { color: T.red }
              ]}>
                {healthData.hrv ?? '--'}
              </Text>
              <Text style={s.healthLabel}>HRV</Text>
            </View>
            <View style={s.healthPill}>
              <Footprints size={13} color={T.muted} />
              <Text style={s.healthValue}>{healthData.steps?.toLocaleString() ?? '--'}</Text>
              <Text style={s.healthLabel}>STEPS</Text>
            </View>
          </ScrollView>
        )}

        {/* ── RANK + TARGET ACQUIRED ──────────────────────────────────────────── */}
        {user?.goal_unlocked && (
          <View style={s.goalCard}>
            {/* Rank row */}
            <View style={s.goalHeader}>
              <View>
                <Text style={s.goalLabel}>CURRENT RANK</Text>
                <Text style={s.goalValue}>
                  {['RECRUIT', 'SOLDIER', 'VETERAN', 'ELITE', 'COMMANDER', 'LEGENDARY'][userRank - 1] || 'RECRUIT'}
                </Text>
              </View>
              <View style={s.rankBadge}>
                <Text style={s.rankBadgeText}>{userRank}</Text>
              </View>
            </View>

            <View style={s.progressSection}>
              <View style={s.progressLabels}>
                <Text style={s.nextRankLabel}>
                  NEXT: {['SOLDIER', 'VETERAN', 'ELITE', 'COMMANDER', 'LEGENDARY', 'MAX'][userRank - 1] || 'MAX'}
                </Text>
                <Text style={s.progressText}>
                  {loadingConsistency ? '...' : `${consistency?.last30Days ?? 0} / 8 sessions`}
                </Text>
              </View>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${Math.min(((consistency?.last30Days ?? 0) / 8) * 100, 100)}%` as any }]} />
              </View>
            </View>

            {/* TARGET ACQUIRED */}
            {activeGoal && (
              <View style={s.targetCard}>
                <Text style={s.targetLabel}>TARGET ACQUIRED</Text>
                <Text style={s.targetText}>{activeGoal.goal_text}</Text>

                {/* Strength goal progress */}
                {activeGoal.goal_type === 'strength' && activeGoal.target_value && activeGoal.current_value != null && (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, color: T.muted }}>
                        Current: {activeGoal.current_value}{activeGoal.target_unit}
                      </Text>
                      <Text style={{ fontSize: 11, color: T.muted }}>
                        {activeGoal.target_value - activeGoal.current_value}{activeGoal.target_unit} to go
                      </Text>
                    </View>
                    <View style={s.progressBarBg}>
                      <View style={[s.progressBarFill, {
                        width: `${Math.min((activeGoal.current_value / activeGoal.target_value) * 100, 100)}%` as any,
                        backgroundColor: T.green,
                      }]} />
                    </View>
                  </View>
                )}

                {activeGoal.target_date && (
                  <Text style={{ fontSize: 10, color: T.muted, marginTop: 8, letterSpacing: 1 }}>
                    TARGET DATE: {new Date(activeGoal.target_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── INTEL ───────────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <TouchableOpacity
            style={s.intelBtn}
            onPress={() => { setShowIntelOverlay(true); setIntelQueue([]); }}
            activeOpacity={0.8}
          >
            <Zap size={24} color={T.accent} />
            <View style={{ flex: 1 }}>
              <Text style={s.intelLabel}>INTEL</Text>
              <Text style={s.intelSub}>Photo · Screenshot · Voice · Type — File it all</Text>
            </View>
            <ChevronRight size={18} color={T.accent} />
          </TouchableOpacity>
        </View>

        {/* ── GROCERY NUDGES ───────────────────────────────────────────────────── */}
        {nudges.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>INTEL — DEALS DETECTED</Text>
            {nudges.map(n => (
              <GroceryNudgeCard
                key={n.id}
                itemName={n.item_name}
                store={n.store}
                discountPct={n.discount_pct}
                salePrice={n.sale_price}
                reason={n.reason}
                onDismiss={() => dismissNudge(n.id)}
              />
            ))}
          </View>
        )}

        {/* ── BRAIN STATE ─────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>BRAIN STATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {BRAIN_STATES.map(bs => {
              const active = brainState === bs.id;
              const { Icon } = bs;
              return (
                <TouchableOpacity
                  key={bs.id}
                  style={[s.brainCard, active && s.brainCardActive]}
                  onPress={() => selectBrainState(bs.id)}
                  disabled={savingBrain}
                  activeOpacity={0.75}
                >
                  <Icon size={22} color={active ? T.accent : T.muted} style={{ marginBottom: 8 }} />
                  <Text style={[s.brainLabel, active && s.brainLabelActive]}>{bs.label}</Text>
                  {active && <Text style={s.brainDesc}>{bs.desc}</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Ground link */}
          {brainState && brainState !== 'flow' && brainState !== 'locked_in' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Ground' as never)}
              style={{ alignSelf: 'flex-start', marginTop: 12, paddingVertical: 4 }}
            >
              <Text style={{ color: T.muted, fontSize: 11, letterSpacing: 1 }}>
                Need to ground? →
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── EMERGENCY PROTOCOL ───────────────────────────────────────────────── */}
        {brainState === 'emergency' && (
          <View style={[s.section, { borderWidth: 1, borderColor: T.red ?? '#ef4444', borderRadius: 18, backgroundColor: (T.red ?? '#ef4444') + '12', marginBottom: 0 }]}>
            <Text style={{ color: T.red ?? '#ef4444', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 10 }}>
              ⚠ EMERGENCY PROTOCOL
            </Text>
            <Text style={{ color: T.text, fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
              You flagged overwhelm. That's real — and it means you need to discharge the stress response before anything else.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Ground' as never)}
              style={{ backgroundColor: T.red ?? '#ef4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 2 }}>
                GROUND NOW — PICK A PROTOCOL
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── FUEL TARGET ──────────────────────────────────────────────────────── */}
        {(user?.macro_tier ?? 0) >= 1 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>FUEL TARGET</Text>
            <View style={s.fuelCard}>
              <View style={s.fuelRow}>
                <Text style={s.fuelMetric}>Protein</Text>
                <Text style={s.fuelValue}>~{getProteinGoal()}g today</Text>
              </View>
              {(user?.macro_tier ?? 0) >= 2 && (
                <View style={[s.fuelRow, { borderTopWidth: 1, borderTopColor: T.border, marginTop: 10, paddingTop: 10 }]}>
                  <Text style={s.fuelMetric}>Calories</Text>
                  <Text style={s.fuelValue}>~{getCalorieGoal().toLocaleString()} kcal</Text>
                </View>
              )}
            </View>

            {/* Simple check-in */}
            {todayNutritionCheck ? (
              <View style={s.fuelCheckedRow}>
                <Text style={{ fontSize: 13, color: T.green, fontWeight: '700', letterSpacing: 1 }}>✓ LOGGED</Text>
                <TouchableOpacity onPress={() => setTodayNutritionCheck(null)}>
                  <Text style={{ fontSize: 11, color: T.muted, letterSpacing: 1 }}>UNDO</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginBottom: 10, marginTop: 14 }}>
                  HOW'D YOU DO TODAY?
                </Text>
                <View style={s.checkInRow}>
                  {([
                    { id: 'crushed' as const, label: 'Crushed it', color: T.green },
                    { id: 'close' as const, label: 'Pretty close', color: T.accent },
                    { id: 'missed' as const, label: 'Not great', color: T.muted },
                  ]).map(btn => (
                    <TouchableOpacity
                      key={btn.id}
                      style={[s.checkInBtn, { borderColor: btn.color }]}
                      onPress={() => logNutritionCheck(btn.id)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: btn.color, letterSpacing: 0.5 }}>
                        {btn.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[s.checkInBtn, { borderColor: 'transparent' }]}
                    onPress={() => setTodayNutritionCheck('skip')}
                  >
                    <Text style={{ fontSize: 11, color: T.muted }}>Skip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('Fuel' as never)}
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: T.muted, fontSize: 11, letterSpacing: 1 }}>Log a meal →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── HYDRATION ────────────────────────────────────────────────────────── */}
        {(() => {
          const filled = Math.min(waterLog.filter(e => e.drink_type === 'water').length, waterGoal);
          const totalMl = waterLog.reduce((s, e) => s + e.amount_ml, 0);
          const goalMl = waterGoal * CONTAINERS[defaultContainer].ml;
          const goalHit = filled >= waterGoal;
          const GOAL_MESSAGES: Record<string, string> = {
            iron: 'HYDRATION SECURED.', ronin: 'Discipline maintained.', valkyrie: 'Hydrated. Ready.',
            forge: 'Systems running hot — fuel maintained.', arcane: 'The well is full.',
            dragonfire: 'Fire fed. Keep going.', void: 'Fluid dynamics nominal.',
            verdant: 'Roots watered.', form: 'Your body thanks you.',
          };
          return (
            <View style={s.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={s.sectionLabel}>HYDRATION</Text>
                {waterLog.length > 0 && (
                  <TouchableOpacity onPress={undoLastWater}>
                    <Text style={{ color: T.muted, fontSize: 10, letterSpacing: 1 }}>UNDO</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[s.waterCard, { backgroundColor: T.card, borderColor: goalHit ? T.accent : T.border + '30', borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 }]}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                  {Array.from({ length: Math.min(waterGoal, 12) }).map((_, i) => (
                    <Text key={i} style={{ fontSize: 16, letterSpacing: 2, color: i < filled ? T.accent : T.border }}>
                      {i < filled ? '●' : '○'}
                    </Text>
                  ))}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ color: goalHit ? T.accent : T.text, fontWeight: '700', fontSize: 16 }}>{filled} / {waterGoal}</Text>
                  <Text style={{ color: T.muted, fontSize: 10 }}>{(totalMl / 1000).toFixed(1)}L</Text>
                </View>
              </View>
              {goalHit && (
                <Text style={{ color: T.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 6, textAlign: 'center' }}>
                  {GOAL_MESSAGES[user?.theme ?? 'iron'] ?? GOAL_MESSAGES.iron}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[s.waterBtn, { backgroundColor: T.accent, flex: 1 }]}
                  onPress={() => logWater(defaultContainer)}
                >
                  <Droplets size={16} color={T.bg} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.waterBtn, { borderColor: T.border, borderWidth: 1, paddingHorizontal: 16 }]}
                  onPress={() => setShowContainerPicker(true)}
                >
                  <Text style={{ color: T.muted, fontSize: 12 }}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {/* ── TODAY'S MISSIONS ─────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>TODAY'S MISSIONS</Text>

          {calEvents.map(ev => (
            <View key={ev.id} style={s.missionRow}>
              <Text style={s.calEventTime}>📅 {formatEventTime(ev.startDate)}</Text>
              <Text style={s.calEventTitle}>{ev.title}</Text>
            </View>
          ))}

          {!calPermission && (
            <Text style={[s.muted, { fontSize: 11, marginBottom: 8 }]}>
              Connect calendar in device Settings for event sync
            </Text>
          )}

          {missions.map((m, i) => (
            <View key={i}>
              <View style={[
                s.missionRow,
                !m.text && { borderStyle: 'dashed', opacity: 0.35 },
                m.done && { opacity: 0.4 },
              ]}>
                {/* Left accent bar */}
                <View style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                  backgroundColor: m.done ? T.green : (m.text ? T.accent : T.border),
                  borderRadius: 3,
                }} />
                <Text style={[s.missionNum, { marginLeft: 20 }]}>{calEvents.length + i + 1}</Text>
                {editingIdx === i ? (
                  <TextInput
                    style={s.missionInput}
                    value={editText}
                    onChangeText={setEditText}
                    onSubmitEditing={() => saveMission(i)}
                    onBlur={() => saveMission(i)}
                    autoFocus
                    returnKeyType="done"
                    placeholderTextColor={T.muted}
                    placeholder="Enter mission..."
                  />
                ) : (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={s.missionTextWrap}
                      onPress={() => { setEditingIdx(i); setEditText(m.text); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        m.text ? s.missionText : s.missionPlaceholder,
                        m.done && { textDecorationLine: 'line-through', color: T.muted }
                      ]}>
                        {m.text || 'TAP TO SET MISSION...'}
                      </Text>
                    </TouchableOpacity>
                    {m.steps.length > 0 && (
                      <TouchableOpacity onPress={() => toggleExpand(i)} style={{ padding: 10 }}>
                        <Text style={{ color: T.accent, fontSize: 10 }}>{m.expanded ? '▲' : '▼'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              {m.expanded && m.steps.map((step, si) => (
                <TouchableOpacity 
                  key={si} 
                  style={s.stepRow} 
                  onPress={() => toggleStep(i, si)}
                >
                  <View style={[s.stepCheck, step.done && { backgroundColor: T.accent, borderColor: T.accent }]}>
                    {step.done && <Text style={s.stepCheckText}>✓</Text>}
                  </View>
                  <Text style={[s.stepText, { color: step.done ? T.muted : T.text }]}>{step.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* ── INCOMING SIGNALS ─────────────────────────────────────────────────── */}
        {(signals.length > 0 || loadingSignals) && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>INCOMING SIGNALS</Text>
            {loadingSignals ? (
              <ActivityIndicator color={T.accent} />
            ) : (
              signals.map(sig => (
                <View key={sig.id} style={s.signalCard}>
                  <View style={s.signalContent}>
                    <Text style={s.signalFrom}>{sig.from_user}</Text>
                    <Text style={s.signalMsg}>{sig.message}</Text>
                  </View>
                  <TouchableOpacity style={s.dismissBtn} onPress={() => dismissSignal(sig.id)}>
                    <Text style={s.dismissText}>✓</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── ALLIED FORCES ────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ALLIED FORCES</Text>
          <View style={s.allyCard}>
            {partner ? (
              <>
                <View style={s.allyDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.allyName}>{partner.username?.toUpperCase()}</Text>
                  <Text style={s.allyTheme}>OPERATIVE — {partner.theme?.toUpperCase()}</Text>
                </View>
                <Text style={s.allyStatus}>LINKED</Text>
              </>
            ) : (
              <Text style={s.muted}>No partner linked — invite in Settings</Text>
            )}
          </View>
          {(partnerBrainState === 'drifting' || partnerBrainState === 'emergency') && (
            <TouchableOpacity
              style={s.backupAvailable}
              onPress={() => setShowBlitz(true)}
              activeOpacity={0.8}
            >
              <Text style={s.backupText}>🔥 BACKUP AVAILABLE — Blitz ready</Text>
            </TouchableOpacity>
          )}
          {user?.house_name && (
            <Text style={s.houseName}>⌂ {user.house_name}</Text>
          )}
        </View>

        {/* ── RECON ──────────────────────────────────────────────────────── */}
        {healthData && (
          <View style={s.section}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setReconExpanded(e => !e)}
            >
              <View style={[s.reconStrip, { borderColor: T.border, backgroundColor: T.card }]}>
                <View style={s.reconHeader}>
                  <Text style={[s.sectionLabel, { marginBottom: 0 }]}>RECON</Text>
                  <Text style={[s.reconSubLabel, { color: T.muted }]}>last night  {reconExpanded ? '▲' : '▼'}</Text>
                </View>
                <View style={s.reconRow}>
                  {healthData.sleep?.hours != null && (
                    <View style={s.reconStat}>
                      <Text style={s.reconEmoji}>💤</Text>
                      <Text style={[s.reconVal, { color: healthData.sleep.hours < 5 ? '#ef4444' : T.text }]}>
                        {healthData.sleep.hours}h
                      </Text>
                    </View>
                  )}
                  {healthData.restingHR != null && (
                    <View style={s.reconStat}>
                      <Text style={s.reconEmoji}>❤️</Text>
                      <Text style={[s.reconVal, { color: T.text }]}>{healthData.restingHR}bpm</Text>
                    </View>
                  )}
                  {healthData.hrv != null && (
                    <View style={s.reconStat}>
                      <Text style={s.reconEmoji}>📊</Text>
                      <Text style={[s.reconVal, {
                        color: healthData.hrv > 50 ? '#22c55e'
                          : healthData.hrv > 30 ? '#eab308'
                          : '#ef4444',
                      }]}>{Math.round(healthData.hrv)}ms</Text>
                    </View>
                  )}
                  {(healthData.steps ?? 0) > 0 && (
                    <View style={s.reconStat}>
                      <Text style={s.reconEmoji}>👟</Text>
                      <Text style={[s.reconVal, { color: T.muted }]}>
                        {(healthData.steps ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {reconExpanded && (
              <View style={[s.reconDetail, { borderColor: T.border, backgroundColor: T.card }]}>
                {healthData.hrv != null && (
                  <View style={s.reconDetailRow}>
                    <Text style={[s.reconDetailLabel, { color: T.muted }]}>HRV STATUS</Text>
                    <Text style={[s.reconDetailVal, {
                      color: healthData.hrv > 50 ? '#22c55e'
                        : healthData.hrv > 30 ? '#eab308'
                        : '#ef4444',
                    }]}>
                      {healthData.hrv > 50 ? 'RECOVERED — green light' :
                       healthData.hrv > 30 ? 'MODERATE — steady effort' :
                       'FATIGUED — back off today'}
                    </Text>
                  </View>
                )}
                {healthData.sleep?.hours != null && healthData.sleep.hours < 5 && (
                  <View style={s.reconDetailRow}>
                    <Text style={[s.reconDetailLabel, { color: T.muted }]}>SLEEP FLAG</Text>
                    <Text style={[s.reconDetailVal, { color: '#ef4444' }]}>
                      Low sleep — intensity auto-adjusted
                    </Text>
                  </View>
                )}
                {healthData.avgHR != null && (
                  <View style={s.reconDetailRow}>
                    <Text style={[s.reconDetailLabel, { color: T.muted }]}>AVG HR TODAY</Text>
                    <Text style={[s.reconDetailVal, { color: T.text }]}>{healthData.avgHR} bpm</Text>
                  </View>
                )}
                {(healthData.steps ?? 0) > 0 && (
                  <View style={s.reconDetailRow}>
                    <Text style={[s.reconDetailLabel, { color: T.muted }]}>STEPS TODAY</Text>
                    <Text style={[s.reconDetailVal, { color: T.text }]}>
                      {(healthData.steps ?? 0).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── BLITZ ──────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <TouchableOpacity
            style={s.fieldResetBtn}
            onPress={() => setShowBlitz(true)}
            activeOpacity={0.8}
          >
            <Text style={s.fieldResetIcon}>🔥</Text>
            <View>
              <Text style={s.fieldResetLabel}>BLITZ</Text>
              <Text style={s.fieldResetSub}>One mission. One corner. One win.</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── QUICK ACTIONS ────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>QUICK ACCESS</Text>
          <View style={s.quickRow}>
            {([
              { label: 'WORK',   Icon: Timer,    screen: 'Workday' as const,  overlay: null },
              { label: 'FIT',    Icon: Dumbbell, screen: 'Fitness' as const,  overlay: null },
              { label: 'PANTRY', Icon: GlassWater, screen: null,              overlay: 'pantry' as const },
              { label: 'ARMORY', Icon: Wallet,   screen: 'Budget' as const,   overlay: null },
              { label: 'OPS',    Icon: Settings2, screen: 'Settings' as const, overlay: null },
            ] as const).map(q => (
              <TouchableOpacity
                key={q.label}
                style={s.quickBtn}
                onPress={() => q.overlay === 'pantry' ? setShowPantry(true) : navigation.navigate(q.screen!)}
                activeOpacity={0.75}
              >
                <q.Icon size={20} color={T.muted} style={{ marginBottom: 6 }} />
                <Text style={s.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SUPPLY RUN ───────────────────────────────────────────────────────── */}
        <View style={s.section}>
          <TouchableOpacity
            style={s.fieldResetBtn}
            onPress={() => setShowSupplyRun(true)}
            activeOpacity={0.8}
          >
            <Text style={s.fieldResetIcon}>📋</Text>
            <View>
              <Text style={s.fieldResetLabel}>SUPPLY RUN</Text>
              <Text style={s.fieldResetSub}>Household · Personal · The Unit</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── CONTAINER PICKER ─────────────────────────────────────────────────── */}
      <Modal visible={showContainerPicker} transparent animationType="slide" onRequestClose={() => setShowContainerPicker(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: T.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ color: T.accent, fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 16 }}>WHAT ARE YOU DRINKING?</Text>
            {(() => {
              const waterIcons: Record<string, React.ReactNode> = {
                bottle:  <Droplets size={20} color={T.accent} />,
                cup:     <GlassWater size={20} color={T.accent} />,
                tumbler: <GlassWater size={20} color={T.accent} />,
                biggulp: <Droplets size={20} color={T.accent} />,
                pepsi:   <Flame size={20} color={T.muted} />,
                coffee:  <Coffee size={20} color={T.muted} />,
                alcohol: <Wine size={20} color={T.muted} />,
                other:   <GlassWater size={20} color={T.muted} />,
              };
              return (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    {(['bottle', 'cup', 'tumbler', 'biggulp'] as const).map(k => (
                      <TouchableOpacity key={k} style={{ width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: T.border, backgroundColor: T.bg }} onPress={() => logWater(k)}>
                        {waterIcons[k]}
                        <View>
                          <Text style={{ color: T.text, fontWeight: '600', fontSize: 13 }}>{CONTAINERS[k].label}</Text>
                          <Text style={{ color: T.muted, fontSize: 10 }}>{CONTAINERS[k].ml}ml</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ height: 1, backgroundColor: T.border, marginBottom: 12 }} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {(['pepsi', 'coffee', 'alcohol', 'other'] as const).map(k => (
                      <TouchableOpacity key={k} style={{ width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: T.border, backgroundColor: T.bg }} onPress={() => logWater(k)}>
                        {waterIcons[k]}
                        <View>
                          <Text style={{ color: T.text, fontWeight: '600', fontSize: 13 }}>{CONTAINERS[k].label}</Text>
                          <Text style={{ color: T.muted, fontSize: 10 }}>{CONTAINERS[k].ml}ml</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              );
            })()}
            <TouchableOpacity onPress={() => setShowContainerPicker(false)} style={{ alignItems: 'center', marginTop: 16, padding: 12 }}>
              <Text style={{ color: T.muted, fontSize: 12 }}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showBlitz && (
        <Blitz onClose={() => setShowBlitz(false)} />
      )}
      {showSupplyRun && (
        <ShoppingList onClose={() => setShowSupplyRun(false)} />
      )}
      {showPantry && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 16, right: 20, zIndex: 101, padding: 10 }}
            onPress={() => setShowPantry(false)}
          >
            <Text style={{ color: T.muted, fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
          <Pantry />
        </View>
      )}

      {/* ── INTEL OVERLAY ──────────────────────────────────────────────────── */}
      <Modal
        visible={showIntelOverlay}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowIntelOverlay(false)}
      >
        <KeyboardAvoidingView
          style={[s.intelOverlay, { backgroundColor: T.bg }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={s.intelOvHeader}>
              <Text style={s.intelOvTitle}>INTEL</Text>
              <TouchableOpacity onPress={() => setShowIntelOverlay(false)} style={s.intelOvClose}>
                <Text style={s.intelOvCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Mode selector */}
            <View style={s.intelModeRow}>
              {([
                { key: 'photo', icon: '📷', label: 'PHOTO' },
                { key: 'screenshot', icon: '🖼️', label: 'SCREEN' },
                { key: 'voice', icon: '🎤', label: 'VOICE' },
                { key: 'text', icon: '⌨️', label: 'TYPE' },
              ] as const).map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[s.intelModeBtn, intelMode === m.key && s.intelModeBtnActive]}
                  onPress={() => setIntelMode(m.key)}
                  activeOpacity={0.75}
                >
                  <Text style={s.intelModeIcon}>{m.icon}</Text>
                  <Text style={[s.intelModeLabel, intelMode === m.key && s.intelModeLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.intelOvContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Mode-specific action */}
              {(intelMode === 'photo' || intelMode === 'screenshot') && (
                <View style={s.intelImageBtns}>
                  <TouchableOpacity
                    style={s.intelImageBtn}
                    onPress={() => handlePickImage(intelMode === 'photo')}
                    activeOpacity={0.8}
                  >
                    <Text style={s.intelImageBtnIcon}>{intelMode === 'photo' ? '📷' : '🖼️'}</Text>
                    <Text style={s.intelImageBtnLabel}>
                      {intelMode === 'photo' ? 'TAKE PHOTO' : 'PICK FROM GALLERY'}
                    </Text>
                    <Text style={s.intelImageBtnSub}>
                      {intelMode === 'photo'
                        ? 'Grocery bags, receipts, product labels'
                        : 'Bank screenshots, order confirmations'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.intelImageBtn, s.intelImageBtnAlt]}
                    onPress={() => handlePickImage(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.intelImageBtnIcon}>📁</Text>
                    <Text style={s.intelImageBtnLabel}>GALLERY</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(intelMode === 'voice' || intelMode === 'text') && (
                <View style={s.intelTextSection}>
                  <Text style={s.intelTextHint}>
                    {intelMode === 'voice'
                      ? 'Tap the mic on your keyboard and speak. Or just type it.'
                      : 'Brain dump anything — groceries, expenses, reminders, tasks.'}
                  </Text>
                  <TextInput
                    ref={intelInputRef}
                    style={s.intelTextInput}
                    value={intelTextInput}
                    onChangeText={setIntelTextInput}
                    placeholder={intelMode === 'voice'
                      ? 'We need milk, I spent $40 at the mall, dentist Thursday...'
                      : 'Groceries, receipts, appointments, anything...'}
                    placeholderTextColor={T.muted}
                    multiline
                    autoFocus={intelMode === 'text'}
                    textAlignVertical="top"
                    autoCapitalize="sentences"
                  />
                  <TouchableOpacity
                    style={[s.intelAddBtn, !intelTextInput.trim() && s.intelAddBtnDisabled]}
                    onPress={addTextToQueue}
                    disabled={!intelTextInput.trim()}
                  >
                    <Text style={s.intelAddBtnText}>+ ADD TO QUEUE</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Queue */}
              {intelQueue.length > 0 && (
                <View style={s.intelQueueSection}>
                  <Text style={s.intelQueueTitle}>QUEUED ({intelQueue.length})</Text>
                  {intelQueue.map(item => (
                    <View key={item.id} style={s.intelQueueItem}>
                      <Text style={s.intelQueueItemIcon}>
                        {item.type === 'image' ? '📸' : '📝'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.intelQueueItemContent} numberOfLines={2}>
                          {item.type === 'image' ? 'Photo/screenshot' : item.content}
                        </Text>
                        {item.summary && (
                          <Text style={[s.intelQueueItemStatus, {
                            color: item.status === 'done' ? '#22c55e'
                              : item.status === 'failed' ? '#ef4444' : T.muted,
                          }]}>
                            {item.summary}
                          </Text>
                        )}
                      </View>
                      <View style={s.intelQueueStatusDot}>
                        {item.status === 'processing' ? (
                          <ActivityIndicator size="small" color={T.accent} />
                        ) : (
                          <Text style={{ fontSize: 14 }}>
                            {item.status === 'done' ? '✓' : item.status === 'failed' ? '✗' : '○'}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* FILED AND FORGOTTEN */}
            <View style={s.intelFooter}>
              <TouchableOpacity
                style={[
                  s.intelFiledBtn,
                  (intelFiling || (intelQueue.length === 0 && !intelTextInput.trim())) && s.intelFiledBtnDisabled,
                ]}
                onPress={handleFiledAndForgotten}
                disabled={intelFiling || (intelQueue.length === 0 && !intelTextInput.trim())}
                activeOpacity={0.85}
              >
                {intelFiling ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={s.intelFiledBtnText}>
                    {intelQueue.every(i => i.status === 'done' || i.status === 'failed')
                      ? '✓ CLOSE' : 'FILED AND FORGOTTEN'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
function makeStyles(T: ReturnType<typeof import('../themes').getTheme>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    scroll: { paddingHorizontal: 20 },
    header: {
      paddingTop: 20,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
      marginBottom: 24,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    clock: {
      fontSize: 52,
      fontWeight: '800',
      color: T.text,
      letterSpacing: -1,
    },
    themeBadge: {
      backgroundColor: T.accentBg,
      borderWidth: 1,
      borderColor: T.accent,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    themeBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: T.accent,
      letterSpacing: 2,
    },
    date: {
      fontSize: 12,
      color: T.muted,
      letterSpacing: 4,
      marginBottom: 12,
    },
    greeting: {
      fontSize: 22,
      fontWeight: '800',
      color: T.text,
      lineHeight: 28,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    callsign: {
      fontSize: 10,
      color: T.muted,
      letterSpacing: 3,
    },
    // Goal Card
    goalCard: {
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border + '30',
      borderRadius: 18,
      padding: 18,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    goalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    goalLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 2 },
    goalValue: { fontSize: 24, fontWeight: '900', color: T.accent, letterSpacing: 1 },
    rankBadge: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: T.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    rankBadgeText: { color: T.bg, fontWeight: '900', fontSize: 18 },
    progressSection: { marginTop: 4 },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    nextRankLabel: { fontSize: 11, fontWeight: '800', color: T.text, letterSpacing: 1 },
    progressText: { fontSize: 11, color: T.muted },
    progressBarBg: {
      height: 6,
      backgroundColor: T.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: T.accent,
      borderRadius: 3,
    },
    section: {
      marginBottom: 28,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: T.accent,
      letterSpacing: 4,
      marginBottom: 18,
      borderLeftWidth: 3,
      borderLeftColor: T.accent,
      paddingLeft: 10,
    },
    // Brain state
    brainGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    brainCard: {
      width: 150,
      height: 100,
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border + '40',
      borderRadius: 18,
      padding: 14,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    brainCardActive: {
      borderColor: T.accent,
      borderWidth: 2,
      backgroundColor: T.accent + '18',
      shadowColor: T.accent,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 5,
    },
    brainLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: T.muted,
      letterSpacing: 1.5,
      marginTop: 8,
      textAlign: 'center',
    },
    brainLabelActive: {
      color: T.accent,
    },
    brainDesc: {
      fontSize: 9,
      color: T.muted,
      lineHeight: 13,
      textAlign: 'center',
      marginTop: 4,
    },
    // Missions
    missionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: T.border,
      paddingVertical: 14,
      gap: 12,
    },
    missionNum: {
      fontSize: 13,
      fontWeight: '800',
      color: T.accent,
      width: 16,
      textAlign: 'center',
    },
    missionTextWrap: { flex: 1 },
    missionText: {
      fontSize: 14,
      color: T.text,
      fontWeight: '500',
    },
    missionPlaceholder: {
      fontSize: 12,
      color: T.muted,
      letterSpacing: 1,
    },
    missionInput: {
      flex: 1,
      fontSize: 14,
      color: T.text,
      paddingVertical: 0,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 40,
      paddingVertical: 10,
      gap: 12,
    },
    stepCheck: {
      width: 18, height: 18, borderRadius: 4,
      borderWidth: 1.5, borderColor: T.muted,
      alignItems: 'center', justifyContent: 'center',
    },
    stepCheckText: { color: T.bg, fontSize: 12, fontWeight: '900' },
    stepText: {
      fontSize: 13, fontWeight: '500',
    },
    // Signals
    signalCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border + '30',
      borderRadius: 18,
      padding: 14,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    signalContent: { flex: 1 },
    signalFrom: {
      fontSize: 10,
      fontWeight: '800',
      color: T.accent,
      letterSpacing: 2,
      marginBottom: 4,
    },
    signalMsg: {
      fontSize: 14,
      color: T.text,
    },
    dismissBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: T.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: T.accent,
    },
    dismissText: {
      color: T.accent,
      fontSize: 16,
      fontWeight: '800',
    },
    // Allied Forces
    allyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border + '30',
      borderRadius: 18,
      padding: 16,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    allyDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: T.green,
    },
    allyName: {
      fontSize: 14,
      fontWeight: '800',
      color: T.text,
      letterSpacing: 1,
    },
    allyTheme: {
      fontSize: 10,
      color: T.muted,
      letterSpacing: 1.5,
      marginTop: 2,
    },
    allyStatus: {
      fontSize: 9,
      fontWeight: '800',
      color: T.green,
      letterSpacing: 2,
    },
    houseName: {
      fontSize: 11,
      color: T.muted,
      textAlign: 'center',
      marginTop: 10,
      letterSpacing: 1,
    },
    backupAvailable: {
      marginTop: 10,
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.accent,
      borderRadius: 10,
      padding: 12,
    },
    backupText: {
      color: T.accent,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
    },
    // RECON
    reconStrip:      { borderWidth: 1, borderRadius: 18, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
    reconHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    reconSubLabel:   { fontSize: 9, letterSpacing: 1 },
    reconRow:        { flexDirection: 'row', gap: 16 },
    reconStat:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reconEmoji:      { fontSize: 13 },
    reconVal:        { fontSize: 13, fontWeight: '700' },
    reconDetail:     { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 6, gap: 10 },
    reconDetailRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reconDetailLabel:{ fontSize: 9, fontWeight: '700', letterSpacing: 2 },
    reconDetailVal:  { fontSize: 12, fontWeight: '700' },

    // Field Reset
    fieldResetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border + '30',
      borderRadius: 18,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    fieldResetIcon: { fontSize: 28 },
    fieldResetLabel: {
      color: T.text,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 2,
    },
    fieldResetSub: {
      color: T.muted,
      fontSize: 12,
      marginTop: 2,
    },
    calEventTime: {
      fontSize: 12, color: T.accent, fontWeight: '700', letterSpacing: 0.5, minWidth: 80,
    },
    calEventTitle: {
      flex: 1, fontSize: 14, color: T.text,
    },
    muted: {
      fontSize: 13,
      color: T.muted,
    },
    // Quick access
    quickRow: {
      flexDirection: 'row',
      gap: 10,
    },
    quickBtn: {
      flex: 1,
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    quickIcon: {
      fontSize: 22,
      marginBottom: 6,
    },
    quickLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: T.muted,
      letterSpacing: 1.5,
    },
    // Water tracker
    waterCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderRadius: 12, padding: 14,
    },
    waterBtn: {
      borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    },

    // Intel button (compact)
    intelBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: T.card, borderWidth: 1, borderColor: T.border + '30',
      borderRadius: 18, paddingVertical: 18, paddingHorizontal: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    intelLabel: { fontSize: 14, fontWeight: '900', color: T.accent, letterSpacing: 2 },
    intelSub: { fontSize: 11, color: T.muted, marginTop: 2 },
    intelArrow: { fontSize: 22, color: T.accent, fontWeight: '300' },

    // Intel Overlay
    intelOverlay: { flex: 1 },
    intelOvHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: T.border,
    },
    intelOvTitle: { fontSize: 22, fontWeight: '900', color: T.accent, letterSpacing: 3 },
    intelOvClose: { padding: 8 },
    intelOvCloseText: { fontSize: 20, color: T.muted },
    intelOvContent: { padding: 20, gap: 20 },

    intelModeRow: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
      gap: 8, borderBottomWidth: 1, borderBottomColor: T.border,
    },
    intelModeBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 12,
      backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 10,
    },
    intelModeBtnActive: { borderColor: T.accent, backgroundColor: T.accentBg },
    intelModeIcon: { fontSize: 20, marginBottom: 4 },
    intelModeLabel: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 1 },
    intelModeLabelActive: { color: T.accent },

    intelImageBtns: { gap: 10 },
    intelImageBtn: {
      backgroundColor: T.card, borderWidth: 1, borderColor: T.accent,
      borderRadius: 14, padding: 20, alignItems: 'center', gap: 8,
    },
    intelImageBtnAlt: { borderColor: T.border },
    intelImageBtnIcon: { fontSize: 36 },
    intelImageBtnLabel: { fontSize: 13, fontWeight: '900', color: T.accent, letterSpacing: 2 },
    intelImageBtnSub: { fontSize: 11, color: T.muted, textAlign: 'center' },

    intelTextSection: { gap: 12 },
    intelTextHint: { fontSize: 12, color: T.muted, lineHeight: 18 },
    intelTextInput: {
      backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
      borderRadius: 12, padding: 16, color: T.text, fontSize: 15,
      minHeight: 120, textAlignVertical: 'top',
    },
    intelAddBtn: {
      backgroundColor: T.accent, borderRadius: 10,
      paddingVertical: 12, alignItems: 'center',
    },
    intelAddBtnDisabled: { opacity: 0.35 },
    intelAddBtnText: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 2 },

    intelQueueSection: {
      backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
      borderRadius: 12, overflow: 'hidden',
    },
    intelQueueTitle: {
      fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 2,
      padding: 12, borderBottomWidth: 1, borderBottomColor: T.border,
    },
    intelQueueItem: {
      flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 10,
      borderBottomWidth: 1, borderBottomColor: T.border,
    },
    intelQueueItemIcon: { fontSize: 18, marginTop: 2 },
    intelQueueItemContent: { fontSize: 13, color: T.text, lineHeight: 18 },
    intelQueueItemStatus: { fontSize: 11, marginTop: 4 },
    intelQueueStatusDot: { width: 24, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

    intelFooter: {
      padding: 16, borderTopWidth: 1, borderTopColor: T.border,
    },
    intelFiledBtn: {
      backgroundColor: T.accent, borderRadius: 14,
      paddingVertical: 18, alignItems: 'center',
    },
    intelFiledBtnDisabled: { opacity: 0.3 },
    intelFiledBtnText: {
      fontSize: 15, fontWeight: '900', color: '#000', letterSpacing: 3,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // TARGET ACQUIRED card (inside goalCard)
    targetCard: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: T.border,
    },
    targetLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: T.green,
      letterSpacing: 3,
      marginBottom: 6,
    },
    targetText: {
      fontSize: 15,
      fontWeight: '700',
      color: T.text,
      lineHeight: 20,
    },

    // FUEL TARGET card
    fuelCard: {
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border + '30',
      borderRadius: 18,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    fuelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fuelMetric: {
      fontSize: 13,
      color: T.muted,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    fuelValue: {
      fontSize: 15,
      fontWeight: '800',
      color: T.text,
      letterSpacing: 0.5,
    },
    fuelCheckedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },

    // Nutrition check-in buttons
    checkInRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    checkInBtn: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1,
    },
    healthPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: T.card,
      borderWidth: 1,
      borderColor: T.border + '40',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    healthValue: {
      fontSize: 13,
      fontWeight: '700',
      color: T.text,
      letterSpacing: 0.5,
    },
    healthLabel: {
      fontSize: 9,
      color: T.muted,
      letterSpacing: 1.5,
      fontWeight: '600',
    },
  });
}
