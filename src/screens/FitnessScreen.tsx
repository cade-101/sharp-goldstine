import React, { useState } from 'react';
import { View, Button } from 'react-native';
import LFG from './LFG';
import BeastMode from './BeastMode';
import QuickHits from './QuickHits';
import BattleMode from './BattleMode';

type FitnessMode = 'lfg' | 'beast' | 'quick' | 'battle';

export default function FitnessScreen() {
  const [mode, setMode] = useState<FitnessMode>('lfg');

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-around',
          paddingVertical: 8,
        }}
      >
        <Button title="LFG" onPress={() => setMode('lfg')} />
        <Button title="Beast" onPress={() => setMode('beast')} />
        <Button title="Quick" onPress={() => setMode('quick')} />
        <Button title="Battle" onPress={() => setMode('battle')} />
      </View>

      {mode === 'lfg' && <LFG />}
      {mode === 'beast' && <BeastMode />}
      {mode === 'quick' && <QuickHits />}
      {mode === 'battle' && <BattleMode />}
    </View>
  );
}
