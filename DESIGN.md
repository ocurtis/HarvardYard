# Yard Defense (working title)

One-liner: A top-down pixel-art action tower defense where you defend the John Harvard statue from drunk frat bros while herding tourists to its foot to fund your defenses.

Working model: Rock On! Island (UFO 50). Copy its scale, pacing, active player, chokepoint placement, and single economy. Replace the chicken farm with tourists.

Audience: current students, friends, alums. Insider references welcome. Piss is visible.

## Pillars (if a feature doesn't serve one, it's v2)
1. You are on the field. The player herds and disciplines; towers do the heavy lifting; neither works alone.
2. One economy, real tradeoffs. Tourists delivered to the foot are the only income. It buys towers, tower upgrades, or your own upgrades.
3. Built for 1-4 from the first commit. Solo ships first; the architecture never assumes one player.
4. Small and tuned. Few things, each one different, every number simulated.

## Core loop (one level)
Every wave mixes tourists and bros from the same two gates. Tourists wander; pamphleted tourists walk to the foot and pay. Bros walk to the statue and piss on it. You can build, upgrade towers, or upgrade yourself at any time, mid-wave included. Waves never auto-start; you call the next one. Statue HP hits zero: loss. Clear the last wave: win.

Verified against Rock On! Island (Owen, 2026-10-16): mid-wave building and upgrading allowed; waves wait for the player.

## Player
Placeholder identity: "a student." Final character undecided (candidates considered: ghost of John Harvard, proctor, tour guide, Yard squirrel). Nothing below depends on it.

One tile (16px). Free movement, Rock On! style. Bros ignore the player; no player HP.

Two verbs, both in the facing direction:
- Pamphlet. Walk into a tourist to hand it over. They then self-path to the foot, routing around tower range rings when a safe route exists; if none exists, they walk through and take the hit.
- Shout. Short cone (~2 tiles, 80 degrees), hold-to-use, no resource. Disciplines bros: lowers their drunkenness (24/s), interrupts a piss or a wind-up for half a second, and slows a walker to 40% while he's in the cone. Walkers never stop. Does not scare them off; an interrupted bro starts his wind-up over. Less effective than towers, upgradable. Keys: J, X or Shift.

Upgrades: bought with the same currency as towers (Rock On! style). Shout strength, shout range, move speed.

## The HP model: drunkenness
A bro's health bar is his drunkenness. Everything that "hurts" him sobers him up: your shout, a bone to the head, a sprinkler soak. At zero he sobers up, gets embarrassed, and walks off the map. No corpses.

## Enemies (v1: one)
- Bro. Paths gate -> statue. On reaching the statue: 1s wind-up, then a visible stream dealing statue damage per second until he's staggered or sober. Staggered: stumbles back, resumes. Never attacks the player or towers.

## Tourists
- Travel in groups of 3-5 with one guide. Groups spawn from random gates in every wave, interleaved with bros. Followers trail the guide's path a tile apart.
- The guide walks a few tiles in (6 in v1), then stops, confused, with a visible patience timer (7s). Followers bunch up behind.
- Brochure: a player within touching distance of the GUIDE hands it over for the whole group; touching a follower does nothing. No button.
- Pamphleted: the guide leads the group to the foot; on arrival the group pays a flat amount per member still with it, then leaves by the nearest exit. (Routing around tower rings: session 5.)
- Timer runs out: the guide leads them back out the way they came. No payout.
- Towers do not discriminate (session 5): a bone-struck tourist is hauled off, reducing the group's payout; a sprinkled group scatters.
- Look: loaded and loud (backpacks, hats, cameras, saturated colors) against the bros' empty-handed pastels; the group silhouette is the main differentiator. Tour-group identity (matching caps, the guide's flag) not nationality.

## Towers (v1: two, one in-place upgrade each)
- Archaeology Dig. A student in a pit lobbing bones. Single target, nearest-first, medium range. Hits tourists too. Range ring always visible. (The Harvard Yard archaeology dig is real; also the Rock On! bone nod.)
- Sprinkler. Area slow plus small sobering. Scatters tourists. Cheap.
- Placement: walk to the spot, press build. On grass only, not on paths. No selling, no moving. Towers have no HP.
- Adjacency: a tower next to the Tour Guide tile (fixed map feature) gets a buff. Tests the idea without a third tower.

## Map
One map, 24x18, Owen's draft of 2026-10-16: the statue at the bottom in front of University Hall, three spawn gates (top, left, right) that bros and tourists share, two bottom exits where only tourists leave. A one-tile-wide network: the top gate's route snakes down through the right-hand inner loop (46 tiles) because the row-3 path has gaps; the side gates reach the statue in ~22 tiles via the outer columns. The left-hand loop is currently bypassed by the left column and sees no traffic. The final approach runs over the foot; alleys either side of the statue let bros flank it. Whole map fits on one screen; no camera. Map lives in `src/config/maps/yard.ts` as a 24x18 text block; draw it in `public/mapeditor.html`. Routes should wind: Rock On!'s long routes are 40-60 tiles; under 25 is a straight shot.

Bros and tourists walk only on path tiles; the player walks anywhere not blocked; towers go on grass. (Pathing: session 2.)

## Win / loss
Statue HP 100, no regen. Loss on zero. Win on clearing the last wave. Score = statue HP remaining + unspent currency.

## Architecture (non-negotiable; this is what makes online cheap later)
- `sim/` is pure TypeScript. No Phaser, no DOM, no timers. Fixed 60Hz tick. Seeded RNG.
- Input enters only as `Command { playerId, tick, type, payload }`. Keyboard produces commands locally; a relay will produce them later.
- `GameState` is plain data, serializable to JSON. Snapshot and restore must round-trip.
- `render/` (Phaser 3) reads state and draws it. It never mutates state.
- `playerCount` is a config value. Wave composition, statue HP, and payout rates read it.
- All tuning lives in `config/*.ts`. No magic numbers in sim code.
- `scripts/sim.ts` runs N headless games with a scripted policy and reports win rate by wave.
- Co-op: shared screen, shared currency. (Online: v2.)

## Art spec
UFO 50 look: their shared 32-color palette (`art/palette.py`, `src/config/palette.ts`), 16px tiles, chunky shapes, selective dark outlines, no anti-aliasing. Logical resolution 416x288 (2-tile HUD column on the left + a 24x18 map), nearest-neighbor integer scaling (3x = 1248x864). This trades UFO 50's 16:9 for a 4:3 NES shape so the map can be tall enough for winding routes. Every sprite ships with anchor point and frame count. Placeholders are colored rectangles with final names and dimensions; finals swap one-to-one. `art/sprites.py` holds sprites as pixel grids; `public/mapeditor.html` is the map tool.

Characters are 16x24 (anchored bottom-center, overhanging the tile above); crowd characters are built from parts (one body, several heads, shirt swaps) so a crowd isn't clones. The bro is the golden sprite (approved 2026-10-16, art/bro_golden_sheet.png). Priority order for the rest: tourist, player, statue, dig, sprinkler, ground tiles, HUD.

## Stack
TypeScript, Vite, Phaser 3, Vitest (sim tests). GitHub repo, Cloudflare Pages deploy from main. itch.io page at ship.

## Milestones
- M0 Rectangles: the week-1 build order, placeholder art, no sound. Gate: Owen plays 10 times and wants an 11th.
- M1 Slice: final art for statue, bro, player; HUD implemented; tuned to a 40% first-try win rate in the sim. Gate: two people play cold and understand it.
- M2 Juice: sound, piss VFX, hit feedback, sober-up animation. Gate: it's funny on a 30s gif.
- M3 Ship: itch page, bug pass. Gate: a stranger finishes a game.
- Then: local co-op (2-4 on one screen), then online via relay + lockstep.

## Week-1 build order (one session each, done-condition verified by playing)
1. Scaffold. Sim/render split, tick loop, tile map from a text file, player rectangle moves. Done: walk the Yard at 60fps.
2. Bros. Spawn at gates, path to the statue (flow field), wind-up, stream, statue HP, loss screen. Done: lose a game.
3. Shout. Cone, sobering, stagger, interrupt. Done: clear a wave with the shout alone.
4. Tourists and pamphlets. Wander/leave, touch to pamphlet, self-path with ring avoidance, payout at the foot. Done: earn money.
5. Towers. Walk-to-place, Dig and Sprinkler firing nearest-first, friendly fire, in-place upgrades, a build/upgrade menu usable anytime including self-upgrades, a "next wave" button. Done: survive 5 waves.
6. Waves and sim. Wave config, headless runner, win screen. Done: beat the level; sim reports win rate.

## v2 list (not before M3)
Longshot Bro (ranged pisser). Sorority wave (fast, erratic). Tour groups that clog lanes. Tour Guide as a placeable tower. Day/night dial with lantern vignette. Second map. Endless mode. Gamepad. Online co-op. Final player character.

## Open questions
- Tourist payout vs tower cost vs self-upgrade cost: sim decides.
- Death-spiral check: does losing tourists early make the level unwinnable?
- Wave count: 15 provisionally; match whatever Rock On!'s early levels do.

## Decisions log
- 2026-10-16: Solo first, online later, but sim/render split, command input, and serializable state from commit one. Reason: online is a relay later instead of a rewrite.
- 2026-10-16: 2 towers, 1 enemy, 1 level. Reason: get a finished game in weeks.
- 2026-10-16: Single economy (currency buys towers or self), per Rock On!. Reason: one real tradeoff; dropped the XP second track.
- 2026-10-16: Tourists pay on reaching the foot; pamphlet is the herding verb. Reason: no harvest clicking.
- 2026-10-16: Towers hurt tourists, nearest-first. Reason: placement is the central tension.
- 2026-10-16: No day/night. Reason: closer to Rock On!; mixed waves carry the conflict.
- 2026-10-16: Drunkenness as HP; sobering as the kill. Reason: one bar, no violence to explain, piss is what a drunk does in range.
- 2026-10-16: Shout disciplines, doesn't scare. Reason: a fleeing bro resets the lane and leaves tower range; a staggered one stays in the kill zone.
- 2026-10-16: Archaeology Dig as tower 1. Reason: real Yard thing, Rock On! bone nod.
- 2026-10-16: Player identity deferred. Reason: nothing mechanical depends on it yet.
- 2026-10-16: Grid is 24x18 with a left HUD column (416x288 logical, 4:3). Reason: room for winding routes; HUD on the left matches Rock On!.
- 2026-10-16: Map is the real Old Yard rotated (statue at bottom), simplified to three routes. Reason: the real network has too many intersections to defend; Rock On! has one route, this gets one more than that plus a merge. (Superseded the same day by Owen's perimeter-and-loops draft.)
- 2026-10-16: Bros and tourists walk lane tiles only (path, foot, gate, exit, guide), 4-connected, via a BFS flow field from statue-adjacent lane tiles. Reason: Rock On! enemies are on rails; it keeps placement readable and the sim cheap.
- 2026-10-16: Gates spawn both bros and tourists; exit tiles are tourist-only. Reason: Owen's map has four bottom openings that read as ways out, not in.
- 2026-10-16: The shout is hold-to-use with no cooldown or resource. Reason: Rock On! throws bones on a cooldown; a sustained cone instead keeps the player standing in the lane, which is where towers can't be. Revisit if it makes the player a turret.
- 2026-10-16: Art is produced by a panel: parallel artist agents with distinct briefs, an art-director agent's critique, Owen's pick. Sprites are text grids compiled by art/build.py; characters are 16x24 with a parts system for variants. Reason: the panel's first run (the bro) beat a single draft; parts solve crowd sameness in the pipeline instead of by hand.
- 2026-10-16: Tourists walk in a few tiles and stop confused on a timer; a touch hands them the brochure. Reason: Owen's call; makes each tourist a race the player can see, instead of herding. Replaces the earlier wander-and-leave idea.
- 2026-10-16: Tourists travel in groups of 3-5 behind a guide; the timer and the brochure belong to the guide. Reason: a clump vs a lone figure is the strongest possible read against bros, and one hand-off per group keeps it from being five chores.
- 2026-10-16: Tour-group identity (caps, flag, loud colors), not nationality, is the tourist variety axis. Reason: avoids a parade of stereotypes; reads just as well at 1x.
- 2026-10-16: The shout slows walking bros (40%) rather than stopping them; drunkenness cut from 100 to 60 to match. Reason: a stop made the shout a wall; a slow keeps the lane moving and towers relevant.
- 2026-10-16: A bro adjacent to the statue from any side can piss; the two tiles above the foot and the two alleys are all valid. Reason: flanking is what makes the alleys matter.
