// A scripted player for the balance sim. It is not clever; it is consistent,
// which is what tuning needs. Each tick it picks one job by priority and
// emits the commands a human would: walk somewhere, shout, build, call a wave.
//
// Priorities, highest first:
//   1. catch a cup in flight (run to its shadow)
//   2. brochure a confused guide (walk to him)
//   3. build or upgrade a tower when the plan and the bank allow
//   4. shout at the nearest bro
//   5. call the next wave when the field is quiet
//
// Knobs live on BotPolicy so the harness can sweep them.

import { CUP, LONGSHOT, SHOUT, TILE } from '../src/config/game';
import { SELF_UPGRADE, TOWERS, type SelfStat, type TowerKind } from '../src/config/towers';
import { blocksMovement, tileAt } from '../src/sim/map';
import { isLaneTile } from '../src/sim/path';
import { inCone } from '../src/sim/shout';
import { canBuild, playerTile, towerAt } from '../src/sim/towers';
import type { Command, GameState, Vec } from '../src/sim/types';
import { canStartWave } from '../src/sim/waves';

export interface BotPolicy {
  name: string;
  towerKind: TowerKind;
  maxTowers: number;
  reserve: number; // never spend below this
  upgradeTowers: boolean;
  selfUpgrades: SelfStat[]; // bought in this order when affordable, after towers
  chaseGuides: boolean;
  catchCups: boolean;
  callWavesEarly: boolean; // true: call the next wave the moment it's allowed
}

export const POLICIES: BotPolicy[] = [
  { name: 'idle', towerKind: 'dig', maxTowers: 0, reserve: 0, upgradeTowers: false, selfUpgrades: [], chaseGuides: false, catchCups: false, callWavesEarly: true },
  { name: 'shout-only', towerKind: 'dig', maxTowers: 0, reserve: 0, upgradeTowers: false, selfUpgrades: ['shout', 'range', 'speed'], chaseGuides: true, catchCups: true, callWavesEarly: true },
  { name: 'digs', towerKind: 'dig', maxTowers: 20, reserve: 0, upgradeTowers: true, selfUpgrades: [], chaseGuides: true, catchCups: true, callWavesEarly: true },
  { name: 'digs+self', towerKind: 'dig', maxTowers: 24, reserve: 0, upgradeTowers: true, selfUpgrades: ['speed', 'shout', 'range'], chaseGuides: true, catchCups: true, callWavesEarly: true },
  { name: 'amps', towerKind: 'amp', maxTowers: 24, reserve: 0, upgradeTowers: true, selfUpgrades: [], chaseGuides: true, catchCups: true, callWavesEarly: true },
  { name: 'sprinklers', towerKind: 'sprinkler', maxTowers: 24, reserve: 0, upgradeTowers: true, selfUpgrades: [], chaseGuides: true, catchCups: true, callWavesEarly: true },
];

const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export class Bot {
  private plan: Vec[] = [];
  private dead = new Set<string>(); // sites the sim refused
  private fieldCache = new Map<string, number[]>();
  private pid: number;

  constructor(private state: GameState, private policy: BotPolicy, playerId = 0) {
    this.pid = playerId;
    this.plan = this.planTowerSites();
  }

  // ---- the per-tick decision

  commands(): Command[] {
    const s = this.state;
    const p = s.players[this.pid]!;
    const t = s.tick;
    const out: Command[] = [];
    const pol = this.policy;

    // 1. A cup in the air: run under it. Aim a little ahead along its line so we meet it.
    // Only chase one we can beat to the ground; otherwise the thrower is the better target.
    // A bro in position at the statue outranks a cup unless the cup is about to land.
    const inPosition = s.bros.some((b) => b.phase !== 'walking' && b.phase !== 'leaving');
    const catchable = pol.catchCups
      ? s.cups.filter((c) => {
          const len = Math.hypot(c.to.x - c.from.x, c.to.y - c.from.y);
          const ticksLeft = ((1 - c.progress) * len) / CUP.speedPxPerTick;
          const speed = 1.25 + SELF_UPGRADE.speedAdd[p.upgrades.speed]!;
          const reachable = dist(c.to, p.pos) / speed < ticksLeft;
          return reachable && (!inPosition || ticksLeft < 120);
        })
      : [];
    if (catchable.length > 0) {
      const c = catchable.reduce((a, b) => (b.progress > a.progress ? b : a));
      const lead = Math.min(1, c.progress + (24 / Math.hypot(c.to.x - c.from.x, c.to.y - c.from.y)));
      const aim = { x: c.from.x + (c.to.x - c.from.x) * lead, y: c.from.y + (c.to.y - c.from.y) * lead };
      if (Math.hypot(aim.x - p.pos.x, aim.y - p.pos.y) > CUP.catchRadiusPx / 2) out.push(this.moveToward(aim));
      return out;
    }

    // 2. A confused guide: go hand him a brochure.
    if (pol.chaseGuides) {
      const guides = s.tourists.filter((g) => g.guide && (g.phase === 'confused' || g.phase === 'entering'));
      if (guides.length > 0) {
        const target = this.nearest(p.pos, guides.map((g) => g.pos));
        out.push(this.moveToward(target));
        return out;
      }
    }

    // 3. Someone is pissing on the statue: deal with him before shopping.
    const urgent = s.bros.some((b) => b.phase !== 'walking' && b.phase !== 'leaving'); // in position at the statue, staggered or not
    const shop = urgent ? null : this.shopping();
    if (shop) {
      if (shop.go) out.push(this.moveToward(shop.go));
      if (shop.cmd) out.push(shop.cmd);
      return out;
    }

    // 4. Shout at the nearest bro.
    if (s.bros.length > 0) {
      // Bros at the statue first (they're the ones doing damage), then the nearest.
      const score = (b: (typeof s.bros)[number]) => (b.phase === 'walking' ? 0 : -2000) + dist(b.pos, p.pos); // anyone in position first, nearest among them
      const b = s.bros.reduce((a, c) => (score(c) < score(a) ? c : a));
      const range = SHOUT.rangePx + SELF_UPGRADE.rangeAdd[p.upgrades.range]!;
      if (inCone(p.pos, p.facing, b.pos, range)) {
        out.push({ playerId: this.pid, tick: t, type: 'shout' });
      } else if (dist(b.pos, p.pos) <= range * 0.8) {
        // In range but not facing: turn by nudging toward him, then shout next tick.
        // Standing on top of him makes the facing meaningless, so back off a step first.
        const away = dist(b.pos, p.pos) < 6 ? -1 : 1;
        out.push({ playerId: this.pid, tick: t, type: 'move', dx: (sgn(b.pos.x - p.pos.x) * away) as -1 | 0 | 1, dy: (sgn(b.pos.y - p.pos.y) * away) as -1 | 0 | 1 });
      } else {
        out.push(this.moveToward(b.pos));
      }
      return out;
    }

    // 5. Nothing to do: call the wave.
    if (canStartWave(s) && (pol.callWavesEarly || s.tourists.length === 0)) {
      out.push({ playerId: this.pid, tick: t, type: 'startWave' });
    }
    return out;
  }

  // ---- shopping

  private shopping(): { go: Vec | null; cmd: Command | null } | null {
    const s = this.state;
    const p = s.players[this.pid]!;
    const pol = this.policy;
    const money = s.money - pol.reserve;
    const kind = pol.towerKind;
    const def = TOWERS[kind];

    // Next unbuilt site in the plan.
    const site = this.plan.find((v) => !towerAt(s, v) && !this.dead.has(`${v.x},${v.y}`));
    if (site && s.towers.length < pol.maxTowers && money >= def.cost) {
      const here = playerTile(p);
      if (here.x === site.x && here.y === site.y && centered(p.pos, site)) {
        const r = canBuild(s, p, kind);
        if (!r.ok && r.why !== 'too poor') {
          // The sim won't have it here (an Amp that would wall the Yard off, say): drop the site.
          this.dead.add(`${site.x},${site.y}`);
          return this.shopping();
        }
        return { go: null, cmd: { playerId: this.pid, tick: s.tick, type: 'build', kind } };
      }
      return { go: tileCenter(site), cmd: null };
    }
    if (pol.upgradeTowers) {
      const up = s.towers.find((tw) => {
        const cost = TOWERS[tw.kind].levels[tw.level]!.upgradeCost;
        return cost !== null && money >= cost;
      });
      if (up) {
        const here = playerTile(p);
        if (here.x === up.tile.x && here.y === up.tile.y && centered(p.pos, up.tile)) {
          return { go: null, cmd: { playerId: this.pid, tick: s.tick, type: 'upgradeTower' } };
        }
        return { go: tileCenter(up.tile), cmd: null };
      }
    }
    for (const stat of pol.selfUpgrades) {
      const cost = SELF_UPGRADE.costs[p.upgrades[stat]];
      if (cost !== undefined && money >= cost) {
        return { go: null, cmd: { playerId: this.pid, tick: s.tick, type: 'upgradeSelf', stat } };
      }
    }
    return null;
  }

  // Grass tiles ranked by how much lane they cover, weighted toward the statue.
  // Sites are at least two tiles apart so coverage spreads along the approach.
  private planTowerSites(): Vec[] {
    const s = this.state;
    const map = s.map;
    const range = TOWERS[this.policy.towerKind].levels[0]!.rangePx;
    const statueC = { x: (map.statue.x + 1) * TILE, y: (map.statue.y + 1) * TILE };
    const scored: { v: Vec; score: number }[] = [];
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        if (tileAt(map, x, y) !== 'grass') continue;
        const c = tileCenter({ x, y });
        let score = 0;
        for (let ly = 0; ly < map.h; ly++) {
          for (let lx = 0; lx < map.w; lx++) {
            if (!isLaneTile(tileAt(map, lx, ly))) continue;
            if (dist(c, tileCenter({ x: lx, y: ly })) > range) continue;
            const d = s.distToStatue[ly * map.w + lx]!;
            if (d < 0) continue;
            score += 1 + 8 / (1 + d); // every lane tile counts; near the statue counts a lot
            // Lane tiles at the edge of longshot range are where longshots stand and fire.
            const toStatue = dist(tileCenter({ x: lx, y: ly }), statueC);
            if (toStatue <= LONGSHOT.rangePx && toStatue > LONGSHOT.rangePx - TILE * 1.5) score += 5;
          }
        }
        if (score > 0) scored.push({ v: { x, y }, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    const picked: Vec[] = [];
    for (const { v } of scored) {
      if (picked.every((q) => Math.abs(q.x - v.x) + Math.abs(q.y - v.y) >= 3)) picked.push(v);
      if (picked.length >= 24) break;
    }
    return picked;
  }

  // ---- movement

  private moveToward(target: Vec): Command {
    const s = this.state;
    const p = s.players[this.pid]!;
    const tt = { x: Math.floor(target.x / TILE), y: Math.floor(target.y / TILE) };
    const here = playerTile(p);
    let aim = target;
    if (here.x !== tt.x || here.y !== tt.y) {
      const field = this.walkField(tt);
      // Step to the neighbor tile with the lowest distance; if none, walk straight.
      let best: Vec | null = null;
      let bestD = field[here.y * s.map.w + here.x] ?? Infinity;
      for (const d of DIRS) {
        const nx = here.x + d.x;
        const ny = here.y + d.y;
        const v = field[ny * s.map.w + nx];
        if (v !== undefined && v >= 0 && v < bestD) {
          bestD = v;
          best = { x: nx, y: ny };
        }
      }
      if (best) aim = tileCenter(best);
    }
    const dx = aim.x - p.pos.x;
    const dy = aim.y - p.pos.y;
    return { playerId: this.pid, tick: s.tick, type: 'move', dx: Math.abs(dx) < 0.6 ? 0 : sgn(dx), dy: Math.abs(dy) < 0.6 ? 0 : sgn(dy) };
  }

  // BFS over tiles the player can stand on, from the target outward. Cached per target.
  private walkField(target: Vec): number[] {
    const key = `${target.x},${target.y}`;
    const hit = this.fieldCache.get(key);
    if (hit) return hit;
    const map = this.state.map;
    const field = new Array<number>(map.w * map.h).fill(-1);
    if (blocksMovement(tileAt(map, target.x, target.y))) {
      this.fieldCache.set(key, field);
      return field;
    }
    const q: Vec[] = [target];
    field[target.y * map.w + target.x] = 0;
    while (q.length) {
      const c = q.shift()!;
      const cd = field[c.y * map.w + c.x]!;
      for (const d of DIRS) {
        const n = { x: c.x + d.x, y: c.y + d.y };
        if (n.x < 0 || n.y < 0 || n.x >= map.w || n.y >= map.h) continue;
        if (field[n.y * map.w + n.x] !== -1) continue;
        if (blocksMovement(tileAt(map, n.x, n.y))) continue;
        field[n.y * map.w + n.x] = cd + 1;
        q.push(n);
      }
    }
    this.fieldCache.set(key, field);
    return field;
  }

  private nearest(from: Vec, pts: Vec[]): Vec {
    return pts.reduce((a, b) => (dist(b, from) < dist(a, from) ? b : a));
  }
}

function tileCenter(t: Vec): Vec {
  return { x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 };
}
function centered(pos: Vec, tile: Vec): boolean {
  const c = tileCenter(tile);
  return Math.abs(pos.x - c.x) < 3 && Math.abs(pos.y - c.y) < 3;
}
function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function sgn(v: number): -1 | 0 | 1 {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}
