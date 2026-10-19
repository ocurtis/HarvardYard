// Noch's Rush, as a pure function of state and commands, stepped at 60Hz.
// No Phaser, no DOM, no timers, no Date, no Math.random (use @shared/rng).

import { nextFloat, nextInt, seedRng } from '@shared/rng';
import { ARRIVAL, BOXES, BOX_CELLS, CONVEYOR, EVENT_KEEP_TICKS, KINDS, ORDERS, PLACEMENT, RACK, SCORING, SHIFT, type Kind } from '../config/game';
import type { Box, Cell, Command, GameState, SimConfig, SimEvent } from './types';

const last = <T>(arr: readonly T[], i: number): T => arr[Math.min(i, arr.length - 1)]!;

export function createState(config: SimConfig): GameState {
  const s: GameState = {
    tick: 0,
    seed: config.seed,
    rng: seedRng(config.seed),
    playerCount: config.playerCount,
    placement: config.placement ?? PLACEMENT,
    phase: 'playing',
    players: [],
    conveyor: [],
    nextArrival: ARRIVAL.firstDelayTicks,
    boxes: [],
    rack: [],
    rackSoldAt: 0,
    tips: 0,
    strikes: 0,
    streak: 0,
    wave: 0,
    boxesThisWave: 0,
    closedTotal: 0,
    nextBoxId: 1,
    events: [],
  };
  for (let i = 0; i < config.playerCount; i++) s.players.push({ id: i, box: 0, cell: 0 });
  for (let i = 0; i < BOXES; i++) s.boxes.push(newBox(s));
  // A square in hand from the start, so the first second isn't dead.
  s.conveyor.push(pickKind(s));
  return s;
}

function emit(s: GameState, e: Omit<SimEvent, 'tick'>): void {
  s.events.push({ ...e, tick: s.tick });
}

// A fresh order: up to kindsByWave distinct kinds across the 2x2, some cells wild.
function newBox(s: GameState): Box {
  const maxKinds = last(ORDERS.kindsByWave, s.wave);
  const wild = last(ORDERS.wildByWave, s.wave);
  const pool: Kind[] = [];
  while (pool.length < maxKinds) {
    const k = KINDS[nextInt(s, KINDS.length)]!;
    if (!pool.includes(k)) pool.push(k);
  }
  const order: Cell[] = [];
  for (let i = 0; i < BOX_CELLS; i++) {
    // Layouts that read as real orders: halves and single corners. Cell 0 always a kind.
    const k = maxKinds === 1 ? pool[0]! : i < 2 ? pool[0]! : pool[Math.min(1, pool.length - 1)]!;
    const cell: Cell = i > 0 && nextFloat(s) < wild ? 'any' : maxKinds >= 3 && i === 3 ? pool[2]! : k;
    order.push(cell);
  }
  return { id: s.nextBoxId++, order, cells: [null, null, null, null], closing: 0, result: null };
}

// What the open orders still need, as a multiset of kinds. In boxOnly mode a box
// fills in reading order, so only each box's next cell counts: anything else
// would be a square nobody can place cleanly.
function needs(s: GameState): Kind[] {
  const out: Kind[] = [];
  for (const b of s.boxes) {
    if (b.closing > 0) continue;
    if (s.placement === 'boxOnly') {
      const i = b.cells.indexOf(null);
      const c = i >= 0 ? b.order[i]! : 'any';
      if (c !== 'any') out.push(c);
      continue;
    }
    b.order.forEach((c, i) => {
      if (b.cells[i] === null && c !== 'any') out.push(c);
    });
  }
  return out;
}

function pickKind(s: GameState): Kind {
  const n = needs(s);
  if (n.length > 0 && nextFloat(s) < ARRIVAL.needBias) return n[nextInt(s, n.length)]!;
  return KINDS[nextInt(s, KINDS.length)]!;
}

function strike(s: GameState, why: SimEvent['type']): void {
  s.strikes++;
  s.streak = 0;
  emit(s, { type: 'strike' });
  if (why !== 'strike') emit(s, { type: why });
  if (s.strikes >= SHIFT.strikesToLose && s.phase === 'playing') {
    s.phase = 'lost';
    emit(s, { type: 'lost' });
  }
}

function closeBox(s: GameState, bi: number): void {
  const b = s.boxes[bi]!;
  let match = 0;
  b.order.forEach((c, i) => {
    if (c === 'any' || b.cells[i] === c) match++;
  });
  let tip = 0;
  if (match === BOX_CELLS) {
    b.result = 'clean';
    s.streak++;
    tip = SCORING.clean + (s.streak % SCORING.streakBonusEvery === 0 ? 1 : 0);
  } else if (match >= SCORING.sentBackBelow) {
    b.result = 'messy';
    s.streak = 0;
    tip = SCORING.messy;
  } else {
    b.result = 'back';
  }
  s.tips += tip;
  b.closing = ORDERS.refillTicks;
  emit(s, { type: 'close', box: bi, result: b.result, tip });
  if (b.result === 'back') strike(s, 'strike');
  s.closedTotal++;
  s.boxesThisWave++;
  const per = last(SHIFT.boxesPerWave, s.wave);
  if (s.boxesThisWave >= per) {
    if (s.wave >= SHIFT.boxesPerWave.length - 1) {
      if (s.phase === 'playing') {
        s.phase = 'won';
        emit(s, { type: 'won' });
      }
    } else {
      s.wave++;
      s.boxesThisWave = 0;
      emit(s, { type: 'waveStart' });
    }
  }
}

function drop(s: GameState, playerIndex: number): void {
  const p = s.players[playerIndex]!;
  const k = s.conveyor[0];
  if (k === undefined) return; // nothing in hand
  const b = s.boxes[p.box];
  if (!b || b.closing > 0) {
    emit(s, { type: 'blocked', box: p.box }); // the lid's on; nothing happens, but say so
    return;
  }
  let cell: number;
  if (s.placement === 'cells') {
    cell = p.cell;
    if (b.cells[cell] !== null) {
      emit(s, { type: 'blocked', box: p.box }); // occupied cell
      return;
    }
  } else {
    cell = b.cells.indexOf(null);
    if (cell < 0) return;
  }
  b.cells[cell] = k;
  s.conveyor.shift();
  emit(s, { type: 'drop', box: p.box });
  if (b.cells.every((c) => c !== null)) closeBox(s, p.box);
}

function rack(s: GameState): void {
  const k = s.conveyor[0];
  if (k === undefined) return;
  s.conveyor.shift();
  if (s.rack.length >= RACK.slots) {
    strike(s, 'rackFull');
    return;
  }
  if (s.rack.length === 0) s.rackSoldAt = s.tick + RACK.sellTicks;
  s.rack.push(k);
  emit(s, { type: 'racked' });
}

export function step(state: GameState, commands: Command[]): void {
  if (state.phase === 'playing') {
    for (const cmd of commands) {
      const pi = state.players.findIndex((p) => p.id === cmd.playerId);
      const p = state.players[pi];
      if (!p || cmd.tick !== state.tick) continue;
      if (cmd.type === 'selectBox' && cmd.box >= 0 && cmd.box < BOXES) p.box = cmd.box;
      if (cmd.type === 'moveCell') {
        const x = Math.max(0, Math.min(1, (p.cell % 2) + cmd.dx));
        const y = Math.max(0, Math.min(1, Math.floor(p.cell / 2) + cmd.dy));
        p.cell = y * 2 + x;
      }
      if (cmd.type === 'drop') drop(state, pi);
      if (cmd.type === 'rack') rack(state);
    }

    // The cutter: a square lands on the conveyor; a full conveyor means the floor.
    if (state.tick >= state.nextArrival) {
      if (state.conveyor.length >= CONVEYOR.slots) strike(state, 'floor');
      else state.conveyor.push(pickKind(state));
      state.nextArrival = state.tick + last(ARRIVAL.ticksByWave, state.wave);
    }

    // Day-old slices sell off the rack one at a time, oldest first, no tip.
    if (state.rack.length > 0 && state.tick >= state.rackSoldAt) {
      state.rack.shift();
      state.rackSoldAt = state.tick + RACK.sellTicks;
      emit(state, { type: 'rackSold' });
    }

    // Closed boxes slide off and a fresh order takes the spot.
    state.boxes.forEach((b, i) => {
      if (b.closing > 0 && --b.closing === 0) state.boxes[i] = newBox(state);
    });
  }

  state.events = state.events.filter((e) => state.tick - e.tick < EVENT_KEEP_TICKS);
  state.tick++;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function restore(json: string): GameState {
  return JSON.parse(json) as GameState;
}
