import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, DRUGS } from '../constants/game';
import { inventoryCount, effectiveSpace } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';

export function TradeModal() {
  const { colors } = useTheme();
  const activeTrade = useGameStore(s => s.activeTrade);
  const tradeQuantity = useGameStore(s => s.tradeQuantity);
  const setTradeQuantity = useGameStore(s => s.setTradeQuantity);
  const confirmTrade = useGameStore(s => s.confirmTrade);
  const closeTrade = useGameStore(s => s.closeTrade);
  const cp = useGameStore(s => s.player);

  if (!activeTrade) return null;

  const drug = DRUGS.find(d => d.id === activeTrade.drugId)!;
  const price = cp.prices[drug.id] as number;
  const own = cp.inventory[drug.id] || 0;
  const isBuy = activeTrade.type === 'buy';
  const used = inventoryCount(cp.inventory);
  const maxSpace = effectiveSpace(cp);
  const free = maxSpace - used;
  const maxBuy = price ? Math.min(Math.floor(cp.cash / price), free) : 0;
  const maxQty = isBuy ? maxBuy : own;
  const q = tradeQuantity === 'max' ? maxQty : Math.min(parseInt(tradeQuantity) || 0, maxQty);
  const total = q * (price || 0);
  const avg = cp.averageCosts[drug.id];
  const pnl = !isBuy && avg ? q * (price - avg) : 0;
  const pnlPct = !isBuy && avg ? ((price - avg) / avg * 100) : 0;

  const spaceAfter = isBuy ? used + q : used - q;

  const quickAmounts = [1, 5, 10, 25, 50].filter(n => n <= maxQty);

  // Quick percentage buttons for 25%, 50%, 75%
  const pctButtons: { label: string; value: number }[] = [];
  if (maxQty > 3) {
    const q25 = Math.floor(maxQty * 0.25);
    if (q25 >= 1) pctButtons.push({ label: '25%', value: q25 });
    pctButtons.push({ label: '1/2', value: Math.floor(maxQty / 2) });
    const q75 = Math.floor(maxQty * 0.75);
    if (q75 > Math.floor(maxQty / 2)) pctButtons.push({ label: '75%', value: q75 });
  } else if (maxQty > 2) {
    pctButtons.push({ label: '1/2', value: Math.floor(maxQty / 2) });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ alignItems: 'center', paddingHorizontal: 24, maxWidth: 600, width: '100%' }}>
        <Text style={{ fontSize: 48 }}>{drug.emoji}</Text>
        <Text style={{ color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 6, marginBottom: 4 }}>
          {isBuy ? 'BUY' : 'SELL'} {drug.name}
        </Text>
        <Text style={{ color: colors.textDim, fontSize: 16 }}>{$(price)} each</Text>

        {!isBuy && avg ? (
          <View style={{ alignItems: 'center', marginVertical: 6 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: pnlPct > 0 ? colors.green : colors.red }}>
              {pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(0)}%
            </Text>
            {pnlPct < 0 && (
              <Text style={{ color: colors.red, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                Selling at a loss
              </Text>
            )}
          </View>
        ) : null}

        <Text style={{ color: colors.textMuted, fontSize: 15, marginBottom: 14 }}>
          {isBuy ? `Max ${maxBuy}` : `Own ${own}`}
          {cp.streak > 1 && !isBuy ? ` \u2022 ${cp.streak}x streak` : ''}
        </Text>

        <TextInput
          style={{
            backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.cardBorder,
            borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16,
            fontSize: 18, color: colors.white, textAlign: 'center', width: 220,
          }}
          value={tradeQuantity === 'max' ? `MAX (${maxQty})` : tradeQuantity}
          onChangeText={setTradeQuantity}
          placeholder="Qty..."
          placeholderTextColor={colors.textDark}
          keyboardType="number-pad"
          autoFocus
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 12, justifyContent: 'center' }}>
          {quickAmounts.map(n => (
            <TouchableOpacity key={n} style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
              borderRadius: 5, paddingVertical: 8, paddingHorizontal: 14,
            }} onPress={() => setTradeQuantity(String(n))}>
              <Text style={{ color: colors.textDim, fontSize: 14, fontWeight: '600' }}>{n}</Text>
            </TouchableOpacity>
          ))}
          {pctButtons.map(btn => (
            <TouchableOpacity key={btn.label} style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
              borderRadius: 5, paddingVertical: 8, paddingHorizontal: 14,
            }} onPress={() => setTradeQuantity(String(btn.value))}>
              <Text style={{ color: colors.textDim, fontSize: 14, fontWeight: '600' }}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={{
            backgroundColor: colors.green, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 14,
          }} onPress={() => setTradeQuantity('max')}>
            <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>MAX</Text>
          </TouchableOpacity>
        </View>

        {q > 0 && (
          <View style={{ alignItems: 'center', marginVertical: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.white, marginBottom: 4 }}>
              {isBuy ? 'Cost' : 'Revenue'}: {$(total)}
            </Text>
            {!isBuy && pnl !== 0 && (
              <Text style={{ fontSize: 16, fontWeight: '700', color: pnl > 0 ? colors.green : colors.red }}>
                Profit: {pnl > 0 ? '+' : ''}{$(pnl)} ({pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(0)}%)
              </Text>
            )}
            <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4 }}>
              Space after: {spaceAfter}/{maxSpace}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={{
            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
            borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24,
          }} onPress={closeTrade}>
            <Text style={{ color: colors.textDim, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              { backgroundColor: colors.red, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 },
              q <= 0 && { opacity: 0.3 },
            ]}
            onPress={confirmTrade}
            disabled={q <= 0}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{isBuy ? 'BUY' : 'SELL'} {q > 0 ? q : ''}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
