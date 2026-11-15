# Baton: Updates 85 (Gate 3c groups 3, 4 and 6)

Done 2026-11-15. Fixer started by Arbiter 14. The mend: `db0cd147`. The after runs: `docs/handoffs/updates-85-runners/` (eight walks on one export of `db0cd1475`, `summary.txt`, one still).

## The causes, as read in the code and the walk's data

- **Group 3, Community's "Ask a Priest" cut.** Two steps, each about half the change. `components/community/FeedTabs.tsx` called `onFilter` at once, so the tap cut to the tab's waiting rows; then `components/community/CommunityClient.tsx`'s questions effect set the fetched list at once about a second later (Ask a Priest reads its own list from the server). Moving only the tap would have left the second half as a cut.
- **Group 4, "Keep this gathering" cut.** `components/florilegium/StarterPage.tsx` made the gathering inside `plusFeaturesNow().then(...)` with no move, so the 48px button gave way to the kept row in one frame and the passage stepped down.
- **Group 6, Settings' reading-mode card jump.** Not a section reflowing. The box that moved is the house Sheet's panel (the walk's node class `absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl ...`), opened by the Councils goal card (`data-palette-goal`). `components/reader/EarnSheet.tsx` opened the sheet before the councils' names had come (a dynamic import of `lib/councils/councils.ts`), so it rose short and then grew by its whole list at once: 467px up in one frame. `ReadingModeGallery.tsx` itself needed no change; the same sheet serves Settings' row, the reading-mode page and the Bible's sheet.

## The mend (`db0cd147`), the house's means only (`lib/ui/inPageMove.ts`)

- FeedTabs: a word's tap and the arrows go through `movePage` (the feed cross-fades, as the saints' filters do). The sliders' choices are filters and still change at once (the ruling allows it).
- CommunityClient, the questions effect only: a list that changes what the tab shows moves in after the tab's own move (`afterMoves`, then `movePage`); one that changes nothing is set as before, so no empty transition holds the page. A ref kept by an effect says what is shown. Not the post rule, not CommunityHead.
- StarterPage: `movePage(..., { grows: [action] })`, as FlorilegiaHub's naming form does: the row is let down in the button's place and the passage glides. The one-keep guard now holds until the row stands (the change is made a frame or two after the tap).
- EarnSheet: the Councils sheet renders once its names have come (`if (!goal || wanted) return null;`) and rises as one piece in its own motion; if the import fails it opens without doors, as it did. The answer time did not grow (Councils card answered at 133 to 150ms, before 124 to 134ms).
- Under reduced motion each change is made at once (`movePage` checks `canMove`); no stylesheet change.
- Files outside the brief's list, said here: `components/community/CommunityClient.tsx` (the questions effect) and `components/reader/EarnSheet.tsx` (where group 6's cause is).

## Proof

- `lib/ui/__tests__/inPageMoveGate3c.test.ts`: 4 tests, 4 pass on the mend, 4 fail on the old code (stash run).
- typecheck 0; `npm run test:unit` 1210 files, 15249 tests passed (9 skipped); eslint clean on the five files; `npm run build` (web) exit 0; the push guard passed.
- One export of `db0cd1475` (`node scripts/gate/export.mjs`, exit 0). The walk, `--only` the four screens, `--controls 'Ask a Priest|Keep this gathering|John Chapter 1'`, one worker, `--online`, two runs per reader per lane:
  - Motion on, 4 of 4 runs: 0 cuts, 0 jumps, 0 findings. Each run tapped Ask a Priest, Keep this gathering, 7 cards on /settings/ and 21 on /settings/reading-mode/, both goal cards on each among them; all passed.
  - Reduced, 4 of 4 runs: the controls reached all passed; nothing new from the mend.

## Found on the way, not mended (not my files)

- **/community/, reduced, the page switch from /: a jump, 4 of 4** (both readers): the "Sign in to share" section 77px up in one frame (y 197 to 120) at 284 to 346ms. The still (`mwr-open-1-community-arrival-jump-0.png`) shows an empty band about 77px tall between "Community" and the tabs' loading bars closing at once; FeedTabs is not yet drawn then, so it is not this mend. Gate 3c's reduced runs on `f637f7b8a` had 0 fails on that arrival (3 of 3 checked). Since then `44d567fa` (Updates 80) and `61af8a5e` (Updates 82) changed the language's arrival. The band is in the Community head (CommunityHead.tsx, Updates 77 and 78's), which I may not touch.

## Left

- Nothing of groups 3, 4 and 6.
- Not run: checkMock's pixel pass (no look changed), and a phone walk.
