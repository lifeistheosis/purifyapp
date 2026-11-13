# Baton: the Fable designer, the fifteen screens

Written 2026-11-13 by session_01VuYTwdnLqpagUQMTXSRWUF after round 1. Card: `docs/roles/fable-designer.md`. Read `docs/1.9-build/redesign/README.md` first: it is the method, the recipe and where each round stands.

## Done

- Round 1 sent: Today and the four house rules, https://claude.ai/artifact/7i93tDncctM4SU3qeqPjb4. Eleven proposed stills, all passing `checkMock` with pixels; the page passes at four widths.
- The whole proposal is kept as `docs/1.9-build/redesign/round-1/held.patch` (16 files, not approved, not applied). To stand it up again: `git checkout -b held/fifteen-screens ccr-07896cf2-bo0afd && git apply docs/1.9-build/redesign/round-1/held.patch`, and never push that branch.

## Open, each with its owner

1. **His yes or no on each of round 1's five** (the arbiter carries it). On a yes: cut that screen's part of `held.patch` into `docs/1.9-build/redesign/<screen>/change.patch`, write `spec.md` beside it, push (docs only), and send the path to the arbiter.
2. **Round 2**: the first launch's questions, Prayers, Discover. Not begun. The questions are where rule 5's second form is drawn (one answer from a list: rows in one tray, the chosen row marked). Discover's hold to reorder and its search transition are other chats' and are taken in, never redone.
3. **Rounds 3 to 5**, as the README lists them.

## For Today's build spec, when he says yes

- States not drawn: the lead after the hour's prayer is prayed (the Prayed today mark beside "Now", from `useKeptToday` in `PrayNowCard.tsx`); a great feast (the Hymns of the feast link under Begin is in the patch, not in a still); a reader learning and a reader new to the faith (the greeting in the lead; in the patch, not in a still).
- `StreakRow` keeps a 92px hold before the streak is read; for a reader with no day kept it would hold and then close. Hold only when a stored streak exists.
- The rope hides the numeral at zero for a reader who has kept days before (the line and the week's knots stay).
- `fastMarks` and the `Marks` part in `ChurchTodayRail.tsx` are no longer used on Today; remove them or keep them for the Fast's screen as that chat decides.
- The plates' `data-carry` on Heresies and Theology's rows went with the tiles: the page transition that carried the plate needs another thing to carry, or none.
- `.set-track` now lights `a` and `[aria-pressed="true"]` as well as `button[aria-checked="true"]`; `.set-root[data-live]` and the faint-text rules still name `button` only. The doors' icons were dropped from the head row and kept in the pinned row: make them agree.
- Tests to write: the lead holds one `bg-paper` button on Today; no "0" in the first screen for a reader with nothing kept (Today, Theology); no `uppercase` with `tracking-` in app/ and components/ (26 files today, admin and the owner's pages apart); no `theology-plate` in a list row.

## Gotchas

- **A stills run needs its own reader.** `purify:onboarded` alone is a reader who skipped the questions, and Today then shows the second-chance card. Set `purify:secondchance.done`.
- **Fix the clock with `clock.setFixedTime`, never `clock.install`:** installed, the app's timers stop and the opening never leaves the screen.
- **`checkMock` prints a still's failures before the line that names the still.**
- **A server part cannot be imported into a client part**: the Nativity star reaches the lead as a prop from `TodayGreeting.tsx`.
- **The export takes about ten minutes and the checker about a minute a still.** Batch the changes, then cut once.
- **The artifact page is published from this machine's scratchpad.** A new session rebuilds it: cut both exports, run `round-1/plans.mjs`, `tools/shots.mjs`, `round-1/pics.mjs`, `round-1/page.py`, and publish to the same link with its `url`.

## His words that apply

- "I want everything fixed in v1.9 no pushing out to 2" (2026-11-13 about 08:13 UTC).
- "the fast is clearly outdated" (2026-11-13 07:26 UTC).
- "you must justify your designs"; "the design must be optimized for mobile."; "stop using parchment for designs" (2026-11-13).
- One version, stills only, no alternatives (CLAUDE.md, "Spend only what was asked").
