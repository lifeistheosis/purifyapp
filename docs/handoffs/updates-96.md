# Baton: Updates 96 (/set-password/'s blank, /account/'s line at 800 and 1032)

Done 2026-11-15. Started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ) at about 13:30 UTC. The mend: `569b04e3` (pushed after `8540ab25`). One export of `569b04e3` (`node scripts/gate/export.mjs`, exit 0). The runners: `docs/handoffs/updates-96-runners/` (`walk96.sh`, `guard96.sh`).

## The causes, as proved

1. **/set-password/'s blank of 22 frames: React's replay, not the bound and not a hard load** (`lib/auth/signedHold.ts`, `useSignedHold`). Proved with the real react-dom 19.2.4 (the version Next's compiled copy carries too) in `lib/auth/__tests__/signedHoldReplay.test.ts`: a transition into a signed page whose hold sends the reader on commits the gate's waiting line, then sign in. On the old code the test records `/`, the waiting line, `/set-password`, `/signin`: the order of Updates 92's stills (Today dimmed, the auth frame with "Loading your account.", the crossfade, Sign in).
   - The steps, read in `node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.production.js`: a `use()` that suspends is always first put aside as reason 3 (`handleThrow`), which yields as reason 7. The hold's answer comes in that moment: `leave("push")` calls `router.push`, and `scheduleUpdateOnFiber` restarts a render only when it is waiting as reason 2 or 9, so the push is queued and the render is kept. When the hold's promise has resolved, React replays the gate (`replaySuspendedUnitOfWork`) with the promises it was given the first time, and `trackUsedThenable` keeps the first one at a place when handed another. The hold handed `use` its own promise first and `NEVER` on the replay, so `use` returned the first, resolved, and the hook fell through to `null` ("the bound passed"). The gate drew its line, the tree committed, and the queued push to sign in followed.
   - Why it is 2 in 8 and not every run is not proved. It needs the gate's own wait to be the one React puts aside and replays; a render that is first stopped by something else (a script for the new page still loading) starts again from the top after the push. That is a likely reading of the odds, not a measurement.
   - A hard load is ruled out by the stills: the shell answers every address without an extension with the front door's document (`scripts/lib/shell-server.mjs`), so a reload would have drawn Today, not the auth frame.
2. **/account/'s line in Arabic at 800 and 1032, 3.99:1 on Light and six light looks** (`components/you/YouIdentity.tsx`). Updates 92's reading stands: the close halo's blurs cover only part of the ground under thin Arabic strokes, and the mirrored line stands over the picture's dark rungs when the picture is wider. Not measured again before the mend (no export of the old code); the mend does not depend on the picture.

## The mends

- **The hold** (`lib/auth/signedHold.ts`): one promise per hold, resolved only when the page is to draw (an answer that is not a way on, or the bound); a hold that sends the reader on hands back that same promise and never resolves it. The hook asks the hold again after every wait and returns only an answer, so a promise React hands back from an earlier attempt is never taken for one. A device with a session kept is never held, as before.
- **The line** (`app/globals.css`, `.you-hero-line` on the line in `YouIdentity.tsx`): on Light and the light looks only (they all run on Light's reading mode, `html[data-reading-mode="parchment"]`), a soft wash of the page's ground at 70 under the line: a band behind the words, the width of the hero, fading over its gutters and half a rem above and below, drawn under the halo, moving nothing. From the tokens, over a pixel as dark as black and before the halo, the line reads 5.78:1 at the least (Stone; Lavender 5.80, Blush 5.81). The dark palettes and looks are not touched.

## Tests that fail on the old code

- `lib/auth/__tests__/signedHoldReplay.test.ts` (new, the real react-dom): 1 of 1 fails on the old code.
- `lib/auth/__tests__/signedHold.test.ts`: a new case (on the way on, the hold keeps the one promise it first held on and never resolves it). With the replay test, 2 of 14 fail on the old code.
- `lib/ui/__tests__/wordsOnPictures.test.ts`: a new case (the wash: scoped to Light's mode, behind the words, at least 5:1 over black on the eight light palettes from the tokens) and the line's class. 2 of 19 fail on the old code.

## Checklist

- `npm run typecheck`: 0 (the first run caught the new test's stub router type; mended before the commit).
- `npm run test:unit`, the whole suite alone, after the last change: 1,226 files passed, 1 skipped (1,227); 15,329 tests passed, 9 skipped.
- eslint on the six changed code and test files: clean.
- `npm run build` (web, the stylesheet changed): exit 0, 6,526 of 6,526 pages.
- Push guard: every check passed (25s), `8540ab25..569b04e3`.
- Export of `569b04e3`: exit 0.

## After: on the export of `569b04e3`

Records in `docs/handoffs/updates-96-runners/` (`*.json.gz`). No stills: nothing failed.

**The walk** (`walk96.sh`, the switch into /set-password/ from /, one worker, no network, six runs each):

| | motion on | reduced |
|---|---|---|
| open reader | 0 of 6 blank | 0 of 6 |
| new reader | 0 of 6 blank | 0 of 6 |

Every run walked 1 of 1 screens with 0 errors and no finding. Every switch changed the screen as Updates 92's did (0.257 of it, with the view transition's four names), so the reader went on to sign in rather than being held on Today. Before (Updates 92, the export of `79e380c6`): 2 of 8 with motion on, 0 of 8 reduced.

**checkMock with pixels, /account/ alone, all 21 palettes and looks** (`guard96.sh`, `--every`, `--online`, two workers), both readers, en and ar, at 390, 800 and 1032: **0 failures and 0 errors in all 12 runs.**

| the line | before (Updates 92) | now |
|---|---|---|
| ar 800 and 1032, Light and the six light looks | 3.99:1 | 8.32 to 9.06:1 (Linen 10.65 to 10.97) |
| ar 390, the same | passing | 9.49 to 10.06:1 |
| en, the same, all three widths | passing | 9.57 to 10.70:1 |
| least of all 21, per run | | ar: 5.69 (390), 6.55 (800), 5.64 (1032), on Candlelight and Cappadocian, which the wash does not touch; en: 6.17, 7.63, 7.39 |

The page's least line in every run is "Learn by heart" at 4.92 to 5.01:1 on Mosaic or Incense (passing; not this line).

## Left

- **Item 3 (checkMock's backdrop on /shop/eikon/'s real tree): not started.** My count was past 150,000 when the rest was done. Updates 92's next step stands: probe each ancestor of the h1 on Light (background, position, z-index, whether it stacks).
- Why the blank came in about 1 run in 4 to 8, and not every run, is a reading, not a measurement (see cause 1). The mend does not depend on it: no hold hands React a different promise at the same place any more, and the test walks the replay itself.
- The line's dark palettes were measured, not changed: the least there is 5.64:1 (Cappadocian, ar, 1032).

## Budget

get_session read 91,896 from the first read to the last (it never moved). My own count was about 100,000 when both mends passed their tests, about 150,000 when the push and the export were done, and about 170,000 at the end. Past 150,000 I ran only the plan's own steps (the walk, checkMock, the baton and the report).
