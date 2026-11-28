# The goal: $5,000 unspent by the end of February 2027

His words, 2026-11-28 about 04:05 UTC: "we have a new major goal. 5k in 3 months." Asked which 5k, he answered: "5k total unspent". Read as: $5,000 of cash in the bank, after costs, by about 28 February 2027.

A plan for his yes. Nothing here is built or priced without his word (pricing and terms are his, AGENTS.md "Stop conditions").

## Where it starts (live, `node scripts/owner-report.mjs`, 2026-11-28 04:05 UTC)

- **Money in:** MRR $198 from 20 paying members (19 in the digest), $333 revenue in 28 days. That is about $283 net after the stores' 15%. Shop: one order, $35, in 30 days.
- **Money out:** running costs $347 a month (the typed cost lines, Claude's $200 among them). Plus covers 54% of them. **Purify spends about $60 a month more than it earns.**
- **The bank:** Mercury shows $0.32, one Google Play payout, in the last 30 days. Where the stores' money lands has to be settled first, or the goal cannot be counted.
- **Funnel:** 3,639 accounts, 824 new in 30 days but 115 this week (down 40%). 5 trials, and 5 of the 20 members set to end.

## The arithmetic

- $5,000 unspent plus about $1,040 of costs (three months at $347) means **about $6,000 net must land in the bank by 28 February**.
- **Store money arrives late.** Google Play pays around the 15th of the next month, and Apple within 45 days of the end of its month. So what the stores earn after about the end of January lands after the deadline. Store sales count only if they happen in December and January. Web sales through Stripe land in about two days and count right up to the end.
- At today's rate, about $600 of the $6,000 arrives. **Today's subscriptions alone will not reach it.** It is reachable only with cash paid up front (a year, or for life), sold in December and January, while the costs stay flat.
- **Honest odds: low to moderate.** The scenario below reaches it only if almost every lever lands.

| Lever | When the cash lands | A plausible result | Risk |
|---|---|---|---|
| **Founding membership, Plus for life:** one premium price, capped, framed as founding rather than a discount | Web: days. Stores: 2 to 6 weeks | 25 at about $135 net = $3,400 | Gives up future monthly revenue; must look premium, never cheap |
| **A year of Plus as a Christmas gift**, sold on the web. Two Christmases (25 December and 7 January) make a long gifting window. Reuses EIKON's gift claim (`/gift`) | Days (Stripe) | 20 at about $55 net = $1,100 | Must ship by about 10 December to matter |
| **Recurring growth:** 2.0's account step, trials into members, keeping the five set to end | Stores, with the lag | About $900 in the window | Most of the gain lands after February |
| **EIKON at Christmas:** the promo edits point to the shop | Days (Stripe) | About $400 margin (his margin figures needed) | The margin is unknown |
| **Founding patrons:** one-time support, names in Credits | Days (Stripe) | About $500 | Not tax-deductible (Purify is a company): must be said plainly. Can read as begging if framed poorly |
| **Costs held flat:** no paid ads, Supabase's egress fixed rather than paid for | | Keeps the $1,040 from growing | Supabase's grace ends 11 December |

Scenario total: about $6,300 in, minus $1,040 = **about $5,260 unspent**. It needs every row.

## The first moves, this week, each at his yes

1. **Settle where the money lands.** His answer, 2026-11-28: "Google plays payouts I still in transit and apple is still switching to developer". So:
   - **Google Play** pays to Mercury; the payout is on its way. It counts the day it lands.
   - **Apple** pays nothing until the developer account's switch is done. What Apple earns is held, not lost. But December's Apple sales reach Mercury by 28 February only if the switch is finished by about mid-January (Apple pays within 45 days of the end of its month). Later than that, Apple's money misses the deadline. So **the web (Stripe) goes first** for the founding membership and the gift.
   - **The same Apple account** (his word, 2026-11-28: "nope just the same apple account"), turning into the company's. No app transfer, so the iPhone app can still be updated and RevenueCat's keys stay as they are. Payouts resume once the account's agreements, bank and tax forms are accepted. The terms and the privacy page already name Purify Orthodox LLC (`lib/legal/entity.ts`), so the seller and the legal pages will match.
   - Then set the goal on the Goals tab: "5k unspent", $5,000, by 28 February. Mercury today: $0.32.
2. **The founding membership** (his call: price, cap, stores and web, the terms' line): the strongest single lever. It was already open as "a lifetime price".
3. **The Christmas gift of Plus on the web:** drawn and said yes to, then **built 2026-11-28 at $59.99** (his word: "yes build the gift page at 59.99"; commit `c06356a4`). To be live by about 10 December it needs three things from him: his yes to the table's SQL (`supabase/migrations/20261128080347_gift_cards.sql`); the gift alone to the main web ahead of 2.0 (a deploy, his word); and Stripe Tax on or off.
4. **Christmas edits** pointing to the gift and EIKON (he posts).
5. **Stop the leaks** (cheap): his note to the five set to end, and a reminder before a trial ends.
6. **No new spending** unless it pays back before 28 February.

## What this changes in 2.0

The date matters more now. The account step in the apps roughly doubles sign-ups (2.7% to 5.5%), and its cash lands about a month after the release. Shipping 2.0 in December rather than February is worth more than any feature added to it (`docs/plans/v2.0/SCOPE.md`, the cut line, his call).
