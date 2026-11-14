# The pre-build gate, run 2 (2026-11-14)

The arbiter's call (Arbiter 6, 08:03 UTC): the pre-build gate (CLAUDE.md, parts 1 to 5) on one export of the head, by the method of `gate-run-1.md`'s passing re-check, and what was owed or named on 2026-11-14. Run by Gate 2 (session_01VuYTwadHYxDDuqX3APffp1). It names faults and mends no app code; the arbiter routes them.

**The export:** `node scripts/gate/export.mjs` of `a8a35dde7`, the branch head (its code is `4c6a0484`; the two commits after it are docs). Cut 08:05 to 08:07 UTC, 6,474 pages, 204.6 MB on disk. The store workflow's own switches: the shop and Community on, `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1` with the stand-in RevenueCat key `walk` (the export sells Plus and nothing can be bought), Google sign-in unset (the walks are signed out), the EIKON Box unset (its safe default). The release-day switches: CAMPAIGNS_OPENING "testers", PICTURES_IN_STORE_BUILDS false, CAMPAIGN_NOTICES true, JULY_GROUPS_GO true, CARE_NOTE_SEND true. The main web's public key was read from purifyapp.net's own scripts into the export command alone (his standing word, "yes key always"), checked to be the anon role of the main web's project, and printed and written nowhere. The three tools' own self-tests (checkMock, the guardrail walk, the tap walk) passed on it. Both readers walked: the new reader with no Plus (`SELLS_PLUS=1`) and the open reader.

## Part 1: the tap walk

Every control on every screen (`--max 1000`), at 390 by 844 with real touch, reading the main web, both readers at once, two workers each, 08:10 to 11:04 UTC.

- New reader: 129 screens, 3,008 controls, 5 failed; 125 distinct sheets, menus and dialogs, 1 failed.
- Open reader: 129 screens, 3,005 controls, 9 failed; 125 sheets, 1 failed.
- Held under the finger by the page itself, and still standing when tapped again with anchoring off: /prayers/ chapters II, III and IV (278px), both readers.
- Allowed by name and reason: on Adrian of Rome's web, the Second Council of Nicaea's node is lifted 220px into view above its card.
- For the eye: /shop/request/'s "Either" (its check moved and little else changed), new reader. Words over a picture in the sheets left for the eye: 96 and 98, the councils' atlas map drawn across its dialog (a canvas), as in every run before.

**No signal:** the reading room's councils, Ancyra 314, the seven ecumenical councils' pages and /history/, new reader: checkMock 10 of 10 clean, and every picture drawn from the app (`scripts/gate/offline-pictures.mjs`: 10 pages, 0 failed).

## Part 2: the guardrail walk and the stripe walk

- **The guardrail walk at 390,** checkMock with pixels on the five palettes and the two earned, mirroring measured in Arabic on every screen: 129 of 129 clean for each reader (11:04 to 11:47 UTC). Left for the eye: 91 lines on 4 screens, readers' initials wholly under their own pictures (/community/ and the like).
- **At 800 by 1280 and 1032 by 1376,** both readers: see "Then" below.
- **The stripe walk,** every screen at phone and tablet size: no side stripe on any screen. Five dividers allowed by name and reason: the line between "Your journal" row's two halves (/bible/), the lines between the study's three figures (/theology/comma-johanneum/, twice), the month grid's lines (/calendar/), and the line between the shop's two columns on a wide screen (/shop/).

## Parts 3 to 5

`npx vitest run $(cat scripts/gate/gate-tests.txt) $(git diff --name-only --diff-filter=AM f4679fb49 HEAD -- '*.test.ts')` on the head: 262 files, 3,309 tests pass, 3 skipped by design (`lib/email/__tests__/releaseEmail.test.ts` runs those cases only when a release has pictures or an earlier letter).

- **Part 3:** `lib/saints/__tests__/everySaintAPicture.test.ts` and `lib/reading/__tests__/coverArt.test.ts` pass, with their named list of permissions awaited.
- **Part 4:** `lib/ui/__tests__/wordsTrue.test.ts` passes and its WAITING list is empty.
- **Part 5:** build 95's notes against build 95's own code. A worktree at `6193982d5` (the cut of builds 95 and 96) took the head's test file for each note in place of its own, and the same files ran on the head. 51 test files for 26 notes; **26 of 26 fail on the old code and pass on the head.** Notes 4, 9, 15 and 18 fail there only because the module each test imports did not exist yet (the journal's writing helper, Discover's door order, Share's work row, the kept sweep). Notes 1 (withdrawn: the old build), 2 (not a fault) and 28 (asked: the desktop revamp, not yet built) have no test. The map of notes to tests: note 3 `lib/fasting/__tests__/build95.test.ts`; 4 `lib/journal/__tests__/build95.test.ts`; 5 `searchMotion`, `oneField`; 6 `writingSheet`, `sharedPageView`, `blockForms`; 7 `toastBand`, `readerScreen`; 8 `launchHandOff`, `launchFrame`; 9 `doorOrder`, `holdToMove`, `holdToMoveWiring`; 10 `ownWords`, `fold`, `replyReport`; 11 `provenance`, `starts`, `failureLine`; 12 `badgeCardHolds`; 13 `sheetSmoother`, `peekLeavesWhole`; 14 `returnKeyboard`, `keyboardFlag`; 15 `shareWork`; 16 `retiredThemes`, `readingModeGallery`; 17 `patronChooser`; 18 `sweepKept`, `modeRow`; 19 `clicksSetting`, `oneSettings`; 20 `lookSurfaces`; 21 `downloads/store`; 22 `ambience/photos`, `sheetDesign`; 23 `downloads/notice`, `downloads/shell`, `whenUncovered`; 24 `shareOut`, `copyText`; 25 `voiceSheet`, `voiceChoice`, `downloads/page`, `downloads/files`; 26 `themeSwitch`, `themeDissolve`; 27 `earned`, `inPageMove`; 29 `studyListing`.

## Owed or named on 2026-11-14

- **The offline lines,** with no signal, checkMock with pixels on all 21 (the five palettes, the two earned and the fourteen looks), on the line itself, which must also stand whole on the screen and clear of the bar:
  - Today's readings, Listen: "Plays with a connection" under their buttons, at 390, 800 and 1032 in English and at 390 in Arabic: 4 of 4 pass.
  - Community, Try again: "No signal. Check your connection and try again." under the button, the same four: 4 of 4 pass.
- The rest: see "Then" below.

## The faults

1. **The Translation sheet on the two earned palettes,** both readers (opened from 1 Chronicles 1's "Switch translation, currently Brenton LXX"): the translation's note, "Public domain. The Greek Old Testament used by the Apostles.", reads 4.32:1 on Councils and on Cappadocian, needs 4.5:1. `components/bible/TranslationList.tsx:170` (`text-paper/50`; `components/bible/BibleRow.tsx:103` wears the same ink). checkMock has worn the earned palettes by default only since 2026-11-13, and no run since had opened this sheet.
2. **A sold-out piece's Save heart is under the card's link,** both readers, /shop/ and /shop/category/all/ (the 33-Knot Orthodox Prayer Rope, out of stock): the finger at the heart meets the card's stretched link, so a tap on Save opens the piece. `components/shop/ProductCard.tsx:105`: `opacity-70` on a sold-out card's vitrine makes the vitrine a stacking context of its own, so the heart's `z-20` inside it (line 144) no longer stands over the link's `z-10` beside it (line 153). The pieces in stock pass.
3. **Buy now moves 27px under the finger,** both readers, /shop/icons/byzantine-three-beam-wall-cross/: Buy now with the box not ticked brings "Please agree to the Terms and shipping & refund policy first." under the box; the bar at the foot grows by that line, upward, and carries Buy now up with it. `components/shop/BuyBar.tsx`. The clickwrap itself stays as it is.
4. **/plans/acts/, Mark day 1 to 5 as read,** open reader (the new reader's walk passed the page): tapped again with the browser's scroll anchoring off, each circle moved 41px as the streak line came above the days; only the browser held it (42px). WebKit (the iPhone and the iPad) has no scroll anchoring (the arbiter's ruling of 2026-11-11), and the page means to hold the circle itself. `components/plans/PlanClient.tsx` (`hold`, `keepHead`, with `lib/ui/inPageMove.ts`).
5. **/community/, "5 replies",** new reader, once: what it opened ends at 1328px, under the bar at 761px, and the page did not move with it. `components/community/CommunityClient.tsx`. The open reader's walk passed it; the feed is live.

Faults 4 and 5 are walked again alone on a quiet machine, both readers, with faults 2 and 3: see "Then".

## Then

The rest was still running when this record was first pushed (12:20 UTC): the guardrail walk at 800 and 1032 for both readers; checkMock with pixels on /reading/ (390, 800 and 1032, the 21, English and Arabic) and on /settings/reading-mode/ (1032, English, the five and the two earned); the verse card's offline toast; the patron sheet whole; then, on a quiet machine, the motion walk on /shop/, Search's strip and the saints' grid recorded with motion reduced, the five fault screens walked again alone, and the web build. Their results follow here as they land.
