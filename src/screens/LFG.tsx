import React from 'react';
import { View } from 'react-native';
import { useUser } from '../context/UserContext';
import GymScreen from './GymScreen';
import GymScreenD from './GymScreenD';

export default function LFG() {
  const { user } = useUser();
  const isFormTheme = user?.theme === 'form';

  return (
    <View style={{ flex: 1 }}>
      {isFormTheme ? <GymScreenD /> : <GymScreen />}
    </View>
  );
}

