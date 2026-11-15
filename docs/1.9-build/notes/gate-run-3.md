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

**Landed after the line:** the chain pushed the four lanes in `ae41343a9` (motion on 00:52 to 02:06 UTC, reduced to 02:34 UTC). **All four lanes exited 1**, so each holds at least one fail; none read here.

## 6. The web build

Not run (the line).

## Not run, and left

- Reading the motion walk (item 5) and fault 7 within it.
- Fault 2's own heart: `node docs/handoffs/gate-3-runners/mockrun-g3.mjs out <jsonl> 1 heart@390@en`.
- Fault 8's exact case: `FIXED_DATE=2026-11-14T13:00:00Z node docs/handoffs/gate-3-runners/mockrun-g3.mjs out <jsonl> 2 featured@800@ar featured@1032@ar` (Candlelight is in group 0; confirm the line reads "مختارات · 25 دقيقة").
- The thread open with replies: `thread@390@en thread@800@en thread@1032@en` with the same runner.
- `npm run build`, last.

## Gate 3b

Run by Gate 3b (session_01VuYTwcHj8T9AyPYdHcB3cD), started by Arbiter 14 at about 01:00 UTC on the 15th to finish what Gate 3 left at its line. It names faults and mends no app code.

**The export:** `node scripts/gate/export.mjs` of `5bf09c2ce`, the head at 01:04 UTC (Updates 75's mend `1e84aa0f`, the player's words, over Gate 3's `d6bef349d`; everything else since is docs and scripts). Cut 01:05 to 01:08 UTC: 205.2 MB on disk in 7,372 files, 75.1 MB packed, the same switches as Gate 3's, the main web's anon key read into that command alone, checked, printed and written nowhere. The tree was clean after it.

**Its runners** (`docs/handoffs/gate-3b-runners/`): `tapwatch.mjs` taps a door the way a reader does and reads, inside requestAnimationFrame, where every block of words on or near the screen stands in each frame from the tap to 2 s after (getBoundingClientRect of the box and of its first line of words), with the fonts that finished loading (`document.fonts`), the woff2 files that arrived (resource timing) and the animations running in that frame. `chatcause.mjs` reads what changes inside /community/'s first two posts in the frame their height changes.

### 1. Gate 3's three probes (its runner, `mockrun-g3.mjs`)

| Probe | Measured | Result |
|---|---|---|
| a. Fault 2's own heart | `heart@390@en`, then every sold-out card on /shop/ and /shop/category/all/ read alone | **Pass.** The one sold-out card on both pages is the Greek 33-knot rope (`?slug=greek-33-knot-prayer-rope`). Its heart is 47 by 47; at its centre the finger meets the heart itself, not the card's link; after the tap the address stays /shop/ (and /shop/category/all/) and the heart's `aria-pressed` turns (false to true, and back). |
| b. Fault 8's exact case | `FIXED_DATE=2026-11-14T13:00:00Z`, `featured@800@ar featured@1032@ar` | **Pass.** The featured line read "مختارات · 25 دقيقة · عصر المجامع المسكونية", Gate 2's Selections line. 0 failures and 0 unmeasured in all three groups (Candlelight's group 0 among them), at 800 and at 1032. |
| c. A thread open with replies | `thread@390@en thread@800@en thread@1032@en` | **Pass.** The runner opened "5 replies". 0 failures and 0 unmeasured at each width; the replies start in view, above the tab bar (top 114, 114 and 173 against the bar's 761, 1197 and 1293). |

Seen on the way, outside the scope: the rope's heart is named "Save this icon".

### 2. The font swap (Updates 69's item 4): measured, not mended

`tapwatch.mjs` at 390 by 844 with the CPU slowed 4 times (`Emulation.setCPUThrottlingRate`), a cold context each try, a reader signed out, online: Saints by its door on /discover/, Settings by its door on /account/, in English and Arabic, five tries of each (the first three read at most 600 blocks and the cap was reached; tries 4 and 5 read the 47 to 100 blocks on or near the screen, and found the same opened blocks: 9 on Saints, 32 on Settings). **Pass: nothing moved.** No block of words on the opened page changed its top, left, height or line of words by 0.5px or more in the 2 s after the tap, in any try.

| Page | woff2 after the tap (ms after it, tries 4 and 5) | The opened page's first words drawn | What turned loaded, and when |
|---|---|---|---|
| Saints, en | `d67845dd9b0bd5f5` and `e25d7a25cd1e8809` at 849 to 1294; `617f0885e0ac87a9` at 2471 or not in the 2 s | 916 to 1360 | Cardo (the two files) in the frame the first words were drawn; Noto Sans (Cyrillic range) later, after the window |
| Saints, ar | the same two at 1118 to 1775; `617f0885e0ac87a9` at 2998 to 3797 | 1164 to 1838 | the same; in tries 1 to 3 Noto Sans turned loaded inside the window (1307 to 1643) with no block moving |
| Settings, en | `e929b158eb81aae9` at 430 to 455, `3fb72f389f036d11` at 520 to 573 | 483 to 526 | DM Serif Display (two ranges) and Lora in the frame the first words were drawn; Noto Serif 76 to 119ms after, with no block moving |
| Settings, ar | the same two at 420 to 609 and 542 to 734 | 481 to 677 | the same; Noto Serif 100ms after the first words |

The only moves of 1px or more in the window were on Discover itself, before it left: the tapped Saints tile's heading and blurb, 3.1px and back while its press transition ran. The fonts each page's words wear arrive before those words are first drawn; the faces that arrive after (Noto Sans, Noto Serif) moved nothing on screen.

### 3. The arbiter's note 2: the Chat door on /discover/ (measured early, at 01:13 UTC)

`tapwatch.mjs chat@en@1@1..3`: from /discover/ at 390 by 844, CPU unslowed as the motion walk runs, online, three tries. **A fault, repeated in 3 of 3.**

| Try | /community/'s posts first drawn | The second post (the v1.8 announcement) | When |
|---|---|---|---|
| 1 | 559ms after the tap | drawn with its top at 697.7, then at 617: **80.7px up** | 681ms after the tap |
| 2 | 208ms | the same, 80.7px up | 371ms |
| 3 | 217ms | the same, 80.7px up | 352ms |

In the same frame the first post (top 343) loses 80.7px of height and the second loses 59.8px. `chatcause.mjs` read inside them: both start at 354px and end at 273.3 and 294.2 with no element inside either changing height and nothing added or removed. **The cause as read:** each post is `content-visibility: auto` with `contain-intrinsic-size: auto 320px` (`components/community/CommunityClient.tsx:1866`, with `py-4`); the posts are first laid out at the placeholder (320 + 32 + 2 = 354) and take their real heights a few frames later, so everything under the first post jumps. Updates 72's 698 to 617 at 679ms is this. Also in 3 of 3, when the posts arrive: the sign-in line above them ("Sign in to share with the community." and its link "Sign in") steps 1px down (cause not read). Owner: the fixer of /community/; told to the arbiter at once.

### 4. The web build

`npm run build` of the head's app code (`5bf09c2ce`; the commits pulled in while it ran, `1266647c` and the ones before it, touch only docs and scripts), alone in the container, 01:18 to 01:22 UTC: **exit 0, 6,526 of 6,526 static pages.**

### 5. The motion walk: not read (the line)

Gate 3b stopped at its line of 200,000 tokens (get_session 204,388 at about 01:24 UTC) before Gate 3's walk results landed (due about 02:40 UTC in `docs/handoffs/gate-3-walks/`). Left, with the reading's rules, in `docs/handoffs/gate-3b.md`: the blank findings and the fails, each against Updates 71, 72 and 73; fault 7 on /shop/; every carry record; the walk run again on an export of the head if nothing lands by 03:30 UTC.
