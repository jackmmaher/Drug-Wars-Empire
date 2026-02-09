import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../constants/theme';
import { $, DRUGS, LOCATIONS } from '../constants/game';
import { inventoryCount } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';

export function MarketTab() {
  const cp = useGameStore(s => s.currentPlayer());
  const openTrade = useGameStore(s => s.openTrade);
  const bank = useGameStore(s => s.bank);
  const shark = useGameStore(s => s.shark);
  const borrow = useGameStore(s => s.borrow);
  const subPanel = useGameStore(s => s.subPanel);
  const setSubPanel = useGameStore(s => s.setSubPanel);

  const used = inventoryCount(cp.inventory);
  const free = cp.space - used;
  const loc = LOCATIONS.find(l => l.id === cp.location);
  const hasBank = !!loc?.bank;
  const hasShark = !!loc?.shark;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Bank & Shark buttons (in any city with bank/shark) */}
      {(hasBank || hasShark) && (
        <View style={styles.bankRow}>
          <TouchableOpacity
            style={[styles.bankBtn, subPanel === 'bk' && styles.bankBtnActive]}
            onPress={() => setSubPanel('bk')}
          >
            <Text style={styles.bankBtnText}>
              🏦 Bank {cp.bank > 0 ? <Text style={{ opacity: 0.6 }}>({$(cp.bank)})</Text> : null}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sharkBtn, subPanel === 'sk' && styles.sharkBtnActive]}
            onPress={() => setSubPanel('sk')}
          >
            <Text style={styles.sharkBtnText}>
              🦈 Shark {cp.debt > 0 ? <Text style={{ opacity: 0.6 }}>({$(cp.debt)})</Text> : null}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bank panel */}
      {subPanel === 'bk' && (
        <View style={styles.bankPanel}>
          <Text style={styles.bankInfo}>Balance: <Text style={{ fontWeight: '700' }}>{$(cp.bank)}</Text> • 5%/day interest</Text>
          <View style={styles.bankActions}>
            <TouchableOpacity style={styles.smBtn} onPress={() => bank('deposit', 'all')}>
              <Text style={styles.smBtnText}>Deposit All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smBtn} onPress={() => bank('deposit', Math.floor(cp.cash / 2))}>
              <Text style={styles.smBtnText}>Deposit Half</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smBtn} onPress={() => bank('withdraw', 'all')}>
              <Text style={styles.smBtnText}>Withdraw All</Text>
            </TouchableOpacity>
            {cp.bank > 0 && (
              <TouchableOpacity style={styles.smBtn} onPress={() => bank('withdraw', Math.floor(cp.bank / 2))}>
                <Text style={styles.smBtnText}>Withdraw Half</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Shark panel */}
      {subPanel === 'sk' && (
        <View style={styles.sharkPanel}>
          <Text style={styles.sharkInfo}>Debt: <Text style={{ fontWeight: '700' }}>{$(cp.debt)}</Text> • 10%/day interest!</Text>
          <Text style={[styles.sharkInfo, { marginBottom: 4 }]}>Cash: <Text style={{ fontWeight: '700' }}>{$(cp.cash)}</Text></Text>
          {cp.debt > 0 && (
            <>
              <Text style={styles.sharkSubLabel}>REPAY</Text>
              <View style={styles.bankActions}>
                <TouchableOpacity style={[styles.smBtn, { backgroundColor: colors.redDark }]} onPress={() => shark('all')}>
                  <Text style={styles.smBtnText}>Pay All ({$(Math.min(cp.cash, cp.debt))})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smBtn, { backgroundColor: colors.redDarker }]} onPress={() => shark(Math.floor(Math.min(cp.cash, cp.debt) / 2))}>
                  <Text style={styles.smBtnText}>Pay Half</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smBtn, { backgroundColor: colors.redDarker }]} onPress={() => shark(1000)}>
                  <Text style={styles.smBtnText}>Pay $1K</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <Text style={[styles.sharkSubLabel, { marginTop: 4 }]}>BORROW</Text>
          <View style={styles.bankActions}>
            <TouchableOpacity style={[styles.smBtn, { backgroundColor: '#4c1d95' }]} onPress={() => borrow(1000)}>
              <Text style={styles.smBtnText}>+$1,000</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smBtn, { backgroundColor: '#4c1d95' }]} onPress={() => borrow(5000)}>
              <Text style={styles.smBtnText}>+$5,000</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smBtn, { backgroundColor: '#4c1d95' }]} onPress={() => borrow(10000)}>
              <Text style={styles.smBtnText}>+$10,000</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sharkWarn}>Interest compounds daily. Pay it off fast!</Text>
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

        return (
          <View key={d.id} style={[
            styles.drugRow,
            hasProfitGlow && styles.drugRowProfit,
            hasLossGlow && styles.drugRowLoss,
            !pr && styles.drugRowUnavailable,
          ]}>
            <Text style={styles.drugEmoji}>{d.emoji}</Text>
            <View style={styles.drugInfo}>
              <Text style={styles.drugName}>{d.name}</Text>
              {pc !== null && pc !== 0 && (
                <Text style={{ fontSize: 8, color: pc > 0 ? colors.green : colors.red }}>
                  {pc > 0 ? '▲' : '▼'}{Math.abs(pc).toFixed(0)}%
                </Text>
              )}
            </View>
            <Text style={[styles.drugPrice, !pr && { color: colors.textDarkest }]}>
              {pr ? $(pr) : '—'}
            </Text>
            <View style={styles.drugOwn}>
              <Text style={[styles.drugOwnText, own > 0 ? { color: colors.text } : { color: colors.textDarkest }]}>
                {own || '—'}
              </Text>
              {pnl !== null && own > 0 && (
                <Text style={{ fontSize: 7, fontWeight: '700', color: pnl > 0 ? colors.green : colors.red }}>
                  {pnl > 0 ? '+' : ''}{pnl.toFixed(0)}%
                </Text>
              )}
            </View>
            <TouchableOpacity
              disabled={!pr || maxBuy <= 0}
              onPress={() => openTrade(d.id, 'buy')}
              style={[styles.tradeBtn, pr && maxBuy > 0 ? styles.buyBtn : styles.tradeBtnDisabled]}
            >
              <Text style={[styles.tradeBtnText, pr && maxBuy > 0 ? { color: '#fff' } : { color: colors.textDarkest }]}>BUY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={own <= 0 || !pr}
              onPress={() => openTrade(d.id, 'sell')}
              style={[styles.tradeBtn, own > 0 && pr ? styles.sellBtn : styles.tradeBtnDisabled]}
            >
              <Text style={[styles.tradeBtnText, own > 0 && pr ? { color: '#fff' } : { color: colors.textDarkest }]}>SELL</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Inventory summary */}
      {Object.keys(cp.inventory).length > 0 && (
        <View style={styles.invSummary}>
          {Object.entries(cp.inventory).filter(([, q]) => q > 0).map(([id, q]) => {
            const d = DRUGS.find(x => x.id === id);
            return (
              <View key={id} style={styles.invTag}>
                <Text style={styles.invTagText}>{d?.emoji}{q}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 8, paddingBottom: 6, paddingTop: 3 },
  bankRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  bankBtn: {
    flex: 1,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  bankBtnActive: { backgroundColor: colors.blueDark },
  bankBtnText: { color: colors.blueLight, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  sharkBtn: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sharkBtnActive: { backgroundColor: '#7f1d1d' },
  sharkBtnText: { color: colors.redLight, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  bankPanel: {
    padding: 6,
    backgroundColor: colors.bgBlue,
    borderRadius: 5,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.1)',
  },
  bankInfo: { fontSize: 9, color: colors.blueLight, marginBottom: 3 },
  bankActions: { flexDirection: 'row', gap: 3, flexWrap: 'wrap' },
  sharkPanel: {
    padding: 6,
    backgroundColor: 'rgba(239,68,68,0.04)',
    borderRadius: 5,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.1)',
  },
  sharkInfo: { fontSize: 9, color: colors.redLight, marginBottom: 1 },
  sharkSubLabel: { fontSize: 7, color: colors.textDark, letterSpacing: 1, marginBottom: 2 },
  sharkWarn: { fontSize: 7, color: colors.textDark, marginTop: 4, fontStyle: 'italic' },
  smBtn: {
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  smBtnText: { color: '#cbd5e1', fontSize: 10, fontWeight: '600' },
  drugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 4,
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
    marginBottom: 1,
  },
  drugRowProfit: { backgroundColor: 'rgba(34,197,94,0.03)', borderLeftColor: colors.green },
  drugRowLoss: { borderLeftColor: colors.red },
  drugRowUnavailable: { opacity: 0.25 },
  drugEmoji: { fontSize: 14, width: 24 },
  drugInfo: { flex: 1 },
  drugName: { fontSize: 11, fontWeight: '700', color: colors.text },
  drugPrice: { width: 68, textAlign: 'right', fontSize: 12, fontWeight: '800', color: colors.white },
  drugOwn: { width: 36, alignItems: 'center' },
  drugOwnText: { fontSize: 10 },
  tradeBtn: {
    borderRadius: 3,
    paddingVertical: 4,
    width: 46,
    alignItems: 'center',
  },
  buyBtn: { backgroundColor: colors.green },
  sellBtn: { backgroundColor: colors.yellow },
  tradeBtnDisabled: { backgroundColor: '#0f172a' },
  tradeBtnText: { fontSize: 9, fontWeight: '800' },
  invSummary: { flexDirection: 'row', gap: 3, flexWrap: 'wrap', marginTop: 4 },
  invTag: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  invTagText: { fontSize: 9, color: colors.textDim },
});
