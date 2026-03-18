import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';
import { UserProvider, useUser } from './src/context/UserContext';
import AuthScreen from './src/screens/AuthScreen';
import WorkdayRhythm from './src/screens/WorkdayRhythm';
import GymScreen from './src/screens/GymScreen';
import GymScreenD from './src/screens/GymScreenD';
import BattleMode from './src/screens/BattleMode';
import BudgetTracker from './src/screens/BudgetTracker';
import BeastMode from './src/screens/BeastMode';
import QuickHits from './src/screens/QuickHits';

const Tab = createBottomTabNavigator();

function MainApp() {
  const { user, loading } = useUser();

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#c9a84c" />
    </View>
  );

  if (!user) return <AuthScreen />;

  const isD = user.theme === 'form';

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#111111', borderTopColor: '#2a2a2a' },
          tabBarActiveTintColor: isD ? '#e8748a' : '#c9a84c',
          tabBarInactiveTintColor: '#666666',
          tabBarLabelStyle: { fontSize: 9 },
        }}
      >
        <Tab.Screen name="Work" component={WorkdayRhythm} options={{ tabBarIcon: () => <Text>🎯</Text> }} />
        <Tab.Screen name="Fitness" component={isD ? GymScreenD : GymScreen} options={{ tabBarIcon: () => <Text>{isD ? '🌸' : '💪'}</Text> }} />
        <Tab.Screen name="Hits" component={QuickHits} options={{ tabBarIcon: () => <Text>💥</Text> }} />
        <Tab.Screen name="Battle" component={BattleMode} options={{ tabBarIcon: () => <Text>⚔️</Text> }} />
        <Tab.Screen name="Budget" component={BudgetTracker} options={{ tabBarIcon: () => <Text>💰</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <UserProvider>
      <MainApp />
    </UserProvider>
  );
}