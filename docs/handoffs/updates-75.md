# Baton: Updates 75 (the player's words jumping as they wake, 1.9)

Written 2026-11-15 by Updates 75 (session_01VuYTwbxA8zJREiegwoQRzB), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). Item: the player's Words view jumps when its words wake (Updates 74's fault 1). Touched: components/player/LiveCaptions.tsx, lib/player/wordsGlide.ts (new), lib/player/__tests__/wordsWake.test.ts (new), scripts/ambience-open-walk.mjs. Not touched: NowPlayingSheet, lib/ambience/, AmbienceSheet, the house Sheet, useDraggableSheet, the sound.

## Cause, proved

LiveCaptions has two layout effects that run when `active` turns true: the line's own effect (`[current, active, live, timed]`) begins a glide to the line being read, then the wake effect (`[active]`, "Shown again ... in place") cancels it with `scrollTo(top, false)`, so the words landed in one frame. Under the ambience sheet the words rest while the line moves on (Updates 67, 638c7d94), so they had somewhere to go the moment the sheet was dropped. Filmed on export 1 (below): 55 to 142px in the one frame the sheet left. Only that effect changed, and the film after shows the glide.

**Cover to Words** goes through the same effect and moves the same 87px in one frame, but unseen: the Words panel still stands at opacity 0 on both sides of the step (its fade starts after it), so the words fade in already at the line. The screencast shows Cover alone, then the words appearing in place. Left as it is.

## Done, with hashes

- **1e84aa0f** (the mend, its test, the walk). Where the words can be seen as they wake, they glide to the line on the house curve, on a clock paced by the frames (`wakeClock`): its first frame stands at the start and no frame counts for more than 34ms, so the wake's own long frame carries no more of the way than two short ones. A wall clock could put up to 59 to 66% into that frame at CPU 4x (the house curve over the 85 and 100ms wake frames filmed). Where they cannot be seen (`seen`: an ancestor at opacity 0), they are placed at once as before. Motion reduced unchanged (`scrollTo` places at once). The house curve moved to lib/player/wordsGlide.ts unchanged; every other glide keeps the wall clock, in step with the rows' flip.
- **1e84aa0f**, the walk: `--film <dir>` films the close (`<dir>/close`) and Cover to Words (`<dir>/cover`), timing each tap from the touch itself (it had been read after the tap returned, 50 to 100ms late at CPU 4x). With motion on it fails (exit 1) when a seen frame carries over half of the words' move (`oneFrameJumps` in lib/profile/cardSteps.ts as the model, applied to long frames too). **The rule, at the arbiter's call:** `--check` no longer holds a close with motion reduced to the frame floor, since the sheet dissolves where it stands (useDraggableSheet, DISSOLVE_MS) and nothing moves. An opening is still held.

## Checks

- lib/player/__tests__/wordsWake.test.ts: 8 tests; **3 fail on the old LiveCaptions** (with the new module present), **8 pass on the new**. The six tests that read LiveCaptions as text: 143 passed.
- typecheck exit 0 (0 errors). eslint clean on the 4 files. Whole suite: **1204 files passed, 1 skipped; 15,208 tests passed, 9 skipped.** Push guard passed (1m 30s). No CSS or server file, so no web build.
- Exports: **export 1** cut from 0b26ea61d (the head as handed); **export 2** cut from 1e84aa0f7. Both exit 0 with 7,372 files; the key is the anon role, never printed (0 key-shaped strings in either log). The minified paced clock and the seen check are in export 2's words chunk.

## The film, before and after (390x844, CPU 4x)

| | export 1 (old) | export 2 (mended) |
|---|---|---|
| close, motion on | sheet gone 453ms; **55 to 142px in that one frame** (100ms frame); FAIL | sheet gone 450ms, words still at 55; **glide 79, 89, 106, 118 ... 142 by 838ms, 15 frames, biggest step 24px**; PASS |
| Cover to Words, motion on | 87px at 123ms, panel 0 then 0 (unseen); fade from 185ms | the same: 87px at 117ms, panel 0 then 0 (unseen) |
| close, reduced | 87px at once, 234ms | 87px at once, 241ms (unchanged) |
| Cover to Words, reduced | 208px at once, panel 0 then 1 | 208px at once, panel 0 then 1 (unchanged) |

## The walk on export 2

- `--motion reduce --check`: **PASS**. The close is no longer held; Words opened 79 frames / 6 dropped / longest 67ms; Words closed 63 / 30 / 67, the sheet gone at 209ms.
- `--check` (motion on), run 1: **FAIL (1): Words closed, 15 frames in 388ms until the sheet had gone (at least 16)**, 11 dropped, longest 150ms (12 distinct times). Everything else passes. The window ends before the words wake (434ms), so the mend cannot reach it. The frames went to a long frame at the tap: **139ms, 100ms of script, 95ms of it the Close button's click handler** (round 5: 132ms and 77ms, passing at exactly 16 of 16). Run 2: still running when this page was first pushed; its result follows in the next commit.

## Open, with owners

1. **The motion-on close's work at the tap** (the arbiter routes it; the click handler is NowPlayingSheet's, AmbienceSheet's or the house Sheet's, not mine): 95ms of script in one click at CPU 4x puts the close's floor at the margin, 15 or 16 of 16.
2. **A version chosen under the voice sheet** (LiveCaptions' next owner; not walked): while the words are inactive the `[source]` effect sets them to the top, so on the sheet's close they now glide from the top to the line, where before they jumped there in one frame.
3. **The other sheets over the player** (its ••• sheet, sleep, voice) wake the words through the same effect and now glide the same way. Only the ambience close was filmed.
4. Updates 67's lead (the memo redraws every row when `active` changes) was not needed: the glide dropped nothing that mattered (15 frames of movement, biggest step 24px).

## Gotchas

- The film reads the Words panel's opacity from getComputedStyle. It holds at 0 until the compositor starts the fade, so the frames just after the click read 0. The screencast agrees.
- While an export builds, git shows 1,457 website-only files as deleted. The stop hook asked twice to commit them; never do.

## Where things are

scripts/ambience-open-walk.mjs (`--film`, the reduced-close rule), lib/player/wordsGlide.ts, lib/player/__tests__/wordsWake.test.ts. The films' frames and logs were in this session's scratchpad (before-on, before-reduce, after-on, after-reduce, check-on, check-on2, check-reduce); the numbers above are the record.
