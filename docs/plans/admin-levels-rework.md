# The admin panel, rebuilt around the levels

His word, 2026-11-24: "I want you to scan the admin panel because there's like a recurring theme that's just too much info and it's not optimized. and minimal." Then, to the plan below: "don't touch the amount of data shown on the live section and the charts. Everything else, sure though."

The levels are `docs/plans/levels.md`: Level 1, Purify pays its own bills; Level 2, his own mark on the Goals tab.

## The rule he set (binding)

- **Live keeps all it shows.** Traffic, Live (`components/admin/tabs/TrafficViews.tsx`, the live view and its reader card) loses no figure, no row and no field.
- **Every chart keeps all it shows.** No chart loses a series, a line, a period or its table view. A chart may move to another page; it is not cut down.
- **Nothing is deleted.** A view leaving the menu stays reachable (`folded: true` in `lib/admin/pages.ts`, and its `#tab=` link keeps working).

## What the scan found (2026-11-24, from the code)

1. 15 sections and about 45 views (`lib/admin/pages.ts`) for 17 paying members.
2. The same money in five places: Money (Overview, Revenue, Subscriptions, Costs), Goals, Strategy, Sustainability and Home. His rule "each thing once on a screen" holds the admin too.
3. Subscriptions splits 17 people ten ways (paying, comped, gifted, grandfathered, active Plus, trial, Pro, Plus only, supporters, by source) as separate cards.
4. Traffic has about 20 panels. Live and the charts stay as they are (his rule); the other panels are the room to cut.
5. Strategy (the plan, the model, markets, investors) is Level 3 work in the daily menu.
6. Home is closest to right but does not answer "are we at Level 1?".

## The work, in three steps

1. **Home answers the level.** One screen at phone width: Level 1's bar (net Plus against the running costs, `monthlyCosts` in `lib/admin/goals.server.ts`), paying members, trials, members set to end, new accounts this week against last, and "Still waiting on you". Home's own charts stay whole.
2. **Money is one page.** Came in, went out, kept, the bank (`BankPanel`), and members as one figure with its ten-way split folded under it. Revenue, Subscriptions, Sustainability and Goals fold into it or under it; their charts move whole.
3. **The menu goes from 15 sections to 6:** Home, Money, Readers (traffic, sources, onboarding, screens, engagement; Live and the charts whole), Shop (orders, carts, catalogue, EIKON Box, messages), Content and community, System (services, releases, audit, your week). Strategy folds under Money until Level 2.

## How each step ships

- A phone-size still of the step first, drawn from the panel's own components with real-shaped data, with a short reason for each choice (his rule, 2026-11-13). Nothing is built past the still without his yes.
- Each figure that leaves a card is listed with where it now lives, so nothing silently disappears.
- The house rules hold: 44px targets, no side stripes, no sparkle, no em dashes, each thing once, every page switch a transition, phone first.
- Typecheck, unit tests, and the changed tabs walked at 390px in `/admin/shell-preview` (it needs the one-line `@source not "../docs";` fix of `docs/handoffs/admin-milestones.md` to compile while the branch's docs hold `bg-[rgb(var(--fast-<kind>))]`).

## Cost

Step 1 about half a day; steps 2 and 3 a session or two each. Done in a fresh chat at his yes (the chat that wrote this plan was near its token line).
