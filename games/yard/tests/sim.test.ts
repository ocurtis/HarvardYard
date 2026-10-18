import { describe, expect, it } from 'vitest';
import { GRID_H, GRID_W, PLAYER, TILE } from '../src/config/game';
import { blocksMovement, tileAt } from '../src/sim/map';
import { nextFloat } from '@shared/rng';
import { createState, restore, serialize, snapshot, step } from '../src/sim/sim';
import type { Command, GameState } from '../src/sim/types';

function run(state: GameState, ticks: number, cmdFor: (t: number) => Command[]): void {
  for (let i = 0; i < ticks; i++) step(state, cmdFor(state.tick));
}

const walkRight = (t: number): Command[] => [{ playerId: 0, tick: t, type: 'move', dx: 1, dy: 0 }];

describe('map', () => {
  it('parses the Yard at the expected size with gates, statue, foot', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    expect(s.map.w).toBe(GRID_W);
    expect(s.map.h).toBe(GRID_H);
    expect(s.map.tiles.length).toBe(GRID_W * GRID_H);
    expect(s.map.gates.length).toBeGreaterThanOrEqual(2);
    expect(tileAt(s.map, s.map.foot.x, s.map.foot.y)).toBe('foot');
    expect(tileAt(s.map, s.map.statue.x + 1, s.map.statue.y + 1)).toBe('statue');
  });

  it('treats off-map as blocking', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    expect(blocksMovement(tileAt(s.map, -1, 0))).toBe(true);
    expect(blocksMovement(tileAt(s.map, 0, GRID_H))).toBe(true);
  });
});

describe('determinism', () => {
  it('same seed and commands produce identical state', () => {
    const a = createState({ seed: 42, playerCount: 1 });
    const b = createState({ seed: 42, playerCount: 1 });
    run(a, 300, walkRight);
    run(b, 300, walkRight);
    expect(serialize(a)).toBe(serialize(b));
  });

  it('rng stream is reproducible from a snapshot', () => {
    const a = createState({ seed: 7, playerCount: 1 });
    nextFloat(a);
    nextFloat(a);
    const b = snapshot(a);
    expect(nextFloat(a)).toBe(nextFloat(b));
    expect(nextFloat(a)).toBe(nextFloat(b));
  });
});

describe('snapshot', () => {
  it('serialize/restore round-trips exactly and continues identically', () => {
    const a = createState({ seed: 9, playerCount: 2 });
    run(a, 120, walkRight);
    const b = restore(serialize(a));
    expect(serialize(b)).toBe(serialize(a));
    run(a, 60, walkRight);
    run(b, 60, walkRight);
    expect(serialize(b)).toBe(serialize(a));
  });
});

describe('player movement', () => {
  it('moves at the configured speed and diagonals are not faster', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const start = { ...s.players[0]!.pos };
    run(s, 10, walkRight);
    expect(s.players[0]!.pos.x - start.x).toBeCloseTo(PLAYER.speedPxPerTick * 10, 5);

    const d = createState({ seed: 1, playerCount: 1 });
    const dstart = { ...d.players[0]!.pos };
    run(d, 10, (t) => [{ playerId: 0, tick: t, type: 'move', dx: 1, dy: 1 }]);
    const dist = Math.hypot(d.players[0]!.pos.x - dstart.x, d.players[0]!.pos.y - dstart.y);
    expect(dist).toBeCloseTo(PLAYER.speedPxPerTick * 10, 5);
  });

  it('cannot walk into the statue', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    // Spawn is above the foot; walk down through the foot tile into the statue.
    run(s, 600, (t) => [{ playerId: 0, tick: t, type: 'move', dx: 0, dy: 1 }]);
    const p = s.players[0]!;
    const ty = Math.floor((p.pos.y + PLAYER.hitboxH / 2 - 1) / TILE);
    expect(tileAt(s.map, Math.floor(p.pos.x / TILE), ty)).not.toBe('statue');
  });

  it('ignores commands for the wrong tick', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const start = { ...s.players[0]!.pos };
    step(s, [{ playerId: 0, tick: 99, type: 'move', dx: 1, dy: 0 }]);
    expect(s.players[0]!.pos).toEqual(start);
  });

  it('supports up to four players with distinct spawns', () => {
    const s = createState({ seed: 1, playerCount: 4 });
    const xs = new Set(s.players.map((p) => p.pos.x));
    expect(s.players.length).toBe(4);
    expect(xs.size).toBe(4);
  });
});
