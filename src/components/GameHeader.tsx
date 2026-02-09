import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../constants/theme';
import { $, DAYS, STARTING_DEBT, LOCATIONS, RANKS, REGIONS, DRUGS, GANGS, getRank, getRegionForLocation, getRegion } from '../constants/game';
import { inventoryCount, netWorth, effectiveSpace } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';
import { Bar } from './Bar';
import { MiniStat } from './MiniStat';

export function GameHeader() {
  const cp = useGameStore(s => s.currentPlayer());
  const mode = useGameStore(s => s.mode);
  const turn = useGameStore(s => s.turn);
  const subPanel = useGameStore(s => s.subPanel);
  const setSubPanel = useGameStore(s => s.setSubPanel);

  const rank = getRank(cp.rep);
  const nw = netWorth(cp);
  const used = inventoryCount(cp.inventory);
  const espce = effectiveSpace(cp);
  const free = espce - used;
  const loc = LOCATIONS.find(l => l.id === cp.location);
  const region = getRegionForLocation(cp.location);
  const isAbroad = region && region.id !== 'nyc';
  const conGang = cp.consignment ? GANGS.find(g => g.id === cp.consignment!.gangId) : null;
  const conLoc = cp.consignment ? LOCATIONS.find(l => l.id === cp.consignment!.originLocation) : null;

  const rival = useGameStore(s => {
    if (s.mode !== '2p') return null;
    return s.turn === 1 ? s.p2 : s.p1;
  });

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

      {/* Rival intel bar */}
      {mode === '2p' && rival && (
        <View style={styles.rivalBar}>
          <Text style={styles.rivalText}>
            P{turn === 1 ? 2 : 1}: {LOCATIONS.find(l => l.id === rival.location)?.name || '???'}
          </Text>
          <Text style={styles.rivalText}>
            {$(netWorth(rival))} net | {Object.keys(rival.territories).length} turf
          </Text>
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
          <MiniStat label="DEBT" value={$(cp.debt)} color={cp.debt > STARTING_DEBT * 2 ? colors.red : cp.debt > 0 ? colors.orange : colors.green} />
          <MiniStat label="BANK" value={$(cp.bank)} color={colors.blue} />
          <MiniStat label="SPACE" value={`${free}/${espce}`} color={free < 15 ? colors.yellow : colors.textMuted} />
          <MiniStat label="REP" value={cp.rep} color={colors.purple} />
        </View>

        {cp.debt > STARTING_DEBT * 3 && (
          <View style={styles.debtWarningRow}>
            <Text style={styles.debtWarningText}>{'\u26A0'} Debt compounding!</Text>
            {cp.day < DAYS && (
              <Text style={styles.debtProjection}>{'\u2192'} ~{$(Math.round(cp.debt * Math.pow(1.1, DAYS - cp.day)))} by D{DAYS}</Text>
            )}
          </View>
        )}

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
          {cp.fingers < 10 && (
            <Text style={[styles.fingerCount, {
              color: cp.fingers <= 4 ? colors.red : cp.fingers <= 6 ? colors.yellow : colors.orangeLight,
            }]}>✋ {cp.fingers}/10</Text>
          )}
          <TouchableOpacity onPress={() => setSubPanel('help')} style={styles.helpBtn}>
            <Text style={styles.helpBtnText}>?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Consignment status bar */}
      {cp.consignment && conGang && (
        <View style={[styles.consignmentBar, cp.consignment.turnsLeft <= 1 && styles.consignmentUrgent]}>
          <Text style={[styles.consignmentText, cp.consignment.turnsLeft <= 1 && { color: colors.red }]}>
            🤝 Owe {conGang.name} {$(cp.consignment.amountOwed - cp.consignment.amountPaid)} • ⏰ {cp.consignment.turnsLeft > 0 ? `${cp.consignment.turnsLeft} turn${cp.consignment.turnsLeft !== 1 ? 's' : ''}` : 'OVERDUE!'} • Return to {conLoc?.name || '???'}
          </Text>
        </View>
      )}

      {/* Help panel */}
      {subPanel === 'help' && (
        <View style={styles.helpPanel}>
          <ScrollView style={{ maxHeight: 260 }}>
            <Text style={styles.helpTitle}>HOW TO PLAY</Text>
            <Text style={styles.helpText}>Buy low, sell high. Travel between cities to find better prices. Pay off your debt before day 30.</Text>

            <Text style={styles.helpTitle}>BANK & SHARK</Text>
            <Text style={styles.helpText}>Visit a capital city (marked 🏦🦈) to deposit cash at 5%/day interest, or borrow from the shark at 10%/day. Every region's capital has both.</Text>

            <Text style={styles.helpTitle}>HEAT & COPS</Text>
            <Text style={styles.helpText}>Buying and selling raises heat (max 100). High heat = more cop encounters (max 65%). Each region has different police forces with unique behaviors. Bribe, run, or fight your way out.</Text>

            <Text style={styles.helpTitle}>REPUTATION</Text>
            <Text style={styles.helpText}>Earn rep by making profitable trades. Higher rep unlocks international regions and new ranks:</Text>
            {RANKS.map(r => (
              <Text key={r.name} style={styles.helpItem}>{r.emoji} {r.name} — {r.rep} rep</Text>
            ))}

            <Text style={styles.helpTitle}>INTERNATIONAL TRAVEL</Text>
            <Text style={styles.helpText}>Fly to other regions for cheaper drugs. Each has 6 cities, a local gang, and unique price discounts. Return to NYC costs half price.</Text>
            {REGIONS.filter(r => r.id !== 'nyc').map(r => (
              <Text key={r.id} style={styles.helpItem}>
                {r.emoji} {r.name} — {r.rep} rep, ${r.flyCost.toLocaleString()} flight{'\n'}
                {'   '}{Object.entries(r.priceMultipliers).map(([d, m]) =>
                  `${DRUGS.find(x => x.id === d)?.name} -${Math.round((1 - m) * 100)}%`
                ).join(', ')}
              </Text>
            ))}

            <Text style={styles.helpTitle}>CUSTOMS</Text>
            <Text style={styles.helpText}>Flying between regions with drugs risks customs checks. Detection depends on destination strictness, amount carried, and heat. Contraband drugs are detected at 2x rate. Getting caught = drugs confiscated + fine.</Text>

            <Text style={styles.helpTitle}>GANGS & TERRITORY</Text>
            <Text style={styles.helpText}>Some cities are gang turf. Trade there to build relations. At 25+ rep you can claim territory for daily tribute income. Bad relations = taxes.</Text>

            <Text style={styles.helpTitle}>CONSIGNMENT</Text>
            <Text style={styles.helpText}>Gangs may offer drugs on credit (2x markup). You have 5 turns to sell and repay. Return to the gang's turf to settle. Pay 100% on time = respect. Partial = lose a finger. Late or short = worse. Don't pay? Bounty hunters come for you.</Text>
            <Text style={styles.helpText}>Each lost finger: -5 inventory space, -3% sell revenue. At 6 fingers: +1 travel day. At 4: lose your gun. At 0: game over.</Text>

            <Text style={styles.helpTitle}>INFORMANTS</Text>
            <Text style={styles.helpText}>At 10+ rep you may meet a rat who gives price tips. Pay them to keep loyalty up — low loyalty = they flip on you. Tips now predict future market events! Higher intel = more accurate.</Text>
          </ScrollView>
          <TouchableOpacity onPress={() => setSubPanel(null)} style={styles.helpClose}>
            <Text style={styles.helpCloseText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Event */}
      {cp.currentEvent && (
        <View style={[styles.eventBar, cp.currentEvent.type === 'spike' ? styles.eventSpike : styles.eventCrash]}>
          <Text style={[styles.eventText, { color: cp.currentEvent.type === 'spike' ? colors.redLight : colors.greenLight }]}>
            {cp.currentEvent.type === 'spike' ? '📈' : '📉'}{' '}
            {cp.currentEvent.regionId ? `${getRegion(cp.currentEvent.regionId)?.emoji || ''} ` : ''}
            {cp.currentEvent.message}
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
  let isFree = false;
  if (o.type === 'gun') { offerText = `🔫 Piece for sale — ${$(o.price!)}`; offerCost = o.price!; }
  else if (o.type === 'coat') { offerText = `🧥 Bigger coat (+${o.space}) — ${$(o.price!)}`; offerCost = o.price!; }
  else if (o.type === 'rat') { offerText = `🐀 "${o.rat!.name}" wants to be your informant — ${$(o.rat!.cost)} (${o.rat!.personality})`; offerCost = o.rat!.cost; }
  else if (o.type === 'territory') { offerText = `🏴 Take over ${LOCS.find(l => l.id === o.locationId)?.name} — ${$(o.cost!)} (+${$(o.tribute!)}/day)`; offerCost = o.cost!; }
  else if (o.type === 'consignment') {
    const conGang = GANGS.find(g => g.id === o.gangId);
    const conDrug = DRUGS.find(d => d.id === o.drugId);
    offerText = `🤝 ${conGang?.name} offers ${o.quantity} ${conDrug?.emoji} ${conDrug?.name} on consignment — owe ${$(o.amountOwed!)} in 5 turns`;
    isFree = true;
  }

  // Consignment return cost warning
  let returnCostWarning: React.ReactNode = null;
  if (o.type === 'consignment' && o.originLocation) {
    const originRegion = getRegionForLocation(o.originLocation);
    const currentRegion = getRegionForLocation(cp.location);
    if (originRegion && currentRegion && originRegion.id !== currentRegion.id) {
      const returnCost = originRegion.id === 'nyc'
        ? Math.round(currentRegion.flyCost / 2)
        : originRegion.flyCost;
      const originLocName = LOCS.find(l => l.id === o.originLocation)?.name || o.originLocation;
      returnCostWarning = (
        <View style={styles.consignmentReturnWarning}>
          <Text style={styles.returnCostText}>{'\uD83D\uDCCD'} Return to {originLocName} costs {$(returnCost)} flight</Text>
          {cp.cash < returnCost + (o.amountOwed || 0) && (
            <Text style={styles.returnCostDanger}>{'\u26A0'} May not afford return + payment</Text>
          )}
        </View>
      );
    }
  }

  return (
    <View style={styles.offerBar}>
      <Text style={styles.offerText}>{offerText}</Text>
      {returnCostWarning}
      <View style={styles.offerButtons}>
        <TouchableOpacity onPress={acceptOffer} disabled={!isFree && cp.cash < offerCost} style={[styles.offerBtn, styles.acceptBtn]}>
          <Text style={styles.offerBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={declineOffer} style={[styles.offerBtn, styles.passBtn]}>
          <Text style={styles.offerBtnText}>Pass</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  statusIcons: { marginLeft: 'auto', flexDirection: 'row', gap: 3, alignItems: 'center' },
  terrCount: { fontSize: 10 },
  helpBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: { fontSize: 9, fontWeight: '800', color: colors.textDark },
  helpPanel: {
    marginHorizontal: 8,
    marginBottom: 4,
    padding: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(30,41,59,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  helpTitle: { fontSize: 8, fontWeight: '800', color: colors.yellow, letterSpacing: 1, marginTop: 6, marginBottom: 2 },
  helpText: { fontSize: 9, color: colors.textDim, lineHeight: 14 },
  helpItem: { fontSize: 8, color: colors.textMuted, paddingLeft: 6, lineHeight: 13 },
  helpClose: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    paddingVertical: 4,
    alignItems: 'center',
  },
  helpCloseText: { fontSize: 9, fontWeight: '700', color: colors.textDark, letterSpacing: 1 },
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
  fingerCount: { fontSize: 9, fontWeight: '700' },
  consignmentBar: {
    marginHorizontal: 8,
    marginBottom: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(234,179,8,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.15)',
  },
  consignmentUrgent: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  consignmentText: { fontSize: 10, fontWeight: '600', color: colors.yellow },
  debtWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  debtWarningText: { fontSize: 7, fontWeight: '700', color: colors.red },
  debtProjection: { fontSize: 7, color: colors.textMuted },
  consignmentReturnWarning: { marginBottom: 2 },
  returnCostText: { fontSize: 8, color: colors.textMuted },
  returnCostDanger: { fontSize: 8, color: colors.yellow, fontWeight: '600' },
  rivalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderRadius: 3,
    marginHorizontal: 8,
    marginBottom: 2,
  },
  rivalText: { fontSize: 8, color: '#6366f1' },
});
