# Store pictures: eclipse and stars, the eight screens

His word to the store pictures chat, 2026-11-12, of the third round's Nimbus: "go all in on the eclipse starts but make every design different and uniqu".

Then, of the first eight made here, which shared one layout: "I need each section to be entirely different though".

And then: "do a different phone position for all photos. ensure you use the rule of 3rds (or whatever is based off the res x)".

Settled by his word before this: **black and white**, **the phone in 3D**, and **a piece of the real screen lifted off the glass** ("cool widget implementation and visual hook"). This folder is the eight screens on that foundation at Play's phone size (1080 by 1920).

## The thirds

The grid is taken from the picture's own size. At 1080 by 1920 its lines stand at 360 and 720 across and at 640 and 1280 down, and they cross at four points. On any other size the same thirds of that size are used; the script works them out from the width and the height.

In every picture the phone's centre stands on a third, and what the sky is about stands across from it on another: a crossing, or a whole line where the sky has a horizon. `thirds-proof.png` shows all eight with the grid laid over them.

| # | Screen | Where the phone stands | Its pose | The sky, and where it stands | The line | What is lifted | File |
|---|---|---|---|---|---|---|---|
| 01 | Today | Right third, just above the lower crossing | Turned in to the left | **Totality.** A bright-rimmed disc at the upper left crossing, which the phone half covers. | Head | the Nativity star card, drawn out to the left | `eclipse-play-phone-01-today.png` |
| 02 | The Greek | Left third, just above the lower crossing | Almost face-on | **Crescent.** A crescent moon by the upper right crossing. | Head, set to the side | the first verse, raised over its own place | `eclipse-play-phone-02-greek.png` |
| 03 | The Fathers | Right third, just under the upper crossing | Turned in, seen from a little below | **Orbits.** A small bright disc at the lower left crossing and the rings round it. | Foot | the Father's name and his work, drawn out to the left | `eclipse-play-phone-03-fathers.png` |
| 04 | The journal | Lying by the lower right crossing | Flat on the floor, seen from above | **Moonrise.** The horizon on the upper third, the moon half risen at the left third. | Head | the day's page, standing up off the screen | `eclipse-play-phone-04-journal.png` |
| 05 | Prayers | Left third, just under the upper crossing, small | Turned in to the right | **Northern Cross.** Its long line runs down the right third to the lower crossing. | Foot | the row of prayers, drawn out to the right | `eclipse-play-phone-05-prayers.png` |
| 06 | A saint | Left third, low, close and large, off two sides | Turned in to the right | **Limb.** A great disc fills the head; its edge comes down to the upper right crossing. | Head, on the disc | Life, Writings and Web | `eclipse-play-phone-06-saint.png` |
| 07 | The calendar | Right third, hanging from the head of the picture | Barely turned | **Phases.** The moon's phases along the lower third. | Foot | the day's fast, drawn out to the left | `eclipse-play-phone-07-calendar.png` |
| 08 | A Father's work | Coming in from the right edge, large | Turned in sharply | **Ring.** A ring of light at the upper left crossing. | Head | the book's cover, drawn out large into the ring | `eclipse-play-phone-08-reading.png` |

No two phones stand in the same place or at the same turn: two sit low, two sit high, one lies down, one rises from a corner, one hangs from the head and one comes in from the side.

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
- **The calendar's head is off the picture** in 07, since that phone hangs from the top: the month, its days and the day's fast are all in view, and the screen's own title is not.
- **Where the line stands at the foot** (03, 05 and 07) and where the phone runs off the picture (06, 07 and 08) are choices of this design. Both stores allow them; Play only asks that the words take no more than a fifth of the picture, and they take about a sixth.

`eclipse.mjs` made them and wrote `results.json`. `node docs/plans/v1.9/store/variants/eclipse/eclipse.mjs` makes all eight again, and `... eclipse.mjs journal` one.
