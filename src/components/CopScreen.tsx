import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { $, DRUGS } from '../constants/game';
import { inventoryCount } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';

export function CopScreen() {
  const copAct = useGameStore(s => s.copAct);
  const cp = useGameStore(s => s.currentPlayer());
  const isShaking = useGameStore(s => s.isShaking);

  const cops = cp.cops!;
  const bribeCost = cops.bribeCost * cops.count;
  const used = inventoryCount(cp.inventory);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🚨</Text>
        <Text style={styles.title}>POLICE!</Text>
        <Text style={styles.subtitle}>
          {cops.count} officer{cops.count > 1 ? 's' : ''} closing in!
        </Text>
        <Text style={styles.info}>
          Carrying {used} units • Heat {cp.heat}%
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.runBtn]}
            onPress={() => copAct('run')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>
              🏃 RUN{' '}
              <Text style={styles.actionSmall}>{cp.gun ? '55%' : '38%'}</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.fightBtn]}
            onPress={() => copAct('fight')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>
              {cp.gun ? '🔫' : '👊'} FIGHT{' '}
              <Text style={styles.actionSmall}>{cp.gun ? 'armed' : 'bare fists'}</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.bribeBtn, cp.cash < bribeCost && styles.disabledBtn]}
            onPress={() => copAct('bribe')}
            activeOpacity={0.8}
            disabled={cp.cash < bribeCost}
          >
            <Text style={[styles.actionText, cp.cash < bribeCost && styles.disabledText]}>
              💰 BRIBE{' '}
              <Text style={styles.actionSmall}>{$(bribeCost)}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.red,
    marginVertical: 8,
  },
  subtitle: {
    color: colors.redLight,
    fontSize: 13,
    marginBottom: 2,
  },
  info: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 16,
  },
  actions: {
    width: 240,
    gap: 8,
  },
  actionBtn: {
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  runBtn: { backgroundColor: colors.blue },
  fightBtn: { backgroundColor: colors.red },
  bribeBtn: { backgroundColor: colors.yellow },
  disabledBtn: { backgroundColor: colors.cardBorder, opacity: 0.4 },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionSmall: { opacity: 0.7 },
  disabledText: { color: colors.textDarkest },
});
