import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useGameStore } from '../stores/gameStore';
import { getRegionForLocation } from '../constants/game';
import type { TabId } from '../types/game';
import { GameHeader } from './GameHeader';
import { MarketTab } from './MarketTab';
import { MapTab } from './MapTab';
import { IntelTab } from './IntelTab';

const TABS: { id: TabId; label: string }[] = [
  { id: 'market', label: '\uD83D\uDC8A Market' },
  { id: 'map', label: '\u2708\uFE0F Travel' },
  { id: 'intel', label: '\uD83D\uDD0D Intel' },
];

const TOOLTIP_MESSAGES: Record<string, string> = {
  welcome: 'Buy drugs cheap. Travel somewhere they\'re expensive. Sell high. Pay off your debt in 30 days.',
  heat: 'Your heat is rising. It attracts cops. Travel to cool down.',
  bank: 'Bank stores cash safely at 0.8%/day. Your shark debt grows 4%/day -- pay it fast.',
  international: 'Fly international for cheaper drugs. Watch for customs -- they\'ll search your cargo.',
  gang: 'Gangs control territory. Build relations through trading on their turf and doing missions.',
};

export function GameScreen() {
  const { colors } = useTheme();
  const activeTab = useGameStore(s => s.activeTab);
  const setTab = useGameStore(s => s.setTab);
  const notifications = useGameStore(s => s.notifications);
  const activeTooltip = useGameStore(s => s.activeTooltip);
  const showTooltip = useGameStore(s => s.showTooltip);
  const dismissTooltip = useGameStore(s => s.dismissTooltip);
  const player = useGameStore(s => s.player);
  const tooltipsSeen = useGameStore(s => s.tooltipsSeen);
  const campaign = useGameStore(s => s.campaign);
  const phase = useGameStore(s => s.phase);
  const subPanel = useGameStore(s => s.subPanel);

  // Progressive tooltip triggers
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'levelIntro') return;

    // Welcome tooltip on first game start
    if (phase === 'playing' && !tooltipsSeen.welcome) {
      showTooltip('welcome');
      return;
    }

    // Heat tooltip when heat > 15 for the first time
    if (player.heat > 15 && !tooltipsSeen.heat) {
      showTooltip('heat');
      return;
    }

    // Gang tooltip at Level 2 start
    if (campaign.level === 2 && !tooltipsSeen.gang) {
      showTooltip('gang');
      return;
    }
  }, [phase, player.heat, player.day, campaign.level]);

  // Bank tooltip when player opens bank/shark panel
  useEffect(() => {
    if ((subPanel === 'bank' || subPanel === 'shark') && !tooltipsSeen.bank) {
      showTooltip('bank');
    }
  }, [subPanel]);

  // International tooltip when player visits a non-NYC region
  useEffect(() => {
    if (phase !== 'playing') return;
    const region = getRegionForLocation(player.location);
    if (region && region.id !== 'nyc' && !tooltipsSeen.international) {
      showTooltip('international');
    }
  }, [player.location, phase]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Notifications */}
      <View style={{ position: 'absolute', top: 50, right: 12, zIndex: 999, gap: 6 }} pointerEvents="none">
        {notifications.map(n => (
          <View key={n.key} style={[
            { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, maxWidth: 280 },
            n.type === 'profit' ? { backgroundColor: '#16a34a' }
              : n.type === 'danger' ? { backgroundColor: '#dc2626' }
              : n.type === 'tip' ? { backgroundColor: '#7c3aed' }
              : { backgroundColor: '#1e40af' },
          ]}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{n.message}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1, maxWidth: 1100, width: '100%', alignSelf: 'center', paddingHorizontal: 8 }}>
        <GameHeader />

        {/* Tooltip banner */}
        {activeTooltip && TOOLTIP_MESSAGES[activeTooltip] && (
          <View style={{
            marginHorizontal: 8, marginBottom: 4, flexDirection: 'row', alignItems: 'center',
            backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 6,
            borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
            borderLeftWidth: 3, borderLeftColor: '#6366f1',
            paddingVertical: 8, paddingHorizontal: 12,
          }}>
            <Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 }}>
              {TOOLTIP_MESSAGES[activeTooltip]}
            </Text>
            <TouchableOpacity onPress={dismissTooltip} style={{
              marginLeft: 10, backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 4,
              paddingVertical: 4, paddingHorizontal: 10,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#818cf8' }}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab bar */}
        <View style={{
          flexDirection: 'row', marginHorizontal: 8, marginVertical: 3,
          backgroundColor: colors.bgCard, borderRadius: 8, padding: 3,
        }}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[
                { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
                activeTab === t.id && { backgroundColor: colors.bgCardHover },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                { fontSize: 13, fontWeight: '700', color: colors.textDark, textTransform: 'uppercase', letterSpacing: 1 },
                activeTab === t.id && { color: colors.text },
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'market' && <MarketTab />}
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'intel' && <IntelTab />}
      </View>
    </SafeAreaView>
  );
}
