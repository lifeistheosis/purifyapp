# Baton: Updates 45 (a fixer: build 97 note 4, every picture in the councils)

Written 2026-11-14 by Updates 45 (session_01VuYTwbZqy3pmi5db8M9L82), reporting to Arbiter 7 (session_01VuYTwc1iCyxzqvD9VFy2bp). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. The job in his words, the audit and the list: `docs/1.9-build/notes/build-97.md`, note 4. Stopped after batch 1 at the brief's line: get_session read 269,057 tokens after the push (about $10.56; the three Commons searches run as subagents count in it). No export was cut.

## Done (with a test that fails on the old code)

1. **The audit, in note 4** (the council, the place, the picture or MISSING, council by council). Read from the registry as the pages draw it: the head is `councilPicture` (`lib/councils/page.ts`, the council's own History event), each Father's card and face `fatherFaces` (`lib/councils/fathers.ts`, his covers' picture, `COVER_ART`), each book `councilBooks` (`lib/councils/books.ts`, a window onto the head, or the room's own book). 19 heads, 43 Father places (37 Fathers), 40 books. **Found missing: 12 heads (every local council), 13 Father places, 14 books** (every local council's own books).
2. **Six Fathers wear their settled page icons, bb0111a9.** St Juvenal (Ephesus, Chalcedon), St Celestine (Ephesus), St Anatolius (Chalcedon), St Eutychius (the Fifth), St Sophronius (the Sixth; not in his screenshots) and St Irene (the Seventh) had page icons settled on 2026-11-11 and carried, never put in `COVER_ART`. Added there (`lib/reading/coverArt.ts`) with their faces placed by eye (`ICON_FACES`, `lib/today/saintFaces.ts`), framed in a simulation of `FatherFace`'s round (zoom 1.9) and card (1.4) before landing; edges by `scripts/check-picture-edges.mjs`: 4 ok, 2 accepted as before (St Celestine's engraving paper, St Sophronius's vestments). No new file, so the apps grow by nothing. St Irene's letters take her solidus and leave the room's waiting list (`lib/reading/__tests__/coverArt.test.ts`). St Juvenal's and St Anatolius's are CC BY 4.0 photographs (BLAGO Fund), credited on the Credits page from their rights rows, as St Victorinus's carried CC BY-SA cover already is.
3. **The councils in the gate, bb0111a9.** `lib/councils/__tests__/everyCouncilAPicture.test.ts` holds every head, every Father and every book to a picture or its named list, and refuses a Father on the plate while his settled page icon is his face; on the old code it fails 2 of 5 (13 bare Father places against 6 named; St Juvenal's icon unused). In `scripts/gate/gate-tests.txt`; part 3's line in `docs/1.9-build/notes/build-93.md` names it.
   - Suite: **15,082 passed, 9 skipped, 0 failed** (1,187 files). Typecheck 0. Lint clean on the changed files. The push guard: all passed.

## Open

1. **The places still missing, each named in the test as `search: Updates 45, build 97 note 4`** (true while the searches ran; each must become a picture, or a `permission:` entry with a section in `docs/1.9-build/ICON-PERMISSIONS.md`, before the gate passes, since part 3 lets through only permissions):
   - Heads, and with them the councils' own books: all twelve local councils (carthage-256, antioch-268, ancyra-314, neocaesarea-315, gangra, antioch-341, sardica, laodicea, constantinople-394, carthage-419, orange-529, jerusalem-1672). None has a History event, so a found picture needs a way in: a council's own picture beside `councilPicture` (the unused `Council.iconUrl` field is a start), credited where History's are, and the shelves' backdrop and the door's fan take it from the same place. His rule (2026-11-13, 14:29): a council's plate takes its real picture where one is allowed and is dropped where not.
   - Fathers: St Nectarius (First Constantinople, Constantinople 394; his settled icon is the Paris Gregory's scene of the council, `NOT_HIS_FACE`), Firmilian and Malchion (Antioch 268), St Caesarius of Arles (Orange 529), Dositheos II (Jerusalem 1672). The last four have no page in Purify, so a picture needs a way onto the face too (`fatherFaces` reads only a saint's covers).
   - The three searches' findings are below, under "What the searches found".
2. **Not run for batch 1** (the brief's line came first): the web build; the export (`node scripts/gate/export.mjs`); checkMock `{ pixels: true }` on the council pages touched (first-constantinople is unchanged; ephesus, chalcedon, second-constantinople, third-constantinople, second-nicaea) at 390, 800 and 1032, the five palettes, the two earned and the fourteen looks, and Arabic; the six faces and St Irene's letters' cover seen on the export, no empty round. Run them on the next round's export.
3. **The bundle's size before and after:** batch 1 added no file. Give the figure with the first batch that adds a picture (the export's own size report, the new files' bytes named).

## What the searches found

(Filled in from the three subagents' reports as they land; each candidate is unlooked-at by this chat until it says otherwise.)

## Gotchas

- **The council faces' frame:** a carried icon's face needs both its `COVER_ART` focus (percent from the top) and its `ICON_FACES` point (across, down), or the round is cut about the middle. `lib/councils/__tests__/page.test.ts` counts the pictured Fathers (32 now).
- **The push guard takes about a minute, and the branch moves under it:** a push can be refused with "cannot lock ref" twice running. Pull with rebase and push again; check the exit with `set -o pipefail` when piping the push through `tail`.
- **Vitest swallows a test's console output here:** write to a file from a scratch test instead.

## His words that still apply

- 2026-11-14 about 16:02 UTC: "please ensure every photo is accounted for and not missed in the councils section (even the local synods and book covers)".
- 2026-11-13 about 14:29 UTC ("all recs"): a council's plate given its real picture where one is allowed and dropped where not.
- 2026-11-10 ("rec yes to all"): modern saints on the plate until a painter or monastery gives written permission; never another saint's face.
