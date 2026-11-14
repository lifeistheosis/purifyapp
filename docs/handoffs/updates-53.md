# Baton: Updates 53 (the sheets' rest, part 2, build 97)

Written 2026-11-14 about 19:20 UTC, at the budget line. get_session read 91,541 from start to finish (frozen, as 52's did); my own count passed 150,000 after item 1, so items 2 and 3 were not started.

## Role and scope

A fixer (docs/roles/fixer.md), from Arbiter 9's brief of 18:45 and Arbiter 10's message of 18:53. Held components/ui/Sheet.tsx, lib/ui/useDraggableSheet.ts, lib/ui/sheetKeyboard.ts, lib/ui/sheetGesture.ts, components/bible/WordStudySheet.tsx, components/share/PictureSheet.tsx, scripts/keyboard-sheet-walk.mjs, scripts/picture-tabs-walk.mjs, and from 18:53 the `.picture-range` rule in app/globals.css. Changed Sheet.tsx, useDraggableSheet.ts, sheetKeyboard.ts, lib/ui/__tests__/sheetKeyboard.test.ts and keyboard-sheet-walk.mjs; nothing else.

## Done, with hashes

- **Item 1, For the living's edge, a9e63f50.** Cause as found: a `keyboard` sheet's panel stands at the foot of the box the keyboard leaves, capped at that box's height; For the living's is 733.4px, so when a 300px keyboard left 544 the cap took it to 531.3 and its edge went from 110.6 to 12.8 in one frame, the name field from 266.3 to 168.5. The walk's old check skipped every frame before the keyboard, so the jump itself never failed it (it failed only on the opening's tail). Mend: `heldHeight` (lib/ui/sheetKeyboard.ts) holds the panel at its rest height less the keyboard's rise while the line being written still shows above the body's foot (the body's own rule, scrollForWritingLine, 24px room), so the edge stays and the body scrolls; it returns null when the field would be covered, and the sheet rides up to its cap as before. useDraggableSheet applies it in a layout effect (before the frame is drawn and before its ResizeObserver measures), from the first step of the rise, while a typing field in the panel has the focus; it lets go when the keyboard goes. Sheet passes the frame's foot for `keyboard` sheets only (`fill`, the journal, is untouched).
  - Tests: lib/ui/__tests__/sheetKeyboard.test.ts, 4 new (old code: 4 failed, 4 passed; new: 8 passed). The walk now checks the edge where it rested before the keyboard, the opening's slide taken out (`rest`). `NATIVE=1 node scripts/keyboard-sheet-walk.mjs http://localhost:3000 living step 300`: old code FAIL, "edge 110.6 before the keyboard, 12.8 at rest, moved" (also with KB_AFTER=900); new code ok, 110.6 and 110.6, the field 266.3 held, also `anim` (eight steps), with the keyboard while the sheet still rises, and `vv` (the website's way). DOWN=1: the edge back at 110.6 when the keyboard goes. FINGER=1: a real touch drag up the held body scrolled it 0 to 141. KB 520 (the field would be covered): rides up to 12.8 as before, by design, and back to 110.6. The journal's mend (87d8d82e) holds: with a cover 476.3 to 417.3 held, edge 12.8; with none 247.4 held; FINGER 59 to 202.
  - Checklist: typecheck exit 0; eslint on the five changed files exit 0; whole suite 1,191 files passed (1 skipped), 15,120 tests passed, 9 skipped; web build exit 0; the guard passed every check on the push (34s); the opener and the field tapped with real touch at 390 on the dev server.

## Open, each with its owner

1. **Item 2, Word study's tab switch** (next fixer, after the arbiter's yes): not started. Measure the edge every frame across Old and New Testament at 390 first; if it moves, note 9's rule (the edge, title and controls stand still when the tab changes).
2. **Item 3, the picture sheet at 1.3x, with the Text size slider** (next fixer): not started. The arbiter's calls: at the 85% cap Save and Share are held at the sheet's foot, always in view, the body above them scrolls, the picture is not shrunk; extend scripts/picture-tabs-walk.mjs to measure Save and Share inside the viewport at 1x and 1.3x on every tab. Arbiter 10's addition (18:53): the Words tab's Text size slider (input "Text size", `.picture-range` in app/globals.css) is 36px tall and needs 44 (311.2 by 36 at 390, 359.2 by 36 at 800; Updates 51's checkMock, mockrun49, baton 96f549bc, 18 specs, English and Arabic). The Words layer is the tallest and sets the panel, so 44px grows the sheet 8px and meets Save and Share at the foot: mend them together. A test that fails on 36px, picture-tabs-walk and checkMock on words, and the web build (globals.css is shared). Updates 54 stays out of globals.css and the sheet files.
3. **The other `keyboard` sheets** (the round's checks chat): not walked. The florilegium picker opens short on a dev server (no gatherings), so it rides up as it must; it is tall only with several gatherings. The campaign sheets (pictures, change, report) need a campaign, which a dummy dev server has none of. The highlight names sheet was not opened. The rule is the shared hook's, so they all have it; walk the florilegium picker with several gatherings, and a campaign sheet where one can be reached.
4. **The export side for item 1** (the round's checks chat): one export, checkMock `{ pixels: true }` on For the living's sheet, and the walk on out/ (it takes a base address).

## Gotchas

- get_session's used_tokens stood at 91,541 the whole session. Count yourself and double it.
- The walk needs a dev server with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=walk-anon`. Stop it before the web build.
- A keyboard that comes in steps rises 37.5px a step (anim mode, a phone's browser): a hold that waits for an 80px jump never starts. Mine starts on any rise.
- The hook's height is offsetHeight, rounded: holding from it put the edge 0.4px low, so the hold reads the exact height (`exactHeight`).
- The stop hook nags about an unpushed commit while the checklist runs; a blocking wait on the checklist's log (a python loop) costs nothing and keeps the order: checklist first, then push.

## His words that still apply

- "fix those things. try and take into account usage also" (16:28).
- Note 9, about 16:19: "notice how the words section move the UI up fix that".
