# Noch's Rush

Source of truth for what the game is. Read it first, every session. Log every design decision at the bottom with a date and a one-line reason.

## Pitch
You work the front counter at Pinocchio's in Harvard Square during a rush. The cutter behind you is slicing Sicilian sheets into squares and sliding them at you one after another; a row of open boxes on the counter each has a customer's order on it. Every square has to go somewhere now: into a box cell, or onto the day-old rack. Fill a box exactly the way the order pictures it and it closes clean, big tip, next. Get it wrong and the lid still closes on your mistake. Keep up through lunch rush and bar close without three strikes.

## Pillars (if a feature doesn't serve one, it's v2)
1. Packing, not matching. The verb is "put this square in that cell". Nothing blinks and disappears.
2. Clean is visible. A finished box either looks like the order or it doesn't, and the tip says so.
3. The rush is the enemy. Difficulty is the cutter's speed and the orders' fussiness, never a move limit.

## Core loop (one shift)
- Squares arrive on the conveyor at the cutter's rate. The next three are visible. The one at the front is "in hand".
- The counter holds 4 open boxes, each a 2x2 of cells with an order card: a 2x2 picture of kinds (cheese, pepperoni, tomato, veggie), or a wildcard cell (any kind).
- Drop the in-hand square into a cell of a box, or onto the day-old rack (3 slots; a full rack means the next rack drop is a strike).
- A box closes when its 4th cell fills. Score by cells matching the order: 4/4 clean (tip 3), 3/4 messy (tip 1), 2/4 or worse sent back (strike, no tip). A closed box slides off and a fresh box with a new order takes its place after a short gap.
- The conveyor has 6 slots. If a square would arrive on a full conveyor it hits the floor: strike.
- Rush waves: the cutter speeds up and orders get fussier (more distinct kinds per box, fewer wildcards). Lunch rush is the midpoint, bar close the finale.
- Three strikes ends the shift. Score is tips. Clearing bar close is a clean shift.

## Placement modes (both built; Owen picks by playing)
- `cells`: the player picks the box (keys 1-4) and the cell (arrows) and drops (J). Layout is the player's problem.
- `boxOnly`: the player picks the box; squares fill it in reading order. Only which-box matters.
`PLACEMENT` in src/config/game.ts.

## Player
- No avatar on screen in v1; the spatula/hand is the cursor. Keys: 1-4 box, arrows cell, J/X drop, R rack (day-old), Space pause? (no: the rush doesn't pause).

## Squares
- Kinds: cheese, pepperoni, tomato (tomato-basil), veggie. Corner squares (v2): a flag on a square; some orders want corners.
- Arrival mix is biased toward what the open orders need, with noise, so the game is about sequencing, not luck. (`ARRIVAL.needBias`)

## Win / loss
- Lose: three strikes (floor, rack overflow, sent-back box).
- Win: survive the last wave (bar close). Score: total tips; clean-box streak multiplier.

## Art spec
Reference: art/reference/counter.jpg (the real counter). The room, top to bottom: the green chalkboard menu with white, red and yellow hand lettering and the red/green/white "Slices" sign (that's the title treatment); the steel kitchen behind the counter with trays of sheet pizza; the speckled brown stone counter with the register; customers in front. The player is the counter guy: white shirt, red cap.
In the game: the chalkboard is the back wall and carries the shift/wave text in chalk; the conveyor of squares runs along the steel shelf below it, from the cutter at the left; the open boxes sit on the stone counter; customers' faces (v2) stand in front of their boxes. UFO 50 palette throughout: chalkboard #003d10/#008456, chalk #ffffff/#e8ea4a/#e03c32, steel #c8c8c8/#707070, counter #8a6042 speckled with #a48080, cardboard #feb854 shaded #ca4a00, the red cap #e03c32.
16px squares (the pizza square is the tile). A box is a 2x2 of squares in a cardboard frame with the order card (a 2x2 mini-picture) pinned above it. Placeholders first: colored squares, white frames, the shared font.

## Build order (one system per session, done-condition verified by playing)
1. The counter: boxes with orders, the conveyor, drops into cells, clean/messy scoring, strikes, both placement modes. Done when: Owen can pack boxes for a minute and say which placement mode is the game.
2. Waves: cutter speed and order fussiness ramp; lunch rush and bar close; shift end and score.
3. Feel: square slide animation, lid-close snap, tip popup, strike flash; chip SFX and a music loop.
4. Customers: faces over the boxes, patience, reactions; the corner-square order.
5. Art pass: cutter, counter, boxes, the sheet pizza; cover for the cart menu.

## Decisions log
- 2026-10-19: Stamped from games/_template. Reason: start of the game.
- 2026-10-19: Packing, not match-3. Owen's first idea was shuffling a tray to match three; the mock-up read as Bejeweled in a costume. Owen: "the pizza gets packed rapidly, something about getting 2x2 into a box cleanly." Reason: every action is physical at the real counter and "clean" is a visible outcome.
- 2026-10-19: Both placement modes built behind a flag for session one. Reason: whether cell-level placement is fun at speed or too fiddly is a feel question only play answers.
