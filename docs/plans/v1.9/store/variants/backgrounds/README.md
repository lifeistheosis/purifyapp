# Store pictures: four backgrounds behind the phone in 3D

His word to the store pictures chat, 2026-11-12, of the 3D sample: "it looks nice let's work on the background".

Four backgrounds, each on one picture only: Play phone 01 (Today), 1080 by 1920. The phone is exactly as `../phone-3d/` has it (a plain slab with real thickness, no hardware), and the screen is the set's own. Only the back changes, and each is fuller than A1 to A6 were, since the turned phone leaves more of the back in view.

| | Name | The idea | File |
|---|---|---|---|
| **1** | Dawn | Five hills in layered planes, a low light behind the nearest, and plain dots of stars above. | `BG1-play-phone-01-today.png` |
| **2** | Orbit | Wide rings round a centre off the picture, sweeping behind the phone, and a disc at its shoulder. | `BG2-play-phone-01-today.png` |
| **3** | Arch | A wall and a floor. An arch stands in the wall behind the phone, and a low light lies on the floor. | `BG3-play-phone-01-today.png` |
| **4** | Field | Rolling lines that gather toward a horizon, as the furrows of a field do, with a light where they meet the sky. | `BG4-play-phone-01-today.png` |

## Checks

- **checkMock**: all four pass all fifteen rules on five palettes, every word measured, the scrollbar's room off.
- **No rays.** Nothing fans out from a point: crowns of wide circles (1), whole rings round a centre that is off the picture and not behind the phone (2), one arch and a level floor line (3), lines that run across and only draw closer toward the horizon (4).
- **Stars are plain round dots** (1). **Light is one soft pool** in 1, 3 and 4, none in 2.
- **The accent** is the house's `--color-gold` token, once in each: the nearest crest, one ring, the arch, the horizon. It is a near-white grey; the app has no yellow gold.
- **The heritage list** is held again: only St Nicholas on Today is in view. No hardware is drawn.

`backgrounds.mjs` made them and wrote `results.json`. `node docs/plans/v1.9/store/variants/backgrounds/backgrounds.mjs` makes all four again, `... backgrounds.mjs BG3` one.

## What comes next

He points at one (or says what to push: more light, more lines, quieter, another idea), and that back is worked further before the eight screens each get their own on it.
