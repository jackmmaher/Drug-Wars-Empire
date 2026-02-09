import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../constants/theme';
import { $, GANGS, DRUGS, REGIONS, LOCATIONS, getRegionForLocation, getRegionLocations } from '../constants/game';
import { useGameStore } from '../stores/gameStore';

export function MapTab() {
  const cp = useGameStore(s => s.currentPlayer());
  const mode = useGameStore(s => s.mode);
  const turn = useGameStore(s => s.turn);
  const travelAction = useGameStore(s => s.travel);
  const endTurn = useGameStore(s => s.endTurn);

  const currentRegion = getRegionForLocation(cp.location);
  const regionLocs = currentRegion ? getRegionLocations(currentRegion.id) : [];
  const otherRegions = REGIONS.filter(r => r.id !== currentRegion?.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Current Region */}
      <Text style={styles.sectionLabel}>
        {currentRegion?.emoji} {currentRegion?.name?.toUpperCase() || 'NEW YORK'}
      </Text>
      <View style={styles.nycGrid}>
        {regionLocs.map(l => {
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

      {/* Fly To */}
      <Text style={styles.sectionLabel}>✈️ FLY TO</Text>
      <View style={styles.intlGrid}>
        {otherRegions.map(r => {
          const isNyc = r.id === 'nyc';
          const flyCost = isNyc ? Math.round((currentRegion?.flyCost || 0) / 2) : r.flyCost;
          const repNeeded = isNyc ? 0 : r.rep;
          const ok = cp.rep >= repNeeded;
          return (
            <TouchableOpacity
              key={r.id}
              onPress={() => {
                // Travel to the first city in the target region
                const targetLocs = getRegionLocations(r.id);
                if (targetLocs.length > 0) travelAction(targetLocs[0].id);
              }}
              disabled={!ok}
              style={[
                styles.intlBtn,
                ok ? {
                  backgroundColor: r.color + '06',
                  borderColor: r.color + '18',
                } : {
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  borderColor: '#ffffff06',
                },
                !ok && { opacity: 0.3 },
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.locEmoji}>{r.emoji}</Text>
              <Text style={[styles.locName, ok ? {} : { color: colors.textDarkest }]}>{r.name}</Text>
              {!ok && <Text style={styles.lockedLabel}>🔒 {repNeeded} rep</Text>}
              {ok && <Text style={styles.flyCostLabel}>✈️ {$(flyCost)} • {isNyc ? (currentRegion?.travelDays || 2) : r.travelDays}d</Text>}
              {ok && !isNyc && Object.keys(r.priceMultipliers).length > 0 && (
                <Text style={styles.discountLabel}>
                  {Object.entries(r.priceMultipliers).map(([d, m]) =>
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
