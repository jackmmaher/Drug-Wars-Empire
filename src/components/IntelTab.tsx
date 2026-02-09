import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../constants/theme';
import { $, GANGS, MILESTONES, LOCATIONS } from '../constants/game';
import { useGameStore } from '../stores/gameStore';
import { Bar } from './Bar';

export function IntelTab() {
  const cp = useGameStore(s => s.currentPlayer());
  const payRatAction = useGameStore(s => s.payRat);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Rat */}
      <Text style={styles.sectionLabel}>🐀 INFORMANT</Text>
      {cp.rat.hired && cp.rat.alive ? (
        <View style={styles.ratPanel}>
          <View style={styles.ratHeader}>
            <Text style={styles.ratName}>{cp.rat.name}</Text>
            <Text style={[styles.ratLoyalty, {
              color: cp.rat.loyalty > 60 ? colors.green : cp.rat.loyalty > 30 ? colors.yellow : colors.red,
            }]}>
              {cp.rat.personality} • {cp.rat.loyalty}%
            </Text>
          </View>
          <Bar
            percent={cp.rat.loyalty}
            color={cp.rat.loyalty > 60 ? colors.purpleDark : cp.rat.loyalty > 30 ? colors.yellow : colors.red}
          />
          <Text style={styles.ratInfo}>
            Intel: {'⭐'.repeat(cp.rat.intel)} • Tips: {cp.rat.tips}
          </Text>
          {cp.rat.loyalty < 40 && (
            <Text style={styles.ratWarning}>⚠️ Might flip!</Text>
          )}
          <TouchableOpacity
            style={[styles.payRatBtn, cp.cash < 150 && { opacity: 0.4 }]}
            onPress={payRatAction}
            disabled={cp.cash < 150}
          >
            <Text style={styles.payRatText}>💰 Pay ($150)</Text>
          </TouchableOpacity>
        </View>
      ) : cp.rat.hired ? (
        <Text style={styles.ratDead}>💀 {cp.rat.name} sold you out.</Text>
      ) : (
        <Text style={styles.noRat}>No informant yet.</Text>
      )}

      {/* Territories */}
      <Text style={[styles.sectionLabel, { marginTop: 6 }]}>🏴 TERRITORIES</Text>
      {Object.keys(cp.territories).length > 0 ? (
        <View>
          {Object.entries(cp.territories).map(([id, d]) => {
            const l = LOCATIONS.find(x => x.id === id);
            return (
              <View key={id} style={styles.terrRow}>
                <Text style={styles.terrName}>{l?.emoji} {l?.name}</Text>
                <Text style={styles.terrTribute}>+{$(d.tribute)}/d</Text>
              </View>
            );
          })}
          <Text style={styles.terrTotal}>Total: {$(cp.tributePerDay)}/day</Text>
        </View>
      ) : (
        <Text style={styles.noData}>None yet. Build rep.</Text>
      )}

      {/* Gangs */}
      <Text style={[styles.sectionLabel, { marginTop: 6 }]}>⚔️ GANGS</Text>
      {GANGS.map(g => (
        <View key={g.id} style={styles.gangRow}>
          <Text style={styles.gangEmoji}>{g.emoji}</Text>
          <Text style={[styles.gangName, { color: g.color }]}>{g.name}</Text>
          <Text style={[styles.gangStatus, {
            color: (cp.gangRelations[g.id] ?? 0) > 10 ? colors.green : (cp.gangRelations[g.id] ?? 0) < -10 ? colors.red : colors.textMuted,
          }]}>
            {(cp.gangRelations[g.id] ?? 0) > 10 ? 'Allied' : (cp.gangRelations[g.id] ?? 0) < -10 ? 'Hostile' : 'Neutral'}
          </Text>
        </View>
      ))}

      {/* Milestones */}
      <Text style={[styles.sectionLabel, { marginTop: 6 }]}>🏆 MILESTONES</Text>
      <View style={styles.milestoneRow}>
        {MILESTONES.map(m => (
          <Text
            key={m.id}
            style={[styles.milestoneEmoji, !cp.milestones?.includes(m.id) && styles.milestoneInactive]}
          >
            {m.emoji}
          </Text>
        ))}
      </View>

      {/* Log */}
      <Text style={[styles.sectionLabel, { marginTop: 6 }]}>📜 LOG</Text>
      <View style={styles.logContainer}>
        {[...cp.eventLog].reverse().slice(0, 10).map((e, i) => (
          <Text key={i} style={[
            styles.logEntry,
            {
              color: e.type === 'danger' ? colors.redLight
                : e.type === 'spike' ? colors.pinkLight
                : e.type === 'crash' ? colors.greenLight
                : e.type === 'tip' ? colors.purpleLight
                : colors.textMuted,
              opacity: 1 - i * 0.06,
            },
          ]}>
            <Text style={{ color: colors.textDarkest }}>D{e.day}</Text> {e.message}
          </Text>
        ))}
      </View>
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
  ratPanel: {
    backgroundColor: 'rgba(124,58,237,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.12)',
    borderRadius: 5,
    padding: 6,
  },
  ratHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  ratName: { fontSize: 11, fontWeight: '700', color: colors.purpleLight },
  ratLoyalty: { fontSize: 9 },
  ratInfo: { fontSize: 8, color: colors.textMuted, marginVertical: 2 },
  ratWarning: { fontSize: 9, color: colors.red, fontWeight: '600' },
  payRatBtn: {
    backgroundColor: '#6d28d9',
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  payRatText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  ratDead: { fontSize: 10, color: colors.red, padding: 6 },
  noRat: { fontSize: 10, color: colors.textDark, padding: 6 },
  terrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(34,197,94,0.03)',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  terrName: { fontSize: 10, color: colors.greenLight },
  terrTribute: { fontSize: 10, color: colors.green, fontWeight: '700' },
  terrTotal: { fontSize: 9, color: colors.green, fontWeight: '600' },
  noData: { fontSize: 10, color: colors.textDark },
  gangRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  gangEmoji: { fontSize: 12 },
  gangName: { fontSize: 10, flex: 1 },
  gangStatus: { fontSize: 9, fontWeight: '600' },
  milestoneRow: {
    flexDirection: 'row',
    gap: 2,
    flexWrap: 'wrap',
  },
  milestoneEmoji: { fontSize: 16 },
  milestoneInactive: { opacity: 0.1 },
  logContainer: { maxHeight: 120 },
  logEntry: { fontSize: 9, paddingVertical: 1 },
});
