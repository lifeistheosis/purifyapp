import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The live half of the store ratings: Apple's number read on the server and
 * the Admin's saved rows, each kept, each falling back quietly. No network
 * and no database here: fetch and the service client are stood in for.
 */

type Rows = { data: unknown; error: { code?: string; message?: string } | null };
let rows: Rows = { data: [], error: null };
let reads = 0;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        in: async () => {
          reads += 1;
          if (table !== "site_settings") throw new Error(`unexpected table ${table}`);
          return rows;
        },
      }),
    }),
  }),
}));

const live = await import("../storeRatingsLive");
const { APP_REVIEWS_DEFAULT, STORE_RATINGS_DEFAULT } = await import("../storeRatings");

const appleAnswer = (rating: number, count: number) =>
  new Response(JSON.stringify({ resultCount: 1, results: [{ averageUserRating: rating, userRatingCount: count }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  live.resetStoreRatingsMemory();
  rows = { data: [], error: null };
  reads = 0;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the App Store's number", () => {
  it("is Apple's when Apple answers, read from the public lookup", async () => {
    const fetchMock = vi.fn(async () => appleAnswer(4.92, 15));
    vi.stubGlobal("fetch", fetchMock);
    const r = await live.getStoreRatings();
    expect(r.appStore).toMatchObject({ rating: 4.92, count: 15, source: "live" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://itunes.apple.com/lookup?id=6798897857&country=us");
  });

  it("is asked for once an hour, not on every visit", async () => {
    const fetchMock = vi.fn(async () => appleAnswer(5, 14));
    vi.stubGlobal("fetch", fetchMock);
    await live.getStoreRatings();
    await live.getStoreRatings();
    await live.getStoreRatings();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the committed number when Apple fails, quietly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const r = await live.getStoreRatings();
    expect(r.appStore).toEqual(STORE_RATINGS_DEFAULT.appStore);
  });

  it("falls back when Apple answers with something that is not a rating", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>busy</html>", { status: 503 })));
    expect((await live.getStoreRatings()).appStore.source).toBe("default");
    live.resetStoreRatingsMemory();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ resultCount: 0, results: [] }), { status: 200 })));
    expect((await live.getStoreRatings()).appStore.source).toBe("default");
  });

  it("keeps the last good number when a later read fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => appleAnswer(5, 16)));
    await live.appStoreRating({ fresh: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    expect(await live.appStoreRating({ fresh: true })).toMatchObject({ rating: 5, count: 16 });
  });

  it("does not hold a page for a slow Apple, and is there for the next visit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => setTimeout(() => resolve(appleAnswer(5, 17)), live.WAIT_MS + 150))),
    );
    const started = Date.now();
    const first = await live.getStoreRatings();
    expect(Date.now() - started).toBeLessThan(live.WAIT_MS + 120);
    expect(first.appStore.source).toBe("default");
    await new Promise((resolve) => setTimeout(resolve, 250));
    const next = await live.getStoreRatings();
    expect(next.appStore).toMatchObject({ count: 17, source: "live" });
  });
});

describe("what the Admin saved", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("no network in tests");
      }),
    );
  });

  it("stands in for nothing until the table exists: the defaults show", async () => {
    rows = { data: null, error: { code: "PGRST205", message: "Could not find the table 'public.site_settings' in the schema cache" } };
    const now = await live.readSavedNow();
    expect(now).toEqual({ ok: true, value: { present: false, play: null, reviews: null, updated: {} } });
    const proof = await live.getStoreProof();
    expect(proof.ratings.googlePlay).toEqual(STORE_RATINGS_DEFAULT.googlePlay);
    expect(proof.reviews).toEqual(APP_REVIEWS_DEFAULT.filter((r) => r.shown));
  });

  it("shows the saved Google Play number and the saved row, the shown ones in order", async () => {
    rows = {
      data: [
        {
          key: "store_ratings",
          value: { googlePlay: { rating: 4.9, count: 41, asOf: "2026-10-20" } },
          updated_at: "2026-10-20T10:00:00Z",
          updated_by_email: "owner@example.com",
        },
        {
          key: "store_reviews",
          value: {
            reviews: [
              { id: "gp-b", store: "googlePlay", name: "B", stars: 5, month: "2026-09", quote: "Second.", shown: true },
              { id: "gp-a", store: "googlePlay", name: "A", stars: 5, month: "2026-08", quote: "Hidden.", shown: false },
              { id: "as-1", store: "appStore", name: "C", stars: 4, month: "2026-07", quote: "Third.", shown: true },
              { id: "broken", store: "appStore", name: "", stars: 9, month: "x", quote: "", shown: true },
            ],
          },
          updated_at: "2026-10-20T10:05:00Z",
          updated_by_email: "owner@example.com",
        },
      ],
      error: null,
    };
    const proof = await live.getStoreProof();
    expect(proof.ratings.googlePlay).toEqual({ rating: 4.9, count: 41, asOf: "2026-10-20", source: "admin" });
    expect(proof.reviews.map((r) => r.id)).toEqual(["gp-b", "as-1"]);
  });

  it("is read once a minute at most, and again at once after a save", async () => {
    rows = { data: [], error: null };
    await live.getStoreProof();
    await live.getStoreProof();
    expect(reads).toBe(1);
    live.forgetSavedProof();
    await live.getStoreProof();
    expect(reads).toBe(2);
  });

  it("keeps what it read last when a later read fails", async () => {
    rows = {
      data: [{ key: "store_ratings", value: { googlePlay: { rating: 4.8, count: 50, asOf: "2026-10-21" } }, updated_at: null, updated_by_email: null }],
      error: null,
    };
    const t0 = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(t0);
    expect((await live.getStoreRatings()).googlePlay).toMatchObject({ count: 50, source: "admin" });
    // A minute on, the kept value has run out and the next read fails.
    clock.mockReturnValue(t0 + live.SAVED_KEEP_MS + 1000);
    rows = { data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } };
    expect((await live.getStoreRatings()).googlePlay).toMatchObject({ count: 50, source: "admin" });
    expect(reads).toBe(2);
  });
});

describe("the Google Play listing, read on the owner's press", () => {
  it("gives the rating and count its structured data states", () => {
    const html =
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Purify: Orthodox Hub",' +
      '"aggregateRating":{"@type":"AggregateRating","ratingValue":"5","ratingCount":"38"}}</script>';
    expect(live.readPlayListingHtml(html, "2026-10-18")).toEqual({ rating: 5, count: 38, asOf: "2026-10-18" });
  });

  it("gives nothing when the page does not say", () => {
    expect(live.readPlayListingHtml("<html><body>Sign in</body></html>", "2026-10-18")).toBeNull();
    expect(
      live.readPlayListingHtml('"aggregateRating":{"@type":"AggregateRating","ratingValue":"lots","ratingCount":"38"}', "2026-10-18"),
    ).toBeNull();
  });
});
