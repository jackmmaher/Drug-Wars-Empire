import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useGameStore } from '../src/stores/gameStore';
import { TitleScreen } from '../src/components/TitleScreen';
import { GameScreen } from '../src/components/GameScreen';
import { CopScreen } from '../src/components/CopScreen';
import { TradeModal } from '../src/components/TradeModal';
import { EndScreen } from '../src/components/EndScreen';

export default function GameRouter() {
  const phase = useGameStore(s => s.phase);
  const activeTrade = useGameStore(s => s.activeTrade);

  // Trade modal overlays the game
  if (activeTrade && phase === 'playing') {
    return <TradeModal />;
  }

  switch (phase) {
    case 'title':
      return <TitleScreen />;
    case 'playing':
      return <GameScreen />;
    case 'cop':
      return <CopScreen />;
    case 'win':
    case 'end':
      return <EndScreen />;
    default:
      return <TitleScreen />;
  }
}
