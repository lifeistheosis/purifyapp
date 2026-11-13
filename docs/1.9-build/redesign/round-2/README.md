# Round 2: the first launch's questions, Prayers, Discover

Drawn 2026-11-13 by the Fable designer (session_01VuYTwdwzHBSFrdVEkrdW2i). The method is `../README.md`. Not approved and not applied: nothing here ships without his yes, a screen at a time.

## What `held.patch` stands on

It is round 2 alone, as a diff against the working branch (0d46901a) with two approved patches under it, neither of which had been pushed as code when the round was drawn:

1. `../round-1/held.patch` (round 1, his yes of 20:47 UTC).
2. `docs/1.9-build/drafts/build-95-note-9.patch` (Discover's hold to move), without its `docs/brand/` files, which no longer apply and are not needed for the app.

To stand it up: `git checkout -b held/fifteen-screens ccr-07896cf2-bo0afd`, apply those two if the branch does not hold them yet (`git apply`, the second with `--exclude='docs/brand/*'`), then `git apply docs/1.9-build/redesign/round-2/held.patch`. Never push that branch.

## The proposal, by screen

- **The questions** (`components/onboarding/OnboardingFlow.tsx`, `WhereFrom.tsx`, `app/globals.css` `.ob-row`): the opening's stars under every step and its horizon where the foot is free; every single answer as a row in one tray, the chosen row a shade lit and ticked (rule 5's second form); the first question's chosen row carries the line that says where Purify starts the reader; the lit cross where the welcome's icon tile was; every question's heading centred at one height; the small line in round 1's form. The picture grid of the last question is untouched.
- **Prayers** (`components/mobile/PrayersMobile.tsx`, `components/prayers/RuleToday.tsx`, `PrayNow.tsx`): a reader with no rule is led by the hour's prayer with the one Begin (a reader with a rule keeps the checklist); Pray now as the house's rows, without the hour's prayer or the Jesus Prayer; the Jesus Prayer on the page with one link; the prayer book once; Your rule, Learn to pray and Chants as rows under it. The All prayers row and the Practices tiles go.
- **Discover** (`components/discover/DoorOrder.tsx`, `app/globals.css`): the door that stands first is drawn at a larger scale, by position; a reader whose stored level is inquirer or learning has Start here and Find a parish first in the first order. No group headings, since hold to move makes the order the reader's.

No new word: every line is an existing key.

## For the build spec, on a yes

- Discover: `scripts/door-order-walk.mjs` again with the taller first band (the drag measures rows by height; the lead changes hands on a drop). `orderPrepaint` draws the library's own order on the website: a new reader's first order needs the same early draw. Restore the original order should restore the first order as that reader has it.
- The questions: `ClergySteps.tsx`, the account step and the reminders step were not redrawn; their lists should take the same row. `.ob-pill`, `.ob-choice`, `.ob-says-ln` and `onboard-mark-in` are left unused. Tests that read the pills or `ChoiceCard`'s ring will need the row (`[data-choice-row]`, `aria-pressed`).
- Prayers: `PrayerPieces.tsx` and the phone's use of `SoftTiles` are left unused; the tiles' `data-carry` into Your rule and the Hours has no tile to leave from. States not drawn: the checklist lead (unchanged), the evening hour.
- Tests to write: one `bg-paper` button on Prayers' first screen for a reader with no rule; each of `/prayers/morning`, `/prayers/hours`, `/prayers/akathists`, `/prayers/personal`, `/prayers/learning` linked once on Prayers; no `.ob-pill` in the questions; the first door's height on Discover follows a reorder.

## Rebuilding the page

Cut both exports (`../tools/export.mjs`; the before from the working branch, the after from the held branch), then `node plans.mjs <scratchpad>`, `../tools/shots.mjs` for each plan (before into `<scratchpad>/b2`, after into `<scratchpad>/a3` with `--check`), `node pics.mjs <scratchpad>`, `python3 page.py <repo> <scratchpad>`, `node check.mjs <scratchpad>/round2`, and publish to the same link with its `url`.
