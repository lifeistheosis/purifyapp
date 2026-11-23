# The milestones: his own goals, counted from subscriptions

A plan for his yes. Written 2026-11-23 about 21:30 UTC in the promo chat (session_01VuYTwaR8ZjSrVP4wNc6eeM), at his word of 21:20 UTC. **Nothing is built.**

**This repository is public.** His two weekly marks and the reason he gave for them were said in the chat and are left out of this file on purpose. They are his to type into the panel, and they live in the database, never in the code.

## His words (verbatim, 2026-11-23, 21:20 UTC; the private figures left out)

"Okay, so 2 actual things that I want finished with the rest of our limit. The first one is to make promo, obviously, and the other one is to incorporate our new goals list."

On the panel: "It's not really UX friendly. It feels like a terminal, right? And it feels very codey, if that makes sense. It doesn't feel like a clean, minimal UX experience, though it does do the job and it shows the data. But I want to start implementing better UX experience, especially for the goals, right?"

On the goals: "Because I know we have hourly goals, daily goals, monthly goals. Those are all fine. But I want custom goals that I want hit and more objective, you know, higher end goals, right?" He then named two marks of income a week, a first and a higher one.

On what counts: "I want to count the yearly subscriptions and the monthly subscriptions. Prioritize both, but realistically, we're going to prioritize the monthly because, you know, yearly, you have to wait every year. So yearly is like right under the monthly prioritization. Both are good though. The monthly subscription is what's gonna keep the business running on its own feet overall. We also need to track the churn. We also need to keep that in mind for every update."

On how it runs: "And then I need it to auto-optimize itself. For example, maybe the majority is going to be the monthly. Maybe the majority is going to be the yearly subscriptions." And: "actually, I don't want to use shop sales. Shop sales are good, but those are extra. I want to mainly focalize on the subscriptions because that's reoccurring revenue." And: "incorporate a system that automatically tracks, automatically converts the data into our goals. And after that whole system is set, then we can like update the, you know, for example, the email list, right? The notifications, maybe the smaller goals that we have and what that actually looks like. In general, I just want milestones that are deeply incorporated into our system and our tracking."

## What the panel has today (read on the branch, 2026-11-23)

- **The Goals tab shows hourly goals only** (`components/admin/tabs/GoalsTab.tsx`): visitors, page views, signups and revenue in the hour, with notices to his phone, and the API limits. The daily, weekly and monthly goals graded reports pasted in from the store; they came off the tab on 2026-09-13 because the reports had stopped, and their rows are kept (`insight_goals`).
- **A ladder of goals is written and is on no screen.** `lib/admin/goals.ts` builds four rungs from net monthly revenue (break even, boxes covered, a cushion, the first $1,000 month), with tests. Nothing in `app/` or `components/` calls it.
- **Every store event is kept since 1.9.** `public.plus_events` (`lib/billing/plusEvents.ts`, signed off 2026-11-10, run by the 1.9 merge): the product bought, trial or paid, the price in dollars, the store's take-home share, the renewal's number, and why a membership ended. `lib/admin/plusHistory.ts` already counts by week: joined, trials, trials that paid, left, renewal turned off, card failed, refunds, and money before and after the store. It sets aside test money, gifts and grants.
- **RevenueCat's own figures**, when its key is set (`lib/billing/revenuecatMetrics.ts`): monthly recurring revenue, paying members, trials, the last 28 days.
- **Named settings in the database** (`public.site_settings`: a key and an object, written from Admin with the service role). The marks can live there with no migration.

What is missing, and is this plan:

1. Monthly told from yearly. The product's name says which ("purify_pro:monthly", "Plus Annual"); `planOf` reads Plus from Pro and nothing reads the period.
2. A churn rate. "Left" is counted; it is never set against who was paying.
3. Anything by release.
4. A pace and a day of arrival.
5. A mark of his own, and a page that leads with it.

**One limit, to be said on the page and not hidden:** events are kept only from 1.9's release. A member who joined before it first shows at their next renewal, so the count of who pays fills in over the first month (monthly) and the first year (yearly), and a churn rate means little before about four full weeks. Until then the page says "not enough weeks yet", and reads who is paying now from `entitlements` and RevenueCat, as Subscriptions does.

## What a mark measures (proposed)

- **One number: recurring income a week from subscriptions, after the store's share.** A monthly member counts their price times 12 over 52; a yearly member their price over 52. At the list prices and the stores' 15%, a Plus monthly member is worth about $1.96 a week and a Plus yearly member about $1.18. The page uses each member's real price and the real share from their own events, not the list.
- **Why this and not "what came in this week":** a yearly payment lands whole in one week and then nothing for a year, which is his own reason for putting monthly first. The page shows what came in this week beside the number, smaller.
- **Not counted:** shop sales (his word: extra), gifts, comps, his own account, test money, trials that have not paid. Shop income is shown apart, under the name Extra.
- **Reached means held:** a mark is reached when the number has stood at or over it four weeks running, so one good week is not announced as the goal. (Proposed; his to change.)
- **Two things for him to settle** (asked in the chat):
  - Before or after the app's own monthly costs. Proposed: after, since the ladder already knows the costs, and money that pays a server pays nobody.
  - Whether Pro, the EIKON Box membership, counts. Proposed: yes, after the cost of its box.

## His question: are these good goals? (2026-11-23, about 21:35 UTC)

His word, verbatim: "are these even good goals?"

Answered in the chat: right as a destination (recurring money, measurable, churn counted with it), and not yet goals to steer by. Four changes were proposed. None has his yes yet.

1. **A date on each mark.** Without one the page can only say when he arrives. With one it says how many paying members to gain each week, and whether this week did.
2. **The numbers he can move are the working goals.** A mark is far off and moves slowly. Under it the page leads with the four that produce it, week by week: new readers, the share who begin a trial or a plan, the share of trials that pay, and the share who leave. A promo or an update is judged by these.
3. **Monthly or yearly is ranked by the numbers, not by feel.** At the list prices a yearly plan pays what 7.2 months of monthly pays, and pays it on the first day. So a monthly member is worth more only if monthly members stay longer than about seven months, which the kept events will show in time. The paywall today favours yearly (the free trial and the lower price are on it), while his word puts monthly first: one should follow the other once the numbers are in. A price or a paywall is his alone to change.
4. **Standing still has a cost.** Whatever share of monthly members leaves each month must be gained again before the number grows. The page says it plainly: "to stand still: this many new members a month".

Also said: a mark that stands for a wage is counted after the app's costs, and tax comes out of it after that, which is his accountant's to size.

## The structure proposed (his word, 2026-11-23 about 21:45 UTC)

His word, verbatim, on the goals: "give me a more structured goals". (He gave one private fact about himself with it, as context. It is not recorded here.) Put to him in the chat, and not yet his yes:

1. **The one number.** Recurring subscription income a week, after the store's share. Everything else on the page serves it.
2. **The road, six steps.** The app pays its own bills (the rung already in `lib/admin/goals.ts`); a tenth of his first mark; a quarter; a half; the first mark; the second mark, which is twice the first. Each step has a plain name and shows the members it needs at the day's real mix.
3. **The pace: 5% a week.** The number is asked to grow 5% each week, which doubles it in about 14 weeks, so each step from the quarter up is about one season. Y Combinator's yardstick for a young company doing well is 5 to 7% a week. The page shows this week's growth against it, and each step's day both at the real pace and at 5%.
4. **The weekly goals are the four he can move:** new readers, the share who begin a trial or a plan, the share of trials that pay, the share who leave. Each week's target is his own last four weeks, bettered by 5%. Nothing is typed in, so nothing is guessed, and a target can never go stale as the pasted reports did.
5. **Three guardrails, never traded for money:** the store's rating holds, refunds stay low, and what was free stays free (the terms' own promise). A step reached while a guardrail is broken is shown as reached with that said beside it.
6. **A rhythm.** Monday: the number, its growth, and which of the four moved (the weekly brief's first lines, later). Fourteen days after each update: its line. Each month: the pace and the next step's day.

The dates of the steps come from where the number stands today, which this chat cannot read: asked of him.

## What the page works out by itself (his "auto-optimize")

The marks stay where he set them. Everything under them is worked out again from the events each time the page opens:

- **The mix:** how much of the number comes from monthly and how much from yearly, and which is growing.
- **How many more:** members still needed at today's mix, and beside it the two ends (if every new member were monthly, if every one were yearly).
- **The pace:** paying members gained less members lost, averaged over the last four weeks, and the day the next mark is reached at that pace. No day is shown before four weeks exist.
- **Churn:** of those paying 30 days ago, the share who have left, monthly and yearly apart. Renewal turned off and a failed card are shown as the early signs they are.
- **By release:** for each release (its date from `data/changelog/patches.json` to the next one's): joined, left, churn, trials that paid. This is his "keep that in mind for every update": each update gets its line, and the line under the newest fills in as days pass.
- **The one lever:** a single sentence naming which of the three moves the day most right now: more joining, fewer leaving, or more of them monthly.

The rungs already written in `lib/admin/goals.ts` (break even, the first $1,000 month) become the first steps of the same road, under his two marks, so there is always a next step that is near.

## The page (the first of the panel made the calm way)

His word is that the panel reads like a terminal. This page is where the other way begins; the rest of the panel is not part of this job.

- One number at the head, large: this week's recurring income. One line of progress under it, to the next mark, with the mark's own name.
- Three plain facts in a row: paying now (monthly and yearly), this week (joined, left), the day of arrival.
- The road: the steps in order, the reached ones quiet, the next one plain.
- By release: one line each, newest first.
- Extra (the shop) and the hourly goals below, folded.
- Words a person would say, no column names, no code, nothing in a typewriter face. Phone first, since he reads the panel on his phone.
- It is drawn first, from the panel's own pieces with sample numbers, with a reason for each choice, for his yes or no. One version.

## Where the marks live

`site_settings`, under one key, as his own named marks (a name and an amount a week each), set from two fields on the page. Not in the code, not in this repository, and changed without a release. A new mark of his own later is one more row in that list.

## After it stands (his word: "after that whole system is set")

Not in this job; each is a small piece of its own once the number is trusted: the weekly brief's first line (`lib/admin/ownerBrief.ts`), a notice to his phone when a mark is reached or the number falls for two weeks, the email list's part in it, and the smaller goals under each step.

## Order of work

1. **The measure.** Pure functions beside `plusHistory.ts`, each with tests: the period from the product's name, the number by week and by plan, the mix, churn, by release, the pace. No migration, no change to the webhook.
2. **The marks.** Read and written through an admin route, kept in `site_settings`.
3. **The page's drawing**, for his yes.
4. **The page.**
5. The fix checklist: typecheck, the unit tests, the website's build since a route is added, and the page walked at phone width.

Nothing here touches billing, a price, the webhook or a reader's screen. It ships to the main web only at his word (his word of 2026-11-23 puts everything since 1.9 with 2.0; the panel is his alone, so he may want this sooner: asked).

## Cost

In a fresh chat, started from this file, with a cap he sets. An estimate, not a measure: $25 to $40. This chat is past the 200,000 token line and should not build it.
