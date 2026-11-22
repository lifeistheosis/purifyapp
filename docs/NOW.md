# Now

The state of the work, in one page. The arbiter rewrites this at each change of state and keeps it to one page: history goes to the log (`docs/1.9-build/HANDOFF.md`) and his words to `docs/1.9-build/BRAINSTORM.md`. The NOW of the 1.9 build is kept whole in `docs/1.9-build/NOW-to-2026-11-20.md`; it is very long, so read a line of it only when a step needs it.

Updated 2026-11-21 14:08 UTC by Arbiter 15 (session_01VuYTwacqkyCMKTighQY7o3).

## How we work (his word, 2026-11-20; CLAUDE.md, "The new system")

- **One chat:** the arbiter, who is also the default worker. A second chat only at his yes, for one named job, with a cap, archived once its report is read. Nothing is scheduled.
- **Talk, then a plan in the repo, then his yes, then work.** The cost is named before anything that costs.
- **Extra simplified mode is on** (his word, 16:14 UTC: "Extra simplified mode on"): a few plain lines, one or two questions at a time, no em dashes.
- **A fresh arbiter reads CLAUDE.md and this page only.** The open list is `docs/handoffs/arbiter-fable.md`, section 3. The order is `docs/PLAN-after-1.9.md`, a draft that waits for his yes.

## The state

- **Android:** 1.9 in the store is build 101, from main 6700c2e65 (11-17). The main web serves main b89b56b11 since 11-21: 6700c2e65 plus the Supabase fix alone.
- **iOS:** the App Store still served 1.8 at 16:19 UTC on 11-20. The build he had submitted for 1.9 was run 37 of 11-13 (6193982d5), four days and 1,024 files behind Android's. At his word, run 39 was built from main 6700c2e65 and has been on TestFlight since 16:50 UTC.
- **The branch** `ccr-07896cf2-bo0afd` is ahead of main with Heart alone, What's New's line and Gate 6c's fix round (57 code files, no migration, nothing under app/api, nothing native). It has not been checked as a whole.
- **Store pictures:** the 41 of 11-12 (`docs/plans/v1.9/store/`), saved in 256 colours and never taken again after Today and the journal changed. He has the 16 for iOS, and eight resized to 1179 by 2556 for the medium display slot (`docs/plans/v1.9/store/medium-1179x2556/`, with Apple's sizes of the day).
- **The 1.9 ad** (`docs/plans/v1.9/video/AD.md`): stage 1 is done, and revised at his word in the ad chat: the test of 6.95 seconds (scenes 1 and 2, the moving phone), its title now in the app's sans and its ground moving (his words there at about 20:27 and 20:36 UTC), on its page https://claude.ai/artifact/4YMJMQmXcX6HSC7fxZJd6X (version 3). Its hand-over, with his words, is `docs/handoffs/ad-stage-1.md`.

## Waiting on him

0. **Supabase's free quota, with a date: 11 Dec 2026.** Egress went over last cycle; after the grace period requests can answer 402. THE FIX WENT TO MAIN at his word on 11-21 at 13:59 UTC (main b89b56b11; the way back is 6700c2e65; on the branch as d1fc1355e): a ping is no longer a page view, the public feed is held 45 s, Community polls every 20 s. The deploy was live by 14:04 UTC and the site answers (the log, 11-21). Still to do: watch Supabase's Usage page daily (egress was 1.868 GB on 11-21, a pace of 0.29 GB a day; it must fall under about 0.13 GB a day to end the cycle under 5 GB); decide by about 5 Dec whether to pay Pro for one month. Not yet done: a prune of old ping rows (the database is 82% full; his sign-off), the Screens view's heavy read, and the log meter, which is already past this cycle's allowance. His desk's Views numbers fall from 11-21: they counted the pings. The log has the numbers (11-21).

1. **iOS:** take 1.9 out of review, walk build 39 from TestFlight on his iPhone, choose it and send again. Asked; not yet confirmed done. The walk should prove the widgets on a real iPhone: with the Old Calendar chosen and a patron saint saved, the day's widget follows the Old Calendar and the patron's widget shows the saint (a reader's report of 11-20; the cause was mended on 11-10 and has not yet been seen on a real iPhone). R6's iOS number waits until the App Store serves 1.9.
2. **The ad:** his yes or no on the revised test (the moving phone, the new title face, the moving ground). Stage 2, six more scenes, only on his yes, in a fresh chat, priced from stage 1's measured cost.
3. **The store pictures:** A (use the 11-12 set) or B (a retake from the release code in full colour, with the medium size added; medium cost).
4. **The release email** passes its check since 02:20 UTC on 11-21 (the stale preview check is mended; the hand-over's A3). He has its picture. It should be sent from Admin, Email, only once the App Store serves 1.9.
5. **The email revamp** (his word of 11-21, `docs/plans/v1.9/email-revamp/BRIEF.md`): stage 1, one design of the 1.9 release email, is with its own capped chat. It waits for his yes or no on that design; the sender changes only in stage 2.
6. **From the hand-over:** which of R6, R2b and R2c are done; whether the reading of the new system above is right; the order of `docs/PLAN-after-1.9.md`.
7. **Rotation:** should the arbiter move to a fresh chat at about 150,000 tokens of context? The arbiter recommends yes (see Spend).

## Running

| Chat | Session | Holds |
|---|---|---|
| Arbiter 15 | session_01VuYTwacqkyCMKTighQY7o3 | The one chat since 15:30 UTC on 11-20. At 337,000 tokens of context by 18:26, so it ends when he starts the next arbiter from this page |
| Purify 1.9 ad: stage 1 | session_01VuYTwdhrUStFNXC4goT9fG | Stage 1 done ($8.40, context 268,000). He talks to it directly; it waits for his answer on the font and the moving phone. Archive it once he has answered and any font change is made; stage 2 belongs in a fresh chat from its hand-over |
| Purify email revamp: stage 1 | session_01VuYTwZsrP4zay4qyBieFAL | One job at his choice of 2026-11-21: one design of the 1.9 release email for his yes (`docs/plans/v1.9/email-revamp/BRIEF.md`); capped at about $12 (60 tool calls or 150,000 tokens of its own count); he talks to it directly and it sends the arbiter nothing; its hand-over will be `docs/handoffs/email-revamp.md`; archive it once he has answered |
| Company guide | session_01VuYTwcFgb1g1Py4mRbRNrD | LLCs, tax, Florida (no repository); idle, waits on his two facts |

## Spend (measured with get_session on 2026-11-20)

- **Arbiter 15:** $13.38 from 15:30 to 18:26 UTC (context 337,000 tokens; 155,000 tokens written).
- **The ad chat:** $8.40 for stage 1 in all (context 268,000 tokens), $6.51 of it in its first 12 minutes.
- **The rate these two give** (worked out from their numbers, not read from a price list): about $0.50 for a million tokens read from the cache, $10 for a million written to it, $25 for a million written as output. So every step costs about $0.05 for each 100,000 tokens of context, and coming back after more than an hour writes the whole context again, about $1 for each 100,000.
- **What follows:** keep a chat short. Rotate the arbiter at about 150,000 tokens (his yes pending). A worker's price must count its fixed start (about 47,000 tokens of tools and rules), and a cap is better set in dollars read from get_session than in guessed tokens.
- **The meter:** get_session shows a chat's cost only after a turn ends; inside a turn it shows the last finished turn. The weekly limit read "allowed" at 18:26 UTC and resets 2026-11-27 08:00 UTC.

## For 2.0 (his word, 2026-11-20: "for when we built v2.0 keep this in mind")

- **Xcode 27 by April 2027.** Apple's notice on build 39 (ITMS-90725): built with the iOS 26.5 SDK; from April 2027 an upload needs the iOS 27 SDK. The iOS workflow moves to a runner with Xcode 27 before 2.0's first iOS build (`docs/IOS_BUILD_SETUP.md`, its last section).
- **iPhone Duo pictures** are then required too (from April 2027, for apps on the iOS 27.1 SDK or later).
- **Two planning documents from him, 2026-11-22** ("this is for v2.0 and some goals we have"): a growth framework and a growth and money model. They are confidential and are NOT in this repository, because the repository is public; ask him for them. What the app already has toward them is in `docs/handoffs/email-revamp.md`, "Two documents for 2.0".
- **The reader map** (his word, 2026-11-22: "ensure each section that's given to the user Is fully mapped out"): `docs/plans/reader-map.md`. What every reader is given today is written from the rules into `docs/plans/reader-map.txt` and held by `lib/onboarding/__tests__/readerMap.test.ts`; the ledger that would hold 2.0's learning curves is a proposal there, waiting for his yes.

## Found, and not yet on the faults list

- `lib/downloads/__tests__/log.test.ts` fails from 2026-11-20 on: its fixed date of 11-13 is past the log's seven days. A fault in the test, not in the app; the whole suite is red by this one test until it is mended.
- On `/journal/`, reached by You and then Your journal, the tab bar marks Bible, not You. Seen by the ad chat on main's export; not checked by the arbiter.
- A fresh clone is shallow, so `git log` on a path misleads until the history is deepened: `git fetch --filter=blob:none --shallow-since=<date> origin <branch>`.
