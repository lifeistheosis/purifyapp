# The pre-build gate, run 3: the re-check (2026-11-14 to 15)

The arbiter's call (Arbiter 14, 23:25 UTC): the re-check before the next test build, scoped by the owner's word of 13:57 UTC ("only do a check on the things you worked on"): what changed since the last passing gate (`3b17a0aca`), the motion walk over all its routes, and the items owed (`docs/NOW.md`, Next 3). Run by Gate 3 (session_01VuYTwcC9GCUG4dKZdVn7ap). It names faults and mends no app code. **It stopped at its line of 200,000 tokens** (get_session 210,829 at 00:58 UTC on the 15th) with the motion walk still running; what is left is at the end.

**The export:** `node scripts/gate/export.mjs` of `d6bef349d`, the head on the arbiter's word at 23:44 UTC (the one commit after it before the walks, `f806fb384`, is docs). Cut 23:45 to 23:48 UTC: 205.2 MB on disk in 7,372 files, 75.1 MB packed. The store workflow's own switches as Gate 2 had them: Plus enforced on Android with the stand-in RevenueCat key `walk` (the export sells Plus and nothing can be bought), Google sign-in unset (the walks are signed out), the EIKON Box unset. The release-day switches: CAMPAIGNS_OPENING "testers", PICTURES_IN_STORE_BUILDS false, CAMPAIGN_NOTICES true, JULY_GROUPS_GO true, CARE_NOTE_SEND true. The main web's public key was read from purifyapp.net's own scripts into that command alone ("yes key always"), checked to be the anon role of avbqyvjgcrucjwevwixt, and printed and written nowhere.

**The walk's one mend:** `f38b6e266`, `scripts/motion-walk.mjs`, at the arbiter's note 1 (Updates 73's open 1). The carried-picture check fired only where the opened page shows a picture of the same file name. Now a tapped link whose picture wears `data-carry` (found as `lib/ui/routeMotion.ts`'s `pictureOf` finds it), opening a page whose picture takes it (`data-carry-into`, with its key or with none), fails when no View Transition carried it, and each such tap records `carry { key, taker, carried }` in the JSON. Smoke-tested alone on `/` (27 taps, 0 errors, exit 0): Today's Saint into `/saints/apostle-philip/` judged `{ key and taker /saints/icons/apostle-philip.v2.jpg, carried: true }`. No app code was touched.

**The runner:** `docs/handoffs/gate-3-runners/mockrun-g3.mjs` (from Updates 60's mockrun60): checkMock `{ pixels: true }` on four states, a reader signed out, reading the main web (GET only).

## 1. Gate 2's seven faults

The tap walk on the seven fault screens (`/bible/1-chronicles/1/ /shop/ /shop/category/all/ /shop/icons/byzantine-three-beam-wall-cross/ /plans/acts/ /community/ /privacy/`), `--workers 1 --max 1000 --online`, both readers, from 23:49 UTC (stage 1, with the guardrail walks beside it and the runner after, ended 00:51 UTC): **new reader 373 controls, 0 failed, 42 sheets, none failed; open reader 375 controls, 0 failed, 42 sheets, none failed.**

| Gate 2's fault | Measured | Result |
|---|---|---|
| 1. The Translation sheet on the earned palettes | The tap walk opened "Translation" from 1 Chronicles 1's "Switch translation, currently Brenton LXX" and measured it with checkMock on the five and the two earned | **No longer shows.** 0 lines, 0 unmeasured, both readers (mend `3c929e68`) |
| 2. A sold-out card's Save under its link | The tap walk, /shop/ and /shop/category/all/, both readers | **Not proved either way.** Every heart it reached passes (7 and 8) and its list ends the 33-Knot rope's card at its link with no heart of its own after it, so the list does not show that this card's heart was reached. The runner's `heart` state answers it (what the finger meets at the heart's centre, and the address after its tap); not run (the line). Mend `581570c2` |
| 3. Buy now moving 27px | The tap walk on the piece's page, both readers; the runner's `buybar` | **No longer shows.** Buy now passes; at 390 its top is 677.3px before the tap, 400ms after and 2s after, in English and in Arabic (mend `a6b9a9c2`) |
| 4. /plans/acts/ held only by the browser | The tap walk, both readers, each Mark day tapped again with anchoring off | **No longer shows.** Days 1 to 5 pass, both readers |
| 6. Today's date line at 1032 | The guardrail walk at 1032 by 1376 on / and /signout/ (with /privacy/), both readers | **No longer shows.** 3 of 3 clean, each reader (mend `f5f5745d`) |
| 7. The Virgin of Vladimir card's carry | In the motion walk's /shop/ | **Not read** (the walk was running at the line) |
| 8. /reading/ in Arabic on Candlelight at 800 and 1032 | The runner's `featured`: the featured work's block on all 21, at 390, 800 and 1032, English and Arabic | **The block passes, the exact case not repeated.** 0 failures in all 18 runs, but the featured work on the 15th is On the Incarnation (St. Athanasius), not Gate 2's Selections, so the line was measured over another picture. `FIXED_DATE=2026-11-14T13:00:00Z` in the runner fixes the day; not run (the line). Mend `4f09b301` |

## 2. /community/ with a thread open (fault 5's mend, `59d1fd98`)

- The tap walk tapped every "N replies" on the live feed, 50 for each reader (among them 5, 4, 3 and 2 replies): **all pass**, both readers (what opened stands in view, or the page goes with it).
- checkMock with pixels on the post with its thread open, at 390, 800 and 1032 in English, the five and the two earned: 0 failures, but the runner opened its first post, which had 0 replies. It now opens the post with the most replies; not run again (the line).

## 3. The buy bar on the looks with the ask line shown

The runner's `buybar`: Buy now tapped with the box not ticked, then the foot bar measured at 390, 800 and 1032, English and Arabic, on all 21 (the five, the two earned and the fourteen looks): **18 of 18 clean.** "Please agree to the Terms and shipping & refund policy first." shows inside the bar at every width (at 390 at 605 to 633px, the bar's Buy now unmoved).

## 4. /privacy/ (`7b38f18f`)

- The runner's `privacy`, the page whole, English and German, at 390, 800 and 1032, the five and the two earned: **6 of 6 clean**; no arrow glyph and no em dash in its words in either language.
- The guardrail walk on /privacy/ at 390, 800 and 1032, both readers: clean. The tap walk on /privacy/, both readers: no fail.

## 5. The motion walk over all its routes

Started 00:52 UTC on the 15th, the two readers' lanes at once (two workers each, `--online --json --shots`), then the same with `--reduced`. **Not read: it was running at the line.** A chain in the container pushes each lane's JSON (gzipped) and the end of its log to `docs/handoffs/gate-3-walks/` when the four end, with their times in its README.txt. Count the findings of kind blank and the fails, not the dips (Updates 69's gotcha); for each fail, whether a fixer has it (the profile's opening: Updates 71; Discover's Shop section offline: Updates 72; Today's Saint's carry: Updates 73) or it is new; the arbiter's note 2 (the Chat door on /discover/, drawn at y 698 then 617 at 679ms with nothing moving it) measured alone if seen.

## 6. The web build

Not run (the line).

## Not run, and left

- Reading the motion walk (item 5) and fault 7 within it.
- Fault 2's own heart: `node docs/handoffs/gate-3-runners/mockrun-g3.mjs out <jsonl> 1 heart@390@en`.
- Fault 8's exact case: `FIXED_DATE=2026-11-14T13:00:00Z node docs/handoffs/gate-3-runners/mockrun-g3.mjs out <jsonl> 2 featured@800@ar featured@1032@ar` (Candlelight is in group 0; confirm the line reads "مختارات · 25 دقيقة").
- The thread open with replies: `thread@390@en thread@800@en thread@1032@en` with the same runner.
- `npm run build`, last.
