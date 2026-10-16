import { describe, expect, it } from 'vitest';
import { BRO, LONGSHOT, STATUE, TILE } from '../src/config/game';
import { WAVES } from '../src/config/waves';
import { spawnBro, statueCenter } from '../src/sim/bros';
import { createState, step } from '../src/sim/sim';
import type { Command, GameState } from '../src/sim/types';

const idle = (): Command[] => [];
const run = (s: GameState, ticks: number) => {
  for (let i = 0; i < ticks; i++) step(s, idle());
};

describe('longshot bro', () => {
  it('is faster and less drunk than a bro', () => {
    expect(LONGSHOT.speedPxPerTick).toBeGreaterThan(BRO.speedPxPerTick);
    expect(LONGSHOT.drunk).toBeLessThan(BRO.drunk);
  });

  it('stops short of the statue, within range, and pisses from there', () => {
    const s = createState({ seed: 5, playerCount: 1 });
    const b = spawnBro(s, 'longshot');
    // Long enough to walk the longest route at longshot speed, plus wind-up.
    run(s, Math.ceil((50 * TILE) / LONGSHOT.speedPxPerTick) + LONGSHOT.windupTicks + 60);
    expect(b.phase).toBe('pissing');
    const c = statueCenter(s);
    const d = Math.hypot(b.pos.x - c.x, b.pos.y - c.y);
    expect(d).toBeLessThanOrEqual(LONGSHOT.rangePx + 0.01);
    // Not adjacent: a longshot never needs to reach the statue.
    expect(d).toBeGreaterThan(TILE * 1.6 + 1);
    expect(s.statueHp).toBeLessThan(STATUE.hp);
  });

  it('a regular bro still walks all the way in', () => {
    const s = createState({ seed: 5, playerCount: 1 });
    const b = spawnBro(s, 'bro');
    run(s, Math.ceil((50 * TILE) / BRO.speedPxPerTick) + BRO.windupTicks + 60);
    expect(b.phase).toBe('pissing');
    const c = statueCenter(s);
    expect(Math.hypot(b.pos.x - c.x, b.pos.y - c.y)).toBeLessThanOrEqual(TILE * 1.6 + 1);
  });

  it('appears in waves from the configured wave on, interleaved', () => {
    const first = WAVES.findIndex((w) => w.longshots > 0);
    expect(first + 1).toBe(LONGSHOT.firstWave);
    const s = createState({ seed: 6, playerCount: 1 });
    for (let w = 0; w <= first; w++) {
      step(s, [{ playerId: 0, tick: s.tick, type: 'startWave' }]);
      // Spawn everything, then clear the field so the next wave can be called.
      const def = WAVES[w]!;
      run(s, (def.bros + def.longshots) * def.spacingTicks + 2);
      if (w === first) {
        expect(s.bros.filter((b) => b.kind === 'longshot').length).toBe(def.longshots);
        expect(s.bros.filter((b) => b.kind === 'bro').length).toBe(def.bros);
      }
      s.bros = [];
      s.tourists = [];
      s.groups = {};
      s.wave.groupsToSpawn = 0;
      run(s, 2);
    }
  });
});
