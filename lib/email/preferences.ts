import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

import type { MarketingList } from "./consent";

/**
 * Reading and writing a reader's email choices (email_preferences).
 *
 * A reader with no row has chosen nothing, which means both lists are off: the
 * default is the absence of consent, never the presence of it. A row is created
 * the first time they change a setting, and that is also when their unsubscribe
 * token comes into being.
 */

export type EmailPreferences = {
  shopOffers: boolean;
  productUpdates: boolean;
  /**
   * The weekly Community email (20261005). Absent where the column is not
   * there yet, so the account screen shows the toggle only once it works.
   */
  communityDigest?: boolean;
};

export const NO_CONSENT: EmailPreferences = { shopOffers: false, productUpdates: false, communityDigest: false };

type Row = {
  user_id: string;
  shop_offers: boolean;
  product_updates: boolean;
  community_digest?: boolean;
  unsubscribe_token: string;
};

const COLUMNS_BEFORE_DIGEST = "user_id, shop_offers, product_updates, unsubscribe_token";
const COLUMNS = `${COLUMNS_BEFORE_DIGEST}, community_digest`;

function shape(row: Row): EmailPreferences {
  return {
    shopOffers: row.shop_offers,
    productUpdates: row.product_updates,
    ...(typeof row.community_digest === "boolean" ? { communityDigest: row.community_digest } : {}),
  };
}

export async function readPreferences(admin: SupabaseClient, userId: string): Promise<EmailPreferences> {
  const read = (cols: string) => admin.from("email_preferences").select(cols).eq("user_id", userId).maybeSingle();
  let { data, error } = await read(COLUMNS);
  let digestKnown = true;
  if (error && isColumnAbsent(error)) {
    digestKnown = false;
    ({ data, error } = await read(COLUMNS_BEFORE_DIGEST));
  }
  if (error) throw new Error(error.message);
  const row = data as unknown as Row | null;
  if (row) return shape(row);
  return digestKnown ? NO_CONSENT : { shopOffers: false, productUpdates: false };
}

export async function writePreferences(
  admin: SupabaseClient,
  userId: string,
  prefs: EmailPreferences,
): Promise<EmailPreferences> {
  const base: Record<string, string | boolean> = {
    user_id: userId,
    shop_offers: prefs.shopOffers,
    product_updates: prefs.productUpdates,
    updated_at: new Date().toISOString(),
  };
  // An app from before the Community email sends two lists, never the third:
  // what it does not send it does not change.
  const write = (withDigest: boolean) =>
    admin
      .from("email_preferences")
      .upsert(
        withDigest && prefs.communityDigest !== undefined ? { ...base, community_digest: prefs.communityDigest } : base,
        { onConflict: "user_id" },
      )
      .select(withDigest ? COLUMNS : COLUMNS_BEFORE_DIGEST)
      .single();
  let { data, error } = await write(true);
  if (error && isColumnAbsent(error)) ({ data, error } = await write(false));
  if (error) throw new Error(error.message);
  return shape(data as unknown as Row);
}

/**
 * Turn a list off by the token an email carried, or every list when none is
 * named. True when a row matched. No sign-in: the token is the authority, and
 * the only thing it can do is stop email.
 */
export async function unsubscribeByToken(
  admin: SupabaseClient,
  token: string,
  list: MarketingList | "all",
): Promise<boolean> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (list === "all" || list === "shop_offers") patch.shop_offers = false;
  if (list === "all" || list === "product_updates") patch.product_updates = false;
  if (list === "all" || list === "community_digest") patch.community_digest = false;
  const run = (p: Record<string, unknown>) => admin.from("email_preferences").update(p).eq("unsubscribe_token", token).select("user_id");
  let { data, error } = await run(patch);
  if (error && isColumnAbsent(error)) {
    // Before 20261005 there is no Community list to leave.
    const { community_digest: _gone, ...rest } = patch;
    void _gone;
    ({ data, error } = await run(rest));
  }
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

export type Subscriber = { userId: string; unsubscribeToken: string };

/** Everyone who switched a list on, with the token their email must carry. */
export async function subscribersOf(
  admin: SupabaseClient,
  list: MarketingList,
): Promise<{ subscribers: Subscriber[]; error: string | null }> {
  const out: Subscriber[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("email_preferences")
      .select("user_id, unsubscribe_token")
      .eq(list, true)
      .range(from, from + 999);
    if (error) return { subscribers: out, error: error.message };
    const rows = (data ?? []) as { user_id: string; unsubscribe_token: string }[];
    for (const r of rows) out.push({ userId: r.user_id, unsubscribeToken: r.unsubscribe_token });
    if (rows.length < 1000) return { subscribers: out, error: null };
  }
}
