# Gahd The Yahd and friends

A collection of small UFO 50-style browser games behind one cart-select menu. Live: https://ocurtis.github.io/HarvardYard/

- `games/yard/` Gahd The Yahd: defend the John Harvard statue from drunk frat bros; tourists are the money. See its `DESIGN.md`.
- `games/_template/` what a new game starts from: `npm run new-game -- <slug> "<Title>"`.
- `shared/` the fixed-step loop, input, atlas/font loading, music/sfx layers, palette, sprite compiler, chip synth, voice crusher.

```
npm install
npm run dev          # menu at /, a game at /games/<slug>/play.html?seed=123
npm test             # every game's sim tests
npm run build        # dist/, which GitHub Pages deploys on push to main
npm run art yard     # compile a game's text-grid sprites to public/<slug>/sprites
```

Rules for working here are in `CLAUDE.md`.
