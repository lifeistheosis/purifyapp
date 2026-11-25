# The next store builds, from main: the plan

Store-build chat, started 2026-11-25 at the owner's word. Plan only: nothing is built or run until his yes.

## Why this build

Sign-ups fell from about 5.5% of visitors to about 2.7% after 1.9 took the account step out of the welcome. Main has it back (`aefe1114`, `lib/onboarding/flowSteps.ts` roadsHead), but most sign-ups happen in the app, and the apps still run 1.9 as shipped (Android build 101, from main `6700c2e65`). Level 1 (`docs/plans/levels.md`) waits on this build.

## What reaches phones (main since 6700c2e65, 41 commits)

Most of the 41 are admin, email and server work, which the apps do not carry. What a reader of the app gets:

| Change | Commit | File |
|---|---|---|
| The account step right after the welcome | aefe1114 | lib/onboarding/flowSteps.ts, lib/ab/tests.ts |
| The first Liturgy's guide no longer breaks on "During the Liturgy" | 60c400d3 | components/start/liturgy/FirstLiturgyGuide.tsx |
| Fewer calls to the database (ping, Community every 20 s) | b89b56b1 | lib/analytics/heartbeat.ts, components/community/CommunityClient.tsx, lib/community/feedMemo.ts |
| Buy Me a Coffee gone | d5e6f036, 857e5589 | lib/support/buymeacoffee.ts, lib/search/buildCorpus.ts |
| Waiting: "Your Plus ends on <day>. Keep it" | keep-members step 4 | components/billing/PlusPaywall.tsx (being built in session_01VuYTwbGuypFaiAN1DaWnZQ) |

Nothing native changed (no android/, ios/, plugin or package change), so R8's risk is the same as build 101's. The release APK is still walked before the AAB goes to Play (AGENTS.md 2a).

## Faults already known in 1.9 (his rule: a fault found after a release ships goes in the next build)

1. German and Urdu: "2 weitere" on Today under 4.5:1, a council link cut by an ellipsis. Gate step 2 fails on it as it stands.
2. Pentecost's page shows "Paul's missions" twice.
3. `/journal/` marks Bible, not You, in the tab bar (seen, not checked).
4. The week's card: Begin under the tab bar, and the jump on a tap. Mended on the branch, but his word of 11-23 keeps it for 2.0.
5. The Testers mark over the chapter pill (Testers only).

Recommendation: mend 1 to 3 on the branch, then on main with the build; leave 4 for 2.0 as he said and name it to him before he walks; 5 is not a reader's.

## The steps, in order

1. His answers to the questions below.
2. Keep-members step 4 lands on main (his yes on its still first).
3. Mends 1 to 3, each with a test that fails on the old code.
4. The release tooling: `node scripts/release.mjs new <version>`, the note, `bump` (the six identifiers), the checklist of six categories, `board`, `back`, `check`.
5. The pre-build gate on the export of exactly what will be cut (CLAUDE.md): the touch walk as a new reader at phone size, checkMock on every screen in five palettes (`guardrail-walk.mjs`, `stripe-walk.mjs`), the picture list, the reader-facing lines, a test per known fault. Plus typecheck, unit tests, `build:android`, `build:ios`, web `build`.
6. Push to main at his word "push" (the website moves first), `release.mjs live`.
7. CI: "Android build" with local-first, then "iOS build (signed)". One artifact per run.
8. He walks the release APK on his phone, then sends the AAB to Play and the iOS build from TestFlight.
9. After each store serves it: `androidVersionCode` / `iosBuildNumber` in `lib/appUpdate/release.ts`.

## Cost

- This chat: about $15 to $30 for steps 3 to 7 (gate output is long). It stops at 200,000 tokens and writes a baton.
- GitHub Actions: one Android run (Linux), one iOS signed run (macOS minutes, the dear one). No reruns without a reason.
- No paid generation, no video.

## Questions for him

1. **The version.** 1.9.1 was planned for campaign pictures and their legal steps. Recommendation: call this build 1.9.1 (a patch: a note, no pictures, no email) and move campaign pictures to 1.9.2. If the App Store has approved 1.9, iOS needs a new version number anyway.
2. **Is 1.9 live on the App Store now?** It decides whether iOS takes this build as a new version or replaces the one in review.
3. **The known faults:** yes to mending 1 to 3 in this build, 4 staying for 2.0?

## Log

- 2026-11-25: plan written; waits for his answers.
