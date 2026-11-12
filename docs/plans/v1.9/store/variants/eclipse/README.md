# Store pictures: eclipse and stars, the eight screens

His word to the store pictures chat, 2026-11-12, of the third round's Nimbus: "go all in on the eclipse starts but make every design different and uniqu".

Then, of the first eight made here, which shared one layout: "I need each section to be entirely different though".

Settled by his word before this: **black and white**, **the phone in 3D**, and **a piece of the real screen lifted off the glass** ("cool widget implementation and visual hook"). This folder is the eight screens on that foundation at Play's phone size (1080 by 1920). Each picture is a composition of its own: the phone's pose and size, where the line stands, the idea in the night sky and how the piece is lifted all change.

| # | Screen | The line, and where | The phone | The sky | What is lifted | File |
|---|---|---|---|---|---|---|
| 01 | Today | The day's saint, fast and readings. Head, centred. | Turned to the left, whole. | **Totality.** One great disc behind the phone, a bright rim, a ring. | the Nativity star card, drawn out to the side | `eclipse-play-phone-01-today.png` |
| 02 | The Greek | The Greek beside the verse. Head, set to the side. | Face-on and large, running off the foot. | **Crescent.** A crescent moon over the phone's shoulder. | the first verse, English and Greek, raised over its own place | `eclipse-play-phone-02-greek.png` |
| 03 | The Fathers | The Fathers on the verse you are reading. Head, centred. | Turned to the right, whole. | **Orbits.** Rings round a small bright disc in the far corner, one carrying a small dot. | the Father's name and his work | `eclipse-play-phone-03-fathers.png` |
| 04 | The journal | A journal kept by the Church's day. Head, centred. | Lying on the floor, seen from above. | **Moonrise.** The moon half risen at the horizon. | the day's page, standing up off the screen | `eclipse-play-phone-04-journal.png` |
| 05 | Prayers | The daily prayers, morning and evening. Foot. | Small, high and to one side. | **Northern Cross.** The stars of the Northern Cross joined, among fainter ones. | the row of prayers, drawn out to the side | `eclipse-play-phone-05-prayers.png` |
| 06 | A saint | The lives of the saints. Head, upon the disc. | Close and large, running off two sides. | **Limb.** A disc far larger than the picture fills its head. | Life, Writings and Web | `eclipse-play-phone-06-saint.png` |
| 07 | The calendar | Every feast and every fast. Head, centred. | Face-on and small. | **Phases.** The moon's phases in an arc crowning the phone. | the day's fast | `eclipse-play-phone-07-calendar.png` |
| 08 | A Father's work | The Fathers, read in full. Foot. | Turned to the right, set high. | **Ring.** A ring of light, dark within. | the book's cover, drawn out large into the ring | `eclipse-play-phone-08-reading.png` |

## What is real

Each screen is the 1.9 app's own, taken from the native export as `../../make.mjs` takes it: a new reader with no Plus, the night palette, Sunday 6 December 2026. Each lifted piece is cut from that same picture of the screen and set back in its own place, then moved toward the eye in the phone's own space. Nothing of the interface is drawn.

The phone is a plain slab with real thickness and no hardware (`../phone-3d/README.md` says what each store asks).

## Checks

- **checkMock**: all eight pass all fifteen rules on five palettes, every word measured, the scrollbar's room off.
- **No rays.** A disc has a rim and no beams; there is no corona. Orbits' rings are whole circles round a small disc that stands in the far corner, not behind the phone. The moons are discs with a dark disc across each. The Northern Cross is five stars joined by two lines, as the asterism is drawn.
- **Stars are plain round dots**, set by a fixed rule so each picture is the same every time, with a different rule for each screen.
- **Black and white only.** Every colour is the palette's paper over its night. The one accent, on each bright rim, is the house's `--color-gold`, a near-white grey.
- **The heritage list** is held on each screen: none in view. In view are St Nicholas (Today), St Basil (the Fathers, the saint), the Prayers pictures and St Athanasius's cover, as in the first set.
- **Plus**: the same eight screens as the first set, all free for every reader.

## Not yet done, and why

- **The other four devices and the feature graphic.** This is the design pass on one size. The whole set of 41 is made once, with this design if he keeps it, after the tablet fixes land (the calendar, the journal's prompt and the Prayers banner on tablets).
- **The Fathers picture** still has the blurred page above its sheet, as in the first set: that is how the app shows a commentary.
- **A lifted piece shows twice where it is drawn out to the side** (the prayers' row, the journal's page): once in its place on the screen and once lifted. That is what lifting is; where it read as a fault (the Greek) the piece is raised over its own place instead.
- **Where the line stands at the foot** (05 and 08) and where the phone runs off the picture (02 and 06) are choices of this design. Both stores allow them; Play only asks that the words take no more than a fifth of the picture, and they take about a sixth.

`eclipse.mjs` made them and wrote `results.json`. `node docs/plans/v1.9/store/variants/eclipse/eclipse.mjs` makes all eight again, and `... eclipse.mjs journal` one.
