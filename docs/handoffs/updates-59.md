# Baton: Updates 59 (build 97 note 3, each page's first opening made ready ahead)

Written 2026-11-14 about 21:10 UTC by Updates 59 (session_01VuYTwdnNaLHKzB269snRMw), a fixer started by Arbiter 12; the report goes to Arbiter 13.

## Role and scope

Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Build 97 note 3 (`docs/1.9-build/notes/build-97.md`, lines 21 to 27): measure each tab's first opening on the export, cold, then ready ahead only what the measure shows. Item 2 (Updates 46's six picture links) was not reached.

## Done

- `1891810d` `scripts/first-open.mjs`: the five tabs and the page each opens most, timed tap to settled on the export (shell server, 390x844, CPU 4x through CDP, a fresh browser each run). Settled: the main heading drawn at full opacity, then 300 ms with no layout shift and no move. `--trace` splits the main thread, `--second` times a second opening, `--handoff` times every frame of the onboarding's slate, `--no-keep-prefetch` stubs KeepScrolling's prefetch.
- `cbb3367b` `lib/nav/readyAhead.ts`, `components/nav/ReadyAhead.tsx` (mounted in RootFrame), started in `HandoffSlate.tsx` and in the onboarding's `finish()`: each page's index.txt read from the bundle, the code files it names loaded one at a time in idle steps, its client modules run once through the bundler's own entry. Stopped by a tap, a key or the background. Never router.prefetch, nothing from outside the bundle.
- `f2e1cfeb` the guard: `isNativeClient()`, not `IS_STATIC_EXPORT`. The export of `cbb3367ba` (my second and last) showed nothing readied: that flag is server only and reads as the website in client code.
- What the measure found (medians of 3, ms, tap to settled; before is the export of `cf3335fbb`, after is the export of `cbb3367ba` with only its two compiled guards set to the mended value):

| Opening | Before | After |
|---|---|---|
| Bible tab (John 1) | 831 | 676 |
| Discover tab | 657 | 524 |
| Prayers tab | 727 | 559 |
| You tab | 586 | 468 |
| Today: Begin (prayers of the hour) | 442 | 356 |
| Discover: Saints | 1028 | 1008 |
| Prayers: Morning prayers | 359 | 326 |
| You: Settings | 445 | 329 |
| Bible: next chapter (no code read) | 926 | 968 |

  Code read after the tap roughly halved (Bible tab 24 files, 1108 KB, to 13, 638 KB). The onboarding's slate: p95 17 ms in all six runs, one frame over 34 ms in one of three runs before and after, while 29 code files were readied during it. A second opening of a tab is 250 to 380 ms faster than the first; readying the code wins part of that. The rest is the page's first drawing (React, style and layout), which cannot be readied without mounting the page, and mounting fetches readers' data from purifyapp.net.
- KeepScrolling's prefetch does not hold the next chapter back: 889 ms with it, 824 with it stubbed, inside the noise. Left as it is.
- No screen's pixels change (the ready-ahead draws nothing), so checkMock was not run.

## Open

| What | Owner | Next step |
|---|---|---|
| The real export of `f2e1cfeb` | the checks chat | Cut it (`node scripts/gate/export.mjs`), then `node scripts/first-open.mjs out --runs 3` and `--handoff --runs 3`. Expect the After column and about 36 code files read during the slate. |
| The motion walk over the five tabs | the checks chat | On that export: `NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --only /,/bible/john/1/,/discover/,/prayers/,/account/ --json <f> --shots <d>`, then `--reduced`. It cannot reach the onboarding (it sets it done); the slate's frames are `--handoff` above. |
| Item 2: six links that hold their picture with no data-carry | a fixer | `docs/handoffs/updates-46.md` Open 1. Not started. |
| Fonts on first openings | the arbiter | Saints and Settings each read woff2 files after the tap, and Saints settles 316 ms after it switches. Measure whether a font swap moves the heading before readying fonts. |

## Gotchas

- `IS_STATIC_EXPORT` is server only. A client module that reads it is on the website forever; use `isNativeClient()`.
- `serveLikeTheShell` routes every request, which turns the cache off: a readied file can be asked for again after the tap. Count files with that in mind.
- Chromium compiles large scripts off the main thread, so `--trace` shows chunk compile near 0. The code's cost is the wait for the last file, which lands a few ms before the switch.
- The measure needs a quiet machine: a typecheck beside it moved medians by about 100 ms. Batches differ by about 100 ms; compare medians from one session.
- `node scripts/...` probes need the browser at `/opt/pw-browsers/chromium` (the project's Playwright is newer than the installed one).

## His words that still apply

- 2026-11-14, about 16:00 UTC (build 97 note 3): "when you first open the pages on the app they all load in clunky and slow (can you load in the screens when they are at the end of onboarding and the animation is happening so it's not clunky or slow?)"
- 2026-11-14 13:57, by the arbiter: typecheck 0, the whole unit suite green, eslint clean on the changed files, the web build when a shared file, CSS or a server file changes.

## Where things are

`scripts/first-open.mjs`, `lib/nav/readyAhead.ts`, `components/nav/ReadyAhead.tsx`, `lib/nav/__tests__/readyAhead.test.ts`. The runs' JSON was in this session's scratchpad and is gone with it; the numbers above are the record.
