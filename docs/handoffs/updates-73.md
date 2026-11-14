# Baton: Updates 73 (Today's Saint card carries his picture)

Written 2026-11-14 by Updates 73 (session_01VuYTwacH394dNqNSRXd7xs), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). Checked only what was touched (his word, 13:57). Two exports: `5c4bd9562` (before) and `320a33b68` (after); `node scripts/gate/export.mjs`, the main web's anon key read into that one command, role anon, not printed, not saved.

## Done

- **Cause.** Today's band for a saint with no words of his own (`SaintBand`, `components/today/ChurchTodayRail.tsx`) is a link around his picture, and the picture wore no `data-carry`, so `liftFrom` had nothing to lift. His page takes a picture by his icon's address (`SaintHeroPicture.tsx`, `data-carry-into={iconUrl}`), as the Saints tab's cards give it (`SaintIcon.tsx`).
- **Mend, `0d01831b`.** The band's picture frame wears `data-carry={saint.carry}` (`carry: headlineSaint.iconUrl`). Its shade and its words stand on the picture, so they are marked `data-carry-over` (routeMotion's `wear`; globals.css "What stands on a travelling picture"), or the shade is gone under the picture in the first frame. Nothing changes at rest. The calendar band (no profiled saint) carries nothing.
- **Test.** `lib/today/__tests__/todaySaintCarry.test.ts`: 3 of 4 fail on the old code, 4 of 4 pass on the new.
- **Checks.** Typecheck exit 0; `npm run test:unit` exit 0 (1,200 files passed, 1 skipped; 15,185 tests passed, 9 skipped); eslint exit 0 on the three changed files; the push guard passed. No web build (no CSS, no shared file).
- **Recorded on the exports** (`docs/handoffs/updates-73-runners/carry73.mjs`: the walk's phone, shell, main web and touch, every View Transition's pseudo-elements):

| | Before, `5c4bd9562` | After, `320a33b68` |
|---|---|---|
| Out to `/saints/apostle-philip/` | 2 of 2: `(root) (tab-bar) (_t_0_)`, nothing carried | 3 of 3: `(carried) (carried-over-1) (carried-over-2)` with root, tab bar, `_t_0_`; his page's icon landed |
| Back (the top bar's Back) | 2 of 2: `(root) (tab-bar)` | 3 of 3: `(carried)` and both over; the band's picture landed |
| Reduced motion | 0 transitions out, 0 back | 2 of 2: 0 out, 0 back |

The key matches on both ends: `/saints/icons/apostle-philip.v2.jpg`.

## Open

| What | Owner | Next step |
|---|---|---|
| The walk cannot see this card's carry: its check fires only where the page shows a picture of the same file name (`motion-walk.mjs`, `pictureOnPage`), and the band's portrait (`/covers/authors/apostle-philip.v1.avif`) is not his page's icon. So it passed the card on `5c4bd9562`, before the mend. On `320a33b68` it did not reach the card among its 27 controls. | the walk's keeper | Read `(carried)` for any tapped link whose picture wears `data-carry`, not only a same-file match. |
| The band for the 20 saints with words of their own (`SaintWordsBand`, then `SpeakerBand`): only the name is a link, it holds only text, and the face is not in its parent, so `pictureOf` finds nothing. Not walked (Philip has none). | the arbiter | Whether the rule covers a band that is not itself a link. `SpeakerBand` is shared with `TodaySayingCard`. |
| `/`, reduced motion: a road card's Dismiss makes the row below jump 179px. Seen on both exports here (walk exit 1, the only finding). | a fixer | Already Updates 69's open item, `components/onboarding/RoadCards.tsx`. |

## Walks (`motion-walk.mjs out --only / --online`, then `--reduced`)

Before: motion on exit 0, 27 tapped, 0 fails (2 layers seen in passing: listed, not failed); reduced exit 1, the Dismiss jump only. After: the same in both modes.
