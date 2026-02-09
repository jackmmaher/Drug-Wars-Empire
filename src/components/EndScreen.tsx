import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../constants/theme';
import { $, MILESTONES, DAYS, getRank } from '../constants/game';
import { netWorth } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';

export function EndScreen() {
  const phase = useGameStore(s => s.phase);
  const mode = useGameStore(s => s.mode);
  const cp = useGameStore(s => s.currentPlayer());
  const p1 = useGameStore(s => s.p1);
  const p2 = useGameStore(s => s.p2);
  const resetToTitle = useGameStore(s => s.resetToTitle);

  const isWin = phase === 'win';
  const fn = cp.cash + cp.bank - cp.debt;
  const fr = getRank(cp.rep);

  const stats = [
    { label: 'Trades', value: cp.trades },
    { label: 'Best', value: $(cp.bestTrade), color: colors.green },
    { label: 'Streak', value: `${cp.maxStreak}x` },
    { label: 'Territories', value: Object.keys(cp.territories).length },
    { label: 'Close Calls', value: cp.closeCallCount },
    { label: 'Rep', value: cp.rep },
    { label: 'HP', value: `${cp.hp}%` },
    { label: 'Milestones', value: cp.milestones?.length || 0 },
    { label: 'Days', value: Math.min(cp.day - 1, DAYS) },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>{isWin ? fr.emoji : '💀'}</Text>
        <Text style={[styles.title, { color: isWin ? colors.green : colors.red }]}>
          {isWin ? 'SURVIVED' : cp.hp <= 0 ? 'DEAD' : 'GAME OVER'}
        </Text>

        {mode === '2p' && p1 && p2 ? (
          <View style={styles.twoPlayerResults}>
            <Text style={[styles.playerScore, { color: colors.red }]}>
              P1: {$(p1.cash + p1.bank - p1.debt)} {getRank(p1.rep).emoji}
            </Text>
            <Text style={[styles.playerScore, { color: colors.blue }]}>
              P2: {$(p2.cash + p2.bank - p2.debt)} {getRank(p2.rep).emoji}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.rank}>{fr.name}</Text>
            <Text style={styles.netWorth}>Net: {$(fn)}</Text>
          </>
        )}

        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statBox}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, s.color ? { color: s.color } : null]}>
                {s.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.milestones}>
          {MILESTONES.map(m => (
            <Text
              key={m.id}
              style={[
                styles.milestoneEmoji,
                !cp.milestones?.includes(m.id) && styles.milestoneInactive,
              ]}
            >
              {m.emoji}
            </Text>
          ))}
        </View>

        <TouchableOpacity style={styles.playAgainBtn} onPress={resetToTitle} activeOpacity={0.8}>
          <Text style={styles.playAgainText}>PLAY AGAIN</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  emoji: { fontSize: 56, marginBottom: 4 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 4,
  },
  rank: {
    fontSize: 13,
    color: colors.yellow,
    fontWeight: '800',
  },
  netWorth: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.white,
    marginVertical: 6,
  },
  twoPlayerResults: {
    marginVertical: 12,
  },
  playerScore: {
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
    maxWidth: 360,
    marginBottom: 16,
  },
  statBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    width: 108,
  },
  statLabel: {
    fontSize: 7,
    color: colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  milestones: {
    flexDirection: 'row',
    gap: 3,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
  },
  milestoneEmoji: { fontSize: 18 },
  milestoneInactive: { opacity: 0.12 },
  playAgainBtn: {
    backgroundColor: colors.red,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  playAgainText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
