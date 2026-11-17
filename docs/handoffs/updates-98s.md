# Hand-over: Updates 98s (2026-11-17)

Started about 01:19 UTC by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ) to make the second push to main ready: Updates 98r's parked Heart-alone patches applied, What's New's line under the 1.9 headline made true, the gate tools that still walked the phone's voice brought to the app as it is, and the fix checklist on the result. The arbiter's word to push came at 02:08 UTC (the first push on main as 6700c2e65, pushed 01:56:29 by the Release chat): "when your checks pass, `git pull --rebase` ... and push the branch. Never main."

## Done

1. **Heart alone applied.** `git am` of `docs/1.9-build/drafts/updates-98r/0001` to `0003` on dfe04382: clean. The app folders matched the README's hashes exactly (app `c8ff1d46`, components `8272a0d2`, lib `4809af64`, data `65bc2c24`). What the patches do is 98r's hand-over (`docs/handoffs/updates-98r.md`).
2. **What's New's line** (`whatsnew.highlights.sub`, all 21 catalogs). It said "five more Bibles" where the note, the tour, the release email and the drop say seven, and named Purify Plus nowhere. Now, in English: "A journal by the Church's day, every verse opened to its Greek, seven more Bibles, and in Purify Plus, cross-references, Remember the verse and new reading plans." Each language uses its catalog's own names: the tour's "Seven more Bibles" (`tour.step.bibles.title`) and "In Purify Plus" (`tour.story.plans`), `bible.crossRefs`, `remember.title` and the tour's "New reading plans" (`tour.step.plans.title`; Filipino, Romanian, Nepali and Urdu moved to the tour's own words for the Bibles or the plans, so the line and the tour say the same). `lib/whatsNew/__tests__/highlightsSub.test.ts`: on the old catalogs `Tests 2 failed | 2 passed (4)` (the count, and Purify Plus named before its features); on the new, 4 of 4.
3. **The gate tools.** `scripts/gate/voices.mjs`: the dock mode stays (Heart on John 1, no Listen over a downloaded Bible's page) and no longer switches on the Voice sheet's strings; the browser's speech is a tripwire there. The voices mode is retired: it prints why and exits 0. `scripts/gate/listen-walk.mjs`: a text lane walks Listen only when the list of recordings names the text (`data/listen/index.json` and the export's `audio/listen/index.json`); otherwise it measures no Listen in the pill, none in the page, no dock and no mini player, on the phone and with `--computer`, and reports what else was asked (`--carry`, `--words`, `--transport`) as not walked. `--voice` is refused (exit 2). The speech tripwire is in every lane. `scripts/lib/fake-voice.mjs`, used by nothing else, is gone.

Commits after the rebase onto 03d77d02: `6a207a44`, `1cb34753`, `e893f56e` (98r's three), `52a8e197` (the line), `ae8edf45` (the gate tools), `3cfb865f` and `c6246beb` (the Nicaea tap check, `docs/1.9-build/drafts/updates-98s/nicaea-tap.mjs`), and this hand-over. Tree `1880a693`: app `c8ff1d46`, components `8272a0d2`, lib `896965fa`, data `65bc2c24`. The rebase brought in one app file, `lib/ab/tests.ts` (the release commit 6700c2e65), and docs.

## Checks

On the head before the rebase (`1e095502`, the export cut from it), unless said:

- `npm run typecheck`: exit 0.
- `npm run test:unit`: `Test Files 1257 passed | 1 skipped (1258)`, `Tests 15503 passed | 9 skipped (15512)`.
- `npx eslint` on the 28 code files changed since dfe04382: exit 0.
- `npm run build`: exit 0, `✓ Compiled successfully in 45s`, `✓ Generating static pages using 2 workers (6527/6527)`.
- `node scripts/gate/export.mjs`: the first try died on a download Cloudflare cut (`TypeError: terminated`, `other side closed`) before the build began, the tree untouched; the second: exit 0, `✓ Android local bundle ready: out/`, `export size: 207.5 MB on disk in 7,367 files, 75.8 MB packed`; the key the anon role of the main web's project, not printed, not saved.
- checkMock with pixels, every palette and look (`SELLS_PLUS=1 node scripts/guardrail-walk.mjs --only <seven> --every --size <W>x<H> [--lang ar]`, the seven: `/whats-new/`, `/bible/john/1/`, `/bible/genesis/1/`, `/saints/xenia-of-petersburg/`, `/saints/athanasius-the-great/against-the-heathen/`, `/councils/first-nicaea/the-synodal-letter/`, `/settings/`): `7 screens measured, 7 with nothing failed` at 390x844, 800x1280 and 1032x1376, in English and in Arabic (six runs; Arabic 800 and 1032 run again after a container restart closed the first Arabic 800 run's browser on Settings). Allowed by name only: Settings' palette previews, the dark island, the commentary mark, a work's own em dash as its edition prints it, keyboard-only pills.
- The tap walk as a new reader (`SELLS_PLUS=1 node scripts/tap-walk.mjs --only <seven> --max 80 [--lang ar]`): Arabic `7 screens, 140 controls tapped, 0 failed`; English `7 screens, 140 controls tapped, 1 failed`, the one fail `/councils/first-nicaea/the-synodal-letter/ a "The council’s page": nothing: the tap changed nothing` (below). Both: `sheets, menus and dialogs the taps opened: 21 distinct, each held to checkMock's rules once; 0 failed`.
- The gate tools on the export: `listen-walk.mjs out`, `--lang ar` and `--computer`: `5 of 5 texts as the app means them ... 5 with no recording and no Listen`; `--only bible --transport`: `1 of 1 ... 1 walked with a recording` (John 10); `--voice`: refused, exit 2; `voices.mjs dock`: `All passed`, among them `the browser's speech was asked for nothing` and checkMock on the dock at 390, 800 and 1032 in English and Arabic; `voices.mjs voices`: the retirement line, exit 0.
- On the head after the rebase: typecheck and the whole suite run again (the result is in the report to the arbiter).

## The Nicaea tap ("The council's page")

- As a reader taps it on a fresh page (`node docs/1.9-build/drafts/updates-98s/nicaea-tap.mjs .`), aimed as the tap walk aims (scrollIntoView to the middle, still for two looks, `aimOf`, a CDP touch at once): English 6 of 6, Arabic 6 of 6 over two runs, and 3 of 3 in each language with the CPU slowed 4x. The finger is on the link every time (`elementFromPoint`), the link at 736 to 757 of 844, no layout shift from first paint to the tap (PerformanceObserver), and it lands on `/councils/first-nicaea/`.
- Not mended, because nothing was found to mend on a fresh page: the tap walk's sequence fails it in English every time it was run here (98r's full walk once; this chat's full walk once; the one screen walked alone, `--only /councils/first-nicaea/the-synodal-letter/ --max 80`, 2 of 2, `1 screens, 13 controls tapped, 1 failed`), so it is not load. The full Arabic walk passed it once. The walk's verdict means the touch changed nothing at all (no address, document, scroll or dialog change). Its still shows the link marked exactly where the walk aims (736 to 757, under the reader's "The next chapter opens when you reach the end." and its chevron), so the touch is on the link and is taken by something else. The lead, unproved: state the walk's earlier taps leave in the same browser context, beyond the localStorage it resets, with the end-of-section "next chapter" handling taking a touch at the page's end once the reader has reached that end. The walk's JSON row holds only the verdict and the still (`councils_first-nicaea_the-synodal-letter-7.png`), both in this chat's scratchpad only.
- No council file is changed by 98r's patches or by this chat; the same page is on main since the first push.
- The script's third way, a finger swipe by `Input.synthesizeScrollGesture`, never scrolled the page in headless Chromium (the link stayed below the screen), so its six "FAIL" rows tapped nothing and say nothing about the app.

## Not proved

- The walks ran on the export of the head before the rebase; the rebase's one app file (`lib/ab/tests.ts`, the roads' days) was walked by the Release chat's gates, not by this chat's export.
- Why the tap walk fails "The council's page" in English (above).
- A finger swipe on that page (the synthesized gesture did not scroll).
- On a phone: nothing here reaches one until a build is cut with these commits.

## Open

- The Nicaea tap: `SELLS_PLUS=1 node scripts/tap-walk.mjs --only /councils/first-nicaea/the-synodal-letter/ --max 80` fails it in English 2 of 2 on this export. A fresh chat finds what the earlier taps leave behind (tap the page's controls in the walk's order, then the link, with the touch's own events logged), and mends what it shows, or proves it is the walk's own state no reader meets.
- 98r's opens stand: `scripts/voices/run.json` still holds the dry run of four voices (the go copies `full.json` over it); the Pro plan's "Studio Audio" row; NOW's phone-walk list still names the voices' plugin.
- get_session read 273,021 tokens when this chat stopped new work, past its 200,000 line: the Nicaea finding was taken no further.
