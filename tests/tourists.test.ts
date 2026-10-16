import { describe, expect, it } from 'vitest';
import { TILE, TOURIST } from '../src/config/game';
import { createState, serialize, step } from '../src/sim/sim';
import { groupSize, groupValue, spawnGroup } from '../src/sim/tourists';
import type { Command, GameState } from '../src/sim/types';

const idle = (): Command[] => [];
const run = (s: GameState, ticks: number, cmdFor: (t: number) => Command[] = idle) => {
  for (let i = 0; i < ticks; i++) step(s, cmdFor(s.tick));
};
const callWave = (s: GameState): Command[] => [{ playerId: 0, tick: s.tick, type: 'startWave' }];

// Ticks to walk n tiles at tourist speed, with slack.
const walkTicks = (n: number) => Math.ceil((n * TILE) / TOURIST.speedPxPerTick) + n * 2 + 20;

describe('tourist groups', () => {
  it('spawn with a wave as groups with one guide', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    step(s, callWave(s));
    run(s, 600);
    expect(s.tourists.length).toBeGreaterThan(0);
    const groups = new Set(s.tourists.map((t) => t.group));
    for (const g of groups) {
      const members = s.tourists.filter((t) => t.group === g);
      expect(members.filter((t) => t.guide).length).toBe(1);
      expect(members.length).toBeGreaterThanOrEqual(TOURIST.groupMin);
      expect(members.length).toBeLessThanOrEqual(TOURIST.groupMax);
    }
  });

  it('the guide walks in a few tiles and stops, confused; followers line up behind', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    const guide = spawnGroup(s);
    const gate = { ...guide.tile };
    run(s, walkTicks(TOURIST.wanderTiles + TOURIST.groupMax));
    expect(guide.phase).toBe('confused');
    const d = s.distToStatue[gate.y * s.map.w + gate.x]! - s.distToStatue[guide.tile.y * s.map.w + guide.tile.x]!;
    expect(d).toBe(TOURIST.wanderTiles);
    const followers = s.tourists.filter((t) => t.group === guide.group && !t.guide);
    expect(followers.length).toBeGreaterThanOrEqual(TOURIST.groupMin - 1);
    // Each follower stands behind the guide, never on top of him.
    for (const f of followers) {
      expect(Math.hypot(f.pos.x - guide.pos.x, f.pos.y - guide.pos.y)).toBeGreaterThan(0);
    }
  });

  it('a group is worth $10 a head and its value drains only while the guide is confused', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    s.players[0]!.pos = { x: 1, y: 1 };
    const guide = spawnGroup(s);
    const size = groupSize(s, guide.group);
    expect(groupValue(s, guide.group)).toBe(TOURIST.valuePerHead * size);
    run(s, 30);
    expect(guide.phase).toBe('entering');
    expect(groupValue(s, guide.group)).toBe(TOURIST.valuePerHead * size);
    while (guide.phase === 'entering') step(s, []);
    expect(guide.phase).toBe('confused');
    run(s, Math.floor(TOURIST.confusedTicks / 2));
    const half = groupValue(s, guide.group);
    expect(half).toBeLessThan(TOURIST.valuePerHead * size);
    expect(half).toBeGreaterThan(0);
  });

  it('at $0 the group storms out, costs the penalty, and the bank floors at zero', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    s.players[0]!.pos = { x: 1, y: 1 };
    s.money = 4;
    const guide = spawnGroup(s);
    while (guide.phase === 'entering') step(s, []);
    run(s, TOURIST.confusedTicks + 2);
    expect(guide.phase).toBe('leaving');
    expect(s.money).toBe(0);
    expect(s.popups.some((p) => p.kind === 'loss')).toBe(true);
    run(s, walkTicks(TOURIST.wanderTiles + TOURIST.groupMax + 4));
    expect(s.tourists.length).toBe(0);
    expect(Object.keys(s.groups).length).toBe(0);
  });

  it('touching the guide locks the value; the group pays it at the foot and leaves', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    s.players[0]!.pos = { x: 1, y: 1 };
    const guide = spawnGroup(s);
    run(s, walkTicks(TOURIST.wanderTiles + TOURIST.groupMax));
    expect(guide.phase).toBe('confused');
    run(s, Math.floor(TOURIST.confusedTicks / 3));
    const locked = groupValue(s, guide.group);
    s.players[0]!.pos = { ...guide.pos };
    step(s, []);
    expect(guide.phase).toBe('pamphleted');
    s.players[0]!.pos = { x: 1, y: 1 };
    run(s, 60);
    expect(groupValue(s, guide.group)).toBe(locked); // no more draining
    const dist = s.distToFoot[guide.tile.y * s.map.w + guide.tile.x]!;
    run(s, walkTicks(dist));
    expect(s.money).toBe(locked);
    expect(s.popups.some((p) => p.kind === 'gain')).toBe(true);
    run(s, walkTicks(70));
    expect(s.tourists.filter((t) => t.group === guide.group).length).toBe(0);
  });

  it('followers huddle half a tile apart', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    s.players[0]!.pos = { x: 1, y: 1 };
    const guide = spawnGroup(s);
    run(s, walkTicks(TOURIST.wanderTiles + TOURIST.groupMax));
    const members = s.tourists.filter((t) => t.group === guide.group).sort((a, b) => a.rank - b.rank);
    for (let i = 1; i < members.length; i++) {
      const a = members[i - 1]!;
      const b = members[i]!;
      const d = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(TILE / 2 + 0.01);
    }
  });

  it('touching the back of the huddle does nothing (the guide is the hand-off)', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    s.players[0]!.pos = { x: 1, y: 1 };
    const guide = spawnGroup(s);
    run(s, walkTicks(TOURIST.wanderTiles + TOURIST.groupMax));
    const members = s.tourists.filter((t) => t.group === guide.group && !t.guide).sort((a, b) => b.rank - a.rank);
    const follower = members[0]!;
    s.players[0]!.pos = { ...follower.pos };
    step(s, []);
    expect(guide.phase).toBe('confused');
  });

  it('stays deterministic with groups in play', () => {
    const a = createState({ seed: 21, playerCount: 2 });
    const b = createState({ seed: 21, playerCount: 2 });
    for (const s of [a, b]) {
      step(s, callWave(s));
      run(s, 1800, (t) => [{ playerId: 0, tick: t, type: 'move', dx: -1, dy: 0 }]);
    }
    expect(serialize(a)).toBe(serialize(b));
  });
});
