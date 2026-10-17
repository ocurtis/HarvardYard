import { describe, expect, it } from 'vitest';
import { BRO, FINALS, TILE } from '../src/config/game';
import { WAVES } from '../src/config/waves';
import { spawnBro, statueCenter } from '../src/sim/bros';
import { createState, step } from '../src/sim/sim';

describe('finals club member', () => {
  it('is faster and much tougher than a bro', () => {
    expect(FINALS.speedPxPerTick).toBeGreaterThan(BRO.speedPxPerTick);
    expect(FINALS.drunk).toBeGreaterThan(BRO.drunk * 2);
  });

  it('walks all the way in like a bro', () => {
    const s = createState({ seed: 9, playerCount: 1 });
    s.players[0]!.pos = { x: 1, y: 1 };
    const b = spawnBro(s, 'finals');
    while (b.phase === 'walking') step(s, []);
    const c = statueCenter(s);
    expect(Math.hypot(b.pos.x - c.x, b.pos.y - c.y)).toBeLessThanOrEqual(TILE * 1.6 + 1);
  });

  it('first appears on its configured wave', () => {
    const first = WAVES.findIndex((w) => w.finals > 0);
    expect(first + 1).toBe(FINALS.firstWave);
    for (let i = 0; i < first; i++) expect(WAVES[i]!.finals).toBe(0);
    const s = createState({ seed: 9, playerCount: 1 });
    s.players[0]!.pos = { x: 1, y: 1 };
    s.wave.index = first - 1;
    step(s, [{ playerId: 0, tick: s.tick, type: 'startWave' }]);
    const def = WAVES[first]!;
    for (let i = 0; i < (def.bros + def.longshots + def.chuckers + def.finals) * def.spacingTicks + 2; i++) step(s, []);
    expect(s.bros.filter((b) => b.kind === 'finals').length).toBe(def.finals);
  });
});
