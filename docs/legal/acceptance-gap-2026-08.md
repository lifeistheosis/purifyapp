# The acceptance gap: accounts created in the Android app before 2026-08-02

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
