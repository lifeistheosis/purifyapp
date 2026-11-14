# Baton: Updates 61 (a reader's profile, opened the first time, 1.9)

Written 2026-11-14. Past the brief's 150,000 line once the mend was in, so the second export (the after side and checkMock) was not cut here: the next checks chat runs it, as below.

## Role and scope

Fixer (docs/roles/fixer.md), from Arbiter 13's brief: build 97 note 6. Changed components/community/profile/ProfileViewer.tsx and ProfileCard.tsx; added lib/profile/openedFirst.ts (used only by the profile), lib/profile/__tests__/openedFirst.test.ts and scripts/profile-open-walk.mjs. Not touched: lib/ui/useDraggableSheet.ts, the house Sheet, RouteTransition, routeMotion, the shop, ambience, Updates 59's ready-ahead.

## The measure (before), with the walk

`node scripts/profile-open-walk.mjs --out <export> [--check]`: a cold context at 390x844, CPU 4x, motion on, a signed-in stand-in; the main web's real answers read anonymously in Node, each /api answer after the tap held to 700ms at the least, the viewer's standing (relation) at 900ms. Every frame is read after its paint (read inside requestAnimationFrame, a box forces a layout the sheet's ResizeObserver has not yet held; the first numbers here were wrong that way). No reader's name or handle is written anywhere.

On the export cut from 40f975d81 (gate export, 205.2 MB):

| Opened from | card drawn | slide done | profile in | Follow drawn | the jump |
|---|---|---|---|---|---|
| a post's author | 273ms | 573ms | 1006ms | 1289ms | menu 83px aside in one frame; status at full strength at 1006ms |
| a reply's author | 141ms | 441ms | 874ms | 1074ms | menu 83px aside in one frame |
| a post's picture, menu tapped at 150ms | 276ms | 576ms | 1126ms | 1242ms | as the first; the menu opened (538ms); Follow not there while loading |

Already smooth, left as it was: the card's growth from 536px to 776px (or 620px) is eased by smoothHeight over 9 to 14 frames, largest step 16 to 75px a frame (the slowed CPU's frames run to 217ms); the doors fade in from 0 without moving (0px); the picture is there from the first frame (the feed's). The main web (purifyapp.net, signed out, same size and throttle): card drawn 95 to 139ms, profile in 795 to 822ms, the status pushing the menu row 30px in one frame, the card's growth in one frame (240px, no smoothHeight there).

## Done, with hashes

- **2fe3a254, the mend.** Follow stands from the card's first frame for a signed-in reader (`followShown`), and a tap before the standing is read follows at once (an upsert, harmless if already following), kept over the read when it lands (`followingNow`). A status line the feed did not know opens on the house curve (`ArrivingRow`, `openRow`: height 0fr to 1fr and opacity, 320ms, filling backwards; nothing with motion off), so Follow and the doors ease down instead of jumping. The walk's `--check` fails on the before export: 12 failures (the menu 83px, Follow 1074 to 1289ms late, the status at full strength, Follow not there while loading).
- **The checklist.** typecheck exit 0. eslint on the five files exit 0. `lib/profile/__tests__/openedFirst.test.ts`: 6 tests, 2 fail on the old components (Follow gated on the relation; the status not wrapped), all pass now. Whole suite: 1195 files passed, 1 skipped; 15,141 tests passed (the first run had one failure, `arrivingImage.test.ts` forbidding a `data-arriving` attribute: mine, mended as `data-opening-row`).

## Open, each with its owner

1. **The after side** (the next checks chat): one export from the head (`node scripts/gate/export.mjs`), then `node scripts/profile-open-walk.mjs --check` (expect PASS: Follow at the card's first frame, no part moving more than 2px in a frame, the status opening over frames), `node scripts/profile-open-walk.mjs --motion reduce --check`, and `--signed-out --check`. Then checkMock `{ pixels: true }` on the profile at rest and while loading at 390, 800 and 1032, en and ar, with a runner on mockrun60's model (docs/handoffs/updates-60-runners/), and the taps: Close, Follow (before and after the standing comes), the menu, each door.
2. **Web build** (the next checks chat): ProfileCard.tsx's ProfileFace is shared by the editor's preview and the Plus page's try window (an optional prop, default unchanged); `npm run build` was not run here.
3. **Stands in its final size** (the arbiter, then the owner): the card still grows from its loading height to the profile's (eased, above). Standing at the final size from the first frame needs a taller loading card, a change to how it looks, which note 13 sends to the owner as stills first.
4. **The status from the feed** (the arbiter, if wanted): both seeds carry the author's status (`lib/community/authorStatus.ts`); on the post's author measured here the feed had none and the profile brought one at 1006ms. Why the feed lacked it was not looked into.

## Gotchas

- The walk reads boxes after paint on purpose (above). It names profiles by where they were opened from; keep it that way.
- The before export is not kept in the repo; cut one from 40f975d81 to compare.
