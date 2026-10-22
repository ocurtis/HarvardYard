# Robo boss art: how it gets made (read before drawing any boss)

What was learned making Pipette Man (2026-10-22, four rounds, then a day of pixel fixes). Follow it; don't rediscover it.

## Direction (Owen)
- Serious tone. Robot masters: machines whose BODY is the concept, never a person in a costume holding a prop.
- Full-body sprites, 48x48 max, same sprite in the stage-select frame and the boss room.
- UFO 50 palette only (shared/art/palette.py), max 7 colors including black.
- Reference: Vainger. Faceted dark metal (#202040 body, #707070 lit faces, #c8c8c8 light edge), one accent color as thin lines (<4% of pixels).
- Big expressive Mega Man eyes where the design has a face: white eyes, dark pupils, angled brows.
- Owen briefs the body in one sentence (e.g. "a plastic pipette, vertical, robotics built around it to protect and support it; the head is the bulb, half full"). Don't start without that sentence.

## Rounds
1. Concept: five artists, one written brief, each a different answer to "what are the robotics". Owen picks a body.
2. Armor/finish: five variants on the pick. Owen picks one.
3. Fixes: direct edits by script on the chosen grid. No more agents for pixel polish; they cannot see at this scale.

## Rules every sprite must satisfy (the brief text, verbatim)
- Silhouette first: draw the filled black silhouette, render at 8x, look; it must read as one idea with no interior detail.
- Outline EVERY separate part, including where parts overlap (glass against metal, arm against torso). The old rule "outline only against the background" produced green-against-navy gaps. Dropped.
- Flat fills plus one shade per plate; light from the top-left on every plate. No dithering.
- Symmetric by default: arms, pauldrons, legs, boots mirror exactly. Any asymmetry is listed as deliberate in the report. The 3/4 turn is carried by the eyes and a one-row shoulder offset, nothing else.
- Physical sense: liquid sits at the bottom, so a half-full head means a full tube; a pipette tube has mL graduation marks.
- Whole-sprite redraws from a generator script, never row patches.

## Mechanical checks before anyone shows Owen a sprite
Run `python3 games/robo/scripts/sprite_audit.py games/robo/art/sprites/boss_<id>.txt`. It reports: palette violations, color count, left/right asymmetric pixels below the head (must be 0 unless listed), isolated stray pixels, and rows where a part's edge is not outlined. Artists' claims ("one column narrower") are not accepted; the audit is.

## What did not work
- Portraits (48x48 heads with 10-12 colors): mud. Scrapped.
- Reviews by a second agent of the same grid: they agreed with each other and missed what Owen saw in seconds.
- Any check done by looking at the render instead of counting pixels.
