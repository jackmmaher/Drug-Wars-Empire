import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useGameStore } from '../stores/gameStore';
import type { TabId } from '../types/game';
import { GameHeader } from './GameHeader';
import { MarketTab } from './MarketTab';
import { MapTab } from './MapTab';
import { IntelTab } from './IntelTab';

const TABS: { id: TabId; label: string }[] = [
  { id: 'market', label: 'Market' },
  { id: 'map', label: 'Travel' },
  { id: 'intel', label: 'Intel' },
];

export function GameScreen() {
  const { colors } = useTheme();
  const activeTab = useGameStore(s => s.activeTab);
  const setTab = useGameStore(s => s.setTab);
  const notifications = useGameStore(s => s.notifications);
  const hasSeenRules = useGameStore(s => s.hasSeenRules);
  const dismissRules = useGameStore(s => s.dismissRules);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Notifications */}
      <View style={{ position: 'absolute', top: 50, right: 12, zIndex: 999, gap: 6 }} pointerEvents="none">
        {notifications.map(n => (
          <View key={n.key} style={[
            { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, maxWidth: 280 },
            n.type === 'profit' ? { backgroundColor: '#16a34a' }
              : n.type === 'danger' ? { backgroundColor: '#dc2626' }
              : n.type === 'tip' ? { backgroundColor: '#7c3aed' }
              : { backgroundColor: '#1e40af' },
          ]}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{n.message}</Text>
          </View>
        ))}
      </View>

      {/* Rules overlay -- shown on first game */}
      {!hasSeenRules && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.bg + 'f8', zIndex: 100, padding: 24,
        }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: colors.red, textAlign: 'center', marginBottom: 20 }}>HOW TO PLAY</Text>
            <Text style={{ fontSize: 16, color: colors.text, lineHeight: 24, marginBottom: 14 }}>
              You have 30 days to make as much money as possible and pay off your debt. Buy drugs low, sell high, and don't get caught.
            </Text>

            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.yellow, marginBottom: 8 }}>Trading</Text>
            <Text style={{ fontSize: 15, color: colors.textDim, lineHeight: 22, marginBottom: 14 }}>
              Drug prices change every time you travel. Watch for market events -- they cause massive price spikes and crashes. Buy during crashes, sell during spikes.
            </Text>

            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.yellow, marginBottom: 8 }}>Travel</Text>
            <Text style={{ fontSize: 15, color: colors.textDim, lineHeight: 22, marginBottom: 14 }}>
              Moving between cities costs 1 day. Flying internationally costs money, takes 2 days, and requires reputation. Each day your debt grows 10%.
            </Text>

            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.yellow, marginBottom: 8 }}>Heat & Cops</Text>
            <Text style={{ fontSize: 15, color: colors.textDim, lineHeight: 22, marginBottom: 14 }}>
              Trading and fighting raises heat. Higher heat means more cop encounters. You can run, fight (better with a gun), or bribe. Heat decays when you travel.
            </Text>

            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.yellow, marginBottom: 8 }}>International</Text>
            <Text style={{ fontSize: 15, color: colors.textDim, lineHeight: 22, marginBottom: 14 }}>
              Different regions have different drug prices. Cocaine is cheap in Colombia, ecstasy in Netherlands. Buy low abroad, sell high in NYC. Watch out for customs!
            </Text>

            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.yellow, marginBottom: 8 }}>Debt & Banking</Text>
            <Text style={{ fontSize: 15, color: colors.textDim, lineHeight: 22, marginBottom: 14 }}>
              Your debt compounds 10% each day you travel. Pay it off early! Use the bank to save money safely. You can borrow more from the loan shark if desperate.
            </Text>

            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.yellow, marginBottom: 8 }}>Consignment</Text>
            <Text style={{ fontSize: 15, color: colors.textDim, lineHeight: 22, marginBottom: 14 }}>
              Gangs may offer drugs on credit. Sell them and pay back within 5 turns, or lose fingers. Fewer fingers = less carry space, worse sell prices, and slower travel.
            </Text>

            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.yellow, marginBottom: 8 }}>Win Condition</Text>
            <Text style={{ fontSize: 15, color: colors.textDim, lineHeight: 22, marginBottom: 14 }}>
              Pay off your debt by Day 30. Your final score is your net worth -- cash + bank + inventory value - debt. Aim for the leaderboard!
            </Text>

            <TouchableOpacity onPress={dismissRules} style={{
              backgroundColor: colors.red, borderRadius: 8, paddingVertical: 16, paddingHorizontal: 36, alignSelf: 'center', marginTop: 20,
            }} activeOpacity={0.7}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1 }}>GOT IT -- LET'S GO</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <View style={{ flex: 1, maxWidth: 1100, width: '100%', alignSelf: 'center', paddingHorizontal: 8 }}>
        <GameHeader />

        {/* Tab bar */}
        <View style={{
          flexDirection: 'row', marginHorizontal: 8, marginVertical: 6,
          backgroundColor: colors.bgCard, borderRadius: 8, padding: 3,
        }}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[
                { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
                activeTab === t.id && { backgroundColor: colors.bgCardHover },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                { fontSize: 14, fontWeight: '700', color: colors.textDark, textTransform: 'uppercase', letterSpacing: 1 },
                activeTab === t.id && { color: colors.text },
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'market' && <MarketTab />}
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'intel' && <IntelTab />}
      </View>
    </SafeAreaView>
  );
}
