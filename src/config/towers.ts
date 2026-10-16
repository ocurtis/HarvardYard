// Towers and upgrades. Costs are in tourist money (a 4-person group pays 40).
// First numbers are guesses; the headless sim tunes them in session 6.

export type TowerKind = 'dig' | 'sprinkler';

export interface TowerLevel {
  rangePx: number;
  fireTicks: number; // dig: ticks between bones. sprinkler: unused (continuous)
  sober: number; // dig: per bone. sprinkler: per second, applied per tick / 60
  upgradeCost: number | null; // null = max level
}

export interface TowerDef {
  kind: TowerKind;
  name: string;
  cost: number;
  levels: TowerLevel[]; // index 0 = freshly built
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  dig: {
    kind: 'dig',
    name: 'Dig',
    cost: 30,
    levels: [
      { rangePx: 48, fireTicks: 45, sober: 18, upgradeCost: 40 },
      { rangePx: 56, fireTicks: 36, sober: 26, upgradeCost: null },
    ],
  },
  sprinkler: {
    kind: 'sprinkler',
    name: 'Sprinkler',
    cost: 20,
    levels: [
      { rangePx: 26, fireTicks: 0, sober: 8, upgradeCost: 25 },
      { rangePx: 36, fireTicks: 0, sober: 12, upgradeCost: null },
    ],
  },
};

export const BONE = {
  speedPxPerTick: 3,
};

export const SPRINKLER = {
  slowTicks: 10, // re-applied every tick in range, so the slow lingers briefly after leaving
  // Tourists: a soaked tourist walks slower for this long after leaving the water. Nothing worse.
  wetTicks: 45,
  wetSpeedFactor: 0.6,
};

// Player self-upgrades: three stats, three levels each, same price ladder.
export type SelfStat = 'shout' | 'range' | 'speed';
export const SELF_UPGRADE = {
  costs: [25, 40, 60], // level 1, 2, 3
  shoutMult: [1, 1.5, 2, 2.5], // sober multiplier by level
  rangeAdd: [0, 8, 16, 24], // px added to the cone by level
  speedAdd: [0, 0.25, 0.5, 0.75], // px/tick added by level
};
