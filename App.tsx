import React, { useState, useEffect } from 'react';
import { Linking, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { resolveClarification, checkAndSendPendingClarifications } from './src/lib/downtimeDetector';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { UserProvider, useUser } from './src/context/UserContext';
import AuthScreen from './src/screens/AuthScreen';
import WarRoom from './src/screens/WarRoom';
import WorkdayRhythm from './src/screens/WorkdayRhythm';
import BudgetTracker from './src/screens/BudgetTracker';
import FitnessScreen from './src/screens/FitnessScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SignalButton from './src/components/SignalButton';
import HouseholdSetupScreen from './src/screens/HouseholdSetupScreen';
import Grounding from './src/screens/Grounding';
import FamilyFuel from './src/screens/FamilyFuel';
import HomeBase from './src/screens/HomeBase';
import KidsZone from './src/screens/KidsZone';
import { Wind, Flame, Home, Users } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

function parseJoinLink(url: string): string | null {
  try {
    const match = url.match(/tether:\/\/join\?house=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function MainApp() {
  const { user, loading, themeTokens } = useUser();
  const [householdSkipped, setHouseholdSkipped] = useState(false);
  const [deepLinkHouse, setDeepLinkHouse] = useState<string | null>(null);

  // Notification action responses (e.g. clarify transfer buttons)
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const { actionIdentifier, notification } = response;
      const data = notification.request.content.data as { clarificationId?: string; type?: string };
      if (data?.type === 'clarify_transfer' && data.clarificationId) {
        resolveClarification(data.clarificationId, actionIdentifier).catch(err => {
          console.error('[App] Failed to resolve clarification:', err);
        });
      }
    });
    return () => sub.remove();
  }, []);

  // Foreground downtime check — when app comes to foreground, check for pending clarifications
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && user?.id) {
        checkAndSendPendingClarifications(user.id);
      }
    });
    return () => sub.remove();
  }, [user?.id]);

  useEffect(() => {
    // Check if app was opened via deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        const house = parseJoinLink(url);
        if (house) setDeepLinkHouse(house);
      }
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('spotify')) {
        console.log('[Spotify] callback received:', url);
      }
      const house = parseJoinLink(url);
      if (house) setDeepLinkHouse(house);
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator size="large" color="#c9a84c" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Deep link join: show setup screen in join mode regardless of seen/skipped state
  if (deepLinkHouse && !user.house_name) {
    return <HouseholdSetupScreen onSkip={() => setDeepLinkHouse(null)} prefillJoin={deepLinkHouse} />;
  }

  // Show setup only on first-ever login (before they've seen it) — not after leaving a household
  if (!user.house_name && !user.household_setup_seen && !householdSkipped) {
    return <HouseholdSetupScreen onSkip={() => setHouseholdSkipped(true)} />;
  }

  const theme = user.theme ?? 'iron';

  const TAB_ICONS: Record<string, {
    warroom: string; work: string; fitness: string; armory: string; settings: string;
  }> = {
    shadow:     { warroom: '🎯', work: '⏱',  fitness: '🔥',  armory: '💰', settings: '⚙️' },
    iron:       { warroom: '🎯', work: '💻',  fitness: '⚔️',  armory: '💰', settings: '⚙️' },
    copper:     { warroom: '🎯', work: '💻',  fitness: '⚔️',  armory: '💰', settings: '⚙️' },
    hearth:     { warroom: '🎯', work: '💻',  fitness: '🔥',  armory: '💰', settings: '⚙️' },
    spartan:    { warroom: '🛡️', work: '💻',  fitness: '⚔️',  armory: '💰', settings: '⚙️' },
    centurion:  { warroom: '🛡️', work: '💻',  fitness: '⚔️',  armory: '💰', settings: '⚙️' },
    viking:     { warroom: '🛡️', work: '💻',  fitness: '⚔️',  armory: '💰', settings: '⚙️' },
    shogun:     { warroom: '⚔️', work: '📜',  fitness: '⚔️',  armory: '🪙', settings: '⚙️' },
    dynasty:    { warroom: '⚔️', work: '📜',  fitness: '⚔️',  armory: '🪙', settings: '⚙️' },
    templar:    { warroom: '🛡️', work: '💻',  fitness: '⚔️',  armory: '💰', settings: '⚙️' },
    sanctum:    { warroom: '🛡️', work: '💻',  fitness: '⚔️',  armory: '💰', settings: '⚙️' },
    pharaoh:    { warroom: '☀️', work: '💻',  fitness: '⚔️',  armory: '💰', settings: '⚙️' },
    oasis:      { warroom: '☀️', work: '💻',  fitness: '🌿',  armory: '💰', settings: '⚙️' },
    ronin:      { warroom: '⛩️', work: '📜',  fitness: '⛩️',  armory: '🪙', settings: '☯️' },
    cedar:      { warroom: '🌲', work: '🌱',  fitness: '🌿',  armory: '🌾', settings: '🍃' },
    dragonfire: { warroom: '🐉', work: '🖥️',  fitness: '🔥',  armory: '💎', settings: '🔧' },
    ember:      { warroom: '🔥', work: '💻',  fitness: '🔥',  armory: '💰', settings: '⚙️' },
    phoenix:    { warroom: '🔥', work: '💻',  fitness: '🔥',  armory: '💰', settings: '⚙️' },
    arcane:     { warroom: '🔮', work: '📖',  fitness: '🔮',  armory: '📦', settings: '📜' },
    parchment:  { warroom: '🔮', work: '📖',  fitness: '🔮',  armory: '📦', settings: '📜' },
    forge:      { warroom: '🏰', work: '⚒️',  fitness: '🔥',  armory: '⚙️', settings: '🔑' },
    void:       { warroom: '🛸', work: '🖥️',  fitness: '🌌',  armory: '💎', settings: '🔧' },
    dusk:       { warroom: '🌙', work: '🖥️',  fitness: '🌌',  armory: '💎', settings: '🔧' },
    kraken:     { warroom: '⚓', work: '🖥️',  fitness: '⚔️',  armory: '💎', settings: '🔧' },
    leviathan:  { warroom: '⚓', work: '🖥️',  fitness: '⚔️',  armory: '💎', settings: '🔧' },
    wraith:     { warroom: '🌙', work: '🖥️',  fitness: '⚔️',  armory: '💎', settings: '🔧' },
    solstice:   { warroom: '🌙', work: '💻',  fitness: '🔥',  armory: '💰', settings: '⚙️' },
    druid:      { warroom: '🌲', work: '🌱',  fitness: '🌿',  armory: '🌾', settings: '🍃' },
    grove:      { warroom: '🌲', work: '🌱',  fitness: '🌿',  armory: '🌾', settings: '🍃' },
    verdant:    { warroom: '🌿', work: '🌱',  fitness: '🌿',  armory: '🌾', settings: '🍃' },
    bloom:      { warroom: '🌿', work: '🌱',  fitness: '🌿',  armory: '🌾', settings: '🍃' },
    nebula:     { warroom: '🔭', work: '🖥️',  fitness: '🌌',  armory: '💎', settings: '🔧' },
    aurora:     { warroom: '🔭', work: '🖥️',  fitness: '🌌',  armory: '💎', settings: '🔧' },
    slate:      { warroom: '🎯', work: '💻',  fitness: '⚔️',  armory: '💰', settings: '⚙️' },
    form:       { warroom: '🌸', work: '✨',  fitness: '🌸',  armory: '💎', settings: '🌺' },
    valkyrie:   { warroom: '⚡', work: '🗡️',  fitness: '⚡',  armory: '👑', settings: '🛡️' },
    wendigo:    { warroom: '🌲', work: '🌱',  fitness: '🌿',  armory: '🌾', settings: '🍃' },
  };

  const TAB_LABELS: Record<string, {
    warroom: string; work: string; fitness: string; armory: string; settings: string; family: string;
  }> = {
    shadow:     { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'TRAINING', armory: 'ARMORY',  settings: 'COMMAND',     family: 'UNIT'   },
    iron:       { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'IRON',     armory: 'ARMORY',  settings: 'SETTINGS',    family: 'UNIT'   },
    copper:     { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    hearth:     { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    spartan:    { warroom: 'THE AGORA',      work: 'WORK', fitness: 'IRON',     armory: 'ARMORY',  settings: 'THE WALL',    family: 'UNIT'   },
    centurion:  { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    viking:     { warroom: 'THE LONGHOUSE',  work: 'WORK', fitness: 'TRAINING', armory: 'ARMORY',  settings: 'RUNES',       family: 'UNIT'   },
    shogun:     { warroom: 'WAR COUNCIL',    work: 'WORK', fitness: 'DOJO',     armory: 'ARMORY',  settings: 'COMMAND',     family: 'UNIT'   },
    dynasty:    { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    templar:    { warroom: 'THE ORDER',      work: 'WORK', fitness: 'IRON',     armory: 'ARMORY',  settings: 'THE VAULT',   family: 'UNIT'   },
    sanctum:    { warroom: 'THE SANCTUARY',  work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'PEACE',       family: 'FAMILY' },
    pharaoh:    { warroom: 'THE THRONE',     work: 'WORK', fitness: 'TRAINING', armory: 'ARMORY',  settings: 'THE VAULT',   family: 'UNIT'   },
    oasis:      { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    ronin:      { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'RONIN',    armory: 'ARMORY',  settings: 'SETTINGS',    family: 'HOUSE'  },
    cedar:      { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    dragonfire: { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'EMBER',    armory: 'ARMORY',  settings: 'SETTINGS',    family: 'FAMILY' },
    ember:      { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    phoenix:    { warroom: 'THE RISE',       work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'THE FLAME',   family: 'FAMILY' },
    arcane:     { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'ARCANE',   armory: 'ARMORY',  settings: 'SETTINGS',    family: 'FAMILY' },
    parchment:  { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    forge:      { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'FORGE',    armory: 'ARMORY',  settings: 'SETTINGS',    family: 'FAMILY' },
    void:       { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'VOID',     armory: 'ARMORY',  settings: 'SETTINGS',    family: 'CREW'   },
    dusk:       { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    kraken:     { warroom: 'THE DEEP',       work: 'WORK', fitness: 'TRAINING', armory: 'ARMORY',  settings: 'DEPTH CONTROL', family: 'CREW' },
    leviathan:  { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    wraith:     { warroom: 'THE BETWEEN',    work: 'WORK', fitness: 'TRAINING', armory: 'ARMORY',  settings: 'UNSEEN',      family: 'CREW'   },
    solstice:   { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    druid:      { warroom: 'THE GROVE',      work: 'WORK', fitness: 'TRAINING', armory: 'ARMORY',  settings: 'THE STONES',  family: 'CLAN'   },
    grove:      { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    verdant:    { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'VERDANT',  armory: 'ARMORY',  settings: 'SETTINGS',    family: 'FAMILY' },
    bloom:      { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    nebula:     { warroom: 'COMMAND CENTER', work: 'WORK', fitness: 'TRAINING', armory: 'ARMORY',  settings: 'SYSTEMS',     family: 'CREW'   },
    aurora:     { warroom: 'HOME',           work: 'WORK', fitness: 'MOVEMENT', armory: 'BUDGET',  settings: 'SETTINGS',    family: 'FAMILY' },
    slate:      { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'TRAINING', armory: 'ARMORY',  settings: 'COMMAND',     family: 'CREW'   },
    form:       { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'FORM',     armory: 'ARMORY',  settings: 'SETTINGS',    family: 'FAMILY' },
    valkyrie:   { warroom: 'WAR ROOM',       work: 'WORK', fitness: 'VALKYRIE', armory: 'ARMORY',  settings: 'SETTINGS',    family: 'CLAN'   },
    wendigo:    { warroom: 'THE DARK',       work: 'WORK', fitness: 'TRAINING', armory: 'ARMORY',  settings: 'THE DEEP',    family: 'CLAN'   },
  };

  const icons = TAB_ICONS[theme] ?? TAB_ICONS.iron;
  const labels = TAB_LABELS[theme] ?? TAB_LABELS.iron;

  return (
    <View style={{ flex: 1, backgroundColor: themeTokens.bg }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: themeTokens.bg,
            borderTopColor: themeTokens.border,
          },
          tabBarActiveTintColor: themeTokens.accent,
          tabBarInactiveTintColor: themeTokens.muted,
        }}
      >
        <Tab.Screen
          name="WarRoom"
          component={WarRoom}
          options={{
            tabBarLabel: labels.warroom,
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{icons.warroom}</Text>,
          }}
        />
        <Tab.Screen
          name="Workday"
          component={WorkdayRhythm}
          options={{
            tabBarLabel: labels.work,
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{icons.work}</Text>,
          }}
        />
        <Tab.Screen
          name="Ground"
          component={Grounding}
          options={{
            tabBarLabel: 'GROUND',
            tabBarIcon: ({ color }) => <Wind size={20} color={color} />,
          }}
        />
        <Tab.Screen
          name="Family"
          component={KidsZone}
          options={{
            tabBarLabel: labels.family ?? 'FAMILY',
            tabBarIcon: ({ color }) => <Users size={20} color={color} />,
          }}
        />
        <Tab.Screen
          name="Fuel"
          component={FamilyFuel}
          options={{
            tabBarLabel: 'FUEL',
            tabBarIcon: ({ color }) => <Flame size={20} color={color} />,
          }}
        />
        <Tab.Screen
          name="Fitness"
          component={FitnessScreen}
          options={{
            tabBarLabel: labels.fitness,
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{icons.fitness}</Text>,
          }}
        />
        <Tab.Screen
          name="Budget"
          component={BudgetTracker}
          options={{
            tabBarLabel: labels.armory,
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{icons.armory}</Text>,
          }}
        />
        <Tab.Screen
          name="Base"
          component={HomeBase}
          options={{
            tabBarLabel: 'BASE',
            tabBarIcon: ({ color }) => <Home size={20} color={color} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: labels.settings,
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{icons.settings}</Text>,
          }}
        />
      </Tab.Navigator>
      <SignalButton />
    </View>
  );
}

export default function App() {
  return (
    <UserProvider>
      <NavigationContainer>
        <MainApp />
      </NavigationContainer>
    </UserProvider>
  );
}
