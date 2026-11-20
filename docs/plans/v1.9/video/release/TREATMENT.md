# The 1.9 release film: the treatment

His word on the ad's fourth render, 2026-11-20 about 22:26 UTC: "it doesn't feel like a major release type of video it feels like a general video that is to showcase the app. it needs to be cinematic."

**Status, 2026-11-20: a treatment and a storyboard, waiting for his yes or no.** Nothing is rendered as video. The page is in `docs/handoffs/ad-cinematic.md`.

## What was wrong

The last version answered each of his notes one at a time and stayed a tour: a phone in the middle, evenly lit, with a caption over it from the first frame to the last. A tour explains. A launch film announces.

## The one idea

The film has one line and it is the drop's own: **"Purify 1.9 is here."** (the first sentence of the drop's caption). Everything serves the arrival: the mark, the number, the phone coming out of the dark, and the same line landing at the end. No word is written for the film.

## The six choices

1. **It opens by announcing.** Black. Purify's mark comes up in one soft pool of light and is held. Then "1.9" fills the frame. No screen is seen for the first two and a half seconds. The end card lands the same way: the mark, and "Purify 1.9 is here."
2. **Dark, and one light.** The ground is the palette's deepest night. One soft pool of light, never beams. The phone comes out of the dark with part of its glass still in shadow, a pool of light lying on the glass, and its own light given back by the ground it stands on. The store pictures' hill and its lines are gone from this film: they read as a graphic, and this is a place.
3. **A camera that chooses.** The eye stands nearer, so a turned phone has depth. Shots change scale hard: the whole phone small in a wide dark frame, then a detail filling the frame. Close shots are sharp where the eye should be and fall soft toward the far end, as a lens does. The phone never turns more than the store pictures' side stand.
4. **A build.** Slow and held at the start (1.5 and 1.1 seconds), the phone's arrival (1.6), then it quickens: a card (0.7), a close shot with quick cuts inside it (1.5), a card (0.7), a close shot (1.5), the whole journal (1.3), and stillness on the end card (1.8). About 11.7 seconds. Every move settles on the house curve; a fast move is allowed, a springy one is not.
5. **Type as an event.** Each chapter has a full-frame title card in the app's sans, large and few words, while the phone goes on moving out of focus behind it. No caption sits over the phone. The display serif does not come back.
6. **Real screens.** The screen on the phone is the ad's own takes: the native export of main `6700c2e65`, each piece the app's own element, word for word after the build as before. The film adds only what is round the screen.
7. **The phone** (his word, 2026-11-20: "Upgrade the phone design."). No longer the store pictures' plain slab: a band of brushed metal lit along its front shoulder, glass set in a fine bright lip, rounder corners, three buttons on the band, and a shadow where it meets the ground. Nothing is drawn on the glass, so the app's screen stays whole.

## The words, and where each is from

| On the film | From |
|---|---|
| 1.9 | the drop's `release` |
| The day's saint, fast and readings | the store picture's line for Today |
| Your journal, by the Church's day | the drop's point `journal`, its name |
| Free for everyone. | the drop's point `journal`, its text |
| Purify 1.9 is here. | the drop's caption, its first sentence |

## The storyboard

Nine frames, `FRAMES` in `board.mjs`, each with its reason. They are rendered from the real stage and the real takes, and all nine pass `checkMock` (its `--self-test` first).

```
node docs/plans/v1.9/video/ad/take.mjs today && node docs/plans/v1.9/video/ad/take.mjs journal   # after the export (../ad/README.md)
node docs/plans/v1.9/video/release/board.mjs           # the nine frames and the sheet, in .promo/v1.9-video/release/board/
node docs/plans/v1.9/video/release/board.mjs --check   # checkMock on every frame
node docs/plans/v1.9/video/release/page.mjs <file.html>   # the page
```

## What waits for his yes

- **The test:** about 11.7 seconds, 1080 by 1920, 60 frames a second, H.264, silent: these nine moments in motion. Made here, with no credits spent. My estimate is 100,000 to 150,000 tokens and about an hour.
- **Sharper close shots.** The takes were filmed at 2.5 device pixels to one, so a close shot cannot go nearer than the phone as wide as the frame. For the test I would film them again at 4, so a detail (St Nicholas, a pen) can truly fill the frame.
- **A generated background plate:** I do not think it is needed. The dark ground and the one light are made here and are free. If he wants real atmosphere (haze, a surface with grain), one generated plate of light and ground only, never the app, would cost his Higgsfield credits; I would quote it before anything ran.
- The other six scenes wait for his yes to the test.
