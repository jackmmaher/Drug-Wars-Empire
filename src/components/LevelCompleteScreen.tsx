import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, getLevelConfig, DAYS_PER_LEVEL } from '../constants/game';
import { netWorth } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';
import type { CampaignLevel } from '../types/game';

export function LevelCompleteScreen() {
  const { colors } = useTheme();
  const player = useGameStore(s => s.player);
  const campaign = useGameStore(s => s.campaign);
  const advanceLevel = useGameStore(s => s.advanceLevel);

  const config = getLevelConfig(campaign.level);
  const nextLevel = (campaign.level + 1) as CampaignLevel;
  const nextConfig = nextLevel <= 3 ? getLevelConfig(nextLevel) : null;
  const nw = netWorth(player);

  const stats = [
    { label: 'Net Worth', value: $(nw), color: colors.green },
    { label: 'Cash', value: $(player.cash) },
    { label: 'Bank', value: $(player.bank) },
    { label: 'Rep', value: player.rep, color: colors.purple },
    { label: 'Territories', value: Object.keys(player.territories).length },
    { label: 'Trades', value: player.trades },
    { label: 'Best Trade', value: $(player.bestTrade), color: colors.green },
    { label: 'Days Used', value: Math.min(player.day - 1, DAYS_PER_LEVEL) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 64, marginBottom: 8 }}>{config.emoji}</Text>
        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.green, marginBottom: 4 }}>
          LEVEL {campaign.level} COMPLETE!
        </Text>
        <Text style={{ fontSize: 16, color: colors.textMuted, marginBottom: 20 }}>
          {config.name} conquered.
        </Text>

        {/* Stats */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 400, marginBottom: 20 }}>
          {stats.map((s, i) => (
            <View key={i} style={{
              backgroundColor: colors.bgCard, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14,
              alignItems: 'center', width: 110,
            }}>
              <Text style={{ fontSize: 11, color: colors.textDark, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: s.color || colors.text }}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* What carries over */}
        <View style={{
          backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderLight,
          borderRadius: 8, padding: 14, marginBottom: 16, width: '100%', maxWidth: 360,
        }}>
          <Text style={{ fontSize: 12, letterSpacing: 2, color: colors.yellow, fontWeight: '600', marginBottom: 6 }}>
            CARRIES OVER
          </Text>
          <Text style={{ fontSize: 13, color: colors.textDim, lineHeight: 20 }}>
            Cash, bank, inventory, space, gun, HP (+30 heal), rep, gang relations, territories (+ stashes), rat, fingers, milestones, persona
          </Text>
          <Text style={{ fontSize: 12, letterSpacing: 2, color: colors.red, fontWeight: '600', marginTop: 8, marginBottom: 4 }}>
            RESETS
          </Text>
          <Text style={{ fontSize: 13, color: colors.textDim, lineHeight: 20 }}>
            Day counter, heat, prices, event log, active offers/missions/consignments
          </Text>
        </View>

        {/* Next level preview */}
        {nextConfig && (
          <View style={{
            backgroundColor: 'rgba(234,179,8,0.06)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.15)',
            borderRadius: 8, padding: 14, marginBottom: 20, width: '100%', maxWidth: 360,
          }}>
            <Text style={{ fontSize: 14, color: colors.yellow, fontWeight: '700', marginBottom: 4 }}>
              {nextConfig.emoji} NEXT: Level {nextLevel} — {nextConfig.name}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>
              "{nextConfig.subtitle}"
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={{ backgroundColor: colors.green, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 48 }}
          onPress={advanceLevel}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 }}>CONTINUE</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
