# The 1.9 release film: the hand-over

Written 2026-11-20 by the worker chat started for this one job (session_01VuYTwdjxDrv3qHjVwVdhve) with `docs/handoffs/ad-cinematic-prompt.md`.

**Status: the treatment and the storyboard are made and wait for his yes or no. Nothing is rendered as video. No credits spent.**

## The page

https://claude.ai/artifact/5MaNos13x89spBQViXENe7 (version 2). Private to him. It holds his word, the one idea, six choices with their reasons, the rhythm, nine stills each with its reason, every word with its source, and what his yes starts.

## His words in this chat (verbatim, UTC)

- About 22:39, on the storyboard's first version: "Upgrade the phone design."

At that word (the page is version 2, same address): the phone is no longer the plain slab. A band of brushed metal lit along its front shoulder and faintly at its back, glass in a fine bright lip, rounder corners (36 from 29), three buttons on the band, and a shadow where it meets the ground. Nothing is drawn on the glass. This is my reading of "upgrade": a finer object, still no maker's hardware. All nine frames were rendered again and pass checkMock.

- About 23:28: "do you have suggestions?" Answered with five, in order of worth: sound (a low tone and one hit on the number), colour in the light (the app's gold, warm, on the mark and the end card only), a hand-off between shots (the number's light becomes the phone's light), the icon of St Nicholas as the one close detail filmed sharper, and the store badges on the end card. None is made; each waits for his word.

- About 23:44, with a video uploaded (24.4 seconds, 576 square, a TikTok download of another maker's anime edit, the music ending at about 20.4): "this videos audio (and the video linked has the drops and frame switches for reference"

At that word: the video was read, not used. Its map, by measure (bass and treble through time, and the picture's cuts):

| Seconds | The music | The picture |
|---|---|---|
| 0 to 3.7 | sparse: single low hits at 0, 1.2 and 2.2 | one held shot |
| 3.73 | the first drop | the first cut |
| 3.7 to 6.1 | the bass builds | cuts at 4.87 and 5.53 |
| 6.1 to 10.7 | full, the fastest part | cuts at 6.13, 6.43, 6.67, 7.7, 8.23, 8.5, 9.6, 10.67 |
| 10.7 to 11.9 | a break, nearly no bass | one held shot |
| 11.9 to 18.3 | the main part, full | cuts at 14.03, 14.7, 15.33, 16.73, 17.9, 18.2, 18.3 |
| 18.3 to 20.4 | a last swell and one final hit at 20.4, then silence | black |

Its look: hard black and white, hard cuts on the hits, flash frames, one warm ember colour. (Its last picture is a beam of light, which the house forbids; flashes stay under three a second.)

**Not settled, and his to say (a stop condition: legal):** the music is someone's track, taken from a TikTok. I do not know its name or its owner. Putting it inside Purify's own file is using music without a licence: a business account's post can be muted or taken down, and an ad or a store video cannot carry it. Asked him how to go on. The video and its audio are not in the repository.

- About 23:45: "time it to the audio not video the video is a little bit off on some occasions but you get the idea"

At that word: the track itself was measured (onsets by change of spectrum, and the low band alone), and the film is to be cut to it, not to the reference's picture.

- **Tempo:** about 99 beats a minute. A beat is about 0.61 seconds and a bar of four is about 2.43.
- **Downbeats, by the low hits (within about 0.08 seconds of an even grid):** 2.19, 4.62, 7.05, 9.48, 11.91, 14.34, 16.77, 19.20.
- **Before the grid:** the track opens sparse, with single hits near 0.6 and 3.1.
- **Lifts into a downbeat** (a rush in the treble just before it): into 7.05, 9.48, 16.77 and 19.20.
- **The break:** about 10.7 to 11.91, nearly no bass, ending on a downbeat.
- **The final hit:** 20.34, by far the loudest moment, then silence.
- My measure is by script and not by ear; the grid is to be proved before the render with a sheet of the film's cuts against these times.

The cut proposed to him (about 22 seconds, the end card held in the silence):

| At | The music | The film |
|---|---|---|
| 0 | sparse | black, the mark comes up |
| 2.19 | the first downbeat | "1.9" lands |
| 4.62 | bar 2 | the phone comes out of the dark |
| 7.05 | bar 3, after a lift | chapter 1, Today: its card, then cuts on the beat |
| 9.48 | bar 4, after a lift | chapter 2, cuts on the beat |
| 10.7 | the break | the journal's card, held |
| 11.91 | bar 5 | chapter 3, the journal |
| 14.34 | bar 6 | chapter 4 |
| 16.77 | bar 7, after a lift | the fastest cuts |
| 19.20 | bar 8, after a lift | the journal whole, "Free for everyone." |
| 20.34 | the final hit | the end card, "Purify 1.9 is here.", held in silence |

Chapters 2 and 4 need screens the storyboard does not have (proposed: Every verse, opened; Seven more Bibles). Asked him for his yes with the cost. The music's licence is still open.

## What was made

- `docs/plans/v1.9/video/release/TREATMENT.md`: the treatment. The one idea is the drop's own line, "Purify 1.9 is here." (the first sentence of the drop's caption).
- `docs/plans/v1.9/video/release/board.mjs`: a new stage (the palette's deepest night, one soft pool of light, the phone with its glass part in shadow and a pool of light on it, what the ground gives back, a nearer eye for depth, the soft far end of a close shot, full-frame type in the app's sans) and the nine frames, `FRAMES`, each with its place in the film and its reason.
- `docs/plans/v1.9/video/release/page.mjs`: makes the page from the frames.
- `docs/plans/v1.9/video/ad/` is untouched, for the Vault.
- Out of git, lost when the container restarts: the export (`../purify-main/out`, linked as `out`), the takes and the stills in `.promo/v1.9-video/`.

## What was measured

- The app is the native export of main `6700c2e65`, cut by `scripts/gate/export.mjs --cwd` in a worktree.
- Both takes `ok` with the ad's own `take.mjs`: Today 86 words and the journal 83, each word for word after the build as before.
- `mock-check.mjs --self-test` passed, then `board.mjs --check`: all nine frames pass.
- The phone never turns more than the side stand and is never nearer than the takes were filmed; the script refuses otherwise.
- Every word is read from `../scenes.mjs` (the drop, the store line, the drop's point) and the drop's `release`; none is written.

## What his yes starts (TREATMENT.md has it)

- The test, about 11.7 seconds: these nine moments in motion. Estimate 100,000 to 150,000 tokens and about an hour, no credits.
- Takes filmed again at 4 device pixels to one, so a detail can fill the frame. That needs `SHARP` in `../lib.mjs` to be settable (it is a constant, 2.5).
- A generated background plate is not recommended; if he wants one it is quoted first.

## Seen in the app (not mended)

- On Today, a line of the verse of the day's card shows as a thin strip under the tab bar at the foot of the screen. It is the app as it is; it shows in frame 3.
- The journal's tab bar marks Bible, as the last hand-over says.

## Tokens

By my own count the chat was at about 120,000 tokens when the page was published: about 45,000 fixed (tools and rules), 30,000 reading the prompt's files and the old compose script, 25,000 on the stage and its three looks, 20,000 on the treatment and the page. No step passed 100,000.
