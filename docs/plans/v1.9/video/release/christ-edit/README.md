# The Christ edit: a ten second promo cut one-to-one to a template

His word, 2026-11-22 (in the ad stage 1 chat), with a 9.9 second video saved from TikTok: "Okay, now I want you to make app promo with this exact style, but instead of people, do Christ. I want you to make it as one-to-one as possible with the template. And yeah, like if you need to crop out the icon, do the 3D of the icon going up with the effects, make it as one-to-one as possible with and matching the audio from effects to visuals to transitions, one-to-one. Let's do it."

**Status, 2026-11-22 about 00:49 UTC: rendered once, waiting for his yes or no.** Nothing is posted.

## The template, measured

A fan edit of a television character (the upper half of his file; the lower half is someone's remake of it). 9.913 seconds, 30 frames a second, about 83 beats a minute.

| Time | What the template does |
|---|---|
| 0.00 to 0.45 | a black-and-white cut-out figure in a white dome on black sinks out of the frame |
| 0.45 to 0.75 | the dome stands empty |
| 0.75 to 1.05 | the figure rises into the dome, blurred, and settles |
| 1.50 | a white flash |
| 1.62 to 2.00 | a window of colour opens over the figure and is flown through |
| 2.00 to 4.50 | four clips in colour, with one word on each beat (hits at 2.18, 2.50, 2.74, 3.13, 3.46) |
| 4.50 to 5.00 | three very fast close cuts with blur |
| 5.00 to 6.00 | one held shot with a question on it |
| 6.00 to 7.00 | four fast cuts, then a whip |
| 7.00 to 7.80 | a shot that goes from grey to colour, with the answer at 7.43 |
| 7.80 to 9.90 | the dome again with a cyan and blue glow: sink, empty, rise, flash at 9.30, the window again; it loops |

## Ours, cut to the same times

- **The figure is Christ**, cut from the app's own icon of the Sinai Pantocrator (`public/shop/media/christ-pantocrator-mounted.jpg`; not on the heritage list). `assets.py` cuts Him out with His halo. **Nothing of the icon is redrawn and nothing in it is made to move**: the figure rises and sinks whole. No sunglasses, no gestures, no generated motion of His face or hands.
- **The window is the phone**, showing the app's Today, and it is flown through into the app.
- **The clips** alternate details of the icon (His face, His eyes, the blessing hand, the Gospel) with real screens of the app (Today, John 14 at verse 6, the journal, St Nicholas's page), by his choice of "Icon details + app". The screens are the native export of main `6700c2e65`, a new reader with no Plus, Dark, Sunday 6 December 2026 (`screens.mjs`).
- **The words are Scripture, word for word, held to the app's own Bible by the script**, by his choice of "Scripture": on the five beats "I am / the way / the truth / and / the life" (John 14:6); the question "But whom say ye that I am?" (Matthew 16:15); the answer "Thou art the Christ" (Matthew 16:16). In the app's sans.
- **The name** "Purify" stands small at the foot all through, where the template carries its maker's mark.
- **The second dome's glow is the template's cyan and blue**, typed in, since he asked for one-to-one. It is the one place the film leaves the app's palette.
- No rays (the light is a disc and a soft rim), no four-point stars (the points in the dark are round), no side stripe, no parchment, no em dash. checkMock passes at eight moments.

## The sound is not cleared

The template's song is a commercial recording. Two files are made:

- `purify-christ-edit.mp4`: the **silent master**. This is what is posted, with the sound added inside TikTok or Instagram from the app's own library.
- `purify-christ-edit-PREVIEW-not-for-posting.mp4`: the same picture with the template's sound, **for him to judge the sync only**. Never posted, never an ad, never on the store pages or the website.

## Making it again

```
pip install rembg
python3 docs/plans/v1.9/video/release/christ-edit/assets.py . .promo/v1.9-video/christ
node docs/plans/v1.9/video/release/christ-edit/screens.mjs          # needs the export in out/ (../../ad/README.md)
node docs/plans/v1.9/video/release/christ-edit/make.mjs --sheet 30  # thirty moments, to look at
node docs/plans/v1.9/video/release/christ-edit/make.mjs --check     # checkMock at eight moments
node docs/plans/v1.9/video/release/christ-edit/make.mjs --audio <the template file>   # about ten minutes
```

The cut is the tables at the top of `make.mjs`: `CLIPS` (from, to, picture, where it looks, how near) and `CAPTIONS` (from, to, the words). The template's file is not in the repository (it is someone else's video); the times above are its measure.
