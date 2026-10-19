import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import {
  APP_REVIEWS_DEFAULT,
  MONTH,
  REVIEW_ID,
  REVIEW_LIMITS,
  STORE_LINKS,
  STORE_RATINGS_DEFAULT,
  type AppReview,
  type ShownRating,
  type StoreRating,
} from "@/lib/marketing/storeRatings";
import {
  APPLE_LOOKUP_URL,
  SETTING_KEYS,
  appStoreRating,
  forgetSavedProof,
  readPlayListing,
  readSavedNow,
  type SavedProof,
} from "@/lib/marketing/storeRatingsLive";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Admin > Ratings: what the front page says about the two stores.
 *
 * GET answers with the App Store's live reading (read fresh, so the owner
 * sees what Apple says now), the Google Play number the Admin saved, the
 * reviews in the front page's order with the hidden ones too, and whether
 * site_settings exists yet. GET ?read=play reads the Google Play listing
 * once, for the owner to check before saving: Google has no rating feed.
 *
 * POST saves either the Google Play number or the whole review list. The
 * pages keep what they read for a minute (lib/marketing/storeRatingsLive.ts),
 * and this save clears that, so the next visit shows it.
 */

export type RatingsPayload = {
  /** False until docs/1.8-build/sql/site-settings.sql has run. */
  present: boolean;
  /** False when the saved rows could not be read just now (not the same as absent). */
  readOk: boolean;
  appStore: { live: StoreRating | null; shown: ShownRating; listing: string; lookup: string };
  googlePlay: { saved: StoreRating | null; shown: ShownRating; listing: string };
  reviews: AppReview[];
  /** True when no list has been saved and `reviews` is the committed one. */
  reviewsFromDefault: boolean;
  updated: SavedProof["updated"];
};

const NOT_THERE =
  "Ratings and reviews are kept in site_settings, which docs/1.8-build/sql/site-settings.sql creates. Run it in the Supabase SQL editor; until then the front page shows the committed defaults.";

export async function GET(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (new URL(req.url).searchParams.get("read") === "play") {
    return NextResponse.json({ read: await readPlayListing() });
  }

  const [live, saved] = await Promise.all([appStoreRating({ fresh: true }), readSavedNow()]);
  const payload: RatingsPayload = {
    present: saved.value.present,
    readOk: saved.ok,
    appStore: {
      live,
      shown: live ? { ...live, source: "live" } : STORE_RATINGS_DEFAULT.appStore,
      listing: STORE_LINKS.appStore,
      lookup: APPLE_LOOKUP_URL,
    },
    googlePlay: {
      saved: saved.value.play,
      shown: saved.value.play ? { ...saved.value.play, source: "admin" } : STORE_RATINGS_DEFAULT.googlePlay,
      listing: STORE_LINKS.googlePlay,
    },
    reviews: saved.value.reviews ?? [...APP_REVIEWS_DEFAULT],
    reviewsFromDefault: saved.value.reviews === null,
    updated: saved.value.updated,
  };
  return NextResponse.json(payload);
}

/** The month a review was written cannot be after this one. */
function notLater(month: string): boolean {
  return month <= new Date().toISOString().slice(0, 7);
}

const playSchema = z.object({
  kind: z.literal("play"),
  rating: z
    .number()
    .min(0)
    .max(5)
    .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, "one decimal, as the listing shows it"),
  count: z.number().int().min(0).max(100_000_000),
});

const reviewSchema = z.object({
  id: z.string().regex(REVIEW_ID),
  store: z.enum(["appStore", "googlePlay"]),
  name: z.string().trim().min(1).max(REVIEW_LIMITS.name),
  stars: z.number().int().min(1).max(5),
  month: z.string().regex(MONTH).refine(notLater, "a month that has not come yet"),
  title: z.string().trim().max(REVIEW_LIMITS.title).optional(),
  quote: z.string().trim().min(1).max(REVIEW_LIMITS.quote),
  shown: z.boolean(),
});

const reviewsSchema = z.object({
  kind: z.literal("reviews"),
  reviews: z
    .array(reviewSchema)
    .max(REVIEW_LIMITS.count)
    .refine((list) => new Set(list.map((r) => r.id)).size === list.length, "two reviews share an id"),
});

const bodySchema = z.discriminatedUnion("kind", [playSchema, reviewsSchema]);

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid request." },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const prior = await readSavedNow();

  let key: string;
  let value: Record<string, unknown>;
  if (input.kind === "play") {
    key = SETTING_KEYS.ratings;
    value = {
      googlePlay: {
        rating: Math.round(input.rating * 10) / 10,
        count: input.count,
        asOf: new Date().toISOString().slice(0, 10),
      },
    };
  } else {
    key = SETTING_KEYS.reviews;
    value = {
      reviews: input.reviews.map((r) => ({
        id: r.id,
        store: r.store,
        name: r.name,
        stars: r.stars,
        month: r.month,
        ...(r.title ? { title: r.title } : {}),
        quote: r.quote,
        shown: r.shown,
      })),
    };
  }

  const { error } = await createAdminClient()
    .from("site_settings")
    .upsert(
      { key, value, updated_at: new Date().toISOString(), updated_by_email: adminUser.email ?? null },
      { onConflict: "key" },
    );
  if (error) {
    if (isTableAbsent(error)) return NextResponse.json({ error: NOT_THERE }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  forgetSavedProof();

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: input.kind === "play" ? "site.play_rating" : "site.store_reviews",
    entityType: "site_settings",
    entityId: key,
    // The prior value is the undo: the row itself only holds the new one.
    detail: {
      prior: input.kind === "play" ? prior.value.play : prior.value.reviews,
      next: input.kind === "play" ? value.googlePlay : { count: input.reviews.length },
    },
  });

  return NextResponse.json({ ok: true });
}
