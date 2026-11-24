import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { monthlyCosts } from "@/lib/admin/goals.server";
import { levelOne, type Level } from "@/lib/admin/level";
import { subscriptionStats } from "@/lib/entitlements/adminStats";
import { estimatedMrrCents } from "@/lib/premium/mrr";

/**
 * Level 1's figures for Home (components/admin/home/LevelPanel.tsx). Every
 * read is the one the owner digest makes (app/api/owner/digest), so Home and
 * a chat's report agree: paying and trials from subscriptionStats, net Plus as
 * the paying members at list less the stores' 15%, costs from monthlyCosts,
 * and new accounts by profiles.joined_at. Counts are head requests. Throws on
 * a failed read: the route answers 500 and Home says so, never a 0.
 */
export async function readLevel(admin: SupabaseClient, now: Date = new Date()): Promise<Level> {
  const day = 86_400_000;
  const d7 = new Date(now.getTime() - 7 * day).toISOString();
  const d14 = new Date(now.getTime() - 14 * day).toISOString();
  const head = { count: "exact" as const, head: true };
  const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: n, error } = await q;
    if (error) throw new Error(error.message);
    return n ?? 0;
  };
  const [subs, cancelling, newWeek, newPrevWeek, costs] = await Promise.all([
    subscriptionStats(admin),
    count(admin.from("entitlements").select("user_id", head).gt("plus_until", now.toISOString()).eq("auto_renew", false)),
    count(admin.from("profiles").select("id", head).gte("joined_at", d7)),
    count(admin.from("profiles").select("id", head).gte("joined_at", d14).lt("joined_at", d7)),
    monthlyCosts(admin, now),
  ]);
  return levelOne({
    netPlusCents: Math.round(estimatedMrrCents(subs.paidCounts) * 0.85),
    costsCents: costs?.cents ?? null,
    costsFrom: costs?.from.source ?? null,
    paid: subs.paidPlus,
    trials: subs.trialPlus,
    cancelling,
    newWeek,
    newPrevWeek,
  });
}
