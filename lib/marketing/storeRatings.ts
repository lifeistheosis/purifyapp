// The two app stores, for the front page's "Take Purify with you" section.
//
// ── Ratings are a dated snapshot, on purpose ─────────────────────────────
//
// Read off both public store listings on 2026-09-25: the App Store showed
// 5.0 from 13 ratings, Google Play 5.0 from 33 reviews. Neither store offers
// a public API for this, and scraping a listing at request time would put
// someone else's page in our render path. So the numbers are typed here and
// the section prints the date beside them: a rating that drifts is then
// still true of the day it names. Update the three fields together.
//
// ── Quoted reviews are the owner's call ──────────────────────────────────
//
// Standing rule: no fabricated reviews. The listings carry real ones worth
// quoting, but putting a reader's words on a marketing page is a consent
// question, so the list below ships empty and the section shows only the
// ratings until the owner adds quotes they are happy to use. Quote exactly,
// short, first name and initial only, and keep the store and date.

import { CURRENT_RELEASE } from "@/lib/appUpdate/release";

export type StoreId = "appStore" | "googlePlay";

export const STORE_LINKS: Record<StoreId, string> = {
  appStore: CURRENT_RELEASE.iosStoreUrl,
  googlePlay: CURRENT_RELEASE.androidStoreUrl,
};

export const STORE_RATINGS = {
  /** ISO date the numbers were read off the listings. */
  asOf: "2026-09-25",
  appStore: { rating: 5.0, count: 13 },
  googlePlay: { rating: 5.0, count: 33 },
} as const;

export type AppReview = {
  /** Exactly as written on the store, trimmed only at a sentence end. */
  quote: string;
  /** First name and last initial, as the store shows it. */
  name: string;
  store: StoreId;
  /** ISO date of the review. */
  date: string;
};

/** Owner-approved quotes only. Empty renders nothing. */
export const APP_REVIEWS: readonly AppReview[] = [];
