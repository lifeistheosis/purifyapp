# Purify email funnel

Written 2026-09-12, revised the same day after reading the board's three
section bios properly rather than a flattened extraction of them.

Grounded in the repo. Every "EXISTS" line was verified by reading the code.

---

## What the board actually says

Verbatim, the three bios:

**Phase 1 | Shop**
```
Content Updates as in:

Shop Additions (New Items)
Discount Drops
(Need more ideas in this section)
```

**Phase 2 | Content Updates**
```
Content Updates as in:

Content Additions (Patch Note Releases Too)
New Saint's that will be added
Monthly Email List
Weekly Email List
```

**Phase 3 | Unique Emails Per User**
```
Unique Emails Per User as in:

TOS updates
Account News
Personalized User Updates
```

Two things follow from reading these as written, and my first draft of this
document got both wrong.

**Phase 1 is shop marketing, not shop transactional.** New items and discount
drops are promotions. I had filled Phase 1 with order confirmations and
shipping notices, which is not what it says. Those emails matter, but they are
not this phase.

**So Phases 1 and 2 are both marketing.** The consent problem below therefore
blocks two thirds of the board, not one third as I first said.

**And transactional email has no phase at all.** The receipts, the shipping
notices and the address prompt are missing from the diagram entirely, even
though five modules already send that kind of mail. That is the gap labelled
Phase 0 below.

---

## Phase 0 | Transactional

Not on the board. Should be, because it is the only part shipping today and
the only part with a hole that is actively costing money.

No consent needed. A receipt is not marketing.

| Email | Trigger | State |
|---|---|---|
| Order confirmed | webhook flips pending to paid | EXISTS, `lib/shop/orderEmails.ts` |
| Refund sent | refund issued | EXISTS, same file |
| Your {drop} is claimed | claim row created | EXISTS, `lib/eikonBox/dropEmails.ts` |
| Your EIKON Box is on its way | tracking set | EXISTS, same file |
| Seller application, store ready | seller flow | EXISTS, `lib/shop/sellerEmails.ts` |
| Support ticket replies | ticket flow | EXISTS, `lib/support/ticketEmails.ts` |
| **Your order is ready to ship** | paid, no usable address | **MISSING** |
| Shipped plus tracking, shop orders | `outbound_tracking` set | MISSING, EIKON has it, the shop does not |
| Claim window closes in 48 hours | before `claims_close_at` | MISSING |
| Abandoned checkout | session expires unpaid | MISSING, Stripe sends natively, switch it on |

**The EIKON drop announcement is transactional, not marketing.** A Plus member
paid for a monthly box. Telling them it is available is fulfilling that
contract, not promoting to them. It therefore does not need marketing consent
and must not carry an unsubscribe that would let someone accidentally opt out
of the thing they are paying for. Worth getting right, because the announce
route already exists and the instinct will be to file it under Phase 1.

---

## The blocker under Phases 1 and 2

**There is no consent record and no unsubscribe anywhere in the codebase.**
The only subscription table in `supabase/migrations` is
`20260531_push_subscriptions.sql`, which is web push. `terms_acceptances`
records signup, checkout and eikon_claim. None of those is consent to receive
marketing.

Everything sending today is transactional, which is why this has not bitten.
The moment Phase 1 sends "new items in the shop" or Phase 2 sends "here is
what we added", it is marketing, and marketing without consent and a working
unsubscribe is a CAN-SPAM violation in the US and a GDPR one in the EU.

### Foundation, before either phase sends anything

1. **`email_preferences` table.** One row per user. `user_id`,
   `shop_offers boolean default false`, `product_updates boolean default
   false`, `unsubscribe_token uuid default gen_random_uuid()`, `updated_at`.
   Self-SELECT under RLS, writes through a service-role route, same posture as
   `member_addresses`. Two separate booleans because Phase 1 and Phase 2 are
   different consents. Transactional is not a column, because it is not
   optional.
2. **`/unsubscribe/[token]`**, works with no login, one click.
3. **`List-Unsubscribe` and `List-Unsubscribe-Post` headers** on every
   marketing send. Gmail and Yahoo require them for bulk senders.
4. **Footer in `lib/email/layout.ts`** with the unsubscribe link and a postal
   address. The address is a legal requirement.
5. **Verified sending domain.** `EMAIL_FROM` still falls back to Resend's
   shared test sender. Verify purifyapp.net with SPF, DKIM and DMARC first.

---

## Phase 1 | Shop

Marketing. Consent required. This is the section that asked for more ideas.

**Read this before writing any of them: the shop has taken one order.**
One order is not a purchase history. There is nothing to segment on, no
repeat buyers and no bestsellers. Every idea below is worth building
eventually, and none of them is the reason the shop is quiet. A campaign to a
list that has bought once is not the first move. Making the second sale is.

Keeping what you had:

- **New item drops.** Triggered when a product goes from draft to published.
  Batch them: one email for a group of items, never one per item.
- **Discount drops.** Time-boxed, with the end date in the subject line.

Adding:

- **Feast-timed buying windows.** The two moments Orthodox households actually
  buy goods are the Nativity Fast, which begins 15 November, and Pascha. Two
  sends a year, planned weeks ahead, are worth more than monthly promotions
  the rest of the year.
- **Back in stock.** Per-product opt-in on a sold-out item. Highest intent
  email in retail, and it is self-segmenting: only people who asked get it.
- **Name day match.** Personalised. When a reader's patron saint has a feast
  approaching, and the shop carries that saint's icon, one email. This is
  where Phase 1 and Phase 3 meet, and it is the only genuinely Orthodox
  email idea on this list that a generic store could not send.
- **Care guide after a first purchase.** How to care for a prayer rope, how to
  treat an icon. Sends once, sells nothing, and is the highest-trust email in
  the sequence. Arguably Phase 0, since it follows a purchase.

Deliberately not recommended: "we miss you" browse-abandonment, urgency
countdowns, and anything with a fake scarcity claim. They convert, and they
would read as cheap next to devotional goods.

Subject lines:

- `New in the shop`
- `Three new pieces, in time for the Nativity Fast`
- `Back in stock: the 33-knot prayer rope`
- `St {name}'s feast is Thursday`
- `Caring for your prayer rope`

## Phase 2 | Content Updates

Marketing. Consent required. Your four items, made concrete.

**Weekly Email List.** Sent Sunday. Feasts and commemorations for the coming
seven days, from the calendar the app already computes, plus one saint and a
link into the library. Five lines and a link, not an essay.

**Monthly Email List.** Sent the 1st. What was added. Count things: "eleven
saints, two books, four hundred new verses." This is what grows the library's
perceived depth, and counting is what makes it land.

**Content Additions, including patch note releases.** On a hard push only. A
soft push gets no note and no email. The body is the patch note unchanged, in
the patch-notes voice: lead with what the reader gets, never the internals. Do
not write a second version for email.

**New saints added.** Fold this into the monthly rather than sending
separately, unless a single addition is significant enough to carry its own
send. Two emails a month about saints is one too many.

Cadence rule: nobody receives more than one Phase 2 email in a week. A monthly
or a release email replaces that week's calendar rather than stacking on it.

## Phase 3 | Unique Emails Per User

Your three items, expanded. Mostly transactional, so mostly exempt from
consent. A terms change must reach everyone regardless of preference.

**TOS updates.** Legally required, and currently missing. `terms_acceptances`
already records acceptance, so the version is known. Missing is the send.

**Account News.**

| Email | Trigger | State |
|---|---|---|
| Welcome | account created | MISSING |
| Verify email, reset password | signup, request | Supabase Auth handles |
| Plus is active | entitlement written | MISSING |
| **Payment failed** | RevenueCat or Stripe dunning | **MISSING** |
| Plus ends in three days | `pro_until` approaching | MISSING |
| Plus has ended | `pro_until` passed | MISSING |
| We deleted your account | deletion completed | MISSING |

**Payment failed is the highest-value email on this board.** Involuntary churn
that nobody is told about is money already won and then dropped. With lifetime
revenue at $24.98, recovering one failed charge beats any campaign here. Build
it before anything in Phase 1 or 2.

**Personalized User Updates.** Two that are actually possible today:

- **Name day.** A reader's patron saint's feast, the morning of. Ties to the
  Phase 1 idea above, and needs one new field: the reader's patron saint.
- **Reading streak or resumption.** `lib/campaigns/streak.ts` already exists.
  One email after a lapse, never a series.

**Winback.** One email, thirty days after a Plus lapse, never a second. Tie it
to the EIKON Box, the concrete thing a lapsed member loses.

---

## Segments

Derived, not stored, so they cannot go stale:

- `free`: account, no entitlement
- `plus_active`: `entitlements.pro_until > now()`
- `plus_lapsed`: `pro_until` exists and is past
- `shop_customer`: at least one paid `shop_orders` row (one so far)
- `eikon_claimant`: at least one `eikon_drop_claims` row

## Build order

1. **Your order is ready to ship.** Phase 0. Unblocks fulfillment, needs no
   new tables.
2. **Payment failed, and the Plus lapse sequence.** Phase 3. Recovers money
   already earned.
3. **Terms have changed.** Phase 3. Legally required.
4. **The consent foundation.** Table, unsubscribe route, headers, footer,
   verified domain.
5. **Weekly, then monthly.** Phase 2. Start with the calendar, it is the
   cheapest to produce and the easiest to keep truthful.
6. **Phase 1**, once the shop has taken a payment and there is something to
   segment on.

## One correction to make in existing code

Two live subject lines in `lib/support/ticketEmails.ts` carried em dashes,
which breaks the standing rule on user-facing copy. Done 2026-09-14: they now
read `We got your message, {num}` and `Re: your request {num}`.

## Open questions

1. Postal address for the email footer. Legally required for bulk, and it
   becomes public. Which address?
2. Does the weekly calendar email need clergy review before sending, given it
   lists commemorations? A bare listing is probably not doctrinal framing, but
   that is your call under the editorial standards, not mine.
3. Patron saint is not a field on the profile today. Adding it unlocks both
   name-day emails. Worth it, or too much for the return?

---

## Status, 2026-09-14

Built on branch `feature/email-funnel`, rebased on `main`. Two migrations,
both NOT SIGNED OFF: `20260914_email_sends.sql` and
`20260914_email_consent.sql`.

| Phase | Email | State |
|---|---|---|
| 0 | Order shipped, with tracking | Built. Sent when tracking is saved on a paid order |
| 0 | Order needs an address | Built as a safety net. All three paid orders had addresses on 2026-09-14 |
| 3 | Payment failed | Built. RevenueCat BILLING_ISSUE, all stores including Stripe |
| 3 | Plus ends in three days, Plus has ended | Built. Only when renewal is off |
| 3 | Welcome, membership active, account deleted | Built. Welcome also caught up daily for app sign-ups |
| 3 | Terms changed | Built. Admin button, everyone, once per version |
| 3 | EIKON claims close soon | Built |
| 3 | Winback | Built as MARKETING, library list only: it is a come-back email |
| 2 | Weekly calendar, monthly note, release email | Built. Review and send in the admin Email tab |
| 1 | New pieces, feast windows | Built. Review and send |
| 1 | Back in stock | Built. Requested alert, product page button |
| 1 | Care guide | Built. Daily job after delivery |
| 3 | Name day | Built. Patron saint picker on the account page |
| 1 | Discount drops | NOT built: checkout has no promotion codes, so there is nothing to announce |
| 3 | Reading resumption | NOT built: see below |

**Reading resumption is not built, on purpose.** It needs to know who stopped
reading, and the server does not know: reading happens in the reader's browser,
and the privacy page promises "No analytics joined to your account identity.
The signed-in sync data and the anonymous visit data live in different tables
and are never linked." Detecting a lapse would mean building exactly that
link. It is also the one email that crosses the ethos written into
`20260811_campaign_groups_and_streaks.sql` and `lib/push/doctrine.ts`, "the
reader asks for it or it does not happen". If it is ever wanted, it starts as a
change to the privacy promise, not as code.

**Every marketing send is held until `EMAIL_POSTAL_ADDRESS` is set.** That is
the last dependency.

---

## Status, 2026-09-15

Shipped on `main` (d833697a) and probed live. The owner signed off both
migrations and ran them by hand before the merge, which re-ran them harmlessly;
the tables are present. This supersedes the NOT SIGNED OFF line above.

Production setup, read from the dashboards on 2026-09-15:

| Piece | State |
|---|---|
| Resend domain purifyapp.net | Verified |
| RevenueCat webhook | All events, all apps, production and sandbox |
| Daily job | Wired into the existing Render cron job, below |
| `CRON_SECRET` | Set on the web service and on the cron job |
| `EMAIL_FROM` | Set on the web service (value not read) |
| `RESEND_API_KEY` | **Not set on the web service.** Nothing sends until it is |
| `EMAIL_POSTAL_ADDRESS` | Not set, so marketing stays held. The last step |

**There is no second cron job.** The Render cron job `purifyapp` already runs
every ten minutes to call hourly-goals, so its command now calls the lifecycle
route as well, in the 11:00 to 11:19 UTC window (7am Eastern in summer, 6am in
winter):

```
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://purifyapp.net/api/cron/hourly-goals && if [ "$(date -u +%H)" = "11" ] && [ "$(date -u +%M)" -lt 20 ]; then curl -fsS -H "x-cron-secret: $CRON_SECRET" https://purifyapp.net/api/cron/lifecycle; fi
```

The window catches both the 11:00 and the 11:10 runs on purpose. Render starts
a run up to a minute late, and a one-run window could miss a day. The second
call sends nothing new: every email is claimed once in `email_sends`, and
campaigns upsert on (kind, period_key). hourly-goals still runs first and a
failure there still turns the run red, as does a lifecycle run that answers 500.
The first run on this command (05:30 UTC) succeeded with no shell errors.

**While the key is missing**, every send is a logged skip, `[email]
RESEND_API_KEY unset; skipped`. The daily kinds (welcome catch-up, Plus ending,
Plus ended, claim window, order address, care guide) retake their skipped rows
on the next run, so they go out on the first 11:00 UTC run after the key lands,
as long as each is still inside its window. A send that fired once and skipped
does not come back: Render's logs show two order confirmations skipped in the
30 days before 2026-09-15.
