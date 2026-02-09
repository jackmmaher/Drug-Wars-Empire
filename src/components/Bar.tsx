import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface BarProps {
  label?: string;
  percent: number;
  color: string;
}

export function Bar({ label, percent, color }: BarProps) {
  const pct = Math.min(Math.max(percent, 0), 100);
  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.label}>{pct}%</Text>
        </View>
      ) : null}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
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

const styles = StyleSheet.create({
  container: { marginBottom: 2 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  label: {
    fontSize: 8,
    color: colors.textDark,
  },
  track: {
    height: 4,
    backgroundColor: '#0f172a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
