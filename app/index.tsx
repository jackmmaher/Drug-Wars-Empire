import React from 'react';
import { useGameStore } from '../src/stores/gameStore';
import { TitleScreen } from '../src/components/TitleScreen';
import { GameScreen } from '../src/components/GameScreen';
import { CopScreen } from '../src/components/CopScreen';
import { TradeModal } from '../src/components/TradeModal';
import { EndScreen } from '../src/components/EndScreen';
import { AdInterstitial } from '../src/components/AdInterstitial';
import { LevelIntroScreen } from '../src/components/LevelIntroScreen';
import { LevelCompleteScreen } from '../src/components/LevelCompleteScreen';

export default function GameRouter() {
  const phase = useGameStore(s => s.phase);
  const activeTrade = useGameStore(s => s.activeTrade);
  const showingAd = useGameStore(s => s.showingAd);
  const dismissAd = useGameStore(s => s.dismissAd);

  // Travel interstitial ad (every Nth travel, frequency varies by level)
  if (showingAd) {
    return <AdInterstitial onClose={dismissAd} />;
  }

  // Trade modal overlays the game
  if (activeTrade && phase === 'playing') {
    return <TradeModal />;
  }

  switch (phase) {
    case 'title':
      return <TitleScreen />;
    case 'levelIntro':
      return <LevelIntroScreen />;
    case 'levelComplete':
      return <LevelCompleteScreen />;
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
