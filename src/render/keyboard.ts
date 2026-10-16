// Turns held keys into move commands for one player. WASD or arrows.
// This is the only place keyboard state exists; the sim never sees keys.

import type { InputSource } from '../loop';
import type { Command } from '../sim/types';

export class KeyboardInput implements InputSource {
  private held = new Set<string>();

  constructor(private readonly playerId: number, target: Window = window) {
    target.addEventListener('keydown', (e) => {
      this.held.add(e.key.toLowerCase());
      if (isGameKey(e.key)) e.preventDefault();
    });
    target.addEventListener('keyup', (e) => this.held.delete(e.key.toLowerCase()));
    target.addEventListener('blur', () => this.held.clear());
  }

  commandsFor(tick: number): Command[] {
    let dx: -1 | 0 | 1 = 0;
    let dy: -1 | 0 | 1 = 0;
    if (this.held.has('a') || this.held.has('arrowleft')) dx = -1;
    if (this.held.has('d') || this.held.has('arrowright')) dx = dx === -1 ? 0 : 1;
    if (this.held.has('w') || this.held.has('arrowup')) dy = -1;
    if (this.held.has('s') || this.held.has('arrowdown')) dy = dy === -1 ? 0 : 1;
    if (dx === 0 && dy === 0) return [];
    return [{ playerId: this.playerId, tick, type: 'move', dx, dy }];
  }
}

function isGameKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === 'w' || k === 'a' || k === 's' || k === 'd' || k.startsWith('arrow') || k === ' ';
}
