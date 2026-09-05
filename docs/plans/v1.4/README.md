# v1.4 build plans

Owner spec: "Purify v1.4 Update, Claude Code build specification" (2026-09-05).
Three features, one release branch `release/v1.4`, one PR each. These plans
are the "short written plan per feature" the spec asks for before building.
Nothing below is built yet.

- [Today's Catechism](catechism.md)
- [Study Collections](collections.md)
- [Supporter mark](supporter-mark.md)
- [Admin panel "Ledger" restyle](admin-ledger.md)
- [Shop: simple product management](shop-simple.md), audit in `docs/SHOP-AUDIT.md`. Priority before other shop work.
- Every "your call" is resolved in `docs/DECISIONS.md`, marked proposed until
  the owner reviews.

## What already exists (read before the plans)

- `entitlements` is a plain table, not a view (`supabase/migrations/20260612_entitlements.sql`).
  `getEntitlement(userId) -> { tier, active }` needs no stub: derive it from
  the row with `deriveEntitlements()` in `lib/entitlements/entitlements.ts`
  (Pro is a superset of Plus; `plus_until` / `pro_until` govern).
- Motion is hand-rolled CSS in `app/globals.css`: `--ease-house`,
  `--ease-pop`, `--duration-fast|base|slow`, `--stagger-step`, `.cascade`,
  `.onboard-step-in`, `.onboard-mark-in`. No animation library. Every
  keyframe already carries a `prefers-reduced-motion` block.
- Palettes are `html[data-reading-mode]` token blocks in `globals.css`
  applied by `components/theme/AppThemeController.tsx`, gated per palette by
  `components/reader/usePlusReadingModes.ts`. The pre-paint script in
  `app/layout.tsx:181-190` carries a hardcoded palette id list.
- The community feed already renders a denormalised `author_verified`
  boolean maintained by triggers (`20260901_community_author_verified.sql`).
  The public column guard (`lib/security/__tests__/publicColumnExposure.test.ts`)
  refuses any public read path that selects `user_id`.
- First-party analytics is `POST /api/track` with `{ sessionId, path, referrer }`
  only; `/privacy` discloses tables in prose, not from a list.
- The native app is a static export with no server. Daily data ships as a
  build-time date-keyed window (`components/today/VerseOfDayCard.tsx`,
  `WINDOW_DAYS = IS_STATIC_EXPORT ? 400 : 3`).
- `i18n:check` accepts `en`-only keys; the other 20 locales fall back.
- Migrations merged to `main` run against production. Every migration in
  these plans needs the owner's sign-off on the SQL before merge.

## Conflicts with C1 to C5 found in the existing product

The spec says the constraint wins and to stop and ask. None of these are
created by v1.4, but v1.4 lands beside them.

1. **"streak" is live copy.** `fasting.streakNone`, `fasting.streakKept.*`
   are a fasting counter, and three `ui.*` strings advertise a synced
   "prayer streak". The prayer page itself says "There are no streaks here."
   Study Collections progress will sit beside a feature that is named the
   banned word. Out of scope to rename here; flagging.
2. **"Premium" is the nav label** (`nav.premium`) and a hardcoded
   `"Purify Premium"` row in `components/mobile/YouMobile.tsx:147`. C5 bans
   the word. A rename to "Purify Plus" is a two-line change; asking whether
   it belongs in this release.
3. **"Supporter" already means something.** `entitlements.is_supporter` is
   the pre-launch supporter (lifetime sync, not Plus). The spec's Plus mark
   is also called "Supporter". The plan below names the column and the
   i18n key `patron_mark` / `community.supporterMark` so the label can be
   whatever the owner picks, but the collision in the data layer is real and
   is called out in the supporter-mark plan.

## Owner inputs still required (spec section 8)

1. Question bank JSON. Format is in `catechism.md`. Minimum 35.
2. Collection definitions (slug, name, tag, palette direction). Target 6 to 8.
3. Badge labels: Supporter / Patron, or Greek terms.
4. Confirmed: `entitlements` is a table and can be read for real. No stub.
5. Two answers to the questions in `docs/DECISIONS.md` marked ASK.
