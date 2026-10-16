// Wave table. Each wave is called by the player; nothing auto-starts.
// Spawn gates rotate through the map's gates using the seeded RNG.
// Session 4 adds tourists to these rows; session 6 tunes them with the sim.

export interface WaveDef {
  bros: number;
  spacingTicks: number; // ticks between bro spawns
  groups: number; // tourist groups (3-5 people each, one guide)
  touristSpacingTicks: number; // ticks between group spawns
}

export const WAVES: WaveDef[] = [
  { bros: 3, spacingTicks: 90, groups: 1, touristSpacingTicks: 70 },
  { bros: 5, spacingTicks: 75, groups: 1, touristSpacingTicks: 65 },
  { bros: 7, spacingTicks: 60, groups: 2, touristSpacingTicks: 60 },
  { bros: 9, spacingTicks: 50, groups: 2, touristSpacingTicks: 55 },
  { bros: 12, spacingTicks: 45, groups: 2, touristSpacingTicks: 50 },
  { bros: 14, spacingTicks: 40, groups: 2, touristSpacingTicks: 45 },
  { bros: 16, spacingTicks: 36, groups: 2, touristSpacingTicks: 42 },
  { bros: 18, spacingTicks: 32, groups: 2, touristSpacingTicks: 40 },
  { bros: 20, spacingTicks: 30, groups: 2, touristSpacingTicks: 38 },
  { bros: 22, spacingTicks: 28, groups: 2, touristSpacingTicks: 36 },
  { bros: 24, spacingTicks: 26, groups: 3, touristSpacingTicks: 34 },
  { bros: 26, spacingTicks: 24, groups: 3, touristSpacingTicks: 32 },
  { bros: 28, spacingTicks: 22, groups: 3, touristSpacingTicks: 30 },
  { bros: 30, spacingTicks: 20, groups: 3, touristSpacingTicks: 28 },
  { bros: 35, spacingTicks: 18, groups: 4, touristSpacingTicks: 26 },
];

export function scaleWaveForPlayers(w: WaveDef, playerCount: number): WaveDef {
  // Placeholder scaling until co-op is tuned: +50% bros per extra player.
  const mult = 1 + 0.5 * (playerCount - 1);
  return {
    bros: Math.round(w.bros * mult),
    spacingTicks: w.spacingTicks,
    groups: Math.round(w.groups * mult),
    touristSpacingTicks: w.touristSpacingTicks,
  };
}
