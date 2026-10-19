import { describe, expect, it } from 'vitest';
import { BOXES, CONVEYOR, RACK, SCORING, SHIFT } from '../src/config/game';
import { createState, restore, serialize, step } from '../src/sim/sim';
import type { Command, GameState } from '../src/sim/types';

const run = (s: GameState, n: number, cmds: (t: number) => Command[] = () => []) => {
  for (let i = 0; i < n; i++) step(s, cmds(s.tick));
};

describe("Noch's Rush sim", () => {
  it('is deterministic and survives serialize/restore mid-game', () => {
    const a = createState({ seed: 7, playerCount: 1 });
    const cmds = (t: number): Command[] => (t % 40 === 0 ? [{ playerId: 0, tick: t, type: 'drop' }] : t % 90 === 0 ? [{ playerId: 0, tick: t, type: 'selectBox', box: t % BOXES }] : []);
    run(a, 600, cmds);
    const b = restore(serialize(a));
    run(a, 600, cmds);
    run(b, 600, cmds);
    expect(serialize(b)).toBe(serialize(a));
  });

  it('starts with four open boxes and a square in hand', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    expect(s.boxes.length).toBe(BOXES);
    expect(s.conveyor.length).toBe(1);
    expect(s.boxes.every((b) => b.order.length === 4 && b.order[0] !== 'any')).toBe(true);
  });

  it('packing a box exactly as ordered closes it clean and pays the tip', () => {
    const s = createState({ seed: 3, playerCount: 1 });
    const b = s.boxes[0]!;
    // Feed the exact order, cell by cell, by putting the right kind in hand.
    for (let i = 0; i < 4; i++) {
      const want = b.order[i]!;
      s.conveyor = [want === 'any' ? 'cheese' : want];
      s.players[0]!.cell = i;
      step(s, [{ playerId: 0, tick: s.tick, type: 'drop' }]);
    }
    expect(b.result).toBe('clean');
    expect(s.tips).toBe(SCORING.clean);
    expect(s.events.some((e) => e.type === 'close' && e.result === 'clean')).toBe(true);
    expect(s.strikes).toBe(0);
  });

  it('a box with two wrong squares is sent back: a strike, no tip', () => {
    const s = createState({ seed: 3, playerCount: 1 });
    const b = s.boxes[0]!;
    b.order = ['cheese', 'cheese', 'pepperoni', 'pepperoni']; // half and half, no wildcards
    for (let i = 0; i < 4; i++) {
      const kind = i < 2 ? 'veggie' : 'pepperoni'; // two wrong on the cheese side
      s.conveyor = [kind];
      s.players[0]!.cell = i;
      step(s, [{ playerId: 0, tick: s.tick, type: 'drop' }]);
    }
    expect(b.result).toBe('back');
    expect(s.tips).toBe(0);
    expect(s.strikes).toBe(1);
  });

  it('a full conveyor drops the next square on the floor; three strikes ends the shift', () => {
    const s = createState({ seed: 5, playerCount: 1 });
    let t = 0;
    while (s.phase === 'playing' && t++ < 60 * 60 * 5) step(s, []); // never touch anything
    expect(s.phase).toBe('lost');
    expect(s.strikes).toBe(SHIFT.strikesToLose);
    expect(s.conveyor.length).toBe(CONVEYOR.slots);
  });

  it('the rack holds a few squares, then overflow is a strike', () => {
    const s = createState({ seed: 5, playerCount: 1 });
    for (let i = 0; i <= RACK.slots; i++) {
      s.conveyor = ['tomato'];
      step(s, [{ playerId: 0, tick: s.tick, type: 'rack' }]);
    }
    expect(s.rack.length).toBe(RACK.slots);
    expect(s.strikes).toBe(1);
  });
});
