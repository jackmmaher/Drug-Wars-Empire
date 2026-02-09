import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { $, DAYS, LOCATIONS, getRank, getRegionForLocation } from '../constants/game';
import { inventoryCount, netWorth } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';
import { Bar } from './Bar';
import { MiniStat } from './MiniStat';

export function GameHeader() {
  const cp = useGameStore(s => s.currentPlayer());
  const mode = useGameStore(s => s.mode);
  const turn = useGameStore(s => s.turn);

  const rank = getRank(cp.rep);
  const nw = netWorth(cp);
  const used = inventoryCount(cp.inventory);
  const free = cp.space - used;
  const loc = LOCATIONS.find(l => l.id === cp.location);
  const region = getRegionForLocation(cp.location);
  const isAbroad = region && region.id !== 'nyc';

  return (
    <View style={styles.container}>
      {/* 2P indicator */}
      {mode === '2p' && (
        <View style={styles.turnIndicator}>
          <View style={[styles.turnBadge, turn === 1 && styles.turnActive1]}>
            <Text style={[styles.turnText, turn === 1 && { color: colors.red }]}>P1</Text>
          </View>
          <View style={[styles.turnBadge, turn === 2 && styles.turnActive2]}>
            <Text style={[styles.turnText, turn === 2 && { color: colors.blue }]}>P2</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.dayLabel}>DAY {Math.min(cp.day, DAYS)}/{DAYS}</Text>
            <Text style={styles.cash}>{$(cp.cash)}</Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={styles.rankLabel}>{rank.emoji} {rank.name.toUpperCase()}</Text>
            <Text style={[styles.netWorth, { color: nw > 0 ? colors.green : colors.red }]}>{$(nw)}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <MiniStat label="DEBT" value={$(cp.debt)} color={cp.debt > 0 ? colors.red : colors.green} />
          <MiniStat label="BANK" value={$(cp.bank)} color={colors.blue} />
          <MiniStat label="SPACE" value={`${free}/${cp.space}`} color={free < 15 ? colors.yellow : colors.textMuted} />
          <MiniStat label="REP" value={cp.rep} color={colors.purple} />
        </View>

        <Bar label="🔥 HEAT" percent={cp.heat} color={cp.heat < 30 ? colors.green : cp.heat < 60 ? colors.yellow : colors.red} />
        <Bar label="❤️ HP" percent={cp.hp} color={cp.hp > 60 ? colors.green : cp.hp > 30 ? colors.yellow : colors.red} />

        {cp.streak > 1 && (
          <Text style={styles.streakText}>🔥 {cp.streak}x STREAK {cp.combo > 1.5 ? '— rep bonus!' : ''}</Text>
        )}

        {cp.newMilestone && (
          <Text style={styles.milestoneText}>🏆 MILESTONE: {cp.newMilestone.emoji} {cp.newMilestone.label}!</Text>
        )}

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            { width: `${Math.min(cp.day / DAYS * 100, 100)}%` },
            cp.day > 25 ? styles.progressDanger : styles.progressNormal,
          ]} />
        </View>
      </View>

      {/* Location */}
      <View style={styles.locationBar}>
        <View style={[styles.locationDot, { backgroundColor: loc?.color }]} />
        <Text style={styles.locationName}>
          {isAbroad ? `${region.emoji} ${region.name} > ` : ''}{loc?.emoji} {loc?.name}
        </Text>
        {cp.territories[cp.location] && (
          <Text style={styles.tributeText}>🏴 +{$(cp.territories[cp.location].tribute)}/d</Text>
        )}
        <View style={styles.statusIcons}>
          {cp.gun && <Text>🔫</Text>}
          {cp.rat.hired && cp.rat.alive && <Text>🐀</Text>}
          {Object.keys(cp.territories).length > 0 && (
            <Text style={styles.terrCount}>{Object.keys(cp.territories).length}🏴</Text>
          )}
        </View>
      </View>

      {/* Event */}
      {cp.currentEvent && (
        <View style={[styles.eventBar, cp.currentEvent.type === 'spike' ? styles.eventSpike : styles.eventCrash]}>
          <Text style={[styles.eventText, { color: cp.currentEvent.type === 'spike' ? colors.redLight : colors.greenLight }]}>
            {cp.currentEvent.type === 'spike' ? '📈' : '📉'} {cp.currentEvent.message}
          </Text>
        </View>
      )}

      {/* Near miss */}
      {cp.nearMisses.length > 0 && (
        <View style={styles.nearMissBar}>
          <Text style={styles.nearMissText}>
            😱 <Text style={{ fontWeight: '700' }}>{cp.nearMisses[0].type === 'sold_early' ? 'Sold too early!' : 'Near miss!'}</Text>{' '}
            {cp.nearMisses[0].drug.emoji} {cp.nearMisses[0].drug.name} {cp.nearMisses[0].type === 'sold_early' ? 'jumped to' : 'spiked to'} {$(cp.nearMisses[0].currentPrice)} — {cp.nearMisses[0].type === 'sold_early' ? 'you just sold' : 'you had'} {cp.nearMisses[0].quantity}! Missed {$(cp.nearMisses[0].missedProfit)}!
          </Text>
        </View>
      )}

      {/* Offer */}
      {cp.offer && <OfferBanner />}
    </View>
  );
}

function OfferBanner() {
  const cp = useGameStore(s => s.currentPlayer());
  const acceptOffer = useGameStore(s => s.acceptOffer);
  const declineOffer = useGameStore(s => s.declineOffer);
  const o = cp.offer!;

  const LOCS = LOCATIONS;
  let offerText = '';
  let offerCost = 0;
  if (o.type === 'gun') { offerText = `🔫 Piece for sale — ${$(o.price!)}`; offerCost = o.price!; }
  else if (o.type === 'coat') { offerText = `🧥 Bigger coat (+${o.space}) — ${$(o.price!)}`; offerCost = o.price!; }
  else if (o.type === 'rat') { offerText = `🐀 "${o.rat!.name}" wants to be your informant — ${$(o.rat!.cost)} (${o.rat!.personality})`; offerCost = o.rat!.cost; }
  else if (o.type === 'territory') { offerText = `🏴 Take over ${LOCS.find(l => l.id === o.locationId)?.name} — ${$(o.cost!)} (+${$(o.tribute!)}/day)`; offerCost = o.cost!; }

  return (
    <View style={styles.offerBar}>
      <Text style={styles.offerText}>{offerText}</Text>
      <View style={styles.offerButtons}>
        <TouchableOpacity onPress={acceptOffer} disabled={cp.cash < offerCost} style={[styles.offerBtn, styles.acceptBtn]}>
          <Text style={styles.offerBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={declineOffer} style={[styles.offerBtn, styles.passBtn]}>
          <Text style={styles.offerBtnText}>Pass</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: {},
  turnIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  turnBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  turnActive1: { backgroundColor: 'rgba(239,68,68,0.13)' },
  turnActive2: { backgroundColor: 'rgba(59,130,246,0.13)' },
  turnText: { fontSize: 10, fontWeight: '700', color: colors.textDark },
  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayLabel: { fontSize: 8, color: colors.textDark, letterSpacing: 2 },
  cash: { fontSize: 22, fontWeight: '900', color: colors.white, lineHeight: 26 },
  rightCol: { alignItems: 'flex-end' },
  rankLabel: { fontSize: 8, color: colors.textMuted },
  netWorth: { fontSize: 14, fontWeight: '800' },
  statsRow: {
    flexDirection: 'row',
    gap: 3,
    marginVertical: 5,
  },
  streakText: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.yellow,
    fontWeight: '700',
    marginVertical: 2,
  },
  milestoneText: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.yellow,
    fontWeight: '800',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#0f172a',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 3,
  },
  progressFill: { height: '100%' },
  progressNormal: { backgroundColor: colors.blue },
  progressDanger: { backgroundColor: colors.red },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  locationDot: { width: 7, height: 7, borderRadius: 4 },
  locationName: { fontSize: 12, fontWeight: '800', color: colors.text },
  tributeText: { fontSize: 8, color: colors.green },
  statusIcons: { marginLeft: 'auto', flexDirection: 'row', gap: 3 },
  terrCount: { fontSize: 10 },
  eventBar: {
    marginHorizontal: 8,
    marginBottom: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 1,
  },
  eventSpike: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)' },
  eventCrash: { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.15)' },
  eventText: { fontSize: 10, fontWeight: '600' },
  nearMissBar: {
    marginHorizontal: 8,
    marginBottom: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(249,115,22,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.15)',
  },
  nearMissText: { fontSize: 10, color: colors.orangeLight },
  offerBar: {
    marginHorizontal: 8,
    marginBottom: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
  },
  offerText: { fontSize: 11, color: colors.indigoLight, fontWeight: '600', marginBottom: 3 },
  offerButtons: { flexDirection: 'row', gap: 5 },
  offerBtn: { borderRadius: 3, paddingVertical: 4, paddingHorizontal: 8 },
  acceptBtn: { backgroundColor: colors.indigoDark },
  passBtn: { backgroundColor: colors.cardBorder },
  offerBtnText: { color: '#cbd5e1', fontSize: 10, fontWeight: '600' },
});
