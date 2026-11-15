# Baton: Updates 92 (three Arabic lines over a picture, the checker's backdrop, /set-password/'s blank)

Done 2026-11-15. Started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ) at about 11:00 UTC. The mends: `8a9102a4` (the app), `dfef8f11` (the checker, the walk's `--every`, the runners), `79e380c6` (First focus's class order). One export of `79e380c6` (`node scripts/gate/export.mjs`, exit 0). The runners: `docs/handoffs/updates-92-runners/` (`guard92.sh`, `walk92.sh`).

## The causes, as proved

1. **Fault A, /account/ in Arabic on Light, 4.50:1** (`components/you/YouIdentity.tsx:57`). The line already wore the house's halo at the whole ink. The halo's three layers (1, 3 and 6px) are blurs of the letters, so under a stroke a pixel wide they cover only about three quarters of the ground, and the picture shows through the rest. Arabic's strokes at caption size are the thinner, and the mirrored line stands over the ladder's dark rungs at the picture's right, so the least kind hundredth under its letters sits lower in Arabic (4.50 on Light, 4.58 on Candlelight) than in English (6.27).
2. **Fault D, /settings/ in Arabic on Candlelight, 4.29:1** (`components/settings/FirstFocus.tsx`). First focus's card names wore no halo at all: only the wash's dark foot was under them. "Daily quiet" in Arabic climbs above that foot at 800 and 1032.
3. **Fault E, /plan/ in Arabic at 1032, 4.40 to 4.49:1.** A reader with no plan is sent from /plan/ to /premium/, and the line is the plan card's yearly price ("premium.orPerYear", drawn by `components/premium/PlanWords.tsx`) inside `PriceBlock`'s sub line at the card's 50 of the ink (`app/(app)/premium/page.tsx:233`), not PlanScreen's gradient. The card is the same dark island on every palette (`premiumCardBg`). At 50 the line reads 4.44:1 on Plus's lit head on Dark by the tokens, beside the 4.49 measured; Monastery's ink is the dimmer.
4. **Fault B, the checker** (`scripts/mock-check.mjs`). `groundOf` took a word's ground from its own and its parents' backgrounds, and from a parent's own `::before` or `::after` face. EIKON's room is a sibling fixed to the screen (`EikonBoutique.tsx:63`, `fixed inset-0 -z-10`), so every parent of the words was clear and the walk reached the body's paper on Light.
5. **/set-password/'s blank of 22 frames** (`lib/auth/signedHold.ts`). With no session kept on the device the hold raced `resolveUser()` against `HOLD_MS` (600 ms). The gate (`AccountAuthGate`) draws its waiting line only when the hold returns null (the bound passed first) or undefined (not held: not hydrated, not native, or a session kept); in a switch inside the shell with no session kept, only the first is possible. On a cold client `resolveUser()` builds the Supabase client, takes its lock and looks for the stored session on a main thread busy with the switch, so it can outlast the bound. Then the gate drew its waiting line, and its own read sent the reader on to sign in a moment later: the 22 frames. Proved in the code; the old build was not timed (that needs an export of the old code, and the brief allowed two at most).

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

Running at the time of this draft: the walk (`walk92.sh`), then checkMock on all 21 (`guard92.sh`). The numbers follow in the next push of this file.

## Left

To follow with the numbers.

## Budget

To follow.
