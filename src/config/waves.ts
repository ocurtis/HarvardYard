// Wave table. Each wave is called by the player; nothing auto-starts.
// Spawn gates rotate through the map's gates using the seeded RNG.
// Session 4 adds tourists to these rows; session 6 tunes them with the sim.

export interface WaveDef {
  bros: number;
  spacingTicks: number; // ticks between bro spawns
  tourists: number;
  touristSpacingTicks: number;
}

export const WAVES: WaveDef[] = [
  { bros: 3, spacingTicks: 90, tourists: 4, touristSpacingTicks: 70 },
  { bros: 5, spacingTicks: 75, tourists: 5, touristSpacingTicks: 65 },
  { bros: 7, spacingTicks: 60, tourists: 6, touristSpacingTicks: 60 },
  { bros: 9, spacingTicks: 50, tourists: 7, touristSpacingTicks: 55 },
  { bros: 12, spacingTicks: 45, tourists: 8, touristSpacingTicks: 50 },
  { bros: 14, spacingTicks: 40, tourists: 8, touristSpacingTicks: 45 },
  { bros: 16, spacingTicks: 36, tourists: 9, touristSpacingTicks: 42 },
  { bros: 18, spacingTicks: 32, tourists: 9, touristSpacingTicks: 40 },
  { bros: 20, spacingTicks: 30, tourists: 10, touristSpacingTicks: 38 },
  { bros: 22, spacingTicks: 28, tourists: 10, touristSpacingTicks: 36 },
  { bros: 24, spacingTicks: 26, tourists: 11, touristSpacingTicks: 34 },
  { bros: 26, spacingTicks: 24, tourists: 11, touristSpacingTicks: 32 },
  { bros: 28, spacingTicks: 22, tourists: 12, touristSpacingTicks: 30 },
  { bros: 30, spacingTicks: 20, tourists: 12, touristSpacingTicks: 28 },
  { bros: 35, spacingTicks: 18, tourists: 14, touristSpacingTicks: 26 },
];

export function scaleWaveForPlayers(w: WaveDef, playerCount: number): WaveDef {
  // Placeholder scaling until co-op is tuned: +50% bros per extra player.
  const mult = 1 + 0.5 * (playerCount - 1);
  return {
    bros: Math.round(w.bros * mult),
    spacingTicks: w.spacingTicks,
    tourists: Math.round(w.tourists * mult),
    touristSpacingTicks: w.touristSpacingTicks,
  };
}
