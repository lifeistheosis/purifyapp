# The 1.9 release film: the hand-over

Written 2026-11-20 by the worker chat started for this one job (session_01VuYTwdjxDrv3qHjVwVdhve) with `docs/handoffs/ad-cinematic-prompt.md`.

**Status, 2026-11-21 about 00:25 UTC: the film is made, cut to his track, and waits for his yes or no. No credits spent. The track's licence is still open.**

## The page

https://claude.ai/artifact/5MaNos13x89spBQViXENe7 (version 4). Private to him. It now holds the film: a preview with his track (for him only), the silent file to post with Save, the rhythm, every cut with its reason, every word with its source, what was measured and what is open. The treatment and storyboard are its versions 1 and 2.

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

- About 23:51, to the cut proposed above, its two more screens (Every verse, opened; Seven more Bibles), its cost and the plan for the music (a preview with the audio for him only, a silent file to post): "yes"

At his yes (the film, made 2026-11-20 to 21):

- **The film:** 22.4 seconds, 20 shots, 1080 by 1920, 60 frames a second, H.264 High, 19.9 MB, no sound stream. `film.mjs` is its clock and its shots; every cut is on the track's grid (`FIRST` 2.19, `BAR` 2.43), the break at 10.7 and the last hit at 20.34.
- **Four screens:** Today and the journal (the ad's own takes, built by the app's pieces, 86 and 83 words word for word), the verse (`../record.mjs verse`, used only up to its highlight; Study is never opened) and the Bibles (`release/take.mjs`: the first cut's take waits for a sheet named "Translation", which main does not name so).
- **Filmed at 4 device pixels to one** (`VIDEO_SHARP=4`; `SHARP` in `../lib.mjs` can now be set). The journal's take fails at a slower clock than 6 (its one-question card is not dismissed in time), so it was filmed at the default; the verse and the Bibles at `VIDEO_SLOW=12`.
- **Checked:** `mock-check --self-test`, then `film.mjs --check`: all 20 shots pass at their middle. The script refuses more than three cuts in a second, a turn past the side stand, and a shot nearer than its take was filmed.
- **Looked at:** the sheet of every shot's middle before the render, and a strip of the finished file at two frames a second after it.
- **The preview with the track** was made by joining his uploaded audio to the film (5.6 MB, lower grain). It is only in the page's asset store, for him. The audio is not in the repository.
- **In the page's asset store:** the preview `/_blob/c58309f676f0ca3c3a08b5045a1a8d8a`, the silent film `/_blob/0cb84c35075d3b730d0995a04929830c`, a still `/_blob/985da55b9e891135c7be9d114a42a96e`.
- **Of my five suggestions:** sound is his track; the hand-off of light (the number's pool sinks to where the phone stands) and the nearer close shots are in; the gold tint and the store badges are not.
- **Not proved by ear:** the beats are measured by script. He is the judge of whether each cut sits on the track.

To make it again: the export and the four takes (TREATMENT.md, and the lines above), then `film.mjs --check`, `VIDEO_EXPORT=6700c2e65 film.mjs --fresh` (about 12 minutes in three parts with `--part`, then `--encode`), then `film-page.mjs`.

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

By my own count the chat was at about 330,000 tokens when the film was published (about 120,000 at the storyboard, 30,000 on the phone, the suggestions and the track, 180,000 on the film: its four takes, its script, one sheet, the render and the page). Before that, at the storyboard, it was at about 120,000: about 45,000 fixed (tools and rules), 30,000 reading the prompt's files and the old compose script, 25,000 on the stage and its three looks, 20,000 on the treatment and the page. No step passed 100,000.
