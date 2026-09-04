# v10: applying the onboarding→paywall lessons (deferred)

Context: the first-run onboarding shipped in this change deliberately leaves
monetization out, because entitlements are dark-launched
(`ENTITLEMENTS_ENFORCED = false` in `lib/entitlements/entitlements.ts`) and the
pricing page promises "the core stays forever free." When Plus enforcement
flips at v10, the "1,460 onboarding flows" lessons can be applied in Purify's
register — without the video's countdowns or fake urgency:

- **Reuse the "What draws you?" answers.** Onboarding already stores a focus
  preference (`purify:focus`, see `lib/onboarding/state.ts`). At v10, the
  paywall can speak to it: show *what Plus unlocks for you specifically* —
  curated florilegia, custom collections, ambience, future audio (already named
  on `app/(app)/pricing/page.tsx`) — rather than a generic feature wall.
- **Keep the calm "core stays forever free" framing.** The ask is for the Plus
  *layer*, never for access to Scripture, prayers, saints, or the calendar.
- **No urgency theater.** No countdown timers, no "limited spots." Social proof,
  if any, stays honest (supporter count, not invented scarcity).
- **Personalization before the ask.** The video's strongest paywall result came
  from letting users invest in a few quiz answers first; our personalize step
  already does this, so the v10 paywall should follow it, not precede it.

Implemented, 2026-08 to 2026-09. The upgrade sheet is
`components/billing/UpgradeModal.tsx` (five feature-specific pitches, the price
read from the store, nothing on a timer), the reveal is
`components/florilegium/FlorilegiumGate.tsx`, the locked toggle in
`components/history/HistoryTimelinePage.tsx` and the palette chips, the account
page's sync line is `components/profile/ProfileSyncStatus.tsx`, the copy is the
`plus.*` keys in every catalog, and the grandfather backfill is
`scripts/grandfather-plus.mjs`. The launch switches are documented in
`lib/entitlements/entitlements.ts`; flipping them and running the backfill are
the owner's. The notes below are the reasoning that shaped it.
