import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { $, STARTING_CASH, STARTING_DEBT, DAYS } from '../constants/game';
import { useGameStore } from '../stores/gameStore';

const TAGS = ['🌍 International', '🏴 Territory', '🐀 Informants', '⚔️ Gangs', '📈 Near Misses', '👑 Ranks'];

export function TitleScreen() {
  const startGame = useGameStore(s => s.startGame);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.edition}>Empire Edition</Text>
        <Text style={styles.titleDrug}>DRUG</Text>
        <Text style={styles.titleWars}>WARS</Text>
        <View style={styles.divider} />

        <Text style={styles.desc}>
          You owe{' '}
          <Text style={styles.redText}>{$(STARTING_DEBT)}</Text> to the shark.{' '}
          <Text style={styles.greenText}>{$(STARTING_CASH)}</Text> in your pocket.
          <Text style={styles.yellowText}> {DAYS} days</Text> to build an empire, go international, control territory, and survive.
        </Text>

        <View style={styles.tags}>
          {TAGS.map((t, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.soloBtn} onPress={() => startGame('solo')} activeOpacity={0.8}>
            <Text style={styles.btnText}>SOLO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.twoPlayerBtn} onPress={() => startGame('2p')} activeOpacity={0.8}>
            <Text style={styles.btnText}>2 PLAYER</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.credit}>Based on John E. Dell's 1984 classic</Text>
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
    maxWidth: 440,
  },
  edition: {
    fontSize: 9,
    letterSpacing: 8,
    color: colors.textDark,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  titleDrug: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.red,
    lineHeight: 58,
    letterSpacing: -3,
  },
  titleWars: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.yellow,
    lineHeight: 58,
    letterSpacing: -3,
  },
  divider: {
    width: 80,
    height: 1,
    backgroundColor: colors.red,
    marginVertical: 16,
    opacity: 0.5,
  },
  desc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  redText: { color: colors.red, fontWeight: '700' },
  greenText: { color: colors.green, fontWeight: '700' },
  yellowText: { color: colors.yellow, fontWeight: '700' },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 9,
    color: colors.textMuted,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  soloBtn: {
    backgroundColor: colors.red,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  twoPlayerBtn: {
    backgroundColor: colors.blue,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  credit: {
    fontSize: 8,
    color: colors.textDarkest,
    marginTop: 16,
  },
});
