import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

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
};

export const NO_CONSENT: EmailPreferences = { shopOffers: false, productUpdates: false };

type Row = {
  user_id: string;
  shop_offers: boolean;
  product_updates: boolean;
  unsubscribe_token: string;
};

const COLUMNS = "user_id, shop_offers, product_updates, unsubscribe_token";

export async function readPreferences(admin: SupabaseClient, userId: string): Promise<EmailPreferences> {
  const { data, error } = await admin.from("email_preferences").select(COLUMNS).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as Row | null;
  return row ? { shopOffers: row.shop_offers, productUpdates: row.product_updates } : NO_CONSENT;
}

export async function writePreferences(
  admin: SupabaseClient,
  userId: string,
  prefs: EmailPreferences,
): Promise<EmailPreferences> {
  const { data, error } = await admin
    .from("email_preferences")
    .upsert(
      {
        user_id: userId,
        shop_offers: prefs.shopOffers,
        product_updates: prefs.productUpdates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  const row = data as Row;
  return { shopOffers: row.shop_offers, productUpdates: row.product_updates };
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
  const { data, error } = await admin
    .from("email_preferences")
    .update(patch)
    .eq("unsubscribe_token", token)
    .select("user_id");
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
