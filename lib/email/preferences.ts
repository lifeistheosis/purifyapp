import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

import type { MarketingList } from "./consent";

/**
 * Reading and writing a reader's email choices (email_preferences).
 *
 * A reader with no row has chosen nothing, which means every list is off: the
 * default is the absence of consent, never the presence of it. The one thing
 * that starts on is release news, a new version of Purify a few times a year
 * (lib/email/lists.ts, RELEASE_NEWS), and the privacy page says so.
 *
 * A row used to be made the first time a reader changed a setting. Since
 * every email ends on an unsubscribe button, a row is also made the first
 * time a reader is sent anything, because that is where their token lives.
 */

export type EmailPreferences = {
  shopOffers: boolean;
  productUpdates: boolean;
  /**
   * The weekly Community email (20261005). Absent where the column is not
   * there yet, so the account screen shows the toggle only once it works.
   */
  communityDigest?: boolean;
  /**
   * A new version of Purify, a few times a year (20261011). The one choice
   * that starts on: a reader who has chosen nothing gets it, and turning it
   * off is one tap in the email or one switch here. Absent where the column
   * is not there yet.
   */
  releaseNews?: boolean;
};

export const NO_CONSENT: EmailPreferences = { shopOffers: false, productUpdates: false, communityDigest: false };

type Row = {
  user_id: string;
  shop_offers: boolean;
  product_updates: boolean;
  community_digest?: boolean;
  release_news?: boolean;
  unsubscribe_token: string;
};

/**
 * The columns, newest schema first. A server can be ahead of its database
 * for the minutes between a deploy and a migration, so every read and write
 * steps back through these until one fits, and what an older table does not
 * have is left alone.
 */
const BASE_COLUMNS = "user_id, shop_offers, product_updates, unsubscribe_token";
const COLUMN_SETS = [
  `${BASE_COLUMNS}, community_digest, release_news`,
  `${BASE_COLUMNS}, community_digest`,
  BASE_COLUMNS,
] as const;

function shape(row: Row): EmailPreferences {
  return {
    shopOffers: row.shop_offers,
    productUpdates: row.product_updates,
    ...(typeof row.community_digest === "boolean" ? { communityDigest: row.community_digest } : {}),
    ...(typeof row.release_news === "boolean" ? { releaseNews: row.release_news } : {}),
  };
}

/** What a reader with no row has: nothing they did not ask for, and the release news everyone starts with. */
function untouched(set: number): EmailPreferences {
  if (set === 0) return { ...NO_CONSENT, releaseNews: true };
  if (set === 1) return NO_CONSENT;
  return { shopOffers: false, productUpdates: false };
}

export async function readPreferences(admin: SupabaseClient, userId: string): Promise<EmailPreferences> {
  for (let set = 0; set < COLUMN_SETS.length; set++) {
    const { data, error } = await admin.from("email_preferences").select(COLUMN_SETS[set]).eq("user_id", userId).maybeSingle();
    if (error && isColumnAbsent(error) && set < COLUMN_SETS.length - 1) continue;
    if (error) throw new Error(error.message);
    const row = data as unknown as Row | null;
    return row ? shape(row) : untouched(set);
  }
  return untouched(COLUMN_SETS.length - 1);
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
  // An app from before a choice existed never sends it, and what it does not
  // send it does not change.
  const digest: Record<string, boolean> = prefs.communityDigest !== undefined ? { community_digest: prefs.communityDigest } : {};
  const release: Record<string, boolean> = prefs.releaseNews !== undefined ? { release_news: prefs.releaseNews } : {};
  const rows: Record<string, string | boolean>[] = [{ ...base, ...digest, ...release }, { ...base, ...digest }, base];
  for (let set = 0; set < COLUMN_SETS.length; set++) {
    const { data, error } = await admin
      .from("email_preferences")
      .upsert(rows[set], { onConflict: "user_id" })
      .select(COLUMN_SETS[set])
      .single();
    if (error && isColumnAbsent(error) && set < COLUMN_SETS.length - 1) continue;
    if (error) throw new Error(error.message);
    return shape(data as unknown as Row);
  }
  throw new Error("email_preferences could not be written");
}

/**
 * Turn a list off by the token an email carried, or everything that can be
 * turned off when none is named. True when a row matched. No sign-in: the
 * token is the authority, and the only thing it can do is stop email.
 */
export async function unsubscribeByToken(
  admin: SupabaseClient,
  token: string,
  list: MarketingList | "all",
): Promise<boolean> {
  const all = list === "all";
  const stamp = { updated_at: new Date().toISOString() };
  const base = {
    ...stamp,
    ...(all || list === "shop_offers" ? { shop_offers: false } : {}),
    ...(all || list === "product_updates" ? { product_updates: false } : {}),
  };
  const digest: Record<string, boolean> = all || list === "community_digest" ? { community_digest: false } : {};
  const release: Record<string, boolean> = all || list === "release_news" ? { release_news: false } : {};
  // Newest schema first, as above: a column the table does not have yet is
  // a list there is nobody on.
  const patches: Record<string, string | boolean>[] = [{ ...base, ...digest, ...release }, { ...base, ...digest }, base];
  for (let set = 0; set < patches.length; set++) {
    const { data, error } = await admin.from("email_preferences").update(patches[set]).eq("unsubscribe_token", token).select("user_id");
    if (error && isColumnAbsent(error) && set < patches.length - 1) continue;
    if (error) throw new Error(error.message);
    return (data ?? []).length > 0;
  }
  return false;
}

/**
 * A reader's unsubscribe token, made the first time it is needed.
 *
 * Until 1.5 only a reader who had changed a setting had a row, and so a
 * token. Now every email ends on an unsubscribe button, so every reader an
 * email goes to needs one. A new row is the default in every column: the
 * lists off, release news on. Making it changes nothing about what they get.
 */
export async function unsubscribeTokenFor(admin: SupabaseClient, userId: string): Promise<string | null> {
  const read = () => admin.from("email_preferences").select("unsubscribe_token").eq("user_id", userId).maybeSingle();
  let { data, error } = await read();
  if (error) throw new Error(error.message);
  if (!data) {
    const made = await admin.from("email_preferences").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
    if (made.error) throw new Error(made.error.message);
    ({ data, error } = await read());
    if (error) throw new Error(error.message);
  }
  return (data as { unsubscribe_token: string } | null)?.unsubscribe_token ?? null;
}

export type Subscriber = { userId: string; unsubscribeToken: string };

/**
 * Everyone who switched a list on, with the token their email must carry.
 *
 * Read in pages of one list, ordered by its key. Every marketing send starts
 * here, and without an order a reader who changes a setting between two
 * requests can move across the page boundary and be read twice or not at all.
 */
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
      .order("user_id")
      .range(from, from + 999);
    if (error) return { subscribers: out, error: error.message };
    const rows = (data ?? []) as { user_id: string; unsubscribe_token: string }[];
    for (const r of rows) out.push({ userId: r.user_id, unsubscribeToken: r.unsubscribe_token });
    if (rows.length < 1000) return { subscribers: out, error: null };
  }
}

/** Rows are made this many at a time: one request cannot carry every account. */
const ROW_BATCH = 500;

/**
 * Everyone a release email goes to: every account that has not said stop.
 *
 * Release news is on until a reader turns it off, so the question is not who
 * switched it on. An account with no row yet (it was made after the last
 * send, or never touched a setting) is given one first, with every default:
 * that is where its unsubscribe token comes from, and an email with no way
 * to stop it must not go. Then the list is read like any other.
 */
export async function releaseNewsReaders(
  admin: SupabaseClient,
  accountIds: readonly string[],
): Promise<{ subscribers: Subscriber[]; error: string | null }> {
  for (let from = 0; from < accountIds.length; from += ROW_BATCH) {
    const rows = accountIds.slice(from, from + ROW_BATCH).map((user_id) => ({ user_id }));
    const { error } = await admin.from("email_preferences").upsert(rows, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) return { subscribers: [], error: error.message };
  }
  return subscribersOf(admin, "release_news");
}
