import React, { useState, useEffect } from 'react';
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

  const [showConfirm, setShowConfirm] = useState(false);

  // Reset confirmation state when modal opens/closes
  useEffect(() => {
    setShowConfirm(false);
  }, [activeTrade?.drugId, activeTrade?.type]);

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
        <Text style={{ fontSize: 36 }}>{drug.emoji}</Text>
        <Text style={{ color: colors.white, fontSize: 20, fontWeight: '900', marginTop: 4, marginBottom: 2 }}>
          {isBuy ? 'BUY' : 'SELL'} {drug.name}
        </Text>
        <Text style={{ color: colors.textDim, fontSize: 15 }}>{$(price)} each</Text>

        {!isBuy && avg ? (
          <View style={{ alignItems: 'center', marginVertical: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: pnlPct > 0 ? colors.green : colors.red }}>
              {pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(0)}%
            </Text>
            {pnlPct < 0 && (
              <Text style={{ color: colors.red, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                Selling at a loss
              </Text>
            )}
          </View>
        ) : null}

        <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 10 }}>
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

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginVertical: 10, justifyContent: 'center' }}>
          {quickAmounts.map(n => (
            <TouchableOpacity key={n} style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
              borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10,
            }} onPress={() => setTradeQuantity(String(n))}>
              <Text style={{ color: colors.textDim, fontSize: 13, fontWeight: '600' }}>{n}</Text>
            </TouchableOpacity>
          ))}
          {pctButtons.map(btn => (
            <TouchableOpacity key={btn.label} style={{
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
              borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10,
            }} onPress={() => setTradeQuantity(String(btn.value))}>
              <Text style={{ color: colors.textDim, fontSize: 13, fontWeight: '600' }}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={{
            backgroundColor: colors.green, borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10,
          }} onPress={() => setTradeQuantity('max')}>
            <Text style={{ color: '#000', fontSize: 13, fontWeight: '800' }}>MAX</Text>
          </TouchableOpacity>
        </View>

        {q > 0 && (
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.white, marginBottom: 3 }}>
              {isBuy ? 'Cost' : 'Revenue'}: {$(total)}
            </Text>
            {!isBuy && pnl !== 0 && (
              <Text style={{ fontSize: 14, fontWeight: '700', color: pnl > 0 ? colors.green : colors.red }}>
                Profit: {pnl > 0 ? '+' : ''}{$(pnl)} ({pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(0)}%)
              </Text>
            )}
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 3 }}>
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
            onPress={() => {
              if (q <= 0) return;
              if (total > 5000 && !showConfirm) {
                setShowConfirm(true);
              } else {
                confirmTrade();
                setShowConfirm(false);
              }
            }}
            disabled={q <= 0}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{isBuy ? 'BUY' : 'SELL'} {q > 0 ? q : ''}</Text>
          </TouchableOpacity>
        </View>

        {/* Trade confirmation overlay for > $5K */}
        {showConfirm && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: colors.bgCard, borderRadius: 10, padding: 20,
              borderWidth: 1, borderColor: colors.cardBorder, maxWidth: 320, width: '85%',
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.white, textAlign: 'center', marginBottom: 8 }}>
                Confirm: {isBuy ? 'Buy' : 'Sell'} {q} {drug.name} for {$(total)}?
              </Text>
              {!isBuy && pnl < 0 && (
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.red, marginBottom: 8 }}>
                  Selling at a loss!
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setShowConfirm(false)}
                  style={{
                    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
                    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20,
                  }}
                >
                  <Text style={{ color: colors.textDim, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    confirmTrade();
                    setShowConfirm(false);
                  }}
                  style={{
                    backgroundColor: isBuy ? '#16a34a' : '#d97706',
                    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
