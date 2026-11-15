# Baton: Updates 74 (round 5's checks, 1.9)

Written 2026-11-15 by Updates 74 (session_01VuYTwbxMoNtDiqF3Quor66), a checks chat started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). Checked; no app code touched. get_session read 201,711 once step 2 was read, past the brief's 200,000 stop line, so steps 3 to 8 were not read (below).

## The export

One, `node scripts/gate/export.mjs`, cut from **d6bef349d** (the head the arbiter named; the walk mend af7f38ff in it): exit 0, **205.2 MB on disk in 7,372 files, 75.1 MB packed**. The key: the main web's anon role, read by the script, not printed or saved (no key in the log). Every check below ran on it, one at a time.

## The checks

| # | Command | Result |
|---|---|---|
| 1 | `MOTION=on node docs/handoffs/updates-67-runners/tileloading67.mjs out <shots>` | **PASS in all six** (390, 800, 1032, en and ar): 21 palettes and looks each, the line at 0.7 with no animation. |
| 1 | the same with `PULSE=faint` | **PASS in all six**, the same. |
| 1 | `MOTION=off ...` | **PASS in all six**, motion reduce, the same. |
| 1 | `node scripts/gate/ambience-sheet.mjs <shots>` | **All passed**, exit 0. |
| 1 | `npm run test:unit` | exit 0: **1203 files passed, 1 skipped; 15,200 tests passed, 9 skipped.** |
| 2 | walk mend **af7f38ff** (pushed) | A close is counted only while its sheet is drawn, at the same rate (floor `ceil(60 x gone / 1500)`); the walk reads `data-motion` after its first page and stops when it is not what `--motion` asks. |
| 2 | `node scripts/ambience-open-walk.mjs --check` | data-motion full. **PASS.** Words opened 78 frames / 14 dropped / longest 167ms. Words closed 56 / 37 / 150, the sheet gone at 387ms, **while drawn 16 frames (floor 16)**, 9 dropped, longest 150ms; the words woke at 440ms. Words view with nothing over it 52 / 38 / 67. |
| 2 | `... --motion reduce --check` | data-motion reduce. **FAIL (1): Words closed, 6 frames in 207ms until the sheet had gone (at least 9)**, 1 dropped, longest 33ms. The whole window has 74 (the old count passes). Fault 2. |
| 2 | `... --film <dir>` (new, **d3cd8bf0**), motion on, then reduced | Motion on: the line read moved from 1 to 2 while the sheet was open (the words held at 55px). **In the frame the sheet left (381ms after the tap), the words scrolled 55 to 142px, 87px in one frame**; the frame before was at 265ms. The screencast's consecutive frames at 328 and 398ms show the same jump. Reduced: the same 87px in one frame at 166ms, which is how reduced motion moves. Fault 1. |

## Faults, with their proposed owners

1. **The player's words jump to the line being read in one frame as the sheet leaves, with motion on** (LiveCaptions' owner, a fixer): 87px in one painted frame, read in a ResizeObserver made in that frame's rAF. Code read, not proved: `components/player/LiveCaptions.tsx:443-451`, the `[active]` layout effect ("Shown again ... in place"), calls `scrollTo(top, false)` after the `[current, active]` effect's smooth call. A mend glides there on the house curve with motion on when the words wake from under a sheet, and stays instant when reduced. Prove it with `--film` (expect the move spread over several frames with motion on).
2. **The reduced close fails the mended count** (the arbiter, to route: the rule or the app). A long animation frame at the tap, **107ms from 11ms (script 59ms) at CPU 4x**, puts the first frame at 124ms, and the sheet, which stands still at 449 with motion reduced, is dropped at 207ms. Nothing moves in that time. Motion on has a 132ms long frame at the tap (script 77ms) and passes at its floor. Either the rule leaves a reduced close out, or a fixer cuts the close's work at the tap.

## Not run, and why

Past the line: **step 3** (mockrun66 on the profile; taps; the "Follows you" look), **step 4** (piece-switch-walk and the Back film), **step 6** (the font swap), **step 7** (the Councils preview, quote51, the florilegium picker with keyboard-sheet-walk, mockrun60's unmeasured words) and **step 8** (`npm run build`). They were queued at about 139,000 and stopped unread at the line; mockrun66 has still never been read. **Step 5**: nothing owed (Arbiter 14: Updates 72 and 73 ran their after sides). The next checks chat runs:

- `node docs/handoffs/updates-66-runners/mockrun66.mjs out <jsonl> 3 rest@{390,800,1032}@{en,ar} loading@{390,800,1032}@{en,ar}`, then `... 1 taps@390@en`, then the rest set and taps again with `FOLLOWS_YOU=1` (**10d5c428**: each line carries `followsYou`, and `opened.followsMark` gives the mark's side of the @handle, the gap and the row; left is expected in ar).
- `NODE_USE_ENV_PROXY=1 node scripts/piece-switch-walk.mjs out --json <f> --shots <dir>` (expect 4 of 4), then the Back step's frames in `<dir>`.
- `node docs/handoffs/updates-60-runners/mockrun60.mjs out <jsonl> 2 ws-0@390@en ws-1@390@en journal@390@en living@390@en`.
- `npm run build`, last.

## Gotchas

- The ambience walk's frames are entries from a MessageChannel sampler and can repeat a time (Updates 71's note): the reduced close had 6 entries at 4 distinct times, the motion-on close 16 at 14. Count distinct times when a floor is close.
- While an export builds, `git status` shows the website-only trees as deleted. Never commit then.

## Where things are

`scripts/ambience-open-walk.mjs` (the close rule af7f38ff, `--film` d3cd8bf0), `docs/handoffs/updates-66-runners/mockrun66.mjs` (`FOLLOWS_YOU`, 10d5c428). The runs' logs, JSON and frames were in this session's scratchpad; the numbers above are the record.
