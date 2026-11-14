# Baton: Updates 71 (the profile's last two one-frame moves, build 97 note 6, 1.9)

Written 2026-11-14 by Updates 71 (session_01VuYTwb4zdQo7HsTyv1ATYM), a fixer started by Arbiter 14, after Updates 66 (c47958a1), its opens 2 and 5. Stopped at the brief's line: get_session read 253,862 at its last reading, past 200,000.

## Done

- **95c68b40** (pushed; the guard passed every check): the walk reads each frame before its paint and fails a one-frame jump; "Follows you" no longer moves the @handle; two tests.
- Exports, `node scripts/gate/export.mjs`, the key read by the script only: **09734eb4** (before) and **95c68b400** (after), each exit 0, 205.2 MB in 7,372 files, 75.1 MB packed.

## A: the 210px step was never on the screen

**Cause: the walk, not the app.** It read each frame in a task posted from requestAnimationFrame, with whatever frame time was current when that task ran. When the profile's commit was queued first (the picture case: no seed, the whole profile at once), the read came after the commit and saw a height that `useDraggableSheet`'s ResizeObserver holds back before the next paint. Proof, before export, both reads in one run: the frame at 975ms was **painted at 566px** with the loading lines; the old read, 58ms later, saw **776px**; the next frame (991ms) was painted at 566px, held at 776px with `height 380ms` running; then 606, 641, 671, 696px. The hand-over ran on the first frame after the commit in every run: no drag, and no half snap (the profile passes `half: 1`, so it has no half rest). **`useDraggableSheet` is untouched**, so the sheet walks were not needed.

**Mend (the walk).** Each frame is read in a ResizeObserver made in that frame's requestAnimationFrame: the newest observer, so it runs after the sheet's, after layout, before paint. `--frames` keeps every frame, the card's inline hold and transition, and the old read (`post`) with its lag. **The rule** (`lib/profile/cardSteps.ts`, `oneFrameJumps`): a frame no more than 34ms after the last that moves the card by over half of a growth over 100px fails. The house curve covers under two fifths of the way in 34ms (the test works it out), so a running hand-over never trips it. A long frame is left to the old "under 3 frames" check: a 66ms frame carried 90 of 210px.

| Picture case | before, old read (b1 to b3) | before, painted (p1 to p4) | after (a1 to a3) |
|---|---|---|---|
| largest step | 210, 40, 210px | 40, 40, 55, 40px | 75, 40, 40px |
| the new rule | FAIL in b1 and b3 (210px at 992 and 960ms) | pass in all four | pass in all three |
| `--check` | PASS in all three (the old check missed it) | PASS | PASS |

## B: "Follows you"

**Before** (09734eb4, `--follows-you`): FAIL (9). The @handle moved 44px (43px in the picture case) in one frame at 1107 to 1326ms, and the mark appeared at full strength, in all three cases. **Mend**: ProfileFace's handle row spans the face; with a handle and the mark it is a grid `1fr auto 1fr`, the @handle in the middle column and the mark in the third (start, one line), the empty first column its twin. The mark fades in (`ARRIVE`, ProfileViewer). **After**: PASS; the @handle 0px in all three cases, the mark first at strength 0. **The look**: for a reader who follows the viewer, the @handle stands centred with the mark at its end (it was the pair centred). Without the mark nothing changes. Limits: a mark wider than half the room left (long labels such as ka and ne, or long handles) takes room from the empty column, so the handle still moves, by less than before; a handle that leaves no room wraps and never overflows. Walked in English at 390 only.

## The checklist

- `lib/profile/__tests__/followsYouBeside.test.ts`: **3 of 5 fail on the old code** (ProfileCard.tsx and ProfileViewer.tsx stashed), 5 of 5 pass. `lib/profile/__tests__/cardSteps.test.ts`: 5 of 5, on A's own frames; it also asserts that the old check passes them.
- `npm run typecheck` exit 0; eslint on the 6 changed files exit 0; unit suite 1,200 files passed, 1 skipped, 15,188 tests.
- profile-open-walk on 95c68b400: `--check` PASS in 3 runs, `--motion reduce --check` PASS (776px from the first frame, 0 frames changing), `--signed-out --check` PASS, `--follows-you --check` PASS.
- `npm run build` (web, at 95c68b40 plus this baton): exit 0.

## Open, each with its owner

1. **checkMock pixels and taps for B's look** (the next checks chat): a reader who follows the viewer at 390, 800 and 1032, the five palettes, and in Arabic (the mark should stand to the handle's left). Not run.
2. **B in the long-label languages** (the arbiter): only the label widths were weighed, nothing walked.
3. **Updates 66's opens 1, 3 and 4** stand as written there.

## Gotchas

- **The walk's times moved, the app's did not**: "card drawn" now reads 75 to 107ms where it read 156 to 334ms. The old read skipped frames when tasks queued; the painted read on the old export reads the same 74 to 77ms.
- **`scripts/ambience-open-walk.mjs` reads frames in a task posted with MessageChannel too**, so it can see a state that was never painted. Not mine (Updates 70); check it before trusting a one-frame step there.
- While an export builds, its 1,457 stashed files make a stop hook ask for a commit. Never commit then.

## Where things are

The walk: `scripts/profile-open-walk.mjs` (`--frames`, `--follows-you`). The rule: `lib/profile/cardSteps.ts`. The exports and the walks' JSON were in this session's scratchpad; the numbers above are the record.
