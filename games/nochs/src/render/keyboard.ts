// Held keys -> Commands for one player. 1-4 pick a box, arrows/WASD pick the cell,
// J/X/Space drop, R racks the square. The key state itself is shared/src/keys.ts.

import { KeyState } from '@shared/keys';
import type { InputSource } from '@shared/loop';
import type { Command } from '../sim/types';

export class KeyboardInput implements InputSource<Command> {
  private keys: KeyState;

  constructor(private readonly playerId: number, target: Window = window) {
    this.keys = new KeyState(isGameKey, target);
  }

  onRenderKey(key: string, cb: () => void): void {
    this.keys.onRenderKey(key, cb);
  }

  commandsFor(tick: number): Command[] {
    const out: Command[] = [];
    const id = this.playerId;
    for (const k of this.keys.drainPressed()) {
      if (k >= '1' && k <= '4') out.push({ playerId: id, tick, type: 'selectBox', box: Number(k) - 1 });
      if (k === 'j' || k === 'x' || k === ' ' || k === 'enter') out.push({ playerId: id, tick, type: 'drop' });
      if (k === 'r') out.push({ playerId: id, tick, type: 'rack' });
      if (k === 'a' || k === 'arrowleft') out.push({ playerId: id, tick, type: 'moveCell', dx: -1, dy: 0 });
      if (k === 'd' || k === 'arrowright') out.push({ playerId: id, tick, type: 'moveCell', dx: 1, dy: 0 });
      if (k === 'w' || k === 'arrowup') out.push({ playerId: id, tick, type: 'moveCell', dx: 0, dy: -1 });
      if (k === 's' || k === 'arrowdown') out.push({ playerId: id, tick, type: 'moveCell', dx: 0, dy: 1 });
    }
    return out;
  }
}

function isGameKey(k: string): boolean {
  return k === 'w' || k === 'a' || k === 's' || k === 'd' || k.startsWith('arrow') || k === ' ' || k === 'enter' || k === 'j' || k === 'x' || k === 'r' || (k >= '1' && k <= '4');
}
