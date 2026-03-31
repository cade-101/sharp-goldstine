import React from 'react';
import WorkdayRhythm from './src/screens/WorkdayRhythm';
import QuickHits from './src/screens/QuickHits';

<Tab.Screen name="Hits" component={QuickHits} options={{ tabBarIcon: () => <Text>💥</Text> }} />

export default function App() {
  return <WorkdayRhythm />;
}