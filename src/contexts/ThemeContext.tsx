import React, { createContext, useContext, useState, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

const darkColors = {
  bg: '#0a0f1a',
  bgCard: 'rgba(255,255,255,0.04)',
  bgCardHover: 'rgba(255,255,255,0.07)',
  bgDanger: 'rgba(239,68,68,0.1)',
  bgSuccess: 'rgba(34,197,94,0.1)',
  bgPurple: 'rgba(124,58,237,0.06)',
  bgBlue: 'rgba(59,130,246,0.06)',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.1)',
  text: '#e2e8f0',
  textDim: '#94a3b8',
  textMuted: '#64748b',
  textDark: '#475569',
  textDarkest: '#1e293b',
  white: '#f8fafc',
  red: '#ef4444',
  redDark: '#dc2626',
  redDarker: '#b91c1c',
  redLight: '#fca5a5',
  green: '#22c55e',
  greenDark: '#16a34a',
  greenLight: '#86efac',
  blue: '#3b82f6',
  blueDark: '#1e40af',
  blueLight: '#93c5fd',
  yellow: '#f59e0b',
  yellowDark: '#d97706',
  orange: '#f97316',
  orangeLight: '#fdba74',
  pink: '#ec4899',
  pinkLight: '#f9a8d4',
  purple: '#a855f7',
  purpleDark: '#7c3aed',
  purpleLight: '#c4b5fd',
  indigo: '#6366f1',
  indigoDark: '#4f46e5',
  indigoLight: '#a5b4fc',
  teal: '#14b8a6',
  card: '#131b2e',
  cardBorder: '#1e293b',
  trackBg: '#0f172a',
  disabledBg: '#0f172a',
  inputBg: '#0a0e17',
  helpPanelBg: 'rgba(30,41,59,0.95)',
  helpPanelBorder: 'rgba(255,255,255,0.08)',
};

const lightColors: typeof darkColors = {
  bg: '#f8fafc',
  bgCard: 'rgba(0,0,0,0.02)',
  bgCardHover: 'rgba(0,0,0,0.05)',
  bgDanger: 'rgba(220,38,38,0.06)',
  bgSuccess: 'rgba(22,163,74,0.06)',
  bgPurple: 'rgba(124,58,237,0.06)',
  bgBlue: 'rgba(59,130,246,0.06)',
  border: 'rgba(0,0,0,0.08)',
  borderLight: 'rgba(0,0,0,0.12)',
  text: '#1e293b',
  textDim: '#475569',
  textMuted: '#64748b',
  textDark: '#94a3b8',
  textDarkest: '#cbd5e1',
  white: '#0f172a',
  red: '#dc2626',
  redDark: '#b91c1c',
  redDarker: '#991b1b',
  redLight: '#f87171',
  green: '#16a34a',
  greenDark: '#15803d',
  greenLight: '#4ade80',
  blue: '#2563eb',
  blueDark: '#1d4ed8',
  blueLight: '#3b82f6',
  yellow: '#d97706',
  yellowDark: '#b45309',
  orange: '#ea580c',
  orangeLight: '#fb923c',
  pink: '#db2777',
  pinkLight: '#f472b6',
  purple: '#7c3aed',
  purpleDark: '#6d28d9',
  purpleLight: '#8b5cf6',
  indigo: '#4f46e5',
  indigoDark: '#4338ca',
  indigoLight: '#6366f1',
  teal: '#0d9488',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  trackBg: '#e2e8f0',
  disabledBg: '#e2e8f0',
  inputBg: '#f1f5f9',
  helpPanelBg: 'rgba(255,255,255,0.97)',
  helpPanelBorder: 'rgba(0,0,0,0.1)',
};

export type ThemeColors = typeof darkColors;

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: darkColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const colors = mode === 'dark' ? darkColors : lightColors;
  const toggleTheme = useCallback(() => setMode(m => m === 'dark' ? 'light' : 'dark'), []);
  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
