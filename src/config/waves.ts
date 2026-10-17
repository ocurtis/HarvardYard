// Wave table. Each wave is called by the player; nothing auto-starts.
// Spawn gates rotate through the map's gates using the seeded RNG.
// Session 4 adds tourists to these rows; session 6 tunes them with the sim.

export interface WaveDef {
  bros: number;
  longshots: number; // ranged pissers mixed into the bro spawns
  chuckers: number; // cup throwers mixed in the same way
  finals: number; // finals club members: rare, tough, fast
  spacingTicks: number; // ticks between bro spawns
  groups: number; // tourist groups (3-5 people each, one guide)
  touristSpacingTicks: number; // ticks between group spawns
}

export const WAVES: WaveDef[] = [
  { bros: 3, longshots: 0, chuckers: 0, finals: 0, spacingTicks: 90, groups: 1, touristSpacingTicks: 70 },
  { bros: 5, longshots: 0, chuckers: 0, finals: 0, spacingTicks: 75, groups: 1, touristSpacingTicks: 65 },
  { bros: 7, longshots: 1, chuckers: 0, finals: 0, spacingTicks: 60, groups: 2, touristSpacingTicks: 60 },
  { bros: 9, longshots: 2, chuckers: 0, finals: 0, spacingTicks: 50, groups: 2, touristSpacingTicks: 55 },
  { bros: 12, longshots: 2, chuckers: 1, finals: 0, spacingTicks: 45, groups: 2, touristSpacingTicks: 50 },
  { bros: 14, longshots: 3, chuckers: 1, finals: 0, spacingTicks: 40, groups: 2, touristSpacingTicks: 45 },
  { bros: 16, longshots: 4, chuckers: 1, finals: 0, spacingTicks: 36, groups: 2, touristSpacingTicks: 42 },
  { bros: 18, longshots: 4, chuckers: 2, finals: 1, spacingTicks: 32, groups: 2, touristSpacingTicks: 40 },
  { bros: 20, longshots: 5, chuckers: 2, finals: 0, spacingTicks: 30, groups: 3, touristSpacingTicks: 38 },
  { bros: 22, longshots: 6, chuckers: 2, finals: 1, spacingTicks: 28, groups: 3, touristSpacingTicks: 36 },
  { bros: 24, longshots: 6, chuckers: 3, finals: 1, spacingTicks: 26, groups: 3, touristSpacingTicks: 34 },
  { bros: 26, longshots: 7, chuckers: 3, finals: 1, spacingTicks: 24, groups: 3, touristSpacingTicks: 32 },
  { bros: 28, longshots: 8, chuckers: 3, finals: 2, spacingTicks: 22, groups: 3, touristSpacingTicks: 30 },
  { bros: 30, longshots: 9, chuckers: 4, finals: 2, spacingTicks: 20, groups: 3, touristSpacingTicks: 28 },
  { bros: 35, longshots: 10, chuckers: 4, finals: 3, spacingTicks: 18, groups: 4, touristSpacingTicks: 26 },
];

// Every bro of every kind spawns this much drunker per wave (wave 1 = 1.0x).
// It's what keeps a defense that solved wave 7 from solving wave 15.
export const DRUNK_PER_WAVE = 0.06;

export function drunkMultiplier(waveIndex: number): number {
  return 1 + DRUNK_PER_WAVE * Math.max(0, waveIndex);
}

export function scaleWaveForPlayers(w: WaveDef, playerCount: number): WaveDef {
  // Placeholder scaling until co-op is tuned: +50% bros per extra player.
  const mult = 1 + 0.5 * (playerCount - 1);
  return {
    bros: Math.round(w.bros * mult),
    longshots: Math.round(w.longshots * mult),
    chuckers: Math.round(w.chuckers * mult),
    finals: Math.round(w.finals * mult),
    spacingTicks: w.spacingTicks,
    groups: Math.round(w.groups * mult),
    touristSpacingTicks: w.touristSpacingTicks,
  };
}
