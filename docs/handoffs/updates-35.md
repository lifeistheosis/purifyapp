# Baton: Updates 35 (a fixer: the last faults of 1.9, round 2)

Written 2026-11-14 by Updates 35 (session_01VuYTwdbs476SdLic8xr96a), reporting to Arbiter 5 (session_01VuYTwbxkc5zCaxq1PZcq3P), at its context line after round 2. Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`.

## Done (on the export of 0b3fde36b, cut by `scripts/gate/export.mjs`)

1. **Cause 7, pages that fetch arrive in their shape** (61bf5962, 4f24223c). A Father's work in the apps stands in the house's outline while its text comes (`components/saints/LazyWritingReader.tsx`, `WorkOutline`: the head in WorkHead's own type, the bars laid in its lines, nine lines in the column); the shop's piece page falls back to `ShopDetailSkeleton`, not null. The gate's walk with motion on found two more: the outline came in as a cascade (empty for most of a second on Morals on Job) and the piece replaced its skeleton in one frame (a cut at 885ms); 4f24223c draws the lines without the cascade and dissolves both outlines as they leave (`lib/ui/outlineLeave.ts`). Test: `lib/ui/__tests__/arrivesInShape.test.ts`.
2. **The gate counts the house's outline as drawn** (574eaa2b): its bars are 24 levels off Dark at most, under the blank check's 28; the page's sampler says how much of the screen the outline covers (`scripts/gate/inpage.mjs`, `outlineShare`), and the frame judge lists such frames, not fails them (`scripts/gate/frames.mjs`; 4 self-test cases, the whole self-test passes). The reduced walk on /fathers-on/anger/ then passes.
3. **Cause 8, the council's plate** (c3d26689, stills 3fb0dae2): the door's fan keeps only real pictures; the twelve local councils' doors are their words alone, Carthage 256 keeps Cyprian's cover, the seven unchanged. Stills: `docs/1.9-build/notes/updates-35/`. Test: `lib/councils/__tests__/doorPlate.test.ts`.
4. **Cause 9** (83c9f5b0): the eight feature walks walk with motion on, pinned and asserted on every screen (`openPhone({ motion })`, `scripts/lib/motion.mjs` `watchMotion`, `reportMotion`); `--reduced` for the still path. Test: `lib/ui/__tests__/walksMotion.test.ts`.
5. **Back on the sideways rows** (a980ccaf): `lib/ui/keptSweep.ts` in ScrollRail, ChipScroller and the Reading mode gallery's shelves. Test: `lib/ui/__tests__/keptSweep.test.ts`. Tap walk at 390, English and Arabic: the reading room's shelf and the saints' centuries, swept, a card opened, Back: the row stands where it was; a witness with the kept sweep cleared stands at 0.
6. **The weekly letter's small lines, the seller page's em dash** (0b3fde36). Tests: `lib/admin/__tests__/weekly.test.ts`, `lib/ui/__tests__/namedEmDashes.test.ts`.

## Open, in order

1. **The language editor's ru and uk closing lines** (em dashes, `app/(app)/language-editor/page.tsx`): waits on Updates 33's round 1, which touches that file. Once it lands: mend them, and add the file to `FILES` in `lib/ui/__tests__/namedEmDashes.test.ts`.
2. **Cause 7 with motion on, on the next export**: 4f24223c answers what this export's walk found, and only the next export can show it. Run `NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs <out> --only /fathers-on/anger/,/shop/category/all/ --online --max 22` and the same with `--reduced`: no blank, no cut into a work or a piece.
3. **Cause 8, the pictures carried** (19 left at Updates 14's count, gate-2 `run-tip.md` "a card's picture not carried"): not started. The councils' list into a council's head and Theology's paths are in round 1's files (`app/(app)/councils/page.tsx`, `components/councils/CouncilSections.tsx`, `components/theology/*`), so after it lands; measure first on an export (`motion-walk --only /councils/,/theology/,/saints/,/shop/ --online`), since some may be carried already.
4. **Found, not mine:** `scripts/faith-answers-walk.mjs` fails 15 checks on this export, motion on or reduced, and as it stood before this round (from "a new phone of an account that answered elsewhere: the first question is asked").

## Gotchas

- A script in the scratchpad cannot import `playwright` by name: `createRequire(path.join(process.cwd(), "package.json"))("playwright")`, run from the checkout.
- A real touch sweep of a row: CDP `Input.dispatchTouchEvent` (start, moves, end); `synthesizeScrollGesture` did not move the reading room's shelf.
- The house's skeleton fades in as a cascade that waits out the page switch (`.route-fade .cascade > *`): an outline that must stand at once is drawn without it.
