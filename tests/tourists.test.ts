import { describe, expect, it } from 'vitest';
import { TILE, TOURIST } from '../src/config/game';
import { createState, serialize, step } from '../src/sim/sim';
import { groupSize, spawnGroup } from '../src/sim/tourists';
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
    // Each follower sits behind the one ahead, never on the guide's tile.
    for (const f of followers) {
      expect(f.tile).not.toEqual(guide.tile);
    }
  });

  it('the whole group leaves if nobody reaches the guide in time', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    s.players[0]!.pos = { x: 1, y: 1 };
    spawnGroup(s);
    run(s, walkTicks(TOURIST.wanderTiles) + TOURIST.confusedTicks + walkTicks(TOURIST.wanderTiles + TOURIST.groupMax + 2));
    expect(s.tourists.length).toBe(0);
    expect(s.money).toBe(0);
    expect(Object.keys(s.groups).length).toBe(0);
  });

  it('touching the guide pamphlets the group; it pays per member at the foot and leaves', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    const guide = spawnGroup(s);
    const size = groupSize(s, guide.group);
    run(s, walkTicks(TOURIST.wanderTiles + TOURIST.groupMax));
    expect(guide.phase).toBe('confused');
    s.players[0]!.pos = { ...guide.pos };
    step(s, []);
    expect(guide.phase).toBe('pamphleted');
    const dist = s.distToFoot[guide.tile.y * s.map.w + guide.tile.x]!;
    run(s, walkTicks(dist));
    expect(s.money).toBe(TOURIST.payout * size);
    run(s, walkTicks(70));
    expect(s.tourists.filter((t) => t.group === guide.group).length).toBe(0);
  });

  it('touching a follower does nothing', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    const guide = spawnGroup(s);
    run(s, walkTicks(TOURIST.wanderTiles + TOURIST.groupMax));
    const follower = s.tourists.find((t) => t.group === guide.group && !t.guide)!;
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
