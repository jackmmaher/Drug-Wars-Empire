import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, type ScrollView as ScrollViewType } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { PERSONAS } from '../constants/game';
import { useGameStore } from '../stores/gameStore';
import { AdBanner } from './AdBanner';

export function TitleScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const startGame = useGameStore(s => s.startGame);
  const playerName = useGameStore(s => s.playerName);
  const setPlayerName = useGameStore(s => s.setPlayerName);
  const selectedPersona = useGameStore(s => s.selectedPersona);
  const setSelectedPersona = useGameStore(s => s.setSelectedPersona);
  const gameMode = useGameStore(s => s.gameMode);
  const setGameMode = useGameStore(s => s.setGameMode);
  const [difficulty, setDifficulty] = React.useState<'conservative' | 'standard' | 'highroller'>('standard');
  const canPlay = playerName.trim().length > 0;
  const scrollRef = useRef<ScrollViewType>(null);
  const [scrollPos, setScrollPos] = React.useState(0);
  const cardWidth = 98; // 90 card + 8 gap

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ alignItems: 'center', paddingHorizontal: 24, maxWidth: 480 }}>
        {/* Theme toggle */}
        <TouchableOpacity onPress={toggleTheme} style={{
          position: 'absolute', top: -40, right: 0,
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: colors.bgCardHover,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 20 }}>{mode === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 48, fontWeight: '900', color: colors.white, letterSpacing: -2 }}>
          <Text style={{ color: colors.red }}>DRUG</Text>{' '}<Text style={{ color: colors.yellow }}>WARS</Text>
        </Text>
        <Text style={{ fontSize: 11, letterSpacing: 6, color: colors.textDim, textTransform: 'uppercase', marginTop: 2, marginBottom: 6 }}>Empire Edition</Text>
        <View style={{ width: 40, height: 1, backgroundColor: colors.red, marginBottom: 12, opacity: 0.5 }} />

        <TextInput
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Enter your name..."
          placeholderTextColor={colors.textDark}
          maxLength={20}
          style={{
            backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderLight,
            borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16,
            fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: 12, width: '100%', maxWidth: 320,
          }}
        />

        {/* Campaign/Classic Mode Toggle */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, width: '100%', maxWidth: 320 }}>
          {([
            { id: 'campaign' as const, emoji: '\uD83C\uDFF4', label: 'Campaign', desc: '3 levels, 90 days' },
            { id: 'classic' as const, emoji: '\u2694\uFE0F', label: 'Classic', desc: '30 days, all features' },
          ]).map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setGameMode(m.id)}
              style={{
                flex: 1,
                backgroundColor: gameMode === m.id ? 'rgba(239,68,68,0.12)' : colors.bgCard,
                borderWidth: 1.5,
                borderColor: gameMode === m.id ? colors.red : colors.borderLight,
                borderRadius: 8,
                paddingVertical: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
              <Text style={{
                fontSize: 13, fontWeight: '700', marginTop: 2,
                color: gameMode === m.id ? colors.red : colors.textDim,
              }}>{m.label}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Persona Selector */}
        <Text style={{ fontSize: 10, letterSpacing: 3, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
          CHOOSE YOUR PERSONA
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, maxWidth: '100%' }}>
          <TouchableOpacity
            onPress={() => {
              const newPos = Math.max(0, scrollPos - cardWidth * 2);
              scrollRef.current?.scrollTo({ x: newPos, animated: true });
              setScrollPos(newPos);
            }}
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: colors.bgCardHover,
              alignItems: 'center', justifyContent: 'center',
              marginRight: 4,
            }}
          >
            <Text style={{ color: colors.textDim, fontSize: 16, fontWeight: '800' }}>{'\u2039'}</Text>
          </TouchableOpacity>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 4, paddingVertical: 2 }}
          style={{ flex: 1 }}
          onScroll={(e) => setScrollPos(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
        >
          {/* Classic (no persona) option */}
          <TouchableOpacity
            onPress={() => setSelectedPersona(null)}
            style={{
              width: 90,
              backgroundColor: selectedPersona === null ? 'rgba(239,68,68,0.12)' : colors.bgCard,
              borderWidth: 1.5,
              borderColor: selectedPersona === null ? colors.red : colors.borderLight,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 6,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 28 }}>{'\u2694\uFE0F'}</Text>
            <Text style={{
              fontSize: 12, fontWeight: '700', marginTop: 3,
              color: selectedPersona === null ? colors.red : colors.textDim,
            }}>Classic</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1, textAlign: 'center' }} numberOfLines={1}>No modifiers</Text>
          </TouchableOpacity>

          {/* Persona cards */}
          {PERSONAS.map(p => {
            const isSelected = selectedPersona === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedPersona(p.id)}
                style={{
                  width: 90,
                  backgroundColor: isSelected ? 'rgba(245,158,11,0.08)' : colors.bgCard,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.yellow : colors.borderLight,
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
                <Text style={{
                  fontSize: 12, fontWeight: '700', marginTop: 3,
                  color: isSelected ? colors.yellow : colors.textDim,
                }} numberOfLines={1}>{p.name}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1, textAlign: 'center' }} numberOfLines={1}>
                  {p.tagline}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
          <TouchableOpacity
            onPress={() => {
              const newPos = scrollPos + cardWidth * 2;
              scrollRef.current?.scrollTo({ x: newPos, animated: true });
              setScrollPos(newPos);
            }}
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: colors.bgCardHover,
              alignItems: 'center', justifyContent: 'center',
              marginLeft: 4,
            }}
          >
            <Text style={{ color: colors.textDim, fontSize: 16, fontWeight: '800' }}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>

        {/* Persona detail panel */}
        {selectedPersona && (() => {
          const persona = PERSONAS.find(p => p.id === selectedPersona);
          if (!persona) return null;
          return (
            <View style={{
              backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.yellow,
              borderRadius: 8, padding: 10, marginBottom: 6, width: '100%', maxWidth: 320,
            }}>
              <Text style={{ fontSize: 12, color: colors.yellow, fontWeight: '700', marginBottom: 3 }}>
                {persona.emoji} {persona.name}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textDim, lineHeight: 16 }}>
                {persona.backstory}
              </Text>
            </View>
          );
        })()}

        <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8, justifyContent: 'center', width: '100%', maxWidth: 320 }}>
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
                paddingVertical: 8,
                paddingHorizontal: 4,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>{d.emoji}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: difficulty === d.id ? colors.red : colors.textDim, marginTop: 2 }}>{d.label}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{d.cash} / {d.debt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            { backgroundColor: colors.red, borderRadius: 8, paddingVertical: 14, width: '100%', maxWidth: 320, alignItems: 'center' },
            !canPlay && { opacity: 0.4 },
          ]}
          onPress={() => canPlay && startGame(difficulty)}
          activeOpacity={0.8}
          disabled={!canPlay}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 }}>PLAY</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 11, color: colors.textDarkest, marginTop: 14 }}>Based on John E. Dell's 1984 classic</Text>
      </View>

      <AdBanner slot="title-banner" />
    </View>
  );
}
