// The player's one verb against bros. A cone in the facing direction;
// every bro inside it sobers a little and is staggered. Hold to keep shouting.

import { SHOUT } from '../config/game';
import { discipline, sober } from './bros';
import type { BroState, GameState, PlayerState, Vec } from './types';

export function applyShout(state: GameState, player: PlayerState): void {
  player.shouting = true;
  for (const b of state.bros) {
    if (inCone(player.pos, player.facing, b.pos)) {
      sober(b, SHOUT.soberPerTick);
      discipline(b);
    }
  }
}

export function inCone(origin: Vec, facing: Vec, target: Vec): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const d = Math.hypot(dx, dy);
  if (d > SHOUT.rangePx) return false;
  if (d === 0) return true;
  const fl = Math.hypot(facing.x, facing.y) || 1;
  const cos = (dx * facing.x + dy * facing.y) / (d * fl);
  return cos >= Math.cos((SHOUT.halfAngleDeg * Math.PI) / 180);
}

export function brosInCone(state: GameState, player: PlayerState): BroState[] {
  return state.bros.filter((b) => inCone(player.pos, player.facing, b.pos));
}
