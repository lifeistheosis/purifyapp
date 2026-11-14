# Baton: Updates 48 (a fixer: build 97 note 1, and note 7's zero)

Written 2026-11-14 by Updates 48 (session_01VuYTwaC5yzr2gceBn24Ecz), reporting to Arbiter 8 (session_01VuYTwbzbjqscbFvEseu6uP). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Stopped at its line with the round's checks open: get_session read 91,149 all session, so by the brief's rule (its own count times two) it was past 200,000. The code is pushed; the export, the walk, checkMock and the web build are not done (Open, below).

## Done (each with a test that fails on the old code)

1. **Note 1, the prayer pages' lit line and its click, 65441843.**
   - (a) The line lit is the one over the band's middle on every prayer page (`LIT_AT = KEPT_AT`, 0.5, in `lib/ui/readingPlace.ts`); it was two fifths down (`READING_PLACE`). Begin and Your rule today stand a prayer's first line there (`goToPrayer`, align `"top"`, the only user of that align), so the line they land on is the one lit. Every other way of going somewhere keeps the reading place. Near the foot the place still slides down with the last lines (`litShare`, `lib/prayers/easyScroll.ts`).
   - (b) The click is decided in the same frame, from the same line: `components/prayers/service/useLitLine.ts` lights the line, then asks `clicksFor(reached, now)` in the same call, so the click comes as the glow lands in a new prayer, which moving down is its first line. `useEasyScroll.ts` is gone: it clicked when a prayer's box (its name and the room above it) reached two fifths down a band read only on resize, while the glow was still on the prayer before. With motion off nothing is marked and the line is still followed for the click. `readyTicks()` (`lib/ui/scrollTicks.ts`) loads the haptics plugin as the page opens, so the first click does not wait on it.
   - (c) Not done, not mine: the page never moves by itself (his answer waits).
   - Tests: 11 fail on the old code (`lib/prayers/__tests__/easyScroll.test.ts`, `lib/ui/__tests__/readingPlace.test.ts`, `prayerPages.test.ts`, `immersive.test.ts`), among them a pixel-by-pixel walk of two prayers: the clicks come exactly on each first line, none where the old box measure clicked.
   - The export walk's section 55 gains the check (not yet run, Open 2).
2. **Note 7's zero, d8c7e610.** "0 of 89 days read" over an empty bar on a plan's own page (`components/plans/PlanPath.tsx`) and the empty bar on the plans list's Continue card (`components/plans/PlansClient.tsx`): both now show from the first day read, nothing before. No new words. The streaks were already shown from one; catchUp never returns 0. Test: `lib/ui/__tests__/fifteenScreens.test.ts`, "No zero as a first sight", fails on the old code.

The push guard on 65441843..d8c7e610: stylesheet tests, typecheck, eslint (14 files), unit tests related to 14 files, all ok. The whole suite's count is in the report to Arbiter 8.

## Open (owner: the next fixer, on the arbiter's word)

1. **One export of the head** (`npm run build:android`, or `node scripts/gate/export.mjs` as Updates 46 did).
2. **The walk:** `node scripts/export-walk.mjs out --sections 55`. The new block walks Morning prayers, the First Hour and Evening prayers at 390 with real touch, motion on and off: Begin stands the first prayer's first line over the middle; every click is caught in a `navigator.vibrate` stub, where the line over the middle must be a new prayer's first line just arrived, and with motion on the line lit in that frame. Its band is a copy of `visibleBand` in the init script; if a NO comes, check that copy first.
3. **The plans, tapped:** on `/plans/four-gospels/` begun, at 390 with real touch: no count and no bar; Mark day 1 read gives "1 of 89 days read" and the bar; untick returns to nothing. On `/plans/`, the Continue card's bar from one.
4. **checkMock `{ pixels: true }`** on the touched screens: a prayer page with a line lit (Begin tapped, motion on), a plan's page begun with none read and with one, `/plans/` with the Continue card; at 390, 800 and 1032, the five palettes, the two earned and the fourteen looks, English and Arabic. Runner to adapt: `docs/handoffs/updates-46-runners/mockrun46.mjs` (states by name).
5. **The web build** (`npm run build`): `lib/ui/readingPlace.ts` and `lib/ui/scrollTicks.ts` are shared, and `app/globals.css` changed (comments only).
6. **His phone only:** the click's feel and timing with the glow (Android's 10ms pulse, iOS's selection click).

## Gotchas

- Moving back up, the click comes as the glow enters the prayer before, at its last line, the frame that prayer comes forward; moving down it is the first line, as the brief has it. A fling that carries a first line past the middle between two frames clicks on the first line the glow lands on in that prayer.
- A landing from Your rule today still clicks once as the glow lands, as the old code did: the hook's first read is at the page's top, before `goToPrayer` jumps.
- Left as they were: the count of prayers passed (`usePassedSteps.ts`, at the reading place; nothing on screen marks a single prayer), the history thread's clicks (`components/history/useStepClicks.ts`), the Bible's Candlelight line (`lib/reader/useReadingLine.ts`).

## His words that still apply

- Note 1 (about 15:56): "it should glow the quite in the middle of the users screen. and also the haptic feedback should move you and glow to the next section (rather than haptic feedback on a arbitrary feeling line with no visual hook)".
- Note 7 (about 16:14): "we need a better plans design" (the design waits on the Fable round).
- 16:28: "fix those things. try and take into account usage also". 13:57: check only what you touch.
