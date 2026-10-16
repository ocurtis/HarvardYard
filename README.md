# Yard Defense

Defend the John Harvard statue from drunk frat bros. Herd tourists to its foot to pay for it.

A top-down pixel-art action tower defense in the browser, modeled on Rock On! Island from UFO 50. See `DESIGN.md`.

## Run it

```
npm install
npm run dev
```

Open the URL Vite prints. WASD or arrows to move. `?players=2` for a second (keyboard-less, for now) player, `?seed=123` for a fixed seed.

## Test it

```
npm test        # sim tests: determinism, snapshot round-trip, movement
npm run sim     # headless runner, no browser
```

## Ship it

```
npm run build   # -> dist/
```

Cloudflare Pages: build command `npm run build`, output directory `dist`.
