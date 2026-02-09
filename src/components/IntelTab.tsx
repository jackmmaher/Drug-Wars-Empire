import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, GANGS, MILESTONES, LOCATIONS, DRUGS, CONSIGNMENT_TURNS, FAVOR_FRIENDLY, FAVOR_TRUSTED, FAVOR_BLOOD, getGangFavorTier, isFeatureEnabled } from '../constants/game';
import { useGameStore } from '../stores/gameStore';
import { Bar } from './Bar';

function getFavorLabel(rel: number): { label: string; color: string } {
  if (rel >= FAVOR_BLOOD) return { label: 'Blood Brother', color: '#dc2626' };
  if (rel >= FAVOR_TRUSTED) return { label: 'Trusted', color: '#22c55e' };
  if (rel >= FAVOR_FRIENDLY) return { label: 'Friendly', color: '#3b82f6' };
  if (rel >= -5) return { label: 'Neutral', color: '#6b7280' };
  return { label: 'Hostile', color: '#ef4444' };
}

function getFavorPerks(tier: number): string[] {
  const perks: string[] = [];
  if (tier >= 1) perks.push('10% off consignment');
  if (tier >= 2) perks.push('-5% cop encounters', '+$3K loan cap');
  if (tier >= 3) perks.push('No mugging on turf', '+10% sell price');
  return perks;
}

function Section({ title, count, defaultOpen = false, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 10 }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, color: colors.textDim, letterSpacing: 2, fontWeight: '600' }}>
          {open ? '\u25BC' : '\u25B6'} {title}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={{ backgroundColor: colors.bgCardHover, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 6 }}>
            <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700' }}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
      {open && children}
    </View>
  );
}

function getLogPrefix(type: string): string {
  switch (type) {
    case 'spike':
    case 'crash':
      return 'MARKET: ';
    case 'danger':
      return 'POLICE: ';
    case 'tip':
      return 'INTEL: ';
    case 'customs':
      return 'CUSTOMS: ';
    case 'consignment':
      return 'CONSIGNMENT: ';
    case 'gangLoan':
      return 'LOAN: ';
    case 'mission':
      return 'MISSION: ';
    case 'gangWar':
      return 'WAR: ';
    case 'levelUp':
      return 'LEVEL: ';
    default:
      return '';
  }
}

export function IntelTab() {
  const { colors } = useTheme();
  const cp = useGameStore(s => s.player);
  const gameMode = useGameStore(s => s.gameMode);
  const campaign = useGameStore(s => s.campaign);
  const payRatAction = useGameStore(s => s.payRat);
  const payConsignmentAction = useGameStore(s => s.payConsignment);
  const payGangLoanAction = useGameStore(s => s.payGangLoan);
  const declareWar = useGameStore(s => s.declareWar);

  const gangWarsEnabled = isFeatureEnabled(cp.campaignLevel, 'gangWars', gameMode);
  const consignmentEnabled = isFeatureEnabled(cp.campaignLevel, 'gangConsignment', gameMode);
  const territoryEnabled = isFeatureEnabled(cp.campaignLevel, 'territoryPurchase', gameMode);

  const pendingTip = cp.rat.pendingTip;
  const tipDrug = pendingTip ? DRUGS.find(d => d.id === pendingTip.drugId) : null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
      {/* Rat */}
      <Section title="INFORMANT" defaultOpen={cp.rat.hired && cp.rat.alive}>
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
      </Section>

      {/* Consignment */}
      {cp.consignment && (() => {
        const con = cp.consignment!;
        const conGang = GANGS.find(g => g.id === con.gangId);
        const conDrug = DRUGS.find(d => d.id === con.drugId);
        const conLoc = LOCATIONS.find(l => l.id === con.originLocation);
        return (
          <Section title="CONSIGNMENT" defaultOpen={!!cp.consignment}>
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
          </Section>
        );
      })()}

      {/* Gang Loan */}
      {cp.gangLoan && (() => {
        const loan = cp.gangLoan!;
        const loanGang = GANGS.find(g => g.id === loan.gangId);
        const remaining = loan.amountOwed - loan.amountPaid;
        return (
          <Section title="GANG LOAN" defaultOpen={!!cp.gangLoan}>
            <View style={{
              backgroundColor: 'rgba(234,179,8,0.04)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.12)',
              borderRadius: 8, padding: 10,
            }}>
              <Text style={{ fontSize: 14, color: colors.textDim, paddingVertical: 2 }}>Lender: {loanGang?.emoji} {loanGang?.name}</Text>
              <Text style={{ fontSize: 14, color: colors.textDim, paddingVertical: 2 }}>Owed: {$(remaining)} (of {$(loan.amountOwed)})</Text>
              <Text style={[
                { fontSize: 14, paddingVertical: 2 },
                { color: loan.turnsLeft <= 1 ? colors.red : loan.turnsLeft <= 2 ? colors.yellow : colors.textDim },
              ]}>
                Deadline: {loan.turnsLeft > 0 ? `${loan.turnsLeft} turn${loan.turnsLeft !== 1 ? 's' : ''}` : 'OVERDUE!'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, paddingVertical: 2 }}>15% compound interest per turn</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                {[1000, 3000].filter(a => a <= remaining).map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      { backgroundColor: '#78350f', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 12 },
                      cp.cash < amt && { opacity: 0.4 },
                    ]}
                    onPress={() => payGangLoanAction(amt)}
                    disabled={cp.cash < amt}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Pay {$(amt)}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    { backgroundColor: '#78350f', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 12 },
                    cp.cash <= 0 && { opacity: 0.4 },
                  ]}
                  onPress={() => payGangLoanAction('all')}
                  disabled={cp.cash <= 0}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Pay All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Section>
        );
      })()}

      {/* Active Mission */}
      {cp.gangMission && (() => {
        const mission = cp.gangMission!;
        const mGang = GANGS.find(g => g.id === mission.gangId);
        const targetLoc = mission.targetLocation ? LOCATIONS.find(l => l.id === mission.targetLocation) : null;
        return (
          <Section title="ACTIVE MISSION" defaultOpen={!!cp.gangMission}>
            <View style={{
              backgroundColor: 'rgba(99,102,241,0.04)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.12)',
              borderRadius: 8, padding: 10,
            }}>
              <Text style={{ fontSize: 14, color: colors.indigoLight, fontWeight: '600', marginBottom: 4 }}>
                {mGang?.emoji} {mGang?.name}: {mission.description}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                Type: {mission.type.charAt(0).toUpperCase() + mission.type.slice(1)} {'\u2022'} {mission.turnsLeft} turn{mission.turnsLeft !== 1 ? 's' : ''} left
              </Text>
              {targetLoc && <Text style={{ fontSize: 13, color: colors.textMuted }}>Target: {targetLoc.emoji} {targetLoc.name}</Text>}
              {mission.type === 'muscle' && mission.sellTarget && (
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  Progress: {$(mission.sellProgress || 0)} / {$(mission.sellTarget)}
                </Text>
              )}
            </View>
          </Section>
        );
      })()}

      {/* Fingers */}
      {cp.fingers < 10 && (
        <Section title="FINGERS" defaultOpen={cp.fingers < 10}>
          <Text style={[
            { fontSize: 14, paddingHorizontal: 10, paddingVertical: 4 },
            { color: cp.fingers <= 4 ? colors.red : cp.fingers <= 6 ? colors.yellow : colors.orangeLight },
          ]}>
            {cp.fingers}/10 remaining {'\u2022'} -{(10 - cp.fingers) * 5} space {'\u2022'} -{(10 - cp.fingers) * 3}% sell value
            {cp.fingers <= 6 ? ' \u2022 +1 travel day' : ''}
            {cp.fingers <= 4 ? " \u2022 Can't hold a gun" : ''}
          </Text>
        </Section>
      )}

      {/* Territories */}
      <Section title="TERRITORIES" count={Object.keys(cp.territories).length}>
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
      </Section>

      {/* Gangs -- expanded cards */}
      <Section title="GANGS" count={GANGS.length} defaultOpen={false}>
        {GANGS.map(g => {
          const rel = cp.gangRelations[g.id] ?? 0;
          const tier = getGangFavorTier(rel);
          const { label, color: favorColor } = getFavorLabel(rel);
          const perks = getFavorPerks(tier);
          const barPercent = Math.max(0, Math.min(100, ((rel + 30) / 55) * 100));

          return (
            <View key={g.id} style={{
              backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
              borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: g.color,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: g.color }}>{g.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    Turf: {g.turf.map(t => LOCATIONS.find(l => l.id === t)?.name || t).join(', ')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: rel > 0 ? colors.green : rel < 0 ? colors.red : colors.textMuted }}>
                    {rel > 0 ? '+' : ''}{rel}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: favorColor }}>{label}</Text>
                </View>
              </View>
              <View style={{ height: 4, backgroundColor: colors.trackBg, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                <View style={{ height: '100%', width: `${barPercent}%`, backgroundColor: favorColor, borderRadius: 2 }} />
              </View>
              {perks.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {perks.map((perk, i) => (
                    <View key={i} style={{
                      backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{perk}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </Section>

      {/* Gang Wars (L3 Campaign only) */}
      {gangWarsEnabled && (
        <Section title="GANG WARS" defaultOpen={gangWarsEnabled}>
          {campaign.gangWar.activeWar ? (() => {
            const war = campaign.gangWar.activeWar!;
            const warGang = GANGS.find(g => g.id === war.targetGangId);
            return (
              <View style={{
                backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
                borderRadius: 8, padding: 10,
              }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.red, marginBottom: 4 }}>
                  At war with {warGang?.emoji} {warGang?.name}
                </Text>
                <Bar label="ENEMY STRENGTH" percent={war.gangStrength} color={colors.red} />
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                  Battles: {war.battlesWon}W / {war.battlesLost}L
                </Text>
                <Text style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>
                  40% encounter on enemy turf, 15% elsewhere
                </Text>
              </View>
            );
          })() : (
            <View>
              {campaign.gangWar.defeatedGangs.length > 0 && (
                <Text style={{ fontSize: 13, color: colors.green, marginBottom: 6 }}>
                  Defeated: {campaign.gangWar.defeatedGangs.map(id => {
                    const g = GANGS.find(x => x.id === id);
                    return `${g?.emoji || ''} ${g?.name || id}`;
                  }).join(', ')}
                </Text>
              )}
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6 }}>
                Visit rival gang turf to declare war.
              </Text>
              {(() => {
                const localGang = GANGS.find(g => g.turf.includes(cp.location));
                if (!localGang || campaign.gangWar.defeatedGangs.includes(localGang.id)) return null;
                // Don't show for gangs with high relations
                if ((cp.gangRelations[localGang.id] ?? 0) > 10) return null;
                return (
                  <TouchableOpacity
                    style={{ backgroundColor: '#7f1d1d', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' }}
                    onPress={() => declareWar(localGang.id)}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                      Declare War on {localGang.emoji} {localGang.name}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          )}
        </Section>
      )}

      {/* Milestones */}
      <Section title="MILESTONES" count={cp.milestones?.length || 0}>
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
      </Section>

      {/* Log */}
      <Section title="LOG" count={cp.eventLog.length} defaultOpen={false}>
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
                  : e.type === 'gangLoan' ? '#fbbf24'
                  : e.type === 'mission' ? colors.indigoLight
                  : e.type === 'gangWar' ? colors.red
                  : e.type === 'levelUp' ? colors.yellow
                  : colors.textMuted,
                opacity: 1 - i * 0.06,
              },
            ]}>
              <Text style={{ color: colors.textDarkest }}>D{e.day}</Text> {getLogPrefix(e.type)}{e.message}
            </Text>
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}
