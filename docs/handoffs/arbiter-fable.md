# Hand-over: the arbiter to Fable 5.2 (2026-11-20)

Written by Arbiter 14 (Opus 5.5, session_01VuYTwdsjnmK235qQJH2FGJ) at his word of 2026-11-20, about 14:48 UTC (his whole message is in docs/1.9-build/BRAINSTORM.md). From now on the arbiter is **Fable 5.2 at max effort**, and the way of working changes. Read this file, CLAUDE.md and docs/NOW.md. Read nothing else until a step needs it.

## 1. His word: the new system

- "We will no longer be using Opus 5.5 for being the arbiter. The new arbiter will be Fable 5.2 on Max."
- "I want to be super conservative as we can. Take it update by update, take it slowly. And I want things to be more slower, less chaotic, and more structured. Structure is what we need. Structure is how we're gonna move. Conserving our usage is what we're gonna prioritize. Even if it means prolonging updates. If we have to work with one single chat, then we will do that. If we don't even need an arbiter, we will do that. I'd rather have more things noted than more things finished, because a longer plan that is structured and detailed is better than a chaotic mess of a bunch of updates and issues."
- "I want more talking and understanding context than actual doing, if that makes sense. I prioritize context and understanding and planning and executing later on in a structured way."
- Money: income is uncertain for now (his job moved him to a new department); "I'll always find a way to make money." Every dollar of usage counts.

What that means in practice (Arbiter 14's reading; confirm it with him in your first turn):

1. **One chat.** You are the default worker. A second chat only at his yes, for one named job, with a token cap, archived when its report is read. No parallel chats, no fan-outs, no "overdrive", no scheduled check-ins or wake-up loops.
2. **Talk, then plan, then do.** Understand the ask, write it down, put a plan in the repo, get his yes. A clear plan is a finished piece of work; speed is not the measure.
3. **Name the cost first.** Before anything that costs (a chat, an export, a walk, a build, a long read), say what it costs and why, and choose the cheapest proof that is still true (one targeted walk, not every screen).
4. **Records stay, lean:** his words verbatim with the time (BRAINSTORM.md), the state (docs/NOW.md), a short log line (docs/1.9-build/HANDOFF.md).
5. **Everything else in CLAUDE.md still binds:** simplified mode, no em dashes, the design rules, main only at his word, keys never printed or saved, the pre-build gate (ask him how far to run it each time: the full gate costs hours).

## 2. Where things stand (checked 2026-11-20, 14:49 UTC)

- **1.9 is released on Android and iOS** (his word). Which builds went to the stores is his to confirm: the newest Android build from main is **build 101** (run 43999379696, main `6700c2e65`, its AAB on the android-release page, 02:05 UTC 11-17). No iOS build has run on GitHub since run 38 (cancelled, 11-15), so ask how the iOS build was made.
- **The main web** (purifyapp.net) has served 1.9 from main `6700c2e65` since about 03:08 UTC on 11-17. All 21 database files ran (probed); R1 was run by his hand at 00:57:42 UTC; campaigns are at testers (his account only); Bible downloads work.
- **The branch `ccr-07896cf2-bo0afd` is ahead of main** with work that is in neither the stores nor the website:
  - Heart alone: the phone's own voices removed, the Voice sheet gone, Listen only where Heart's recording is (Updates 98r's patches, applied by 98s).
  - What's New's line in 21 languages ("seven more Bibles", Purify Plus named).
  - Gate 6c's fix round: 98t (the reading room's door, the prayers' Chant), 98u (Settings' choices, the dictionary, the Nicaea link: away controls take no touch, one global rule in app/globals.css), 98v (You's Back and Share). Each hand-over is in docs/handoffs/updates-98t.md, 98u.md and 98v.md.
  - **Not checked as a whole:** Gate 7 started 11-17 10:23 UTC and stopped at the weekly limit (17:15 UTC) with no results pushed. Archived.
- **So the stores and the website still have** the phone's voices, "five more Bibles" on What's New, Gate 6c's 58 motion rows and You's two faults, and the Nicaea link that sometimes misses a tap.
- **Chats:** all archived except the Company guide (session_01VuYTwcFgb1g1Py4mRbRNrD: LLCs, tax, Florida, no repository, idle, waiting on his two facts). **Nothing is scheduled.**

## 3. The open list (nothing here is started; his to order)

**A. Getting the branch's work to readers** (his decisions first)
1. How fixes ship now that 1.9 is in the stores. His rule: no point release for faults found before a release, and 1.9.1 is, by his word, for campaign pictures and their legal steps. Ask him: a 1.9 store update with a higher build number, part of 1.9.1, or something else.
2. Before any push or build: a scoped check of what changed on the branch's head (Gate 7 never finished). Agree its scope and cost with him.
3. The release email's preview test (lib/email/__tests__/releaseEmail.test.ts, near line 200) is owed before the release email is sent. Release chat 2's local fix was never pushed.

**B. Known faults not yet mended**
- PractiseSheet's Change button is 41.9 px wide in Arabic (components/you/PractiseSheet.tsx:128; the pill at :89 has the same risk).
- John 1's Community link goes blank for 211 ms on the way to /community/ (Updates 98u saw it).
- Four motion rows 98t could not reproduce: the Creed into a council document (blank), /bible/ to 1 Samuel (cut), the doctrine shelves to vestments (flash), the work pill (26 px).
- Named, not failed: components/learn/ChooseSheet.tsx:514, the same sr-only pattern as 98v's Share fault.

**C. After-release steps (his; MERGE-DAY section 6, OWNER-STEPS R2 to R8)**
- R2b the terms notice to every account (two test emails first); R2c the faith answers SQL plus a Calendar task three weeks on; R3b one change of email on his own account; R2a the 1.9 note in Admin and the weekly board message (the live board still says "1.7 is here").
- R6 the update prompt: now that the stores serve 1.9, set ANDROID_VERSION_CODE and IOS_BUILD_NUMBER on Render (OWNER-STEPS R6) to the numbers the stores serve, so installed apps are told.
- R5c "open campaigns", after his own try of campaigns.
- The Psalms 113 to 115 count: a read-only count of notes and highlights written from 1.8 clients after 00:57:42 UTC on 11-17 (the old numbering, not moved), and a new signed migration for any it finds (MERGE-DAY step 4).
- The drop: docs/plans/v1.9/drop.json (the kit: `node scripts/drop.mjs kit 1.9`; also Admin, Reach, Drop). 20 pieces to go. Waiting: item 0's wording, the voices line, round 3's check, the campaigns line, the cards (they say six Bibles), the video.

**D. Questions waiting for his answer**
- A Testers switch that shows the update pop-up again: yes or no.
- Item 0's line: "quote Scripture into it with Quote in journal. Free for everyone. In Purify Plus, quote the prayers, the saints' lives, the Fathers' works and the chants too." Yes or no.
- Purify Pro's "Studio Audio (soon)" promise (lib/premium/plans.ts): keep or remove, now that Heart is the only voice.

**E. Heart's recording of the rest.** The Old Testament and the library: 2,447 recordings, 113.9 hours of audio, about 2 hours on GitHub's free runners. It waits on his four GitHub secrets (OWNER-STEPS V11 and V12). Then copy scripts/voices/full.json over scripts/voices/run.json and push to start it.

**F. New, brainstorm only** (his word 11-20, "this is brainstorm mode, so don't start")
- A rework of the admin panel.
- Mercury is now Purify's bank account and expense tracker. Never write account details or numbers in the repository.

## 4. Why the usage ran out last week (do not repeat)

- Four to six chats ran at once on 11-16 and 11-17.
- Fixers' contexts reached 260,000 to 570,000 tokens within an hour or two, from reading gate result files and long logs whole; get_session often read 0 or lagged.
- Walks of every screen at CPU 4x take hours, and containers restart about every 81 minutes (chains must resume by marks; see docs/handoffs/gate-6-walks/chain6c.sh).
- The old arbiter's own long chat cost more on every turn, and fallback check-ins woke chats only to re-read long histories.
- A relayed "go" does not count as consent in a child chat's harness: a chat that pushes production asks him in its own window.
- Render's first 1.9 deploy sat 53 minutes after its cache before it went live. Memory was not the cause (a local build peaked at 3.61 GB).

## 5. Your first turn

1. Read CLAUDE.md, docs/NOW.md and this file only.
2. Ask him a few short questions: which builds went to the stores; which of R2b, R2c and R6 are done; whether your reading of the new system in section 1 is right; what comes first.
3. Then write a short ordered plan, one item at a time with the cost of each step (for example docs/PLAN-after-1.9.md), and wait for his yes before anything runs.
4. One branch: work stays on `ccr-07896cf2-bo0afd` unless he decides otherwise with you. Main only at his word.
