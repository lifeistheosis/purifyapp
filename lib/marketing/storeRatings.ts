// The two app stores: their links, their ratings, and the reviews the front
// page quotes. Client-safe: the phone front page, the desktop's apps section
// and the app pop-up (components/marketing/AppNudge.tsx) all read it. The
// server's live half is ./storeRatingsLive.ts.
//
// ── Ratings that stay true (1.8) ─────────────────────────────────────────
//
// The owner, 2026-10-17: "the ratings, I want that to be updated ... If you
// could do it live, that would be better ... or even better, add a custom ...
// number changer that we could just change in the back end in the admin
// panel". Until then the numbers were typed here once (2026-09-25: 5.0 from 13
// on the App Store, 5.0 from 33 on Google Play), and by October both stores
// had moved past them.
//
//   App Store: read live from Apple's public lookup on the server and kept an
//     hour (storeRatingsLive.ts).
//   Google Play: Google offers no public rating feed, so the number is typed
//     in Admin > Ratings and kept in site_settings
//     (docs/1.8-build/sql/site-settings.sql).
//   When neither has answered: the defaults below, read off both listings on
//     the day they name, and printed with that day.
//
// A rating is shown exactly as it stands: one decimal, cut and never rounded
// up (an average of 4.96 reads 4.9), with the count the store gives.
//
// ── Reviews are real, and chosen in the Admin ────────────────────────────
//
// Standing rule: no fabricated reviews. Every review below was copied on
// 2026-10-18 from its public listing: Apple's customer reviews feed for
// id6798897857 (the US store) and the Google Play listing for
// net.purifyapp.purify. Each keeps the name as the store shows it, the month
// and the stars the reviewer gave. A long one stops at the end of a sentence;
// nothing inside it is changed, spelling and capitals included. The Admin
// chooses which are shown and in what order; until it has saved a list, the
// front page shows the ones marked `shown` here.

import { CURRENT_RELEASE } from "@/lib/appUpdate/release";

export type StoreId = "appStore" | "googlePlay";

export const STORE_IDS: readonly StoreId[] = ["appStore", "googlePlay"];

export const STORE_LINKS: Record<StoreId, string> = {
  appStore: CURRENT_RELEASE.iosStoreUrl,
  googlePlay: CURRENT_RELEASE.androidStoreUrl,
};

export type StoreRating = {
  /** The average the store gives, 0 to 5. */
  rating: number;
  /** How many ratings (App Store) or reviews (Google Play) it comes from. */
  count: number;
  /** The day it was read, YYYY-MM-DD. */
  asOf: string;
};

/** Where a shown number came from: Apple's lookup, the Admin, or this file. */
export type RatingSource = "live" | "admin" | "default";

export type ShownRating = StoreRating & { source: RatingSource };

export type StoreRatings = Record<StoreId, ShownRating>;

/**
 * Read off both public listings on 2026-10-18: Apple's lookup gave an average
 * of 5 from 14 ratings, and the Google Play listing showed 5.0 from 38
 * reviews.
 */
export const STORE_RATINGS_DEFAULT: StoreRatings = {
  appStore: { rating: 5, count: 14, asOf: "2026-10-18", source: "default" },
  googlePlay: { rating: 5, count: 38, asOf: "2026-10-18", source: "default" },
};

/** One decimal, cut rather than rounded, so a number is never shown higher than it is. */
export function ratingText(rating: number): string {
  // The small allowance keeps a 4.9 that arrives as 4.8999999 at 4.9.
  const cut = Math.floor(rating * 10 + 1e-6) / 10;
  return Math.min(5, Math.max(0, cut)).toFixed(1);
}

/** The older of the two days the shown numbers were read: the honest "as of". */
export function ratingsAsOf(ratings: StoreRatings): string {
  return ratings.appStore.asOf < ratings.googlePlay.asOf ? ratings.appStore.asOf : ratings.googlePlay.asOf;
}

export type AppReview = {
  /** A stable key: the store's own review id where it has one. */
  id: string;
  store: StoreId;
  /** The name exactly as the store shows it. */
  name: string;
  /** The stars the reviewer gave, 1 to 5. */
  stars: number;
  /** The month it was written, YYYY-MM. */
  month: string;
  /** The title line an App Store review carries, when it has one. */
  title?: string;
  /** The words exactly as written, stopped only at the end of a sentence. */
  quote: string;
  /** On the front page. The Admin turns this on and off. */
  shown: boolean;
};

export const REVIEW_LIMITS = { name: 60, title: 140, quote: 600, count: 24 } as const;

export const APP_REVIEWS_DEFAULT: readonly AppReview[] = [
  {
    id: "as-14600774441",
    store: "appStore",
    name: "Gaarments",
    stars: 5,
    month: "2026-09",
    title: "Absolutely Breathtaking",
    quote:
      "Purify is an incredible app that honestly deserves a perfect 10/10 for bringing everything an Orthodox Christian needs into one quiet, beautiful space.",
    shown: true,
  },
  {
    id: "gp-163839bd",
    store: "googlePlay",
    name: "Andy Carmona",
    stars: 5,
    month: "2026-09",
    quote:
      "Really enjoying this app. An easy way to access Church history and learn about the Ecumenical Councils and the lives of the Saints.",
    shown: true,
  },
  {
    id: "as-14596349883",
    store: "appStore",
    name: "Amadeus_orthodox",
    stars: 5,
    month: "2026-09",
    title: "Best orthodox or Christian app in general",
    quote:
      "As a learning orthodox Christian, this app is so good. It has the ecumenical councils, apologetics, heresies, and A LOT more.",
    shown: true,
  },
  {
    id: "gp-29ff934f",
    store: "googlePlay",
    name: "Artem Demyda",
    stars: 5,
    month: "2026-07",
    quote: "Amazing app, accurate information and great experience! never seen so many things for Orthodox in one spot",
    shown: true,
  },
  {
    id: "as-14474978306",
    store: "appStore",
    name: "vustt",
    stars: 5,
    month: "2026-08",
    title: "Greatest app OAT",
    quote:
      "This app is so useful, it has literally everything you would need as an Orthodox Christian. The lives of the saints, their works, prayers, commentaries, and so much more.",
    shown: true,
  },
  {
    id: "gp-65d60885",
    store: "googlePlay",
    name: "Blake C",
    stars: 5,
    month: "2026-07",
    quote: "this is just a beautiful app, would recommend to pretty much everyone",
    shown: true,
  },
  {
    id: "gp-50fe5e1a",
    store: "googlePlay",
    name: "Zackery",
    stars: 5,
    month: "2026-09",
    quote: "Amazing app for the Orthodox. Very user friendly",
    shown: true,
  },
  {
    id: "gp-50aa94e7",
    store: "googlePlay",
    name: "qylie",
    stars: 5,
    month: "2026-08",
    quote: "love it! the UI is top!",
    shown: true,
  },
  {
    id: "gp-ad896fbf",
    store: "googlePlay",
    name: "gerardo lopez",
    stars: 5,
    month: "2026-07",
    quote: "awesome app, very easy to use",
    shown: true,
  },
  // Real as well, and left for the Admin to choose.
  {
    id: "as-14480879505",
    store: "appStore",
    name: "Justinisyou",
    stars: 5,
    month: "2026-08",
    title: "Great App for any Eastern Orthodox bros that need devotion and help with prayers.",
    quote: "10/10",
    shown: false,
  },
  {
    id: "gp-e96cbdf8",
    store: "googlePlay",
    name: "Anjo Ajon (AJ)",
    stars: 5,
    month: "2026-09",
    quote:
      "a perfect app for someone like me looking for ancient wisdom from early church and right preserve theological. a minimalist brief app.",
    shown: false,
  },
];

// ── Reading what was stored or sent ──────────────────────────────────────
//
// Field by field, every time, the way lib/packs reads a pack: whatever a row
// or an answer holds, only what passes is kept, and a rating that fails is
// not shown at all rather than shown wrong.

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
export const REVIEW_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isStoreId(v: unknown): v is StoreId {
  return v === "appStore" || v === "googlePlay";
}

function record(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** A rating, or null when any part of it is wrong. */
export function readRating(v: unknown): StoreRating | null {
  const o = record(v);
  if (!o) return null;
  const { rating, count, asOf } = o;
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 0 || rating > 5) return null;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > 100_000_000) return null;
  if (typeof asOf !== "string" || !DAY.test(asOf)) return null;
  return { rating, count, asOf };
}

/** Both stores' shown ratings, as /api/store-ratings answers them, or null. */
export function readStoreRatings(v: unknown): StoreRatings | null {
  const o = record(v);
  if (!o) return null;
  const out: Partial<StoreRatings> = {};
  for (const id of STORE_IDS) {
    const r = readRating(o[id]);
    if (!r) return null;
    const source = record(o[id])?.source;
    out[id] = { ...r, source: source === "live" || source === "admin" ? source : "default" };
  }
  return out as StoreRatings;
}

/** Apple's lookup answer: the first result's average and count, read today. */
export function readAppleLookup(v: unknown, today: string): StoreRating | null {
  const results = record(v)?.results;
  const first = Array.isArray(results) ? record(results[0]) : null;
  if (!first) return null;
  return readRating({ rating: first.averageUserRating, count: first.userRatingCount, asOf: today });
}

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : null;
}

/** One review, or null when any part of it is wrong. */
export function readReview(v: unknown): AppReview | null {
  const o = record(v);
  if (!o) return null;
  const { id, store, stars, month, title: givenTitle } = o;
  const name = text(o.name, REVIEW_LIMITS.name);
  const quote = text(o.quote, REVIEW_LIMITS.quote);
  if (typeof id !== "string" || !REVIEW_ID.test(id) || !isStoreId(store) || !name || !quote) return null;
  if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) return null;
  if (typeof month !== "string" || !MONTH.test(month)) return null;
  // No title, an empty one or a blank one all mean none; anything else that
  // is not a short string spoils the review.
  if (givenTitle !== undefined && givenTitle !== null && typeof givenTitle !== "string") return null;
  const title = typeof givenTitle === "string" ? givenTitle.trim() : "";
  if (title.length > REVIEW_LIMITS.title) return null;
  return {
    id,
    store,
    name,
    stars,
    month,
    ...(title ? { title } : {}),
    quote,
    shown: o.shown !== false,
  };
}

/** A stored list: the entries that pass, first of each id, at most REVIEW_LIMITS.count. Null when it is not a list. */
export function readReviews(v: unknown): AppReview[] | null {
  if (!Array.isArray(v)) return null;
  const out: AppReview[] = [];
  const seen = new Set<string>();
  for (const item of v) {
    if (out.length >= REVIEW_LIMITS.count) break;
    const r = readReview(item);
    if (r && !seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
}
