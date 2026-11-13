# Baton: the Fable designer, the fifteen screens

Written 2026-11-13 by session_01VuYTwdnLqpagUQMTXSRWUF after round 1; rewritten after round 2 by session_01VuYTwdwzHBSFrdVEkrdW2i. Card: `docs/roles/fable-designer.md`. Read `docs/1.9-build/redesign/README.md` first: it is the method, the recipe and where each round stands.

## Done

- Round 1: Today and the four house rules, https://claude.ai/artifact/7i93tDncctM4SU3qeqPjb4. His yes to all five (2026-11-13 20:47 UTC); an apply chat has `round-1/held.patch`.
- Round 2 sent 2026-11-13 21:55 UTC by session_01VuYTwdwzHBSFrdVEkrdW2i: the first launch's questions, Prayers and Discover, https://claude.ai/artifact/NhoSL95Kip76jng4gemM6z. Fourteen of fifteen stills pass `checkMock` with pixels; the fifteenth is the unchanged picture step, which fails in the app as it stands (named on the page). The proposal is `round-2/held.patch`; what it stands on, the build spec's notes and how to rebuild the page are `round-2/README.md`.

## Open, each with its owner

1. **His yes or no on each of round 2's three** (the arbiter carries it). On a yes: cut that screen's part of `round-2/held.patch` into `docs/1.9-build/redesign/<screen>/change.patch`, write `spec.md` beside it from `round-2/README.md`, push (docs only), and send the path to the arbiter.
2. **Round 3**: the Bible's opening, You, Plus. Not begun. Draw on the pushed code once rounds 1 and 2 land, or on the held patches until then.
3. **Rounds 4 and 5**, as the README lists them.

## Round 2's gotchas

- **A round costs about 200,000 tokens as this one was run.** Do not read a whole artifact back (the ranking's page is 66 KB of style): take the findings from `docs/1.9-build/redesign/README.md` and ask the arbiter for the three screens' lines. Read source by grep and by part.
- **`npm ci` first** (a fresh container has no `node_modules`), then the before export, while reading.
- **Each export is ten minutes and each checked still a minute.** Run the checker on the first after-export before fixing anything, so one more export mends everything it finds.
- **The first launch as a still:** set `purify:onboarded` to `0` and `purify:ab.seed` to a fixed number; walk the steps with `eval` clicks (`round-2/plans.mjs`). The chosen pill is `bg-paper` too, so the way on is the last `button.bg-paper`.
- **Faint words over the horizon's light fail on Light** whatever their share (the palette pins faint shares): put them on a tray, not on the sky.
- **Note 9's patch applies without its `docs/brand/` files** (`--exclude='docs/brand/*'`).

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
