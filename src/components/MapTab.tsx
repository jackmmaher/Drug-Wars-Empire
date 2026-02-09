import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, GANGS, DRUGS, REGIONS, LOCATIONS, getRegionForLocation, getRegionLocations } from '../constants/game';
import { useGameStore } from '../stores/gameStore';
import { inventoryCount } from '../lib/game-logic';

export function MapTab() {
  const { colors } = useTheme();
  const cp = useGameStore(s => s.player);
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
          return (
            <TouchableOpacity
              key={l.id}
              onPress={() => travelAction(l.id)}
              disabled={cur}
              style={[
                {
                  width: '31%', borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 6,
                  alignItems: 'center',
                  borderColor: cur ? l.color + '35' : own ? '#22c55e22' : conOrigin === l.id ? (conOverdue ? '#ef444440' : '#eab30840') : l.color + '12',
                },
                cur && { backgroundColor: l.color + '15', opacity: 0.5 },
                own && !cur && { backgroundColor: 'rgba(34,197,94,0.04)' },
                conOrigin === l.id && !cur && { backgroundColor: conOverdue ? 'rgba(239,68,68,0.06)' : 'rgba(234,179,8,0.06)' },
                !cur && !own && conOrigin !== l.id && { backgroundColor: l.color + '06' },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 20, marginBottom: 2 }}>{l.emoji}</Text>
              <Text style={[
                { fontSize: 14, fontWeight: '600', color: colors.textDim, textAlign: 'center' },
                cur && { color: l.color, fontWeight: '800' },
              ]}>{l.name}</Text>
              {own && <Text style={{ fontSize: 12, color: colors.green }}>Yours</Text>}
              {g && !own && <Text style={{ fontSize: 12, color: g.color }}>{g.emoji}</Text>}
              {conOrigin === l.id && (
                <Text style={[{ fontSize: 11, fontWeight: '700', color: colors.yellow }, conOverdue && { color: colors.red }]}>Return here</Text>
              )}
              {l.bank && <Text style={{ fontSize: 11, color: colors.textDim }}>Bank/Shark</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fly To */}
      <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, marginBottom: 6, fontWeight: '600' }}>FLY TO</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {otherRegions.map(r => {
          const isNyc = r.id === 'nyc';
          const flyCost = isNyc ? Math.round((currentRegion?.flyCost || 0) / 2) : r.flyCost;
          const repNeeded = isNyc ? 0 : r.rep;
          const ok = cp.rep >= repNeeded;

          const customsRisk = carryingUnits > 0 ? Math.round(
            Math.max(0.05, Math.min(0.75,
              r.customsStrictness + carryingUnits * 0.002 + cp.heat * 0.002 - (cp.space > 100 ? 0.05 : 0)
            )) * 100
          ) : 0;

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
                  width: '48%', borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 10,
                  alignItems: 'center',
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
              <Text style={{ fontSize: 20, marginBottom: 2 }}>{r.emoji}</Text>
              <Text style={[
                { fontSize: 14, fontWeight: '600', color: colors.textDim },
                !ok && { color: colors.textDarkest },
              ]}>{r.name}</Text>
              {!ok && <Text style={{ fontSize: 12, color: colors.textDark }}>Locked {repNeeded} rep</Text>}
              {ok && <Text style={{ fontSize: 12, color: colors.textMuted }}>{$(flyCost)} {'\u2022'} {isNyc ? (currentRegion?.travelDays || 2) : r.travelDays}d</Text>}
              {ok && !isNyc && Object.keys(r.priceMultipliers).length > 0 && (
                <Text style={{ fontSize: 11, color: colors.textDim }}>
                  {Object.entries(r.priceMultipliers).map(([d, m]) =>
                    `${DRUGS.find(x => x.id === d)?.emoji}${Math.round((1 - m) * 100)}%\u2193`
                  ).join(' ')}
                </Text>
              )}
              {ok && carryingUnits > 0 && (
                <Text style={{
                  fontSize: 11, fontWeight: '600', marginTop: 2,
                  color: customsRisk >= 50 ? colors.red : customsRisk >= 30 ? colors.yellow : colors.textMuted,
                }}>
                  Customs {customsRisk}% risk
                  {r.contraband.length > 0 && (
                    ` ${'\u2022'} ${r.contraband.map(id => DRUGS.find(d => d.id === id)?.emoji || '').join('')} 2x`
                  )}
                </Text>
              )}
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
