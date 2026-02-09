import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface MiniStatProps {
  label: string;
  value: string | number;
  color?: string;
}

export function MiniStat({ label, value, color }: MiniStatProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  label: {
    fontSize: 6,
    color: colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
  },
});
