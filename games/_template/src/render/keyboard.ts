// Held keys -> Commands for one player. The key state itself is shared/src/keys.ts.

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
    for (const k of this.keys.drainPressed()) {
      if (k === 'j' || k === 'x' || k === ' ' || k === 'enter') out.push({ playerId: this.playerId, tick, type: 'action' });
    }
    const { dx, dy } = this.keys.axes();
    if (dx !== 0 || dy !== 0) out.push({ playerId: this.playerId, tick, type: 'move', dx, dy });
    return out;
  }
}

function isGameKey(k: string): boolean {
  return k === 'w' || k === 'a' || k === 's' || k === 'd' || k.startsWith('arrow') || k === ' ' || k === 'enter' || k === 'j' || k === 'x';
}
