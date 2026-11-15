# Baton: Updates 92 (three Arabic lines over a picture, the checker's backdrop, /set-password/'s blank)

Done 2026-11-15. Started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ) at about 11:00 UTC. The mends: `8a9102a4` (the app), `dfef8f11` (the checker, the walk's `--every`, the runners), `79e380c6` (First focus's class order). One export of `79e380c6` (`node scripts/gate/export.mjs`, exit 0). The runners: `docs/handoffs/updates-92-runners/` (`guard92.sh`, `walk92.sh`).

## The causes, as proved

1. **Fault A, /account/ in Arabic on Light, 4.50:1** (`components/you/YouIdentity.tsx:57`). The line already wore the house's halo at the whole ink. The halo's three layers (1, 3 and 6px) are blurs of the letters, so under a stroke a pixel wide they cover only about three quarters of the ground, and the picture shows through the rest. Arabic's strokes at caption size are the thinner, and the mirrored line stands over the ladder's dark rungs at the picture's right, so the least kind hundredth under its letters sits lower in Arabic (4.50 on Light, 4.58 on Candlelight) than in English (6.27).
2. **Fault D, /settings/ in Arabic on Candlelight, 4.29:1** (`components/settings/FirstFocus.tsx`). First focus's card names wore no halo at all: only the wash's dark foot was under them. "Daily quiet" in Arabic climbs above that foot at 800 and 1032.
3. **Fault E, /plan/ in Arabic at 1032, 4.40 to 4.49:1.** A reader with no plan is sent from /plan/ to /premium/, and the line is the plan card's yearly price ("premium.orPerYear", drawn by `components/premium/PlanWords.tsx`) inside `PriceBlock`'s sub line at the card's 50 of the ink (`app/(app)/premium/page.tsx:233`), not PlanScreen's gradient. The card is the same dark island on every palette (`premiumCardBg`). At 50 the line reads 4.44:1 on Plus's lit head on Dark by the tokens, beside the 4.49 measured; Monastery's ink is the dimmer.
4. **Fault B, the checker** (`scripts/mock-check.mjs`). `groundOf` took a word's ground from its own and its parents' backgrounds, and from a parent's own `::before` or `::after` face. EIKON's room is a sibling fixed to the screen (`EikonBoutique.tsx:63`, `fixed inset-0 -z-10`), so every parent of the words was clear and the walk reached the body's paper on Light.
5. **/set-password/'s blank of 22 frames: the cause I mended is disproved by the walk after it (see After).** As first read (`lib/auth/signedHold.ts`): with no session kept on the device the hold raced `resolveUser()` against `HOLD_MS` (600 ms). The gate (`AccountAuthGate`) draws its waiting line only when the hold returns null (the bound passed first) or undefined (not held: not hydrated, not native, or a session kept); in a switch inside the shell with no session kept, only the first is possible. On a cold client `resolveUser()` builds the Supabase client, takes its lock and looks for the stored session on a main thread busy with the switch, so it can outlast the bound. Then the gate drew its waiting line, and its own read sent the reader on to sign in a moment later: the 22 frames. Proved in the code; the old build was not timed (that needs an export of the old code, and the brief allowed two at most).

## The mends

- **A:** `.words-halo.words-halo-close` in `app/globals.css`: the house's three layers and a second at 1px, no wider (Light's paper and an old WebView's plain colours too). The line wears it. It lays the ground under thin strokes almost whole and reaches no further than the first layer.
- **D:** First focus's card names wear `words-halo`, at the end of the class (the lit panels' test reads the class from its start).
- **E:** the yearly line is drawn at 65 of the ink (`PlanWords.tsx`). On Candlelight and two looks the card already draws 50 and 65 at the same raised share (70 and 62), so no palette is drawn fainter.
- **B:** a fixed or absolute sibling of the words or of a parent, drawn whole, covering the words and painted under them (a negative z-index under the flow, or under the words' own placed box, or the same z-index and earlier) is their ground. One under the flow lies under the backgrounds of the boxes between it and its stacking context, and over the canvas (where the body's background goes when the root draws none). A picture is said, as a face's is.
- **/set-password/:** `signedOutAtOnce`: with no session kept the hold answers signed out at once, as YouMobile and `lib/shop/signedOutAtOnce.ts` already do, and the reader goes straight from the page they left to sign in. A device with a session kept is never held and arrives as before. The same hold serves the account pages and /plan/, which now go on at once too.
- Outside the brief's files, said here: `scripts/guardrail-walk.mjs` gains `--every` (all 21 palettes and looks), because its default and `--light` reach 14 of the 21.

## Tests that fail on the old code

- `lib/auth/__tests__/signedHold.test.ts`: 2 new (goes on before any bound passes; the hook asks no session read while it holds). 2 of 12 fail on the old code.
- `lib/ui/__tests__/wordsOnPictures.test.ts`: First focus in the words that wear the halo, and the close halo under You's line. 2 of 18 fail on the old code.
- `lib/premium/__tests__/yearlyLine.test.ts`: new; the share, and the ratio on the card's lit head at its fullest from the tokens (Dark and Black 5.76, Monastery 4.97 at 65; at 50, 4.11 and 3.62). 2 of 2 fail on the old code.
- `scripts/mock-check.mjs --self-test`: a new case on Light: white words on a backdrop beside them pass, and white words whose parent lays paper over it fail.

## Checklist

- `npm run typecheck`: 0.
- `npm run test:unit`: 1,223 files passed, 1 failed (`litPanels.test.ts`, First focus's class order; mended in `79e380c6`, and it and `wordsOnPictures` then 42 of 42). 15,317 tests passed, 9 skipped.
- eslint on every changed file: clean.
- `npm run build` (web): exit 0, 6,526 of 6,526 pages.
- Push guard: passed (`4ceaa90a..79e380c6`).
- Export of `79e380c6`: exit 0.
- `node scripts/mock-check.mjs --self-test`: exit 0, "every mistake caught, and the house's own parts pass", the new case: "a backdrop beside the words, on Light: read under the white words, and under the paper laid over it".

## After: on that export

Records in `docs/handoffs/updates-92-runners/` (`*.json.gz`, and the two stills of the blank).

**checkMock with pixels, all 21 palettes and looks** (`guard92.sh`, `--every`, `--online`, two workers). Nine of the twelve runs finished; the chain was stopped at the two-hour limit for a background job during the tenth (open reader, ar, 800: its record is written but may be partial). Not run: the open reader at 1032, en and ar.

| screen | before (Gate 4b, 7 palettes) | now (9 runs, 21 palettes) |
|---|---|---|
| /settings/ (D) | 4.29:1 on Candlelight, ar, new reader, 800 and 1032 | **0 failures** in every run, those two included |
| /plan/ (E) | 4.40 to 4.49:1, ar, 1032, both readers | **0 failures** in every run (new reader ar 1032 included; the open reader's 1032 not run) |
| /account/ (A) | 4.50:1 on Light, all six Arabic runs | **0 at 390** (ar, both readers). **At 800 and 1032 in Arabic: 3.99:1 on Light and the six light looks** (Jordan, Blush, Roses, Lavender, Olive, Stone), in new ar 800, new ar 1032 and open ar 800. **Not mended there.** |
| /shop/eikon/ (B, the checker) | 27 lines at 1.15 to 1.22:1 on Light | **18 to 23 lines at 1.10 to 1.22:1 in every run**, on Light, the six light looks and Linen. **The checker's mend does not reach EIKON's real tree.** |

**The walk** (`walk92.sh`, /set-password/'s switch from /, one worker, no network, four runs each):

| | motion on | reduced |
|---|---|---|
| open reader | 1 of 4 blank (run 2: 22 frames, 370 ms, from 150 ms after the tap) | 0 of 4 |
| new reader | 1 of 4 blank (run 1: 22 frames, 373 ms, from 161 ms after the tap) | 0 of 4 |

Every run walked 1 of 1 screens with 0 errors; no other finding. **The blank is not mended.**

## Left

- **/set-password/'s blank, 2 of 8 with motion on, 0 of 8 reduced.** The bound was not the cause: the blank begins 150 to 161 ms after the tap, well inside 600 ms, and the stills (`mw-new-1-…png`, `mw-open-2-…png`) show the gate's own "Loading your account." drawn in the auth frame, then Sign in fading in. So the gate rendered without the hold. With no session kept and the native agent set (`isNativeClient` reads the agent), the one way left in `useSignedHold` is `hydrated` false at the gate's first render: the gate mounting as hydration (for example a hard load of the export's HTML for /set-password/, whose HTML draws that same line) rather than inside the soft switch. Not proved. The next probe: on the switch, log whether the document reloads (a `pagehide` or a new `performance.timeOrigin`) and the gate's first `hydrated`, motion on, four or more runs. `signedOutAtOnce` stays: it takes the session read out of the hold, and its tests pass.
- **Fault A at 800 and 1032 in Arabic: 3.99:1 on Light and the six light looks.** The close halo mended 390. Whether 800 and 1032 were lower than 4.50 before is not known (Gate 4b quoted the least at 390 on seven palettes). Wider pictures put the mirrored line over darker rungs; the halo alone does not hold it. A soft wash of the page's ground under the line (the hero's own `you-hero-shade-top` way) is the likely mend, measured at 800 and 1032.
- **Fault B, the checker, on EIKON's real page.** The self-test's backdrop case passes, but /shop/eikon/ still reads 1.10 to 1.22:1 on the eight light palettes. Not proved why. Likely: the walk meets an opaque background before the backdrop's stacking root (on Light the house's ground, `bg-night`, is paper), or the root's own background (html) is read above it, or words scrolled past the first screen fall outside the fixed layer's box as measured (a layer fixed to the whole screen covers every word that is on screen). The next step is a probe of EIKON's tree on Light: each ancestor of "EIKON" (the h1) with its background, position, z-index and whether it stacks.
- **Not run:** the open reader's checkMock at 1032 (en and ar), and the tenth run may be partial. A second export was not cut: my count was past 150,000.

## Budget

get_session read 103,424 from the first hour until the end (it stopped moving, as the brief warned), then 246,204 at the last read. My own count passed 150,000 while the checklist ran and was about 195,000 at the end. After 150,000 I ran only the plan's own steps (the push, the one export, the self-test, the walk and checkMock), all in the background.
