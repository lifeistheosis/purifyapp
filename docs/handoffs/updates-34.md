# Baton: Updates 34 (a fixer: the last faults of 1.9)

Written 2026-11-14 by Updates 34 (session_01VuYTwcc8uQfFsRsL2rWmc1), reporting to Arbiter 4 (session_01VuYTwcgDURTqVoLw8nQD9m), rotated at its context budget (200,000 tokens) after round 1. Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Read first: this baton; for round 2, `docs/handoffs/updates-18.md` (Open 3 to 5) for causes 7, 8 and 9, and `docs/handoffs/updates-31.md` (Open 3 to 5) for their detail.

## Role and scope

Mend what the arbiter routes, each fault with a test that fails on the old code, proved on an export cut by `scripts/gate/export.mjs`. One export per round, one push, one report with the hashes.

## Done (round 1, on the export of 41a18d4c7, cut 00:58 UTC, pushed 00ace77f6..aeac39158 at 01:42 UTC)

1. **The first launch's dialogs on the look's own ground** (`3584dddd9`, Updates 31's held patch by the arbiter's call). Before, on the export of 9ae98f53: the welcome's heading 2.0 to 2.2:1 on fourteen looks at 390. After: checkMock with pixels on the dialog itself (`[role="dialog"].lm-hero`), the welcome and the next step, at 390, 800 and 1032, English and Arabic (lang ar, dir rtl), 21 palettes and looks: 12 of 12 pass.
2. **The ambience sheet holds still** (`360047b60`). The hold added each frame's step of a glide and lost what a whole pixel could not hold; it now keeps the sounds' distance from the scroll's end, set whole each frame (`lib/ui/holdAtEnd.ts`). A third sound counts beside the one playing while it loads, so the two volumes no longer fold away and open again. The gate's walk (`scripts/gate/ambience-sheet.mjs`): all passed (6 sounds play; 13 taps within 4px, among them "The sea: takes Rain's place" and "Bell and stillness: stops", 7 and 9px before; checkMock with pixels at 390, 800 and 1032, English and Arabic, every palette and look, two states). Painted frames, read after the hold answers: every tap within its own press (about 2px).
3. **The Plus preview's strip** (`360047b60`): its line under the strip keeps the room of its longest sound ("The sea plays..." took two lines at 390 where Rain's took one). `SELLS_PLUS=1`: "a finger on The sea in the strip plays it, and the tile does not move (0.0px)", 13.3 before; the lock passes in both languages.
4. **The preview's John 1 window at 390**: it predates b5d9edb3. It was the minute: past 60 seconds the lock's words veil the window, and a measure that ran past the minute read the veiled verses (proved: 0 failures within the minute on Councils, Night sky and Forest; 6 on Dark after 62 seconds). The page under the veil is now out of reach, unheard and allowed by name (`360047b60`); checkMock reads that allowance where it photographs the pixels too (`90ce70cf7`; the minute's edge reproduced: 6 failures with the old tool, none with the new; the self-test passes); and the lock's own line takes 80% of the ink (`aeac39158`; it read 4.41 to 4.45:1 on Roses, Lavender and Olive in Arabic at 390). Measured on the round's export with that one class swapped (the next export confirms it): the preview at 390, English and Arabic, natural timing and fully veiled, 0 failures on 21 palettes and looks; 800 and 1032 pass in the walk.
5. **The account and order emails' small lines** (`71473017c`): the line over the heading, the labels over a value and a day at the kit's 12px semibold, the wordmark Purify in the serif in the ink. The kit's page check and the shell's checkMock pass at 360, 390, 412 and 1032. The after stills are republished: https://claude.ai/artifact/Gcumt9ReKxJ6Yhy2Drh9Um (Version 2).
6. **Typed arrows** (`41a18d4c7`): 45 catalogue lines in 21 languages and about 50 places in code; back chevron, forward chevron or dropped by the siblings' rule, the up-and-out mark for a link that leaves the app, all mirrored in Arabic. `lib/i18n/__tests__/typedArrows.test.ts` failed 23 of 28 before. checkMock on /prayers/, /saints/, /discover/ and /bible/john/1/ at 390, 800 and 1032, English and Arabic, 21 palettes and looks: 24 of 24 pass. Taps, English and Arabic: the pager's next tile and previous chapter, Prayers' Open today, a saint's card: 8 of 8 lead where they say, Back returns, the chevron mirrored in Arabic.

The rest of the checklist: typecheck 0; the whole suite 14,849 passed (9 skipped); eslint clean on every changed file (one warning, on HEAD already); the web build green; the push guard passed.

## Open, in order (round 2 of Arbiter 4's brief, not started)

1. **Cause 7** (the arbiter's call: the app's own skeletons are not a new look, so no yes is needed). A Father's work in the apps draws a blank `min-h-[70vh]` while it fetches (`components/saints/LazyWritingReader.tsx` about line 56): give it `SkeletonText` (`components/ui/Skeleton.tsx`) under the page's head, at the place the loaded head stands, so nothing moves when it fills. The shop item arrives blank too: use the existing `ShopDetailSkeleton` (`components/shop/ShopStates.tsx`). Then check Updates 13's list against a fresh walk.
2. **Cause 8**: the pictures carried (19 left). The council's plate is covered by his yes at 14:29 ("a council's plate given its real picture where one is allowed and dropped where not"): apply it, with before and after stills in the report.
3. **Cause 9**: the eight feature walks (asked-again, faith-answers, learn, legal-sheet, plus-intro, plus-order, questions-top, reminders) each call `page.emulateMedia({ reducedMotion: "reduce" })` after `openPhone`. Run each with motion on and pinned (`scripts/lib/motion.mjs`: `motionOptions`, `pinMotion` before the first page, `assertMotion` on each screen), keeping a reduced pass where the walk tests the still path. Then run all eight on an export.

Found on the way, not routed (for the arbiter):

- `lib/admin/weekly.ts` `heading()`: the owner's weekly letter sets its section labels in spaced capitals (uppercase, 0.08em). Outside the account and order shell; not changed.
- Typed arrows left by name in the test's STAYS: the privacy policy's "IP→city" and "IP→Stadt" (legal words, the owner's; "IP-to-city lookup" would do), and 13 in old release notes in `data/changelog/entries.json` (the live copy is the `patch_notes` table).
- Em dashes in reader-facing words: `app/(app)/language-editor/page.tsx` (the ru and uk closing lines) and `app/(app)/shop/seller/orders/[id]/page.tsx` (an em dash before a resolution note).
- The preview's line now keeps two lines' room at 390, so a little more space stands under Rain's one line at rest: the price of not moving under the finger.

## Gotchas

- **A fresh container has no `node_modules` and no `next-env.d.ts`**: `npm ci` (about 1 minute), then `npx next typegen`, or typecheck fails on image modules.
- **The export from a worktree**: `git worktree add --detach <dir> HEAD`, `cp -al node_modules <dir>/`, copy `next-env.d.ts`, then `node scripts/gate/export.mjs` in it (about 10 minutes). The walks read `<dir>/out`; my walk scripts take `ROOT=<dir>`.
- **checkMock on the Plus preview is timed by the sound's minute**: past 60 seconds the lock's words veil the window, and a measure that runs long (21 palettes with pixels) measures the veil. The page under it now says so (`data-mock-allow="contrast"` with its reason, only while the lock stands); any new preview with an overlay should do the same.
- **A frame log sampled in requestAnimationFrame reads the layout before a ResizeObserver answers**, so it shows moves no reader sees. Sample in a ResizeObserver created after the component's (observers answer in the order they were made) to read the painted frame.
- **A test fixture with a fixed date runs out**: `lib/admin/__tests__/readers.test.ts` failed for every chat at midnight UTC on 2026-11-14 (Updates 32 mended it first; my duplicate was dropped in the rebase).

## His words that still apply

- 2026-11-13 (relayed): "in-page changes that move content ... move as page switches do; a filter or a count may change at once."
- 2026-11-13: "I want everything fixed in v1.9 no pushing out to 2".
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9."
- 2026-11-09: spend only what was asked; one export per round.
- 2026-11-13: "yes key always".

## Where things are

- The hold: `lib/ui/holdAtEnd.ts` (test `lib/ui/__tests__/holdAtEnd.test.ts`, which also keeps the first hold as a witness that drifts past 4px).
- The arrows' test: `lib/i18n/__tests__/typedArrows.test.ts` (its STAYS list names each arrow that stays, with its reason).
- The emails page for his look: https://claude.ai/artifact/Gcumt9ReKxJ6Yhy2Drh9Um (Version 2), source `docs/1.9-build/drafts/emails-round-3/shell/` (`render.mjs`, `check.mjs`, `page.mjs`).
- My walk scripts (scratchpad, not kept): the ambience frame recorder, the Plus preview's frame recorder and checkMock, the first launch's dialog check, the touched screens' check and the arrows' taps. The gate's own walk is `scripts/gate/ambience-sheet.mjs` (and `SELLS_PLUS=1`).
