import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, type ScrollView as ScrollViewType } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { PERSONAS, DEFAULT_MODIFIERS, LOCATIONS } from '../constants/game';
import { useGameStore } from '../stores/gameStore';
import type { PersonaModifiers } from '../types/game';

function getModifierLines(mods: PersonaModifiers): Array<{ text: string; positive: boolean }> {
  const lines: Array<{ text: string; positive: boolean }> = [];
  const d = DEFAULT_MODIFIERS;
  if (mods.startingCashMultiplier !== d.startingCashMultiplier) {
    const pct = Math.round((mods.startingCashMultiplier - 1) * 100);
    lines.push({ text: `${pct > 0 ? '+' : ''}${pct}% starting cash`, positive: pct > 0 });
  }
  if (mods.startingDebtMultiplier !== d.startingDebtMultiplier) {
    if (mods.startingDebtMultiplier === 0) lines.push({ text: 'No starting debt', positive: true });
    else {
      const pct = Math.round((mods.startingDebtMultiplier - 1) * 100);
      lines.push({ text: `${pct > 0 ? '+' : ''}${pct}% starting debt`, positive: pct < 0 });
    }
  }
  if (mods.startingSpaceOffset !== d.startingSpaceOffset) {
    lines.push({ text: `${mods.startingSpaceOffset > 0 ? '+' : ''}${mods.startingSpaceOffset} inventory space`, positive: mods.startingSpaceOffset > 0 });
  }
  if (mods.startingHP !== d.startingHP) {
    lines.push({ text: `${mods.startingHP} starting HP`, positive: mods.startingHP > d.startingHP });
  }
  if (mods.startingRep !== d.startingRep) {
    lines.push({ text: `+${mods.startingRep} starting rep`, positive: true });
  }
  if (mods.startingGun) lines.push({ text: 'Starts with a gun', positive: true });
  if (mods.preHiredRat) lines.push({ text: 'Starts with an informant', positive: true });
  if (mods.startingLocation !== d.startingLocation) {
    const loc = LOCATIONS.find(l => l.id === mods.startingLocation);
    lines.push({ text: `Starts in ${loc?.name || mods.startingLocation}`, positive: true });
  }
  if (mods.sellPriceBonus !== d.sellPriceBonus) {
    const pct = Math.round(mods.sellPriceBonus * 100);
    lines.push({ text: `${pct > 0 ? '+' : ''}${pct}% sell prices`, positive: pct > 0 });
  }
  if (mods.heatGainMultiplier !== d.heatGainMultiplier) {
    const pct = Math.round((mods.heatGainMultiplier - 1) * 100);
    lines.push({ text: `${pct > 0 ? '+' : ''}${pct}% heat gain`, positive: pct < 0 });
  }
  if (mods.heatDecayBonus !== d.heatDecayBonus) {
    lines.push({ text: `+${mods.heatDecayBonus} heat decay/turn`, positive: true });
  }
  if (mods.repGainMultiplier !== d.repGainMultiplier) {
    const pct = Math.round((mods.repGainMultiplier - 1) * 100);
    lines.push({ text: `${pct > 0 ? '+' : ''}${pct}% rep gain`, positive: pct > 0 });
  }
  if (mods.copRunChanceBonus !== d.copRunChanceBonus) {
    lines.push({ text: `+${Math.round(mods.copRunChanceBonus * 100)}% run chance`, positive: true });
  }
  if (mods.copFightKillBonus !== d.copFightKillBonus) {
    lines.push({ text: `+${Math.round(mods.copFightKillBonus * 100)}% fight bonus`, positive: true });
  }
  if (mods.fightDamageReduction !== d.fightDamageReduction) {
    lines.push({ text: `-${Math.round(mods.fightDamageReduction * 100)}% damage taken`, positive: true });
  }
  if (mods.bribeCostMultiplier !== d.bribeCostMultiplier) {
    const pct = Math.round((mods.bribeCostMultiplier - 1) * 100);
    lines.push({ text: `${pct > 0 ? '+' : ''}${pct}% bribe cost`, positive: pct < 0 });
  }
  if (mods.copEncounterReduction !== d.copEncounterReduction) {
    lines.push({ text: `-${Math.round(mods.copEncounterReduction * 100)}% cop encounters`, positive: true });
  }
  if (mods.customsEvasionBonus !== d.customsEvasionBonus) {
    lines.push({ text: `+${Math.round(mods.customsEvasionBonus * 100)}% customs evasion`, positive: true });
  }
  if (mods.gangRelGainMultiplier !== d.gangRelGainMultiplier) {
    const pct = Math.round((mods.gangRelGainMultiplier - 1) * 100);
    lines.push({ text: `${pct > 0 ? '+' : ''}${pct}% gang relation gain`, positive: pct > 0 });
  }
  if (mods.consignmentMarkupMultiplier !== d.consignmentMarkupMultiplier) {
    const pct = Math.round((mods.consignmentMarkupMultiplier - 1) * 100);
    lines.push({ text: `${pct > 0 ? '+' : ''}${pct}% consignment markup`, positive: pct < 0 });
  }
  if (mods.territoryDiscountMultiplier !== d.territoryDiscountMultiplier) {
    const pct = Math.round((1 - mods.territoryDiscountMultiplier) * 100);
    lines.push({ text: `-${pct}% territory cost`, positive: true });
  }
  if (mods.muggingChanceMultiplier !== d.muggingChanceMultiplier) {
    const pct = Math.round((mods.muggingChanceMultiplier - 1) * 100);
    lines.push({ text: `${pct > 0 ? '+' : ''}${pct}% mugging chance`, positive: pct < 0 });
  }
  if (mods.startingGangRelationOffset !== d.startingGangRelationOffset) {
    lines.push({ text: `${mods.startingGangRelationOffset > 0 ? '+' : ''}${mods.startingGangRelationOffset} gang relations`, positive: mods.startingGangRelationOffset > 0 });
  }
  return lines;
}

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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: 'center', paddingHorizontal: 24, maxWidth: 480, width: '100%' }}>
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
          const modLines = getModifierLines(persona.modifiers);
          const strengths = modLines.filter(l => l.positive);
          const weaknesses = modLines.filter(l => !l.positive);
          return (
            <View style={{
              backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.yellow,
              borderRadius: 10, padding: 14, marginBottom: 8, width: '100%', maxWidth: 320,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 22, marginRight: 8 }}>{persona.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: colors.yellow, fontWeight: '800' }}>
                    {persona.name}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.textDim, lineHeight: 17, marginBottom: 10 }}>
                {persona.backstory}
              </Text>

              {strengths.length > 0 && (
                <View style={{ marginBottom: weaknesses.length > 0 ? 8 : 0 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.green, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>
                    Strengths
                  </Text>
                  {strengths.map((line, i) => (
                    <View key={i} style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 4,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: 'rgba(34,197,94,0.06)',
                    }}>
                      <Text style={{ fontSize: 12, color: colors.green, width: 16, fontWeight: '700' }}>+</Text>
                      <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500', flex: 1 }}>
                        {line.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {weaknesses.length > 0 && (
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.red, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>
                    Weaknesses
                  </Text>
                  {weaknesses.map((line, i) => (
                    <View key={i} style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 4,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: 'rgba(239,68,68,0.06)',
                    }}>
                      <Text style={{ fontSize: 12, color: colors.red, width: 16, fontWeight: '700' }}>{'\u2013'}</Text>
                      <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500', flex: 1 }}>
                        {line.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
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

    </ScrollView>
  );
}
