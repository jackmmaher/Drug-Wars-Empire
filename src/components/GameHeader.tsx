import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, DAYS, STARTING_DEBT, LOCATIONS, RANKS, REGIONS, DRUGS, GANGS, getRank, getRegionForLocation, getRegion } from '../constants/game';
import { inventoryCount, netWorth, effectiveSpace } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';
import { Bar } from './Bar';
import { MiniStat } from './MiniStat';

export function GameHeader() {
  const { colors, mode, toggleTheme } = useTheme();
  const cp = useGameStore(s => s.player);
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

  return (
    <View>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 13, color: colors.textDark, letterSpacing: 2, fontWeight: '600' }}>DAY {Math.min(cp.day, DAYS)}/{DAYS}</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: colors.white, lineHeight: 34 }}>{$(cp.cash)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>{rank.emoji} {rank.name.toUpperCase()}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: nw > 0 ? colors.green : colors.red }}>{$(nw)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
          <MiniStat label="DEBT" value={$(cp.debt)} color={cp.debt > STARTING_DEBT * 2 ? colors.red : cp.debt > 0 ? colors.orange : colors.green} />
          <MiniStat label="BANK" value={$(cp.bank)} color={colors.blue} />
          <MiniStat label="SPACE" value={`${free}/${espce}`} color={free < 15 ? colors.yellow : colors.textMuted} />
          <MiniStat label="REP" value={cp.rep} color={colors.purple} />
        </View>

        {cp.debt > STARTING_DEBT * 3 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.red }}>{'\u26A0'} Debt compounding!</Text>
            {cp.day < DAYS && (
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{'\u2192'} ~{$(Math.round(cp.debt * Math.pow(1.1, DAYS - cp.day)))} by D{DAYS}</Text>
            )}
          </View>
        )}

        <Bar label="HEAT" percent={cp.heat} color={cp.heat < 30 ? colors.green : cp.heat < 60 ? colors.yellow : colors.red} />
        <Bar label="HP" percent={cp.hp} color={cp.hp > 60 ? colors.green : cp.hp > 30 ? colors.yellow : colors.red} />

        {cp.streak > 1 && (
          <Text style={{ textAlign: 'center', fontSize: 14, color: colors.yellow, fontWeight: '700', marginVertical: 3 }}>
            {cp.streak}x STREAK {cp.combo > 1.5 ? '-- rep bonus!' : ''}
          </Text>
        )}

        {cp.newMilestone && (
          <Text style={{ textAlign: 'center', fontSize: 15, color: colors.yellow, fontWeight: '800' }}>
            MILESTONE: {cp.newMilestone.emoji} {cp.newMilestone.label}!
          </Text>
        )}

        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: colors.trackBg, borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
          <View style={[
            { height: '100%', width: `${Math.min(cp.day / DAYS * 100, 100)}%` },
            cp.day > 25 ? { backgroundColor: colors.red } : { backgroundColor: colors.blue },
          ]} />
        </View>
      </View>

      {/* Location */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 16 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: loc?.color }} />
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
          {isAbroad ? `${region.emoji} ${region.name} > ` : ''}{loc?.emoji} {loc?.name}
        </Text>
        {cp.territories[cp.location] && (
          <Text style={{ fontSize: 13, color: colors.green, fontWeight: '600' }}>+{$(cp.territories[cp.location].tribute)}/d</Text>
        )}
        <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {cp.gun && <Text style={{ fontSize: 16 }}>🔫</Text>}
          {cp.rat.hired && cp.rat.alive && <Text style={{ fontSize: 16 }}>🐀</Text>}
          {Object.keys(cp.territories).length > 0 && (
            <Text style={{ fontSize: 14 }}>{Object.keys(cp.territories).length}🏴</Text>
          )}
          {cp.fingers < 10 && (
            <Text style={{
              fontSize: 13, fontWeight: '700',
              color: cp.fingers <= 4 ? colors.red : cp.fingers <= 6 ? colors.yellow : colors.orangeLight,
            }}>
              {cp.fingers}/10
            </Text>
          )}
          {/* Theme toggle */}
          <TouchableOpacity onPress={toggleTheme} style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: colors.bgCardHover,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 16 }}>{mode === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSubPanel('help')} style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: colors.bgCardHover,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textDim }}>?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Consignment status bar */}
      {cp.consignment && conGang && (
        <View style={[
          {
            marginHorizontal: 12, marginBottom: 4, paddingVertical: 8, paddingHorizontal: 12,
            borderRadius: 6, backgroundColor: 'rgba(234,179,8,0.06)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.15)',
          },
          cp.consignment.turnsLeft <= 1 && { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' },
        ]}>
          <Text style={{
            fontSize: 14, fontWeight: '600',
            color: cp.consignment.turnsLeft <= 1 ? colors.red : colors.yellow,
          }}>
            Owe {conGang.name} {$(cp.consignment.amountOwed - cp.consignment.amountPaid)} {'\u2022'} {cp.consignment.turnsLeft > 0 ? `${cp.consignment.turnsLeft} turn${cp.consignment.turnsLeft !== 1 ? 's' : ''}` : 'OVERDUE!'} {'\u2022'} Return to {conLoc?.name || '???'}
          </Text>
        </View>
      )}

      {/* Help panel */}
      {subPanel === 'help' && (
        <View style={{
          marginHorizontal: 12, marginBottom: 6, padding: 14, borderRadius: 8,
          backgroundColor: colors.helpPanelBg, borderWidth: 1, borderColor: colors.helpPanelBorder,
        }}>
          <ScrollView style={{ maxHeight: 360 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.yellow, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>HOW TO PLAY</Text>
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>Buy low, sell high. Travel between cities to find better prices. Pay off your debt before day 30.</Text>

            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.yellow, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>BANK & SHARK</Text>
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>Visit a capital city (marked with bank/shark) to deposit cash at 5%/day interest, or borrow from the shark at 10%/day. Every region's capital has both.</Text>

            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.yellow, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>HEAT & COPS</Text>
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>Buying and selling raises heat (max 100). High heat = more cop encounters (max 65%). Each region has different police forces with unique behaviors. Bribe, run, or fight your way out.</Text>

            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.yellow, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>REPUTATION</Text>
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>Earn rep by making profitable trades. Higher rep unlocks international regions and new ranks:</Text>
            {RANKS.map(r => (
              <Text key={r.name} style={{ fontSize: 13, color: colors.textMuted, paddingLeft: 8, lineHeight: 20 }}>{r.emoji} {r.name} -- {r.rep} rep</Text>
            ))}

            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.yellow, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>INTERNATIONAL TRAVEL</Text>
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>Fly to other regions for cheaper drugs. Each has 6 cities, a local gang, and unique price discounts. Return to NYC costs half price.</Text>
            {REGIONS.filter(r => r.id !== 'nyc').map(r => (
              <Text key={r.id} style={{ fontSize: 13, color: colors.textMuted, paddingLeft: 8, lineHeight: 20 }}>
                {r.emoji} {r.name} -- {r.rep} rep, ${r.flyCost.toLocaleString()} flight{'\n'}
                {'   '}{Object.entries(r.priceMultipliers).map(([d, m]) =>
                  `${DRUGS.find(x => x.id === d)?.name} -${Math.round((1 - m) * 100)}%`
                ).join(', ')}
              </Text>
            ))}

            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.yellow, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>CUSTOMS</Text>
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>Flying between regions with drugs risks customs checks. Detection depends on destination strictness, amount carried, and heat. Contraband drugs are detected at 2x rate. Getting caught = drugs confiscated + fine.</Text>

            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.yellow, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>GANGS & TERRITORY</Text>
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>Some cities are gang turf. Trade there to build relations. At 25+ rep you can claim territory for daily tribute income. Bad relations = taxes.</Text>

            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.yellow, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>CONSIGNMENT</Text>
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>Gangs may offer drugs on credit (2x markup). You have 5 turns to sell and repay. Return to the gang's turf to settle. Pay 100% on time = respect. Partial = lose a finger. Late or short = worse. Don't pay? Bounty hunters come for you.</Text>
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>Each lost finger: -5 inventory space, -3% sell revenue. At 6 fingers: +1 travel day. At 4: lose your gun. At 0: game over.</Text>

            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.yellow, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>INFORMANTS</Text>
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>At 10+ rep you may meet a rat who gives price tips. Pay them to keep loyalty up -- low loyalty = they flip on you. Tips now predict future market events! Higher intel = more accurate.</Text>
          </ScrollView>
          <TouchableOpacity onPress={() => setSubPanel(null)} style={{
            marginTop: 8, backgroundColor: colors.bgCardHover, borderRadius: 5, paddingVertical: 8, alignItems: 'center',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textDim, letterSpacing: 1 }}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Event */}
      {cp.currentEvent && (
        <View style={[
          {
            marginHorizontal: 12, marginBottom: 4, paddingVertical: 8, paddingHorizontal: 12,
            borderRadius: 6, borderWidth: 1,
          },
          cp.currentEvent.type === 'spike'
            ? { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)' }
            : { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.15)' },
        ]}>
          <Text style={{
            fontSize: 14, fontWeight: '600',
            color: cp.currentEvent.type === 'spike' ? colors.redLight : colors.greenLight,
          }}>
            {cp.currentEvent.type === 'spike' ? '\uD83D\uDCC8' : '\uD83D\uDCC9'}{' '}
            {cp.currentEvent.regionId ? `${getRegion(cp.currentEvent.regionId)?.emoji || ''} ` : ''}
            {cp.currentEvent.message}
          </Text>
        </View>
      )}

      {/* Near miss */}
      {cp.nearMisses.length > 0 && (
        <View style={{
          marginHorizontal: 12, marginBottom: 4, paddingVertical: 8, paddingHorizontal: 12,
          borderRadius: 6, backgroundColor: 'rgba(249,115,22,0.06)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)',
        }}>
          <Text style={{ fontSize: 14, color: colors.orangeLight }}>
            <Text style={{ fontWeight: '700' }}>{cp.nearMisses[0].type === 'sold_early' ? 'Sold too early!' : 'Near miss!'}</Text>{' '}
            {cp.nearMisses[0].drug.emoji} {cp.nearMisses[0].drug.name} {cp.nearMisses[0].type === 'sold_early' ? 'jumped to' : 'spiked to'} {$(cp.nearMisses[0].currentPrice)} -- {cp.nearMisses[0].type === 'sold_early' ? 'you just sold' : 'you had'} {cp.nearMisses[0].quantity}! Missed {$(cp.nearMisses[0].missedProfit)}!
          </Text>
        </View>
      )}

      {/* Offer */}
      {cp.offer && <OfferBanner />}
    </View>
  );
}

function OfferBanner() {
  const { colors } = useTheme();
  const cp = useGameStore(s => s.player);
  const acceptOffer = useGameStore(s => s.acceptOffer);
  const declineOffer = useGameStore(s => s.declineOffer);
  const o = cp.offer!;

  const LOCS = LOCATIONS;
  let offerText = '';
  let offerCost = 0;
  let isFree = false;
  if (o.type === 'gun') { offerText = `Piece for sale -- ${$(o.price!)}`; offerCost = o.price!; }
  else if (o.type === 'coat') { offerText = `Bigger coat (+${o.space}) -- ${$(o.price!)}`; offerCost = o.price!; }
  else if (o.type === 'rat') { offerText = `"${o.rat!.name}" wants to be your informant -- ${$(o.rat!.cost)} (${o.rat!.personality})`; offerCost = o.rat!.cost; }
  else if (o.type === 'territory') { offerText = `Take over ${LOCS.find(l => l.id === o.locationId)?.name} -- ${$(o.cost!)} (+${$(o.tribute!)}/day)`; offerCost = o.cost!; }
  else if (o.type === 'consignment') {
    const conGang = GANGS.find(g => g.id === o.gangId);
    const conDrug = DRUGS.find(d => d.id === o.drugId);
    offerText = `${conGang?.name} offers ${o.quantity} ${conDrug?.emoji} ${conDrug?.name} on consignment -- owe ${$(o.amountOwed!)} in 5 turns`;
    isFree = true;
  }

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
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Return to {originLocName} costs {$(returnCost)} flight</Text>
          {cp.cash < returnCost + (o.amountOwed || 0) && (
            <Text style={{ fontSize: 13, color: colors.yellow, fontWeight: '600' }}>{'\u26A0'} May not afford return + payment</Text>
          )}
        </View>
      );
    }
  }

  return (
    <View style={{
      marginHorizontal: 12, marginBottom: 4, paddingVertical: 8, paddingHorizontal: 12,
      borderRadius: 6, backgroundColor: 'rgba(99,102,241,0.06)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
    }}>
      <Text style={{ fontSize: 15, color: colors.indigoLight, fontWeight: '600', marginBottom: 4 }}>{offerText}</Text>
      {returnCostWarning}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={acceptOffer} disabled={!isFree && cp.cash < offerCost} style={{
          borderRadius: 5, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.indigoDark,
        }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={declineOffer} style={{
          borderRadius: 5, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.cardBorder,
        }}>
          <Text style={{ color: colors.textDim, fontSize: 14, fontWeight: '700' }}>Pass</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
