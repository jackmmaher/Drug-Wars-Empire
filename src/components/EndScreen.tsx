import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, MILESTONES, DAYS, getRank, PERSONAS, DAYS_PER_LEVEL, getLevelConfig } from '../constants/game';
import { netWorth } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';
import { submitScore, fetchLeaderboard, type ScoreEntry } from '../lib/leaderboard';

export function EndScreen() {
  const { colors } = useTheme();
  const phase = useGameStore(s => s.phase);
  const cp = useGameStore(s => s.player);
  const campaign = useGameStore(s => s.campaign);
  const gameMode = useGameStore(s => s.gameMode);
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
        days_survived: Math.min(cp.day, DAYS_PER_LEVEL),
        won: phase === 'win',
      });
      setSubmitted(true);
      const lb = await fetchLeaderboard(10);
      setLeaderboard(lb);
    };
    run();
  }, []);

  const isCampaign = gameMode === 'campaign';
  const levelConfig = isCampaign ? getLevelConfig(campaign.level) : null;

  const stats = [
    ...(isCampaign ? [
      { label: 'Level', value: `${campaign.level} — ${levelConfig?.name}`, color: colors.yellow },
      { label: 'Total Days', value: campaign.campaignStats.totalDaysPlayed + Math.min(cp.day - 1, DAYS_PER_LEVEL) },
    ] : []),
    { label: 'Trades', value: cp.trades },
    { label: 'Best', value: $(cp.bestTrade), color: colors.green },
    { label: 'Streak', value: `${cp.maxStreak}x` },
    { label: 'Territories', value: Object.keys(cp.territories).length },
    { label: 'Close Calls', value: cp.closeCallCount },
    { label: 'Rep', value: cp.rep },
    { label: 'HP', value: `${cp.hp}%` },
    { label: 'Milestones', value: cp.milestones?.length || 0 },
    { label: 'Days', value: Math.min(cp.day - 1, DAYS_PER_LEVEL) },
    { label: 'Persona', value: persona ? persona.name : 'Classic' },
    ...(isCampaign && campaign.gangWar.defeatedGangs.length > 0 ? [
      { label: 'Gangs Defeated', value: campaign.gangWar.defeatedGangs.length, color: colors.red },
    ] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: 36, paddingHorizontal: 24, paddingBottom: 30 }}>
        <Text style={{ fontSize: 52, marginBottom: 4 }}>{isWin ? fr.emoji : '\uD83D\uDC80'}</Text>
        <Text style={{ fontSize: 30, fontWeight: '900', marginBottom: 4, color: isWin ? colors.green : colors.red }}>
          {isWin
            ? (isCampaign ? 'CAMPAIGN COMPLETE!' : 'SURVIVED')
            : cp.hp <= 0 ? 'DEAD'
            : (isCampaign ? `LEVEL ${campaign.level} FAILED` : 'GAME OVER')}
        </Text>
        {isCampaign && !isWin && (
          <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 4 }}>
            Campaign failure — restart from Level 1
          </Text>
        )}

        <Text style={{ fontSize: 15, color: colors.yellow, fontWeight: '800' }}>{fr.name}</Text>
        {persona && (
          <Text style={{ fontSize: 13, color: colors.textDim, marginTop: 1 }}>{persona.emoji} {persona.name}</Text>
        )}
        <Text style={{ fontSize: 26, fontWeight: '900', color: colors.white, marginVertical: 6 }}>Net: {$(fn)}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, maxWidth: 500, marginBottom: 14 }}>
          {stats.map((s, i) => (
            <View key={i} style={{
              backgroundColor: colors.bgCard, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10,
              alignItems: 'center', width: 110,
            }}>
              <Text style={{ fontSize: 10, color: colors.textDark, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</Text>
              <Text style={[{ fontSize: 14, fontWeight: '800', color: colors.text }, s.color ? { color: s.color } : null]}>
                {s.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
          {MILESTONES.map(m => (
            <Text
              key={m.id}
              style={[
                { fontSize: 20 },
                !cp.milestones?.includes(m.id) && { opacity: 0.12 },
              ]}
            >
              {m.emoji}
            </Text>
          ))}
        </View>

        {leaderboard.length > 0 && (
          <View style={{ marginTop: 14, width: '100%', maxWidth: 420 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.yellow, letterSpacing: 2, marginBottom: 6, textAlign: 'center' }}>
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

        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 16, marginBottom: 8 }}>Think you can do better?</Text>
        <TouchableOpacity style={{
          backgroundColor: colors.red, borderRadius: 10, paddingVertical: 16, paddingHorizontal: 48,
          shadowColor: colors.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
          elevation: 8,
        }} onPress={resetToTitle} activeOpacity={0.8}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 }}>{'\uD83C\uDFB2'} ONE MORE RUN</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
