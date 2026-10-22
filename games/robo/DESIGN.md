# Robo (working title)

Source of truth for what the game is. Read it first, every session. Log every design decision at the bottom with a date and a one-line reason.

## Pitch (one paragraph)
A Mega Man 2 / Mega Man X-style action game set around Harvard Square. Five robot masters have taken over five landmarks; you pick a stage from an X-style map screen, run-and-gun through it, beat the boss, take its weapon. UFO 50 palette and chip audio, for consistency with the rest of the collection (at least to start). The hero is undecided (see Open).

## Pillars (if a feature doesn't serve one, it's v2)
1. Feel first. Jump, shoot, land, slide have to feel right before any stage exists. Nothing gets a pipeline until Owen has played the verb.
2. Every stage is a real place with a joke in it. The gimmick comes from the landmark (lab glass, a dining hall, a three-story Chinese restaurant, a taqueria, a dig pit), not from a generic theme.
3. Readable at 1x. Big silhouettes, strict palette, no noise pixels.

## Roster (stage, boss, map position)
- Science Center – Pipette Man
- Annenberg (Memorial Hall) – Chowder Man
- The Kong (three-story Chinese restaurant) – Rangoon Man
- Felipe's Taqueria – Refried Man
- The Dig (archaeological pit, directly in Harvard Yard) – Dig Man

## Stage select (built)
Mega Man X layout: a 5x5 metal grid; the middle 3x3 is a painted map of the Square (`art/gen_map.py` → `public/robo/map.png`), the ring holds boss portraits in frames, STAGE / MAP / SPEC panels with lamps, locked `??` slots, and the logo. The map is artistic, not geographic: general positioning between the landmarks, like the X mousepad map. The cursor moves between portraits (wedge + wrap), a marker shows the base on the map, J confirms, a READY blink then the stage starts.

## Core loop
- TBD after the feel room: pick a stage, platform-shoot to the boss, win the weapon.

## Player
- TBD (Open). Drives the portraits' adversary and the art style of the whole set.

## Enemies / obstacles
- TBD per stage.

## Win / loss
- TBD.

## Art spec
UFO 50 palette (shared/art/palette.py), 16px tiles, sprites as text grids in art/sprites (see shared/art/SPEC.md). Placeholders are colored rectangles with the final name and dimensions.
- Map bases: 48x40, ground shadow #000000 full row 38 + inset-4 row 39, two greys max, flat fill + one shade, frame 1 = 3–4 light pixels blink, ~10-color legends.
- Boss portraits: 48x48, frontal head-and-shoulders, light from the upper right, K outline, 8–12 colors, frame 1 is a blink that only touches the eyes. Each carries its signifier as a prop (ladle, bottle, bone, pipette, duck-sauce packet).
- Map: 168x168, painted; every pixel palette-checked by the generator.

## Build order (one system per session, each with a done-condition verified by playing)
1. Stage select. Done when: Owen can move between the five bosses and the map reads. (Done 2026-10-22.)
2. The feel room: a flat test stage with the hero's jump, shoot, land, slide/dash, hit-stun. Throwaway; no art pipeline. Done when: Owen says the verb feels right.
3. One stage (Science Center) as a greybox with one enemy type and Pipette Man.
4. Weapons, weakness order, the other four stages.
5. Art pass per stage; music and SFX; cover.

## Direction (Owen, 2026-10-22)
- Tone: serious. The bosses are robots (robot masters), not creatures or costumes. Each boss's BODY is the concept.
- Hero: campus dorm security.
- Bosses are full-body sprites, not portraits; the stage select shows the same sprite that stands in the boss room.
- Art reference: Vainger (UFO 50). Dark industrial metal, chunky forms, few saturated accents, selective outlines.
- Pipette Man: a plastic pipette body, standing vertical (bulb up, tip down), with robotics built around it to protect and support it. His head is the bulb, half filled, with expressive Mega Man-style eyes.

## Open
- The hero's verb (Mega Man 2 slide vs X dash/wall-kick) and what he shoots.
- The other four bosses' bodies (Owen's concept per boss, then five attempts each as with Pipette Man).

## Decisions log
- 2026-10-21: Stamped from games/_template. Reason: start of the game.
- 2026-10-21: Mega Man 2/X-style action game around Harvard Square with the UFO 50 aesthetic and audio. Reason: Owen wants the retro look and sound consistent across the collection, at least to start.
- 2026-10-21: Stage select first, X layout (map in the middle, portraits around it). Reason: Owen asked for a map players move between that shows the boss; closer to X than 2 "in UFO 50 terms".
- 2026-10-21: Map is artistic, not geographically accurate. Reason: Owen, with the X mousepad as the reference: "general positioning between these buildings on an artistic map".
- 2026-10-21: The Observatory is replaced by the Kong; the dig is in Harvard Yard itself. Reason: Owen's call.
- 2026-10-21: Boss names: Pipette Man, Chowder Man, Rangoon Man, Refried Man, Dig Man. Reason: Owen's concepts.
- 2026-10-22: The dig is painted into the map (no base sprite) as a 3/4-view hole with a derrick, ramp, planks and a tipping statue, after an art-director review called the boxed version "a target with a face in it". Reason: Owen: "it should be a big interesting hole in the ground".
- 2026-10-22: Map repaint per review: clustered grass instead of single flecks (the "ellipsis" noise), ribbon roads with shadows, river bank and railed bridge, three tree species hand-placed, jittered Common with obelisk, checkered plaza with T kiosk, base drop shadows, recessed-screen inset. Mass Ave moved south of the lowered pit and Garden St to the west edge so no road crosses a base; Quincy St and the Oxford St stub south of the Science Center removed. Reason: fewer, bolder landmarks read better at 168px; roads through building footprints looked like errors.
- 2026-10-22: STAGE panel names the place, MAP panel names the boss; locked slots are dark navy with an unpowered lamp. Reason: review; the boss name under the portrait side matches X.
- 2026-10-22: The five boss portraits are scrapped. Owen: "the bosses are awful. Archaeological dig, a crab?" They read as people in costumes holding props; a Mega Man boss's body is the concept. Reason: direction, not pixels.
- 2026-10-22: Boss art process: silhouette first at UFO 50 scale with <=7 colors, whole-sprite redraws (never row patches), five parallel attempts per boss from one written brief, Owen picks. Reason: three review passes on the old portraits did not converge; the text-grid-editing method was the problem.
- 2026-10-22: Pipette Man final direction picked over four rounds (horizontal concepts rejected: Owen meant vertical; vertical round: mech-harness body A; re-armor round: variant E, inverted-trapezoid pauldrons, wedge boots, cyan accent lines). Note from Owen on E: arms must not differ in size; the 3/4 turn is carried by shoulder offset only. Reason: Owen's picks.
- 2026-10-22: Boss sprites are symmetric by default, verified by script (left/right pixel audit below the head) before Owen sees them; any asymmetry must be listed as deliberate. Reason: Owen caught uneven arms twice after artists reported "one column"; eyeballing at this scale is not a check.
- 2026-10-22: Nothing gets a pipeline until Owen has played the verb (day-one throwaway prototypes). Reason: Noch's Rush was built full-pipeline and failed its playtest; the feel question has to be answered first.
