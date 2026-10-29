// The stores' own reviews on the Plus paywall (1.8, the owner's second round:
// "add every single thing we left out"). Two or three, quiet, after the
// features and before the plans, each with its stars, its name and its store
// (components/billing/KeptPaywall.tsx, PlusReviews).
//
// Only from lib/marketing/storeRatings.ts APP_REVIEWS_DEFAULT: copied word for
// word from the two public listings on 2026-10-18, each name as its store
// shows it, the ones marked `shown` being the ones chosen in Admin > Ratings.
// The paywall quotes the first of those, in the list's own order, and changes
// nothing in them: not a word, not a capital, not a name. Every one was
// written in English, and a quotation stays in the words it was written in,
// whatever language the reader has chosen.
//
// The committed list, not the Admin's saved copy of it: the apps draw the
// paywall from their bundle with no server to ask, and the sheet and the
// website say what the apps say.
//
// Pure: the tests read it under node.

import { APP_REVIEWS_DEFAULT, type AppReview } from "@/lib/marketing/storeRatings";

/** Two or three, so the reviews stay quiet beside the features. */
export const PAYWALL_REVIEW_COUNT = 3;

/** The reviews the paywall quotes, exactly as the list holds them. */
export function paywallReviews(list: readonly AppReview[] = APP_REVIEWS_DEFAULT): readonly AppReview[] {
  return list.filter((r) => r.shown).slice(0, PAYWALL_REVIEW_COUNT);
}
