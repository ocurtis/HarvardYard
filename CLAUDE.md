# Working rules for this repo

Read `DESIGN.md` first, every session. It is the source of truth for what the game is. If a request contradicts it, say so and update the doc (and its decisions log) before coding.

## Architecture (non-negotiable)
- `src/sim/` is pure TypeScript: no Phaser, no DOM, no timers, no `Date`. It advances only through `step(state, commands)` on a fixed 60Hz tick.
- All input enters the sim as `Command` objects tagged with `playerId` and `tick`. Keyboard lives in `src/render/keyboard.ts` and nowhere else.
- `GameState` is plain data. `serialize` -> `restore` must round-trip exactly, and a restored state must continue identically. `tests/sim.test.ts` checks this; keep it passing.
- `src/render/` reads state and draws. It never mutates state.
- Randomness goes through `src/sim/rng.ts` and its state lives on `GameState.rng`. Never `Math.random()` in the sim.
- Every tunable number lives in `src/config/`. No magic numbers in sim code.
- `playerCount` is a config value; nothing assumes one player.

## Process
- One system per session, from the build order in `DESIGN.md`. Each has a done-condition Owen verifies by playing.
- Placeholders are real assets: colored rectangles with the final name and dimensions. Don't draw art until the mechanic is proven.
- Before pushing: `npm test`, `npx tsc --noEmit`, `npm run build`, and a headless screenshot if rendering changed.
- Record every design decision in `DESIGN.md` under the decisions log with a date and a one-line reason.

## Commands
- `npm run dev` local server with hot reload (`?seed=123&players=2` on the URL)
- `npm test` sim tests
- `npm run sim` headless runner
- `npm run build` production build to `dist/` (Cloudflare Pages: build command `npm run build`, output `dist`)
