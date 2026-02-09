import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, MILESTONES, DAYS, getRank, PERSONAS } from '../constants/game';
import { netWorth } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';
import { submitScore, fetchLeaderboard, type ScoreEntry } from '../lib/leaderboard';
import { AdBanner } from './AdBanner';

export function EndScreen() {
  const { colors } = useTheme();
  const phase = useGameStore(s => s.phase);
  const cp = useGameStore(s => s.player);
  const resetToTitle = useGameStore(s => s.resetToTitle);
  const playerName = useGameStore(s => s.playerName);

  const [leaderboard, setLeaderboard] = React.useState<ScoreEntry[]>([]);
  const [submitted, setSubmitted] = React.useState(false);

  const isWin = phase === 'win';
  const fn = cp.cash + cp.bank - cp.debt;
  const fr = getRank(cp.rep);
  const persona = cp.personaId ? PERSONAS.find(p => p.id === cp.personaId) : null;

  React.useEffect(() => {
    const run = async () => {
      const nw = netWorth(cp);
      const rank = getRank(cp.rep);
      await submitScore({
        player_name: playerName,
        net_worth: nw,
        rank_name: rank.name,
        difficulty: 'standard',
        rep: cp.rep,
        territories: Object.keys(cp.territories).length,
        milestones: cp.milestones.length,
        trades: cp.trades,
        best_trade: cp.bestTrade,
        fingers: cp.fingers,
        days_survived: Math.min(cp.day, DAYS),
        won: phase === 'win',
      });
      setSubmitted(true);
      const lb = await fetchLeaderboard(10);
      setLeaderboard(lb);
    };
    run();
  }, []);

  const stats = [
    { label: 'Trades', value: cp.trades },
    { label: 'Best', value: $(cp.bestTrade), color: colors.green },
    { label: 'Streak', value: `${cp.maxStreak}x` },
    { label: 'Territories', value: Object.keys(cp.territories).length },
    { label: 'Close Calls', value: cp.closeCallCount },
    { label: 'Rep', value: cp.rep },
    { label: 'HP', value: `${cp.hp}%` },
    { label: 'Milestones', value: cp.milestones?.length || 0 },
    { label: 'Days', value: Math.min(cp.day - 1, DAYS) },
    { label: 'Persona', value: persona ? persona.name : 'Classic' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 64, marginBottom: 6 }}>{isWin ? fr.emoji : '\uD83D\uDC80'}</Text>
        <Text style={{ fontSize: 34, fontWeight: '900', marginBottom: 6, color: isWin ? colors.green : colors.red }}>
          {isWin ? 'SURVIVED' : cp.hp <= 0 ? 'DEAD' : 'GAME OVER'}
        </Text>

        <Text style={{ fontSize: 17, color: colors.yellow, fontWeight: '800' }}>{fr.name}</Text>
        {persona && (
          <Text style={{ fontSize: 14, color: colors.textDim, marginTop: 2 }}>{persona.emoji} {persona.name}</Text>
        )}
        <Text style={{ fontSize: 30, fontWeight: '900', color: colors.white, marginVertical: 8 }}>Net: {$(fn)}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 500, marginBottom: 20 }}>
          {stats.map((s, i) => (
            <View key={i} style={{
              backgroundColor: colors.bgCard, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14,
              alignItems: 'center', width: 120,
            }}>
              <Text style={{ fontSize: 12, color: colors.textDark, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</Text>
              <Text style={[{ fontSize: 16, fontWeight: '800', color: colors.text }, s.color ? { color: s.color } : null]}>
                {s.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
          {MILESTONES.map(m => (
            <Text
              key={m.id}
              style={[
                { fontSize: 22 },
                !cp.milestones?.includes(m.id) && { opacity: 0.12 },
              ]}
            >
              {m.emoji}
            </Text>
          ))}
        </View>

        <AdBanner slot="end-banner" />

        {leaderboard.length > 0 && (
          <View style={{ marginTop: 20, width: '100%', maxWidth: 420 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.yellow, letterSpacing: 2, marginBottom: 10, textAlign: 'center' }}>
              LEADERBOARD
            </Text>
            {leaderboard.map((entry, i) => (
              <View key={entry.id} style={{
                flexDirection: 'row', justifyContent: 'space-between',
                paddingVertical: 6, paddingHorizontal: 12,
                backgroundColor: entry.player_name === playerName ? 'rgba(245,158,11,0.08)' : 'transparent',
                borderRadius: 5,
              }}>
                <Text style={{ fontSize: 15, color: i < 3 ? colors.yellow : colors.textDim }}>
                  {i + 1}. {entry.player_name}
                </Text>
                <Text style={{ fontSize: 15, color: colors.text, fontWeight: '600' }}>
                  ${entry.net_worth.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={{
          backgroundColor: colors.red, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40, marginTop: 20,
        }} onPress={resetToTitle} activeOpacity={0.8}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1 }}>PLAY AGAIN</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
