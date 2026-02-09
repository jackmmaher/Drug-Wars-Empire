import React from 'react';
import { View } from 'react-native';

// Native fallback: ads only display on web
export function AdBanner(_props: { slot?: string; style?: any }) {
  return <View />;
}
