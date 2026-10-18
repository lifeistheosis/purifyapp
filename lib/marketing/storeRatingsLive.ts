import "server-only";

import { CURRENT_RELEASE } from "@/lib/appUpdate/release";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  APP_REVIEWS_DEFAULT,
  STORE_LINKS,
  STORE_RATINGS_DEFAULT,
  readAppleLookup,
  readRating,
  readReviews,
  type AppReview,
  type StoreRating,
  type StoreRatings,
} from "./storeRatings";

/**
 * The live half of the store ratings (./storeRatings.ts says what is shown
 * and why): Apple's number read from its public lookup, and what the Admin
 * saved in site_settings, each kept in memory so a page never waits on
 * either for long.
 *
 * Every page on the website is rendered per request (the root layout reads
 * the locale cookie), so a read here would otherwise happen on every visit.
 * Instead each value is kept: Apple's for an hour, the Admin's for a minute.
 * When a kept value runs out, the page waits up to WAIT_MS for a fresh read
 * and then renders with what it has, the last good value or the committed
 * default, while the read finishes for the next visitor. Nothing here throws:
 * a failure falls back, quietly, to what was shown before.
 *
 * The apps' export never calls out: it has no server, and the front page's
 * website half is left out of it (app/page.tsx).
 */

/** The App Store's numeric id, from the one link the release file keeps. */
export const APP_STORE_ID = /id(\d+)/.exec(CURRENT_RELEASE.iosStoreUrl)?.[1] ?? "";

/** Apple's public lookup for Purify in the US store: averageUserRating and userRatingCount. */
export const APPLE_LOOKUP_URL = `https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=us`;

/** The Google Play listing, in English, for the Admin's "read the listing". */
export const PLAY_LISTING_URL = `${STORE_LINKS.googlePlay}&hl=en_US&gl=US`;

/** The rows this keeps in site_settings (docs/1.8-build/sql/site-settings.sql). */
export const SETTING_KEYS = { ratings: "store_ratings", reviews: "store_reviews" } as const;

const MINUTE = 60 * 1000;
/** A good answer from Apple is kept an hour; after a failed one, Apple is asked again in ten minutes. */
export const APPLE_KEEP_MS = 60 * MINUTE;
export const APPLE_RETRY_MS = 10 * MINUTE;
/** What the Admin saved is kept a minute: a change is live before the owner can open the page to look. */
export const SAVED_KEEP_MS = MINUTE;
/** How long a page waits for a fresh read before it renders with what it has. */
export const WAIT_MS = 1200;
const APPLE_TIMEOUT_MS = 4000;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Resolves when `p` settles or after `ms`, whichever is first. Never rejects. */
function within(p: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    p.then(done, done);
  });
}

// ── Apple ────────────────────────────────────────────────────────────────

let apple: { at: number; ok: boolean; value: StoreRating | null } | null = null;
let appleFlight: Promise<void> | null = null;

async function askApple(): Promise<StoreRating | null> {
  const res = await fetch(APPLE_LOOKUP_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(APPLE_TIMEOUT_MS),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return readAppleLookup(await res.json(), today());
}

function refreshApple(): Promise<void> {
  appleFlight ??= askApple()
    .catch(() => null)
    .then((value) => {
      // A failed read keeps the last good number rather than falling back.
      apple = { at: Date.now(), ok: value !== null, value: value ?? apple?.value ?? null };
    })
    .finally(() => {
      appleFlight = null;
    });
  return appleFlight;
}

/** The App Store's rating as Apple last gave it, or null when Apple has not answered yet. */
export async function appStoreRating(opts: { fresh?: boolean } = {}): Promise<StoreRating | null> {
  if (IS_STATIC_EXPORT) return null;
  const kept = apple && Date.now() - apple.at < (apple.ok ? APPLE_KEEP_MS : APPLE_RETRY_MS);
  if (opts.fresh) await refreshApple();
  else if (!kept) await within(refreshApple(), WAIT_MS);
  return apple?.value ?? null;
}

// ── What the Admin saved ─────────────────────────────────────────────────

export type SavedProof = {
  /** False until site_settings exists. */
  present: boolean;
  /** The Google Play rating typed in the Admin, or null when none is saved. */
  play: StoreRating | null;
  /** The reviews the Admin saved, in its order, or null when none are. */
  reviews: AppReview[] | null;
  /** When each row was last saved, and by whom. */
  updated: Partial<Record<keyof typeof SETTING_KEYS, { at: string; by: string | null }>>;
};

const NOTHING_SAVED: SavedProof = { present: false, play: null, reviews: null, updated: {} };

type SettingRow = { key: string; value: unknown; updated_at: string | null; updated_by_email: string | null };

/** The two rows, read now. `ok` is false when the read failed for a reason other than the table not being there. */
export async function readSavedNow(): Promise<{ ok: boolean; value: SavedProof }> {
  if (IS_STATIC_EXPORT) return { ok: true, value: NOTHING_SAVED };
  try {
    const { data, error } = await createAdminClient()
      .from("site_settings")
      .select("key, value, updated_at, updated_by_email")
      .in("key", [SETTING_KEYS.ratings, SETTING_KEYS.reviews]);
    if (error) {
      if (isTableAbsent(error)) return { ok: true, value: NOTHING_SAVED };
      console.warn("[store-ratings] settings read failed", error.message);
      return { ok: false, value: NOTHING_SAVED };
    }
    const value: SavedProof = { present: true, play: null, reviews: null, updated: {} };
    for (const row of (data ?? []) as SettingRow[]) {
      const stamp = { at: row.updated_at ?? "", by: row.updated_by_email ?? null };
      const body = row.value && typeof row.value === "object" ? (row.value as Record<string, unknown>) : {};
      if (row.key === SETTING_KEYS.ratings) {
        value.play = readRating(body.googlePlay);
        value.updated.ratings = stamp;
      } else if (row.key === SETTING_KEYS.reviews) {
        value.reviews = readReviews(body.reviews);
        value.updated.reviews = stamp;
      }
    }
    return { ok: true, value };
  } catch (e) {
    // No service key (a local check), no network: the defaults stand.
    console.warn("[store-ratings] settings read threw", (e as Error).message);
    return { ok: false, value: NOTHING_SAVED };
  }
}

let saved: { at: number; value: SavedProof } | null = null;
let savedFlight: Promise<void> | null = null;

function refreshSaved(): Promise<void> {
  savedFlight ??= readSavedNow()
    .then(({ ok, value }) => {
      // A failed read keeps what was read before, if anything was.
      saved = { at: Date.now(), value: ok || !saved ? value : saved.value };
    })
    .finally(() => {
      savedFlight = null;
    });
  return savedFlight;
}

export async function savedProof(): Promise<SavedProof> {
  if (IS_STATIC_EXPORT) return NOTHING_SAVED;
  const kept = saved && Date.now() - saved.at < SAVED_KEEP_MS;
  if (!kept) await within(refreshSaved(), WAIT_MS);
  return saved?.value ?? NOTHING_SAVED;
}

/** The Admin's save calls this, so the next page shows the new value. */
export function forgetSavedProof(): void {
  saved = null;
}

/** For tests: start from nothing kept. */
export function resetStoreRatingsMemory(): void {
  apple = null;
  appleFlight = null;
  saved = null;
  savedFlight = null;
}

// ── What the pages show ──────────────────────────────────────────────────

/** Apple's live number, the Admin's Play number, and the defaults where neither has answered. */
export async function getStoreRatings(): Promise<StoreRatings> {
  const [live, kept] = await Promise.all([appStoreRating(), savedProof()]);
  return {
    appStore: live ? { ...live, source: "live" } : STORE_RATINGS_DEFAULT.appStore,
    googlePlay: kept.play ? { ...kept.play, source: "admin" } : STORE_RATINGS_DEFAULT.googlePlay,
  };
}

/** The reviews the front page shows, in the Admin's order. */
export async function getShownReviews(): Promise<AppReview[]> {
  const kept = await savedProof();
  return (kept.reviews ?? APP_REVIEWS_DEFAULT).filter((r) => r.shown);
}

/** Everything the front page needs, read together. */
export async function getStoreProof(): Promise<{ ratings: StoreRatings; reviews: AppReview[] }> {
  const [ratings, reviews] = await Promise.all([getStoreRatings(), getShownReviews()]);
  return { ratings, reviews };
}

// ── Google Play, read once on the owner's word ───────────────────────────

/**
 * The rating and count a Google Play listing page states in its structured
 * data (the schema.org AggregateRating it carries for search engines), or
 * null. Only the Admin's "Read the listing" uses this, on a press, to fill in
 * the two fields for the owner to check and save: never a page render.
 */
export function readPlayListingHtml(html: string, day: string): StoreRating | null {
  const at = html.indexOf('"aggregateRating"');
  if (at < 0) return null;
  const open = html.indexOf("{", at);
  const close = open < 0 ? -1 : html.indexOf("}", open);
  if (open < 0 || close < 0 || close - open > 400) return null;
  try {
    const o = JSON.parse(html.slice(open, close + 1)) as Record<string, unknown>;
    return readRating({ rating: Number(o.ratingValue), count: Number(o.ratingCount), asOf: day });
  } catch {
    return null;
  }
}

export async function readPlayListing(): Promise<StoreRating | null> {
  try {
    const res = await fetch(PLAY_LISTING_URL, {
      headers: {
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return readPlayListingHtml(await res.text(), today());
  } catch {
    return null;
  }
}
