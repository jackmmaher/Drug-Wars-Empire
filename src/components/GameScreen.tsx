import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { useGameStore } from '../stores/gameStore';
import type { TabId } from '../types/game';
import { GameHeader } from './GameHeader';
import { MarketTab } from './MarketTab';
import { MapTab } from './MapTab';
import { IntelTab } from './IntelTab';

const TABS: { id: TabId; label: string }[] = [
  { id: 'market', label: '📊 Market' },
  { id: 'map', label: '🗺️ Travel' },
  { id: 'intel', label: '📡 Intel' },
];

export function GameScreen() {
  const activeTab = useGameStore(s => s.activeTab);
  const setTab = useGameStore(s => s.setTab);
  const notifications = useGameStore(s => s.notifications);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Notifications */}
      <View style={styles.notifContainer} pointerEvents="none">
        {notifications.map(n => (
          <View key={n.key} style={[
            styles.notif,
            n.type === 'profit' ? styles.notifProfit
              : n.type === 'danger' ? styles.notifDanger
              : n.type === 'tip' ? styles.notifTip
              : styles.notifInfo,
          ]}>
            <Text style={styles.notifText}>{n.message}</Text>
          </View>
        ))}
      </View>

      <View style={styles.game}>
        <GameHeader />

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tab, activeTab === t.id && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  notifContainer: {
    position: 'absolute',
    top: 50,
    right: 6,
    zIndex: 999,
    gap: 4,
  },
  notif: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    maxWidth: 200,
  },
  notifProfit: { backgroundColor: '#16a34a' },
  notifDanger: { backgroundColor: '#dc2626' },
  notifTip: { backgroundColor: '#7c3aed' },
  notifInfo: { backgroundColor: '#1e40af' },
  notifText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  game: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 8,
    marginVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderRadius: 5,
    padding: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 3,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#cbd5e1',
  },
});
