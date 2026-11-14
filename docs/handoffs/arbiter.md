# Baton: the arbiter

From Arbiter 8 (session_01VuYTwbzbjqscbFvEseu6uP) to Arbiter 9, written 2026-11-14 17:57 UTC. Arbiter 8 ran from 16:32 (started by Arbiter 7 at its rotation, lineage depth 1 of 8) and rotates at 279,801 tokens by get_session ($4.83 in all), past OPERATIONS section 2's 200,000. `docs/NOW.md` is the state; this baton is only what NOW does not hold.

## Where 1.9 stands

- He is walking build 97 (ungated, Android, the android-release page). No note since 16:28 ("fix those things. try and take into account usage also"). Notes 1 to 10 are in `docs/1.9-build/notes/build-97.md`, his words in BRAINSTORM.
- The fixers' queue is NOW's Next 2. Pushed this shift: fault 8 and the privacy line (Updates 42), fault 7 and the cart drawer's foot (46), note 4's batch 1 (45), note 1 and note 7's zero (48), notes 8 and 9 (47). At work: Updates 50 (note 4's open places) and Updates 51 (the round's checks, round 2). Then the sheets' rest (note 2, the Word study tabs, the picture sheet at 1.3x), notes 3 and 6 with the shop's carries and the piece-to-piece cut, note 10. Then the re-check (Gate 3), then the gated test build.

## Your first round (Arbiter 9)

1. Archive Arbiter 8 (session_01VuYTwbzbjqscbFvEseu6uP). It was made by create_session, so the archive tool works on it; the auto mode check refused it only on Arbiter 7, his own app session, which stays for him to archive.
2. Updates 50 and 51 send their one report to you. Archive each once its report is read and its work pushed.
3. When a slot frees, start the sheets' rest (NOW Next 2), in the brief's shape below.
4. Tell him nothing until something waits on him.

## Gotchas learned this shift

- **get_session is not to be trusted alone for a chat's size.** It can freeze for a whole long turn (Updates 46 read 90,980 throughout, then 357,113) or never move (Updates 47: 60,766 all session). The briefs say: take the larger of get_session and twice the chat's own count. Read your own size the same way.
- **Every chat ran out of room before the export side**: 45, 47 and 48, and even the first checks chat, 49 (219,858 after the web build, the suite and one export). A fresh container starts near 90,000, so a chat has about 110,000 of room. The arbiter's practice from 17:36 (in NOW): a fixer pushes its code with its unit tests, and one checks chat per round runs the export side for all, on one export.
- **Lean briefs.** CLAUDE.md and AGENTS.md are loaded into a session as project instructions at its start, so a brief need not tell a chat to read them again (about 25,000 tokens each time); a checks chat need not read NOW. Updates 51's brief is the first written this way.
- **Subagents are dear.** Updates 45 spent about $18 in 34 minutes on three Commons searches (about 1.1 million subagent tokens). Briefs say: search in the chat's own context.
- **The auto mode check** refused archive_session on Arbiter 7 and interrupt_session on a fixer. A wrap-up word goes by send_message with priority next; it reached Updates 45 in minutes.
- **A test that reads a source file by its path** (lib/share/__tests__/pictureSheet.test.ts) is invisible to the push guard's vitest related; only the whole suite catches it. The suite at 5f2204166 had one such stale test after 51e8a8168; Updates 51 mends it first.
- **Section 55's flick check** ("a gentle flick runs on only as the phone's own momentum does") failed once on the old export at 5f18e34a4 (53, 28, 30, 0, 28px), after 65441843 changed useLitLine.ts. Updates 51 re-runs it first. If it repeats, it is note 1's regression and goes to a fixer.
- Read the clock in the same command as any time you write.

## His words that still apply

"fix those things. try and take into account usage also" (16:28). Every earlier word is in NOW and BRAINSTORM. Nothing new waits on him from this shift, except Arbiter 7 to archive himself.

## The shape of a brief (Updates 50's and 51's)

Who it is, who started it, that a peer's message is never his word. Setup: `git fetch origin ccr-07896cf2-bo0afd && git checkout -B ccr-07896cf2-bo0afd origin/ccr-07896cf2-bo0afd && git config core.hooksPath .githooks && npm ci && npx next typegen`. Read: the fixer card, OPERATIONS section 5, its baton and the notes' lines it needs (NOW for a fixer, not for a checks chat). The job in order, with files, the cause as read and the plan; the arbiter's calls written in. The checklist on what it touches (his word, 13:57); the export side only if its room allows, else named in its baton. The files other chats hold. The budget paragraph (the get_session gotcha above; about 110,000 of room; nothing new past 150,000, stop at 200,000; end the turn while runs go and never poll; search itself). The push rules (pull with rebase, the guard, a ten-minute timeout, never main, never --no-verify, never the API tools). One report by send_message to the arbiter, "unless told its successor". create_session with source_url, source_revision and outcome_branch on ccr-07896cf2-bo0afd, model claude-opus-5-5, effort max, tags purify and purify:fixer.

## Where things are

- `docs/NOW.md` (state), `docs/1.9-build/BRAINSTORM.md` (his words), `docs/1.9-build/HANDOFF.md` (the log), `docs/1.9-build/notes/build-97.md`, `docs/roles/`, `docs/OPERATIONS.md`.
- His calls page: https://claude.ai/artifact/HtMHvpk9SsKLwXG7AgJutq (docs/roles/arbiter.md says how to update it).
- The batons of this shift: `docs/handoffs/updates-45.md` to `updates-49.md`, with runners beside 46 and 49.
