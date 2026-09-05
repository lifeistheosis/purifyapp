# Feature C: Supporter mark (Plus / Pro)

Derived from `entitlements`, no badge table, disappears at
`current_period_end` with no notice. Cosmetic only. Opt-out on /account.

## The one place the verified-badge template does not transfer

`author_verified` is maintained by triggers on `user_verification`, whose
status only changes when a row is written. Entitlements are time-based:
`plus_until` and `pro_until` lapse with no write at all, so a boolean copied
by trigger would keep badging a lapsed subscriber until something else
touched the row. A nightly cron closes that, but scheduled Actions are on the
owner's hold.

**So the denormalised columns are the expiry timestamps, not a boolean.**
`community_posts.author_plus_until` and `author_pro_until` are copied by
trigger from `entitlements` (and cleared when `profiles.show_supporter_mark`
is false); the public read path projects `author_mark: 'plus' | 'pro' | null`
by comparing them to `now()` at read time. Lapse is exact to the second, with
no job to run and nothing for a cron to miss. The columns are timestamps
about a subscription, not identities; they still never leave the projection
as raw values.

## Files

```
supabase/migrations/2026MMDD_community_author_mark.sql
  + profiles.show_supporter_mark boolean not null default true
  + community_posts.author_plus_until, author_pro_until (and the same on replies)
  + trigger community_apply_author_mark() AFTER INSERT/UPDATE/DELETE on entitlements
  + trigger on profiles (show_supporter_mark) to clear/restore
  + BEFORE INSERT trigger on community_posts and replies
  + idempotent backfill, lock_timeout/statement_timeout pragmas
app/api/community/posts/route.ts        POST_COLS + publicPost(): author_mark derived, timestamps never emitted
app/api/community/posts/[id]/replies/route.ts   same
lib/security/__tests__/publicColumnExposure.test.ts   unchanged, must still pass
components/community/SupporterMark.tsx  <SupporterMark tier="plus"|"pro" size /> mirrors VerifiedBadge's contract
components/community/CommunityClient.tsx   beside author name on posts (:936) and replies (:1074)
components/profile/ProfileSettings.tsx  toggle "Show my supporter mark"
components/mobile/YouMobile.tsx         same toggle in the You screen
app/api/account/settings/route.ts       PATCH show_supporter_mark (or profiles self-update, which RLS already allows)
lib/profile/preferences.ts              + "showSupporterMark" in PROFILE_PREFS (the allowlist warning at :24-28)
lib/i18n/messages/en.json               community.supporterMark, community.patronMark, settings.showSupporterMark
app/globals.css                         .supporter-mark* beside .verified-badge*
app/(app)/privacy/page.tsx              one line, EN and DE
```

## The glyph

A single small gold cross in a 15px box for Plus; the same cross inside a
1px icon-red ring for Pro. Drawn in-house like the verified tick (App Store
trademark risk). `role="img"` with the label from i18n, not focusable,
tooltip only on fine pointers. Light and dark variants are the existing
palette tokens, so Parchment gets a readable mark for free. No animation.

## Naming

`is_supporter` already means the pre-launch supporter (lifetime sync). The
mark is Plus. To keep the two apart in the data layer the columns and keys
say `mark`, and the visible label is whatever the owner chooses (Supporter /
Patron or Greek terms) as i18n strings. Whether the pre-launch supporters
also get the mark is an ASK in `docs/DECISIONS.md`; the plan defaults to no,
the spec says the mark is derived from Plus and Pro.

## Tests

- trigger tests as SQL fixtures are not in this repo's habit; the route
  projection is tested instead: given rows with past and future timestamps,
  `author_mark` is null / plus / pro, and the raw timestamps are absent from
  the response.
- `publicColumnExposure.test.ts` still green.
- component test: `SupporterMark` renders nothing for null, the right label
  for each tier.

## Integrity note (draft)

C1: nothing gated. C2: no new data about readers; the two timestamps are
copies of a subscription the reader already holds, and the opt-out is
disclosed. C3: lapse is silent by construction. C5: label is a copy string.
