# Store pictures: a third round, four bolder backgrounds in black and white

His word to the store pictures chat, 2026-11-12, of the second round: "keep the black and white design. 1 is cool widget implementation and visual hook but I need a better background design", and then "none of these. the lifted card is nice like I said I need a better background black and white design".

So three things are settled: black and white, the phone in 3D, and the lifted card. Only the background is still open.

Four pictures, each Play phone 01 (Today), 1080 by 1920, with the phone and the lifted card exactly as `../round-2/` N1 has them. The earlier backs were fine lines, and the phone hid most of them. These are made of large shapes and stronger light, which read round a phone.

| | Name | The idea | File |
|---|---|---|---|
| **1** | Studio | A wall with one strong pool of light behind the phone, a floor it stands over, and its shadow on the floor. | `P1-play-phone-01-today.png` |
| **2** | Nimbus | One great disc behind the phone with a bright rim and a single ring round it, and a few plain dots of stars. | `P2-play-phone-01-today.png` |
| **3** | Sweep | Two great arcs crossing the whole picture in two tones, the nearer one edged in light. | `P3-play-phone-01-today.png` |
| **4** | Mosaic | A field of tesserae in greys rising from the floor and thinning into the dark, as on a church wall. | `P4-play-phone-01-today.png` |

## Checks

All four pass checkMock's fifteen rules on five palettes, with every word measured and the scrollbar's room off. Black and white only: every colour is the palette's paper over its night, and the one accent in each is the house's `--color-gold`, a near-white grey. Nothing fans out from a point (a disc and rings are whole circles; the arcs are parts of two wide circles; the tesserae are squares). Stars are plain round dots. The heritage list is held: only St Nicholas on Today is in view. The lifted card is the export's own pixels, and no hardware is drawn.

`round-3.mjs` made them and wrote `results.json`. `node docs/plans/v1.9/store/variants/round-3/round-3.mjs` makes all four again, `... round-3.mjs P2` one.
