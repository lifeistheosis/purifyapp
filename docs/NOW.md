# Now

The state of the work, in one page. The arbiter rewrites this at each change of state and keeps it to one page: history goes to the log (`docs/1.9-build/HANDOFF.md`) and his words to `docs/1.9-build/BRAINSTORM.md`. The NOW of the 1.9 build is kept whole in `docs/1.9-build/NOW-to-2026-11-20.md`; it is very long, so read a line of it only when a step needs it.

Updated 2026-11-20 18:45 UTC by Arbiter 15 (session_01VuYTwacqkyCMKTighQY7o3).

## How we work (his word, 2026-11-20; CLAUDE.md, "The new system")

- **One chat:** the arbiter, who is also the default worker. A second chat only at his yes, for one named job, with a cap, archived once its report is read. Nothing is scheduled.
- **Talk, then a plan in the repo, then his yes, then work.** The cost is named before anything that costs.
- **Extra simplified mode is on** (his word, 16:14 UTC: "Extra simplified mode on"): a few plain lines, one or two questions at a time, no em dashes.
- **A fresh arbiter reads CLAUDE.md and this page only.** The open list is `docs/handoffs/arbiter-fable.md`, section 3. The order is `docs/PLAN-after-1.9.md`, a draft that waits for his yes.

## The state

- **Android:** 1.9 in the store is build 101, from main 6700c2e65 (11-17). The main web serves the same commit.
- **iOS:** the App Store still served 1.8 at 16:19 UTC on 11-20. The build he had submitted for 1.9 was run 37 of 11-13 (6193982d5), four days and 1,024 files behind Android's. At his word, run 39 was built from main 6700c2e65 and has been on TestFlight since 16:50 UTC.
- **The branch** `ccr-07896cf2-bo0afd` is ahead of main with Heart alone, What's New's line and Gate 6c's fix round (57 code files, no migration, nothing under app/api, nothing native). It has not been checked as a whole.
- **Store pictures:** the 41 of 11-12 (`docs/plans/v1.9/store/`), saved in 256 colours and never taken again after Today and the journal changed. He has the 16 for iOS, and eight resized to 1179 by 2556 for the medium display slot (`docs/plans/v1.9/store/medium-1179x2556/`, with Apple's sizes of the day).
- **The 1.9 ad** (`docs/plans/v1.9/video/AD.md`): stage 1 stopped at its cap at 18:25 UTC, not done. Both scenes are set up and filmed (the takes passed after its message, and live in its container only). The moving phone is written and has never run. There is no video and no page. Its hand-over is `docs/handoffs/ad-stage-1.md`.

## Waiting on him

1. **iOS:** take 1.9 out of review, walk build 39 from TestFlight on his iPhone, choose it and send again. Asked; not yet confirmed done. The walk should prove the widgets on a real iPhone: with the Old Calendar chosen and a patron saint saved, the day's widget follows the Old Calendar and the patron's widget shows the saint (a reader's report of 11-20; the cause was mended on 11-10 and has not yet been seen on a real iPhone). R6's iOS number waits until the App Store serves 1.9.
2. **The ad:** finish stage 1, the test of about 7 seconds? About $5 to $8 more by the arbiter's estimate, with $6.51 spent. Stage 2 follows only on his yes to the test.
3. **The store pictures:** A (use the 11-12 set) or B (a retake from the release code in full colour, with the medium size added; medium cost).
4. **From the hand-over:** which of R6, R2b and R2c are done; whether the reading of the new system above is right; the order of `docs/PLAN-after-1.9.md`.
5. **Rotation:** should the arbiter move to a fresh chat at about 150,000 tokens of context? The arbiter recommends yes (see Spend).

## Running

| Chat | Session | Holds |
|---|---|---|
| Arbiter 15 | session_01VuYTwacqkyCMKTighQY7o3 | The one chat since 15:30 UTC on 11-20. At 337,000 tokens of context by 18:26, so it ends when he starts the next arbiter from this page |
| Purify 1.9 ad: stage 1 | session_01VuYTwdhrUStFNXC4goT9fG | Idle at its cap (context 227,000). To continue it at his yes: one send_message with a new cap; what is left is in its hand-over. Its container holds the export and the takes until it restarts; after that, `npm ci` and the export again (about 10 minutes) and the takes (a minute each). Archive it after stage 1's report, or at his no |
| Company guide | session_01VuYTwcFgb1g1Py4mRbRNrD | LLCs, tax, Florida (no repository); idle, waits on his two facts |

## Spend (measured with get_session on 2026-11-20)

- **Arbiter 15:** $13.38 from 15:30 to 18:26 UTC (context 337,000 tokens; 155,000 tokens written).
- **The ad chat:** $6.51 in 12 minutes (context 227,000 tokens).
- **The rate these two give** (worked out from their numbers, not read from a price list): about $0.50 for a million tokens read from the cache, $10 for a million written to it, $25 for a million written as output. So every step costs about $0.05 for each 100,000 tokens of context, and coming back after more than an hour writes the whole context again, about $1 for each 100,000.
- **What follows:** keep a chat short. Rotate the arbiter at about 150,000 tokens (his yes pending). A worker's price must count its fixed start (about 47,000 tokens of tools and rules), and a cap is better set in dollars read from get_session than in guessed tokens.
- **The meter:** get_session shows a chat's cost only after a turn ends; inside a turn it shows the last finished turn. The weekly limit read "allowed" at 18:26 UTC and resets 2026-11-27 08:00 UTC.

## Found, and not yet on the faults list

- On `/journal/`, reached by You and then Your journal, the tab bar marks Bible, not You. Seen by the ad chat on main's export; not checked by the arbiter.
- A fresh clone is shallow, so `git log` on a path misleads until the history is deepened: `git fetch --filter=blob:none --shallow-since=<date> origin <branch>`.
