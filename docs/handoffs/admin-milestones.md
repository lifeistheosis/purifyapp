# The milestones in the admin panel: the hand-over

The worker chat for one job: his own milestones in the panel, with the Goals page as the first page made the calm way. Brief: `docs/handoffs/admin-milestones-prompt.md`. Plan: `docs/plans/goals-milestones.md`. Chat: session_01VuYTwahCwgJrrvD9WTZ9Lu (Opus 5.5), from 2026-11-24 09:25 UTC.

**The repository is public.** His two weekly marks, his real numbers and anything about himself are not in this file, in the code or in the drawing. Every figure in the drawing is made up.

## His words (verbatim)

2026-11-24, about 09:25 UTC, opening this chat: "Make the drawing of the Goals page first, give me the link, and stop for my yes or no. Send no message to any other chat."

## Where it stands

**Waiting for his yes or no on the drawing.** Nothing past the drawing is built: no measure, no route for the marks, and the real Goals tab (`components/admin/tabs/GoalsTab.tsx`) is unchanged.

- The drawing, a private artifact: https://claude.ai/artifact/S4FhycWThzkyV6uMWHWdMh (the page at 390 in the panel's dark theme, what it shows and where, a reason for each choice, its other states, what was checked, and two questions).

## What was built (on the branch, for the drawing)

- `components/admin/goals/GoalsView.tsx`: the page itself, presentational. It takes one `GoalsData` (worked out elsewhere from the kept events, later) and writes the words. It is what ships at his yes; only the data behind it is still to build.
- `components/admin/goals/GoalsPreview.tsx`: three sample states (mid-road, the first weeks, the week a step is reached), every number made up and consistent with the others. It wears the panel's light theme when checkMock puts the reader's Light palette on `<html>`, and the panel's dark for the other four, in the preview only.
- `app/admin/goals-preview/page.tsx`: the preview route, the posture of `app/admin/charts-preview` (dev only, a 404 to anyone but an admin in production, reads nothing). `?state=full | first-weeks | reached`, `?theme=dark | light`.

What the page shows, top to bottom, each thing once:

1. The number: what members bring in a week after the stores' share; growth on last week against the 5% asked; one line to the next step by name (or "held N of 4 weeks" when the number is over a step not yet held).
2. Three facts: paying now (monthly, yearly); this week (joined, left); the next step's day at his pace (the last four weeks' average gain a week, in dollars) and at 5% a week.
3. The four that move it: new readers, the share who begin a trial or a plan, the share of trials that pay, the share who leave; each against his last four weeks bettered by 5% (less for who leave); the one lever; "to stand still: about N new members a month".
4. The road: six steps, reached ones quiet with their day, the next plain with its members at today's mix, the rest with members and both days (a day past half a year shows only its month).
5. By update: each release's line, newest first (joined, left, the share who left a month, trials that paid).
6. What we never trade for money: the store's rating, refunds (dot and word), and what was free stays free (words only, no meter).
7. Folded: Monthly and yearly (the mix, who left in 30 days by plan, the early signs, the two ends), Extra (the shop), This hour (`HourlyGoals`, as it is), The Bible licence (`ApiLimitsPanel`, as it is), Your marks (two rows, name and dollars a week, and Save marks). `ApiLimitBanner` stays first on the page, as today.

## What was proved, and how

- checkMock (`scripts/mock-check.mjs`) on the preview at 390 with touch, all four states (mid-road, first weeks, reached, three folds opened by real taps), on the five palettes: every rule passes. Its first run caught the two amount fields at 25px tall inside a 44px box; they are 44px now.
- The kit's check on the artifact page (`node docs/brand/kit/check.mjs --page`): passes on the five palettes at 360, 390, 412 and 1032, no parchment, no sideways scroll.
- The preview at 390: no sideways scroll; no page error (the 403s are the hourly goals and the licence asking their real routes with no session, inside closed folds).
- `npm run typecheck`: 0. eslint on the three new files: clean.

## What could not be checked

- checkMock `--self-test`: its list check passed; its fixtures open the native export, which this chat did not build (the panel is not in the export). The checker showed it is live by catching the 25px fields.
- The web build: not run at the drawing. It is part of the page's proof at his yes, and it needs the fault below fixed first.
- Real numbers: the measure is not built yet.

## Found, not this job's to change (told to him)

`docs/handoffs/updates-98q.md` (line 7, committed in `1da1e84c`) has the text `bg-[rgb(var(--fast-<kind>))]` in prose. Tailwind scans `docs/` for class names, writes that one into the stylesheet, and the CSS parser fails: "Parsing CSS source code failed ... Unexpected token Delim('<')" on `app/globals.css`. Every dev compile fails on it; the production web build very likely fails the same way (not run). This chat rendered the drawing by adding `@source not "../docs";` to its own copy only, and put the file back; nothing of it is committed. The fix proposed: that one line beside `@source not "../.claude";` in `app/globals.css` (docs hold no class the app uses), proved by the web build.

## Open questions (his to answer, one or two at a time)

Asked with the drawing:
1. Marks counted after the app's own monthly costs? Proposed: yes.
2. A step reached once the number holds it four weeks running? Proposed: yes (drawn so).

Still to ask when the step needs it: whether Pro (the EIKON Box membership) counts, after the cost of its box; a date for the first mark; whether the page goes to the main web before 2.0 (his word alone).

## Next, at his yes (in this order)

1. The measure, beside `lib/admin/plusHistory.ts`, pure, with tests: the period from the product's name (word by word, as `planOf`); the number by week and plan from each member's own price and take-home share; the mix; churn over 30 days by plan; each release's line from `data/changelog/patches.json`; the pace and the days; the road (six steps, reached = held four weeks, "held N of 4"); the four and their aims; standing still; the lever. Not enough weeks: `enoughOn`, and no rate, day or aim. Who pays now from `entitlements` and RevenueCat, as Subscriptions reads it. His own account out (`lib/dev/developer.ts`). The output is `GoalsData`.
2. The marks: one admin route (zod, the rate limit, the service role), kept in `site_settings` under one key. No migration.
3. The page: `GoalsTab` renders `GoalsView` from a route that returns `GoalsData`, with `ApiLimitBanner`, `HourlyGoals` and `ApiLimitsPanel` in their places. Add the quiet focus for the marks' fields (`adm-quiet-field`: a tap shows the house's fine edge, the keyboard keeps its ring); the panel's own `.adm input:focus-visible` ring outranks the house rule, so it needs its own line in `app/admin/admin-theme.css`.
4. Proof: typecheck, the unit tests, lint, the web build (after the Tailwind fix), the page walked at phone width with real touch through the preview, and checkMock again.

## Noted for the rest of the panel (not this job, nothing changed)

- A tapped field anywhere in the panel shows the 2px keyboard ring (`.adm input:focus-visible`), which his rule of 2026-11-10 forbids for a tap.

## Cost

get_session reports neither cost nor context size here. An estimate for the drawing: one turn, about 120,000 tokens of context at the end.
