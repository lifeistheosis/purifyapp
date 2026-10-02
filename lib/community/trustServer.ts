import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin/access";

import { TRUST_LIMITS, trustLevel, type TrustFacts, type TrustLevel, type TrustLimits } from "./trust";

// Reading what lib/community/trust.ts decides on. Service role: the counts
// cross rows nobody else may read, and none of them leaves the server.

const DAY = 24 * 60 * 60 * 1000;

/** The badges that make someone part of moderation. */
export const STAFF_BADGES = ["team", "moderator"] as const;

/** On the team, a moderator, or an admin by email. */
export async function isStaff(admin: SupabaseClient, user: Pick<User, "id" | "email">): Promise<boolean> {
  if (isAdminEmail(user.email)) return true;
  const { data, error } = await admin
    .from("user_badges")
    .select("badge")
    .eq("user_id", user.id)
    .in("badge", [...STAFF_BADGES])
    .limit(1);
  return !error && (data ?? []).length > 0;
}

/** The staff among some accounts, by badge (an admin email is not known here). */
export async function staffAmong(admin: SupabaseClient, ids: readonly string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await admin.from("user_badges").select("user_id").in("user_id", [...ids]).in("badge", [...STAFF_BADGES]);
  if (error) return new Set();
  return new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id));
}

export type Trust = { level: TrustLevel; limits: TrustLimits; facts: TrustFacts };

async function headCount(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count, error } = await query;
  return error ? 0 : (count ?? 0);
}

/**
 * Where a reader stands. Never throws: if a count cannot be read, it reads
 * as zero, which errs toward the reader (no removals) rather than locking
 * them out for an outage.
 */
export async function readTrust(
  admin: SupabaseClient,
  user: Pick<User, "id" | "email" | "created_at">,
  now: number = Date.now(),
): Promise<Trust> {
  const since90 = new Date(now - 90 * DAY).toISOString();
  const removedSince = (table: "community_posts" | "community_post_replies") =>
    admin
      .from(table)
      .select("created_at")
      .eq("user_id", user.id)
      .eq("status", "removed")
      .not("removed_by_email", "is", null)
      .gte("created_at", since90)
      .limit(50);

  const [staff, removedPosts, removedReplies] = await Promise.all([
    isStaff(admin, user),
    removedSince("community_posts"),
    removedSince("community_post_replies"),
  ]);
  const removedAt = [...(removedPosts.data ?? []), ...(removedReplies.data ?? [])].map((r) =>
    new Date((r as { created_at: string }).created_at).getTime(),
  );
  const created = user.created_at ? new Date(user.created_at).getTime() : NaN;
  const facts: TrustFacts = {
    // An account whose age cannot be read is treated as old enough to post,
    // not as new: the age comes from the sign-in itself and is always there.
    accountAgeMs: Number.isFinite(created) ? Math.max(0, now - created) : Number.MAX_SAFE_INTEGER,
    contributions: 0,
    removals30d: removedAt.filter((t) => now - t < 30 * DAY).length,
    removals90d: removedAt.length,
    staff,
  };
  // Contributions only matter on the way to "trusted"; skip the two counts
  // for everyone they cannot change.
  if (!staff && facts.removals90d === 0 && facts.accountAgeMs >= 30 * DAY) {
    const [posts, replies] = await Promise.all([
      headCount(admin.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "visible")),
      headCount(admin.from("community_post_replies").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "visible")),
    ]);
    facts.contributions = posts + replies;
  }
  const level = trustLevel(facts);
  return { level, limits: TRUST_LIMITS[level], facts };
}
