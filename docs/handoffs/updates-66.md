# Baton: Updates 66 (a reader's profile, opened the first time, the second mend, 1.9)

Written 2026-11-14 by Updates 66 (session_01VuYTwZnXtWgTXTCr4y1qET), a fixer started by Arbiter 14. Build 97 note 6, after Updates 61's mend (337b10291). Stopped at the brief's 200,000 line (get_session read 255,043) with the mend in and measured; checkMock and the taps were not run (below).

## The exports

Two, `node scripts/gate/export.mjs`, the key read by the script only: **cdb67306a** (before) and **16af9848** (after), each exit 0, 205.2 MB on disk in 7,372 files, 75.1 MB packed.

## Each one-frame move, its cause and its mend (16af9848, landed as c47958a1 after the rebase)

| Measured on cdb67306a | Cause | Mend |
|---|---|---|
| The @handle "moved" 141 to 153px in one frame | **The walk.** Updates 61 wrapped a late status in an opening row with no italic class; the walk named the status only by its italic, read the row as a second handle, and the key jumped from the narrow handle line to the full-width row. No "status" was ever measured. | The walk names the status by `data-profile-status` (or its italic on the main web) and never lets two rows share a name. |
| Follow, the menu, the doors, tabs and panel 5 to 11px a frame (motion on); Follow and the menu 30px in one frame (reduced) | **The main web's feed sends no `author_status`** (0 of 50 posts, curl 2026-11-14; 1.9's server does). Every status came about a second after the card and opened on the curve (or at once, reduced), pushing all under it. | The seed keeps "did not say" (undefined) apart from "none" (null) (CommunityClient.tsx, two lines, outside my held files). `statusWay` (lib/profile/openedFirst.ts): when the server did not say, the face holds one status line's place (30px) from the first frame; a line that comes fades in there, none leaves the place. |
| Reduced: the card grew 240px (84px for a reply) in one frame | `smoothHeight` never eases with motion off (useDraggableSheet). | On a phone, with motion off, the card stands at its full height from the first frame (`motion-reduce:min-h-[92dvh]`). |

## The walk, before and after (`node scripts/profile-open-walk.mjs --check`)

| | cdb67306a | 16af9848 |
|---|---|---|
| motion on, signed in | FAIL (12) | **PASS**: every part 0px; status from the card's first frame |
| `--motion reduce` | FAIL (9) | **PASS**: card 776px from the first frame, 0 frames changing |
| `--signed-out` | FAIL (12) | **PASS** |

Times barely moved: card drawn 156 to 334ms before, 157 to 289ms after; profile in 892 to 1084ms before, 890 to 1005ms after (one signed-out run 1856ms, the network). Loading card 536px before, 566px after (the held line).

## The checklist

`lib/profile/__tests__/openedFirst.test.ts`: 12 tests, **7 fail on the old code** (stashed), 12 pass on the new. `npm run typecheck` exit 0. eslint on the six changed files exit 0. Whole unit suite: 1196 files passed, 1 skipped, **1 failed**: `lib/profile/__tests__/profileCardGrows.test.ts` pinned the seed lines' old `?? null`, which this mend drops on purpose; brought to the new form (its intent, the feed handing the card the line, holds), and that file passes (with openedFirst, 20 of 20). 15,171 tests passed. `npm run build` (web; ProfileFace is shared): **exit 0**.

## Open, each with its owner

1. **checkMock and the taps** (the next checks chat): `node docs/handoffs/updates-66-runners/mockrun66.mjs out <jsonl> 3 rest@{390,800,1032}@{en,ar} loading@{390,800,1032}@{en,ar}`, then `taps@390@en` (Follow before and after the standing, the menu, each door, Close). The runner is written and lint-clean but **has never run**: read its first lines of output before trusting it.
2. **A 210px step in the card's height** (the arbiter, to route: the sheet hook is not mine). In the picture case (the menu tapped while loading), 2 of 3 runs after showed the growth 566 to 776px with one 210px step among 14 changing frames; the third (a copy of the walk dumping every frame) eased it in 40px steps. Never seen before (where it would read 240px). The walk passes it (it fails only a growth in under 3 frames). A guess, not proved: the menu's tap leaves the sheet thinking a drag or a half snap is on, so the hand-over is skipped.
3. **The held place's look** (the arbiter, then the owner): opened from a feed whose server did not say (the main web, until 1.9's server is on main), a reader with no status keeps an empty line (30px) under the handle on that opening; a status of two lines eases its second line down. Once 1.9's server is live the feed says, and nothing is held.
4. **Desktop with motion off** (the arbiter): the min-height is the phone's only; the centred card there still changes height in one frame.
5. **"Follows you"** (the arbiter): it comes with the standing (900ms) beside the centred @handle and moves it sideways in one frame for a reader who follows the viewer. The walk's stand-in standing has it off, so it never shows. Holding its place changes the look; not mended.

## Gotchas

- While an export builds, `scripts/native-build.mjs` stashes 1,457 tracked files out of the tree: `git status` shows them deleted. Never commit then.
- The walk's frames are read after paint; its 4x CPU makes frames 100 to 300ms, so an eased move shows as 5 to 11px steps.

## Where things are

`docs/handoffs/updates-66-runners/mockrun66.mjs`. The walks' JSON and logs were in this session's scratchpad; the numbers above are the record.
