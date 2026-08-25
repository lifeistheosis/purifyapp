# Onboarding a seller

How to take somebody from an application to a live storefront, and what the
system does on its own at each step. Written so seller number one can be done
without reading any code.

Nothing here needs a developer. Everything that does is in the last section.

---

## Before the first seller

Three things are switched off. All three are yours.

**1. Apply the three migrations.** `supabase/migrations/20260824_*.sql`, in
filename order. Until they apply: no seller can be paid, a duplicate seller row
takes a console down, and stock never decrements. Merging any of them to `main`
runs the DDL against production, so treat the merge as the apply.

**2. Turn on Stripe Connect, and subscribe `account.updated`.** The webhook
endpoint currently listens for `checkout.session.completed` only. Without the
second event this database never hears that Stripe cleared a seller. The seller
console works around it by re-asking Stripe on every page load, so this is
degraded rather than broken, but a store cannot go live until Stripe says it can
charge, and that answer arrives through this event.

**3. Check `RESEND_API_KEY` and `ADMIN_EMAILS` on Render.** Every email in this
runbook is a logged no-op without the first. `ADMIN_EMAILS` is who gets the
"a store is asking to open" message, and it is the same list that defines who
can reach the admin console.

---

## The path

### 1. They apply

`/shop/sell` → the form. Signed-in accounts only: an application is the start of
an accountable relationship, not an anonymous form.

**Automatic:** they get "We have your application to sell on Purify."

### 2. You review

Admin → Marketplace → Applications.

Read what they wrote about how the work is made and where it ships from. Set
the status.

- **Declined** → they get an email. **Put the reason in the note field of the
  same action**, not a separate one: the decline email includes the note from
  that request, and a decline with no reason is the version people argue with.
- **Approved** → sends nothing on purpose. Provisioning follows within minutes
  and sends its own; two near-identical emails in an hour earns a spam report.

### 3. You provision

Same panel, "Create store".

**Automatic:** a seller row, a DRAFT store, console access at `/shop/seller`,
and the email that tells them all of it exists. The response carries
`emailed: true|false`. If it is false, write to them yourself: the store still
exists, the message did not go.

Idempotent in the database. Pressing it twice does not create a second store,
but it does re-send the email.

### 4. You agree a commission

Marketplace → the store → Manage → Commission.

Percent of the goods total, never of shipping. 10% minimum. It applies to
future orders only; past orders keep the rate they were charged, frozen at the
time of sale.

**Do this before they start Stripe onboarding.** The rate shows on their Payouts
page, and asking somebody for bank details and a government ID before telling
them your cut is a bad first impression.

### 5. They set themselves up

Their console walks them through it and will not let them skip a step. In order:

1. **Store page.** Tagline, description, ships-from, returns policy. All four
   are required before they can ask you to open.
2. **Payouts.** They go to Stripe themselves; Purify never sees bank details.
   Can take a day or two to clear.
3. **Listings, saved as drafts.** Publishing is refused until the store is live.
   This is not a bug: they write everything now and it all goes live together.
4. **Ask us to open it.** The button is hidden, and the API refuses, until the
   three above are done.

They can preview their storefront at any point from the Store page. Nobody else
can see it.

### 6. They ask, you open

**Automatic:** you get "Store ready for review: <name>", with the listing count
and a link to their storefront.

Look at the storefront. Then Marketplace → the store → Store status → **live**.

The console refuses to open a third-party store until Stripe has enabled
charges, and says which step is missing. That is deliberate: without it a buyer
pays for a stranger's goods into Purify's balance with nothing to forward it.

### 7. They publish

Their console now offers it. Their drafts go public.

---

## Running it

**A refund.** The seller decides; only you can release the money. Marketplace →
Refunds. **Release refund** sends it through Stripe. **Mark processed** records
money that moved some other way. The seller gets an email when you release,
because their console promised them one.

**Pausing a store.** Marketplace → Store status → paused. Its listings leave the
shop with it.

**Suspending a seller.** Seller status → suspended locks the console and every
seller API. It does **not** close their storefront; set the store status too.

**Their money.** Under Connect, a paid order transfers to the seller minus your
commission, and Stripe pays out on its own schedule. The Earnings page shows
what they have earned, not what Stripe has sent.

---

## Things that still need a developer

Honest list, so you do not go looking for a button that is not there.

- **A dispute or a refund issued from the Stripe dashboard never reaches this
  database.** The order keeps reading paid. There is no `charge.dispute.*` or
  `charge.refunded` handler.
- **Nobody can start a refund on a paid order.** Only the buyer can open a
  request. An order you simply cannot fulfil has no exit inside the product.
- **A guest checkout cannot be refunded through the product** at all: the refund
  request route needs a signed-in buyer and a guest order has no user.
- **A paid order emails the buyer and not the seller.** They find out by looking.
- **A seller cannot tag a listing with a saint or feast,** so their work stays
  out of subject browse and the saint pages. Admin-created listings can.
- **If Stripe revokes a store's charges after it went live,** checkout silently
  falls back to a direct Purify charge with no fee row and nothing to forward.
- **Purify Pro's free shipping is paid for by the seller,** who cannot set it
  and is not told.
- **A refund does not restore stock.** A refunded one-off stays out of stock.
- **The seller console is not in the mobile app.** Web only, deliberately.

---

## If something looks wrong

Every claim in this runbook is checkable. The two that catch people out:

```bash
# Did the migrations actually apply? 401 = applied and correctly locked down.
curl -s -o /dev/null -w "%{http_code}\n" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/shop_store_payouts?select=store_id" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

```bash
# After any native build, before npm run dev, or dynamic routes 404 with HTML.
rm -rf .next
```
