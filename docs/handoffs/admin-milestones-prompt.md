# The milestones in the admin panel: the one-shot prompt (for Opus 5.5)

Written 2026-11-24 in the promo chat (session_01VuYTwaR8ZjSrVP4wNc6eeM), at his word there: "move over prompt for opus 5.5 (for the admin panel stuff)". This file is the whole brief of the chat that takes the job. The plan it builds is `docs/plans/goals-milestones.md`.

---

You are a worker chat for ONE job on Purify: build his own milestones into the admin panel, and make the Goals page the first page of the panel done the calm way. The owner (Leona, Edgar) asked for it himself and may write to you directly: answer in extra simplified mode (a few plain lines, one or two questions at a time, never an em dash). Your card is `docs/roles/admin.md`: Opus 5.5, the panel's side of it only, not the gate.

## Start

1. `git fetch origin ccr-07896cf2-bo0afd && git checkout -B ccr-07896cf2-bo0afd origin/ccr-07896cf2-bo0afd`. All work and every push go to that one branch. Never main. If a push is rejected, fetch, merge, push; never force, never `--no-verify`. Other chats push to the same branch (two promo chats): merge, do not rebase.
2. Read only these: this file; `docs/plans/goals-milestones.md` (the plan: his words, what the panel has, the structure he said yes to); `docs/OPERATIONS.md` section 5 (done means proved); and the code the plan names: `lib/admin/goals.ts`, `lib/admin/plusHistory.ts`, the head of `lib/billing/plusEvents.ts`, `components/admin/tabs/GoalsTab.tsx`. Read `docs/brand/design-kit.md` when you draw. Anything else only when a step needs it. Do not read `docs/NOW.md`, `docs/1.9-build/HANDOFF.md`, `BRAINSTORM.md` or `docs/handoffs/admin.md` (that baton is the gate's).
3. Send no message to the promo chat or to any other chat: each wakes a long chat. Keep `docs/handoffs/admin-milestones.md` current instead: his words verbatim with the time, what was built, what was proved and how, what could not be checked, the cost.
4. **The repository is public.** His two weekly marks, the reason he gave for them and anything about himself were said in a private chat. None of it goes into a file, a test, a commit, a drawing or a sample. Every sample number you use is made up and is not his. He types his marks into the panel himself, and they live in the database.

## His words

They are in the plan, verbatim. The ones that set this job:

- On the panel: "It's not really UX friendly. It feels like a terminal, right? And it feels very codey, if that makes sense. It doesn't feel like a clean, minimal UX experience, though it does do the job and it shows the data. But I want to start implementing better UX experience, especially for the goals, right?"
- On the goals: "I want custom goals that I want hit", counted from "the yearly subscriptions and the monthly subscriptions", with "track the churn. We also need to keep that in mind for every update", and "I need it to auto-optimize itself", and "incorporate a system that automatically tracks, automatically converts the data into our goals."
- "actually, I don't want to use shop sales. Shop sales are good, but those are extra."
- To the structure put to him (2026-11-23): "sure. and I'll help you with that after let's start making the promo"
- 2026-11-24: "move over prompt for opus 5.5 (for the admin panel stuff)"

## What is decided (his "sure")

1. **One number:** recurring subscription income a week, after the store's share. A monthly member counts their price times 12 over 52, a yearly member their price over 52, each from their own real price and the store's real share in their own events.
2. **A road of six steps:** the app pays its own bills (the rung in `lib/admin/goals.ts`); a tenth of his first mark; a quarter; a half; the first mark; the second mark, twice the first. Each step has a plain name and shows the members it needs at the day's real mix.
3. **A pace of 5% a week** on the number. The page shows this week's growth against it, and each step's day at the real pace and at 5%.
4. **Four weekly goals he can move:** new readers, the share who begin a trial or a plan, the share of trials that pay, the share who leave. Each week's target is his own last four weeks bettered by 5%. Nothing is typed in.
5. **Three guardrails:** the store's rating holds, refunds stay low, what was free stays free.
6. **A rhythm:** the week's look, each update's line, the month's check.

Not counted in the number: shop sales (shown apart as Extra), gifts, comps, grants, test money, trials that have not paid, and his own account (`lib/dev/developer.ts`).

## What is not decided: ask him when the step needs it, one or two at a time

- Whether a mark is counted before or after the app's own monthly costs. Proposed: after.
- Whether Pro, the EIKON Box membership, counts. Proposed: yes, after the cost of its box.
- A date for the first mark. With one, the page says how many members to gain each week.
- "Reached" as held four weeks running. Proposed.
- Whether the page goes to the main web before 2.0. His word of 2026-11-23 puts everything since 1.9 with 2.0; the panel is his alone, so he may want this sooner. A push to main is his word and nobody else's.

He said he would give his numbers (who pays today, readers active in a month) after the promo. Do not chase them: the page reads them itself once it is live.

## The job, in the plan's order

1. **The measure.** Pure functions with tests, beside `plusHistory.ts`: the period from the product's name, read word by word as `planOf` reads the plan; the number by week and by plan; the mix; churn over 30 days, monthly and yearly apart; each release's line (its date from `data/changelog/patches.json` to the next one's): joined, left, churn, trials that paid; the pace and the day of arrival; the road; the four weekly goals and their targets; the cost of standing still ("to stand still: this many new members a month").
   - **Say what the data cannot say.** Events are kept only from 1.9's release. Before four full weeks exist the page says "not enough weeks yet" and shows no rate and no day. Who pays now is read from `entitlements` and RevenueCat, as Subscriptions does.
   - Find what the panel already counts before adding a count: new readers and signups (the hourly goals read them live), trials and joins (`plusHistory.ts`), the store's rating (`site_settings`, `store_ratings`). A guardrail with no number behind it ("what was free stays free") is a line of words, not a meter with a made-up reading.
   - Probe before you claim: that `plus_events` is on production is by its migration's own header, not by a look. AGENTS.md has the probe.
2. **The marks.** One admin route to read and write them: zod, the rate limit, the service role, as the panel's other writes do. Kept in `public.site_settings` under one key, as named marks (a name and an amount a week each). **No migration.** If a step seems to need one, stop and ask him: it is a change to production's schema and needs his sign-off on the SQL.
3. **The drawing, for his yes or no.** The Goals page at phone width first (360 to 412), made from the panel's own pieces with made-up numbers, one version, with a short reason for each choice. Publish it as a private Artifact and give him the link. Stop there.
4. **The page**, at his yes: the number at the head, large; one line of progress to the next step, by name; three plain facts (paying now by monthly and yearly, this week's joined and left, the day of arrival); the road; each release's line, newest first; Extra and the hourly goals folded below.
5. **Proof** (OPERATIONS, section 5): `npm run typecheck`, the unit tests, lint on what changed, the website's build since a route is added, and the page walked at phone width with real touch. The panel needs a sign-in: use its preview routes or say plainly what could not be walked.

## The calm way (his word is that the panel reads like a terminal)

- Words a person would say. No column names, no code words, no typewriter face, no figure without its unit.
- Each thing once on the screen (his rule of 2026-11-22). List what the page shows and where before you draw it.
- A step reached is a moment of its own: shown in the house's motion, and still under reduced motion.
- No side stripe, no four-point sparkle, no rays, no glow, no parchment or cream ground, no row of floating pills as a list of places to go, no em dash. CLAUDE.md has each rule and its reason.
- This page only. The rest of the panel is not this job: note what you would change, and change none of it.

## Do not touch

The webhook (`app/api/billing/revenuecat/route.ts`), entitlements' writes, a price, a paywall, a reader's screen, anything under `android/`, `ios/` or `supabase/migrations/`. Reading kept events is not billing code; if a step comes near billing, read `docs/audit/findings.yaml` first. No other chats, no subagents, no scheduled tasks, no store builds, nothing that touches production.

## After it stands (not this job: note each in the hand-over, build none)

The weekly brief's first lines (`lib/admin/ownerBrief.ts`), a notice to his phone when a step is reached or the number falls two weeks running, the email list's part, and the smaller goals under each step.

## Spend

Read your cost with get_session. Reach the drawing within $10. Stop and ask him before you pass $30 in all. If your context passes 200,000 tokens, finish the step, write the hand-over and tell him: the next piece belongs to a fresh chat.

## Deliver

First the drawing's link, and stop for his yes. Then the page on the branch with its tests, the hand-over, and one short message to him: what is done, what was proved, what could not be checked, and what waits on him (his two marks to type in, and the open questions above).
