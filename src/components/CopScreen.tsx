import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { $, DRUGS, GANGS, getRegionForLocation, DEFAULT_LAW } from '../constants/game';
import { inventoryCount } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';

export function CopScreen() {
  const copAct = useGameStore(s => s.copAct);
  const cp = useGameStore(s => s.currentPlayer());
  const isShaking = useGameStore(s => s.isShaking);

  const cops = cp.cops!;
  const isBountyHunter = !!cops.bountyHunter;
  const law = cops.regionLaw || DEFAULT_LAW;
  const bribeCost = cops.bribeCost * cops.count;
  const used = inventoryCount(cp.inventory);

  if (isBountyHunter) {
    const con = cp.consignment!;
    const gang = GANGS.find(g => g.id === con.gangId);
    const gangName = gang?.name || 'The gang';
    const remaining = con.amountOwed - con.amountPaid;
    const payAmount = Math.round(remaining * 1.5);

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🤝</Text>
          <Text style={[styles.title, { color: colors.yellow }]}>BOUNTY HUNTER!</Text>
          <Text style={styles.subtitle}>
            {gangName} sent someone to collect.
          </Text>
          <Text style={styles.flavor}>You owe {$(remaining)}. They want {$(payAmount)}.</Text>
          <Text style={styles.info}>
            Cash: {$(cp.cash)} • HP: {cp.hp}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.bribeBtn]}
              onPress={() => copAct('bribe')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionText}>
                💰 PAY UP{' '}
                <Text style={styles.actionSmall}>{$(payAmount)}</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.fightBtn]}
              onPress={() => copAct('fight')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionText}>
                {cp.gun ? '🔫' : '👊'} FIGHT{' '}
                <Text style={styles.actionSmall}>{cp.gun ? '35%' : '10%'} win</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.runBtn]}
              onPress={() => copAct('run')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionText}>
                🏃 RUN{' '}
                <Text style={styles.actionSmall}>35%</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Regular cop encounter
  // Regional run/fight probabilities
  let runChance = cp.gun ? 55 : 38;
  if (law.behavior === 'corrupt') runChance += 5;
  if (law.behavior === 'methodical') runChance -= 10;

  // Regional flavor description
  let flavorText = '';
  if (law.behavior === 'corrupt') flavorText = 'They look willing to deal...';
  else if (law.behavior === 'methodical') flavorText = 'Well-equipped and organized.';
  else flavorText = 'Looking for trouble.';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🚨</Text>
        <Text style={styles.title}>{law.forceEmoji} {law.forceName.toUpperCase()}!</Text>
        <Text style={styles.subtitle}>
          {cops.count} officer{cops.count > 1 ? 's' : ''} closing in!
        </Text>
        <Text style={styles.flavor}>{flavorText}</Text>
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
              <Text style={styles.actionSmall}>{runChance}%</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.fightBtn]}
            onPress={() => copAct('fight')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>
              {cp.gun ? '🔫' : '👊'} FIGHT{' '}
              <Text style={styles.actionSmall}>
                {cp.gun ? 'armed' : 'bare fists'}
                {law.behavior === 'methodical' ? ' (tough)' : law.behavior === 'corrupt' ? ' (easy)' : ''}
              </Text>
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
              <Text style={styles.actionSmall}>
                {$(bribeCost)}
                {law.behavior === 'methodical' ? ' (−15 heat)' : ' (−12 heat)'}
              </Text>
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
  flavor: {
    color: colors.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  info: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 16,
  },
  actions: {
    width: 260,
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
