/**
 * Seedable PRNG using Mulberry32 algorithm.
 * Drop-in replacement for Math.random() in simulation context.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Random integer in [a, b] inclusive */
  R(a: number, b: number): number {
    return Math.floor(this.next() * (b - a + 1)) + a;
  }

  /** Coin flip with probability p */
  C(p: number): boolean {
    return this.next() < p;
  }

  /** Pick a random element from an array */
  pick<T>(arr: T[]): T {
    return arr[this.R(0, arr.length - 1)];
  }
}

/**
 * Install a SeededRandom instance as the global Math.random replacement.
 * Returns a cleanup function to restore the original.
 */
export function installSeededRandom(rng: SeededRandom): () => void {
  const original = Math.random;
  Math.random = () => rng.next();
  return () => { Math.random = original; };
}
