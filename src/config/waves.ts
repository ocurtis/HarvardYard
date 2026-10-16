// Wave table. Each wave is called by the player; nothing auto-starts.
// Spawn gates rotate through the map's gates using the seeded RNG.
// Session 4 adds tourists to these rows; session 6 tunes them with the sim.

export interface WaveDef {
  bros: number;
  spacingTicks: number; // ticks between spawns
}

export const WAVES: WaveDef[] = [
  { bros: 3, spacingTicks: 90 },
  { bros: 5, spacingTicks: 75 },
  { bros: 7, spacingTicks: 60 },
  { bros: 9, spacingTicks: 50 },
  { bros: 12, spacingTicks: 45 },
  { bros: 14, spacingTicks: 40 },
  { bros: 16, spacingTicks: 36 },
  { bros: 18, spacingTicks: 32 },
  { bros: 20, spacingTicks: 30 },
  { bros: 22, spacingTicks: 28 },
  { bros: 24, spacingTicks: 26 },
  { bros: 26, spacingTicks: 24 },
  { bros: 28, spacingTicks: 22 },
  { bros: 30, spacingTicks: 20 },
  { bros: 35, spacingTicks: 18 },
];

export function scaleWaveForPlayers(w: WaveDef, playerCount: number): WaveDef {
  // Placeholder scaling until co-op is tuned: +50% bros per extra player.
  const mult = 1 + 0.5 * (playerCount - 1);
  return { bros: Math.round(w.bros * mult), spacingTicks: w.spacingTicks };
}
