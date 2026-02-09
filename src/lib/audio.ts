import type { SideEffect } from './game-logic';

// ── Web Audio Synthesizer ────────────────────────────────────
// Ported from the original drug-wars-empire.jsx SFX system.
// Uses OscillatorNode + GainNode with exponentialRampToValueAtTime
// envelopes for all sounds. AudioContext is created lazily on the
// first user-initiated call (browser autoplay policy).

let ctx: AudioContext | null = null;
let audioEnabled = true;

export function setAudioEnabled(enabled: boolean) {
  audioEnabled = enabled;
}

function ensureContext(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (_) {
      // Web Audio not available
    }
  }
  return ctx;
}

/** Core tone: single oscillator with gain envelope decay. */
function playTone(
  freq: number,
  duration = 0.08,
  type: OscillatorType = 'square',
  volume = 0.05,
) {
  if (!audioEnabled) return;
  const ac = ensureContext();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch (_) {
    // Silently ignore transient audio errors
  }
}

/** Frequency sweep: glides from startFreq to endFreq over duration. */
function playSweep(
  startFreq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType = 'sawtooth',
  volume = 0.06,
) {
  if (!audioEnabled) return;
  const ac = ensureContext();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + duration);
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch (_) {}
}

// ── SFX Functions ────────────────────────────────────────────
// Each function produces a distinct, emotionally targeted sound.

export const SFX = {
  /** Purchase confirmation. Ascending tone pair: 520Hz -> 660Hz. */
  buy() {
    playTone(520, 0.05);
    setTimeout(() => playTone(660, 0.06), 50);
  },

  /** Sale cha-ching. Low thud + bright sine overtone. */
  sell() {
    playTone(440, 0.04);
    setTimeout(() => playTone(880, 0.1, 'sine'), 40);
  },

  /** Big profit. Triumphant ascending five-note fanfare. */
  big() {
    [0, 70, 140, 210, 280].forEach((d, i) =>
      setTimeout(() => playTone(440 + i * 110, 0.15, 'sine', 0.07), d),
    );
  },

  /** Loss / danger. Low ominous sawtooth growl. */
  bad() {
    playTone(180, 0.2, 'sawtooth', 0.07);
  },

  /** Near-miss regret. Descending chirp: 300Hz -> 220Hz. */
  miss() {
    playTone(300, 0.08);
    setTimeout(() => playTone(220, 0.12), 80);
  },

  /** Level complete / milestone. Triple ascending chord. */
  level() {
    [0, 90, 180].forEach((d, i) =>
      setTimeout(() => playTone(523 + i * 131, 0.18, 'sine', 0.08), d),
    );
  },

  /** UI click. Crisp short pip. */
  tick() {
    playTone(1200, 0.02, 'sine', 0.02);
  },

  /** Cop siren stab. Rapid alternating two-tone, European-style. */
  cop() {
    // Six rapid alternations between 600Hz and 800Hz
    for (let i = 0; i < 6; i++) {
      const freq = i % 2 === 0 ? 600 : 800;
      setTimeout(() => playTone(freq, 0.07, 'square', 0.06), i * 60);
    }
  },

  /** Finger loss. Low grinding distorted tone — visceral dread. */
  finger() {
    // Layer two detuned sawtooth oscillators for grit
    playTone(120, 0.4, 'sawtooth', 0.08);
    setTimeout(() => playTone(127, 0.35, 'sawtooth', 0.06), 10);
    // Crunchy high overtone for the "snap"
    setTimeout(() => playTone(95, 0.25, 'square', 0.04), 50);
  },

  /** Bounty hunter dread. Slow rising sweep 150Hz -> 400Hz. */
  bounty() {
    playSweep(150, 400, 0.5, 'sawtooth', 0.07);
    // Reverb-like gain tail: quieter echo tone
    setTimeout(() => playSweep(200, 380, 0.4, 'sine', 0.03), 100);
  },

  /** Streak celebration. Quick ascending pip 800Hz -> 1200Hz. */
  streak() {
    playSweep(800, 1200, 0.1, 'sine', 0.04);
  },
};

// ── Process Side Effects ────────────────────────────────────
export async function processSideEffects(effects: SideEffect[]) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'sfx': {
        const fn = SFX[effect.sound as keyof typeof SFX];
        if (fn) fn();
        break;
      }
      case 'shake':
        // Shake is handled by the UI layer via store state
        break;
    }
  }
}
