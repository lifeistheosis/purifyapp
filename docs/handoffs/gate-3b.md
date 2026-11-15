# Baton: Gate 3b (the rest of Gate 3's re-check, 2026-11-15)

Written 2026-11-15 about 01:25 UTC by Gate 3b (session_01VuYTwcHj8T9AyPYdHcB3cD), started by Arbiter 14, at its line of 200,000 tokens (get_session 204,388). The record is `docs/1.9-build/notes/gate-run-3.md`, section "Gate 3b".

## Role and scope

Card: `docs/roles/admin.md`. Branch `ccr-07896cf2-bo0afd`. Finishes what Gate 3 left (`docs/handoffs/gate-3.md`): its three probes, the font swap (Updates 69's item 4), the web build, the motion walk's results and the arbiter's note 2. Names faults, mends no app code.

## Done

- The export of `5bf09c2ce` (205.2 MB, 7,372 files, 75.1 MB packed), the key anon and written nowhere. It is still in `out/` of this container, which will be lost.
- Gate 3's three probes: **all pass.** Fault 2's heart (the Greek 33-knot rope's heart meets the finger and keeps the page), fault 8's exact day (the Selections line, 0 failures in all groups at 800 and 1032 in Arabic), a thread open with 5 replies (0 failures at three widths).
- The font swap on Saints and Settings, en and ar, 390 by 844, CPU 4x, five tries each: **pass**, no block moved by 0.5px in the 2 s after the tap.
- The arbiter's note 2: **a fault, 3 of 3.** /community/'s second post jumps 80.7px up (698 to 617) 352 to 681ms after the Chat door's tap: the posts' `content-visibility: auto` placeholder (`contain-intrinsic-size: auto 320px`, `components/community/CommunityClient.tsx:1866`) is laid out first. The sign-in line steps 1px down when the posts arrive. Told to the arbiter at 01:17; Updates 77 has it.
- The web build: exit 0, 6,526 of 6,526 static pages.

## Open

| What | Owner | Next step |
|---|---|---|
| The motion walk's four lanes | the next Admin chat | Read `docs/handoffs/gate-3-walks/` (README.txt has the lanes' times; due about 02:40 UTC). Count the findings of kind blank and the fails, not the dips (distinct times). For each fail: the profile's opening (Updates 71), Discover's Shop section offline (Updates 72), Today's Saint's carry (Updates 73), or new; all three were mended before `d6bef349d`, so a fail there now is a fault. Read fault 7 (the Virgin of Vladimir card's carry on /shop/) and every `carry { key, taker, carried }` record. If nothing has landed by 03:30 UTC, Gate 3's container was lost: run the walk on an export of the head (command in `docs/handoffs/gate-2.md`). |

## Gotchas

- **get_session's used_tokens does not move inside a turn.** It read 103,633 for the whole first turn and 204,388 at the next; plan by turns, and read it at each turn's start.
- **The tap watcher reads blocks on or near the screen** (up to 400, found again at each change of the page or scroll). Its first version stopped at 600 blocks in document order and reached that cap on Saints; tries 4 and 5 used the fixed version and saw the same 9 opened blocks.
- **A one-frame step is trusted only from a read in requestAnimationFrame**, as both runners read.
- **Do not commit while an export runs** (git shows the stashed trees as deleted); the web build stashes nothing.

## Where things are

The record: `docs/1.9-build/notes/gate-run-3.md`. The runners: `docs/handoffs/gate-3b-runners/tapwatch.mjs` (`node tapwatch.mjs out <jsonl> <job@lang@cpu@try>`, jobs saints, settings, chat) and `chatcause.mjs` (`node chatcause.mjs out`). Gate 3's runner: `docs/handoffs/gate-3-runners/mockrun-g3.mjs`. The walks' results: `docs/handoffs/gate-3-walks/`.
