# Baton: Updates 65 (round 4's checks, 1.9)

Written 2026-11-14 by Updates 65 (session_01VuYTwcv4ueiQt58TfBafkA), a checks chat started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). Checked; no app code touched. Past the brief's 150,000 line after items 1 to 6 and 8 were running, so nothing after them was started.

## The export

One, `node scripts/gate/export.mjs`, cut from **7bbb3fc6f** (Updates 64's 7f9c9579 and its baton in; docs only after): exit 0, **205.2 MB on disk in 7,372 files, 75.1 MB packed**. The key: the main web's anon role, read by the script, not printed or saved. Every check below ran on it, one at a time.

## The checks

| # | Command | Result |
|---|---|---|
| 1 | `node scripts/ambience-open-walk.mjs --check`, then `--motion reduce --check` | Both **exit 1 at the Prayers scene** (the walk's fault, below); the scenes before it measured. Photographs: all six shown at the sheet's first frame in every opening. Motion on, frames in 1.5s / dropped / longest: reader opened 77/16/200ms, closed 82/11/134; **Words opened 61/32/267, closed 26/68/233**; Cover opened 68/24/283, closed 75/19/100. Reduced: Words closed 51/42/184, the rest 73 to 85 frames. Controls: Rain 122 and 338ms, Birds 138 and 371, stop 122, sleep 114 and 87. |
| 1 | `node scripts/gate/ambience-sheet.mjs <shots>` | **All passed**, exit 0: six sounds play, every control's tap changes something, checkMock with pixels at 390, 800, 1032, en and ar, 21 palettes and looks, two playing and quiet with one failed. A tile mid-loading was not measured. |
| 2 | `node docs/handoffs/updates-65-runners/slider65.mjs out en\|ar` (new, f4f13afd0) | **The slider is not at fault.** With Rain playing: a tap at 30% reads 0.3 in the first frame after the touch (38ms, CPU 4x); a drag from 0.3 to 0.8 follows the finger, 0.35 at about 90ms to 0.8 at 485 to 559ms; en and ar. With nothing playing the volume block is closed under the tiles, and a tap at the slider's box lands on a tile's photograph (elementFromPoint). The verse picture's Words slider is a native range input (components/share/PictureSheet.tsx:413), not Slider.tsx, so it was not tapped. |
| 3 | `NODE_USE_ENV_PROXY=1 node scripts/piece-switch-walk.mjs out --json --shots` | **4 of 4**: both forward taps 1 transition, pictured, picture carried; Back 1, pictured; reduced 0. |
| 3 | `mockrun46.mjs out <jsonl> 4` on piece@{390,800,1032}@{en,ar}@{0,1,2} | **18 of 18, 0 failures.** |
| 4 | `NODE_USE_ENV_PROXY=1 node scripts/carry-links-walk.mjs out --json` | **3 passed, 4 failed, 2 said**, exit 1. PASS 1 EIKON, 2d the drawer's row, 2e the set in the drawer (Updates 64's close mend holds). FAIL 2a the cart's row and 2b the set on the cart: the tap stayed on /shop/cart/, 0 transitions; FAIL 2c the bump: went to its piece, 1 transition, picture not carried; FAIL 3 reduced EIKON: 1 transition (want 0). |
| 5 | `node scripts/profile-open-walk.mjs --check`, `--motion reduce --check`, `--signed-out --check` | **FAIL (12), FAIL (9), FAIL (12).** Follow and the status passed. A post's author: handle moved 153px in one frame at 972ms; actions, menu, doors, tabs, panel 11px in one frame at 1305ms. The picture case: handle 141px at 976ms, the rest 8 to 9px at 976 and 1176ms. Reduced also: the card changed height in 1 frame, actions and menu 30px. Signed out: handle 153px at 992ms. A reply's author: no failure. |
| 6 | `node scripts/first-open.mjs out --runs 3` | Medians (ms; Updates 59's after in brackets): Begin 391 (356), Bible 857 (676), Discover 608 (524), Saints 1010 (1008), Prayers 707 (559), Morning prayers 328 (326), You 509 (468), Settings 379 (329), next chapter 1069 (968). Code read after the tap matches its after exactly (Bible 13 files, 638 KB). The times are another session's, and its batches spread about 100ms. |
| 6 | `--handoff --runs 3` | p95 17ms in all three; worst 33, 50, 33ms; one frame over 34ms in one run; **36 code files read during the slate**, as expected. |
| 6 | `motion-walk.mjs ... --only` the five tabs, then `--reduced` | Exit 1 both: 42 findings of frames with nothing drawn where the screen changes with motion on (first: /discover/ tap "Plus", 2 frames, 23ms from 298ms), 2 reduced (/account/ from /, 2 frames, 28ms; /discover/ to /reading/, 1 frame). No baseline compared. |
| 8 | `npm run build` | **Exit 0.** |

## Faults, with their proposed owners

1. **Closing the ambience sheet over the player's Words view** (a fixer, Updates 63's area): 26 frames in 1.5s, 68 dropped, longest 233ms (before: 32, 58, 167). The walk's line is 60. Opening now passes (61). A guess to check first, not proved: the words come back on (`active={words && !covered}`) as the sheet starts closing.
2. **A profile's first opening** (a fixer, Updates 61's area): the handle's 153px jump and the 8 to 30px moves above, signed in, reduced and signed out.
3. **The carry walk's four FAILs** (a fixer, to read first: the walk or the app). 2a and 2b may be the walk aiming at the closed drawer's copy of the row, which is in the page too (Updates 64's gotcha). 2c and 3 read like the app: 3 is a transition under reduced motion, which the piece walk's reduced case does not have.
4. **ambience-open-walk.mjs's Prayers scene is wrong** (the next checks chat): it stops every sound and then waits for the bar's Ambience button, which NowPlayingBar.tsx shows only while a sound plays. The mend: start a sound before the scene. Not mended here (the line). Its volume tap also reads the box once, and can land on a photograph.

## Not run, and why

Past 150,000: item 1's Prayers scene (above) and a tile mid-loading; item 3's Back film frame by frame (its open 3); item 5's checkMock on the profile (no runner yet) and its taps beyond the walk; item 6's open 4 (the font swap); item 7 whole.

## Where things are

docs/handoffs/updates-65-runners/slider65.mjs. The runs' JSON, logs and frames were in this session's scratchpad; the numbers above are the record.
