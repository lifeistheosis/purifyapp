# Feature B: Study Collections

A collection is a tag with a name. Progress advances on any correct answer
in a daily catechism, never decays. Completion shows on /account for
everyone. Each collection pairs with one palette; applying the palette is a
Plus/Pro tool.

## Shape of the build

**Collections are config in the repo**, `data/catechism/collections.json`,
loaded by `lib/catechism/collections.ts`. Owner-defined; the mechanism
ships with whatever the bank supports.

**Progress is a set, not a number.** `correct_question_ids` per (user,
collection), unioned on every correct answer. Completion = every currently
published question carrying the tag is in the set, recomputed on read;
`completed_at` is written once and never cleared, so growing the bank later
cannot revoke a completion. Anonymous readers keep the same set in
localStorage and lose nothing on sign-in: the sign-in bridge pushes the local
set and the server unions it (the `lib/profile/preferences.ts` merge rule,
server fills what the device lacks).

**Themes extend the existing palette system.** Each collection theme is one
more `html[data-reading-mode="<id>"]` token block in `globals.css`, one more
entry in `READING_THEMES`, one more id in the pre-paint allowlist in
`app/layout.tsx`. Applying goes through `PUT /api/account/theme`, which
checks the entitlement server-side with `lib/entitlements/server.ts` and
writes `user_theme`; the client applies only what the server accepted and
falls back to the free palette otherwise. The existing client gate
(`usePlusReadingModes.allows`) stays the fast path; the server write is the
enforcement.

**Optional practice mode** `/catechism/collections/[slug]`: built, untimed,
free, same progress. It is the only way to finish a collection in a
reasonable time from a five-a-day quiz, and without it "Completed" is a
years-long promise.

## Files

```
lib/catechism/collections.ts       load config, progressFor(), isComplete()
lib/catechism/progressLocal.ts     localStorage set + merge on sign-in
lib/reader/readingModes.ts         + collection theme ids, still per-palette gate
app/globals.css                    + one token block per theme (brand family only)
app/layout.tsx                     + theme ids in THEME_PREPAINT allowlist
app/(app)/catechism/collections/page.tsx         list, progress, completed marks
app/(app)/catechism/collections/[slug]/page.tsx  practice mode
components/catechism/CollectionCard.tsx
components/catechism/ThemeRow.tsx  "This collection carries the X palette." one sentence + link when not entitled
components/mobile/YouMobile.tsx    quiet "Completed:" list + "You have completed N catechisms"
components/profile/ProfileSettings.tsx  same two lines on desktop
app/api/catechism/progress/route.ts     POST union (signed in)
app/api/account/theme/route.ts          PUT, entitlement enforced server-side
data/catechism/collections.json
```

## Data

```sql
collections          slug text pk, name text, description text, tag text, theme_id text, sort_order int
collection_progress  user_id uuid, slug text, correct_question_ids uuid[], completed_at timestamptz,
                     pk (user_id, slug)
user_theme           user_id uuid pk references auth.users, theme_id text, updated_at timestamptz
```
`collections` select all, service role writes (mirrored from JSON by the
import script). `collection_progress` `_self_all`. `user_theme` self select
only; the API route writes with the service role after the entitlement
check, so a client cannot grant itself a palette.

Same migration file as the catechism tables. Same NOT SIGNED OFF rule.

## Gating

`getEntitlement(userId)` is `deriveEntitlements(row, { enforced })` from
the existing module. Whether `enforced` follows the `PLUS_ENFORCED_*` flags
(all `false` in production today, so every palette is open) or is always
true for collection themes is an ASK in `docs/DECISIONS.md`. The plan
defaults to following the flags, so collection themes behave exactly like
Candlelight and Monastery until the owner flips the switch.

Free user who completes a collection sees, under the completed line: "This
collection carries the Cappadocian palette, a Purify Plus tool." with a
plain link to `/plan`. No padlock, no modal, no countdown.

## Motion

Theme application: the existing body transition is 350ms on background and
colour; extend the same transition to `--color-gold*` consumers by keeping it
on `body` and letting tokens re-map, which is what a palette switch already
does. No flash. Completion line on the final quiz screen: `.rise-in` at
`--duration-base`.

## Tests

- progress never decreases (union only), completion never revoked when the
  bank grows.
- theme PUT returns 403 for a free account with enforcement on, 200 with it
  off, 200 for Plus and Pro.
- `readingModes.test.ts` still passes: free palettes untouched.
- pre-paint allowlist test: every `READING_THEMES` id is in
  `THEME_PREPAINT`.

## Integrity note (draft)

C1: collections, progress and the "Completed" line are free. Only applying a
palette is gated, and a palette is cosmetic.
C3: progress is a set that only grows; no expiry, no decay, no renew prompt.
C5: "collection", "marks of study"; no reward or unlock.
