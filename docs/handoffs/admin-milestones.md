# The milestones in the admin panel: the hand-over

The worker chat for one job: his own milestones in the panel, with the Goals page as the first page made the calm way. Brief: `docs/handoffs/admin-milestones-prompt.md`. Plan: `docs/plans/goals-milestones.md`. Chat: session_01VuYTwahCwgJrrvD9WTZ9Lu (Opus 5.5), from 2026-11-24 09:25 UTC.

**The repository is public.** His two weekly marks, his real numbers and anything about himself are not in this file, in the code or in the drawing. Every figure in the drawing is made up.

## His words (verbatim)

2026-11-24, about 09:25 UTC, opening this chat: "Make the drawing of the Goals page first, give me the link, and stop for my yes or no. Send no message to any other chat."

2026-11-24, on the first drawing, about 09:55 UTC: "more simplified." Then "the drawing". Then, about 10:00 UTC: "im saying make the design more simplified and minimalist". Taken as a no to the first drawing and the direction for the second, which replaced it at the same link. Replies to him are in simplified mode (short, plain, emojis welcome) until he says otherwise.

2026-11-24, on the second drawing, about 11:00 UTC: "I want to see more milestone bars/ achievement designs". Taken as one version that shows the milestones as bars and achievements (version 3 at the same link), not a set of options.

## Where it stands

**Waiting for his yes or no on the third drawing** (version 3 at the link: the minimal page with the milestones as bars and achievements). The first, busier one he sent back for "more simplified and minimalist" (artifact version 1, commit `58e3352c`); the second, minimal one, he answered with "more milestone bars/ achievement designs" (version 2, commit `0121babc`).

- The drawing, a private artifact: https://claude.ai/artifact/S4FhycWThzkyV6uMWHWdMh, version 3 (the page at 390 in the panel's dark theme, a reason for each choice, its other states, and two questions).

## What was built (on the branch, for the drawing)

- `components/admin/goals/GoalsView.tsx`: the page itself, presentational. It takes one `GoalsData` (worked out elsewhere from the kept events, later) and writes the words. It is what ships at his yes; only the data behind it is still to build.
- `components/admin/goals/GoalsPreview.tsx`: three sample states (mid-road, the first weeks, the week a step is reached), every number made up and consistent with the others. It wears the panel's light theme when checkMock puts the reader's Light palette on `<html>`, and the panel's dark for the other four, in the preview only.
- `app/admin/goals-preview/page.tsx`: the preview route, the posture of `app/admin/charts-preview` (dev only, a 404 to anyone but an admin in production, reads nothing). `?state=full | first-weeks | reached`, `?theme=dark | light`.

What the page shows, top to bottom, each thing once (the third drawing: the minimal page, no boxes, small grey labels, space between parts, with the milestones as bars and achievements):

1. A finish, only the week a step is reached: the app's own `FinishMoment` (components/flow/FinishMoment.tsx: the circle lands, the check draws itself, still with Motion off), "You reached halfway" and "Held $750 a week for four weeks running."
2. The number: "Members bring in", the figure a week, growth on last week against the 5% aim.
3. Milestones, with "N of 6 reached" at the end of its label: each step reached as an achievement (the house's `Seal` icon, its name, "Reached" and its day, its amount); the next step in bold with a thick bar, then what it needs at the start (the share and the dollars to go; about N more members) and its day at the end (at his pace; at 5% a week), or, when the number stands over it, the weeks held and the day it is reached if it holds; a thin bar for every step ahead with its share, members and day at his pace. The 5% day shows for the next step only.
4. This week: paying now (monthly and yearly under it), joined and left.
5. What moves it: the one lever in a line, then the four, each with its aim under its name and a dot and a word (Met, Not yet).
6. More, quiet rows that open in place (no box, a hairline between, the house's chevron): By update; Monthly and yearly (value: the monthly share; inside: the mix, who left in 30 days by plan, what standing still costs, the two ends, the early signs, how a member counts); Guardrails (value: "All hold", or what broke); Extra (value: the shop this month); This hour (`HourlyGoals`); Bible licence (`ApiLimitsPanel`); Your marks (two rows, name and dollars a week, Save marks). `ApiLimitBanner` stays first on the page.

## What was proved, and how

- checkMock (`scripts/mock-check.mjs`) on the preview at 390 with touch, all four states (mid-road, first weeks, reached, and five More rows opened by real taps), on the five palettes: every rule passes, on all three drawings (the third with the finish moment on the panel's dark and light). Its first run caught the two amount fields at 25px tall inside a 44px box; they are 44px.
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

get_session reports neither cost nor context size here. An estimate: about 175,000 tokens of context after the third drawing, near the 200,000 line where the brief says the next piece goes to a fresh chat; $8 to $20 in all by the token count (the price per token is not shown).
