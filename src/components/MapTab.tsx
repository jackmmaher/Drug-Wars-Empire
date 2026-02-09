import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, GANGS, DRUGS, REGIONS, LOCATIONS, getRank, getRegionForLocation, getRegionLocations, isRegionAvailable, FAVOR_FRIENDLY, FAVOR_TRUSTED, FAVOR_BLOOD } from '../constants/game';
import { useGameStore } from '../stores/gameStore';
import { inventoryCount } from '../lib/game-logic';
import type { CampaignLevel } from '../types/game';

function getRelationColor(rel: number, colors: any): string {
  if (rel >= FAVOR_BLOOD) return colors.red;
  if (rel >= FAVOR_TRUSTED) return colors.green;
  if (rel >= FAVOR_FRIENDLY) return colors.blue;
  if (rel >= -5) return colors.textDark;
  return colors.red;
}

function getRelationLabel(rel: number): string {
  if (rel >= FAVOR_BLOOD) return 'Blood Brother';
  if (rel >= FAVOR_TRUSTED) return 'Trusted';
  if (rel >= FAVOR_FRIENDLY) return 'Friendly';
  if (rel >= -5) return 'Neutral';
  return 'Hostile';
}

export function MapTab() {
  const { colors } = useTheme();
  const cp = useGameStore(s => s.player);
  const gameMode = useGameStore(s => s.gameMode);
  const travelAction = useGameStore(s => s.travel);

  const currentRegion = getRegionForLocation(cp.location);
  const regionLocs = currentRegion ? getRegionLocations(currentRegion.id) : [];
  const otherRegions = REGIONS.filter(r => r.id !== currentRegion?.id);
  const carryingUnits = inventoryCount(cp.inventory);
  const conOrigin = cp.consignment?.originLocation;
  const conOverdue = cp.consignment && cp.consignment.turnsLeft <= 0;
  const forecast = cp.forecast;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
      {/* Current Region */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, fontWeight: '600' }}>
          {currentRegion?.emoji} {currentRegion?.name?.toUpperCase() || 'NEW YORK'}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textDark, marginLeft: 8 }}>Free travel</Text>
        {forecast && forecast.regionId === currentRegion?.id && (
          <Text style={{ fontSize: 13, color: forecast.type === 'spike' ? colors.yellow : colors.teal, marginLeft: 8 }}>
            {forecast.type === 'spike' ? 'Rumors...' : 'Whispers...'}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {regionLocs.map(l => {
          const cur = l.id === cp.location;
          const own = !!cp.territories[l.id];
          const g = GANGS.find(x => x.turf.includes(l.id));
          const gangRel = g ? (cp.gangRelations[g.id] ?? 0) : 0;
          const relColor = g ? getRelationColor(gangRel, colors) : undefined;
          return (
            <TouchableOpacity
              key={l.id}
              onPress={() => travelAction(l.id)}
              disabled={cur}
              style={[
                {
                  width: '31%', borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 6,
                  alignItems: 'center',
                  borderColor: cur ? l.color + '35' : own ? '#22c55e22' : conOrigin === l.id ? (conOverdue ? '#ef444440' : '#eab30840') : l.color + '12',
                },
                cur && { backgroundColor: l.color + '15', borderWidth: 2, borderColor: l.color + '60' },
                own && !cur && { backgroundColor: 'rgba(34,197,94,0.04)' },
                conOrigin === l.id && !cur && { backgroundColor: conOverdue ? 'rgba(239,68,68,0.06)' : 'rgba(234,179,8,0.06)' },
                !cur && !own && conOrigin !== l.id && { backgroundColor: l.color + '06' },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 18, marginBottom: 1 }}>{l.emoji}</Text>
              <Text style={[
                { fontSize: 13, fontWeight: '600', color: colors.textDim, textAlign: 'center' },
                cur && { color: l.color, fontWeight: '800' },
              ]}>{l.name}</Text>
              {cur && <Text style={{ fontSize: 10, color: colors.textDark, fontWeight: '600' }}>YOU ARE HERE</Text>}

              {/* Service badges */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 2, justifyContent: 'center' }}>
                {l.bank && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9 }}>🏦</Text>
                    <Text style={{ fontSize: 9, color: colors.blueLight, fontWeight: '600' }}>Bank</Text>
                  </View>
                )}
                {l.shark && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9 }}>🦈</Text>
                    <Text style={{ fontSize: 9, color: colors.redLight, fontWeight: '600' }}>Shark</Text>
                  </View>
                )}
              </View>

              {/* Territory / Gang info */}
              {own && <Text style={{ fontSize: 11, color: colors.green, fontWeight: '600', marginTop: 2 }}>Your Territory</Text>}
              {g && !own && (
                <View style={{ alignItems: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 11, color: relColor }}>{g.emoji} {g.name.length > 12 ? g.name.split(' ').pop() : g.name}</Text>
                  <Text style={{ fontSize: 9, color: relColor, fontWeight: '600' }}>{getRelationLabel(gangRel)}</Text>
                </View>
              )}
              {conOrigin === l.id && (
                <Text style={[{ fontSize: 11, fontWeight: '700', color: colors.yellow, marginTop: 2 }, conOverdue && { color: colors.red }]}>Return here</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fly To */}
      <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, marginBottom: 6, fontWeight: '600' }}>FLY TO</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {otherRegions.map(r => {
          const isNyc = r.id === 'nyc';
          const regionAvailable = isRegionAvailable(cp.campaignLevel, r.id, gameMode);
          const flyCost = isNyc ? Math.round((currentRegion?.flyCost || 0) / 2) : r.flyCost;
          const repNeeded = isNyc ? 0 : r.rep;
          const ok = regionAvailable && cp.rep >= repNeeded;

          const customsRisk = carryingUnits > 0 ? Math.round(
            Math.max(0.05, Math.min(0.75,
              r.customsStrictness + carryingUnits * 0.002 + cp.heat * 0.002 - (cp.space > 100 ? 0.05 : 0)
            )) * 100
          ) : 0;

          // Build cheap/expensive drug lists from price multipliers
          const cheapDrugs = Object.entries(r.priceMultipliers)
            .filter(([, m]) => m < 0.7)
            .map(([id]) => DRUGS.find(d => d.id === id)?.name)
            .filter(Boolean);

          const neededRank = !isNyc ? getRank(repNeeded) : null;

          return (
            <TouchableOpacity
              key={r.id}
              onPress={() => {
                const targetLocs = getRegionLocations(r.id);
                if (targetLocs.length > 0) travelAction(targetLocs[0].id);
              }}
              disabled={!ok}
              style={[
                {
                  width: '48%', borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8,
                },
                ok ? {
                  backgroundColor: r.color + '06',
                  borderColor: r.color + '18',
                } : {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.border,
                  opacity: 0.3,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 18, marginBottom: 1 }}>{r.emoji}</Text>
              <Text style={[
                { fontSize: 13, fontWeight: '600', color: colors.textDim },
                !ok && { color: colors.textDarkest },
              ]}>{r.name}</Text>

              {/* Lock/unlock info */}
              {!regionAvailable && <Text style={{ fontSize: 12, color: colors.textDark }}>Unlocks in Level {r.id === 'colombia' || r.id === 'thailand' ? 2 : 3}</Text>}
              {regionAvailable && !ok && neededRank && (
                <Text style={{ fontSize: 12, color: colors.textDark }}>🔒 Requires {neededRank.emoji} {neededRank.name} ({repNeeded} rep)</Text>
              )}

              {/* Cost & travel time */}
              {ok && (
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {$(flyCost)} {'\u2022'} {isNyc ? (currentRegion?.travelDays || 2) : r.travelDays} days
                </Text>
              )}

              {/* Cheap drugs hint */}
              {ok && cheapDrugs.length > 0 && (
                <Text style={{ fontSize: 11, color: colors.green, marginTop: 2 }}>
                  Cheap: {cheapDrugs.join(', ')}
                </Text>
              )}

              {/* Price multiplier detail */}
              {ok && !isNyc && Object.keys(r.priceMultipliers).length > 0 && (
                <Text style={{ fontSize: 10, color: colors.textDark, marginTop: 1 }}>
                  {Object.entries(r.priceMultipliers).map(([d, m]) =>
                    `${DRUGS.find(x => x.id === d)?.emoji}${Math.round((1 - m) * 100)}%\u2193`
                  ).join(' ')}
                </Text>
              )}

              {/* Customs risk */}
              {ok && carryingUnits > 0 && (
                <View style={{ marginTop: 3 }}>
                  <Text style={{
                    fontSize: 11, fontWeight: '600',
                    color: customsRisk >= 50 ? colors.red : customsRisk >= 30 ? colors.yellow : colors.textMuted,
                  }}>
                    🛃 Customs: {customsRisk}% risk
                  </Text>
                  {r.contraband.length > 0 && (
                    <Text style={{ fontSize: 10, color: colors.textDark }}>
                      Contraband (2x): {r.contraband.map(id => DRUGS.find(d => d.id === id)?.name || '').filter(Boolean).join(', ')}
                    </Text>
                  )}
                </View>
              )}

              {/* Forecast */}
              {ok && forecast && forecast.regionId === r.id && (
                <Text style={{
                  fontSize: 11, fontWeight: '700', marginTop: 2,
                  color: forecast.type === 'spike' ? colors.yellow : colors.teal,
                }}>
                  {forecast.type === 'spike' ? 'Rumors of activity' : 'Market whispers'}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
