# Updates 98d: handoff

Fixer for build 98 notes 6, 7 and 9, started by Arbiter 14 on 2026-11-15 at 22:50 UTC from
docs/handoffs/updates-98b.md. Branch `ccr-07896cf2-bo0afd`. Build 98's app code is `78c5297e1`.
Stopped at its token line.

## Done

- **Note 9, widths** (`6cdb318ca`). Waiting for Wi-Fi, the saved line offers one choice beside the words,
  Use mobile data, as the Words view already does; with Cancel too it ran past 360 in eleven languages.
  Georgian's `player.offline.useData` ("მობილური ინტერნეტით"), Greek's and Ukrainian's
  `downloads.savedToListen` made shorter in their own keys. Test: savedLine.test.ts (fails on 78c5297e1).
- **Note 9's walk** (`scripts/gate/saved-line.mjs`): the every-language step measures each state as drawn
  (each piece in its own box with the line's classes, its script's font loaded). Before, a shared line let
  right-to-left runs reorder into one another (Urdu read 998 px) and the pieces took the sheet's font.
  All 21 languages, every state, fit at 360: the widest 288 of 301 px. The Arabic pass seeds the Arabic
  version (`prayer-rope-anthem/ar` and its file in the "Disc" store) and passes: nothing moved, one line.
- **Note 7** (`6cdb318ca`). The books sheet carries the version being read at its head, by the chapter
  (the Sheet's own `titleExtra`, so 98c's Sheet.tsx is untouched), with the chapter's small chevron; a tap
  turns the same sheet to the versions (TranslationList, downloads with them) and back, a fade on the
  house curve only on a turn; a choice keeps the verse and turns back to the books. The line under the
  chapter's title opens this sheet on its versions through the same window event the pill already
  listens to (lib/bible/booksSheet.ts, now with a view), so 98a's MobileChapterPill is untouched; a choice
  made there closes it, as the line's own sheet did. The pill is not given the licensed translations with
  keys, so TitleTranslation hands them to the sheet through booksSheet.ts. Test: booksSheetVersion.test.ts
  (6 of 6 fail on 78c5297e1); booksSheet.test.ts and translationBeside.test.ts follow the one sheet.
- **Note 6's walk** (`d5f37f21`): the versions reached as a reader reaches them (the line under the
  title), the chapter opened afresh for each version, rows tapped once they stop moving, and offline the
  words must be the version's (John 1:3 unlike the English), so an English fallback no longer passes.

## Proof (on the gate export of 6cdb318ca and the branch's web build run here)

- Typecheck 0, lint clean on every touched file, the whole suite 1235 files green but one (below), the web
  build green, the export green. The push guard passed on both pushes.
- `books-version.mjs`, taps as a reader: at 390, 800, 1032 and in Arabic the books sheet opens with the
  version at its head ("Luke 10", "KJV"; "لوقا 10"), a tap turns it to the versions (15 rows) and back,
  the close shuts it, the line under the title opens it on its versions and a choice there closes it;
  verse 20 kept through a choice (top at 174 before and after). checkMock with pixels on the five
  palettes, the two earned and the fourteen looks: both views pass at all four.
- `bible-downloads-local.mjs` (the one-sheet path): all seven versions downloaded (504 requests to the
  local web, all 200) and each read offline in its own words (WEB, Synodal, Greek, Serbian, Arabic seen
  before this was written; the rest were running).

## Open, and exactly where

1. **Note 7, a choice from the books view**: in `books-version.mjs` at 390, the World English Bible
   downloaded from the versions turned the sheet back to the books but its head still said "KJV", and
   after closing, Luke 10:20 was still the KJV's words. The same choice from the line under the title
   (opened on the versions) is chosen (the language offer follows, the sheet closes). Look at what happens
   between BibleRow's `onChoose` after `downloadBible` (only while `waiting.current`) and SheetVersions'
   `onChooseBible` (`onChosen()` then `chooseBible`): whether the turn unmounts the row before the choice,
   or useShownBible in VersionHead does not hear the choice. Reproduce first; the walk prints it.
2. **Note 6's walk, its download check**: a finished download chooses the Bible, which closes the sheet
   opened from the title (and brings the language offer, "Switch to ..."), so the walk's wait for the
   row's "Options for ..." times out for four versions though they downloaded (the offline reads prove
   it). Count a download done when the options show or the sheet has closed on the chosen Bible; then
   the removal step finds each.
3. **Not mine, named**: `lib/bible/__tests__/readerScreen.test.ts` fails on the branch since 53b8c3ac
   (note 2 added `components/reading/TextPill.tsx` to the reader's screens; the test's list was not
   updated). Updates 98g's or 98a's files.
4. **Stills and the Wi-Fi wait**: the stills are taken with docs/1.9-build/redesign/tools/shots.mjs and
   `saved-line.mjs --stills` (see the build-98 note's Done lines for what landed). The Wi-Fi wait could
   not be staged in the walks' Chromium (it needs a book's saving job waiting on a cellular network);
   its words are measured in all 21 languages as drawn instead.
5. Only after the merge: purifyapp.net probed for each version, one download on his phone.
