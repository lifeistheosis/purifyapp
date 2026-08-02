# The acceptance gap: accounts created in the Android app before 2026-08-02

## Correction, 2026-08-02 (later the same day)

The diagnosis below was incomplete. It is kept because it is accurate as far
as it goes, but it explains only a quarter of the gap.

The counts came back: **41 of 878 accounts have an acceptance row.** 4.7%. The
native relative-fetch bug cannot account for that, because the website email
path always worked.

The larger cause: **acceptance was only ever recorded by the two email/password
forms. The OAuth callback recorded nothing**, so no Google sign-up had ever
produced a row, on web or native. And in the in-app onboarding flow
`<OAuthButtons />` was rendered with no consent surface at all, the checkbox
being inside the email form, so an in-app Google sign-up was never even shown
the Terms.

| Path | Asked | Recorded |
|---|---|---|
| Email, web | yes | yes (most of the 41) |
| Email, native | yes | no, fixed by the change below |
| Google, web | yes (checkbox gated the button) | **no** |
| Google, in-app onboarding | **no** | **no** |

Split of the 837: **572 post-feature** (`terms_acceptances` was created
2026-07-10) and **265 pre-feature**, which are not a failure at all, only a
period before the table existed.

Fixed in the same release: the notice moved inside `OAuthButtons` so no call
site can omit it, and the auth callback records acceptance idempotently. See
`lib/legal/serverAcceptance.ts` and
`supabase/migrations/20260802_terms_acceptance_idempotent.sql`.

## What happened

Both sign-up paths recorded the Terms clickwrap like this:

```
void fetch("/api/legal/accept", { ... }).catch(() => {});
```

Three independent reasons that recorded nothing inside the native shell:

1. **Relative path.** The Android app is a static export served from
   `https://localhost` with `app/api` stashed out of the tree by
   `scripts/android-build.mjs`. Nothing answers.
2. **Not awaited.** `void` means the sign-up proceeded regardless.
3. **Empty catch.** No error surfaced to the user, the console, or any log.

The route was also cookie-only (`createClient`) with no CORS, so even a
corrected URL would have failed for a Bearer-authenticated native caller.

**Consequence.** Accounts created through the Android app have **no row in
`terms_acceptances`**. The clickwrap checkbox still gated the button, so the
person did agree; what is missing is our server-side record that they did.

Accounts created on the website are unaffected: same-origin, so the fetch
reached the route, and the fire-and-forget only lost the rare write failure.

## What was fixed

`lib/legal/recordAcceptance.ts` records the acceptance **before**
`supabase.auth.signUp`, awaits it, and aborts sign-up if the server does not
confirm. The route now uses `createClientFromRequest`, `withCors`, and exports
`OPTIONS`.

### Why record before the account exists

The two half-states are not equally bad.

| Half-state | Assessment |
|---|---|
| Acceptance row, no account | Harmless. It records that a person at that address agreed to a stated Terms version at a stated time, which is true. No account exists for it to govern. **These rows are expected. Do not clean them up as errors.** |
| Account, no acceptance row | The state we cannot have. An account we cannot show agreed to anything. |

So a failure costs someone a second button press. It does not cost us an
unaccountable account.

## What must NOT be done about existing accounts

**Do not backfill.** Writing `terms_acceptances` rows for accounts that never
produced one would fabricate a record of an event we did not observe, dated to
a time we are guessing at. A reconstructed consent record is worse than a
missing one: a missing record is a known gap, a fabricated one is a false
statement that looks like evidence.

## What should be done

**Update, 2026-08-02.** With 837 of 878 accounts affected, this is not a
remediation cohort, it is the whole user base, and a flow built around
apologising for a bug would be the wrong shape. `TERMS_VERSION` is 2026-07-31
and genuinely recent, so the right move is a normal "our Terms were updated"
sheet shown to everyone: one tap, recorded honestly to now, no explanation of
a failure required. It collapses all three cohorts into one flow.

It must not block reading. Scripture, prayers, saints and the calendar stay
open; gate only the account-bound surfaces the Terms actually govern (sync,
shop, community). Locking someone out of the Psalms over a legal tap would be
the most out-of-character thing this app could do, and it would be our failure
charged to them.

The original framing follows.

**Re-prompt.** On next launch, an affected signed-in account should be shown
the current Terms and asked to accept, and the acceptance recorded then, dated
honestly to when it happened.

This needs product decisions that have not been made yet, and is therefore not
implemented here:

- Where it appears, and whether it blocks use of the app until accepted.
- Whether to re-prompt everyone or only accounts with no row (the latter needs
  the query below and is the narrower, kinder option).
- What copy explains it without implying the person did something wrong. They
  did not; we failed to write it down.

### Identifying the affected set

A count, not an export. Run in the Supabase SQL editor:

```sql
select count(*)
from auth.users u
where u.created_at >= '<date the Android app shipped>'
  and not exists (
    select 1 from public.terms_acceptances t
    where t.user_id = u.id or lower(t.email) = lower(u.email)
  );
```

Match on `user_id` **or** email, because email sign-ups had no session when the
acceptance was recorded, so the historic rows carry an email and a null
`user_id`.

## Scope of this record

A `terms_acceptances` row is a clickwrap acceptance of a specific
`TERMS_VERSION` at a specific time. It is:

- **not** a general GDPR consent record for processing personal data, which is
  a different question with a different lawful basis;
- **not** the checkout acceptance, which is recorded separately and
  server-side in `lib/shop/checkout.ts`.

Keep the three distinct. Describing all of them as "consent" in one bucket is
how a compliance answer becomes wrong without anyone editing it.

## Status

- Fix: shipped 2026-08-02.
- Affected-account count: **not yet run.**
- Re-prompt flow: **not built.** Owner decision required.
