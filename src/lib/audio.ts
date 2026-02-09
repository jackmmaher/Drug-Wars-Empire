import type { SideEffect } from './game-logic';

// ── Tone Generator (port of web SFX) ──────────────────────
let audioEnabled = true;

export function setAudioEnabled(enabled: boolean) {
  audioEnabled = enabled;
}

// Simple beep placeholder for proper SFX system
async function playTone(_freq: number, _duration: number) {
  // TODO: Implement proper tone generation with Web Audio API
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
      case 'shake':
        // Shake is handled by the UI layer via store state
        break;
    }
  }
}
