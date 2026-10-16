// The player's one verb against bros. A cone in the facing direction;
// every bro inside it sobers a little and is staggered. Hold to keep shouting.

import { SHOUT } from '../config/game';
import { discipline, sober } from './bros';
import { shoutMult, shoutRangeAdd } from './towers';
import type { BroState, GameState, PlayerState, Vec } from './types';

export function applyShout(state: GameState, player: PlayerState): void {
  player.shouting = true;
  const range = SHOUT.rangePx + shoutRangeAdd(player);
  const amount = SHOUT.soberPerTick * shoutMult(player);
  for (const b of state.bros) {
    if (inCone(player.pos, player.facing, b.pos, range)) {
      sober(b, amount);
      discipline(b);
    }
  }
}

export function shoutRange(player: PlayerState): number {
  return SHOUT.rangePx + shoutRangeAdd(player);
}

export function inCone(origin: Vec, facing: Vec, target: Vec, range: number = SHOUT.rangePx): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const d = Math.hypot(dx, dy);
  if (d > range) return false;
  if (d === 0) return true;
  const fl = Math.hypot(facing.x, facing.y) || 1;
  const cos = (dx * facing.x + dy * facing.y) / (d * fl);
  return cos >= Math.cos((SHOUT.halfAngleDeg * Math.PI) / 180);
}

export function brosInCone(state: GameState, player: PlayerState): BroState[] {
  return state.bros.filter((b) => inCone(player.pos, player.facing, b.pos, shoutRange(player)));
}
