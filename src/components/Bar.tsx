import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface BarProps {
  label?: string;
  percent: number;
  color: string;
}

export function Bar({ label, percent, color }: BarProps) {
  const { colors } = useTheme();
  const pct = Math.min(Math.max(percent, 0), 100);
  return (
    <View style={{ marginBottom: 2 }}>
      {label ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 }}>
          <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '600' }}>{label}</Text>
          <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '600' }}>{pct}%</Text>
        </View>
      ) : null}
      <View style={{
        height: 4,
        backgroundColor: colors.trackBg,
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <View
          style={[
            {
              height: '100%',
              borderRadius: 2,
              width: `${pct}%`,
              backgroundColor: color,
            },
            pct > 75 && { shadowColor: color, shadowRadius: 6, shadowOpacity: 0.4 },
          ]}
        />
      </View>
    </View>
  );
}
