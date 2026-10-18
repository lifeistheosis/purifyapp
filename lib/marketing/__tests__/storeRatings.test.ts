import { describe, expect, it } from "vitest";

import {
  APP_REVIEWS_DEFAULT,
  REVIEW_LIMITS,
  STORE_RATINGS_DEFAULT,
  ratingText,
  ratingsAsOf,
  readAppleLookup,
  readRating,
  readReview,
  readReviews,
  readStoreRatings,
  type AppReview,
} from "../storeRatings";

/**
 * The front page's store ratings and reviews (1.8). The rules under test are
 * the owner's and the house's: a number is shown exactly as it stands, never
 * rounded up; only real reviews, each with its store, name, month and stars;
 * and whatever a stored row or an answer holds, only what passes is shown.
 */

describe("a rating, as shown", () => {
  it("is cut to one decimal, never rounded up", () => {
    expect(ratingText(5)).toBe("5.0");
    expect(ratingText(4.96)).toBe("4.9");
    expect(ratingText(4.94)).toBe("4.9");
    expect(ratingText(4.05)).toBe("4.0");
    expect(ratingText(0)).toBe("0.0");
  });

  it("keeps a 4.9 that arrives as 4.8999999 at 4.9", () => {
    expect(ratingText(4.8999999)).toBe("4.9");
    expect(ratingText(0.1 + 0.2 + 4.6)).toBe("4.9");
  });

  it("says the older of the two days the numbers were read", () => {
    const r = {
      appStore: { ...STORE_RATINGS_DEFAULT.appStore, asOf: "2026-11-02" },
      googlePlay: { ...STORE_RATINGS_DEFAULT.googlePlay, asOf: "2026-10-30" },
    };
    expect(ratingsAsOf(r)).toBe("2026-10-30");
    expect(ratingsAsOf({ ...r, appStore: { ...r.appStore, asOf: "2026-10-01" } })).toBe("2026-10-01");
  });
});

describe("reading a rating", () => {
  it("takes a whole one", () => {
    expect(readRating({ rating: 4.9, count: 38, asOf: "2026-10-18" })).toEqual({ rating: 4.9, count: 38, asOf: "2026-10-18" });
    expect(readRating({ rating: 0, count: 0, asOf: "2026-10-18" })).not.toBeNull();
  });

  it("refuses any part that is wrong", () => {
    const good = { rating: 5, count: 14, asOf: "2026-10-18" };
    expect(readRating({ ...good, rating: 5.1 })).toBeNull();
    expect(readRating({ ...good, rating: -0.1 })).toBeNull();
    expect(readRating({ ...good, rating: Number.NaN })).toBeNull();
    expect(readRating({ ...good, rating: "5" })).toBeNull();
    expect(readRating({ ...good, count: 14.5 })).toBeNull();
    expect(readRating({ ...good, count: -1 })).toBeNull();
    expect(readRating({ ...good, asOf: "18 October" })).toBeNull();
    expect(readRating({ ...good, asOf: "2026-13-01" })).toBeNull();
    expect(readRating(null)).toBeNull();
    expect(readRating([good])).toBeNull();
  });

  it("reads both stores from the public answer, or neither", () => {
    const answer = {
      appStore: { rating: 5, count: 15, asOf: "2026-10-19", source: "live" },
      googlePlay: { rating: 4.9, count: 40, asOf: "2026-10-18", source: "admin" },
    };
    expect(readStoreRatings(answer)).toEqual(answer);
    expect(readStoreRatings({ ...answer, googlePlay: { ...answer.googlePlay, source: "made up" } })?.googlePlay.source).toBe(
      "default",
    );
    expect(readStoreRatings({ appStore: answer.appStore })).toBeNull();
    expect(readStoreRatings({ ...answer, appStore: { ...answer.appStore, count: "15" } })).toBeNull();
  });

  it("reads Apple's lookup the way Apple answers it", () => {
    // The shape of https://itunes.apple.com/lookup?id=6798897857 on 2026-10-18,
    // trimmed to the fields that matter.
    const apple = {
      resultCount: 1,
      results: [
        {
          trackName: "Purify: Orthodox Hub",
          averageUserRating: 5,
          userRatingCount: 14,
          averageUserRatingForCurrentVersion: 5,
          userRatingCountForCurrentVersion: 14,
        },
      ],
    };
    expect(readAppleLookup(apple, "2026-10-18")).toEqual({ rating: 5, count: 14, asOf: "2026-10-18" });
    expect(readAppleLookup({ resultCount: 0, results: [] }, "2026-10-18")).toBeNull();
    expect(readAppleLookup({ results: [{ averageUserRating: 4.7 }] }, "2026-10-18")).toBeNull();
    expect(readAppleLookup("<html>", "2026-10-18")).toBeNull();
  });
});

describe("reading the reviews", () => {
  const one: AppReview = {
    id: "gp-test",
    store: "googlePlay",
    name: "A Reader",
    stars: 5,
    month: "2026-09",
    quote: "Words.",
    shown: true,
  };

  it("keeps a whole review, and a blank title means none", () => {
    expect(readReview(one)).toEqual(one);
    expect(readReview({ ...one, title: "   " })).toEqual(one);
    expect(readReview({ ...one, title: "A title" })).toEqual({ ...one, title: "A title" });
    expect(readReview({ ...one, shown: undefined })?.shown).toBe(true);
    expect(readReview({ ...one, shown: false })?.shown).toBe(false);
  });

  it("refuses a review with any part wrong", () => {
    expect(readReview({ ...one, store: "amazon" })).toBeNull();
    expect(readReview({ ...one, stars: 6 })).toBeNull();
    expect(readReview({ ...one, stars: 4.5 })).toBeNull();
    expect(readReview({ ...one, month: "2026-9" })).toBeNull();
    expect(readReview({ ...one, name: "" })).toBeNull();
    expect(readReview({ ...one, quote: "x".repeat(REVIEW_LIMITS.quote + 1) })).toBeNull();
    expect(readReview({ ...one, title: 7 })).toBeNull();
    expect(readReview({ ...one, id: "Has Spaces" })).toBeNull();
  });

  it("keeps the good ones of a list, the first of each id, and no more than the row holds", () => {
    const list = [one, { ...one, stars: 0 }, { ...one, quote: "A second with the same id." }, { ...one, id: "gp-two" }];
    expect(readReviews(list)?.map((r) => r.id)).toEqual(["gp-test", "gp-two"]);
    const many = Array.from({ length: REVIEW_LIMITS.count + 5 }, (_, i) => ({ ...one, id: `gp-${i}` }));
    expect(readReviews(many)).toHaveLength(REVIEW_LIMITS.count);
    expect(readReviews({ reviews: [one] })).toBeNull();
  });
});

describe("the committed defaults", () => {
  it("are numbers the reader can trust", () => {
    expect(readStoreRatings(STORE_RATINGS_DEFAULT)).toEqual(STORE_RATINGS_DEFAULT);
    expect(STORE_RATINGS_DEFAULT.appStore.source).toBe("default");
    expect(STORE_RATINGS_DEFAULT.googlePlay.source).toBe("default");
  });

  it("are every one a whole review, read back unchanged", () => {
    expect(readReviews([...APP_REVIEWS_DEFAULT])).toEqual(APP_REVIEWS_DEFAULT);
    expect(new Set(APP_REVIEWS_DEFAULT.map((r) => r.id)).size).toBe(APP_REVIEWS_DEFAULT.length);
  });

  it("show a row worth swiping, from both stores", () => {
    const shown = APP_REVIEWS_DEFAULT.filter((r) => r.shown);
    expect(shown.length).toBeGreaterThanOrEqual(4);
    expect(new Set(shown.map((r) => r.store))).toEqual(new Set(["appStore", "googlePlay"]));
  });

  it("were all written before they were read off the listings", () => {
    for (const r of APP_REVIEWS_DEFAULT) expect(r.month <= "2026-10", r.id).toBe(true);
  });

  it("carry the store's own id, so each can be found on its listing", () => {
    for (const r of APP_REVIEWS_DEFAULT) {
      expect(r.id, r.name).toMatch(r.store === "appStore" ? /^as-\d{8,}$/ : /^gp-[0-9a-f]{8}$/);
    }
  });

  it("carry no em dash and nothing marked as a sample", () => {
    for (const r of APP_REVIEWS_DEFAULT) {
      const all = [r.name, r.title ?? "", r.quote].join(" ");
      expect(all.includes(String.fromCharCode(0x2014)), r.id).toBe(false);
      expect(all, r.id).not.toMatch(/\bsample\b|lorem ipsum/i);
    }
  });
});
