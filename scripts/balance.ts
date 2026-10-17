// Balance harness. Runs every bot policy over N seeds and prints, per policy:
// win rate, the wave it usually breaks on, and the HP / bank curve by wave.
// A game is "broken" on the first wave that ends with the statue dead, or
// that never ends (the bot can't clear it in 4 minutes).
//
//   npm run balance            # 20 seeds per policy
//   npm run balance -- 50      # 50 seeds
//   npm run balance -- 20 digs # one policy

import { BRO, CUP, FINALS, LONGSHOT, STATUE, TOURIST } from '../src/config/game';
import { WAVES } from '../src/config/waves';
import { createState, step } from '../src/sim/sim';
import { Bot, POLICIES } from './bot';

const seeds = Number(process.argv[2] ?? 20);
const only = process.argv[3];
const waveTickCap = 60 * 240; // 4 minutes per wave, then we call it stuck

interface GameLog {
  seed: number;
  won: boolean;
  breakWave: number; // 1-based wave that killed it; WAVES.length + 1 if won
  hp: number[]; // statue HP at the end of each wave
  bank: number[]; // money at the end of each wave
  towers: number[]; // towers standing at the end of each wave
  lost: number; // groups that stormed out
  ticks: number;
  dmg: { bro: number; longshot: number; cup: number; finals: number }; // statue HP lost, by source
}

function play(policyName: string, seed: number): GameLog {
  const pol = POLICIES.find((p) => p.name === policyName)!;
  const s = createState({ seed, playerCount: 1 });
  const bot = new Bot(s, pol);
  const log: GameLog = { seed, won: false, breakWave: WAVES.length + 1, hp: [], bank: [], towers: [], lost: 0, ticks: 0, dmg: { bro: 0, longshot: 0, cup: 0, finals: 0 } };
  let lastWave = -1;
  let waveStart = 0;
  let lossPopups = 0;
  while (s.phase === 'playing') {
    const cupsBefore = s.cups.length;
    const hpBefore = s.statueHp;
    step(s, bot.commands());
    for (const b of s.bros) {
      if (b.phase !== 'pissing') continue;
      if (b.kind === 'bro') log.dmg.bro += BRO.pissPerTick;
      else if (b.kind === 'longshot') log.dmg.longshot += LONGSHOT.pissPerTick;
      else if (b.kind === 'finals') log.dmg.finals += FINALS.pissPerTick;
    }
    if (s.cups.length < cupsBefore && hpBefore - s.statueHp >= CUP.damage - 0.5) log.dmg.cup += CUP.damage;
    // Count storm-outs by their popup (one per group).
    lossPopups += s.popups.filter((p) => p.tick === s.tick - 1 && p.text === `-$${TOURIST.stormOutPenalty}`).length;
    if (s.wave.index !== lastWave) {
      lastWave = s.wave.index;
      waveStart = s.tick;
    }
    if (!s.wave.active && s.wave.index >= 0 && log.hp.length === s.wave.index) {
      log.hp.push(s.statueHp);
      log.bank.push(s.money);
      log.towers.push(s.towers.length);
    }
    if (s.wave.active && s.tick - waveStart > waveTickCap) break; // stuck
  }
  log.ticks = s.tick;
  log.lost = lossPopups;
  log.won = s.phase === 'won';
  if (!log.won) log.breakWave = s.wave.index + 1;
  return log;
}

const t0 = performance.now();
const names = only ? [only] : POLICIES.map((p) => p.name);
console.log(`${seeds} seeds x ${names.length} policies, ${WAVES.length} waves\n`);
for (const name of names) {
  const logs: GameLog[] = [];
  for (let i = 0; i < seeds; i++) logs.push(play(name, 2000 + i));
  const wins = logs.filter((l) => l.won).length;
  const breaks = logs.filter((l) => !l.won).map((l) => l.breakWave).sort((a, b) => a - b);
  const medBreak = breaks.length ? breaks[Math.floor(breaks.length / 2)] : null;
  const avg = (sel: (l: GameLog) => number[], w: number) => {
    const vals = logs.map((l) => sel(l)[w]).filter((v): v is number => v !== undefined);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  console.log(`== ${name}: win ${((wins / seeds) * 100).toFixed(0)}%${medBreak ? `, median break on wave ${medBreak}` : ''}, groups lost/game ${(logs.reduce((a, l) => a + l.lost, 0) / seeds).toFixed(1)}`);
  console.log('   wave  ' + WAVES.map((_, i) => String(i + 1).padStart(4)).join(''));
  console.log('   hp    ' + WAVES.map((_, i) => fmt(avg((l) => l.hp, i))).join(''));
  console.log('   bank  ' + WAVES.map((_, i) => fmt(avg((l) => l.bank, i))).join(''));
  console.log('   twrs  ' + WAVES.map((_, i) => fmt(avg((l) => l.towers, i))).join(''));
  console.log('   alive ' + WAVES.map((_, i) => String(logs.filter((l) => l.hp.length > i).length).padStart(4)).join(''));
  const d = logs.reduce((a, l) => ({ bro: a.bro + l.dmg.bro, longshot: a.longshot + l.dmg.longshot, cup: a.cup + l.dmg.cup, finals: a.finals + l.dmg.finals }), { bro: 0, longshot: 0, cup: 0, finals: 0 });
  console.log(`   damage/game: bros ${(d.bro / seeds).toFixed(0)}, longshots ${(d.longshot / seeds).toFixed(0)}, cups ${(d.cup / seeds).toFixed(0)}, finals ${(d.finals / seeds).toFixed(0)}`);
  console.log();
}
console.log(`${((performance.now() - t0) / 1000).toFixed(1)}s. Statue starts at ${STATUE.hp} HP.`);

function fmt(v: number | null): string {
  return (v === null ? '-' : String(Math.round(v))).padStart(4);
}
