import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/config/game';
import { createState, HOME_SPOT, restore, serialize, spotPos, spotToward, step } from '../src/sim/sim';

const run = (s: ReturnType<typeof createState>, n: number) => {
  for (let i = 0; i < n; i++) step(s, []);
};

describe('Robo stage select', () => {
  it('is deterministic and survives serialize/restore mid-walk', () => {
    const a = createState({ seed: 1, playerCount: 1 });
    step(a, [{ playerId: 0, tick: 0, type: 'move', dx: 0, dy: -1 }]);
    run(a, 5);
    const b = restore(serialize(a));
    run(a, 60);
    run(b, 60);
    expect(serialize(b)).toBe(serialize(a));
  });

  it('every spot (home included) can reach every other by some sequence of presses', () => {
    const all = STAGES.length + 1;
    for (let from = HOME_SPOT; from < STAGES.length; from++) {
      const seen = new Set<number>([from]);
      const frontier = [from];
      while (frontier.length) {
        const cur = frontier.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const to = spotToward(cur, dx, dy);
          if (to !== -2 && !seen.has(to)) {
            seen.add(to);
            frontier.push(to);
          }
        }
      }
      expect(seen.size).toBe(all);
    }
  });

  it('starts at home, walks to a stage, confirms, backs out; home cannot be confirmed', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const p = s.players[0]!;
    expect(p.spot).toBe(HOME_SPOT);
    step(s, [{ playerId: 0, tick: s.tick, type: 'confirm' }]);
    expect(s.phase).toBe('select');
    // Whichever direction reaches a stage from home (the map is real geography).
    const dir = ([[0, 1], [1, 0], [0, -1], [-1, 0]] as const).find(([dx, dy]) => spotToward(HOME_SPOT, dx, dy) >= 0)!;
    step(s, [{ playerId: 0, tick: s.tick, type: 'move', dx: dir[0], dy: dir[1] }]);
    expect(p.walking).toBe(true);
    let t = 0;
    while (p.walking && t++ < 600) step(s, []);
    expect(p.pos).toEqual(spotPos(p.spot));
    expect(p.spot).toBeGreaterThanOrEqual(0);
    step(s, [{ playerId: 0, tick: s.tick, type: 'confirm' }]);
    expect(s.phase).toBe('starting');
    expect(s.chosen).toBe(p.spot);
    step(s, [{ playerId: 0, tick: s.tick, type: 'back' }]);
    expect(s.phase).toBe('select');
  });

  it('ignores moves while walking and presses with nothing that way', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const p = s.players[0]!;
    const dir = ([[0, 1], [1, 0], [0, -1], [-1, 0]] as const).find(([dx, dy]) => spotToward(HOME_SPOT, dx, dy) >= 0)!;
    step(s, [{ playerId: 0, tick: 0, type: 'move', dx: dir[0], dy: dir[1] }]);
    const spot = p.spot;
    step(s, [{ playerId: 0, tick: 1, type: 'move', dx: -dir[0] as -1 | 0 | 1, dy: -dir[1] as -1 | 0 | 1 }]); // mid-walk: ignored
    expect(p.spot).toBe(spot);
    while (p.walking) step(s, []);
    // From the southernmost stage, south goes nowhere.
    const south = STAGES.reduce((a, b, i) => (STAGES[a]!.y > b.y ? a : i), 0);
    p.spot = south;
    p.pos = spotPos(south);
    step(s, [{ playerId: 0, tick: s.tick, type: 'move', dx: 0, dy: 1 }]);
    expect(p.walking).toBe(false);
    expect(s.events.some((e) => e.type === 'nope')).toBe(true);
  });
});
