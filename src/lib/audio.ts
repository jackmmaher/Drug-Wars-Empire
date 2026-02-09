import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import type { SideEffect } from './game-logic';

// ── Haptics ────────────────────────────────────────────────
const hapticMap = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
} as const;

// ── Tone Generator (port of web SFX) ──────────────────────
// On native we use expo-av to generate simple tones via oscillator-like approach
// For now, we use haptics as primary feedback and add proper audio later
let audioEnabled = true;

export function setAudioEnabled(enabled: boolean) {
  audioEnabled = enabled;
}

// Simple beep via expo-av (placeholder for proper SFX system)
async function playTone(_freq: number, _duration: number) {
  // TODO: Implement proper tone generation with expo-av
  // For MVP, haptics provide the primary feedback
}

// ── SFX Functions (map to original web SFX names) ──────────
export const SFX = {
  buy: () => { if (audioEnabled) playTone(520, 50); },
  sell: () => { if (audioEnabled) playTone(440, 40); },
  big: () => { if (audioEnabled) playTone(880, 150); },
  bad: () => { if (audioEnabled) playTone(180, 200); },
  miss: () => { if (audioEnabled) playTone(300, 80); },
  level: () => { if (audioEnabled) playTone(523, 180); },
  tick: () => { if (audioEnabled) playTone(1200, 20); },
};

// ── Process Side Effects ───────────────────────────────────
export async function processSideEffects(effects: SideEffect[]) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'sfx':
        SFX[effect.sound === 'level' ? 'level' : effect.sound]?.();
        break;
      case 'haptic':
        if (Platform.OS !== 'web') {
          try { await hapticMap[effect.style](); } catch {}
        }
        break;
      case 'shake':
        // Shake is handled by the UI layer via store state
        break;
    }
  }
}
