# The plan after 1.9

A draft by Arbiter 15, 2026-11-20. It waits for his yes. One item at a time, nothing runs without his yes, and the cost is named before each step (CLAUDE.md, "The new system"). The state it starts from is `docs/handoffs/arbiter-fable.md`.

**How the costs read.** Small is under about 30,000 tokens. Medium is up to about 150,000. Large is more, plus hours of machine time. They are estimates until measured: get_session read 0 for this chat on 11-20, so his Usage screen before and after a step is what makes them real.

## 0. First, at his word: iOS 1.9 (started 16:20 UTC on 11-20)

- **Found on 11-20.** The iOS build he submitted is run 37 of 2026-11-13, from 6193982d5. Android's is build 101 of 11-17, from main 6700c2e65. The iOS build is four days older: 1,024 files apart in app, components, lib, data, public and ios, without the World English Bible and without the mends made after it for his build 95, 97 and 98 notes.
- **Not live yet.** Apple's public lookup still served 1.8 at 16:19 UTC, so no reader had the old build.
- **Run 39** (44772453085) started at 16:20:49 UTC from main 6700c2e65, the same code as Android 101, to TestFlight. Cost: about 20 minutes of GitHub's macOS runner, almost no usage.
- **His steps.** Take 1.9 out of review, so run 37 cannot go live. Walk build 39 from TestFlight on his iPhone: no iOS build has been made since 11-13 and four native files changed since (the speech plugin, the download notice, the bridge, the project). Choose build 39 and send again.
- **If the run fails:** the arbiter reads the failing step only (small), and a mend and a new run wait for his yes.

## The order (his to change)

1. **Records and this plan in the repo,** and a new one-page NOW with the old one kept whole in `docs/1.9-build/`. Small.
2. **`docs/OPERATIONS.md` rewritten for the new system, with him** (CLAUDE.md asks it of the new arbiter). Small to medium, mostly talk.
3. **Close out the release, his steps.** R6 first, since it tells installed apps: Android's number once Play Console shows it (101 by GitHub), iOS's only when the App Store serves 1.9. Then the board and the 1.9 note (R2a: the live board still says "1.7 is here"), R2b, R2c, R3b. His time; small for the arbiter, who hands him each step's text.
4. **Decisions, talk only.** How fixes ship (see the note on Apple below); "Studio Audio (soon)", keep or remove; item 0's line; the Testers switch; whether people are told now or after the fixes. No cost.
5. **The four known faults mended,** so one update carries everything (the hand-over, section 3 B). Medium; needs `npm ci` and one export.
6. **One scoped check of the whole branch** (Gate 7 never finished). The dearest step: its scope and price go to him in writing first. Known so far: 54 commits ahead of main, 57 code files, no migration, nothing under app/api, nothing native.
7. **Ship at his word:** the website (main), Android, iOS, his phone walk, the stores, then R6 again. Small for the arbiter.
8. **Tell people:** the drop's 20 pieces, the release email (its preview test first), open campaigns (R5c). Small to medium.
9. **The Psalms 113 to 115 count,** once most readers are on 1.9: a read-only SQL for him to run, then a signed migration for what it finds. Small to medium.
10. **Heart's recording of the rest,** once his four GitHub secrets are in (OWNER-STEPS V11 and V12). Small; about 2 hours on GitHub's runners.
11. **Noted, not started:** the admin panel rework; Mercury (no account details in the repository); 1.9.1's campaign pictures and legal steps; one pass with him over NOW's older waiting list (each item done, dropped or open).

## Notes

- **Apple and version numbers.** A released version number takes no second build, so once 1.9 is live on the App Store a fix update needs a new number, for example 1.9.1. This is from memory and is to be confirmed on Apple's own page at step 4. His rule keeps faults out of 1.9.1, so the number is his decision.
- **Still to ask him:** which of R6, R2b and R2c are done; whether the reading of the new system is right (one chat, a second only at his yes with a cap, nothing scheduled, plan before work, cost named first); what comes first.
