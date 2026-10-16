import { describe, expect, it } from 'vitest';
import { TILE, TOURIST } from '../src/config/game';
import { createState, serialize, step } from '../src/sim/sim';
import { spawnTourist } from '../src/sim/tourists';
import type { Command, GameState } from '../src/sim/types';

const idle = (): Command[] => [];
const run = (s: GameState, ticks: number, cmdFor: (t: number) => Command[] = idle) => {
  for (let i = 0; i < ticks; i++) step(s, cmdFor(s.tick));
};
const callWave = (s: GameState): Command[] => [{ playerId: 0, tick: s.tick, type: 'startWave' }];

// Ticks to walk n tiles at tourist speed, with slack.
const walkTicks = (n: number) => Math.ceil((n * TILE) / TOURIST.speedPxPerTick) + n * 2 + 20;

describe('tourists', () => {
  it('spawn with a wave', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    step(s, callWave(s));
    run(s, 600);
    expect(s.tourists.length).toBeGreaterThan(0);
  });

  it('walk in a few tiles and then stop, confused', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    const t = spawnTourist(s);
    const gate = { ...t.tile };
    run(s, walkTicks(TOURIST.wanderTiles));
    expect(t.phase).toBe('confused');
    const d = s.distToStatue[gate.y * s.map.w + gate.x]! - s.distToStatue[t.tile.y * s.map.w + t.tile.x]!;
    expect(d).toBe(TOURIST.wanderTiles);
  });

  it('leave if nobody reaches them in time', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    // Park the player far from any tourist.
    s.players[0]!.pos = { x: 1, y: 1 };
    spawnTourist(s);
    run(s, walkTicks(TOURIST.wanderTiles) + TOURIST.confusedTicks + walkTicks(TOURIST.wanderTiles + 2));
    expect(s.tourists.length).toBe(0);
    expect(s.money).toBe(0);
  });

  it('a touched tourist takes the brochure, walks to the foot, pays, and leaves', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    const t = spawnTourist(s);
    run(s, walkTicks(TOURIST.wanderTiles));
    expect(t.phase).toBe('confused');
    // Teleport the player onto the tourist (the test is the hand-off, not the walk).
    s.players[0]!.pos = { ...t.pos };
    step(s, []);
    expect(t.phase).toBe('pamphleted');
    const dist = s.distToFoot[t.tile.y * s.map.w + t.tile.x]!;
    run(s, walkTicks(dist));
    expect(s.money).toBe(TOURIST.payout);
    // Then he heads for an exit and is gone.
    run(s, walkTicks(60));
    expect(s.tourists.find((x) => x.id === t.id)).toBeUndefined();
  });

  it('can be reached while still entering', () => {
    const s = createState({ seed: 2, playerCount: 1 });
    const t = spawnTourist(s);
    run(s, 5);
    s.players[0]!.pos = { ...t.pos };
    step(s, []);
    expect(t.phase).toBe('pamphleted');
  });

  it('stays deterministic with tourists in play', () => {
    const a = createState({ seed: 21, playerCount: 2 });
    const b = createState({ seed: 21, playerCount: 2 });
    for (const s of [a, b]) {
      step(s, callWave(s));
      run(s, 1800, (t) => [{ playerId: 0, tick: t, type: 'move', dx: -1, dy: 0 }]);
    }
    expect(serialize(a)).toBe(serialize(b));
  });
});
