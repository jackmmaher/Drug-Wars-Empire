import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { $, DRUGS } from '../constants/game';
import { inventoryCount } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';

export function TradeModal() {
  const activeTrade = useGameStore(s => s.activeTrade);
  const tradeQuantity = useGameStore(s => s.tradeQuantity);
  const setTradeQuantity = useGameStore(s => s.setTradeQuantity);
  const confirmTrade = useGameStore(s => s.confirmTrade);
  const closeTrade = useGameStore(s => s.closeTrade);
  const cp = useGameStore(s => s.currentPlayer());

  if (!activeTrade) return null;

  const drug = DRUGS.find(d => d.id === activeTrade.drugId)!;
  const price = cp.prices[drug.id] as number;
  const own = cp.inventory[drug.id] || 0;
  const isBuy = activeTrade.type === 'buy';
  const used = inventoryCount(cp.inventory);
  const free = cp.space - used;
  const maxBuy = price ? Math.min(Math.floor(cp.cash / price), free) : 0;
  const maxQty = isBuy ? maxBuy : own;
  const q = tradeQuantity === 'max' ? maxQty : Math.min(parseInt(tradeQuantity) || 0, maxQty);
  const total = q * (price || 0);
  const avg = cp.averageCosts[drug.id];
  const pnl = !isBuy && avg ? q * (price - avg) : 0;
  const pnlPct = !isBuy && avg ? ((price - avg) / avg * 100) : 0;

  const quickAmounts = [1, 5, 10, 25, 50].filter(n => n <= maxQty);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{drug.emoji}</Text>
        <Text style={styles.title}>{isBuy ? 'BUY' : 'SELL'} {drug.name}</Text>
        <Text style={styles.price}>{$(price)} each</Text>

        {!isBuy && avg ? (
          <Text style={[styles.pnlBig, { color: pnlPct > 0 ? colors.green : colors.red }]}>
            {pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(0)}% {pnlPct > 80 ? '🔥' : pnlPct > 150 ? '💥' : ''}
          </Text>
        ) : null}

        <Text style={styles.info}>
          {isBuy ? `Max ${maxBuy}` : `Own ${own}`}
          {cp.streak > 1 && !isBuy ? ` • ${cp.streak}x streak` : ''}
        </Text>

        <TextInput
          style={styles.input}
          value={tradeQuantity === 'max' ? `MAX (${maxQty})` : tradeQuantity}
          onChangeText={setTradeQuantity}
          placeholder="Qty..."
          placeholderTextColor={colors.textDark}
          keyboardType="number-pad"
          autoFocus
        />

        <View style={styles.quickAmounts}>
          {quickAmounts.map(n => (
            <TouchableOpacity key={n} style={styles.qb} onPress={() => setTradeQuantity(String(n))}>
              <Text style={styles.qbText}>{n}</Text>
            </TouchableOpacity>
          ))}
          {maxQty > 2 && (
            <TouchableOpacity style={styles.qb} onPress={() => setTradeQuantity(String(Math.floor(maxQty / 2)))}>
              <Text style={styles.qbText}>½</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.qb, styles.maxBtn]} onPress={() => setTradeQuantity('max')}>
            <Text style={[styles.qbText, styles.maxBtnText]}>MAX</Text>
          </TouchableOpacity>
        </View>

        {q > 0 && (
          <Text style={styles.totalRow}>
            Total: <Text style={{ color: colors.white, fontWeight: '700' }}>{$(total)}</Text>
            {!isBuy && pnl !== 0 && (
              <Text style={{ color: pnl > 0 ? colors.green : colors.red, fontWeight: '700', marginLeft: 8 }}>
                {' '}({pnl > 0 ? '+' : ''}{$(pnl)})
              </Text>
            )}
          </Text>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={closeTrade}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, q <= 0 && { opacity: 0.3 }]}
            onPress={confirmTrade}
            disabled={q <= 0}
          >
            <Text style={styles.confirmText}>{isBuy ? 'BUY' : 'SELL'} {q > 0 ? q : ''}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    maxWidth: 440,
  },
  emoji: { fontSize: 36 },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 2,
  },
  price: {
    color: colors.textDim,
    fontSize: 13,
  },
  pnlBig: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
  },
  info: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0a0e17',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.white,
    textAlign: 'center',
    width: 180,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 8,
    justifyContent: 'center',
  },
  qb: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  qbText: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
  },
  maxBtn: { backgroundColor: colors.green },
  maxBtnText: { color: '#000', fontWeight: '800' },
  totalRow: {
    fontSize: 12,
    color: colors.textDim,
    marginVertical: 10,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  cancelText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: colors.red,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  confirmText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
