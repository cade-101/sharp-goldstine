import React from 'react';
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

const Tab = createBottomTabNavigator();

function MainApp() {
  const { user, loading, themeTokens } = useUser();

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

  if (!user.house_name) {
    return <HouseholdSetupScreen />;
  }

  const fitnessLabel = user.fitnessLabel ?? themeTokens.name;

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
            tabBarLabel: 'WAR ROOM',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎯</Text>,
          }}
        />
        <Tab.Screen
          name="Workday"
          component={WorkdayRhythm}
          options={{
            tabBarLabel: 'WORK',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⏱</Text>,
          }}
        />
        <Tab.Screen
          name="Fitness"
          component={FitnessScreen}
          options={{
            tabBarLabel: fitnessLabel,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 18 }}>{themeTokens.mode === 'light' ? '🌸' : '💪'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Budget"
          component={BudgetTracker}
          options={{
            tabBarLabel: 'ARMORY',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💰</Text>,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'SETTINGS',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>,
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
