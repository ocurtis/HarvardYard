// Turns held keys into move commands for one player. WASD or arrows.
// This is the only place keyboard state exists; the sim never sees keys.

import type { InputSource } from '../loop';
import type { Command } from '../sim/types';

export class KeyboardInput implements InputSource {
  private held = new Set<string>();
  // Edge-triggered keys: queued on keydown, emitted once on the next tick.
  private pressed: string[] = [];

  constructor(private readonly playerId: number, target: Window = window) {
    target.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!e.repeat && !this.held.has(k)) this.pressed.push(k);
      this.held.add(k);
      if (isGameKey(e.key)) e.preventDefault();
    });
    target.addEventListener('keyup', (e) => this.held.delete(e.key.toLowerCase()));
    target.addEventListener('blur', () => this.held.clear());
  }

  commandsFor(tick: number): Command[] {
    const out: Command[] = [];
    for (const k of this.pressed) {
      if (k === ' ' || k === 'enter') out.push({ playerId: this.playerId, tick, type: 'startWave' });
      if (k === '1') out.push({ playerId: this.playerId, tick, type: 'build', kind: 'dig' });
      if (k === '2') out.push({ playerId: this.playerId, tick, type: 'build', kind: 'sprinkler' });
      if (k === 'u') out.push({ playerId: this.playerId, tick, type: 'upgradeTower' });
      if (k === '3') out.push({ playerId: this.playerId, tick, type: 'upgradeSelf', stat: 'shout' });
      if (k === '4') out.push({ playerId: this.playerId, tick, type: 'upgradeSelf', stat: 'range' });
      if (k === '5') out.push({ playerId: this.playerId, tick, type: 'upgradeSelf', stat: 'speed' });
    }
    this.pressed = [];

    if (this.held.has('j') || this.held.has('x') || this.held.has('shift')) {
      out.push({ playerId: this.playerId, tick, type: 'shout' });
    }

    let dx: -1 | 0 | 1 = 0;
    let dy: -1 | 0 | 1 = 0;
    if (this.held.has('a') || this.held.has('arrowleft')) dx = -1;
    if (this.held.has('d') || this.held.has('arrowright')) dx = dx === -1 ? 0 : 1;
    if (this.held.has('w') || this.held.has('arrowup')) dy = -1;
    if (this.held.has('s') || this.held.has('arrowdown')) dy = dy === -1 ? 0 : 1;
    if (dx !== 0 || dy !== 0) out.push({ playerId: this.playerId, tick, type: 'move', dx, dy });
    return out;
  }
}

function isGameKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === 'w' || k === 'a' || k === 's' || k === 'd' || k.startsWith('arrow') || k === ' ' || k === 'enter' || k === 'j' || k === 'x';
}
