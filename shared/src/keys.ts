// Keyboard state, shared by every game. Tracks held keys and edge-triggered
// presses; a game's own keyboard.ts turns those into its Command type. This is
// the only place keyboard state exists; no sim ever sees keys.

export class KeyState {
  readonly held = new Set<string>();
  // Edge-triggered keys: queued on keydown, drained once per tick by the game.
  private pressed: string[] = [];
  // Render-only keys (mute, etc.): they never become Commands and never reach the sim.
  private renderKeys = new Map<string, () => void>();

  constructor(private readonly isGameKey: (key: string) => boolean, target: Window = window) {
    target.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!e.repeat && !this.held.has(k)) {
        this.pressed.push(k);
        this.renderKeys.get(k)?.();
      }
      this.held.add(k);
      if (isGameKey(k)) e.preventDefault();
    });
    target.addEventListener('keyup', (e) => this.held.delete(e.key.toLowerCase()));
    target.addEventListener('blur', () => this.held.clear());
  }

  // Register a key the renderer handles itself (lowercase). Fires once per press.
  onRenderKey(key: string, cb: () => void): void {
    this.renderKeys.set(key.toLowerCase(), cb);
  }

  // The presses since the last drain, oldest first.
  drainPressed(): string[] {
    const out = this.pressed;
    this.pressed = [];
    return out;
  }

  // -1/0/1 per axis from WASD or arrows; opposite keys cancel.
  axes(): { dx: -1 | 0 | 1; dy: -1 | 0 | 1 } {
    const h = this.held;
    let dx: -1 | 0 | 1 = 0;
    let dy: -1 | 0 | 1 = 0;
    if (h.has('a') || h.has('arrowleft')) dx = -1;
    if (h.has('d') || h.has('arrowright')) dx = dx === -1 ? 0 : 1;
    if (h.has('w') || h.has('arrowup')) dy = -1;
    if (h.has('s') || h.has('arrowdown')) dy = dy === -1 ? 0 : 1;
    return { dx, dy };
  }
}
