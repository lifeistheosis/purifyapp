# Gate 5: the check of what changed since Gate 4's export (Updates 92 to 97)

One export of `1276bf701` (`node scripts/gate/export.mjs`, exit 0). Its app code is `78c5297e1`, the last app commit (14:28 UTC); every commit after it is under `docs/`. The key was checked to be the anon role and written nowhere: 0 key-like strings in the export's log. Export size 208.2 MB on disk, 76.0 MB packed (ceiling 240.0 and 85.0). Runners and records: `docs/handoffs/gate-5-walks/` (`walks5.sh`, `tap5.sh`, `guard5.sh`, `seeall5.mjs`, `sum5.mjs`; the JSON gzipped). One walk at a time, nothing else running.

Sorted by gate-run-4.md's rules: a crossing in passing is for the eye; with motion reduced an in-page change at once is by design.

## Result

**No fault found.** Steps 1 to 3 pass. Step 4 passes where it measured; See all's checkMock was measured at 390 in English only. Step 5 was not run: the arbiter asked for the wrap-up at 18:32 UTC.

## Step 2: the motion walk

**Online** (`walks5.sh online`): both readers, motion on and `--reduced`, once each. `--only` /prayers/bows/, /reading/, /set-password/, /account/ and its seven (data, eikon-box, notifications, profile, profile/edit, security, sessions), /history/alaska-mission/; `--controls "Read it in Purify|See all|Matthew 28:19-20"`.

| | open, on | open, reduced | new, on | new, reduced |
|---|---|---|---|---|
| screens, arrivals passing | 12, 12 | 12, 12 | 12, 12 | 12, 12 |
| taps passing (5 Read it in Purify, 7 See all, 1 Matthew 28:19-20) | 13 of 13 | 13 of 13 | 13 of 13 | 13 of 13 |
| errors, control errors, unsure | 0 | 0 | 0 | 0 |
| findings | 5, all for the eye | 0 | 5, all for the eye | 0 |

- The switch into /set-password/ and the account family: no blank in any of the 4 walks; each switch changes 0.256 to 0.257 of the screen, as Updates 96 measured.
- For the eye, motion on: the layers crossing in passing (the top bar over its plates row, the reader pill over the tab bar, on Matthew 28 and on the twenty canons; the top bar over Basil's outline). The walk also lists 10 one-to-three-frame dips a walk (the switches into /account/ and /reading/, the guide's links, Matthew 28) and one slow screen: the Trullo canons answered 842 ms after the tap (Updates 94's Left).

**No network** (`walks5.sh offline`): both readers, both lanes, once each. `--only` /, /history/alaska-mission/, /dictionary/, /walkthroughs/job/1/, the five /campaigns/ screens, /community/moderate/, /shop/, /shop/category/all/, /shop/stores/, /community/; `--controls "Try again|1782 Philokalia|New Martyrs|Hesychast councils|Matthew 28:19-20|Context for verse 1|Context for verse 5"`.

| | open, on | open, reduced | new, on | new, reduced |
|---|---|---|---|---|
| screens, arrivals passing | 14, 14 | 14, 14 | 14, 14 | 14, 14 |
| taps passing | 19 of 19 | 19 of 19 | 19 of 19 | 19 of 19 |
| errors, control errors, unsure | 0 | 0 | 0 | 0 |
| findings | 2, for the eye | 0 | 2, for the eye | 0 |

- Reached in every walk: Try again on all ten screens; "1782 Philokalia" and "1917-1991 New Martyrs" on /history/alaska-mission/; "Hesychast councils" on /dictionary/; "Matthew 28:19-20"; Job's "Context for verse 1" and "5" (and "12", which the name also matches).
- The /history/ arrival from / passes in all four (0.496 of the screen changes, no jump). The two findings are Matthew 28's crossings in passing.

**A post's replies' Try again** (`replies94.mjs`, both readers, both lanes): 8 of 8 taps with 0 frames changed and no waiting state drawn; the card stands at 102px with its three elements throughout.

**Updates 97's probe** (`probe97.mjs ... on feed --end --delay 2500 --up 1500`, on the build): at the foot (sy 3211, KeepScrolling at y 81) nothing was drawn and nothing moved. After the jump up to sy 1711 the section came in the next frame at y 1477, below the 844 screen, and KeepScrolling went from 1581 to 1933, also below it. That is Updates 97's read on its patch (`patched-nomargin-probe-b-foot-feed-on.txt`), now on a build.

## Step 3: the tap walk

`tap5.sh`, both readers, `--online`, the 14 screens: **256 controls tapped, 0 failed**, for each reader. Sheets, menus and dialogs opened: 28 and 27, each held to checkMock's rules, 0 failed. Words over a picture in them: 133 and 134, every one answered by its pixels on every palette. For the eye (new reader): /settings/ "Learning", the Familiarity radios Gate 4 placed as allowed. Four screens hold more than the walk's 30 controls (/community/ 188, /reading/ 185, /settings/ 51 or 52, /shop/ 51).

## Step 4: checkMock with pixels, the open reader, all 21 palettes and looks

- **/history/alaska-mission/ and /walkthroughs/job/1/ with no network** (`guardrail-walk.mjs --every`, en and ar at 390, 800 and 1032): **12 of 12 screen runs with 0 failures, 0 unmeasured, 0 errors.** The one line over a picture, "Kodiak" over the map, reads 5.71 to 6.25:1 at its least of the 21 (need 4.5).
- **/reading/ with See all's list opened in place** (`seeall5.mjs`, online; the first in-place See all, `?length=under20`):
  - 390, en: **pass**, 0 failures and 0 unmeasured.
  - 800, en: **not measured.** The browser closed under checkMock's pixel pass in 2 of 2 runs (the first chain hung after it until the two-hour limit; the rerun hit its 20-minute cap). The list had opened intact in place before it: `seeall-800-en.jpg`, 158 works under "20 minutes or less". Cause not read. Likely the pass's own load (158 covers with words over pictures, on 21 palettes), not proved.
  - 1032, en: stopped by this chat at the wrap-up, 8 minutes into checkMock.
  - 390, 800 and 1032, ar: not reached.

## Step 5

Not run (the wrap-up). The arbiter reports that Updates 97 ran the whole suite on the last app code (15,345 passed); that is not measured here.

## Known and called (not routed again)

/community/'s 77px close for a new reader with nothing kept; the verse landing's 2 s focus dim; checkMock's reading of /shop/eikon/ on the light palettes; a chapter that fits on one screen gets no Community section on that visit.
