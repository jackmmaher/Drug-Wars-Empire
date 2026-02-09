import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { $, DRUGS, GANGS, getRegionForLocation, DEFAULT_LAW, getPersonaModifiers } from '../constants/game';
import { inventoryCount } from '../lib/game-logic';
import { useGameStore } from '../stores/gameStore';

export function CopScreen() {
  const { colors } = useTheme();
  const copAct = useGameStore(s => s.copAct);
  const cp = useGameStore(s => s.player);
  const isShaking = useGameStore(s => s.isShaking);

  const cops = cp.cops!;
  const isBountyHunter = !!cops.bountyHunter;
  const isGangCollector = !!cops.gangCollector;
  const isGangWarBattle = !!cops.gangWarBattle;
  const law = cops.regionLaw || DEFAULT_LAW;
  const bribeCost = cops.bribeCost * cops.count;
  const used = inventoryCount(cp.inventory);
  const mods = getPersonaModifiers(cp.personaId);

  const actionBtn = {
    borderRadius: 8, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' as const,
    minHeight: 48,
  };

  // Gang War Battle
  if (isGangWarBattle) {
    const battle = cops.gangWarBattle!;
    const gang = GANGS.find(g => g.id === battle.gangId);
    const gangName = gang?.name || 'Enemy gang';
    const fightChance = cp.gun ? 35 : 15;
    const negotiateCost = cops.bribeCost;

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center', paddingHorizontal: 24, maxWidth: 500 }}>
          <Text style={{ fontSize: 56 }}>{gang?.emoji || '⚔️'}</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.red, marginVertical: 10 }}>
            GANG WAR!
          </Text>
          <Text style={{ color: colors.redLight, fontSize: 16, marginBottom: 4 }}>
            {gangName} fighters {battle.type === 'ambush' ? 'ambushed you!' : 'defending their turf!'}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, fontStyle: 'italic', marginBottom: 4 }}>
            Enemy strength: {battle.enemyStrength}%
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 15, marginBottom: 20 }}>
            Cash: {$(cp.cash)} {'\u2022'} HP: {cp.hp}
          </Text>

          <View style={{ width: 320, gap: 10 }}>
            <TouchableOpacity style={[actionBtn, { backgroundColor: colors.red }]} onPress={() => copAct('fight')} activeOpacity={0.8}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {cp.gun ? 'FIGHT (armed)' : 'FIGHT (fists)'} <Text style={{ opacity: 0.7 }}>{fightChance}% win</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[actionBtn, { backgroundColor: colors.blue }]} onPress={() => copAct('run')} activeOpacity={0.8}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                RETREAT <Text style={{ opacity: 0.7 }}>40%</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                actionBtn, { backgroundColor: colors.yellow },
                cp.cash < negotiateCost && { backgroundColor: colors.cardBorder, opacity: 0.4 },
              ]}
              onPress={() => copAct('bribe')}
              activeOpacity={0.8}
              disabled={cp.cash < negotiateCost}
            >
              <Text style={[
                { color: '#fff', fontSize: 16, fontWeight: '700' },
                cp.cash < negotiateCost && { color: colors.textDarkest },
              ]}>
                NEGOTIATE <Text style={{ opacity: 0.7 }}>~{$(negotiateCost)} ceasefire</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (isBountyHunter) {
    const con = cp.consignment!;
    const gang = GANGS.find(g => g.id === con.gangId);
    const gangName = gang?.name || 'The gang';
    const remaining = con.amountOwed - con.amountPaid;
    const payAmount = Math.round(remaining * 1.5);

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center', paddingHorizontal: 24, maxWidth: 500 }}>
          <Text style={{ fontSize: 56 }}>🤝</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.yellow, marginVertical: 10 }}>BOUNTY HUNTER!</Text>
          <Text style={{ color: colors.redLight, fontSize: 16, marginBottom: 4 }}>
            {gangName} sent someone to collect.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, fontStyle: 'italic', marginBottom: 4 }}>
            You owe {$(remaining)}. They want {$(payAmount)}.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 15, marginBottom: 20 }}>
            Cash: {$(cp.cash)} {'\u2022'} HP: {cp.hp}
          </Text>

          <View style={{ width: 320, gap: 10 }}>
            <TouchableOpacity style={[actionBtn, { backgroundColor: colors.yellow }]} onPress={() => copAct('bribe')} activeOpacity={0.8}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                PAY UP <Text style={{ opacity: 0.7 }}>{$(payAmount)}</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[actionBtn, { backgroundColor: colors.red }]} onPress={() => copAct('fight')} activeOpacity={0.8}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {cp.gun ? 'FIGHT (armed)' : 'FIGHT (fists)'} <Text style={{ opacity: 0.7 }}>{cp.gun ? '35%' : '10%'} win</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[actionBtn, { backgroundColor: colors.blue }]} onPress={() => copAct('run')} activeOpacity={0.8}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                RUN <Text style={{ opacity: 0.7 }}>35%</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (isGangCollector) {
    const loan = cops.gangLoan!;
    const gang = GANGS.find(g => g.id === loan.gangId);
    const gangName = gang?.name || 'The gang';
    const remaining = loan.amountOwed - loan.amountPaid;
    const payAmount = Math.round(remaining * 1.3);
    const fightChance = Math.round((cp.gun ? 30 : 10) + mods.copFightKillBonus * 100);
    const gcRunChance = Math.round(30 + mods.copRunChanceBonus * 100);

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center', paddingHorizontal: 24, maxWidth: 500 }}>
          <Text style={{ fontSize: 56 }}>{'💰'}</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.yellow, marginVertical: 10 }}>GANG COLLECTOR!</Text>
          <Text style={{ color: colors.redLight, fontSize: 16, marginBottom: 4 }}>
            {gangName} sent a collector for their money.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, fontStyle: 'italic', marginBottom: 4 }}>
            You owe {$(remaining)}. They want {$(payAmount)}.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 15, marginBottom: 20 }}>
            Cash: {$(cp.cash)} {'\u2022'} HP: {cp.hp}
          </Text>

          <View style={{ width: 320, gap: 10 }}>
            <TouchableOpacity
              style={[
                actionBtn, { backgroundColor: colors.yellow },
                cp.cash < payAmount && { backgroundColor: colors.cardBorder, opacity: 0.4 },
              ]}
              onPress={() => copAct('bribe')}
              activeOpacity={0.8}
              disabled={cp.cash < payAmount}
            >
              <Text style={[
                { color: '#fff', fontSize: 16, fontWeight: '700' },
                cp.cash < payAmount && { color: colors.textDarkest },
              ]}>
                PAY UP <Text style={{ opacity: 0.7 }}>{$(payAmount)}</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[actionBtn, { backgroundColor: colors.red }]} onPress={() => copAct('fight')} activeOpacity={0.8}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {cp.gun ? 'FIGHT (armed)' : 'FIGHT (fists)'} <Text style={{ opacity: 0.7 }}>{fightChance}% win</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[actionBtn, { backgroundColor: colors.blue }]} onPress={() => copAct('run')} activeOpacity={0.8}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                RUN <Text style={{ opacity: 0.7 }}>{gcRunChance}%</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  let runChance = cp.gun ? 55 : 38;
  if (law.behavior === 'corrupt') runChance += 5;
  if (law.behavior === 'methodical') runChance -= 10;
  runChance += Math.round(mods.copRunChanceBonus * 100);

  let flavorText = '';
  if (law.behavior === 'corrupt') flavorText = 'They look willing to deal...';
  else if (law.behavior === 'methodical') flavorText = 'Well-equipped and organized.';
  else flavorText = 'Looking for trouble.';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ alignItems: 'center', paddingHorizontal: 24, maxWidth: 500 }}>
        <Text style={{ fontSize: 56 }}>🚨</Text>
        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.red, marginVertical: 10 }}>
          {law.forceEmoji} {law.forceName.toUpperCase()}!
        </Text>
        <Text style={{ color: colors.redLight, fontSize: 16, marginBottom: 4 }}>
          {cops.count} officer{cops.count > 1 ? 's' : ''} closing in!
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, fontStyle: 'italic', marginBottom: 4 }}>{flavorText}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 15, marginBottom: 20 }}>
          Carrying {used} units {'\u2022'} Heat {cp.heat}%
        </Text>

        <View style={{ width: 320, gap: 10 }}>
          <TouchableOpacity style={[actionBtn, { backgroundColor: colors.blue }]} onPress={() => copAct('run')} activeOpacity={0.8}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              RUN <Text style={{ opacity: 0.7 }}>{runChance}%</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[actionBtn, { backgroundColor: colors.red }]} onPress={() => copAct('fight')} activeOpacity={0.8}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {cp.gun ? 'FIGHT (armed)' : 'FIGHT (fists)'}
              <Text style={{ opacity: 0.7 }}>
                {law.behavior === 'methodical' ? ' (tough)' : law.behavior === 'corrupt' ? ' (easy)' : ''}
              </Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              actionBtn, { backgroundColor: colors.yellow },
              cp.cash < bribeCost && { backgroundColor: colors.cardBorder, opacity: 0.4 },
            ]}
            onPress={() => copAct('bribe')}
            activeOpacity={0.8}
            disabled={cp.cash < bribeCost}
          >
            <Text style={[
              { color: '#fff', fontSize: 16, fontWeight: '700' },
              cp.cash < bribeCost && { color: colors.textDarkest },
            ]}>
              BRIBE <Text style={{ opacity: 0.7 }}>
                {$(bribeCost)}
                {law.behavior === 'methodical' ? ' (-15 heat)' : ' (-12 heat)'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
