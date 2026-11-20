# The 1.9 ad, stage 1: the hand-over

Written 2026-11-20 by the worker chat the arbiter started for this one job (session_01VuYTwdhrUStFNXC4goT9fG).

## Plainly: the test is not done

The token cap came before the render. There is no video, no page and no RECORD. get_session read 0 used tokens each time it was asked, so the count is my own times two, as told: about 130,000 of my own, so about 260,000, at or past the cap of 250,000. I started no new step and stopped.

He did not write to this chat.

## What was made (all pushed, `docs/plans/v1.9/video/ad/`)

- `cut.mjs`: the two scenes' pieces, each with its reason, and the move.
- `take.mjs`: films a scene (build, and for scene 1 the emptying). `--dry` and `--dom` work without filming.
- `compose.mjs`: the stage with the moving phone, the sheet, checkMock at six moments, the render and the encode. **Written, never run.** Expect small faults on its first run.
- `README.md`: what it is and the commands.

## What was measured

- The export of main `6700c2e65` cut clean with `scripts/gate/export.mjs --cwd` (CAMPAIGNS_OPENING "testers", the anon key checked and not printed). A linked node_modules fails the build; a hard-linked copy works.
- Dry runs, both scenes: every piece found, the house curve read as `cubic-bezier(.22, 1, .36, 1)`, and the screen read word for word after the build as before (Today 86 words, the journal 83). No heritage picture, no campaign named, the reader new with no Plus.
- The two filmed takes were started and were still running when I stopped. Their result was not read. They are in `.promo/` and are lost when the container restarts; film them again (a minute each).

## What stage 1 still needs (about 40,000 to 70,000 tokens by my guess)

1. Both takes filmed and `ok`.
2. `compose.mjs --times`, then `--sheet` and `--sheet 12 --span 3.1-4.7`, looked at: the move is the thing to judge, and it has not been seen once. Things to look for: the side stand whole in the picture and clear of the words, the slab's body showing only when turned, the join of the two bare screens.
3. `--check`, then the render with `VIDEO_EXPORT=6700c2e65`.
4. `page.mjs` and RECORD.md, after `../sample/page.mjs` (the video and a still in the page's asset store, Save the video), published as an Artifact.

## Found in the app (not mended)

- On `/journal/`, reached by You, then Your journal, the tab bar marks **Bible** as the place the reader is, not You. It may be meant; it reads as a fault.
- Today has changed since the sample: one card for the day. The sample's `PIECES` no longer fit main.

## What I would change

- The ground stays the hill for both scenes. The store pictures put the side stand before a field of rolling lines; stage 2 could change the ground with the stand.
- The scene change here is the film's (the screen empties and fills), not a tap and the app's own transition as in the sample. If he wants taps kept, the move can ride over a real tap instead.
- The estimate for a stage should count the fixed cost: this chat spent about 47,000 tokens of its own before its first command (tools and rules), and the export's first failure cost a second build.
