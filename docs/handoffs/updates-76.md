# Baton: Updates 76 (round 6's checks, 1.9)

Written 2026-11-15 by Updates 76 (session_01VuYTwbYYLAe8Vja6GwAKz9), a checks chat started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). No app code touched. get_session read 91,574 at the start and did not move after that (its updated_at stayed at the start), so the budget was kept by my own count, which reached the line at the end of step 4.

## The export

One, `node scripts/gate/export.mjs`, cut from **5bf09c2c**: exit 0, **205.2 MB on disk in 7,372 files, 75.1 MB packed** (ceilings 240 and 85). The key: the main web's anon role, read by the script, not printed or saved. Every check below ran on it, one at a time.

## The checks

| Step | Command | Result |
|---|---|---|
| 2 | `mockrun66.mjs out <jsonl> 3 rest@{390,800,1032}@{en,ar} loading@{390,800,1032}@{en,ar}` | **PASS**, exit 0 after 454s: 36 of 36 groups, 0 failures, 0 unmeasured, 0 page errors. Rest card 776 / 1101 / 1183px tall; loading 566 / 567 / 567, busy, no doors, the status place kept. |
| 2 | `... 1 taps@390@en` | **PASS**: Follow before the standing (off to on, no notice), Follow after it (on to off), the menu (4 items), doors 1, 2 and 3 (each selected, one panel), Close (the card gone). No page errors. |
| 2 | `FOLLOWS_YOU=1 ... rest@{390,800,1032}@{en,ar}` | **PASS**, exit 0 after 480s: 18 of 18 groups clean. The mark: **right** of the @handle in en, **left** in ar, a 9px gap, the same row, at all three widths; card heights unchanged (776 / 1101 / 1183). Not measured by the runner: the handle's own place with and without the mark, and the fade. |
| 2 | `FOLLOWS_YOU=1 ... 1 taps@390@en` | **PASS**: the same seven taps, the same results. |
| 3 | `NODE_USE_ENV_PROXY=1 node scripts/piece-switch-walk.mjs out --json <f> --shots <dir>` | **PASS, 4 of 4**, twice (the second with frame times, da3ac37e). |
| 3 | the Back step's frames | **No fault.** The move ran 162 to 537ms. No outline (no skeleton) in any of its 23 frames: the prayer rope's page comes in whole inside the crossfade. Its Buy now is grey at 325ms (frame 8), lighter at 369 and 407, white from 441ms (frame 14), all before the move ends; frames 20 to 22 (537, 571, 583ms) show the whole page. The grey is the page still fading in (its price and words are dim with it). |
| 4a | `SELLS_PLUS=1 node scripts/gate/ambience-sheet.mjs <shots>` | 22 of 23, exit 1 after 717s. **Councils at 390 in en did not repeat**: checkMock passes there on 21 palettes and looks. **One different fail, also at 390: in ar on Candlelight, "And the Word was made flesh, and dwelt among us," (John 1:14 in the preview's Bible window) 2.87:1.** The screenshot (preview-ar-390, the default look) shows that window at verses 1 to 3, the photographs' strip under it, and 1:14 not in view. The fail moves between runs (Updates 51: Councils, en, the pitch's two lines; now Candlelight, ar, a verse) and stays at 390. Not proved an app fault: it reads as words measured where they are not painted (scrolled or clipped in the window, over the strip) or a moment in the window's motion. |
| 4b | `quote51.mjs out <json> en`, then `ar` (runner mend 1266647c) | **Not run to its checks: no share on Today.** Both languages: the share control was not there in 45s nor after scrolling the whole page; bands saint, fast, readings; no page errors. The picture (today-at-45s) shows "Today's Saint: St. Paisius Velichkovsky, Elder of Neamt" as the plain band, name and icon, no words: `ChurchTodayRail.tsx:227` draws the words band (with its share) only when the headline saint has words. Not a scroll; nothing to mend in the runner beyond the record it now writes. |
| 4c | `NATIVE=1 node scripts/keyboard-sheet-walk.mjs out florilegium step 300` (new, 1266647c) | **Not proved.** The walk never reached the picker: it tapped the verse's door, a control out of sight until a keyboard lands on it, which the commentary button covers (tap timed out at 30s), twice. |
| 4c | `NATIVE=1 COVER=1 ... out journal step 300` | **PASS**: field 476.3 at the tap, 417.3 as the keyboard comes, 417.3 at rest (body scrolled 59); edge 12.8 before the keyboard, 12.8 at rest. |
| 4c | `NATIVE=1 ... out living step 300` | **PASS**: field 1023.3 at the tap, 268.4 as the keyboard comes, 266.3 at rest; edge 110.6 before, 110.6 at rest. |
| 4d | `mockrun60.mjs out <jsonl> 2 ws-0@390@en ws-1@390@en journal@390@en living@390@en` | **PASS**, exit 0 after 127s: 12 of 12 groups, 0 failures. One word unmeasured: the journal's "Write what is on your heart, or pray in your own", a picture (svg) drawn across it. ws-0, ws-1 and living have none. |

## Faults

None proved in the app this round. Two open items, each with its next step:

1. **The ambience preview's one contrast fail at 390** (the arbiter, to route): it moves between runs. Next: read the failing line's box against the window's own clip (is it inside the window's visible rect when measured?) and run the preview twice more at 390; only a fail that repeats on the same line is a fault.
2. **The quote's looks, tapped** (the next checks chain): today has no words band. Run quote51 on a day whose headline saint has words (set the page's clock in the runner), or from the saying band.

## Not done, and why

- **4c: the florilegium picker with several gatherings.** The walk's opener must change: on a phone a verse's tools open with a long press on the verse's words (`components/bible/VerseRow.tsx`, `onWordsTouchStart`, about line 515), not the door. The seeding (8 gatherings under `purify:florilegia`) and the rest of the path (Gather, then "Begin a new gathering", the name field) are in the walk, unproved. If Plus is refused, the walk says the upgrade sheet opened.
- **4c: the campaign sheets and the highlight names sheet**: not walked. The walk has no way to open them: the campaign sheets (pictures, change, report) need a campaign; the highlight names sheet opens from the Bible's highlight colours.

## Where things are

`docs/handoffs/updates-51-runners/quote51.mjs` (the picture and bands when the share is late, 1266647c), `scripts/keyboard-sheet-walk.mjs` (`florilegium`, 1266647c), `scripts/piece-switch-walk.mjs` (times.json per step, da3ac37e). Logs, JSON and frames were in this session's scratchpad; the numbers above are the record.
