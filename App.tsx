import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { UserProvider, useUser } from './src/context/UserContext';
import AuthScreen from './src/screens/AuthScreen';
import WorkdayRhythm from './src/screens/WorkdayRhythm';
import BudgetTracker from './src/screens/BudgetTracker';
import FitnessScreen from './src/screens/FitnessScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function MainApp() {
  const { user, loading } = useUser();

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

  const isForm = user.theme === 'form';
  const fitnessLabel = user.fitnessLabel ?? (isForm ? 'FORM' : 'IRON');

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isForm ? '#fdf6f0' : '#0a0a0a',
          borderTopColor: isForm ? '#f0d8cc' : '#2a2a2a',
        },
        tabBarActiveTintColor: isForm ? '#e8748a' : '#c9a84c',
        tabBarInactiveTintColor: isForm ? '#b8967e' : '#666666',
      }}
    >
      <Tab.Screen
        name="Workday"
        component={WorkdayRhythm}
        options={{
          tabBarLabel: 'WORK',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎯</Text>,
        }}
      />
      <Tab.Screen
        name="Fitness"
        component={FitnessScreen}
        options={{
          tabBarLabel: fitnessLabel,
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>{isForm ? '🌸' : '💪'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetTracker}
        options={{
          tabBarLabel: 'BUDGET',
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
