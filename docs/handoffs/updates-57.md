# Baton: Updates 57 (the sheets' rest, part 4, build 97)

Written 2026-11-14, after item 1. get_session read 91,414 near the start and 179,432 ten minutes later, past the brief's 150,000, so item 2 was not started.

## Role and scope

A fixer (docs/roles/fixer.md), from Arbiter 11's brief of about 19:40. Held components/bible/WordStudySheet.tsx, scripts/word-study-tabs-walk.mjs (new) and lib/ui/__tests__/wordStudyTabsStill.test.ts (new). Also changed, outside the brief: lib/premium/__tests__/plusTry.test.ts, whose word-study lines pinned the old state's text (the rule they hold, a study already here opens whole, is unchanged and still tested). components/ui/Sheet.tsx and lib/ui/useDraggableSheet.ts were not touched.

## Done, with hashes

- **Item 1, Word study's tab switch: ba278481** (the mend), 16479642 (plusTry's lines), the walk and test in 93a6e1b0, 63b64cf5, 34cfc0e1, bc09ee81, 3d43c680.
  - Measured first, old code, on a dev server with the verses from purifyapp.net at the real round trip, 390 by 844, every frame from the tap to 2.5s after. The first change to the Old Testament: the edge went 126.6 to 370.4 and back at 1x (243.8px), 126.6 to 230.5 at 1.3x (103.9px); the title and the tabs fell as far. English and Arabic alike. Back to the New Testament stood still (its verses were already here).
  - Mend: both testaments are asked for as the study opens, the open one first, and each keeps its own verses; the two lists share one grid cell, the one not shown invisible, aria-hidden and inert, so the panel is as tall as the taller (51e8a8168's way). The tabs name their panels. A testament that failed is asked for again as it is chosen; Show more fills the testament it was asked for.
  - Usage: one more request when a study opens (the other testament's first verses; the server keeps an answer a day), in place of one when its tab was first tapped. The Plus page's preview shares the body, so it now asks for the Old Testament of its three words too.
  - Tests: wordStudyTabsStill.test.ts, old code 4 of 4 failed, new 4 passed. The walk: old code 4 FAIL (one per language and size); new code 12 ok, "all held": the edge at 126.6 in every frame, the title at 163.5 (1x) and 160.3 (1.3x), the tabs at 413.8 and 522.3. A verse followed from each list (matthew/5#v32 at 1x, genesis/4#v23 at 1.3x), the sheet closed, no page errors, both languages.
  - Checklist: typecheck exit 0; eslint on the four changed files, 0 errors (two old warnings at plusTry.test.ts:234); the whole suite 1,192 files passed and 1 failed (plusTry, mended in 16479642, rerun: 37 passed), 15,132 tests passed; the web build not run (no stylesheet, server or shared file changed). The guard passed.

## Open, each with its owner

1. **Item 2, the six links that hold their picture with no carry** (next fixer): not started. updates-46.md Open 1 has it.
2. **The export side** (the round's checks chat): `node scripts/word-study-tabs-walk.mjs` on out/ with no argument. It plays a Plus reader with a stand-in account, as faith-answers-walk does, and has not yet run on an export, so its first run there tests it too. checkMock `{ pixels: true }` on Word study open on each testament (390, 800, 1032; five palettes, fourteen looks; Arabic).
3. **Known limits** (the arbiter's call): a tap on the other testament within about half a second of opening, before its verses come, can still grow the panel when they arrive if that list is taller (λόγος is at the cap on both). A word found in one testament only keeps the taller list's height, with room under the short one.

## Gotchas

- The dev server is 500 on every page without Supabase settings (the proxy builds a client). Placeholders do: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=walk-placeholder`. Its own /api/bible/word is 500 too; the walk takes the verses from purifyapp.net.
- John's text writes Λόγος with an oxia, not a tonos: typed Greek does not match it. The walk finds it by its capital.
- A tap on a Greek word before the page wakes opens nothing; the walk taps until the card offers the study.
- `prettier --write` on WordStudySheet.tsx rewrites the whole file (it was not formatted before). Don't.

## His words that still apply

- "fix those things. try and take into account usage also" (16:28).
- Note 9, about 16:19: "notice how the words section move the UI up fix that".
