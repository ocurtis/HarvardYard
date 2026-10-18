import { describe, expect, it } from 'vitest';
import { TILE } from '../src/config/game';
import { AMP, TOWERS } from '../src/config/towers';
import { spawnBro, tileCenter } from '../src/sim/bros';
import { createState, restore, serialize, step } from '../src/sim/sim';
import { build, canBuild, upgradeTower } from '../src/sim/towers';
import type { GameState, Vec } from '../src/sim/types';
import { windTiles } from '../src/sim/wind';

// Map facts this leans on (src/config/maps/yard.ts): the left gate is (0,3); from
// it a short lane runs down x=2 to the statue row, and a long loop runs down x=4,
// across row 11, up x=8 and on around to the right side. (1,8) and (3,8) are grass.
const at = (s: GameState, tile: Vec, facing: Vec) => {
  const p = s.players[0]!;
  p.pos = tileCenter(tile);
  p.facing = facing;
  return p;
};
const idx = (s: GameState, t: Vec) => t.y * s.map.w + t.x;
const run = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) step(s, []);
};

describe('the amp', () => {
  it('walls its wind tiles off for bro routing but not for tourists', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 500;
    const p = at(s, { x: 1, y: 8 }, { x: 1, y: 0 });
    expect(build(s, p, 'amp')).toBe(true);
    const amp = s.towers[0]!;
    expect(amp.kind).toBe('amp');
    expect(amp.facing).toEqual({ x: 1, y: 0 });
    const tiles = windTiles(s.map, amp, 0);
    expect(tiles).toContainEqual({ x: 2, y: 8 });
    for (const t of tiles) {
      expect(s.distToStatueBros[idx(s, t)]).toBe(-1);
      expect(s.distToStatue[idx(s, t)]).toBeGreaterThan(0); // tourists still route through
    }
    // The gate still reaches the statue, the long way round.
    const gate = s.map.gates.find((g) => g.x === 0)!;
    expect(s.distToStatueBros[idx(s, gate)]).toBeGreaterThan(s.distToStatue[idx(s, gate)]!);
  });

  it('refuses a build or upgrade that would seal a gate off', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 500;
    expect(build(s, at(s, { x: 1, y: 8 }, { x: 1, y: 0 }), 'amp')).toBe(true); // walls x=2
    const r = canBuild(s, at(s, { x: 3, y: 8 }, { x: 1, y: 0 }), 'amp'); // would wall x=4 too
    expect(r.ok).toBe(false);
    expect(r.why).toBe('would block the Yard');
    expect(s.towers.length).toBe(1);
    // Facing the other way from the same tile only re-walls x=2: allowed.
    expect(canBuild(s, at(s, { x: 3, y: 8 }, { x: -1, y: 0 }), 'amp').ok).toBe(true);
  });

  it('blows a walking bro back along his lane and he reroutes', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 500;
    build(s, at(s, { x: 1, y: 8 }, { x: 1, y: 0 }), 'amp');
    at(s, { x: 22, y: 14 }, { x: 0, y: 1 }); // player out of the way
    const b = spawnBro(s, 'bro');
    // Put him on the short lane just above the wind, heading down it.
    b.pos = tileCenter({ x: 2, y: 7 });
    b.tile = { x: 2, y: 8 };
    const drunk0 = b.drunk;
    let entered = false;
    let maxY = b.pos.y;
    for (let i = 0; i < 60; i++) {
      step(s, []);
      entered ||= s.events.some((e) => e.type === 'windEnter');
      maxY = Math.max(maxY, b.pos.y);
    }
    expect(entered).toBe(true);
    expect(maxY).toBeLessThan(tileCenter({ x: 2, y: 8 }).y); // never reached the windy tile's center
    expect(b.drunk).toBeLessThan(drunk0);
    // Shoved back off the windy tile, and by now walking on up the lane: the long way round.
    expect(b.pos.y).toBeLessThan(8 * TILE);
    expect(b.tile.y).toBeLessThan(8);
    run(s, 600);
    // Long after, he has left the wind and is somewhere on the long route, not below the amp.
    expect(b.inWind).toBe(false);
    expect(b.phase).not.toBe('leaving');
    const onShortLaneBelow = b.tile.x === 2 && b.tile.y > 8;
    expect(onShortLaneBelow).toBe(false);
  });

  it('leaves a bro alone when the wind is at his back, and ignores chuckers', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 500;
    // Amp at the foot of the x=8 lane blowing north, up the lane. A bro walking
    // down x=8 toward row 11 is walking into it; one walking up is past it.
    build(s, at(s, { x: 8, y: 12 }, { x: 0, y: -1 }), 'amp');
    at(s, { x: 22, y: 14 }, { x: 0, y: 1 });
    const amp = s.towers[0]!;
    expect(windTiles(s.map, amp, 0)).toContainEqual({ x: 8, y: 11 });
    const c = spawnBro(s, 'chucker');
    c.pos = tileCenter({ x: 8, y: 11 });
    c.tile = { x: 8, y: 11 };
    const y0 = c.pos.y;
    const d0 = c.drunk;
    run(s, 10);
    expect(c.inWind).toBe(false);
    expect(c.drunk).toBe(d0);
    expect(Math.abs(c.pos.y - y0)).toBeLessThan(TILE); // his own walking, not a shove
  });

  it('leaves a bro alone when the wind is at his back', () => {
    // Amp at the foot of the x=4 lane blowing north; from (4,10) the way to the
    // statue is up the lane, so the only "back" is straight into the wind: past it.
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 500;
    expect(build(s, at(s, { x: 4, y: 12 }, { x: 0, y: -1 }), 'amp')).toBe(true);
    expect(windTiles(s.map, s.towers[0]!, 0)).toContainEqual({ x: 4, y: 10 });
    at(s, { x: 22, y: 14 }, { x: 0, y: 1 });
    const past = spawnBro(s, 'bro');
    past.pos = tileCenter({ x: 4, y: 10 });
    past.tile = { x: 4, y: 9 };
    const d0 = past.drunk;
    const y0 = past.pos.y;
    run(s, 10);
    expect(past.inWind).toBe(false);
    expect(past.windTo).toBeNull();
    expect(past.drunk).toBe(d0);
    expect(past.pos.y).toBeLessThan(y0); // walked on up the lane
    expect(s.events.some((e) => e.type === 'windEnter')).toBe(false);
  });

  it('level 2 recomputes the walls, and every bro still finishes his walk', () => {
    // Reviewer's case: an upgraded amp at (4,12) facing north. Its wider cone used to
    // graze the x=2 lane without walling it, and bros looped there forever.
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 500;
    const p = at(s, { x: 4, y: 12 }, { x: 0, y: -1 });
    expect(build(s, p, 'amp')).toBe(true);
    const before = s.distToStatueBros.slice();
    expect(upgradeTower(s, p)).toBe(true);
    expect(s.towers[0]!.level).toBe(1);
    expect(s.distToStatueBros).not.toEqual(before);
    at(s, { x: 22, y: 14 }, { x: 0, y: 1 });
    for (let i = 0; i < 4; i++) {
      const b = spawnBro(s, 'bro');
      b.pos = tileCenter({ x: 2, y: 4 + i });
      b.tile = { x: 2, y: 5 + i };
    }
    let t = 0;
    while (s.bros.length > 0 && s.statueHp > 0 && t++ < 60 * 90) step(s, []);
    expect(t).toBeLessThan(60 * 90); // they all got to the statue or sobered out
  });

  it('a second amp built while a bro is mid-shove cannot ping-pong him forever', () => {
    // Reviewer's case: amp at (7,5) facing east walls (8,5); a bro there is shoved north
    // with a target up the lane; a second amp at (10,2) facing west then walls (8,3).
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 500;
    expect(build(s, at(s, { x: 7, y: 5 }, { x: 1, y: 0 }), 'amp')).toBe(true);
    at(s, { x: 22, y: 14 }, { x: 0, y: 1 });
    const b = spawnBro(s, 'bro');
    b.pos = tileCenter({ x: 8, y: 5 });
    b.tile = { x: 8, y: 5 };
    run(s, 3);
    expect(b.windTo).not.toBeNull();
    const r = canBuild(s, at(s, { x: 10, y: 2 }, { x: -1, y: 0 }), 'amp');
    if (r.ok) build(s, s.players[0]!, 'amp');
    at(s, { x: 22, y: 14 }, { x: 0, y: 1 });
    let t = 0;
    while (s.bros.length > 0 && s.statueHp > 0 && t++ < 60 * 120) step(s, []);
    expect(t).toBeLessThan(60 * 120);
  });

  it('round-trips through serialize/restore with an amp and a bro mid-shove', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 500;
    build(s, at(s, { x: 1, y: 8 }, { x: 1, y: 0 }), 'amp');
    at(s, { x: 22, y: 14 }, { x: 0, y: 1 });
    const b = spawnBro(s, 'bro');
    b.pos = tileCenter({ x: 2, y: 8 });
    b.tile = { x: 2, y: 8 };
    run(s, 2);
    expect(b.windTo).not.toBeNull();
    const copy = restore(serialize(s));
    run(s, 200);
    run(copy, 200);
    expect(serialize(copy)).toBe(serialize(s));
  });

  it('is priced and keyed like the others', () => {
    expect(TOWERS.amp.cost).toBeGreaterThan(TOWERS.dig.cost);
    expect(AMP.halfAngleDeg.length).toBe(TOWERS.amp.levels.length);
  });
});

describe('the amp cannot soft-lock a wave', () => {
  it('refuses two winds that would box a stretch of lane in', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 500;
    build(s, at(s, { x: 1, y: 6 }, { x: 1, y: 0 }), 'amp');
    // A second amp lower on the same lane would leave (2,7)-(2,11) with no way out,
    // bro there or not: a bro shoved into it later would bounce forever.
    const r = canBuild(s, at(s, { x: 1, y: 12 }, { x: 1, y: 0 }), 'amp');
    expect(r.ok).toBe(false);
    expect(r.why).toBe('would box a lane in');
    // The same tile blowing the other way (into the building wall) is fine.
    expect(canBuild(s, at(s, { x: 1, y: 12 }, { x: -1, y: 0 }), 'amp').ok).toBe(true);
  });

  it('a bro standing on the wind tile itself still has a way out', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 500;
    const b = spawnBro(s, 'bro');
    b.pos = tileCenter({ x: 2, y: 8 });
    b.tile = { x: 2, y: 8 };
    expect(build(s, at(s, { x: 1, y: 8 }, { x: 1, y: 0 }), 'amp')).toBe(true);
    at(s, { x: 22, y: 14 }, { x: 0, y: 1 });
    let t = 0;
    while (s.bros.length > 0 && s.statueHp > 90 && t++ < 60 * 60) step(s, []);
    // He either made it to the statue the long way or sobered out; he did not freeze.
    expect(t).toBeLessThan(60 * 60);
  });
});
