import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface InfoPanelProps {
  title: string;
  description: string;
  icon?: string;
  onClose: () => void;
  actions?: Array<{ label: string; onPress: () => void; color?: string }>;
  children?: React.ReactNode;
}

export function InfoPanel({ title, description, icon, onClose, actions, children }: InfoPanelProps) {
  const { colors } = useTheme();

  return (
    <View style={{
      padding: 12,
      backgroundColor: colors.helpPanelBg,
      borderWidth: 1,
      borderColor: colors.helpPanelBorder,
      borderRadius: 8,
      marginVertical: 4,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          {icon && <Text style={{ fontSize: 20 }}>{icon}</Text>}
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{title}</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.bgCardHover,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 14, color: colors.textDim, fontWeight: '700' }}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 13, color: colors.textDim, lineHeight: 20 }}>{description}</Text>

      {children}

      {actions && actions.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {actions.map((a, i) => (
            <TouchableOpacity
              key={i}
              onPress={a.onPress}
              style={{
                backgroundColor: a.color || colors.bgCardHover,
                borderRadius: 5,
                paddingVertical: 8,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
