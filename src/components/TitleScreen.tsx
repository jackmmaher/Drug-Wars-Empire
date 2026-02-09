import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, STARTING_CASH, STARTING_DEBT, DAYS, PERSONAS } from '../constants/game';
import { useGameStore } from '../stores/gameStore';
import { AdBanner } from './AdBanner';

const TAGS = ['International', 'Territory', 'Informants', 'Gangs', 'Near Misses', 'Ranks', 'Personas'];

export function TitleScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const startGame = useGameStore(s => s.startGame);
  const playerName = useGameStore(s => s.playerName);
  const setPlayerName = useGameStore(s => s.setPlayerName);
  const selectedPersona = useGameStore(s => s.selectedPersona);
  const setSelectedPersona = useGameStore(s => s.setSelectedPersona);
  const [difficulty, setDifficulty] = React.useState<'conservative' | 'standard' | 'highroller'>('standard');
  const canPlay = playerName.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ alignItems: 'center', paddingHorizontal: 24, maxWidth: 520 }}>
        {/* Theme toggle */}
        <TouchableOpacity onPress={toggleTheme} style={{
          position: 'absolute', top: -40, right: 0,
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: colors.bgCardHover,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 20 }}>{mode === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 14, letterSpacing: 8, color: colors.textDim, textTransform: 'uppercase', marginBottom: 16 }}>Empire Edition</Text>
        <Text style={{ fontSize: 64, fontWeight: '900', color: colors.red, lineHeight: 68, letterSpacing: -3 }}>DRUG</Text>
        <Text style={{ fontSize: 64, fontWeight: '900', color: colors.yellow, lineHeight: 68, letterSpacing: -3 }}>WARS</Text>
        <View style={{ width: 80, height: 1, backgroundColor: colors.red, marginVertical: 20, opacity: 0.5 }} />

        <Text style={{ color: colors.textMuted, fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 24 }}>
          You owe{' '}
          <Text style={{ color: colors.red, fontWeight: '700' }}>{$(STARTING_DEBT)}</Text> to the shark.{' '}
          <Text style={{ color: colors.green, fontWeight: '700' }}>{$(STARTING_CASH)}</Text> in your pocket.
          <Text style={{ color: colors.yellow, fontWeight: '700' }}> {DAYS} days</Text> to build an empire, go international, control territory, and survive.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {TAGS.map((t, i) => (
            <View key={i} style={{
              backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderLight,
              borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
            }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{t}</Text>
            </View>
          ))}
        </View>

        <TextInput
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Enter your name..."
          placeholderTextColor={colors.textDark}
          maxLength={20}
          style={{
            backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderLight,
            borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16,
            fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: 16, width: '100%', maxWidth: 320,
          }}
        />

        {/* Persona Selector */}
        <Text style={{ fontSize: 11, letterSpacing: 3, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
          CHOOSE YOUR PERSONA
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 4, paddingVertical: 4 }}
          style={{ marginBottom: 12, maxWidth: '100%' }}
        >
          {/* Classic (no persona) option */}
          <TouchableOpacity
            onPress={() => setSelectedPersona(null)}
            style={{
              width: 110,
              backgroundColor: selectedPersona === null ? 'rgba(239,68,68,0.12)' : colors.bgCard,
              borderWidth: 1.5,
              borderColor: selectedPersona === null ? colors.red : colors.borderLight,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 32 }}>{'\u2694\uFE0F'}</Text>
            <Text style={{
              fontSize: 13, fontWeight: '700', marginTop: 4,
              color: selectedPersona === null ? colors.red : colors.textDim,
            }}>Classic</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' }}>No modifiers</Text>
          </TouchableOpacity>

          {/* Persona cards */}
          {PERSONAS.map(p => {
            const isSelected = selectedPersona === p.id;
            // Pick 2-3 notable modifier pills from tagline
            const pills = p.tagline.split(', ').slice(0, 3);
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedPersona(p.id)}
                style={{
                  width: 110,
                  backgroundColor: isSelected ? 'rgba(239,68,68,0.12)' : colors.bgCard,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.yellow : colors.borderLight,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 32 }}>{p.emoji}</Text>
                <Text style={{
                  fontSize: 13, fontWeight: '700', marginTop: 4,
                  color: isSelected ? colors.yellow : colors.textDim,
                }} numberOfLines={1}>{p.name}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' }} numberOfLines={1}>
                  {p.tagline}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3, marginTop: 5 }}>
                  {pills.map((pill, i) => (
                    <View key={i} style={{
                      backgroundColor: isSelected ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                      borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 8, color: isSelected ? colors.yellow : colors.textMuted }}>{pill}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Persona detail panel */}
        {selectedPersona && (() => {
          const persona = PERSONAS.find(p => p.id === selectedPersona);
          if (!persona) return null;
          return (
            <View style={{
              backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.yellow,
              borderRadius: 8, padding: 12, marginBottom: 8, width: '100%', maxWidth: 320,
            }}>
              <Text style={{ fontSize: 13, color: colors.yellow, fontWeight: '700', marginBottom: 4 }}>
                {persona.emoji} {persona.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textDim, lineHeight: 18 }}>
                {persona.backstory}
              </Text>
            </View>
          );
        })()}

        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 14, justifyContent: 'center' }}>
          {([
            { id: 'conservative', emoji: '\u{1F6E1}\uFE0F', label: 'Safe', cash: '$500', debt: '$2K' },
            { id: 'standard', emoji: '\u2696\uFE0F', label: 'Standard', cash: '$3.5K', debt: '$4K' },
            { id: 'highroller', emoji: '\u{1F3B2}', label: 'High Roller', cash: '$6K', debt: '$12K' },
          ] as const).map(d => (
            <TouchableOpacity
              key={d.id}
              onPress={() => setDifficulty(d.id)}
              style={{
                flex: 1,
                backgroundColor: difficulty === d.id ? 'rgba(239,68,68,0.12)' : colors.bgCard,
                borderWidth: 1,
                borderColor: difficulty === d.id ? 'rgba(239,68,68,0.3)' : colors.borderLight,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 6,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 22 }}>{d.emoji}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: difficulty === d.id ? colors.red : colors.textDim, marginTop: 4 }}>{d.label}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{d.cash} / {d.debt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={[
              { backgroundColor: colors.red, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40 },
              !canPlay && { opacity: 0.4 },
            ]}
            onPress={() => canPlay && startGame(difficulty)}
            activeOpacity={0.8}
            disabled={!canPlay}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1 }}>PLAY</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 12, color: colors.textDarkest, marginTop: 20 }}>Based on John E. Dell's 1984 classic</Text>
      </View>

      <AdBanner slot="title-banner" />
    </View>
  );
}
