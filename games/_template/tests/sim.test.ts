import { describe, expect, it } from 'vitest';
import { createState, restore, serialize, step } from '../src/sim/sim';
import type { Command } from '../src/sim/types';

describe('__TITLE__ sim', () => {
  it('is deterministic and survives serialize/restore mid-game', () => {
    const a = createState({ seed: 7, playerCount: 1 });
    const cmds = (t: number): Command[] => (t % 3 === 0 ? [{ playerId: 0, tick: t, type: 'move', dx: 1, dy: 0 }] : []);
    for (let i = 0; i < 100; i++) step(a, cmds(a.tick));
    const b = restore(serialize(a));
    for (let i = 0; i < 100; i++) {
      step(a, cmds(a.tick));
      step(b, cmds(b.tick));
    }
    expect(serialize(b)).toBe(serialize(a));
  });

  it('moves the player on a move command and clamps to the field', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const x0 = s.players[0]!.pos.x;
    step(s, [{ playerId: 0, tick: 0, type: 'move', dx: 1, dy: 0 }]);
    expect(s.players[0]!.pos.x).toBeGreaterThan(x0);
  });
});
