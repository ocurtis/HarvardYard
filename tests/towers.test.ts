import { describe, expect, it } from 'vitest';
import { BRO, TILE, TOURIST } from '../src/config/game';
import { SELF_UPGRADE, SPRINKLER, TOWERS } from '../src/config/towers';
import { spawnBro, tileCenter } from '../src/sim/bros';
import { createState, serialize, step } from '../src/sim/sim';
import { spawnGroup } from '../src/sim/tourists';
import { build, canBuild, playerTile } from '../src/sim/towers';
import type { Command, GameState, Vec } from '../src/sim/types';

const idle = (): Command[] => [];
const run = (s: GameState, ticks: number, cmdFor: (t: number) => Command[] = idle) => {
  for (let i = 0; i < ticks; i++) step(s, cmdFor(s.tick));
};
type Bare = Command extends infer C ? (C extends unknown ? Omit<C, 'playerId' | 'tick'> : never) : never;
const cmd = (s: GameState, c: Bare): Command[] => [{ playerId: 0, tick: s.tick, ...c } as Command];

// Find a grass tile adjacent to a given lane tile.
function grassNextTo(s: GameState, lane: Vec): Vec {
  for (const d of [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ]) {
    const t = { x: lane.x + d.x, y: lane.y + d.y };
    if (s.map.tiles[t.y * s.map.w + t.x] === 'grass') return t;
  }
  throw new Error('no grass next to lane tile');
}

function standOn(s: GameState, tile: Vec): void {
  s.players[0]!.pos = tileCenter(tile);
}

describe('building', () => {
  it('needs grass, an empty tile, and money', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const grass = grassNextTo(s, s.map.foot);
    standOn(s, grass);
    expect(canBuild(s, s.players[0]!, 'dig').why).toBe('too poor');
    s.money = 100;
    expect(canBuild(s, s.players[0]!, 'dig').ok).toBe(true);
    step(s, cmd(s, { type: 'build', kind: 'dig' }));
    expect(s.towers.length).toBe(1);
    expect(s.money).toBe(100 - TOWERS.dig.cost);
    expect(canBuild(s, s.players[0]!, 'sprinkler').why).toBe('occupied');
    standOn(s, s.map.foot);
    expect(canBuild(s, s.players[0]!, 'dig').why).toBe('not grass');
  });

  it('upgrades the tower under the player and refuses at max level', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const grass = grassNextTo(s, s.map.foot);
    standOn(s, grass);
    s.money = 1000;
    step(s, cmd(s, { type: 'build', kind: 'dig' }));
    step(s, cmd(s, { type: 'upgradeTower' }));
    expect(s.towers[0]!.level).toBe(1);
    const moneyAfter = s.money;
    step(s, cmd(s, { type: 'upgradeTower' }));
    expect(s.towers[0]!.level).toBe(1);
    expect(s.money).toBe(moneyAfter);
  });

  it('self-upgrades cost the ladder and cap at three', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    s.money = 1000;
    for (let i = 0; i < 5; i++) step(s, cmd(s, { type: 'upgradeSelf', stat: 'shout' }));
    expect(s.players[0]!.upgrades.shout).toBe(3);
    expect(s.money).toBe(1000 - SELF_UPGRADE.costs.reduce((a, b) => a + b, 0));
  });
});

describe('dig', () => {
  it('bones the nearest body and sobers a bro', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const grass = grassNextTo(s, s.map.foot);
    standOn(s, grass);
    s.money = 100;
    step(s, cmd(s, { type: 'build', kind: 'dig' }));
    const b = spawnBro(s);
    b.tile = { ...s.map.foot };
    b.pos = tileCenter(b.tile);
    run(s, TOWERS.dig.levels[0]!.fireTicks + 30);
    expect(b.drunk).toBeLessThan(BRO.drunk);
  });

  it('hits a tourist if the tourist is nearer, hauling them off', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const grass = grassNextTo(s, s.map.foot);
    standOn(s, grass);
    s.money = 100;
    step(s, cmd(s, { type: 'build', kind: 'dig' }));
    // Park a group on the foot (nearer) and a bro two tiles away along row.
    const guide = spawnGroup(s);
    const size = s.tourists.filter((t) => t.group === guide.group).length;
    for (const t of s.tourists) {
      t.tile = { ...s.map.foot };
      t.pos = tileCenter(t.tile);
    }
    guide.phase = 'confused';
    guide.timer = 10000;
    const b = spawnBro(s);
    b.tile = { x: s.map.foot.x - 2, y: s.map.foot.y };
    b.pos = tileCenter(b.tile);
    b.phase = 'windup';
    b.timer = 100000;
    run(s, TOWERS.dig.levels[0]!.fireTicks + 30);
    expect(s.tourists.filter((t) => t.group === guide.group).length).toBeLessThan(size);
    expect(b.drunk).toBe(BRO.drunk);
  });
});

describe('sprinkler', () => {
  it('slows and slowly sobers bros in range; soaked tourists leave the group', () => {
    const s = createState({ seed: 1, playerCount: 1 });
    const grass = grassNextTo(s, s.map.foot);
    standOn(s, grass);
    s.money = 100;
    step(s, cmd(s, { type: 'build', kind: 'sprinkler' }));
    const b = spawnBro(s);
    b.tile = { ...s.map.foot };
    b.pos = tileCenter(b.tile);
    b.phase = 'windup';
    b.timer = 100000;
    const guide = spawnGroup(s);
    const size = s.tourists.filter((t) => t.group === guide.group).length;
    for (const t of s.tourists) {
      t.tile = { ...s.map.foot };
      t.pos = tileCenter(t.tile);
    }
    guide.phase = 'confused';
    guide.timer = 100000;
    run(s, SPRINKLER.scatterTicks + 5);
    expect(b.drunk).toBeLessThan(BRO.drunk);
    expect(s.tourists.filter((t) => t.group === guide.group).length).toBeLessThan(size);
  });
});

describe('determinism with towers', () => {
  it('holds', () => {
    const a = createState({ seed: 31, playerCount: 1 });
    const b = createState({ seed: 31, playerCount: 1 });
    for (const s of [a, b]) {
      s.money = 200;
      const grass = grassNextTo(s, s.map.foot);
      standOn(s, grass);
      step(s, cmd(s, { type: 'build', kind: 'dig' }));
      step(s, cmd(s, { type: 'startWave' }));
      run(s, 2400);
    }
    expect(serialize(a)).toBe(serialize(b));
    expect(playerTile(a.players[0]!)).toEqual(grassNextTo(a, a.map.foot));
    void TILE;
    void TOURIST;
  });
});
