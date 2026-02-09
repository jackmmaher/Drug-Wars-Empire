import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, GANGS, MILESTONES, LOCATIONS, DRUGS, CONSIGNMENT_TURNS } from '../constants/game';
import { useGameStore } from '../stores/gameStore';
import { Bar } from './Bar';

export function IntelTab() {
  const { colors } = useTheme();
  const cp = useGameStore(s => s.player);
  const payRatAction = useGameStore(s => s.payRat);
  const payConsignmentAction = useGameStore(s => s.payConsignment);

  const pendingTip = cp.rat.pendingTip;
  const tipDrug = pendingTip ? DRUGS.find(d => d.id === pendingTip.drugId) : null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
      {/* Rat */}
      <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, marginBottom: 6, fontWeight: '600' }}>INFORMANT</Text>
      {cp.rat.hired && cp.rat.alive ? (
        <View style={{
          backgroundColor: 'rgba(124,58,237,0.04)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.12)',
          borderRadius: 8, padding: 10,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.purpleLight }}>{cp.rat.name}</Text>
            <Text style={{
              fontSize: 13,
              color: cp.rat.loyalty > 60 ? colors.green : cp.rat.loyalty > 30 ? colors.yellow : colors.red,
            }}>
              {cp.rat.personality} {'\u2022'} {cp.rat.loyalty}%
            </Text>
          </View>
          <Bar
            percent={cp.rat.loyalty}
            color={cp.rat.loyalty > 60 ? colors.purpleDark : cp.rat.loyalty > 30 ? colors.yellow : colors.red}
          />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginVertical: 4 }}>
            Intel: {'\u2B50'.repeat(cp.rat.intel)} {'\u2022'} Tips: {cp.rat.tips}
          </Text>

          {/* Pending Tip */}
          {pendingTip && tipDrug && (
            <View style={{
              backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: 6, padding: 8, marginVertical: 4,
              borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.purpleLight, marginBottom: 3 }}>{cp.rat.name} says:</Text>
              <Text style={{ fontSize: 14, color: colors.purpleLight, fontStyle: 'italic' }}>
                "{tipDrug.emoji} {tipDrug.name} gonna {pendingTip.direction === 'spike' ? 'explode' : 'crash'} soon..."
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 13, color: colors.yellow, fontWeight: '600' }}>
                  {'\u2B50'.repeat(pendingTip.confidence)} {pendingTip.confidence >= 3 ? 'HIGH' : pendingTip.confidence >= 2 ? 'MED' : 'LOW'}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  ~{pendingTip.turnsUntil > 0 ? `${pendingTip.turnsUntil} turn${pendingTip.turnsUntil > 1 ? 's' : ''}` : 'now!'}
                </Text>
              </View>
            </View>
          )}

          {cp.rat.loyalty < 40 && (
            <Text style={{ fontSize: 14, color: colors.red, fontWeight: '600' }}>Might flip!</Text>
          )}
          <TouchableOpacity
            style={[
              { backgroundColor: '#6d28d9', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 12, marginTop: 4, alignSelf: 'flex-start' },
              cp.cash < 150 && { opacity: 0.4 },
            ]}
            onPress={payRatAction}
            disabled={cp.cash < 150}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Pay ($150){!pendingTip ? ' -- may get intel' : ''}</Text>
          </TouchableOpacity>
        </View>
      ) : cp.rat.hired ? (
        <Text style={{ fontSize: 14, color: colors.red, padding: 10 }}>{cp.rat.name} sold you out.</Text>
      ) : (
        <Text style={{ fontSize: 14, color: colors.textDark, padding: 10 }}>No informant yet.</Text>
      )}

      {/* Consignment */}
      {cp.consignment && (() => {
        const con = cp.consignment!;
        const conGang = GANGS.find(g => g.id === con.gangId);
        const conDrug = DRUGS.find(d => d.id === con.drugId);
        const conLoc = LOCATIONS.find(l => l.id === con.originLocation);
        return (
          <>
            <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, marginTop: 10, marginBottom: 6, fontWeight: '600' }}>CONSIGNMENT</Text>
            <View style={{
              backgroundColor: 'rgba(234,179,8,0.04)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.12)',
              borderRadius: 8, padding: 10,
            }}>
              <Text style={{ fontSize: 14, color: colors.textDim, paddingVertical: 2 }}>Owe: {conGang?.emoji} {conGang?.name}</Text>
              <Text style={{ fontSize: 14, color: colors.textDim, paddingVertical: 2 }}>Drug: {conDrug?.emoji} {conDrug?.name} ({con.quantity} units)</Text>
              <Text style={{ fontSize: 14, color: colors.textDim, paddingVertical: 2 }}>Debt: {$(con.amountOwed)} ({$(con.amountPaid)} paid)</Text>
              <Text style={[
                { fontSize: 14, paddingVertical: 2 },
                { color: con.turnsLeft <= 1 ? colors.red : con.turnsLeft <= 2 ? colors.yellow : colors.textDim },
              ]}>
                Deadline: {con.turnsLeft > 0 ? `${con.turnsLeft} turn${con.turnsLeft !== 1 ? 's' : ''}` : 'OVERDUE!'}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textDim, paddingVertical: 2 }}>Return to: {conLoc?.emoji} {conLoc?.name}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                {[1000, 5000].map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      { backgroundColor: '#b45309', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 12 },
                      cp.cash < amt && { opacity: 0.4 },
                    ]}
                    onPress={() => payConsignmentAction(amt)}
                    disabled={cp.cash < amt || !cp.consignment}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Pay ${amt / 1000}K</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    { backgroundColor: '#b45309', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 12 },
                    cp.cash <= 0 && { opacity: 0.4 },
                  ]}
                  onPress={() => payConsignmentAction('all')}
                  disabled={cp.cash <= 0 || !cp.consignment}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Pay All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        );
      })()}

      {/* Fingers */}
      {cp.fingers < 10 && (
        <>
          <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, marginTop: 10, marginBottom: 6, fontWeight: '600' }}>FINGERS</Text>
          <Text style={[
            { fontSize: 14, paddingHorizontal: 10, paddingVertical: 4 },
            { color: cp.fingers <= 4 ? colors.red : cp.fingers <= 6 ? colors.yellow : colors.orangeLight },
          ]}>
            {cp.fingers}/10 remaining {'\u2022'} -{(10 - cp.fingers) * 5} space {'\u2022'} -{(10 - cp.fingers) * 3}% sell value
            {cp.fingers <= 6 ? ' \u2022 +1 travel day' : ''}
            {cp.fingers <= 4 ? " \u2022 Can't hold a gun" : ''}
          </Text>
        </>
      )}

      {/* Territories */}
      <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, marginTop: 10, marginBottom: 6, fontWeight: '600' }}>TERRITORIES</Text>
      {Object.keys(cp.territories).length > 0 ? (
        <View>
          {Object.entries(cp.territories).map(([id, d]) => {
            const l = LOCATIONS.find(x => x.id === id);
            return (
              <View key={id} style={{
                flexDirection: 'row', justifyContent: 'space-between',
                backgroundColor: 'rgba(34,197,94,0.03)', borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 3,
              }}>
                <Text style={{ fontSize: 14, color: colors.greenLight }}>{l?.emoji} {l?.name}</Text>
                <Text style={{ fontSize: 14, color: colors.green, fontWeight: '700' }}>+{$(d.tribute)}/d</Text>
              </View>
            );
          })}
          <Text style={{ fontSize: 13, color: colors.green, fontWeight: '600' }}>Total: {$(cp.tributePerDay)}/day</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 14, color: colors.textDark }}>None yet. Build rep.</Text>
      )}

      {/* Gangs */}
      <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, marginTop: 10, marginBottom: 6, fontWeight: '600' }}>GANGS</Text>
      {GANGS.map(g => (
        <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
          <Text style={{ fontSize: 16 }}>{g.emoji}</Text>
          <Text style={{ fontSize: 14, flex: 1, color: g.color }}>{g.name}</Text>
          <Text style={{
            fontSize: 13, fontWeight: '600',
            color: (cp.gangRelations[g.id] ?? 0) > 10 ? colors.green : (cp.gangRelations[g.id] ?? 0) < -10 ? colors.red : colors.textMuted,
          }}>
            {(cp.gangRelations[g.id] ?? 0) > 10 ? 'Allied' : (cp.gangRelations[g.id] ?? 0) < -10 ? 'Hostile' : 'Neutral'}
          </Text>
        </View>
      ))}

      {/* Milestones */}
      <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, marginTop: 10, marginBottom: 6, fontWeight: '600' }}>MILESTONES</Text>
      <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
        {MILESTONES.map(m => (
          <Text
            key={m.id}
            style={[
              { fontSize: 22 },
              !cp.milestones?.includes(m.id) && { opacity: 0.1 },
            ]}
          >
            {m.emoji}
          </Text>
        ))}
      </View>

      {/* Log */}
      <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, marginTop: 10, marginBottom: 6, fontWeight: '600' }}>LOG</Text>
      <View style={{ maxHeight: 180 }}>
        {[...cp.eventLog].reverse().slice(0, 10).map((e, i) => (
          <Text key={i} style={[
            { fontSize: 13, paddingVertical: 2 },
            {
              color: e.type === 'danger' ? colors.redLight
                : e.type === 'spike' ? colors.pinkLight
                : e.type === 'crash' ? colors.greenLight
                : e.type === 'tip' ? colors.purpleLight
                : e.type === 'customs' ? colors.orangeLight
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
