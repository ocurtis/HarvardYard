import { describe, expect, it } from 'vitest';
import { BRO, SHOUT, STATUE, TILE } from '../src/config/game';
import { spawnBro, tileCenter } from '../src/sim/bros';
import { inCone } from '../src/sim/shout';
import { createState, step } from '../src/sim/sim';
import type { Command, GameState } from '../src/sim/types';

const run = (s: GameState, ticks: number, cmdFor: (t: number) => Command[]) => {
  for (let i = 0; i < ticks; i++) step(s, cmdFor(s.tick));
};
const shout = (t: number): Command[] => [{ playerId: 0, tick: t, type: 'shout' }];
const idle = (): Command[] => [];

describe('cone', () => {
  it('hits in front within range and misses behind', () => {
    const o = { x: 0, y: 0 };
    const f = { x: 1, y: 0 };
    expect(inCone(o, f, { x: 20, y: 0 })).toBe(true);
    expect(inCone(o, f, { x: 20, y: 10 })).toBe(true);
    expect(inCone(o, f, { x: -20, y: 0 })).toBe(false);
    expect(inCone(o, f, { x: SHOUT.rangePx + 1, y: 0 })).toBe(false);
    expect(inCone(o, f, { x: 5, y: 25 })).toBe(false);
  });
});

describe('shout', () => {
  function stateWithBroInFront(): GameState {
    const s = createState({ seed: 1, playerCount: 1 });
    const p = s.players[0]!;
    const b = spawnBro(s);
    // Put the bro one tile in front of the player, on the player's facing.
    b.pos = { x: p.pos.x + p.facing.x * TILE, y: p.pos.y + p.facing.y * TILE };
    return s;
  }

  it('sobers a bro in the cone at the configured rate', () => {
    const s = stateWithBroInFront();
    run(s, 10, shout);
    expect(s.bros[0]!.drunk).toBeCloseTo(BRO.drunk - SHOUT.soberPerTick * 10, 5);
  });

  it('does nothing to a bro behind the player', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const p = s.players[0]!;
    const b = spawnBro(s);
    b.pos = { x: p.pos.x - p.facing.x * TILE, y: p.pos.y - p.facing.y * TILE };
    run(s, 10, shout);
    expect(s.bros[0]!.drunk).toBe(BRO.drunk);
  });

  it('a fully sobered bro leaves the map', () => {
    const s = stateWithBroInFront();
    const ticksNeeded = Math.ceil(BRO.drunk / SHOUT.soberPerTick) + 2;
    run(s, ticksNeeded, shout);
    expect(s.bros.length).toBe(0);
  });

  it('interrupts a pissing bro so statue HP stops dropping', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const p = s.players[0]!;
    // Park a bro on the foot tile (statue-adjacent) and fast-forward to pissing.
    const b = spawnBro(s);
    b.tile = { ...s.map.foot };
    b.pos = tileCenter(b.tile);
    run(s, BRO.windupTicks + 5, idle);
    expect(b.phase).toBe('pissing');
    const hpBefore = s.statueHp;
    expect(hpBefore).toBeLessThan(STATUE.hp);
    // Stand next to him facing him and shout once.
    p.pos = { x: b.pos.x, y: b.pos.y - TILE };
    p.facing = { x: 0, y: 1 };
    run(s, 1, shout);
    expect(b.phase).toBe('stagger');
    const hpAtStagger = s.statueHp;
    run(s, BRO.staggerTicks - 1, idle);
    expect(s.statueHp).toBe(hpAtStagger);
    // After the stagger he winds up again, not straight back to pissing.
    run(s, 2, idle);
    expect(b.phase).toBe('windup');
  });

  it('a staggered walker resumes walking, not winding up', () => {
    const s = stateWithBroInFront();
    run(s, 1, shout);
    expect(s.bros[0]!.phase).toBe('stagger');
    run(s, BRO.staggerTicks + 1, idle);
    expect(s.bros[0]!.phase).toBe('walking');
  });
});
