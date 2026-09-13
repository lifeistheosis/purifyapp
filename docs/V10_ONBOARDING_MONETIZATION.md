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

No code now. This is a pointer for the v10 monetization work.
