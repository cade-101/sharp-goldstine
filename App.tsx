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
import { Wind, Flame, Home } from 'lucide-react-native';

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
    iron:       { warroom: '🎯', work: '💻', fitness: '⚔️',  armory: '💰', settings: '⚙️' },
    ronin:      { warroom: '⛩️', work: '📜', fitness: '⛩️',  armory: '🪙', settings: '☯️' },
    valkyrie:   { warroom: '⚡', work: '🗡️', fitness: '⚡',  armory: '👑', settings: '🛡️' },
    forge:      { warroom: '🏰', work: '⚒️', fitness: '🔥',  armory: '⚙️', settings: '🔑' },
    arcane:     { warroom: '🔮', work: '📖', fitness: '🔮',  armory: '📦', settings: '📜' },
    dragonfire: { warroom: '🐉', work: '🖥️', fitness: '🔥',  armory: '💎', settings: '🔧' },
    void:       { warroom: '🛸', work: '🖥️', fitness: '🌌',  armory: '💎', settings: '🔧' },
    verdant:    { warroom: '🌿', work: '🌱', fitness: '🌿',  armory: '🌾', settings: '🍃' },
    form:       { warroom: '🌸', work: '✨', fitness: '🌸',  armory: '💎', settings: '🌺' },
    shadow:     { warroom: '🎯', work: '⏱', fitness: '🔥',  armory: '💰', settings: '⚙️' },
  };

  const TAB_LABELS: Record<string, {
    warroom: string; work: string; fitness: string; armory: string; settings: string;
  }> = {
    iron:       { warroom: 'WAR ROOM', work: 'WORK', fitness: 'IRON',     armory: 'ARMORY', settings: 'SETTINGS' },
    ronin:      { warroom: 'WAR ROOM', work: 'WORK', fitness: 'RONIN',    armory: 'ARMORY', settings: 'SETTINGS' },
    valkyrie:   { warroom: 'WAR ROOM', work: 'WORK', fitness: 'VALKYRIE', armory: 'ARMORY', settings: 'SETTINGS' },
    forge:      { warroom: 'WAR ROOM', work: 'WORK', fitness: 'FORGE',    armory: 'ARMORY', settings: 'SETTINGS' },
    arcane:     { warroom: 'WAR ROOM', work: 'WORK', fitness: 'ARCANE',   armory: 'ARMORY', settings: 'SETTINGS' },
    dragonfire: { warroom: 'WAR ROOM', work: 'WORK', fitness: 'EMBER',    armory: 'ARMORY', settings: 'SETTINGS' },
    void:       { warroom: 'WAR ROOM', work: 'WORK', fitness: 'VOID',     armory: 'ARMORY', settings: 'SETTINGS' },
    verdant:    { warroom: 'WAR ROOM', work: 'WORK', fitness: 'VERDANT',  armory: 'ARMORY', settings: 'SETTINGS' },
    form:       { warroom: 'WAR ROOM', work: 'WORK', fitness: 'FORM',     armory: 'ARMORY', settings: 'SETTINGS' },
    shadow:     { warroom: 'WAR ROOM', work: 'WORK', fitness: 'TRAINING', armory: 'ARMORY', settings: 'COMMAND' },
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
