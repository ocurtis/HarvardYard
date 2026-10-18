// Turns held keys into Commands for one player. WASD or arrows to move, J/X/Shift
// to preach, number keys to shop. The key state itself lives in shared/src/keys.ts.

import type { InputSource } from '@shared/loop';
import { KeyState } from '@shared/keys';
import type { Command } from '../sim/types';

export class KeyboardInput implements InputSource<Command> {
  private keys: KeyState;

  constructor(private readonly playerId: number, target: Window = window) {
    this.keys = new KeyState(isGameKey, target);
  }

  // Register a key the renderer handles itself (lowercase). Fires once per press.
  onRenderKey(key: string, cb: () => void): void {
    this.keys.onRenderKey(key, cb);
  }

  commandsFor(tick: number): Command[] {
    const out: Command[] = [];
    for (const k of this.keys.drainPressed()) {
      if (k === ' ' || k === 'enter') out.push({ playerId: this.playerId, tick, type: 'startWave' });
      if (k === '1') out.push({ playerId: this.playerId, tick, type: 'build', kind: 'dig' });
      if (k === '2') out.push({ playerId: this.playerId, tick, type: 'build', kind: 'sprinkler' });
      if (k === '3') out.push({ playerId: this.playerId, tick, type: 'build', kind: 'amp' });
      if (k === 'u') out.push({ playerId: this.playerId, tick, type: 'upgradeTower' });
      if (k === '4') out.push({ playerId: this.playerId, tick, type: 'upgradeSelf', stat: 'shout' });
      if (k === '5') out.push({ playerId: this.playerId, tick, type: 'upgradeSelf', stat: 'range' });
      if (k === '6') out.push({ playerId: this.playerId, tick, type: 'upgradeSelf', stat: 'speed' });
    }
    const h = this.keys.held;
    if (h.has('j') || h.has('x') || h.has('shift')) out.push({ playerId: this.playerId, tick, type: 'shout' });
    const { dx, dy } = this.keys.axes();
    if (dx !== 0 || dy !== 0) out.push({ playerId: this.playerId, tick, type: 'move', dx, dy });
    return out;
  }
}

function isGameKey(k: string): boolean {
  return k === 'w' || k === 'a' || k === 's' || k === 'd' || k.startsWith('arrow') || k === ' ' || k === 'enter' || k === 'j' || k === 'x';
}
