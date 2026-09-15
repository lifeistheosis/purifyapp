import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The log of one-to-many sends (email_campaigns), and the cadence rule.
 *
 * A campaign is one decision to send: this week's calendar, this month's note,
 * the 1.4 release, a shop announcement. (kind, period_key) is unique in the
 * table, so the same week's calendar cannot be sent twice, whoever presses
 * Send; the per-reader lock is email_sends underneath.
 *
 * THE CADENCE RULE, from the board: nobody gets more than one library email a
 * week, and a monthly or release email replaces that week's calendar rather
 * than stacking on it. Held as: a reader who has had any library email in the
 * last seven days is skipped by the next one. So on a release week, send the
 * release instead of Sunday's calendar; if the calendar already went, the
 * release waits for those readers' next week.
 */

export const LIBRARY_KINDS = ["weekly", "monthly", "release"] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];

export const SHOP_KINDS = ["shop_new", "shop_feast"] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

export type CampaignKind = LibraryKind | ShopKind;

export type CampaignRow = {
  id: string;
  kind: CampaignKind;
  period_key: string;
  subject: string;
  details: Record<string, unknown>;
  recipients: number;
  sent: number;
  created_at: string;
};

/** The campaign already recorded for this period, or null. Throws when the table cannot be read. */
export async function findCampaign(
  admin: SupabaseClient,
  kind: CampaignKind,
  periodKey: string,
): Promise<CampaignRow | null> {
  const { data, error } = await admin
    .from("email_campaigns")
    .select("id, kind, period_key, subject, details, recipients, sent, created_at")
    .eq("kind", kind)
    .eq("period_key", periodKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CampaignRow | null) ?? null;
}

/** The most recent campaign of a kind, for "since last time". */
export async function latestCampaign(admin: SupabaseClient, kind: CampaignKind): Promise<CampaignRow | null> {
  const { data, error } = await admin
    .from("email_campaigns")
    .select("id, kind, period_key, subject, details, recipients, sent, created_at")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CampaignRow | null) ?? null;
}

export async function recordCampaign(
  admin: SupabaseClient,
  row: {
    kind: CampaignKind;
    periodKey: string;
    subject: string;
    bodyText: string;
    details: Record<string, unknown>;
    recipients: number;
    sent: number;
    createdByEmail: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("email_campaigns").upsert(
    {
      kind: row.kind,
      period_key: row.periodKey,
      subject: row.subject,
      body_text: row.bodyText,
      details: row.details,
      recipients: row.recipients,
      sent: row.sent,
      created_by_email: row.createdByEmail,
    },
    { onConflict: "kind,period_key" },
  );
  if (error) throw new Error(error.message);
}

/** Readers who had a library email in the last seven days: the cadence rule's skip list. */
export async function recentLibraryReaders(admin: SupabaseClient, now: Date = new Date()): Promise<Set<string>> {
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("email_sends")
    .select("user_id")
    .in("kind", [...LIBRARY_KINDS])
    .eq("status", "sent")
    .gte("created_at", since)
    .limit(20000);
  if (error) throw new Error(error.message);
  return new Set(((data ?? []) as { user_id: string | null }[]).flatMap((r) => (r.user_id ? [r.user_id] : [])));
}
