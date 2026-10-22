import { describe, expect, it } from 'vitest';
import { SLOTS, STAGES } from '../src/config/game';
import { BOSS_SLOTS, createState, restore, serialize, slotToward, stageOfSlot, step } from '../src/sim/sim';

describe('Robo stage select', () => {
  it('is deterministic and survives serialize/restore', () => {
    const a = createState({ seed: 1, playerCount: 1 });
    step(a, [{ playerId: 0, tick: 0, type: 'move', dx: 1, dy: 0 }]);
    const b = restore(serialize(a));
    for (let i = 0; i < 30; i++) {
      step(a, []);
      step(b, []);
    }
    expect(serialize(b)).toBe(serialize(a));
  });

  it('every boss slot maps to a stage and every stage has a slot', () => {
    for (const i of BOSS_SLOTS) expect(stageOfSlot(i)).toBeGreaterThanOrEqual(0);
    for (const st of STAGES) expect(SLOTS.some((s) => s.stage === st.id)).toBe(true);
  });

  it('every boss slot can reach every other by some sequence of presses', () => {
    for (const from of BOSS_SLOTS) {
      const seen = new Set<number>([from]);
      const frontier = [from];
      while (frontier.length) {
        const cur = frontier.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const to = slotToward(cur, dx, dy);
          if (to >= 0 && !seen.has(to)) {
            seen.add(to);
            frontier.push(to);
          }
        }
      }
      expect(seen.size).toBe(BOSS_SLOTS.length);
    }
  });

  it('confirm picks the stage under the cursor; back returns to the map', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const p = s.players[0]!;
    step(s, [{ playerId: 0, tick: s.tick, type: 'confirm' }]);
    expect(s.phase).toBe('starting');
    expect(s.chosen).toBe(stageOfSlot(p.slot));
    step(s, [{ playerId: 0, tick: s.tick, type: 'move', dx: 1, dy: 0 }]); // ignored while starting
    expect(s.phase).toBe('starting');
    step(s, [{ playerId: 0, tick: s.tick, type: 'back' }]);
    expect(s.phase).toBe('select');
    expect(s.chosen).toBe(-1);
  });
});
