import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../constants/theme';
import { $, NYC, INTL, GANGS, DRUGS } from '../constants/game';
import { useGameStore } from '../stores/gameStore';

export function MapTab() {
  const cp = useGameStore(s => s.currentPlayer());
  const mode = useGameStore(s => s.mode);
  const turn = useGameStore(s => s.turn);
  const travelAction = useGameStore(s => s.travel);
  const endTurn = useGameStore(s => s.endTurn);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* NYC */}
      <Text style={styles.sectionLabel}>NEW YORK</Text>
      <View style={styles.nycGrid}>
        {NYC.map(l => {
          const cur = l.id === cp.location;
          const own = !!cp.territories[l.id];
          const g = GANGS.find(x => x.turf.includes(l.id));
          return (
            <TouchableOpacity
              key={l.id}
              onPress={() => travelAction(l.id)}
              disabled={cur}
              style={[
                styles.locBtn,
                { borderColor: cur ? l.color + '35' : own ? '#22c55e22' : l.color + '12' },
                cur && { backgroundColor: l.color + '15' },
                own && !cur && { backgroundColor: 'rgba(34,197,94,0.04)' },
                !cur && !own && { backgroundColor: l.color + '06' },
                cur && { opacity: 0.5 },
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.locEmoji}>{l.emoji}</Text>
              <Text style={[styles.locName, cur && { color: l.color, fontWeight: '800' }]}>{l.name}</Text>
              {own && <Text style={styles.ownedLabel}>🏴 Yours</Text>}
              {g && !own && <Text style={[styles.gangLabel, { color: g.color }]}>{g.emoji}</Text>}
              {l.bank && <Text style={styles.serviceLabel}>🏦🦈</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* International */}
      <Text style={styles.sectionLabel}>INTERNATIONAL</Text>
      <View style={styles.intlGrid}>
        {INTL.map(l => {
          const ok = cp.rep >= (l.rep || 0);
          const cur = l.id === cp.location;
          return (
            <TouchableOpacity
              key={l.id}
              onPress={() => travelAction(l.id)}
              disabled={cur || !ok}
              style={[
                styles.intlBtn,
                ok ? {
                  backgroundColor: cur ? l.color + '15' : l.color + '06',
                  borderColor: l.color + '18',
                } : {
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  borderColor: '#ffffff06',
                },
                (!ok || cur) && { opacity: ok ? 0.5 : 0.3 },
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.locEmoji}>{l.emoji}</Text>
              <Text style={[styles.locName, ok ? (cur ? { color: l.color } : {}) : { color: colors.textDarkest }]}>{l.name}</Text>
              {!ok && <Text style={styles.lockedLabel}>🔒 {l.rep} rep</Text>}
              {ok && <Text style={styles.flyCostLabel}>✈️ {$(l.flyCost!)} • {l.travelDays}d</Text>}
              {ok && l.priceMultipliers && (
                <Text style={styles.discountLabel}>
                  {Object.entries(l.priceMultipliers).map(([d, m]) =>
                    `${DRUGS.find(x => x.id === d)?.emoji}${Math.round((1 - m) * 100)}%↓`
                  ).join(' ')}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2P End Turn */}
      {mode === '2p' && (
        <TouchableOpacity style={styles.endTurnBtn} onPress={endTurn} activeOpacity={0.8}>
          <Text style={styles.endTurnText}>END TURN → P{turn === 1 ? 2 : 1}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8 },
  sectionLabel: {
    fontSize: 8,
    color: colors.textDark,
    letterSpacing: 2,
    marginBottom: 3,
  },
  nycGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  locBtn: {
    width: '31.5%',
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  locEmoji: { fontSize: 14, marginBottom: 1 },
  locName: { fontSize: 10, fontWeight: '600', color: colors.textDim, textAlign: 'center' },
  ownedLabel: { fontSize: 7, color: colors.green },
  gangLabel: { fontSize: 7 },
  serviceLabel: { fontSize: 6, color: colors.textDark },
  intlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  intlBtn: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  lockedLabel: { fontSize: 7, color: colors.textDark },
  flyCostLabel: { fontSize: 7, color: colors.textMuted },
  discountLabel: { fontSize: 6, color: colors.textDark },
  endTurnBtn: {
    backgroundColor: colors.indigo,
    borderRadius: 6,
    paddingVertical: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  endTurnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
