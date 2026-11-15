# Baton: Updates 88 (the held screen's wake, and the reduced Community arrival, 1.9)

Written 2026-11-15 by Updates 88 (session_01VuYTwaG7qBZAdSVCiaEKc2), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). get_session read 91,909 from 05:30 and never moved, so the budget was kept by my own count, which passed 150,000 before the after measures; nothing new was started past it but the plan's own step 6. Measure 4 (the website) was not run.

## Commits

- **b0d5d194**: both mends, their tests and the two runners (pushed; the guard passed in 47s).
- **3e096d81**: the held screen's wake taken out again. It did not shorten the wait on export 2 (below).
- This file.

## Item 1: the held screen is parked, as proved

- **In React's code** (Next's compiled react-dom, `react-dom-client.production.js`): `scheduleUpdateOnFiber` calls `markRootUpdated` (which clears every suspended lane) and then, when the root's last render ended suspended with delay (`4 === workInProgressRootExitStatus`), `markRootSuspended` on that render's lanes again. `markRootSuspended` also clears their pinged bits (`root.pingedLanes &= ~suspendedLanes`), and the ping listener is removed once it has fired (`pingSuspendedRoot`, `pingCache.delete`). The language promise resolves once, so a held move whose ping was spent this way is tried again only when some later update clears the marks.
- **On export 1** (the head 655d8102, ar, 390x844, CPU 4x, the apps' agent, a new reader; `open88.mjs`, ms after navigation). The runner's path (the front door at /, then a router push): the reader's words go in at 1,500.9, 1,381.5 and 2,000.6, and Saints is drawn at 2,633.6, 2,541.1 and 3,385.8: **1,133 to 1,385ms of waiting after the words are in.** Within the bound on this machine (by 922, 913 and 551ms); it is faster than Updates 87's, so compare within this file.
- **The direct open is not parked** (measure 3): Saints drawn 34, 21 and 19ms after the words go in. Updates 87's change keeps Today from drawing on that path, so no update lands on the held move.

## Item 1: the mend tried, and taken out

`lib/i18n/heldScreenWake.ts`, called from `RouteLanguageHold` (`components/i18n/LaunchLanguageGate.tsx`):
- The hold says when it holds a screen (`heldScreenHeld`, before `use`) and when a screen is committed (`heldScreenDrawn`, in a layout effect).
- Once the language is settled, and only if a screen was held, the hold gets its own update: `startTransition(nudge)` on a `useReducer`, in a later task, again after 120ms while the screen is not drawn, three times at most. Any update clears React's suspended marks, so the held move is tried with it.
- **Why this way.**
  - It is the least visible: it draws nothing. The children are the same element, so React goes no further than the hold.
  - It is a transition, as the move is, so it never interrupts the screen's own render. A default-priority update would.
  - It is bounded, apps only, front door's document only, and only after a held render.
  - Holding the commit instead is not offered by React: the only commit-suspending paths are suspensey resources (stylesheets with precedence), which would put a stand-in resource in the page.
- **It did not work, so it is out (3e096d81).** On export 2, Saints on the runner's path waited 1,669, 1,542 and 1,393ms after the words went in (1,133 to 1,385 before). The frames show the main thread idle until one long frame of 253 to 290ms (Saints' render) just before it is drawn, before and after alike. So the wait is not the parked lanes the wake answers.
- **Left, not proved:** what Saints waits for. Updates 87's trace had "a timer, then a chunk evaluated, then React's update". One reading: the screen waits on a code file the ready-ahead (`lib/nav/readyAhead.ts`, which loads files as script elements in idle steps after settle) has claimed, so it is run only at the ready-ahead's next step. That is not my file and not traced.
- 61af8a5e and ff3aa6d1 are untouched.

## Item 2: the reduced Community arrival, as proved

- **Not the language hold.** On export 1, Community is drawn 57 to 82ms after the router push. The language had settled long before, so nothing was held.
- **The cause is where the ask was mounted.** `useAskCampaignsAtFirstLaunch` was called by AppFrame, the (app) group's frame. Today (`app/page.tsx`) is outside that group, so a cold start at Today asked nothing (`door88.mjs`: 0 asks on the walk's first open of /, 4 of 4, so the walk's kept storage holds no answer).
- So the first switch into Community asked as Community was drawn, with the held place up (60px). The no closed it:

| export 1, reduced | Community drawn | place closes | layout shift |
|---|---|---|---|
| online, run 1 | +82 | +302 | 0.0783, SECTION y 197 to 120 |
| online, run 2 | +58 | +152 | the same |
| offline, run 1 | +62 | +109 | the same |
| offline, run 2 | +57 | +99 | the same |

- Why Gate 3c's runs on f637f7b8a counted 0 is **not proved**. No app code that asks, nor Today, RootFrame or ReadyAhead, changed between f637f7b8 and the head; the place closes after Community's first frame, online and offline, on export 1.

## Item 2: the mend

- The ask moves from AppFrame to RootFrame, which every page has, Today among them. It is one line, outside my listed files, moved from AppFrame's call.
- `useAskCampaignsAtFirstLaunch` is unchanged: no one asks in a closed build, nor once an answer is kept.
- Updates 78's door pre-paint (bf862330) is untouched.

## The tests, failing on the old code

With the five app files put back (heldScreenWake.ts moved aside, the four others stashed) and the tests kept:
- `lib/i18n/__tests__/heldScreenWake.test.ts` did not load: `Cannot find module '../heldScreenWake'`. It went out with the wake in 3e096d81.
- `lib/campaigns/__tests__/askAtFirstLaunch.test.ts`: 2 of 2 fail.
- On the new code both pass, beside `arrivesWhole`, `heldScreenCost`, `firstFrameLanguage`, `rootFrame` and `doorPrepaint`: 7 files, 68 tests.
- `lib/ui/__tests__/arrivesWhole.test.ts` pinned the ask in AppFrame. It now pins it in RootFrame, with the reason beside it.

## The checklist (on b0d5d194)

- typecheck **0**; eslint on the 8 changed files **clean**.
- `npm run test:unit` **exit 0**: files 1,217 passed, 1 skipped; tests 15,293 passed, 9 skipped.
- `npm run build` **exit 0**, 6,526 of 6,526 pages.
- 3e096d81 only takes out the wake: the hold is back to its own code, and two files go. The guard ran typecheck, eslint and the related tests on it.
- Not run: checkMock with pixels and the taps. Nothing drawn changed, only when the ask goes out.

## The measures

Export 1: 655d8102. Export 2: b0d5d194 (the wake still in). Both by `node scripts/gate/export.mjs`, exit 0. `open88.mjs`: 390x844, CPU 4x, the apps' agent, a new reader, reads in rAF, ms after navigation. One before open overlapped a 1.5s vitest run.

| ar | before (export 1) | after (export 2) |
|---|---|---|
| Saints, runner's path: words in / drawn | 1,500.9 / 2,633.6; 1,381.5 / 2,541.1; 2,000.6 / 3,385.8 | 1,685.2 / 3,354.0; 1,719.4 / 3,261.5; 1,596.4 / 2,989.8 |
| Saints, direct open: drawn | 2,226.6; 2,273.4; 2,399.8 | 2,628.1; 2,255.5; 2,265.6 |
| Community, direct open: drawn | 1,485.8; 1,844.2; 1,801.4 | 1,618.1; 1,553.9; 1,903.3 |
| Today, direct open: first mark, under the slate | 1,542.6; 1,576.6; 2,010.4 | 1,869.9; 1,817.5; 1,528.7 |

- Every open, both exports: within the language bound, `dir` rtl before the first contentful paint (or rtl from the start), and the first words drawn in Arabic. Today's first mark is the saint's name, in English by design.
- **Measure 3, the direct open:** Saints is drawn 19 to 40ms after the reader's words go in, before and after; Community 3 to 7ms. Updates 87's change holds on this path: nothing waits there.
- English, once each, on export 2: Saints 2,704.0 (runner's path) and 2,188.9 (direct); Community 1,263.2; Today 1,397.8. No export-1 English reads, so "unchanged" is not shown.
- **Item 2, `door88.mjs`** on export 2: the first open of / asks (4 of 4).
  - Online, it keeps the no, and Community is drawn with no place: the sign-in section stands at 120 from its first frame. No moves and no layout shifts, reduced 2 of 2 and motion on 2 of 2.
  - Offline: no place either. **Fault, named, not mended:** a 0.0021 layout shift of a DIV from y 343 to 347 at 107 and 138ms, offline only. Not the door.
- **The motion walk** (`scripts/motion-walk.mjs out --only /community/ --controls "Ask a Priest" --online`, both readers, motion on and `--reduced`, twice each): **8 of 8 runs, 0 arrival fails, 0 findings, 0 errors.**
- **Measure 4 (the website's faces in ar): not run.** My count was past 150,000.

## Left, for the arbiter to route

1. Saints on the runner's path waits 1.4 to 1.7s after its words, idle, then renders. The cause is not proved; the ready-ahead's script loads are the first thing to trace.
2. The 4px DIV shift on Community's arrival, offline only.
3. Measure 4, and checkMock with pixels and the taps.

## Where things are

- The ask: `components/layout/RootFrame.tsx` (the call), `lib/campaigns/useCampaignsOpen.ts` (its comment); `components/layout/AppFrame.tsx` no longer calls it.
- The tests: `lib/campaigns/__tests__/askAtFirstLaunch.test.ts`, `lib/ui/__tests__/arrivesWhole.test.ts`.
- The runners: `docs/handoffs/updates-88-runners/open88.mjs` (`open@` and `direct@<lang>@<path>`) and `door88.mjs` (`<out> <on|reduce> [runs] [offline]`). Logs and JSON were in this session's scratchpad; the numbers above are the record.
