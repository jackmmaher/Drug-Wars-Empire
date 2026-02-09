import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, DRUGS, GANGS, LOCATIONS, STASH_CAPACITY, isFeatureEnabled } from '../constants/game';
import { inventoryCount, getGangLoanCap } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';

export function MarketTab() {
  const { colors } = useTheme();
  const cp = useGameStore(s => s.player);
  const openTrade = useGameStore(s => s.openTrade);
  const bank = useGameStore(s => s.bank);
  const shark = useGameStore(s => s.shark);
  const borrow = useGameStore(s => s.borrow);
  const subPanel = useGameStore(s => s.subPanel);
  const setSubPanel = useGameStore(s => s.setSubPanel);
  const stashAction = useGameStore(s => s.stashDrug);
  const retrieveAction = useGameStore(s => s.retrieveDrug);
  const borrowGang = useGameStore(s => s.borrowGang);
  const payGangLoan = useGameStore(s => s.payGangLoan);

  const used = inventoryCount(cp.inventory);
  const free = cp.space - used;
  const loc = LOCATIONS.find(l => l.id === cp.location);
  const hasBank = !!loc?.bank;
  const hasShark = !!loc?.shark;
  const territory = cp.territories[cp.location];
  const stash: Record<string, number> = territory?.stash || {};
  const stashCount = Object.values(stash).reduce((a, b) => a + b, 0);
  const gameMode = useGameStore(s => s.gameMode);
  const localGang = GANGS.find(g => g.turf.includes(cp.location));
  const gangLoansEnabled = isFeatureEnabled(cp.campaignLevel, 'gangLoans', gameMode);
  const canBorrowGang = gangLoansEnabled && localGang && !cp.gangLoan && (cp.gangRelations[localGang.id] ?? 0) >= 0;
  const gangLoanCap = localGang ? getGangLoanCap(cp, localGang.id) : 0;

  const smBtn = {
    backgroundColor: colors.cardBorder,
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
  } as const;
  const smBtnText = { color: colors.text, fontSize: 14, fontWeight: '600' as const };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, paddingTop: 6 }}>
      {/* Bank & Shark buttons */}
      {(hasBank || hasShark) && (
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
          <TouchableOpacity
            style={[
              { flex: 1, backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 12 },
              subPanel === 'bk' && { backgroundColor: colors.blueDark },
            ]}
            onPress={() => setSubPanel('bk')}
          >
            <Text style={{ color: colors.blueLight, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
              Bank {cp.bank > 0 ? <Text style={{ opacity: 0.6 }}>({$(cp.bank)})</Text> : null}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              { flex: 1, backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 12 },
              subPanel === 'sk' && { backgroundColor: '#7f1d1d' },
            ]}
            onPress={() => setSubPanel('sk')}
          >
            <Text style={{ color: colors.redLight, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
              Shark {cp.debt > 0 ? <Text style={{ opacity: 0.6 }}>({$(cp.debt)})</Text> : null}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Gang Loan button */}
      {localGang && canBorrowGang && gangLoanCap > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
          <TouchableOpacity
            style={[
              { flex: 1, backgroundColor: 'rgba(234,179,8,0.08)', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 12 },
              subPanel === 'gl' && { backgroundColor: '#78350f' },
            ]}
            onPress={() => setSubPanel('gl')}
          >
            <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
              {localGang.emoji} Gang Loan <Text style={{ opacity: 0.6 }}>(max {$(gangLoanCap)})</Text>
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Gang Loan panel */}
      {subPanel === 'gl' && localGang && canBorrowGang && (
        <View style={{
          padding: 10, backgroundColor: 'rgba(234,179,8,0.04)', borderRadius: 6, marginBottom: 6,
          borderWidth: 1, borderColor: 'rgba(234,179,8,0.12)',
        }}>
          <Text style={{ fontSize: 14, color: '#fbbf24', marginBottom: 2 }}>
            Borrow from {localGang.name} {'\u2022'} 15%/turn interest
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
            Max: {$(gangLoanCap)} {'\u2022'} 4 turns to repay
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {[1000, 2000, 5000].filter(a => a <= gangLoanCap).map(amt => (
              <TouchableOpacity
                key={amt}
                style={[smBtn, { backgroundColor: '#78350f' }]}
                onPress={() => borrowGang(localGang!.id, amt)}
              >
                <Text style={smBtnText}>+{$(amt)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[smBtn, { backgroundColor: '#78350f' }]}
              onPress={() => borrowGang(localGang!.id, gangLoanCap)}
            >
              <Text style={smBtnText}>Max ({$(gangLoanCap)})</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: colors.textDark, marginTop: 6, fontStyle: 'italic' }}>
            Higher risk than loan shark. Non-payment = consequences.
          </Text>
        </View>
      )}

      {/* Bank panel */}
      {subPanel === 'bk' && (
        <View style={{
          padding: 10, backgroundColor: colors.bgBlue, borderRadius: 6, marginBottom: 6,
          borderWidth: 1, borderColor: 'rgba(59,130,246,0.1)',
        }}>
          <Text style={{ fontSize: 14, color: colors.blueLight, marginBottom: 6 }}>Balance: <Text style={{ fontWeight: '700' }}>{$(cp.bank)}</Text> {'\u2022'} 5%/day interest</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <TouchableOpacity style={smBtn} onPress={() => bank('deposit', 'all')}>
              <Text style={smBtnText}>Deposit All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={smBtn} onPress={() => bank('deposit', Math.floor(cp.cash / 2))}>
              <Text style={smBtnText}>Deposit Half</Text>
            </TouchableOpacity>
            <TouchableOpacity style={smBtn} onPress={() => bank('withdraw', 'all')}>
              <Text style={smBtnText}>Withdraw All</Text>
            </TouchableOpacity>
            {cp.bank > 0 && (
              <TouchableOpacity style={smBtn} onPress={() => bank('withdraw', Math.floor(cp.bank / 2))}>
                <Text style={smBtnText}>Withdraw Half</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Shark panel */}
      {subPanel === 'sk' && (
        <View style={{
          padding: 10, backgroundColor: 'rgba(239,68,68,0.04)', borderRadius: 6, marginBottom: 6,
          borderWidth: 1, borderColor: 'rgba(239,68,68,0.1)',
        }}>
          <Text style={{ fontSize: 14, color: colors.redLight, marginBottom: 2 }}>Debt: <Text style={{ fontWeight: '700' }}>{$(cp.debt)}</Text> {'\u2022'} 10%/day interest!</Text>
          <Text style={{ fontSize: 14, color: colors.redLight, marginBottom: 6 }}>Cash: <Text style={{ fontWeight: '700' }}>{$(cp.cash)}</Text></Text>
          {cp.debt > 0 && (
            <>
              <Text style={{ fontSize: 12, color: colors.textDark, letterSpacing: 1, marginBottom: 4, fontWeight: '600' }}>REPAY</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <TouchableOpacity style={[smBtn, { backgroundColor: colors.redDark }]} onPress={() => shark('all')}>
                  <Text style={smBtnText}>Pay All ({$(Math.min(cp.cash, cp.debt))})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[smBtn, { backgroundColor: colors.redDarker }]} onPress={() => shark(Math.floor(Math.min(cp.cash, cp.debt) / 2))}>
                  <Text style={smBtnText}>Pay Half</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[smBtn, { backgroundColor: colors.redDarker }]} onPress={() => shark(1000)}>
                  <Text style={smBtnText}>Pay $1K</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <Text style={{ fontSize: 12, color: colors.textDark, letterSpacing: 1, marginTop: 6, marginBottom: 4, fontWeight: '600' }}>BORROW</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <TouchableOpacity style={[smBtn, { backgroundColor: '#4c1d95' }]} onPress={() => borrow(1000)}>
              <Text style={smBtnText}>+$1,000</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[smBtn, { backgroundColor: '#4c1d95' }]} onPress={() => borrow(5000)}>
              <Text style={smBtnText}>+$5,000</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[smBtn, { backgroundColor: '#4c1d95' }]} onPress={() => borrow(10000)}>
              <Text style={smBtnText}>+$10,000</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: colors.textDark, marginTop: 6, fontStyle: 'italic' }}>Interest compounds daily. Pay it off fast!</Text>
        </View>
      )}

      {/* Drug list */}
      {DRUGS.map(d => {
        const pr = cp.prices[d.id] as number | null;
        const own = cp.inventory[d.id] || 0;
        const ab = cp.averageCosts[d.id];
        const pnl = pr && ab && own > 0 ? ((pr - ab) / ab * 100) : null;
        const maxBuy = pr ? Math.min(Math.floor(cp.cash / pr), free) : 0;
        const pp = cp.previousPrices[d.id] as number | null;
        const pc = pr && pp ? ((pr - pp) / pp * 100) : null;
        const hasProfitGlow = pnl !== null && pnl > 30;
        const hasLossGlow = pnl !== null && pnl < -20;

        const isRare = !!d.rare;
        const isRareAvailable = isRare && !!pr;

        return (
          <View key={d.id} style={[
            {
              flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10,
              borderRadius: 6, gap: 6, backgroundColor: colors.bgCard,
              borderLeftWidth: 3, borderLeftColor: 'transparent', marginBottom: 2,
            },
            hasProfitGlow && { backgroundColor: colors.bgSuccess, borderLeftColor: colors.green },
            hasLossGlow && { borderLeftColor: colors.red },
            isRareAvailable && { borderLeftColor: '#d4a017' },
            !pr && { opacity: 0.25 },
          ]}>
            <Text style={{ fontSize: 18, width: 30 }}>{d.emoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{d.name}</Text>
                {isRareAvailable && (
                  <View style={{ backgroundColor: '#d4a017', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 1 }}>RARE</Text>
                  </View>
                )}
              </View>
              {pc !== null && pc !== 0 && (
                <Text style={{ fontSize: 12, color: pc > 0 ? colors.green : colors.red }}>
                  {pc > 0 ? '\u25B2' : '\u25BC'}{Math.abs(pc).toFixed(0)}%
                </Text>
              )}
            </View>
            <Text style={[
              { width: 80, textAlign: 'right', fontSize: 16, fontWeight: '800', color: colors.white },
              !pr && { color: colors.textDarkest },
            ]}>
              {pr ? $(pr) : '--'}
            </Text>
            <View style={{ width: 44, alignItems: 'center' }}>
              <Text style={[
                { fontSize: 14 },
                own > 0 ? { color: colors.text, fontWeight: '700' } : { color: colors.textDarkest },
              ]}>
                {own || '--'}
              </Text>
              {pnl !== null && own > 0 && (
                <Text style={{ fontSize: 11, fontWeight: '700', color: pnl > 0 ? colors.green : colors.red }}>
                  {pnl > 0 ? '+' : ''}{pnl.toFixed(0)}%
                </Text>
              )}
            </View>
            <TouchableOpacity
              disabled={!pr || maxBuy <= 0}
              onPress={() => openTrade(d.id, 'buy')}
              style={[
                { borderRadius: 5, paddingVertical: 8, width: 56, alignItems: 'center' },
                pr && maxBuy > 0 ? { backgroundColor: colors.green } : { backgroundColor: colors.disabledBg },
              ]}
            >
              <Text style={[
                { fontSize: 13, fontWeight: '800' },
                pr && maxBuy > 0 ? { color: '#fff' } : { color: colors.textDarkest },
              ]}>BUY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={own <= 0 || !pr}
              onPress={() => openTrade(d.id, 'sell')}
              style={[
                { borderRadius: 5, paddingVertical: 8, width: 56, alignItems: 'center' },
                own > 0 && pr ? { backgroundColor: colors.yellow } : { backgroundColor: colors.disabledBg },
              ]}
            >
              <Text style={[
                { fontSize: 13, fontWeight: '800' },
                own > 0 && pr ? { color: '#fff' } : { color: colors.textDarkest },
              ]}>SELL</Text>
            </TouchableOpacity>
            {territory && own > 0 && (
              <TouchableOpacity
                onPress={() => stashAction(d.id, own)}
                style={{ backgroundColor: colors.cardBorder, borderRadius: 5, paddingVertical: 8, width: 54, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textDim }}>STASH</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Inventory summary */}
      {Object.keys(cp.inventory).length > 0 && (
        <View style={{ marginTop: 10, gap: 4 }}>
          <Text style={{ fontSize: 12, color: colors.textDark, letterSpacing: 1, marginBottom: 2, fontWeight: '600' }}>CARRYING {used}/{cp.space}</Text>
          {Object.entries(cp.inventory).filter(([, q]) => q > 0).map(([id, q]) => {
            const d = DRUGS.find(x => x.id === id);
            const pr = cp.prices[id] as number | null;
            const val = pr ? q * pr : 0;
            const ab = cp.averageCosts[id];
            const pnl = pr && ab ? ((pr - ab) / ab * 100) : null;
            return (
              <View key={id} style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard,
                borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6, gap: 6,
              }}>
                <Text style={{ fontSize: 16 }}>{d?.emoji}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textDim, flex: 1 }}>{d?.name}</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>x{q}</Text>
                {val > 0 && <Text style={{ fontSize: 13, color: colors.textMuted, width: 64, textAlign: 'right' }}>{$(val)}</Text>}
                {pnl !== null && (
                  <Text style={{
                    fontSize: 12, fontWeight: '700', width: 40, textAlign: 'right',
                    color: pnl > 0 ? colors.green : pnl < 0 ? colors.red : colors.textDark,
                  }}>
                    {pnl > 0 ? '+' : ''}{pnl.toFixed(0)}%
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Stash panel (at owned territory) */}
      {territory && (
        <View style={{ marginTop: 10, gap: 4 }}>
          <Text style={{ fontSize: 12, color: colors.textDark, letterSpacing: 1, marginBottom: 2, fontWeight: '600' }}>STASH ({stashCount}/{STASH_CAPACITY})</Text>
          {Object.entries(stash).filter(([, q]) => q > 0).map(([id, q]) => {
            const drug = DRUGS.find(d => d.id === id);
            if (!drug) return null;
            return (
              <View key={id} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 6, paddingHorizontal: 10,
              }}>
                <Text style={{ fontSize: 14, color: colors.textDim }}>{drug.emoji} {drug.name}: {q}</Text>
                <TouchableOpacity
                  onPress={() => retrieveAction(id, q)}
                  style={{ backgroundColor: colors.cardBorder, borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10 }}
                >
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>Take All</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          {stashCount === 0 && <Text style={{ fontSize: 13, color: colors.textDark, paddingHorizontal: 10 }}>Empty. Stash drugs here for safekeeping.</Text>}
        </View>
      )}
    </ScrollView>
  );
}
