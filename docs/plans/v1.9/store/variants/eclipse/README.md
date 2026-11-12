# Store pictures: eclipse and stars, the eight screens

His word to the store pictures chat, 2026-11-12, of the third round's Nimbus: "go all in on the eclipse starts but make every design different and uniqu".

Settled by his word before this: **black and white**, **the phone in 3D**, and **a piece of the real screen lifted off the glass** ("cool widget implementation and visual hook"). This folder is the eight screens on that foundation, each with an eclipse, a field of stars and a lifted piece of its own, at Play's phone size (1080 by 1920).

| # | Screen | The line | Its eclipse | What is lifted | File |
|---|---|---|---|---|---|
| 01 | Today | The day's saint, fast and readings | **Totality.** One great disc behind the phone, a bright rim, a single ring. | the Nativity star card | `eclipse-play-phone-01-today.png` |
| 02 | The Greek | The Greek beside the verse | **Crescent.** A lit disc with a dark one across it, so a crescent of light is left. | the first verse, English and Greek | `eclipse-play-phone-02-greek.png` |
| 03 | The Fathers | The Fathers on the verse you are reading | **Orbits.** A small bright disc at the phone's shoulder and the rings round it, one carrying a small dot. | the Father's name and his work | `eclipse-play-phone-03-fathers.png` |
| 04 | The journal | A journal kept by the Church's day | **Moonrise.** A disc half risen over a level floor. | the day's page | `eclipse-play-phone-04-journal.png` |
| 05 | Prayers | The daily prayers, morning and evening | **Two lights.** A great disc at one side, a small bright one at the other, one fine arc between. | the morning prayers | `eclipse-play-phone-05-prayers.png` |
| 06 | A saint | The lives of the saints | **Limb.** The edge of a disc far larger than the picture, rising from one corner. | Life, Writings and Web | `eclipse-play-phone-06-saint.png` |
| 07 | The calendar | Every feast and every fast | **Phases.** The moon's phases in a row along the foot, and a ring behind the phone. | the day's fast | `eclipse-play-phone-07-calendar.png` |
| 08 | A Father's work | The Fathers, read in full | **Ring.** A ring of light, dark within, and a finer ring outside it. | the book's cover | `eclipse-play-phone-08-reading.png` |

## What is real

Each screen is the 1.9 app's own, taken from the native export as `../../make.mjs` takes it: a new reader with no Plus, the night palette, Sunday 6 December 2026. Each lifted piece is cut from that same picture of the screen and set back in its own place, then moved toward the eye in the phone's own space. Nothing of the interface is drawn.

The phone is a plain slab with real thickness and no hardware (`../phone-3d/README.md` says what each store asks).

## Checks

- **checkMock**: all eight pass all fifteen rules on five palettes, every word measured, the scrollbar's room off.
- **No rays.** A disc has a rim and no beams; there is no corona. Orbits' rings are whole circles round a small disc that stands at the phone's shoulder, not behind it. The moons are discs with a dark disc across each.
- **Stars are plain round dots**, set by a fixed rule so each picture is the same every time, with a different rule for each screen.
- **Black and white only.** Every colour is the palette's paper over its night. The one accent, on each bright rim, is the house's `--color-gold`, a near-white grey.
- **The heritage list** is held on each screen: none in view. In view are St Nicholas (Today), St Basil (the Fathers, the saint), the Prayers pictures and St Athanasius's cover, as in the first set.
- **Plus**: the same eight screens as the first set, all free for every reader.

## Not yet done, and why

- **The other four devices and the feature graphic.** This is the design pass on one size. The whole set of 41 is made once, with this design if he keeps it, after the tablet fixes land (the calendar, the journal's prompt and the Prayers banner on tablets).
- **The Fathers picture** still has the blurred page above its sheet, as in the first set: that is how the app shows a commentary.

`eclipse.mjs` made them and wrote `results.json`. `node docs/plans/v1.9/store/variants/eclipse/eclipse.mjs` makes all eight again, and `... eclipse.mjs journal` one.
