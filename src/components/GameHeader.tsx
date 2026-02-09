import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, STARTING_DEBT, LOCATIONS, RANKS, REGIONS, DRUGS, GANGS, PERSONAS, getRank, getRegionForLocation, getRegion, DAYS_PER_LEVEL, DEBT_INTEREST, BANK_INTEREST, LEVEL_CONFIGS, FAVOR_BLOOD } from '../constants/game';
import { inventoryCount, netWorth, effectiveSpace } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';
import { Bar } from './Bar';
import { MiniStat } from './MiniStat';
import { StatusIcon } from './StatusIcon';
import type { CampaignLevel } from '../types/game';

function getConsignmentColor(turnsLeft: number): string {
  if (turnsLeft >= 5) return '#22c55e';
  if (turnsLeft === 4) return '#84cc16';
  if (turnsLeft === 3) return '#eab308';
  if (turnsLeft === 2) return '#f97316';
  if (turnsLeft === 1) return '#ef4444';
  return '#dc2626';
}

export function GameHeader() {
  const { colors, mode, toggleTheme } = useTheme();
  const cp = useGameStore(s => s.player);

  // Streak badge state
  const [showBroke, setShowBroke] = useState(false);
  const prevStreakRef = useRef(cp.streak);

  useEffect(() => {
    if (prevStreakRef.current > 1 && cp.streak === 1) {
      setShowBroke(true);
      const timer = setTimeout(() => setShowBroke(false), 1500);
      return () => clearTimeout(timer);
    }
    prevStreakRef.current = cp.streak;
  }, [cp.streak]);

  // Consignment fuse pulse animation
  const fuseOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (cp.consignment && cp.consignment.turnsLeft <= 1) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(fuseOpacity, { toValue: 0.6, duration: 500, useNativeDriver: true }),
          Animated.timing(fuseOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      fuseOpacity.setValue(1);
    }
  }, [cp.consignment?.turnsLeft]);
  const gameMode = useGameStore(s => s.gameMode);
  const campaign = useGameStore(s => s.campaign);
  const subPanel = useGameStore(s => s.subPanel);
  const setSubPanel = useGameStore(s => s.setSubPanel);
  const daysLimit = DAYS_PER_LEVEL;

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
  const persona = cp.personaId ? PERSONAS.find(p => p.id === cp.personaId) : null;
  const loanGang = cp.gangLoan ? GANGS.find(g => g.id === cp.gangLoan!.gangId) : null;
  const missionGang = cp.gangMission ? GANGS.find(g => g.id === cp.gangMission!.gangId) : null;
  const terrCount = Object.keys(cp.territories).length;

  return (
    <View>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Left: Day + Cash */}
          <View>
            <Text style={{ fontSize: 11, color: colors.textDark, letterSpacing: 1, fontWeight: '600' }}>
              {gameMode === 'campaign' && <Text style={{ color: colors.yellow, fontWeight: '800' }}>L{campaign.level} </Text>}
              DAY {Math.min(cp.day, daysLimit)}/{daysLimit}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: colors.white }}>{$(cp.cash)}</Text>
              {showBroke ? (
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#ef4444' }}>BROKE</Text>
              ) : cp.streak >= 5 ? (
                <View style={{
                  backgroundColor: 'rgba(251,191,36,0.2)', borderColor: '#fbbf24',
                  borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
                  shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#fbbf24' }}>{cp.streak}x</Text>
                </View>
              ) : cp.streak === 4 ? (
                <View style={{
                  backgroundColor: 'rgba(249,115,22,0.15)', borderColor: '#f97316',
                  borderWidth: 1, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#f97316' }}>4x</Text>
                </View>
              ) : cp.streak === 3 ? (
                <View style={{
                  backgroundColor: 'rgba(245,158,11,0.12)', borderColor: '#f59e0b',
                  borderWidth: 1, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 1,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#f59e0b' }}>3x</Text>
                </View>
              ) : cp.streak === 2 ? (
                <View style={{
                  backgroundColor: 'rgba(34,197,94,0.1)', borderColor: '#22c55e',
                  borderWidth: 1, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 1,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#22c55e' }}>2x</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: 11, color: colors.textDark }}>Cash on hand</Text>
          </View>
          {/* Right: Rank + Net Worth */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: colors.textDark, letterSpacing: 1, fontWeight: '600' }}>
              {rank.emoji} {rank.name.toUpperCase()}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: nw > 0 ? colors.green : colors.red }}>{$(nw)}</Text>
            <Text style={{ fontSize: 11, color: colors.textDark }}>Net worth</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 4, marginVertical: 5 }}>
          <MiniStat label="DEBT" value={$(cp.debt)} color={cp.debt > STARTING_DEBT * 2 ? colors.red : cp.debt > 0 ? colors.orange : colors.green} />
          <MiniStat label="BANK" value={$(cp.bank)} color={colors.blue} />
          <MiniStat label="SPACE" value={`${free}/${espce}`} color={free < 15 ? colors.yellow : colors.textMuted} />
          <MiniStat label="REP" value={cp.rep} color={colors.purple} />
        </View>

        {cp.debt > STARTING_DEBT * 3 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.red }}>{'\u26A0'} Debt compounding!</Text>
            {cp.day < daysLimit && (
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{'\u2192'} ~{$(Math.round(cp.debt * Math.pow(1 + DEBT_INTEREST, daysLimit - cp.day)))} by D{daysLimit}</Text>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 4 }}>
          <View style={{ flex: 1 }}>
            <Bar label="HEAT" percent={cp.heat} color={cp.heat < 30 ? colors.green : cp.heat < 60 ? colors.yellow : colors.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Bar label="HP" percent={cp.hp} color={cp.hp > 60 ? colors.green : cp.hp > 30 ? colors.yellow : colors.red} />
          </View>
        </View>

        {cp.newMilestone && (
          <Text style={{ textAlign: 'center', fontSize: 13, color: colors.yellow, fontWeight: '800' }}>
            {cp.newMilestone.emoji} {cp.newMilestone.label}!
          </Text>
        )}

        {/* Day progress bar */}
        <View style={{ height: 4, backgroundColor: colors.trackBg, borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
          <View style={[
            { height: '100%', width: `${Math.min(cp.day / daysLimit * 100, 100)}%` },
            cp.day > daysLimit - 5 ? { backgroundColor: colors.red } : { backgroundColor: colors.blue },
          ]} />
        </View>

        {/* Campaign milestone bar */}
        {gameMode === 'campaign' && (
          <MilestoneBar level={campaign.level as CampaignLevel} player={cp} campaign={campaign} colors={colors} />
        )}
      </View>

      {/* Location */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, flex: 1 }} numberOfLines={1}>
          {isAbroad ? `${region.emoji} ${region.name} > ` : ''}{loc?.emoji} {loc?.name}
        </Text>
        {cp.territories[cp.location] && (
          <Text style={{ fontSize: 12, color: colors.green, fontWeight: '600' }}>+{$(cp.territories[cp.location].tribute)}/d</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
          {persona && (
            <StatusIcon icon={persona.emoji} value="" label={persona.name.split(' ').pop() || ''} color={colors.textDim} />
          )}
          {cp.gun && (
            <StatusIcon icon="🔫" value="" label="Armed" color={colors.green}
              helpText="Improves fight odds (+20%) and run chance (+17%). Lost if fingers drop to 4." />
          )}
          {cp.rat.hired && cp.rat.alive && (
            <StatusIcon icon="🐀" value="" label="Intel" color={colors.purpleLight}
              helpText={`${cp.rat.name} — Loyalty: ${cp.rat.loyalty}%. Pay to keep them loyal. Low loyalty = they flip.`} />
          )}
          {terrCount > 0 && (
            <StatusIcon icon="🏴" value={terrCount} label="Turf" color={colors.green}
              helpText={`${terrCount} territories earning ${$(cp.tributePerDay)}/day tribute.`} />
          )}
          {cp.fingers < 10 && (
            <StatusIcon
              icon="✋"
              value={`${cp.fingers}`}
              label="Fingers"
              color={cp.fingers <= 4 ? colors.red : cp.fingers <= 6 ? colors.yellow : colors.orangeLight}
              helpText={`${cp.fingers}/10 fingers. Lost: -${(10 - cp.fingers) * 5} space, -${(10 - cp.fingers) * 3}% sell.${cp.fingers <= 6 ? ' +1 travel day.' : ''}${cp.fingers <= 4 ? ' Can\'t hold a gun.' : ''}`}
            />
          )}
          {cp.personaMission && !cp.personaMission.failed && (
            <StatusIcon
              icon={cp.personaMission.completed ? "✅" : persona?.emoji || "🎯"}
              value={cp.personaMission.completed ? "" : `${cp.personaMission.personaId === 'housewife' ? $(cp.personaMission.progress) : cp.personaMission.progress}/${cp.personaMission.personaId === 'housewife' ? $(cp.personaMission.target) : cp.personaMission.target}`}
              label={cp.personaMission.completed ? "Done" : "Mission"}
              color={cp.personaMission.completed ? colors.green : colors.purpleLight}
            />
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

      {/* Consignment status bar with fuse */}
      {cp.consignment && conGang && (() => {
        const turnsLeft = cp.consignment!.turnsLeft;
        const totalTurns = 5;
        const fillPct = Math.max(0, Math.min(turnsLeft / totalTurns, 1)) * 100;
        const fuseColor = getConsignmentColor(turnsLeft);
        const isOverdue = turnsLeft <= 0;
        const isCritical = turnsLeft <= 1;

        return (
          <View style={[
            {
              marginHorizontal: 12, marginBottom: 3, paddingVertical: 6, paddingHorizontal: 10,
              borderRadius: 6, borderWidth: 1,
            },
            isOverdue
              ? { backgroundColor: 'rgba(220,38,38,0.12)', borderColor: 'rgba(220,38,38,0.3)' }
              : isCritical
              ? { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }
              : { backgroundColor: 'rgba(234,179,8,0.06)', borderColor: 'rgba(234,179,8,0.15)' },
          ]}>
            {/* Fuse bar */}
            <Animated.View style={{ opacity: isCritical ? fuseOpacity : 1, marginBottom: 4 }}>
              <View style={{
                height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden',
              }}>
                <View style={{
                  height: '100%', width: `${fillPct}%`, backgroundColor: fuseColor, borderRadius: 4,
                }} />
              </View>
            </Animated.View>
            <Text style={{
              fontSize: 13, fontWeight: '600',
              color: isOverdue ? '#dc2626' : isCritical ? colors.red : colors.yellow,
            }}>
              {isOverdue ? '\uD83D\uDC80 ' : ''}Owe {conGang.name} {$(cp.consignment!.amountOwed - cp.consignment!.amountPaid)} {'\u2022'} {turnsLeft > 0 ? `${turnsLeft} turn${turnsLeft !== 1 ? 's' : ''}` : 'OVERDUE!'} {'\u2022'} Return to {conLoc?.name || '???'}
            </Text>
          </View>
        );
      })()}

      {/* Gang Loan status bar */}
      {cp.gangLoan && loanGang && (
        <View style={[
          {
            marginHorizontal: 12, marginBottom: 3, paddingVertical: 5, paddingHorizontal: 10,
            borderRadius: 6, backgroundColor: 'rgba(234,179,8,0.06)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.15)',
          },
          cp.gangLoan.turnsLeft <= 1 && { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' },
        ]}>
          <Text style={{
            fontSize: 13, fontWeight: '600',
            color: cp.gangLoan.turnsLeft <= 1 ? colors.red : '#fbbf24',
          }}>
            {loanGang.emoji} Loan: {$(cp.gangLoan.amountOwed - cp.gangLoan.amountPaid)} {'\u2022'} {cp.gangLoan.turnsLeft > 0 ? `${cp.gangLoan.turnsLeft} turn${cp.gangLoan.turnsLeft !== 1 ? 's' : ''}` : 'OVERDUE!'} {'\u2022'} 15%/turn
          </Text>
        </View>
      )}

      {/* Mission status bar */}
      {cp.gangMission && missionGang && (
        <View style={{
          marginHorizontal: 12, marginBottom: 3, paddingVertical: 5, paddingHorizontal: 10,
          borderRadius: 6, backgroundColor: 'rgba(99,102,241,0.06)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
        }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.indigoLight }}>
            {missionGang.emoji} Mission: {cp.gangMission.description} {'\u2022'} {cp.gangMission.turnsLeft} turn{cp.gangMission.turnsLeft !== 1 ? 's' : ''}
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
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>Visit a capital city (marked with Bank/Shark) to deposit cash at {(BANK_INTEREST * 100).toFixed(1)}%/day interest, or borrow from the shark at {(DEBT_INTEREST * 100)}%/day. Every region's capital has both.</Text>

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
            <Text style={{ fontSize: 14, color: colors.textDim, lineHeight: 20 }}>At 10+ rep you may meet a rat who gives price tips. Pay them to keep loyalty up -- low loyalty = they flip on you. Tips predict future market events! Higher intel = more accurate.</Text>
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
            marginHorizontal: 12, marginBottom: 3, paddingVertical: 5, paddingHorizontal: 10,
            borderRadius: 6, borderWidth: 1,
          },
          cp.currentEvent.type === 'spike'
            ? { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)' }
            : { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.15)' },
        ]}>
          <Text style={{
            fontSize: 13, fontWeight: '600',
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
          marginHorizontal: 12, marginBottom: 3, paddingVertical: 5, paddingHorizontal: 10,
          borderRadius: 6, backgroundColor: 'rgba(249,115,22,0.06)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)',
        }}>
          <Text style={{ fontSize: 13, color: colors.orangeLight }}>
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

// ── Campaign Milestone Bar ──────────────────────────────
function MilestoneBar({ level, player, campaign, colors }: {
  level: CampaignLevel;
  player: any;
  campaign: any;
  colors: any;
}) {
  const config = LEVEL_CONFIGS[level];
  const wc = config.winCondition;
  const nw = netWorth(player);
  const terrCount = Object.keys(player.territories).length;
  const hasBloodBrother = Object.values(player.gangRelations).some((v: any) => v >= FAVOR_BLOOD);
  const defeatedCount = campaign.gangWar?.defeatedGangs?.length || 0;

  const objectives: Array<{ label: string; done: boolean }> = [];

  if (wc.minNetWorth > 0) objectives.push({ label: `${$(wc.minNetWorth)} NW`, done: nw >= wc.minNetWorth });
  if (wc.debtFree) objectives.push({ label: 'Debt Free', done: player.debt <= 0 });
  if (wc.bloodBrother) objectives.push({ label: 'Blood Brother', done: hasBloodBrother });
  if (wc.minTerritories) objectives.push({ label: `${wc.minTerritories} Territories`, done: terrCount >= wc.minTerritories });
  if (wc.minRep) objectives.push({ label: 'Drug Lord', done: player.rep >= wc.minRep });
  if (wc.defeatedGangs) objectives.push({ label: `${wc.defeatedGangs} Gangs Defeated`, done: defeatedCount >= wc.defeatedGangs });

  return (
    <View style={{
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 4,
      paddingVertical: 2,
      paddingHorizontal: 2,
    }}>
      {objectives.map((obj, i) => (
        <View key={i} style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          backgroundColor: obj.done ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
          borderRadius: 4,
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderWidth: 1,
          borderColor: obj.done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
        }}>
          <Text style={{ fontSize: 10, color: obj.done ? colors.green : colors.textDark }}>
            {obj.done ? '\u2713' : '\u2717'}
          </Text>
          <Text style={{
            fontSize: 10,
            fontWeight: '600',
            color: obj.done ? colors.green : colors.textDark,
          }}>
            {obj.label}
          </Text>
        </View>
      ))}
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
  } else if (o.type === 'mission' && o.mission) {
    const mGang = GANGS.find(g => g.id === o.gangId);
    offerText = `${mGang?.emoji || '🎖️'} ${mGang?.name} mission: ${o.mission.description}`;
    if (o.mission.type === 'tribute' && o.mission.cashAmount) {
      offerCost = o.mission.cashAmount;
    } else {
      isFree = true;
    }
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
      marginHorizontal: 12, marginBottom: 3, paddingVertical: 5, paddingHorizontal: 10,
      borderRadius: 6, backgroundColor: 'rgba(99,102,241,0.06)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
    }}>
      <Text style={{ fontSize: 13, color: colors.indigoLight, fontWeight: '600', marginBottom: 3 }}>{offerText}</Text>
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
