# Gate 6: the pre-build gate for test build 100 (partial: stopped at the chat's token line)

One export of `3ab13437` (app code `d4399909`, the last app commit, 08:19 UTC; `3ab13437` adds two docs files), cut by `node scripts/gate/export.mjs` at 08:25 UTC: exit 0, 207.6 MB on disk in 7,368 files, 75.8 MB packed (ceiling 240.0 and 85.0). The key was read as the anon role of avbqyvjgcrucjwevwixt and written nowhere: 0 key-like strings in the export's log. Release-day switches in the tree: CAMPAIGNS_OPENING "testers", PICTURES_IN_STORE_BUILDS false, CAMPAIGN_NOTICES true, JULY_GROUPS_GO true, CARE_NOTE_SEND true. Runners and records: `docs/handoffs/gate-6-walks/` (`walks6.sh`, `new6.sh`, `notes-old.sh`, `round3-probe.mjs`, `plus-sheet-probe.mjs`). One walk at a time.

**The four tools prove their measures** (`walks6.sh selftest`): tap walk, guardrail walk, motion walk and checkMock, each exit 0 ("every case measured as it should be").

## Result

**Not a pass yet; nothing failed that was measured, but two parts were not run.** Parts 3 and 5 pass. Part 4 fails on one line of the 1.9 note. Part 1 was cut by the two-hour limit at 100 of 130 screens and is being walked again in four chunks; part 2 was not reached. The chat stopped at its 200,000-token line (212,803 by get_session at 10:30 UTC).

| Part | State | Numbers |
|---|---|---|
| 1, the tap walk | **not finished** | the whole walk (new reader, `--max 1000 --online`, 3 workers): 130 screens, stopped by the background limit at 100 of 130 after two hours (no JSON: the walk writes it at the end). One fail logged, the walk's own (below). Chunk 1 of 4 (`screens-1.txt`, 33 screens) was running at the stop |
| 2, checkMock with pixels and the motion walk | **not run** | none of `walks6.sh guard`, `light`, `motion-screens`, `motion-loaded`, nor `new6.sh` |
| 3, a picture for every saint and work | **pass** | `scripts/gate/gate-tests.txt`: 63 files, 956 tests passed (everySaintAPicture, coverArt, everyCouncilAPicture with their named lists of permissions awaited; wordsTrue, noDashedBoxes, noSparkle, touchTargets among them) |
| 4, the words | **FAIL, one line** | below |
| 5, every note its test | **pass** | below |

## Part 1: the one fail logged, sorted as the walk's own

- `/` | the header's "Plus" | the "Purify Plus" sheet | checkMock: the readers' quote "“Purify is an incredible app that honestly deser..." 1.00:1 on Dark, Light, Black, Candlelight, Monastery, Councils and Cappadocian. **Reproduced** by checkMock alone on the opened sheet (`plus-sheet-probe.mjs`, third look: the same seven at 1.00:1). **The pixels say otherwise**: the quote scrolled to the middle of the sheet reads, ground against letters, Dark 10.46, Light 5.93, Black 11.26, Candlelight 7.73, Monastery 8.81, Councils 8.65, Cappadocian 8.55 (need 4.5; fourth look), it is the topmost element at its place, opacity 1 up its tree, and a still on Dark shows it plainly. At rest it stands at y 3912 in the sheet's scroller, far below the screen. So the checker misreads this line; cause not read (`scripts/words-on-pictures.mjs` places a line with `scrollIntoView` and photographs it twice). For the checker's owner (Admin), not an app fault.

## Part 4: the words

- **FAIL. The 1.9 note's first line promises a Plus part as free.** "Your journal, by the Church's day: ... Write freely, add verse cards and your highlights, and quote anything in Purify into it with Quote in journal. Free for everyone." On a page of the library (a prayer, a saint's life, a Father's work, a chant) Quote in journal is Plus's: without Plus it wears the padlock and opens the upgrade sheet (`components/native/PressToCopy.tsx` lines 24 to 30, 84 and 282; `lib/journal/libraryQuote.ts` `quoteNeedsPlus`: "Scripture is everyone's; every other page of the library is Plus's"). The same note's item 9 says so ("the Fathers' works, the saints' lives, the prayers, the chants and the councils in Purify Plus"). The line ships in build 100's What's new (`data/changelog/entries.json` and `patches.json`, version 1.9, item 0) and is in `docs/plans/v1.9/patch-note-1.9.json` (item 0), `patch-long-1.9.json` and the letter in `docs/plans/v1.9/drop.json` (line 602: "quote anything in Purify into it with Quote in journal. The journal is free for everyone."). For the patch notes and the drop kit (Admin); his queue for the wording.
- **Pass: no voice is promised.** No Emma, Michael or Fenrir in the app's strings (`lib/i18n/messages/en.json`), in the bundled note or in any reader-facing drop piece; the only voice lines are the two step pieces (`step-voices-line`, who: us). The Voice sheet's Heart row shows only where a text has its recording (`components/player/VoiceSheet.tsx` line 155). Round 3's screen 7 words (`player.voice.usWoman` and the rest) are not in the build.
- **Pass: the bundled note is the drop's note.** `data/changelog/entries.json`'s 1.9 entry and `docs/plans/v1.9/patch-note-1.9.json`: 63 items each, the same text.
- **Not finished: round 3's five lines against the applied screens** (items 8, 10, 11, 12 and 37 of the note: the journal's page, the chants door, You and your profile, a plan's page, the Plus page). `round3-probe.mjs` reads each screen's words, controls and pictures and takes a still, as a new reader in the Android shell; its result is in `docs/handoffs/gate-6-walks/round3-probe.log` if it landed before the push, and was not read.

## Part 5: every walk note of build 98 has its test

`notes-old.sh`: the head's tests for each note put into a worktree of `78c5297e1` and run there, then on the head (`notes-old.txt`). Every file passes on the head.

- Notes 1 and 10 need none: a decision (the voices), and no build (campaigns, from the merge).
- Note 2: dockFace 11 of 11, longWordsNear 4 of 5, longWordsWait 4 of 4, pageMovesItself 3 of 4, rollOnComing 5 of 5, speech session 2 of 22 fail on 78c5297e1; dockTitle, glideDirection, listenLikeTheBible and startEdge fail there to load (what they prove did not exist).
- Note 3: prayersHome 1 of 32, prayersMirror 1 of 2; shelf to load.
- Note 4: keyboardSlide 1 of 6, returnKeyboard 1 of 3, scrimStrip 3 of 3; writingPage to load.
- Note 5: quoteInJournal 1 of 11; libraryQuote to load.
- Note 6: the downloads' store 2 of 18. Note 7: booksSheetVersion 7 of 7.
- Note 8: wordsLeaveLit 2 of 2; nowPlayingReady and nowPlayingTap to load. Note 9: savedLine 4 of 4.
- Note 11: youAndProfileOnePiece 8 of 8, youTab 5 of 15, accountGateKeptSession 1 of 9.
- Note 12: its mend is note 4's native mend ("one native mend with note 12"), so keyboardSlide and returnKeyboard are its tests and fail on 78c5297e1. searchMotion.test.ts passes there (7 of 7): it holds the page's half, mended before build 98.
- Note 13: meetSinging to load. Note 14: chantPage 2 of 17, footHandover 6 of 6, footSurface 6 of 6.

## Not run, and why

The chat's token line: part 2 entire (checkMock with pixels at 390, 800 and 1032, en and ar, the light looks; the motion walk with nothing loaded, with a track and with a sound, CPU 4x), part 1's four chunks, the new screens' own walks (`new6.sh`: You and Profile with days kept, the verse note opening the journal page, the library Quote, the dock on five texts with `--check`, Now Playing's carry, Words and transport with back and forward 15, the saved line, chant follow, the search's motion), the books sheet walk (needs the branch's web build on :3000 for its download step), and the web build. The open reader's tap walk was not planned: part 1 is the new reader's.

# Gate 6b: the gate finished on one export of the head after two mends

Started 10:47 UTC by Arbiter 14. Head gated: `358974c6` (app code still `d4399909`; after Gate 6's head come the two mends below, one bundled note and two scripts, and docs). One export of `358974c6` by `node scripts/gate/export.mjs`; walk results under `docs/handoffs/gate-6-walks/` (`*-6b` where a name would repeat Gate 6's).

## The two mends before the export

**A. The 1.9 note's item 0** (`1878d8d9`). It said "quote anything in Purify into it with Quote in journal. Free for everyone." On a library page Quote in journal is Plus (`lib/journal/libraryQuote.ts` `quoteNeedsPlus`, `components/native/PressToCopy.tsx`), as item 9 says. Item 0 now reads "Write freely, add verse cards and your highlights, and quote Scripture into it with Quote in journal. Free for everyone. In Purify Plus, quote the prayers, the saints' lives, the Fathers' works and the chants too." (`data/changelog/entries.json`, `docs/plans/v1.9/patch-note-1.9.json`), and the long note "and quote Scripture into it with Quote in journal, and in Purify Plus the prayers, the saints' lives, the Fathers' works and the chants. The journal is free for everyone." (`patches.json`, `patch-long-1.9.json`). The drop's letter (line 602) never named quoting; the words Gate 6 quoted for it are the long note's, so it is unchanged; the drop's point 0 still cites "Free for everyone." The note piece waits in the kit for his eye on the wording (`node scripts/drop.mjs waits note-1.9`). `drop.mjs check` passes; lib/drop, lib/whatsNew, lib/release, lib/i18n and verseGesture: 50 files, 629 tests pass.

**B. The checker's misread** (`358974c6`), the checker's own, two causes in `scripts/words-on-pictures.mjs`, found by dumping the pass on the opened sheet (checkMock with pixels, as the tap walk holds it):
- Updates 98p's rule measures a word "in a bar pinned at the screen's top" where it stands. The sheet's own box is `fixed inset-0`, so every word in the sheet's scroller counted as pinned and was never brought to the middle. The quote stood where the line before it had left it (scroller at 3262, the quote at y 650 to 729), three of its four lines under the plans dock (`PlansDock`, `sticky bottom-0`).
- A covered line changes no pixel when its words are hidden, so it was read on every pixel of its box: the dock's pill, 1.00:1 (Dark: line 1, the quote's own, 10.48; lines 3 and 4 inside the pill, 1.00). The pixels drawn were counted for the whole word, so the one line in sight let the covered three through.

The mends: a word that moves with a vertical scroller inside the pinned box is brought to the middle like any other; a line wholly under a sticky or fixed box that is not the words' own is left out (told by what stands over it, never by faintness, so faint letters in sight are still read and failed). Not an allowance by name. checkMock's self-test gains two sheets (`sheet-open`, `sheet-bar`): the old checker fails them, 1.00:1 ("self-test FAILED: words in a sheet were read where a bar stands over them, or not brought clear of it", exit 1); the mended one passes (exit 0). On the export, checkMock with pixels on the opened sheet: 0 fails, the quote measured at Dark 10.48, Light 5.92, Black 11.20, Candlelight 7.73, Monastery 8.86, Councils 8.67, Cappadocian 8.65 (need 4.5).

## Gate 6b: the result (stopped at the chat's token line, 18:00 UTC)

**Not a pass yet: one app fault (low), one finding to read, and part 2's light and screens walks, the new screens, round 3's lines and the web build not run.** The export: `358974c69`, exit 0 at 11:19 UTC, 207.6 MB in 7,368 files, 75.8 MB packed (ceiling 240.0 and 85.0), 0 key-like strings in its log, the same release-day switches as Gate 6. The four tools' self-tests pass on this head (tap, guardrail, motion, checkMock). The walks ran one at a time from one chain; the two probes (the Plus sheet's numbers, the chips) ran between walks with the chain held.

| Part | State | Numbers |
|---|---|---|
| 1, the tap walk, new reader | **pass** | four chunks, 130 screens, 3,024 controls (700, 633, 1,189, 502): 3,022 pass, 1 allowed (a council card on /saints/adrian-of-rome/web/ grows and moves 220px under the finger, then stands wholly in view), 1 skipped (/theology/doctrine/'s "The case for 1 John 5:7" drew differently on its second visit), 0 failed. The Plus sheet: "held to checkMock's rules: nothing failed" |
| 2, guardrail with pixels | **one fault, one to read** | six runs (390, 800, 1032; en, ar; five palettes): 129, 128, 129, 128, 129, 129 of 130 clean, 0 errors. Below |
| 2, the light looks | **not run** | the walk refused to start (its list named Desert, gone from the registry); mended in `256705ea`, not walked |
| 2, motion with a track and a sound | **pass** | 20 of 20 tab switches in each of track on, track reduced, sound on, sound reduced. Now Playing at CPU 4x: open 80 frames, longest 66.7 ms (one over 50), the slide moving 201 to 467 ms after the tap, no blurred layer moving; close 78 frames, longest 33.3 ms |
| 2, motion on every screen | **not run** | stopped at its start by the token line |
| 3, a picture for every saint and work | **pass** | `gate-tests-6b.txt`: 63 files, 956 tests |
| 4, the words | **pass after mend A**; round 3's five lines **not run** | item 0 now true (above) |
| 5, every note its test | pass on Gate 6's head; no test file changed since | |

**The fault (app code, low; for a fixer).** `/prayers/today/`, all six guardrail runs, palette on Light: the dot beside the fasting rule keeps `rgb(123, 155, 143)`, the fixed `--color-sage` ("fish-allowed fast green"), from `lib/calendar/fastDot.ts` (`FAST_DOT.fish: "bg-sage"`), shown by `components/prayers/PrayersDayCard.tsx` and `TodayMasthead.tsx`. A fixed colour without the allowance by name that `/fasting/`'s fasting colours carry ("a dark island, dark on every palette"). It shows because 16 November is a fish day of the Nativity Fast, so a gate on another day sees another dot: `fast-free`'s `bg-emerald-400` is the same kind. Steps: open Prayers, Today, on a fish day, wear Light.

**To read, not proven app code.** `/shop/category/all/` at 390 in Arabic only, mirror: the six category chips (`components/shop/CategoryChips.tsx` in `ScrollRail`) each stand 1.9 to 2.0px off their mirrored place, all together ("الكل 8" at 294.1 to 367.8 where the mirror of 20.3 to 93.9 is 296.1 to 369.7). Absent at 800 and 1032, where the row fits without scrolling, so it reads as the scrolled rail's offset rather than a chip placed with left or right. One probe missed the row (it read the top nav, and Arabic did not apply); cause not placed.

**For the eye, not faults.** At 800 in Arabic only, the shop's `greek-33-knot-prayer-rope.png` did not load once: production serves it (200, 111,501 bytes) and the other five runs loaded it. Words left to the eye in part 1: 117, the councils' and history's map labels (54 and 45, over the atlas canvas) and the Plus sheet's numbers "1" to "4" (1 to 2px wide, 5px tall, at opacity 0.54, inside a card's picture; the old checker leaves them too: `plus-numbers-6b.txt`).

# Gate 6c: the gate's last parts and the check of Updates 98q, on one export of 4ca097da3

Started 2026-11-16 by Arbiter 14. Head gated: `4ca097da3` (app code `b40e4192`, after Updates 98q: lib/calendar/fastDot.ts, components/ui/ScrollRail.tsx, lib/ui/railRange.ts, components/prayers/PrayersDayCard.tsx, lib/ui/__tests__/mockPair.test.ts). One export by `node scripts/gate/export.mjs`: exit 0 at 19:43:57 UTC, 207.6 MB in 7,368 files, 75.8 MB packed (ceiling 240.0 and 85.0), 0 key-like strings in its log, the same release-day switches as Gate 6b (CAMPAIGNS_OPENING "testers", PICTURES_IN_STORE_BUILDS false). The four self-tests pass on this head (tap, guardrail, motion, checkMock). Parts 1, 3, 4 and 5 passed on 358974c69 (Gate 6b); part 1 was walked again only for the screens 98q touched. The container was restarted every 81 minutes (23:57, 01:18, 02:39 UTC), which killed whatever ran, so the walks ran from a detached chain cut into steps that each finish inside one container's life (`docs/handoffs/gate-6-walks/chain6c.sh`, `walks6c.sh`). Results: `docs/handoffs/gate-6-walks/c-*`, `light-*`, `m-new-*`, `motion-6c.tsv`, `gate-tests-6c.txt`.

## Gate 6c: the result

| Part | State | Numbers |
|---|---|---|
| Item 2, guard with pixels at 390 on all 21 | **pass** | 34 screens (Prayers today, Prayers, Fasting, the shop's front and its 14 category pages, and every screen with a rail holding a current item: ProductRail, SaintIconsRail, ShopBySaint, CoverRow, ChantRow, KeptShelf, FeatureShowcase, CategoryChips, ShopSubTabs, PrayerPieces): en 34 of 34 clean; ar 33 of 34 clean, /reading/ not measured (below) |
| Item 2, /reading/ in Arabic | **pass on 7 of 21; 14 for the eye** | at 21 looks the walker's page closed twice, about an hour each. A probe of the page as a reader has it (390, the shell): heap 27.0 MB flat in Arabic (18.2 in English), layouts flat at rest, no crash, its rails at rest. On the five palettes and the two earned: 1 of 1 clean; the seven light looks: clean in the light walk. The seven dark looks are not measured on this one screen |
| Item 2, guard at 800 and 1032 on all 21 | **pass** | 12 screens (one per rail and the three of the fasting dot): 12 of 12 clean in each of en 800, ar 800, en 1032, ar 1032 |
| Item 2, the tap walk (part 1 again for these screens), new reader | **pass** | en: 34 screens, 1,019 controls, 0 failed; ar: 34 screens, 1,022 controls, 0 failed; 14 sheets and dialogs each held to checkMock, 0 failed |
| Item 2, Gate 6b's failing order | **pass** | /shop/, /shop/ambassador/, /shop/cart/, /shop/category/all/ at 390 in Arabic: 4 of 4 clean |
| Item 2, unit suite and part 3 | **pass** | 1,261 files passed, 1 skipped; 15,557 tests passed, 9 skipped. Part 3: 63 files, 956 tests passed |
| Part 2, the seven light looks on every screen, 390 | **pass** | en 130 of 130, ar 130 of 130 clean (four chunks each, the screens of Gate 6) |
| Part 2, motion on every screen, CPU 4x, both lanes | **fail: 58 transitions** | below; every chunk walked (on: 338, 315, 454, 327 controls; reduced: 130, 118, 155 and the fourth) |

**For the eye, not faults.** On the English run at 390 the mirror of the chip row on four category pages (apparel, incense, jewelry, sets) was not compared: the chips moved while the checker flipped the page (the row is scrolled to its current chip). Gate 6b's English run showed the same on /settings/'s rail (7 lines); the Arabic run compared these rows and passed. The Plus sheet's numbers "1" to "4" on /plan/ are left to the eye, as in Gate 6b.

## Gate 6c: the motion walk's 58 transitions (app code, for a fixer)

The first walk of every screen at CPU 4x in this series (gate run 5 walked a short list without the throttle and failed nothing), so no baseline says which are new in 1.9. Every one, with its stills, is in `motion-6c.tsv` and `m-new-*.json.gz`. Sorted:

- **Blank page switches.** /discover/, the Reading door (components/discover/DoorOrder.tsx) into /reading/ (app/(app)/reading/page.tsx): 37 frames with nothing drawn for 601 ms with motion on, 15 frames for 300 ms reduced; / to /reading/, reduced: 15 frames, 229 ms. /theology/creed/, "The Symbol of the Faith Nicaea, 325" into the council's document: a blank. /theology/doctrine/, a StudyShelves link: a flash.
- **Instant cuts with motion on.** /settings/, components/settings/FirstFocus.tsx: each of 11 focus choices changes 86 to 89% of the screen in one frame (102 to 121 ms after the tap), the radios "Completely new", "Learning", "Practicing" 77 to 80%. /bible/, "1 Samuel" (components/mobile/BibleBooks.tsx): 61% in one frame at 360 ms.
- **Jumps with motion on.** /settings/: the reading mode preview jumps 48 px with each focus choice (15 times, both lanes). /chants/: the language filters move the list 63 to 191 px in one frame. The prayer readers (morning, compline, evening, after meals, the Theotokos akathist), "Chant" (components/prayers/PrayerRuleReader.tsx): "Pray with chant" 251 px (reduced: drawn at 0,520 then 0,269). /fathers-on/anger/ into a work: components/saints/MobileWorkPill.tsx 26 px.
- **Reduced motion only.** "Dismiss" on the banner (/ and /signout/): 178 px. /privacy/ "Contents" (components/legal/LegalPage.tsx): 561 px. The twenty-five canons, "Next: Canon I" (components/councils/CouncilReader.tsx): 270 px. /whats-new/ "November 1 update": 187 px; "Take the tour" (components/whats-new/TakeTheTour.tsx) lands misplaced. /chants/ "Play": Now playing drawn at 0,844 then 0,0. /calendar/ month 56 px, /fasting/ day rows 67 px, /dictionary/ "Find a word" 84 px, /start/first-liturgy/ 77 px, /signup/ a field 27 px.
- **For the eye, not failed:** the dips through the ground at the foot of a fade (about 200 a chunk with motion on, under 10 reduced), the layers crossing in passing (the top bar over its plates row, the reader pill over the tab bar), and 17 slow answers over 350 ms (chunks 1 and 2, motion on).

The batch went to the arbiter at once (2026-11-17 about 06:50 UTC).
