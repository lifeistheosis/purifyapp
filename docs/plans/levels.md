# Purify's levels

His word, 2026-11-24: "So now we need to start formulating plans and pretty much phases. So right now we're in level 1 phase, get enough users, not users, but enough paying members to sustain itself. And then level 2 will be the first, I guess you could say, personal milestone, which is like after the first stepping stone, right after we maintain ourselves." And: "server cost will also include the $200 Claude plan, and you're gonna start doing the first batch of tracking autonomous expensing when it goes through the bank."

A draft for his yes. The Goals tab already holds the ladder these levels sit on (`lib/admin/milestones.ts`): Level 1 is its "Pays its own bills", Level 2 is his own mark, set by name and amount on that tab.

## The figures they rest on (2026-11-24)

- A paying member is worth about $8.50 a month net ($9.99 less the stores' 15%); a yearly one about $5.10 a month.
- 17 paying members, 5 trials, 5 set to end. RevenueCat: MRR $177, $352 in 28 days, 481 new app users in 28 days.
- Running costs: his cost lines in the Costs tab, which must include Claude at $200 a month, until the bank holds a whole month of bills; then the average of the bank's last whole months (up to three), by itself (`monthlyCosts`, `lib/admin/goals.server.ts`). The digest and `node scripts/owner-report.mjs` print the costs, where they came from, and how much of them Plus covers.

## Level 1: Purify pays its own bills

- **Target:** net Plus revenue at or above the running costs. With Claude about $300 a month, about 36 paying members; with half a month spare (the ladder's 1.5 rule), about $450 and about 53.
- **Done when:** three months in a row at or above the costs, and under one in ten members leaving a month. One good month is not the level.
- **The work, in order, cheapest first:**
  1. Keep who is leaving: a one-question reason when a member cancels, or his own note to the five set to end.
  2. Trials into members: a reminder before a trial ends that names what the reader keeps with Plus.
  3. New users into trials: 481 new users made about five trials in 28 days.
  4. The sign-up step: new accounts fell 28% in a week while visits held.

## Level 2: the first personal milestone

- **Target:** his number, to be set as his mark on the Goals tab. The ladder's default is the first $1,000 net month, about 118 members.
- **Done when:** the same three-month rule.
- The work is planned when Level 1 is in sight.

## Open, for him

1. Level 2's number.
2. Claude's $200 as a line in the Costs tab (until the bank takes over).
3. His yes to this order of work.
