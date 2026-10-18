# Working rules for this repo

This repo is a collection of small UFO 50-style browser games with one cart-select menu (`index.html`). Each game lives in `games/<slug>/`; what every game shares lives in `shared/` and `tools/`.

Read the game's `games/<slug>/DESIGN.md` first, every session. It is the source of truth for what that game is. If a request contradicts it, say so and update the doc (and its decisions log) before coding.

## Layout
- `games/<slug>/` one game: `src/{config,sim,render}`, `art/` (text-grid sprites, audio scripts, voice takes), `tests/`, `scripts/`, `DESIGN.md`, `play.html` (the game), `index.html` (its manual).
- `games/_template/` the stamp for a new game. `npm run new-game -- <slug> "<Title>"` copies it, then add the game to `GAMES` in `index.html`.
- `shared/src/` the fixed-step `GameLoop`, `KeyState`, atlas/font loading, `Music`/`Sfx` layers, `rng`, the UFO 50 palette. Imported as `@shared/...`. A game configures these; it never copies them.
- `shared/art/` the sprite compiler (`build.py <slug>`), palette, font, chip synth, voice crusher. `tools/` the voice booth and the stamp script.
- `public/<slug>/` a game's built assets (sprites, audio); `public/shared/` the font; `public/covers/` cart covers for the menu.

## Architecture (non-negotiable, every game)
- `src/sim/` is pure TypeScript: no Phaser, no DOM, no timers, no `Date`. It advances only through `step(state, commands)` on a fixed 60Hz tick.
- All input enters the sim as `Command` objects tagged with `playerId` and `tick`. Keyboard lives in `src/render/keyboard.ts` (on top of `@shared/keys`) and nowhere else.
- `GameState` is plain data. `serialize` -> `restore` must round-trip exactly, and a restored state must continue identically. Each game's `tests/sim.test.ts` checks this; keep it passing.
- `src/render/` reads state and draws. It never mutates state.
- Randomness goes through `@shared/rng` and its state lives on `GameState.rng`. Never `Math.random()` in the sim.
- Every tunable number lives in `src/config/`. No magic numbers in sim code.
- `playerCount` is a config value; nothing assumes one player.
- Every pixel comes from the UFO 50 palette (`shared/art/palette.py` / `@shared/palette`). HUD text is the shared bitmap font.

## Process
- One system per session, from the build order in the game's `DESIGN.md`. Each has a done-condition Owen verifies by playing.
- Placeholders are real assets: colored rectangles with the final name and dimensions. Don't draw art until the mechanic is proven.
- Before pushing: `npm test`, `npx tsc --noEmit`, `npm run build`, and a headless screenshot if rendering changed.
- Cold review before telling Owen a push is done: a separate agent that has not seen the work reads the diff (and the screenshot, if any) with no knowledge of the intent and reports problems. Art changes get a pixel-level review (art-director brief); sim changes get a correctness review. Fix what it finds, then report.
- Record every design decision in the game's `DESIGN.md` under the decisions log with a date and a one-line reason.
- Changes to `shared/` affect every game: run the whole test suite and build, and check the Yard still plays.

## Commands
- `npm run dev` local server with hot reload; games at `/games/<slug>/play.html?seed=123&players=2`, booth at `/booth.html?game=<slug>`
- `npm test` every game's sim tests
- `npm run build` production build to `dist/` (GitHub Pages deploys it on push to main)
- `npm run art <slug>` compile a game's sprites; `npm run font` the shared font
- `npm run new-game -- <slug> "<Title>"` stamp a game from the template
- Yard only: `npm run sim`, `npm run balance -- N [policy]`
