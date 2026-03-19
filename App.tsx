import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { UserProvider, useUser } from './src/context/UserContext';
import AuthScreen from './src/screens/AuthScreen';
import WorkdayRhythm from './src/screens/WorkdayRhythm';
import BudgetTracker from './src/screens/BudgetTracker';
import FitnessScreen from './src/screens/FitnessScreen';

const Tab = createBottomTabNavigator();

function MainApp() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const fitnessLabel = user.fitnessLabel ?? 'IRON';

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Workday"
        component={WorkdayRhythm}
        options={{ tabBarLabel: '🎯' }}
      />
      <Tab.Screen
        name="Fitness"
        component={FitnessScreen}
        options={{ tabBarLabel: fitnessLabel }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetTracker}
        options={{ tabBarLabel: '💰' }}
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