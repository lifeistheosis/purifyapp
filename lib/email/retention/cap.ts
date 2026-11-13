import type { SupabaseClient } from "@supabase/supabase-js";

import { pageAllIn } from "@/lib/supabase/pageAll";

import { RETENTION_KINDS } from "./kinds";

/**
 * At most two optional emails a week per reader, across every campaign.
 *
 * The arbiter's rule for these three, 2026-11-13, his "perfect" to it: "At
 * most 2 non-transactional emails a week per reader, across every campaign.
 * Nothing honest to say means no send. No fake urgency."
 *
 * "A week" is the seven days before the send, the window the library's own
 * cadence rule already uses (lib/email/campaigns.ts). "Across every
 * campaign" is why the count reads the send log for every kind of optional
 * email, not only these three: a reader who had the Sunday calendar and the
 * week in Community gets no retention email that week.
 *
 * WHAT COUNTS. Every email a reader gets because they are on a list: the
 * Sunday calendar, the monthly note, a release, the shop's two, the winback,
 * a name day, the week in Community, the shop's cart notes and these three.
 * What does not: what a reader asked for or has with us (a receipt, a
 * welcome, a notice about their membership or the terms, a support reply, a
 * back-in-stock alert they requested), which the privacy page says keeps
 * arriving because it is part of having an account.
 *
 * WHERE IT IS HELD. Every retention send obeys it (run.ts): one retention
 * email per reader per run at most, and none while the week already holds
 * two. The campaigns that came before keep their own pace (one library email
 * a week, Community on Sundays) and do not read this yet; whether they
 * should is the owner's (docs/plans/retention-emails.md).
 */

export const WEEKLY_CAP = 2;

export const CAP_WINDOW_DAYS = 7;

/** Every kind of optional email the send log holds, by the kind it is logged under. */
export const NON_TRANSACTIONAL_KINDS: readonly string[] = [
  // lib/email/campaigns.ts: the library's three and the shop's two.
  "weekly",
  "monthly",
  "release",
  "shop_new",
  "shop_feast",
  // lib/email/lifecycle.ts, nameDay.ts, communityDigest.ts.
  "winback",
  "name_day",
  "community_digest",
  // lib/shop/cartReminderSweep.ts: off unless the shop's settings turn them on.
  "cart_reminder",
  "cart_deal",
  ...RETENTION_KINDS,
];

/** How many more optional emails this week can take. Pure. */
export function roomLeft(sentThisWeek: number): number {
  return Math.max(0, WEEKLY_CAP - Math.max(0, sentThisWeek));
}

/**
 * Each reader's optional emails in the seven days before `now`: sent, or in
 * flight. A read that fails is an error and nobody is counted as having
 * room, because "nobody had anything this week" is how a cap fails open.
 */
export async function readWeekCounts(
  admin: SupabaseClient,
  userIds: readonly string[],
  now: Date,
): Promise<{ counts: Map<string, number>; error: string | null }> {
  const counts = new Map<string, number>();
  if (userIds.length === 0) return { counts, error: null };
  const since = new Date(now.getTime() - CAP_WINDOW_DAYS * 86_400_000).toISOString();
  try {
    const rows = await pageAllIn<{ user_id: string | null; dedupe_key: string }>([...new Set(userIds)], (some, from, to) =>
      admin
        .from("email_sends")
        .select("user_id, dedupe_key")
        .in("user_id", some)
        .in("kind", [...NON_TRANSACTIONAL_KINDS])
        .in("status", ["sent", "pending"])
        .gte("created_at", since)
        .order("id")
        .range(from, to),
    );
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.user_id || seen.has(r.dedupe_key)) continue;
      seen.add(r.dedupe_key);
      counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
    }
    return { counts, error: null };
  } catch (e) {
    return { counts, error: `email_sends for the weekly cap: ${(e as Error).message}` };
  }
}
