# Updates 98i: handoff

Fixer for build 98 notes 6, 7 and 9, started by Arbiter 14 on 2026-11-15 at 23:52 UTC to finish what
Updates 98d left (docs/handoffs/updates-98d.md). Branch `ccr-07896cf2-bo0afd`.

## Done

- **Note 7, the choice from the books** (`689d2ef0`, cut for the gate as `1f9b4544e` before its rebase onto
  `da536c64`). Reproduced on the gate export of `ee76f1c6` with a trimmed copy of books-version.mjs: turned to
  from the books, the versions were drawn in the scroller the books had left 499px down (Luke centred), so
  the World English Bible's row stood at y = -178, above the sheet's top. The finger met nothing and nothing
  downloaded. The walk's line read "turns back to the books" whatever it found, which is how the fault was
  read as a choice that did not take. With the row in view the same tap downloaded, chose, put "WEB" at the
  head and Luke 10:20 in the WEB's words in 0.6 s: BibleRow's choose-after-download and SheetVersions'
  onChosen were never the cause. Mended: SheetVersions starts the versions at their top as they are drawn
  (a stable callback ref, so a download's redraws do not throw a reader back up), as they are opened from
  the title line. Test: booksSheetVersion.test.ts, 1 of 7 fails on `ee76f1c6`, 7 of 7 pass.
- **The stills of note 7** retaken from that export (`18bd0b0f`): the first `books-sheet-versions-390.png`
  opened at the Serbian, the English above the top; it was the fault itself.
- **Note 6's walk** (`689d2ef0`): a download counts done on its options in the sheet, or on the sheet closing
  on a Bible newly chosen and listed on the phone (the store's own keys, `purify.bible.download` and
  `purify:bibles.saved`).
- **Note 9's walk** (`18bd0b0f` and the commit with this file): both of Now Playing's views with the line held
  to checkMock, `--at=<sizes>` to run the sizes side by side (the Words view photographs every line of the
  chant's words on each of the 21 looks, about 3.5 pictures a second: the whole walk in one process runs for
  hours), and `390-ar-en`: the Arabic recording's words are not shown, so it has no Words view; the Arabic
  interface's Words view is walked with the English recording, chosen behind the chant page's Versions door.

## Proof (gate export of `1f9b4544e`; the branch's web build run here with `next start`)

- Typecheck 0; eslint clean on every touched file; the whole unit suite 1,238 files green but
  readerScreen.test.ts (98g's, mended upstream in `da536c64`; 43 of 43 pass after the rebase); the web build
  green (the main web's public anon key in that one command only, the anon role checked, never printed or
  saved); the export green; the push guard passed.
- `books-version.mjs`: no faults at 390, 800, 1032 and in Arabic. The versions from their top (0px) after
  every turn; the World English Bible's row in view (top 321), downloaded and chosen from the books view,
  "WEB" at the head, verse 20 kept (174 before, 198 after) in the WEB's words; both views pass checkMock with
  pixels on the five palettes, the two earned and the fourteen looks.
- `bible-downloads-local.mjs`: no faults. All seven downloaded (four seen by the sheet closing on them, three
  by their options), 504 requests to the local web, all 200 with `Access-Control-Allow-Origin: *`; each read
  offline in its own words (John 1:3 unlike the English); each removed and offered again.
- `saved-line.mjs`: see the build-98 note 9 Done line for the sizes that finished.

## Open, and exactly where

1. Whatever note 9's Done line names as not finished (the long Words view passes).
2. **Seen, not mine:** in Arabic, Now Playing's transport row reads forward 15, pause, back 15, next: the two
   15-second buttons trade places with the page's direction while next stays at the right
   (`now-playing-saved-line-390-ar.png`). NowPlayingSheet.tsx is Updates 98h's.
3. The Wi-Fi wait cannot be staged in Chromium (it needs a saving job waiting on a cellular network); its
   words, with every other state's, are measured as drawn in all 21 languages at 360 (the widest 288 of
   301 px).
4. Only after the merge: purifyapp.net probed for each version, one download on his phone.
