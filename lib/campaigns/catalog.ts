import "server-only";
import { createServerClient } from "@supabase/ssr";

import type { CampaignIntention, PrayerCampaign } from "./campaigns";

/**
 * Public reads for Prayer Campaigns. Cookie-less anon client, exactly like
 * lib/shop/catalog.ts: RLS does the filtering (only non-removed campaigns are
 * visible), the caller never needs a session, and the cookie-bound client would
 * throw in static render contexts. Fails soft to empty/null so a key-less CI
 * build and a network blip never 500 the route.
 */
function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

const BASE_COLS =
  "id, creator_id, title, intention, for_whom, subject_name, note, prayer_key, ends_at, praying_count, prayer_count, status, created_at";

/** image_url is optional until 20260725_prayer_campaign_image.sql is applied.
 *  This matters more than it looks: both readers below fail soft to []/null on
 *  any query error, so naming a column that does not exist yet would empty the
 *  entire public campaigns board with nothing but a console warning between
 *  the Render deploy and the owner running the SQL. Same retry idiom as
 *  app/api/shop/catalog/reviews/route.ts. */
const selectCols = (withImage: boolean) =>
  withImage ? `${BASE_COLS}, image_url` : BASE_COLS;

const missingImageColumn = (message: string) => /image_url/i.test(message);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ListCampaignsOptions = {
  intention?: CampaignIntention;
  /** Include answered / memory-eternal campaigns; default false (active only). */
  includeClosed?: boolean;
  limit?: number;
  offset?: number;
};

export async function listCampaigns(
  opts: ListCampaignsOptions = {},
): Promise<PrayerCampaign[]> {
  try {
    const supabase = createClient();
    const limit = Math.min(opts.limit ?? 30, 60);
    const offset = opts.offset ?? 0;
    const run = (withImage: boolean) => {
      let query = supabase
        .from("prayer_campaigns")
        .select(selectCols(withImage))
        .neq("status", "removed")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (!opts.includeClosed) query = query.eq("status", "active");
      if (opts.intention) query = query.eq("intention", opts.intention);
      return query;
    };
    let { data, error } = await run(true);
    if (error && missingImageColumn(error.message)) {
      ({ data, error } = await run(false));
    }
    if (error) {
      console.warn("[campaigns] listCampaigns failed", error.message);
      return [];
    }
    return (data ?? []) as unknown as PrayerCampaign[];
  } catch (e) {
    console.warn(
      "[campaigns] listCampaigns threw",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

export async function getCampaign(id: string): Promise<PrayerCampaign | null> {
  if (!UUID_RE.test(id)) return null;
  try {
    const supabase = createClient();
    const run = (withImage: boolean) =>
      supabase
        .from("prayer_campaigns")
        .select(selectCols(withImage))
        .eq("id", id)
        .neq("status", "removed")
        .maybeSingle();
    let { data, error } = await run(true);
    if (error && missingImageColumn(error.message)) {
      ({ data, error } = await run(false));
    }
    if (error) {
      console.warn("[campaigns] getCampaign failed", error.message);
      return null;
    }
    return (data as unknown as PrayerCampaign | null) ?? null;
  } catch (e) {
    console.warn(
      "[campaigns] getCampaign threw",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}
