# Store pictures: six designs in A's family

His word, 2026-11-12 about 17:36 UTC, after the three designs: "I want each screen to be different but let's agree on a foundational design first", then "show a bunch of unique designs for the 1st design".

So the eight screens will each have a design of their own in the end, on one shared foundation, and the foundation is looked for first, in design A (Horizon). Six designs, A1 to A6, each on one picture only: Play phone 01 (Today), 1080 by 1920.

## What is fixed, and what changes

Fixed in all six, as A has it: the night ground, the screen upright and whole with its thin dark rim and its shadow, the line on top in the house's heading face, and the same screen, taken from the same export exactly as `../../make.mjs` takes it.

What changes is the back: its language of line and curve, and where its depth comes from.

| | Name | The idea | Where the depth is |
|---|---|---|---|
| **A1** | Dawn | Three hills in layered planes, each a step lighter as it comes nearer, the nearest crest lit and a low light behind it. | Three planes, one behind another |
| **A2** | One line | A single sweeping curve in a fine line, and its faint echo. Nothing else. | The screen's shadow alone |
| **A3** | Contours | The lines of a hill as a map draws them, every third a little stronger, the summit off to one side. | The lines themselves, closing on a summit |
| **A4** | Vesica | Two wide circles crossing. The almond between them is a plane the screen stands in, with their wider arcs outside it. | One plane and the arcs round it |
| **A5** | Frame | A hairline frame round the whole picture whose head bends into an arch, a second line inside it. | A panel a step off the ground |
| **A6** | Low glow | One level line, a low light resting on it, and a few plain dots of stars above. | Ground and sky, and the one light |

## The files

| File | checkMock |
|---|---|
| `A1-play-phone-01-today.png` | pass, all 15 |
| `A2-play-phone-01-today.png` | pass, all 15 |
| `A3-play-phone-01-today.png` | pass, all 15 |
| `A4-play-phone-01-today.png` | pass, all 15 |
| `A5-play-phone-01-today.png` | pass, all 15 |
| `A6-play-phone-01-today.png` | pass, all 15 |

Each is a 24-bit PNG with no alpha. `a-family.mjs` made them and wrote `results.json`; `node docs/plans/v1.9/store/variants/a-family/a-family.mjs` makes all six again, and `... a-family.mjs A3` one.

## Gold

The brief said to use gold sparingly, by the house's tokens. Each design uses the house's accent token, `--color-gold`, once: on the nearest crest (A1), the line (A2), the summit (A3), the almond's edge (A4), the frame (A5), the level line (A6).

That token is a near-white grey and not a yellow gold. `app/globals.css` records why: since 1.7.1 the app has no yellow or gold, by his own word, and the token kept its name so the app's classes still resolve. checkMock's `gold` rule refuses a true gold, and it passes on all six. If he wants a warm gold in the store pictures, that is a change to a standing rule and his to make; it is one value in `a-family.mjs` and an allowance in the check.

## The house's rules

- **No rays.** Nothing fans out from a point. A1's crests are the crowns of three wide circles. A3's lines are closed rings round a summit that sits to one side of the screen, not behind it. A4's are whole circles. A6's line is level.
- **Stars are plain dots** (A6): round, no points, set by a fixed rule so the picture is the same each time.
- **Light is a soft pool or nothing.** A1 and A6 have one each, low. The others have none.
- **No side stripe, no sparkle, no pills, no gloss.** A5's frame goes all the way round; it is not a bar on one side.
- **The scrollbar's room is off**, and the script checks that it is on every page it takes.
- **The heritage list** is held again by the script: the only picture in view is St Nicholas on Today.
- **checkMock**: all six pass all fifteen rules on five palettes, and every word is measured, because each drawing starts under the words.
- **No device is drawn**, as in the three designs before (`../README.md` says what each store asks).

## What comes next

When he names the foundation (one of these, or a mix: for example A1's planes with A6's dots), the eight screens each get their own design on it, and the set of 41 is made once, after the tablet fixes land.
