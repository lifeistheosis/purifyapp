# Store pictures: a second round, each adding one thing

His word to the store pictures chat, 2026-11-12, after the four backgrounds: "is there any other things we should add? I want new variants".

Four pictures, each Play phone 01 (Today), 1080 by 1920, with the phone in 3D as `../phone-3d/` has it. Each adds one thing the earlier rounds did not have.

| | Name | What it adds | On | File |
|---|---|---|---|---|
| **1** | Lifted card | A piece of the real screen, the Nativity star card, lifted off the glass toward the eye, with its own shadow. | Dawn | `N1-play-phone-01-today.png` |
| **2** | Two screens | A second phone behind the first, open on the journal, so one picture shows two places in the app. | Arch | `N2-play-phone-01-today.png` |
| **3** | Holy Mountain | The app's own art of Athos over the sea at dusk as the back: colour, and something only this app has. | its own | `N3-play-phone-01-today.png` |
| **4** | The sign | The app's cross and name set small over the line, so every picture carries the mark. | Orbit | `N4-play-phone-01-today.png` |

## What is real in each

- **1.** The lifted card is the export's own pixels: the card is taken from the same screen at the same moment, set back in its own place, and moved toward the eye in the phone's own space. Nothing of it is drawn.
- **2.** The second screen is the journal as a new reader opens it, taken from the same export on the same day.
- **3.** The art is `public/themes/athos.svg`, the picture the app itself draws for its Holy Mountain look. That look is one of the Plus looks. Here it is a backdrop and not the app's screen, which stays on the free night palette, so nothing shows a Plus look as free; still, he should know where the art comes from before choosing it.
- **4.** The cross is the app's own mark (`purify-cross-mark.png`) and the name is set as the app sets its wordmark.

## Checks

All four pass checkMock's fifteen rules on five palettes, with every word measured and the scrollbar's room off. The heritage list is held on each screen and on each finished page: only St Nicholas on Today is in view. No hardware is drawn. Nothing fans out from a point, and stars are plain dots.

## Things thought of and not made, with why

- **An icon as the backdrop** (the day's saint, large and soft behind the phone). The phone would stand in front of the saint's face, which reads badly, and the heritage list would have to be held for every screen's icon. Advised against.
- **A second line under the first.** Play asks that the words take no more than a fifth of a picture; one line keeps well inside it.
- **One back that runs through all eight pictures** (the hills continuing from one to the next, the light rising a little each time). It cannot be judged on one picture. It is the natural way to make "each screen different on one foundation", and it is proposed for when the foundation is chosen.

`round-2.mjs` made them and wrote `results.json`. `node docs/plans/v1.9/store/variants/round-2/round-2.mjs` makes all four again, `... round-2.mjs N2` one.
