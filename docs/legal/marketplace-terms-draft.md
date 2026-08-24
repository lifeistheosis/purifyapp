# Marketplace legal, drafted for your sign-off

**Status: DRAFT. Nothing here is live.** No code reads this file. It exists so
the wording is a decision you make once rather than a thing that quietly never
happens.

Two documents are needed before a third party ships their own goods to a Purify
buyer: a correction to the buyer Terms, and a seller agreement that does not yet
exist in any form.

What breaks while this waits: a seller can be provisioned and can list, but
opening a store to the public would publish a page where Purify's own Terms tell
the buyer that Purify sourced, inspected and shipped an item Purify never
touched, and where the seller has agreed to nothing about commission, payment
timing, chargebacks, or the customer addresses they can now see.

---

## Part 1. The buyer Terms are false the moment a stranger ships

`app/(app)/terms/page.tsx`, section 6, effective 2026-08-14
(`lib/legal/version.ts`). Four passages become untrue.

### 1.1 The seller's identity

> EIKON is our online shop for Orthodox icons and devotional goods. Items are
> sourced from selected suppliers, inspected, packaged, and fulfilled by us.

Two problems. It names EIKON as "our online shop" when EIKON is one partner
store, and it tells the buyer Purify handles every item.

**Drafted replacement:**

> Purify Shop is a marketplace. Some items are sold by Purify itself; others are
> sold by independent sellers who list, price, and ship their own goods. Every
> product page and every store page names its seller. Purify operates the
> marketplace, takes payment, and holds sellers to the standards below; it is
> not the seller of an independent seller's goods and does not take title to
> them.
>
> Where a listing is sold by Purify, "we" in this section means Purify. Where it
> is sold by an independent seller, the sales contract is between you and that
> seller, and Purify acts as their limited payment agent.

### 1.2 When a sale is formed

> Placing an order is an offer to buy; a sale is formed only when we accept it
> and charge your payment method.

Purify does not accept a third party's sales.

**Drafted replacement:** keep the sentence for Purify-sold items; add that for
an independent seller's item the order is an offer to that seller, accepted when
the item is dispatched or the seller confirms it, and that Purify may still
cancel and refund any order for fraud, payment failure, or a breach of these
terms.

### 1.3 Dispatch and the repackaging claim

> Because many items are obtained from suppliers, inspected, and repackaged
> before they ship, dispatch commonly takes one to three weeks

A description of EIKON's pipeline, applied to everyone. An independent seller
shipping in two days is misdescribed, and one shipping in six weeks is too.

**Drafted replacement:** each listing shows its own dispatch window, set by its
seller; the one-to-three-week language survives only as a description of
Purify-fulfilled items.

### 1.4 Returns

> our current return and refund terms are on the store and each store page. In
> general, standard stocked items may be returned within 30 days

`shop_stores.return_policy_md` exists and renders, so per-store policies are
already structurally supported. The "30 days" needs to become the floor Purify
requires of sellers, not a description of what every store happens to offer.

### 1.5 One more, outside section 6

`components/shop/StoreClient.tsx:138,140` prints **"Inspected by hand"** and
**"30-day returns"** as literal text on *every* storefront. Those are EIKON's
claims, printed by Purify, on a stranger's page. Being fixed in code
independently of this document; noted here because it is the same untruth.

---

## Part 2. There is no seller agreement

Today a seller agrees to exactly two sentences, unversioned, recorded only as
two booleans on their application row:

> I confirm that I hold the rights to reproduce and sell every work I would
> list, and that my listings will describe production methods truthfully.

> I agree to the Purify marketplace standards: honest description, reverent
> subject matter, reliable fulfillment, and responsive communication.

Good sentences. They cover none of the things that produce a dispute.

`terms_acceptances.context` now accepts `'seller_agreement'`
(`supabase/migrations/20260824_seller_onboarding_guards.sql`), so a versioned
acceptance is recordable the moment there is a document to record. **Nothing
writes it yet.**

### What the agreement has to settle

Drafted below with your decisions already filled in where you have made them.
The blanks marked **[DECIDE]** are the ones I cannot answer for you.

#### a. Who sells, who ships

> You are the seller of your goods. You set your prices, you hold title until
> delivery, and you ship your own orders. Purify operates the marketplace and
> collects payment on your behalf. Purify does not take title to your goods and
> does not warrant them to buyers.

#### b. Commission

> Purify retains a commission on each sale, agreed with you in writing before
> your store opens and shown in your seller console. The minimum commission is
> 10% of the item total. Commission is calculated on the item total excluding
> shipping and tax.

**[DECIDE]** Does commission apply to shipping? The plan flags that the $4.99
shipping is currently credited to the seller through `total_cents` while the
cash stays with Purify. Say which it is here and the code follows.

#### c. Payment timing

> Payment for an order reaches you through Stripe once the order is marked
> delivered or **[DECIDE: N]** days after dispatch, whichever comes first.
> Purify may hold a payout while a refund request or chargeback on that order is
> open.

**[DECIDE]** N. Common is 7 to 14 days after dispatch. Shorter is friendlier to
sellers and riskier for you, and until Connect is live you are the one holding
the money.

#### d. Refunds and chargebacks (your decision: the seller absorbs them)

> A refund on your order is deducted from your balance, including any commission
> already retained on it. If a buyer disputes a charge with their bank, the
> disputed amount and the card network's dispute fee are deducted from your
> balance. Purify will provide you with the order record and any correspondence
> to answer a dispute; the outcome is the card network's.

Note the sequencing problem this creates today: until Stripe Connect is live,
every refund comes out of *Purify's* balance, not the seller's, and there is no
mechanism to recover it. That is exactly why the seller console can no longer
release refund money on its own. This clause is not enforceable in practice
until Phase 1 ships.

#### e. Customer addresses (your decision: sellers see them, under terms)

> To ship your orders you receive the buyer's name, shipping address, and order
> contents. You may use that information only to fulfil and support that order.
> You may not add a buyer to a mailing list, contact them for marketing, sell or
> share the data, or retain it longer than your tax and accounting obligations
> require. You are an independent controller of that data and are responsible
> for handling it lawfully.

**[DECIDE]** Whether the buyer's *email* is included. Currently the order row
carries it. Shipping does not require it; buyer-to-seller messaging already
exists in the console and is the safer channel.

#### f. Listings, rights, and content

Carry the two existing sentences forward verbatim, and add: Purify may remove a
listing or suspend a store for a rights complaint, an inaccurate description, or
subject matter the marketplace will not carry, and will say which.

#### g. Suspension and exit

> Either side may end this agreement with **[DECIDE: N]** days' notice. Open
> orders must be fulfilled or refunded. Purify may suspend a store immediately
> for fraud, a rights complaint, or non-fulfilment, and will pay out any balance
> not subject to an open dispute.

#### h. Versioning

> This agreement carries an effective date. A material change is notified by
> email at least **[DECIDE: N]** days before it takes effect, and continuing to
> sell after that date is acceptance.

---

## What I need from you

1. Approve or rewrite Part 1's four replacements, then bump `TERMS_VERSION` in
   `lib/legal/version.ts`.
2. Fill the five **[DECIDE]** blanks in Part 2.
3. Say whether a lawyer reads this before a stranger signs it. My drafting is
   plain-English scaffolding, not legal advice, and clause (d) in particular
   allocates real financial liability.

Once 1 and 2 are answered the mechanism is small: a versioned document page, a
gate on first console visit, and one insert into `terms_acceptances`. The
database is already ready for it.
