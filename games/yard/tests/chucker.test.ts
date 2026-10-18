import { describe, expect, it } from 'vitest';
import { BOUNTY, CHUCKER, CUP, STATUE, TILE } from '../src/config/game';
import { WAVES } from '../src/config/waves';
import { sober, spawnBro, statueCenter } from '../src/sim/bros';
import { createState, step } from '../src/sim/sim';
import { build } from '../src/sim/towers';
import { TILE as T } from '../src/config/game';
import type { Command, GameState } from '../src/sim/types';

const run = (s: GameState, ticks: number, cmdFor: (t: number) => Command[] = () => []) => {
  for (let i = 0; i < ticks; i++) step(s, cmdFor(s.tick));
};
const farAway = (s: GameState) => {
  s.players[0]!.pos = { x: 1, y: 1 };
};

describe('cup chucker', () => {
  it('stops far from the statue and throws a cup after winding up', () => {
    const s = createState({ seed: 7, playerCount: 1 });
    farAway(s);
    const b = spawnBro(s, 'chucker');
    const limit = Math.ceil((20 * TILE) / CHUCKER.speedPxPerTick) + CHUCKER.windupTicks + 5;
    let t = 0;
    while (s.cups.length === 0 && t++ < limit) step(s, []);
    expect(s.cups.length).toBe(1);
    expect(t).toBeGreaterThan(CHUCKER.windupTicks); // he did walk and wind up first
    const c = statueCenter(s);
    const d = Math.hypot(b.pos.x - c.x, b.pos.y - c.y);
    expect(d).toBeLessThanOrEqual(CHUCKER.rangePx + 0.01);
    expect(d).toBeGreaterThan(TILE * 4); // nowhere near the statue
    expect(b.phase).toBe('windup'); // reloading
    expect(b.timer).toBe(CHUCKER.reloadTicks);
  });

  it('a cup that lands does its damage; one caught under the player does not', () => {
    const s = createState({ seed: 7, playerCount: 1 });
    farAway(s);
    spawnBro(s, 'chucker');
    while (s.cups.length === 0) step(s, []);
    const cup = s.cups[0]!;
    const len = Math.hypot(cup.to.x - cup.from.x, cup.to.y - cup.from.y);
    run(s, Math.ceil(len / CUP.speedPxPerTick) + 2);
    expect(s.cups.find((c) => c.id === cup.id)).toBeUndefined();
    expect(s.statueHp).toBe(STATUE.hp - CUP.damage);
    expect(s.popups.some((p) => p.kind === 'loss')).toBe(true);

    // Second cup: stand on its shadow.
    const hpBefore = s.statueHp;
    while (s.cups.length === 0) step(s, []);
    const cup2 = s.cups[0]!;
    run(s, 30);
    s.players[0]!.pos = { ...cup2.pos };
    step(s, []);
    expect(s.cups.find((c) => c.id === cup2.id)).toBeUndefined();
    expect(s.statueHp).toBe(hpBefore);
    expect(s.popups.some((p) => p.text === 'caught!')).toBe(true);
  });

  it('a shout knocks a cup out of the air', () => {
    const s = createState({ seed: 7, playerCount: 1 });
    farAway(s);
    spawnBro(s, 'chucker');
    while (s.cups.length === 0) step(s, []);
    const cup = s.cups[0]!;
    const p = s.players[0]!;
    // Stand a tile short of the cup, facing it, and shout.
    p.pos = { x: cup.pos.x, y: cup.pos.y - TILE };
    step(s, [{ playerId: 0, tick: s.tick, type: 'move', dx: 0, dy: 1 }]);
    step(s, [{ playerId: 0, tick: s.tick, type: 'shout' }]);
    expect(s.cups.find((c) => c.id === cup.id)).toBeUndefined();
  });

  it('sobering any bro pays his bounty', () => {
    const s = createState({ seed: 7, playerCount: 1 });
    farAway(s);
    for (const kind of ['bro', 'longshot', 'chucker'] as const) {
      const before = s.money;
      const b = spawnBro(s, kind);
      sober(b, 1000);
      step(s, []);
      expect(s.money).toBe(before + BOUNTY[kind]);
      expect(s.bros.find((x) => x.id === b.id)).toBeUndefined();
    }
    expect(s.popups.filter((p) => p.kind === 'gain').length).toBe(3);
  });

  it('is in the wave table from its first wave, and the wave waits for cups in flight', () => {
    const first = WAVES.findIndex((w) => w.chuckers > 0);
    expect(first + 1).toBe(CHUCKER.firstWave);
    const s = createState({ seed: 8, playerCount: 1 });
    farAway(s);
    s.wave.index = first - 1;
    step(s, [{ playerId: 0, tick: s.tick, type: 'startWave' }]);
    const def = WAVES[first]!;
    run(s, (def.bros + def.longshots + def.chuckers) * def.spacingTicks + 2);
    expect(s.bros.filter((b) => b.kind === 'chucker').length).toBe(def.chuckers);
    // Clear the field but leave a cup flying: the wave must not end yet.
    while (s.cups.length === 0) step(s, []);
    s.bros = [];
    s.tourists = [];
    s.groups = {};
    s.wave.groupsToSpawn = 0;
    step(s, []);
    expect(s.wave.active).toBe(true);
    s.cups = [];
    step(s, []);
    expect(s.wave.active).toBe(false);
  });

  it('towers ignore a chucker; only the player can sober him', () => {
    const s = createState({ seed: 7, playerCount: 1 });
    farAway(s);
    const b = spawnBro(s, 'chucker');
    while (b.phase === 'walking') step(s, []);
    // A dig and a sprinkler right next to him, on grass.
    const p = s.players[0]!;
    s.money = 1000;
    const spots = [
      { x: b.tile.x + 1, y: b.tile.y },
      { x: b.tile.x - 1, y: b.tile.y },
      { x: b.tile.x, y: b.tile.y + 1 },
      { x: b.tile.x, y: b.tile.y - 1 },
    ];
    let placed = 0;
    for (const t of spots) {
      p.pos = { x: t.x * T + T / 2, y: t.y * T + T / 2 };
      if (build(s, p, placed === 0 ? 'dig' : 'sprinkler')) placed++;
      if (placed === 2) break;
    }
    expect(placed).toBe(2);
    farAway(s);
    const before = b.drunk;
    run(s, 240);
    expect(b.drunk).toBe(before);
    expect(s.bones.length).toBe(0);
  });
});
