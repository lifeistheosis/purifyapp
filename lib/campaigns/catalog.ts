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

const SELECT =
  "id, creator_id, title, intention, for_whom, subject_name, note, praying_count, prayer_count, status, created_at";

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
    let query = supabase
      .from("prayer_campaigns")
      .select(SELECT)
      .neq("status", "removed")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (!opts.includeClosed) query = query.eq("status", "active");
    if (opts.intention) query = query.eq("intention", opts.intention);
    const { data, error } = await query;
    if (error) {
      console.warn("[campaigns] listCampaigns failed", error.message);
      return [];
    }
    return (data ?? []) as PrayerCampaign[];
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
    const { data, error } = await supabase
      .from("prayer_campaigns")
      .select(SELECT)
      .eq("id", id)
      .neq("status", "removed")
      .maybeSingle();
    if (error) {
      console.warn("[campaigns] getCampaign failed", error.message);
      return null;
    }
    return (data as PrayerCampaign | null) ?? null;
  } catch (e) {
    console.warn(
      "[campaigns] getCampaign threw",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}
