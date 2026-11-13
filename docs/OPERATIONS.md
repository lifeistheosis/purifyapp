# How the chats run: the operating system

His word, 2026-11-12 about 21:14 UTC: "So yeah, let's build a system around what's recommended. So /compact, let's use /compact to optimally. And honestly, let's have the most optimal system in which we can optimize our token usage and our usage in general and our spending. And overall, an optimized system, when we do make updates or do verify certain things in those updates, I want the system to be as concrete as possible so we don't run into issues. I want clear guardrails that optimize our system and that enhances our performance."

This file binds every chat that works on Purify. It follows Anthropic's own guidance, read on 2026-11-12:

- code.claude.com/docs/en/best-practices.md: a focused context gives better answers and costs less. After two failed corrections, start clean.
- code.claude.com/docs/en/context-window.md: compaction keeps a summary and loses the detail.
- code.claude.com/docs/en/prompt-caching.md: every turn re-sends the whole conversation, and compaction resets the cache.
- code.claude.com/docs/en/memory.md: keep a CLAUDE.md under 200 lines, holding only what every session needs.
- anthropic.com/engineering/effective-harnesses-for-long-running-agents: keep memory in files, give each session one job, end it clean. Compaction alone is not enough.

## 1. Where things live

Read the smallest file that answers the question.

| File | Holds | Limit | Written by |
|---|---|---|---|
| `CLAUDE.md`, `AGENTS.md` | Binding rules only. Each rule is a few lines with a link to its story. | Under 200 lines | The arbiter, at his word |
| `docs/NOW.md` | The state now: what is in flight, who owns it, what waits on him, the next steps, the roster. | One page | The arbiter, at each change of state. It is rewritten, never appended to. |
| `docs/roles/<role>.md` | Each chat's standing brief. | One page | The arbiter |
| `docs/handoffs/<role>.md` | The last baton of each role. | One page | The outgoing chat. It is overwritten at each rotation; git keeps the rest. |
| `docs/<release>-build/HANDOFF.md` | The log. | Append only | The arbiter |
| `docs/<release>-build/BRAINSTORM.md` | His words, word for word and dated. | Append only | The arbiter |
| `docs/<release>-build/PLAN.md` | The work, row by row. | | The chats |

A fresh chat reads three files: its role card, `docs/NOW.md` and its baton. It reads nothing else until a task needs it. The log is read only to answer a question about the past.

Numbers never go into these files or into a chat: no keys, EIN, D-U-N-S, addresses, phone numbers or bank details. The repository is public.

## 2. Rotation: a fresh chat beats a long one

**When to rotate.** Rotate a chat when any one of these is true:

1. A release has shipped.
2. Its context has passed 200,000 tokens, or it has auto-compacted once (his "all recs", 2026-11-13; it was 400,000). A long history is re-read at every step, so the end of a long chat is its dearest part: on 2026-11-13 the chats that ran to 600,000 cost $30 to $60 each, and the one that handed over at its limit about $13 for like work. The arbiter reads this with get_session (`context_usage.used_tokens`) each time it routes work, and asks the chat itself before giving it more, since that figure can lag far behind (it read 109,000 for a chat at 696,000).
3. It is given a different kind of job.
4. It shows strain: two failed corrections on one thing, a missed message, or a claim the record contradicts.

**When never to rotate.** Never during a final check, a migration or a push. Never on a clock: a new chat costs its onboarding.

**The shift change, in order:**

1. The arbiter asks the chat for its baton.
2. The chat writes `docs/handoffs/<role>.md` from the template below, pushes it, and stops.
3. The arbiter starts the new chat with its role card, the baton and `docs/NOW.md`, on the model and effort its card names.
4. The new chat replies with its open items and their owners, in its own words. If one is wrong, the arbiter corrects it before any work.
5. The arbiter archives the old chat and updates the roster in `docs/NOW.md`.

The arbiter rotates itself the same way. Its baton is `docs/NOW.md` plus every word of his still open.

**The baton, one page:**

- Role and scope.
- Done since the last baton, with hashes.
- Open, each with its owner and next step.
- Gotchas: what broke, what a tool gets wrong, what to check twice.
- His words that still apply, quoted and dated.
- Where things are: files, scripts, artifacts.

## 3. Compaction

- Compact only at a natural break: after a task is pushed and reported, never in the middle of one.
- Give it a focus: `/compact keep: role, open items and owners, gate state, his open words. Drop: tool output and old logs.`
- After compacting, re-read the role card and `docs/NOW.md`. Nested rules are not kept through a compaction.
- Compact once per chat. A chat that would need a second compaction rotates instead: each one loses detail and resets the cache.
- A chat cannot compact itself; he types `/compact`. The arbiter tells him when, with the words "compact point".
- Optional: typing `/autocompact 400000` in a long-lived chat brings auto-compaction earlier and keeps every turn cheaper.

## 4. Spend

- **Size is cost.** Every turn re-sends the whole chat, so a chat's size is what each turn costs. Rotation (section 2) is the biggest saving.
- **Wake a chat only for work.** Batch each chat's messages into one per round. Do not send a big chat a note that needs no reply unless a change depends on it.
- **One of everything.** One export per fix round, stills before video, and one version unless he asks for more (his word, 2026-11-09).
- **Models.** Opus 5.5 does the work. Fable 5.2 is only for design and adverts (his word, 2026-11-12), and for the hardest faults through the arbiter. A new Fable chat runs at High.
- **Subagents.** A verbose search goes to a subagent, which returns only its summary.
- **Reading other chats.** Use list_events with kinds and a small limit, or get_session. Never read an unfiltered page.
- **Walks are cheap.** Gate walks are scripts: they cost machine time, not the weekly allowance. Model time is the scarce thing.
- **The weekly reset.** The arbiter watches `rate_limit_info.resetsAt`, and puts model-heavy work after the reset when it can wait.

## 5. Verification: done means proved

**A fix is done** when all of this holds on the branch:

1. A test fails on the old code and passes on the new.
2. typecheck is 0, the whole unit suite is green, and lint is clean on the changed files.
3. `npm run build` (web) passes whenever CSS, a server file or a shared file changed. No unit test reads the stylesheet: the gift's lost brace broke every build on 2026-11-11.
4. `npm run build:android` exports.
5. checkMock `{ pixels: true }` passes on every touched screen: at 390, 800 and 1032 wide, on the five palettes and the fourteen looks, and in Arabic.
6. Every touched control has been tapped the way a reader taps it.
7. `git pull --rebase`, then push, then one report with the hashes and the command output.

**A release candidate is done** when the final check passes on one export, cut from the head exactly as the release will be. The final check is the pre-build gate in CLAUDE.md, plus:

- part 2 at all three widths for both readers;
- the sweep of every page the walks do not reach;
- the light looks;
- offline;
- every state of anything new;
- parts 3 to 5;
- the web build.

**A test build reaches him on the page he downloads from** (2026-11-13: build 95 was kept as a run artifact, so he walked build 93 from the release page and found faults mended days before). Every test build is published to the android-release page (nothing public links to it) and to TestFlight, and before he is told, the arbiter reads the page's asset dates and names the build number he should see.

During a final check, no app code lands. Any code change after it means a new export and a new check of what changed.

**Every chat that pushes** runs the fix checklist first, a bridge chat on his PC included, and never pushes main.

**The guard runs on every push.** git runs `scripts/push-guard.mjs` before each push from a clone whose `core.hooksPath` is `.githooks`. Every Claude session sets that at its start; a chat that checks out this branch after it started runs `git config core.hooksPath .githooks` itself. The guard refuses a push to main. Docs alone (under `docs/` or `.claude/`, or a Markdown file at the root, unless code imports it) go at once. Anything else runs the two stylesheet tests, `npm run typecheck`, eslint on the changed files and `vitest related` on them, stopping at the first failure; that takes a few minutes, so give the `git push` a ten-minute timeout. `PURIFY_ALLOW_MAIN=1` lets one command push main, at his word only. `PURIFY_SKIP_GUARD=1` skips the checks but never the refusal of main, at the arbiter's word only. Never `git push --no-verify`, and never push through the GitHub API tools, which the guard cannot see. The guard is a floor under the fix checklist, not a replacement for it.

**Two strikes.** A fault that survives two fixes, or two wrong claims in one area, goes to a fresh chat with a clean brief.

## 6. Cadence

- **Archive what is done** (his word, 2026-11-13: "remember to automatically archive chats we really don't need"). The arbiter archives a chat, without asking him, once its job is pushed and its report or baton is read. It keeps a chat that still holds work, or that is the next job's natural owner soon. An archived chat can be unarchived if needed, so when in doubt and the job is done, archive.
- **Overdrive, and its end** (his word, 2026-11-13: "time to turn down on overdrive and start using our optimized system again (but clean off the charts smart and slowly as in let them finish their work submit and archive)"). Overdrive is his to call, for a reset about to waste unused allowance: chats run in parallel, one per job. When he ends it, no chat is stopped mid-work. Each finishes, pushes, reports and is archived, and a chat waiting only on his yes is archived once his answer is carried out. A new ask goes to an open chat in its lane, and a new chat starts only when no open chat can take it.
- **Parked, then applied together** (the arbiter's practice from 2026-11-13, under his word to optimise spend). A chat whose change waits on his yes saves it as a patch in the repo (`docs/1.9-build/drafts/`, or beside its record), pushes that as docs, and is archived, rather than idling with a long history. On his yeses one fresh chat applies the approved patches together, rebased on the head, with one export, one round of checkMock and walks over the touched screens, and one push each. A long history is re-read at every step, so a fresh chat is the cheaper one to finish the work.
- **Each fix round:** one message out to each chat, one report back from each.
- **Each change of state:** the arbiter rewrites `docs/NOW.md`.
- **Each release, once it has shipped:**
  - every chat rotates;
  - the release's HANDOFF, BRAINSTORM and PLAN are closed, and a new `docs/NOW.md` begins;
  - CLAUDE.md is read for rules that have become history, to keep it under 200 lines;
  - a tune-up: the Claude Code docs and Anthropic's notes are checked for new features, and one or two are adopted.
