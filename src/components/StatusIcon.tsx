import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface StatusIconProps {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
  /** Shown when tapped */
  helpText?: string;
}

export function StatusIcon({ icon, value, label, color, helpText }: StatusIconProps) {
  const { colors } = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={helpText ? () => setShowHelp(!showHelp) : undefined}
        activeOpacity={helpText ? 0.7 : 1}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: 2,
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text style={{
          fontSize: 14,
          fontWeight: '700',
          color: color || colors.text,
        }}>
          {value}
        </Text>
        <Text style={{
          fontSize: 10,
          color: colors.textDark,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {label}
        </Text>
      </TouchableOpacity>

      {showHelp && helpText && (
        <View style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          minWidth: 180,
          padding: 8,
          backgroundColor: colors.helpPanelBg,
          borderWidth: 1,
          borderColor: colors.helpPanelBorder,
          borderRadius: 6,
          zIndex: 10,
        }}>
          <Text style={{ fontSize: 12, color: colors.textDim, lineHeight: 18 }}>{helpText}</Text>
        </View>
      )}
    </View>
  );
}
