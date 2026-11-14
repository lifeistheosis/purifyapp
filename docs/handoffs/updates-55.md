# Baton: Updates 55 (the sheets' rest, part 3, build 97)

Written 2026-11-14, after item 1. get_session read 91,523 from start to finish (frozen, as 52's and 53's did); my own count, doubled, passed 150,000 with item 1, so item 2 and the export side were not started.

## Role and scope

A fixer (docs/roles/fixer.md), from Arbiter 10's brief of about 19:11, reporting to Arbiter 11. Held components/share/PictureSheet.tsx, the picture sheet's rules in app/globals.css, scripts/picture-tabs-walk.mjs and components/bible/WordStudySheet.tsx. Changed PictureSheet.tsx, the `.picture-range` rules, the walk, lib/ui/__tests__/pictureSheetReach.test.ts (new) and lib/ui/__tests__/pictureTabsStill.test.ts (its slice's end marker). components/ui/Sheet.tsx and lib/ui/useDraggableSheet.ts were not touched: the sheet's own `foot` prop holds the foot. WordStudySheet.tsx was not touched.

## Done, with hashes

- **Item 1, the verse picture's sheet, 2ad9c99c.**
  - Measured first, old code, 390 by 844, en and ar, with the extended walk: the slider 36px tall at both sizes in both languages; at 1x the panel is 717 of its 717.4 cap (edge 127); in English at 1.3x the body hid 46px, Save and Share ended at 842.6 (1.4px inside the screen), the save line at 869.1 (below it), and they scrolled with the body. Arabic at 1.3x hid nothing (its switches do not wrap). Updates 47's "46px below the fold" was the body's hidden amount, not the buttons themselves; with a gesture bar or a shorter screen they go under.
  - Mend. The slider's box is 44px with `margin-block: -4px`: the track and knob stand where they stood and nothing moves (the hit-44 idea for an input, which takes no ::after); a slider grown 8px would have pushed the sheet past its cap at 1x. Its focus ring sits on the 44px box (offset 0), where it stood. Save, Share and the save line are the sheet's `foot` (`const actions`), so at the cap the body above them scrolls and the picture keeps its size; the room is as drawn (14px over them: 4px is the body's `!pb-1`, the switches' hit-44 reach, which would otherwise make the body scroll 3px at 1x; 20px under the line).
  - Tests: pictureSheetReach.test.ts, 6 tests (old code: 3 failed, 3 passed; new: 6 passed). The walk now reads Save, Share and the save line on every tab, scrolls the body to its end and holds them, and reads the slider's box: old code en and ar, 5 FAIL; new code, all 21 languages at both sizes, 126 ok, 0 FAIL ("all held"): Save to 796.3 and the save line to 822.8 everywhere, the slider 44 in all 42 runs, note 9's rule held (one edge per language and size: 126.6 where capped, 127 elsewhere). Greek and Georgian hide 47px even at 1x (a third row of switches): the old sheet scrolled Save and Share away there too.
  - Tapped at 390 with real touch, at 1x and 1.3x: the slider answers 2px inside the top and the bottom of its 44px box (2 to 4, then 0); a finger drag scrolled the body 0 to 46 at 1.3x while Save stood at 746.3; Save downloaded the picture and "Picture saved" showed at 823 of 844; Share fell back to the download (headless Chromium has no share sheet); no page errors.
  - Checklist: typecheck exit 0; eslint on the four changed code files exit 0; the whole suite 1,192 files passed (1 skipped), 15,126 tests passed, 9 skipped, exit 0; the web build exit 0 (app/globals.css is shared).

## Open, each with its owner

1. **Item 2, Word study's tab switch** (next fixer): not started. Measure the edge every frame across the Old and New Testament tabs at 390 first (Updates 47's reading: the list empties, the sheet goes short, the edge falls, then rises). If it moves, note 9's rule (the edge, title and controls stand still when the tab changes, as 51e8a8168 did for the picture sheet); if not, say so with the numbers.
2. **The export side** (the round's checks chat, Updates 56 by 5c3c37a9): one export; checkMock `{ pixels: true }` on the picture sheet's three tabs (390, 800, 1032; five palettes, fourteen looks; Arabic) and on Word study; `node scripts/picture-tabs-walk.mjs` on out/ (no argument). Not run here.
3. **The phone walk** (the round's checks chat, then the owner): Share on a phone opens the share sheet, which headless could not show; and a gesture bar's inset is 0 in the walk's Chromium. The held foot keeps Save and Share in view either way (the body takes the loss), but it has only been seen on a screen with no inset.

## Gotchas

- At 390 by 844 the sheet at 1x is within half a pixel of its 85% cap: anything that adds height to the Words layer makes the body scroll at 1x. The walk prints it ("below the fold").
- The Words switches are `hit-44 h-9`: a body with no bottom padding scrolls by their 4px reach. Keep `!pb-1`.
- The root font is 17px, so Tailwind's spacing is too (pb-1 is 4.25px, mt-3.5 is 14.9).
- A plain "in view" check passed the old sheet at 844 (1.4px to spare); the hold (body scrolled to its end) and the save line are what failed it. Test what the arbiter's call means, not only where the buttons are.
- get_session's used_tokens stood still at 91,523. Count yourself and double it.

## His words that still apply

- "fix those things. try and take into account usage also" (16:28).
- Note 9, about 16:19: "notice how the words section move the UI up fix that".
