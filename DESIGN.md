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

## Enemies (v1: two)
- Bro. Paths gate -> statue. On reaching the statue: 1s wind-up, then a visible stream dealing statue damage per second until he's staggered or sober. Staggered: stumbles back, resumes. Never attacks the player or towers.
- Longshot Bro (from wave 3). Crimson shirt, about 1.6x a bro's speed, much less drunk (34). Shakes the whole way in. Stops on the first lane tile within 6.5 tiles of the statue (the bottoms of both inner loops are in range), winds up (0.7s), and arcs a stream over everything between him and the statue; the arc passes over the player. Slightly weaker stream than point-blank. Exists so the alleys and the last corridor aren't the only places that matter.
- Cup Chucker (from wave 5). Purple shirt, slow (0.5), drunk 50. Stops on the first lane tile within 12 tiles of the statue, which on the Yard map is two or three tiles in from any gate. Winds up 1.5s (shaking), lobs a full solo cup at the statue, reloads 5s, throws again until sobered. The cup floats in at 0.4 px/tick (about a third of the player's run) with a shadow on the ground; the player kills it by standing at the shadow or shouting it out of the air. Towers ignore cups. A cup that lands does 15 statue HP. He is the enemy you have to leave the statue to deal with.
- Finals Club Member (from wave 8, occasional: 1 on waves 8/10/11/12, 2 on 13-14, 3 on 15). Tuxedo, champagne flute, speed 1.0 (nearly the player's), drunk 160, heavy stream (9/s). Walks all the way in like a bro; arrives mid-wave when the lane is already busy. The late-game "drop everything" bro.
- Bounties: sobering any bro pays $1. Small next to a group so the group is still the thing you drop everything for.

## Tourists
- Travel in groups of 3-5 behind a guide, huddled half a tile apart. Groups spawn in every wave, interleaved with bros, at the gate farthest from the nearest player: a new group is never where you already are.
- Every group wants somewhere: the statue (about 45% of groups, $10 a head) or one of the named buildings ($7 a head). The guide's label reads `$N NAME` (JOHN for the statue; MASS, HARVARD, WELD, THAYER for buildings). Buildings carry nameplates on the map and a small marker on their photo spot, the lane tile nearest the building. A group is worth its value from the moment it enters. The guide walks a few tiles in (6 in v1) and stops, confused; from then the value ticks down to $0 over 7 seconds, whatever the group size.
- Brochure: a player within touching distance of the GUIDE hands it over for the whole group and LOCKS the value. No button. (Standing next to a huddle usually counts; the guide is in front.)
- Pamphleted: the destination's name pops on its photo spot; the guide leads the group there; on arrival the group pays the locked value ("+$N" pops), poses for photos for a couple of seconds (flashes), then leaves by the nearest exit.
- At $0 the group storms out the way it came, and "-$10" pops: a flat penalty, bank floors at zero.
- The shout spooks: every tick a guide is in the cone knocks $0.50 off an unlocked group (30/s). This is the ONLY way the player loses tourist money by action; towers never touch tourists.
- Sprinklers soak tourists: a soaked tourist walks at 60% for a moment. Nothing worse.
- Look (approved 2026-10-16): short and loaded against the bros' tall and slim. Crimson hats and a crimson flag on every group (Harvard tour groups); shirts in orange, yellow or purple per group (cyan, magenta and green were cut for colliding with the bro's shirts and the grass). Followers snap photos with a flash while the group is stopped. Rule: bros tall, tourists short.

## Towers (v1: two, one in-place upgrade each)
- Archaeology Dig ($30). A student in a pit lobbing bones. Single target, nearest bro within 3 tiles, a bone every 0.75s sobering 18. Never targets tourists. Upgrade ($40): longer range, faster, harder.
- Sprinkler ($20). Area, 1.6 tiles. Bros inside slow and sober slowly (8/s). Tourists inside get wet and walk slower for a moment; no other cost. Upgrade ($25): wider, wetter.
- Range rings are always visible, and the tile under the player shows a build cursor with the Dig's range previewed.
- Placement: walk to a grass tile, press 1 (Dig) or 2 (Sprinkler). U upgrades the tower you're standing on. Anytime, mid-wave included. No selling, no moving. Towers have no HP and don't block the player.
- Self-upgrades, same money: 3 shout strength, 4 shout range, 5 move speed; three levels each at $25/$40/$60.
- Adjacency: a tower next to the Tour Guide tile (fixed map feature) gets a buff. (Not yet implemented; the tile exists.)
- Pamphleted tourists routing around rings: not yet implemented; they take the shortest path.

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
5. Towers. DONE 2026-10-16: walk-to-place, Dig and Sprinkler firing nearest-first, friendly fire, in-place upgrades, self-upgrades, shop in the HUD usable anytime. Owen verifies: survive 5 waves.
6. Waves and sim. Wave config, headless runner, win screen. Done: beat the level; sim reports win rate.

## v2 list (not before M3)
Sorority wave (fast, erratic). Tour groups that clog lanes. Tour Guide as a placeable tower. Day/night dial with lantern vignette. Second map. Endless mode. Gamepad. Online co-op. Final player character.

## Open questions
- Tourist payout vs tower cost vs self-upgrade cost: sim decides.
- Death-spiral check: does losing tourists early make the level unwinnable?
- Wave count: 15 provisionally; match whatever Rock On!'s early levels do.

## Playtest log
- 2026-10-16, Owen, 7 waves with towers: fun; towers worked; lost a tourist to his own Dig and it felt like the game's fault; never truly lost; never had to choose between a guide and a bro because missing a tourist cost nothing. Led to: towers neutral, countdown dollars, and the balance pass next.

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
- 2026-10-16: Sprinkler 'scatter' is implemented as soaking: 1.5s in range and a tourist leaves the group. Reason: tourists are on rails, so pushing them is meaningless; a timer is readable and tunable. (Superseded the same evening: towers neutral.)
- 2026-10-16 (evening): Towers never hurt tourists; only the player's shout can. Reason: Owen's playtest; a tower picking a tourist felt like the game's fault, a shout that spooks a group is the player's own call. Superseded 'towers hurt tourists'.
- 2026-10-16 (evening): A group's value ($10/head) ticks down over 7s while the guide is confused, locks on the brochure, pays at the foot, and storms out at $0 for a flat -$10. Replaces the patience bar and the question mark. Reason: Owen's idea; one visible number is the timer, the reward and the penalty, and a missed group finally costs something.
- 2026-10-16 (evening): The shout spooks guides for dollars, not seconds. Reason: same currency everywhere.
- 2026-10-16 (evening): Tourist groups spawn at the gate farthest from the nearest player; bros stay random. Reason: the guide-or-bro choice only exists if the group is somewhere else.
- 2026-10-16 (evening): Destinations. Groups want the statue or a named building; names over the guide and nameplates on the map, no icons and no clicking. Buildings pay less than the statue. Reason: spreads tourist traffic across the Yard and makes the map read as Harvard; words read at 7px where 8px building icons would not; a click would be the game's first mouse input. In v1 the destination changes where and when money lands, not what the player does; mechanics on destinations are a later lever.
- 2026-10-16 (evening): Longshot Bro added as the second enemy (Owen's call: faster, slightly different look, fires at range with an arc the player passes under, shakes because he has to go). Reason: ranged pressure moves the fight off the last corridor; the shake and the arc are the comedy.
- 2026-10-16 (evening): Followers huddle half a tile apart. Reason: with towers neutral the spacing is cosmetic, and a clump reads better than a conga line.
- 2026-10-16: Towers don't block the player and the shop is key-driven (1/2/U/3/4/5), no menu. Reason: Rock On! pacing; a menu would stop the action.
- 2026-10-16: Tourists travel in groups of 3-5 behind a guide; the timer and the brochure belong to the guide. Reason: a clump vs a lone figure is the strongest possible read against bros, and one hand-off per group keeps it from being five chores.
- 2026-10-16: Tour-group identity (caps, flag, loud colors), not nationality, is the tourist variety axis. Reason: avoids a parade of stereotypes; reads just as well at 1x.
- 2026-10-16: The shout slows walking bros (40%) rather than stopping them; drunkenness cut from 100 to 60 to match. Reason: a stop made the shout a wall; a slow keeps the lane moving and towers relevant.
- 2026-10-16: A bro adjacent to the statue from any side can piss; the two tiles above the foot and the two alleys are all valid. Reason: flanking is what makes the alleys matter.
- 2026-10-16: Paths are asphalt grey with a navy rim where they meet grass, not yellow. Reason: Owen's photos of the Yard; the rim is what makes a path read as one surface instead of tiles.
- 2026-10-16: Tile dots stay off the outer pixel of a tile; grass and path get 4 variants picked by hash. Reason: edge dots and a regular pick formed visible seams.
- 2026-10-16: Walk "sway" frames no longer shear the torso 1px off the legs; the bob stays. Reason: at 1x it read as a broken waist.
- 2026-10-16 (evening): Cup Chucker added as the third enemy (Owen's call: super long range, slow-motion solo cup the player can chase down; huge damage if it lands). Reason: a threat the player must leave the statue for, and a cup to run under is a chase the towers can't do for you.
- 2026-10-16 (evening): Kill bounties, $1 flat (Owen: "each kill is $1 max"). Owen wanted each takeout to net a small amount. Kept well under a group's value so the choose-the-guide tension survives; the balance sim will say if it doesn't.
- 2026-10-16 (evening): Gates are brick posts, iron bars and cobbles (oriented per map edge), cobbles on the first lane tile in. Owen loathed the two-line gate. Reason: a gate is a place you watch; it needs to look like one.
- 2026-10-16 (evening): Enemy silhouettes must differ, not just colors. Longshot holds a beer funnel up at head height; Chucker is a fat waddler (speed 0.4) cradling a big cup. Reason: Owen must anticipate a kind from across the map.
- 2026-10-16 (evening): art/build.py refuses a 16x24 body whose walk frames shift the legs off the torso. Reason: the 1px sway shear shipped twice.
- 2026-10-16 (night): Balance harness (`npm run balance`): scripted bot policies (idle, shout-only, digs, digs+self, sprinklers) over N seeds, reporting HP/bank/towers per wave and statue damage by source. Reason: Owen won his first full game with $733 banked; the sim shows HP flat from wave 7 on, so waves 8-15 were a victory lap.
- 2026-10-16 (night): Bros spawn 6% drunker per wave (`DRUNK_PER_WAVE`), all kinds. Reason: a defense that solves wave 7 must not solve wave 15; with this the bot's HP curve slopes all the way down and the dumb bot wins 5-40% instead of 60%. Owen to confirm by play.
- 2026-10-16 (night): Owen's tuning pass after a game on the 6%/wave curve: chuckers immune to towers (player-only kill), chucker drunk 50 -> 58, cup 10% faster (0.44), longshot wind-up 40 -> 60 ticks so there's time to reach him, bros 10% faster (0.66). Bot (digs+self) now breaks on wave 10 with 0% wins; cups are its top damage source.
- 2026-10-16 (night): Outlines only where height changes. Grass sits a step above the path (UFO 50 reference): a dark-green scalloped grass lip spills over the path edge, with a shadow row under the north lip. No black lines between level surfaces.
- 2026-10-16 (night): Finals Club Member added (Owen: mega tough, fast, tuxedo, wave 8+). Reason: the late waves needed a single enemy that a tower line can't absorb on its own.
- 2026-10-16 (night): Rule for all character art: a lean or stagger is drawn with the head offset and props, never by shifting the torso off the legs. The build guard now checks every frame, not just the walk cycle.
