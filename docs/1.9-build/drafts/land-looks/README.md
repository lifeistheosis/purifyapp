# The land looks' feet: held, not shipped

Build 95 note 16. The code for the four land looks' new feet, saved as one
patch so it outlives the chat that made it. Nothing here is loaded by the
app. It waits on his yes or no, look by look, on
https://claude.ai/artifact/QqnzGPTD41qdsX9EPnFMZr. The record is
`docs/1.9-build/notes/themes-fable.md`, section 65.

## What `held.patch` holds

Made against `c51fe7955` (Updates 9's removal of Galilee and Patmos is under
it). 44 files, 2.7 MB with its pictures. `git apply --index
docs/1.9-build/drafts/land-looks/held.patch` applied clean on that commit.

- Holy Mountain: `public/themes/athos.webp` from a wood engraving of 1887,
  its foot's two lengths (152px, 256px), its line in 21 catalogs. Colours
  unchanged.
- Forest: `public/themes/forest.webp`, a bough of silver fir and its cone
  from Köhler's plate 54. Colours unchanged; its line in 21 catalogs.
- Desert and Jordan: no picture (`--room` is the page's colour); their
  lines in 21 catalogs.
- `scripts/theme-pictures.mjs`: `engraved()`, `plated()`, `--engraved`, and
  the four first drawings as `EARLIER_DRAWINGS`.
- `docs/licensing/THEME_PICTURES.md` and the two plates in
  `docs/licensing/plates/`.
- `docs/1.9-build/kept/athos-look/` and `kept/land-looks/`: the first
  drawings, rules, words and a still each, for the Vault.
- `lib/reader/__tests__/themePictures.test.ts`.

## Before it is applied

1. **Desert is out** (his "all recs", 2026-11-13 about 14:29 UTC). Drop
   Desert's part of this patch and take Desert out the way
   `docs/handoffs/updates-9.md` says (its kept look is Roses). In the patch
   Desert's part is: its `--room` and `--mp-back` lines in `app/globals.css`,
   `settings.paletteDesertHint` in the 21 catalogs, its blurb in
   `lib/reader/readingModes.ts`, `desert` in `EARLIER_DRAWINGS`, its row in
   the test ("Desert and Jordan have no picture") and its words in
   `kept/land-looks/`. Its first drawing is already kept there as
   `desert-dunes.svg`: Updates 9's plan would keep it under
   `kept/desert-look/`, so choose one home.
2. **His answer on each of the other three.** Yes ships as it is. A no on a
   look removes that look the way Fire was removed.
3. **Rebase on Updates 9 and Updates 11**: they hold the same files
   (`app/globals.css`, `lib/reader/readingModes.ts`, the catalogs,
   `THEME_PICTURES.md`, `scripts/theme-pictures.mjs`, the test).
4. **The fix checklist**, both native builds, then push. On the export:
   `node scripts/scene-check.mjs athos,forest,jordan`,
   `node scripts/room-walk.mjs --look athos,forest` (Jordan has a colour and
   no picture, so that walk says "no room" for it: it wants a named
   allowance), `node scripts/theme-pictures.mjs --engraved --kept` must
   leave git clean.

## What was measured when it was made

Faintest text over each foot: Holy Mountain 5.89:1, Forest 6.87:1, Desert
6.92:1, Jordan 6.39:1 (4.5 needed). `checkMock` with pixels on four screens
in each look and the five palettes: nothing failed. Typecheck 0, 14,380 unit
tests, lint 0 errors. Not seen on a real phone.
