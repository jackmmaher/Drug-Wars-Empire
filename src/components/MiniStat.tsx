import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface MiniStatProps {
  label: string;
  value: string | number;
  color?: string;
}

export function MiniStat({ label, value, color }: MiniStatProps) {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.bgCard,
      borderRadius: 5,
      paddingVertical: 3,
      paddingHorizontal: 6,
      alignItems: 'center',
      flex: 1,
    }}>
      <Text style={{
        fontSize: 9,
        color: colors.textDark,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: '600',
      }}>{label}</Text>
      <Text style={{
        fontSize: 13,
        fontWeight: '800',
        color: color || colors.text,
      }}>{value}</Text>
    </View>
  );
}
