# Round 3 apply A: the hand-over

Session session_01VuYTwago8nSzWSDVNFvp6e, started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ) at his word of 2026-11-16 about 05:20 UTC ("yes to all EXCEPT the Bible screen"). Screens 1 (the journal as its own page) and 5 (Plus) of round 3. Screens 4 and 7 were not taken.

## Done

- **161d84b3, screen 1.** The held patch's hunks for the journal's page, onto the head: none of its files had moved since a96345f91, so they went on unchanged; `.journal-add` alone from globals.css. The route `/journal/write`, back, the day, one Done, one plus, one sheet; Quote is 98c's library search in the sheet.
- **A verse's note goes to the page too** (the README's "to know"): `lib/journal/openVerseNote.ts`. The page already kept a verse's note (lib/journal/keepDraft.ts); opened from its verse (`?from=verse`) it draws no Open back to it; what the old sheet kept typed for a verse is carried once. `VerseNoteSheet.tsx` is gone. A note on a Father's words keeps the old sheet, because the journal keeps verses' notes only (lib/journal/waiting.ts, noteVerse) and a work keeps its words' notes: moving it needs a new kind of note in the journal's keeping, which no still drew.
- **fed40e3c, screen 5.** PlusParts on the Plus page, plusParts.ts, PlanScreen to /pricing in the apps; price, terms and the button untouched. **The header's Plus button shows the same parts**: the upgrade sheet shows PlusParts when no lock leads it (the header opens it with "general"); a lock's own row still leads its sheet, lit in its words. One question for both lists: `rowLeads` (lib/premium/plusRows.ts).
- **0e75e05c**, `scripts/verse-note-walk.mjs`; the keyboard walk knows the page (in 161d84b3); the stills tool takes `--looks` (this commit).
- Tests: writingPage (the route, one Done, the verse note's way in), verseFocus (the note's way in), plusParts (both doors alike: fails on the old sheet, passes now), paywallB.

## Proved, on this round's one export (after Apply B's screens 2, 3, 6)

- Typecheck 0; the whole unit suite 1252 files, 15501 tests green; lint 0 errors (50 old warnings); `npm run build` compiled; the export green (207.6 MB).
- The stills against round 3's own (pics.json, read from his page): journal, written, sheet, quote, keys and Plus differ by a mean of 1 to 2 of 255 and no pixel by more than 24.
- checkMock with pixels, 25 stills (journal and Plus at 390, Arabic, 800, 1032; the header's Plus sheet): all pass on the five palettes. The by-eye items are round 3's two, looked at then (the reading modes' verse numbers; the Quote's field over a saint). The header sheet checked whole fails only on the Prayers page under its scrim at 800 and 1032 (Light), as round 3 found for the Voice sheet; the sheet itself is checked on its own.
- The quote-library walk: every step ok, checkMock 18 of 18 (palettes and looks, 390, 800, 1032, English and Arabic).
- The keyboard walk on the page, frames (98c's mend) and step: the field holds at 190.8, the plus's foot 12px over the keys.
- The verse-note walk: 11 of 11; verse 47 stands where it stood (460 to 460) after Done.
- The motion walk, motion on: /journal/write/ 5 controls, /pricing/ 21, none failed, none unsure; reduced: none failed.

## Open

- The header's Plus pill over the Prayers and You pictures (the arbiter's item from Apply B): see the report; the measure on the earned looks is in the README's line.
- Not proved, and why: the earned looks for the 25 stills (the stills tool measured palettes only until `--looks`; the journal's Quote screens had them through the quote walk); the iPhone export (the brief named the Android one); a phone walk of the page's keyboard (only a phone shows the native frames).
