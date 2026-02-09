import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface InfoBadgeProps {
  icon: string;
  label?: string;
  shortDesc?: string;
  longDesc?: string;
  compact?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  color?: string;
}

const VARIANT_COLORS: Record<string, { bg: string; border: string }> = {
  default: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
  success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)' },
  warning: { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.15)' },
  danger: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
  info: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)' },
};

export function InfoBadge({ icon, label, shortDesc, longDesc, compact, variant = 'default', color }: InfoBadgeProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const variantStyle = VARIANT_COLORS[variant];

  const hasDesc = shortDesc || longDesc;

  return (
    <View>
      <TouchableOpacity
        onPress={hasDesc ? () => setExpanded(!expanded) : undefined}
        activeOpacity={hasDesc ? 0.7 : 1}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: compact ? 2 : 4,
          backgroundColor: variantStyle.bg,
          borderWidth: 1,
          borderColor: variantStyle.border,
          borderRadius: 4,
          paddingVertical: compact ? 2 : 3,
          paddingHorizontal: compact ? 4 : 6,
        }}
      >
        <Text style={{ fontSize: compact ? 10 : 12 }}>{icon}</Text>
        {label && (
          <Text style={{
            fontSize: compact ? 9 : 11,
            fontWeight: '600',
            color: color || colors.textDim,
          }}>
            {label}
          </Text>
        )}
      </TouchableOpacity>

      {expanded && (shortDesc || longDesc) && (
        <View style={{
          marginTop: 4,
          padding: 8,
          backgroundColor: colors.helpPanelBg,
          borderWidth: 1,
          borderColor: colors.helpPanelBorder,
          borderRadius: 6,
        }}>
          {shortDesc && (
            <Text style={{ fontSize: 12, color: colors.textDim, fontWeight: '600', marginBottom: longDesc ? 4 : 0 }}>
              {shortDesc}
            </Text>
          )}
          {longDesc && (
            <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
              {longDesc}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
