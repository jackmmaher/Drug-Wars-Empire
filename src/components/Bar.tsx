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
    <View style={{ marginBottom: 3 }}>
      {label ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
          <Text style={{ fontSize: 13, color: colors.textDim, fontWeight: '600' }}>{label}</Text>
          <Text style={{ fontSize: 13, color: colors.textDim, fontWeight: '600' }}>{pct}%</Text>
        </View>
      ) : null}
      <View style={{
        height: 6,
        backgroundColor: colors.trackBg,
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <View
          style={[
            {
              height: '100%',
              borderRadius: 3,
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
