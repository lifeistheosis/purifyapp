# Store pictures: three designs for the back and the screen

**In the Vault, kept for 2.0.** His word, 2026-11-12 about 19:00 UTC: "So in
version 2.0, we're gonna work on those variants. But I guess just stick with
this for now, where it's like front face, and then some of them are like face
to the side." Everything in this folder is a round he did not use for 1.9:
the three designs A, B and C below, A1 to A6 (`a-family/`), the 3D phone
(`phone-3d/`), rounds 2 and 3 (`round-2/`, `round-3/`, `backgrounds/`: the
backgrounds, the lifted card, the app's own Athos art) and the eclipse and
stars set of eight (`eclipse/`), each its own composition on the thirds.
Nothing here is deleted. The set he kept is `docs/plans/v1.9/store/`
(80b1c743d), and the Vault on the SSM board lists these with the day and why.

His word, 2026-11-12 about 17:07 UTC, on the first set (`ee8ba86b`): "Control the screenshots in themselves, they look good. I kind of want a better design for the back though. Better design for the phone ... like more like graphic design touch to it, so like lines, curving ... make a nice new design, minimalistic design. Maybe add like, you know, depth. It just overall, it just looks too plain. Right? Maybe you can make 3 variant designs".

So the screens stay exactly as they are, and three designs, A, B and C, are shown for what is behind a screen and how it stands. He picks one, and the whole set of 41 is then made once with it.

Each design is shown on the same four pictures: Play phone 01 (Today), Play phone 04 (the journal), iPad 02 (the Greek), and the Play feature graphic. Twelve pictures, each a 24-bit PNG at the store's exact size.

## The three

| | Name | The idea | Ground |
|---|---|---|---|
| **A** | Horizon | A low hill and the line of its crest, as on Today's own star card, with fainter lines rising over it. The screen stands upright before it, a soft light behind. | Night |
| **B** | Planes | A disc and a ring behind. The screen is turned a little, with two leaves under it, so the depth is in the layers. The line sits to the side. | Night |
| **C** | Arch | The screen stands in an arch, the shape of a church door and of a Gospel book's canon table, with a second fine line inside it and a floor line at its foot. | Parchment, the app's own Light palette |

All three keep the house's type (the heading serif for the line, the app's own sans for the wordmark) and draw every colour from the app's palette tokens. C is the only one on the light ground: the plan's default is the night palette, and C is offered so that one of the three is a real change of ground and not three kinds of dark.

## The files

| File | Size | checkMock |
|---|---|---|
| `A-play-phone-01-today.png` | 1080 by 1920 | pass, all 15 |
| `A-play-phone-04-journal.png` | 1080 by 1920 | pass, all 15 |
| `A-appstore-ipad-13-02-greek.png` | 2064 by 2752 | pass, all 15 |
| `A-play-feature-graphic.png` | 1024 by 500 | pass, all 15 |
| `B-play-phone-01-today.png` | 1080 by 1920 | pass, all 15 |
| `B-play-phone-04-journal.png` | 1080 by 1920 | pass, all 15 |
| `B-appstore-ipad-13-02-greek.png` | 2064 by 2752 | pass, all 15 |
| `B-play-feature-graphic.png` | 1024 by 500 | pass, all 15 |
| `C-play-phone-01-today.png` | 1080 by 1920 | pass, all 15 |
| `C-play-phone-04-journal.png` | 1080 by 1920 | pass, all 15 |
| `C-appstore-ipad-13-02-greek.png` | 2064 by 2752 | pass, all 15 |
| `C-play-feature-graphic.png` | 1024 by 500 | pass, all 15 |

`variants.mjs` made them and wrote `results.json`. `node docs/plans/v1.9/store/variants/variants.mjs` makes all twelve again; `... variants.mjs B` makes one design.

## The device: what each store says, and what was done

Read on 2026-11-12 from each store's own pages.

**Google Play** (Play Console Help, "Add preview assets to showcase your app"). Under "Highly recommended", for the feature graphic and for screenshots alike, the page says to avoid "Device imagery (as this can become obsolete quickly or alienate some users)", and for screenshots not to show people interacting with the device. These are recommendations and not requirements: the page says failing them does not affect the listing. The only place a device frame is forbidden outright is Wear OS, which Purify does not ship.

**App Store.** The screenshot specifications say nothing of device frames. The App Review Guidelines ask that screenshots "show the app in use" (2.3.3) and bar "imagery of other mobile platforms" in an app's metadata (2.3.10). Apple's Marketing Resources and Identity Guidelines allow an Apple device only as Apple's own product bezel, "as is" and without modification: no added reflections, shadows or highlights, no cropping, no tilting. A generic device may carry no detail unique to an Apple product, and an illustration, a 3D rendering or any simulation of an Apple product is not permitted.

**What was done, the same for both stores.** No device is drawn in any design. A screen has rounded corners, a fine edge, a shadow and depth, and nothing of hardware: no camera, no speaker, no button, no home bar, no bezel with a maker's shape. That follows Play's recommendation, and it stays clear of Apple's rule, since nothing here depicts an Apple product and so nothing is a modified one. B's turn is a turn of the screen as a plain leaf, not of a phone. A puts a thin dark rim round the screen, which is an edge and not a device.

If he would rather have real devices on the App Store pictures, the only way Apple allows is its own bezels, upright and unaltered, from Apple Design Resources. That would rule out B's turn and any shadow on the device itself, and it would need the pictures to differ between the two stores.

## The house's rules

- **No rays.** Nothing fans out from a point. A's lines are arcs of one wide circle, side by side like the lines of a hill. B's disc and ring are whole circles. C's arch is one curve. checkMock's `rays` passes on all twelve.
- **Light is a soft pool or nothing.** A has one, behind the screen at the hill's crest. B and C have none.
- **No side stripe, no sparkle, no pills, no gloss.** The only fills are flat tones a step off the ground. C's floor line runs the whole width under the arch and is not at the edge of a card.
- **The heritage list.** The screens are the same three as in the set, and the script holds every picture in view against `lib/marketing/heritagePictures.ts` again: none. The only picture in view is St Nicholas's on Today (Kirillo-Belozersky).
- **checkMock.** Every picture is checked as the page it is rendered from, on all five palettes, all fifteen rules. In each design the drawing starts under the words and never crosses them, so the words' contrast is measured and not left to the eye.
- **By eye.** No interface is drawn: each screen is the export's own. No icon was added. No word was written for a screen. The lines on the pictures are the set's own.

## Three things to know before he chooses

1. **The size of the screen.** To let the back show, all three set the phone's screen a little smaller than the first set did (about 63 to 65% of the picture's width against 71%). The screen is still whole in all three.
2. **B's turn softens small words a little.** A turned screen is drawn in perspective, so its far side is smaller. It reads well at the store's sizes; it is the least exact of the three for the app's finest print.
3. **C's feature graphic.** A narrow arch with the cross alone inside it read as a headstone, so the arch was made wide and holds the wordmark and the line as well, as an apse holds what stands in it. If any of that reading remains for him, A or B is the safer feature graphic, and C's pictures can still go with either.

## One fault found in the first set, fixed for the re-shoot

The app's stylesheet keeps a scrollbar's room on the page (`scrollbar-gutter: stable`), and the pages the pictures are set on wore it too. So each of the 41 pictures in `ee8ba86b` has a strip 15 pixels wide down its right edge where the soft light is not painted (five steps of grey darker in the band of the line, nothing lower down). It is faint and it is a fault. `../make.mjs` and `variants.mjs` now set the gutter off, and the twelve here do not have it. The 41 were not made again, as asked: they are made once, with the chosen design, after the tablet fixes land.
