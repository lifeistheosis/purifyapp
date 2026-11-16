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
