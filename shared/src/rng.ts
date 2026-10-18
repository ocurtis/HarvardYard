// mulberry32. The state is a single uint32 stored on GameState so that
// snapshot/restore reproduces the exact random stream.

export function seedRng(seed: number): number {
  return seed >>> 0;
}

// Advances state in place and returns a float in [0, 1).
export function nextFloat(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nextInt(state: { rng: number }, maxExclusive: number): number {
  return Math.floor(nextFloat(state) * maxExclusive);
}
