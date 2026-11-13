# Baton: Updates 26 (the apply chat for notes 16, 18 and 19, 27 and 15)

From the arbiter's brief of 2026-11-13 about 20:52 UTC, under his "yes to all" (20:47 UTC, BRAINSTORM.md). Rules: CLAUDE.md, AGENTS.md, docs/OPERATIONS.md section 5.

## What was done

Four commits made, rebased on 3d8f9b54. **Only note 16 is pushed.** Notes 18 and 19, 27 and 15 are held as `git format-patch` files in `docs/1.9-build/drafts/updates-26-held/` (0001 to 0003, in order, `git am` on note 16's commit), for the two faults below. In order:

1. **Note 16, the land looks.** `docs/1.9-build/drafts/land-looks/held.patch` applied clean; Desert's part dropped and Desert taken out as `docs/handoffs/updates-9.md` says: `RETIRED_THEMES` and `PREPAINT_RETIRED` send a stored `desert` to Roses (`rose`, nearest by ground and ink, held by `retiredThemes.test.ts`); its rules, picture, words and still kept once in `docs/1.9-build/kept/desert-look/` (the dunes moved there from `kept/land-looks/`, which now holds Forest's and Jordan's first drawings only); sixteen reading modes and fourteen looks in the 21 catalogs (`plus.palettes.*`, `plus.active.modes`, `premium.plus.readingModes.sub`), `lib/premium/plans.ts` and the tests that count the looks.
2. **Notes 18 and 19, Settings.** `docs/1.9-build/drafts/build-95-notes-18-19.patch`, rebased: in `ReadingModePages.tsx` the head's form kept with the patch's one row. His call of 14:29 added: the Reading mode page's shelves (`Shelf` in `ReadingModeGallery.tsx`) and the Bible's own sheet (`ReadingModeChips.tsx`) click as the row does (`modeRow.test.ts`, failing on the old code). Keys no screen reads any more removed from all 21 catalogs (settings.subtitle, fastingHint, fontHint, motionHint, animationsHint, testers.firstOpenHint, testers.backHint).
3. **Note 27, earning a look.** `docs/1.9-build/notes/build-95/earned-looks/prototype.patch`, rebased on 18 and 19: the goal opens `EarnSheet` in place of the line under the row, so that line's in-page move went (`inPageMove.test.ts` now holds the sheet). `settings.paletteEarnCouncils` and `paletteEarnCappadocian` are read by no screen and left all 21 catalogs. The 20 catalogs carry note 19's words and the 13 `earn.*` lines (translated by a helper of this chat; `earned.test.ts` holds the lines in every language). Notes 19 and 27 meet in those words, so their two commits go up in one push.
4. **Note 15, Share on every work.** `docs/1.9-build/drafts/build-95-note-15.patch` by `git am`, unchanged.

The four patch files stay in `docs/1.9-build/` as the record.

## Proved before the push

Typecheck 0 (after `npx next typegen` in a fresh container: `next-env.d.ts` is not in git); the whole unit suite on the rebased head, 14,734 passed in 1,149 files; eslint 0 on every changed file; `npm run build` exit 0.
Android export by `node scripts/gate/export.mjs` from the stack (exit 0, 6,474 pages). The walk (`docs/1.9-build/drafts/updates-26-held/apply-26.mjs`, log beside it): 222 checks, 218 PASS, 4 FAIL, checkMock with pixels at 390, 800 and 1032 on the five palettes and fourteen looks, English and Arabic, real taps. `scene-check athos,forest,jordan` and `room-walk --look athos,forest` (258 screens) pass; `theme-pictures --engraved --kept` leaves git clean. A stored `desert` wears Roses; the Holy Mountain tile sets `data-look="athos"`.

## Open, for the next apply chat

1. **Back on Settings loses the row's sweep** (notes 18 and 27, 390, en and ar). Sweep the row to Councils, tap its goal, tap a door in the sheet, Back: the page's scroll returns (632) but the row stands at 0 (was 339, Arabic -338), Councils out of sight. The pre-build gate's "Back that does not return to where the reader was". Next step: keep the row's scrollLeft across the visit (by path, in session storage) and give it back on a Back, before `useOnInSight` runs; a test that fails on 0001+0002 as they are.
2. **The contents sheet's chapter grid is 41.5px wide at 390** (`grid-cols-7`, `components/saints/WorkContents.tsx`, en and ar; 23 targets). Older than note 15, but on its sheet. Next step: columns of at least 44px (for example `repeat(auto-fill, minmax(2.75rem, 1fr))`), a test, checkMock again.
3. Then: `git am` 0001 to 0003 on the head, the two mends, the whole suite, typecheck, lint, `npm run build`, one export, the walk again (`node <held>/apply-26.mjs`, moved back to `scripts/gate/`), **`npm run build:ios` after the Android export** (note 27 wants both; not run here), a push for 18-19 with 27 (they meet in `settings.paletteEarn*`) and one for 15.
4. checkMock here used PALETTES plus LOOKS (19 grounds): Councils and Cappadocian are left out, as Updates 9's baton names.

## Gotchas

- Note 19's patch rewrote `settings.paletteEarnCouncils` without `{count}`, and the old `earned.test.ts` wants it; note 27 removes those keys. So 0001 alone fails that test: push 0001 and 0002 together.
- A fresh container has no `next-env.d.ts`: `npx next typegen` before `npm run typecheck`, or 15 TS2307 errors on `cards.generated.ts`.
- Council pages are `index.txt` in the export, not `index.html`.
