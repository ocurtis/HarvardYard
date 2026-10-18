import { describe, expect, it } from 'vitest';
import { BRO, STATUE } from '../src/config/game';
import { WAVES } from '../src/config/waves';
import { computeDistToStatue, statueAdjacentLaneTiles } from '../src/sim/path';
import { createState, serialize, step } from '../src/sim/sim';
import type { Command, GameState } from '../src/sim/types';

const none = (): Command[] => [];
function run(s: GameState, ticks: number, cmdFor: (t: number) => Command[] = none): void {
  for (let i = 0; i < ticks; i++) step(s, cmdFor(s.tick));
}
const callWave = (s: GameState): Command[] => [{ playerId: 0, tick: s.tick, type: 'startWave' }];

describe('flow field', () => {
  it('reaches every gate from the statue over lane tiles', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    for (const g of s.map.gates) {
      const d = s.distToStatue[g.y * s.map.w + g.x];
      expect(d).toBeGreaterThan(0);
    }
  });

  it('has at least one statue-adjacent lane tile', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    expect(statueAdjacentLaneTiles(s.map).length).toBeGreaterThan(0);
    expect(computeDistToStatue(s.map).filter((d) => d === 0).length).toBeGreaterThan(0);
  });

  it('the long route from the top gate is long enough to defend', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const top = s.map.gates.find((g) => g.y === 0)!;
    expect(s.distToStatue[top.y * s.map.w + top.x]).toBeGreaterThanOrEqual(40);
  });
});

describe('waves and bros', () => {
  it('nothing spawns until a wave is called', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    run(s, 600);
    expect(s.bros.length).toBe(0);
    expect(s.wave.index).toBe(-1);
  });

  it('calling a wave spawns the configured number of bros', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    step(s, callWave(s));
    const def = WAVES[0]!;
    run(s, def.spacingTicks * def.bros + 1);
    expect(s.wave.index).toBe(0);
    // Some may already be at the statue, none have left (nothing sobers them yet).
    expect(s.bros.length).toBe(def.bros);
  });

  it('a second call during an active wave is ignored', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    step(s, callWave(s));
    step(s, callWave(s));
    expect(s.wave.index).toBe(0);
  });

  it('bros walk to the statue, wind up, and drain statue HP', () => {
    const s = createState({ seed: 3, playerCount: 1 });
    step(s, callWave(s));
    // Longest route is ~47 tiles at 0.6 px/tick: ~1250 ticks. Give it 2000.
    run(s, 2000);
    expect(s.bros.some((b) => b.phase === 'pissing')).toBe(true);
    expect(s.statueHp).toBeLessThan(STATUE.hp);
  });

  it('the game is lost when statue HP hits zero', () => {
    const s = createState({ seed: 3, playerCount: 1 });
    step(s, callWave(s));
    run(s, 2000 + Math.ceil(STATUE.hp / BRO.pissPerTick));
    expect(s.statueHp).toBe(0);
    expect(s.phase).toBe('lost');
  });

  it('player count scales the wave', () => {
    const a = createState({ seed: 1, playerCount: 1 });
    const b = createState({ seed: 1, playerCount: 3 });
    step(a, callWave(a));
    step(b, callWave(b));
    expect(b.wave.toSpawn).toBeGreaterThan(a.wave.toSpawn);
  });

  it('stays deterministic with bros in play', () => {
    const a = createState({ seed: 11, playerCount: 1 });
    const b = createState({ seed: 11, playerCount: 1 });
    for (const s of [a, b]) {
      step(s, callWave(s));
      run(s, 1500, (t) => [{ playerId: 0, tick: t, type: 'move', dx: 1, dy: 0 }]);
    }
    expect(serialize(a)).toBe(serialize(b));
  });
});
