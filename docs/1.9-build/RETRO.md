# 1.9: what went right, what went wrong, and what changes for 2.0

Written by the arbiter on 2026-11-12, at his word: "look at all the things we did right and all the things we did wrong, how to avoid the mistakes for the next update, how to easily implement things, merge things, etc. And if there's any repos you need that can fit in our system, implement that if needed."

## The numbers

- **The build:** 2026-11-07 to 2026-11-12, on one branch: 1,537 commits ahead of main, 4,887 files changed, and 19 new migrations.
- **Tests:** about 14,090 unit tests, all green.
- **Gate runs:** run 1 (95 of 125 screens passed); the third run; final run 1 (11 fails); the confirm run (3 fails in the walks' reach, plus 7 families on pages the walks never saw); and the final check, running as this is written.
- **Chats:** the long ones passed 700,000 tokens. At that size every turn re-reads all of it, and each such chat cost several hundred dollars at list price.

## What went right: keep it

1. **One voice to him.** The arbiter speaks to him, records his words word for word and dated, and keeps one calls page for his decisions.
2. **His taste became tests.** Rays, side stripes, the sparkle, decorative floating pills, a box round a tapped field, em dashes, contrast on the five palettes and seventeen looks, 44px targets and mirroring are each stopped for good by checkMock and the guardrail tests.
3. **A gate that grows where it missed.** When a run showed a gap, the gate gained a check: the pixels pass, the sweep of every page, three widths, offline, the light looks, and a probe for each new state.
4. **Done means proved.** Every fix came with a test that fails on the old code, and every report carried command output.
5. **Money and data kept safe.** Every migration was signed by him and safe to run twice, with read-only probes first. No number went into a chat.
6. **Rights.** Every picture has a recorded source, and the heritage list keeps listed works out of every ad.
7. **True words.** Every note and drop line was held to what the build actually does, for example "print it on the website".
8. **Nothing lost.** The Vault keeps unused work, and the record keeps his words.
9. **Fable for design.** One brief, then his own rounds in its chat, ended in a set of store pictures he chose.

## What went wrong, and the fix for each

1. **The gate saw one page per route, at phone size, until the last days.** Seven families of faults sat on about 1,000 pages no walk opened (87 saints' webs among them), and tablet faults went unseen (the calendar, and the Pantocrator's face cut in Prayers' banner). It cost three final runs of about four hours each. *Fix for 2.0:* the sweep of every page and the three widths run from the first week, nightly, so the last run is only a formality.
2. **Scope arrived late.** The gift, the admin chart, the store pictures and tablet support all came in the final days. *Fix:* his rule already sends every fault into the release. For new features, set a scope freeze date: after it, a new feature goes to the next version unless he says otherwise.
3. **A chat pushed without the gates and broke every build for hours.** The PC chat's gift lost a closing brace in the stylesheet, and no unit test read the stylesheet. *Fix:* stylesheet parse tests now exist. For 2.0, a pre-push guard runs on every clone (see Tools).
4. **Messages arrived late, and chats acted on old instructions.** Lines were pushed after a stop, and one fix was missed. *Fix:* every chat reads its notifications before each push (the role cards say so), and a hold is re-sent until it is confirmed.
5. **Times were written before reading the clock,** by several chats and by the arbiter. *Fix:* run `date -u` first, every time.
6. **Chats grew past 700,000 tokens.** Turns got dearer and slips more frequent. *Fix:* docs/OPERATIONS.md. A chat rotates past 400,000 tokens or after one compaction, and reads one page of state.
7. **The measure gave false fails** (the Hours tile's dot, drifting specks, a hyphen's own box), and chasing them cost rounds. *Fix:* ask "the measure or the screen?" before routing a fail. Every new measure ships with a self-test, as the two mends did.
8. **One giant branch.** 1,537 commits and 19 migrations meet production in a single merge. *Fix for 2.0:* smaller releases, with new features kept behind flags.
9. **The PC chat could not receive messages,** so he had to paste them across. *Fix:* work that pushes runs in cloud chats. A PC chat is for tasks on his own machine.
10. **The store pictures took several design rounds.** *Fix:* ask him for one reference picture first.

## Merging 1.9 on release day

1. Pushing main runs every new migration against production. Before the merge, list them all, and confirm each is signed by him and safe to run twice. After the merge, read the Supabase check.
2. `node scripts/release.mjs back` records the way back, before the push.
3. Push main only at his word, then run `node scripts/release.mjs live`. The push guard refuses main, so that one command carries `PURIFY_ALLOW_MAIN=1` (never `--no-verify`).
4. If the merge goes through a pull request, CI's typecheck needs `npx next typegen` first: a fresh checkout has no `next-env.d.ts`, so the drop cards' `.webp` imports fail (found by the Tooling chat, 2026-11-12). Fixed at 3ad6cdd56: CI runs `npx next typegen` between lint and typecheck, proved in a fresh shallow clone (9 errors without it, 0 with it).
5. The store builds come from main after the merge. Set androidVersionCode and iosBuildNumber only once each store serves the build.

## Tools for 2.0, to add after 1.9 ships, at his word

1. **A pre-push guard. Built on 2026-11-12, at his word "can we set up both now?"** (Tooling chat, 376076bcd): `scripts/push-guard.mjs` through `.githooks/pre-push`, set by a SessionStart hook in `.claude/settings.json`. Main is refused, docs go at once, and everything else runs the stylesheet tests, typecheck, eslint and the related unit tests. After 1.9, husky can call the same script so every clone, his PC included, gets it on `npm install`.
2. **A nightly gate:** the walks and the sweep as one scheduled script, with the results in docs/NOW.md. It costs machine time, not tokens.
3. **A usage report:** the arbiter reads each chat's context size and cost with get_session at each routing. No new tool is needed.

Nothing else is needed. This release's gaps were in the process, not in the tools.
