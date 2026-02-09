import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, getLevelConfig, DAYS_PER_LEVEL } from '../constants/game';
import { netWorth } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';

export function LevelIntroScreen() {
  const { colors } = useTheme();
  const player = useGameStore(s => s.player);
  const campaign = useGameStore(s => s.campaign);
  const setPhase = (phase: any) => useGameStore.setState({ phase });

  const config = getLevelConfig(campaign.level);
  const isFirstLevel = campaign.level === 1;
  const nw = netWorth(player);

  const features: string[] = [];
  if (campaign.level === 1) {
    features.push('NYC only (6 cities)', 'Basic trading, cops, events', 'Gun, coat, informant offers', 'Rare drugs at half spawn rate');
  } else if (campaign.level === 2) {
    features.push('Colombia + Thailand unlock', 'Gang consignment system', 'Gang loans available', 'Gang missions available', 'Territory purchases unlock', 'Full rare drug spawn rates', 'Cops +3% base chance');
  } else {
    features.push('Netherlands + France unlock (all regions)', 'Gang War system — declare war!', 'Territory raids by rival gangs', 'Consignment/loan caps +50%', 'Territory tribute +50%', 'Cops +5%, tougher customs');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 64, marginBottom: 8 }}>{config.emoji}</Text>
        <Text style={{ fontSize: 14, letterSpacing: 4, color: colors.textDim, textTransform: 'uppercase', marginBottom: 4 }}>
          LEVEL {campaign.level}
        </Text>
        <Text style={{ fontSize: 32, fontWeight: '900', color: colors.yellow, marginBottom: 4 }}>
          {config.name}
        </Text>
        <Text style={{ fontSize: 16, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginBottom: 20 }}>
          "{config.subtitle}"
        </Text>

        {/* Carryover summary (levels 2+) */}
        {!isFirstLevel && (
          <View style={{
            backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderLight,
            borderRadius: 8, padding: 14, marginBottom: 16, width: '100%', maxWidth: 360,
          }}>
            <Text style={{ fontSize: 12, letterSpacing: 2, color: colors.textDim, fontWeight: '600', marginBottom: 6 }}>
              CARRYING OVER
            </Text>
            <Text style={{ fontSize: 14, color: colors.green, marginBottom: 2 }}>Cash: {$(player.cash)} | Bank: {$(player.bank)}</Text>
            <Text style={{ fontSize: 14, color: colors.text, marginBottom: 2 }}>Rep: {player.rep} | Territories: {Object.keys(player.territories).length}</Text>
            <Text style={{ fontSize: 14, color: colors.text, marginBottom: 2 }}>HP: {player.hp} (+30 healed)</Text>
            {player.gun && <Text style={{ fontSize: 14, color: colors.yellow }}>Armed</Text>}
            {config.startingDebt > 0 && (
              <Text style={{ fontSize: 14, color: colors.red, marginTop: 4 }}>
                New debt: {$(config.startingDebt)} ({config.debtSource})
              </Text>
            )}
          </View>
        )}

        {/* New features */}
        <View style={{
          backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderLight,
          borderRadius: 8, padding: 14, marginBottom: 20, width: '100%', maxWidth: 360,
        }}>
          <Text style={{ fontSize: 12, letterSpacing: 2, color: colors.yellow, fontWeight: '600', marginBottom: 6 }}>
            {isFirstLevel ? 'FEATURES' : 'NEW IN THIS LEVEL'}
          </Text>
          {features.map((f, i) => (
            <Text key={i} style={{ fontSize: 14, color: colors.textDim, paddingVertical: 2 }}>
              {'\u2022'} {f}
            </Text>
          ))}
        </View>

        {/* Win condition */}
        <View style={{
          backgroundColor: 'rgba(34,197,94,0.06)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)',
          borderRadius: 8, padding: 14, marginBottom: 20, width: '100%', maxWidth: 360,
        }}>
          <Text style={{ fontSize: 12, letterSpacing: 2, color: colors.green, fontWeight: '600', marginBottom: 6 }}>
            WIN CONDITION
          </Text>
          {config.winCondition.minNetWorth > 0 && (
            <Text style={{ fontSize: 14, color: colors.greenLight }}>Net worth {'>='} {$(config.winCondition.minNetWorth)}</Text>
          )}
          {config.winCondition.debtFree && (
            <Text style={{ fontSize: 14, color: colors.greenLight }}>Debt fully paid off</Text>
          )}
          {config.winCondition.bloodBrother && (
            <Text style={{ fontSize: 14, color: colors.greenLight }}>Blood Brother with any gang (25+ relations)</Text>
          )}
          {config.winCondition.minTerritories && (
            <Text style={{ fontSize: 14, color: colors.greenLight }}>{config.winCondition.minTerritories}+ territories</Text>
          )}
          {config.winCondition.minRep && (
            <Text style={{ fontSize: 14, color: colors.greenLight }}>Rep {'>='} {config.winCondition.minRep} (Drug Lord)</Text>
          )}
          {config.winCondition.defeatedGangs && (
            <Text style={{ fontSize: 14, color: colors.greenLight }}>{config.winCondition.defeatedGangs}+ gangs defeated</Text>
          )}
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
            Complete within {DAYS_PER_LEVEL} days or lose!
          </Text>
        </View>

        <TouchableOpacity
          style={{ backgroundColor: colors.red, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 48 }}
          onPress={() => setPhase('playing')}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 }}>BEGIN</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
