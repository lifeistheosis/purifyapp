import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getBlockedHosts } from "@/lib/moderation/server";
import { rateLimited } from "@/lib/security/ratelimit";

import { duplicateKey, findLinks, judgeSpam } from "./spam";
import { readTrust, type Trust } from "./trustServer";

// The spam filter as the post and reply routes run it, before anything is
// written: the reader's posting limit for their trust level, the same message
// twice, too many links or @mentions, and what lib/community/spam.ts would
// hold for a moderator. The word filter (lib/moderation) runs after this and
// is unchanged.

export type HoldReason = "spam" | "links" | "new_account";

export type Guard =
  | { kind: "ok"; trust: Trust }
  | { kind: "hold"; trust: Trust; reason: HoldReason; detail: string }
  | { kind: "refuse"; status: 400 | 409 | 429; code: string; error: string; limit?: number };

const HOUR = 60 * 60 * 1000;

type Write =
  | { kind: "post"; title: string | null; body: string | null }
  | { kind: "reply"; body: string; postId: string };

export async function guardWrite(
  admin: SupabaseClient,
  user: Pick<User, "id" | "email" | "created_at">,
  w: Write,
  now: number = Date.now(),
): Promise<Guard> {
  const trust = await readTrust(admin, user, now);

  // 1. How often. Per account, on top of the per-address limit the routes
  // already carry, so a new account cannot post forty times from forty phones.
  const perHour = w.kind === "post" ? trust.limits.postsPerHour : trust.limits.repliesPerHour;
  if (await rateLimited(`community-${w.kind}-user:${user.id}`, 3600, perHour)) {
    return {
      kind: "refuse",
      status: 429,
      code: trust.level === "new" || trust.level === "restricted" ? "slow_down_new" : "slow_down",
      error:
        trust.level === "new" || trust.level === "restricted"
          ? "New accounts can post a few times an hour. Please try again a little later."
          : "You're posting quickly. Please slow down a little.",
      limit: perHour,
    };
  }

  const texts = w.kind === "post" ? [w.title, w.body] : [w.body];
  const since = new Date(now - 24 * HOUR).toISOString();

  // 2. The same message twice. Never for something short: "Amen" under ten
  // posts is a reader praying, not spam.
  if (trust.level !== "staff") {
    if (w.kind === "post") {
      const key = duplicateKey(`${w.title ?? ""} ${w.body ?? ""}`);
      if (key) {
        const { data } = await admin
          .from("community_posts")
          .select("title, body")
          .eq("user_id", user.id)
          .neq("status", "removed")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20);
        const rows = (data ?? []) as { title: string | null; body: string | null }[];
        if (rows.some((r) => duplicateKey(`${r.title ?? ""} ${r.body ?? ""}`) === key)) {
          return { kind: "refuse", status: 409, code: "duplicate", error: "You already posted this." };
        }
      }
    } else {
      const key = duplicateKey(w.body);
      if (key) {
        const { data } = await admin
          .from("community_post_replies")
          .select("post_id, body")
          .eq("user_id", user.id)
          .neq("status", "removed")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(60);
        const rows = (data ?? []) as { post_id: string; body: string }[];
        // Under the same post, any repeat. Across posts, only a long message
        // or one with a link: the same blessing under two posts is fine, the
        // same paragraph with a link under ten is not.
        const elsewhereCounts = key.length >= 40 || findLinks([w.body]).length > 0;
        const dup = rows.some((r) => duplicateKey(r.body) === key && (r.post_id === w.postId || elsewhereCounts));
        if (dup) return { kind: "refuse", status: 409, code: "duplicate", error: "You already posted this." };
      }
    }
  }

  // 3. Links, mentions and the shape of spam.
  const verdict = judgeSpam(texts, { level: trust.level, blockedHosts: await getBlockedHosts(admin), limits: trust.limits });
  if (verdict.action === "refuse") {
    return {
      kind: "refuse",
      status: 400,
      code: verdict.code,
      error:
        verdict.code === "too_many_links"
          ? `Please keep it to ${verdict.limit} links or fewer.`
          : `Please mention ${verdict.limit} readers or fewer at once.`,
      limit: verdict.limit,
    };
  }
  if (verdict.action === "hold") return { kind: "hold", trust, reason: verdict.reason, detail: verdict.detail.slice(0, 300) };

  // 4. The same words from several accounts at once, which is how a spam
  // run looks from inside: each account clean, the message identical.
  const body = (w.body ?? "").trim();
  if (trust.level !== "staff" && body.length >= 20) {
    const table = w.kind === "post" ? "community_posts" : "community_post_replies";
    const { data } = await admin
      .from(table)
      .select("user_id")
      .eq("body", body)
      .neq("user_id", user.id)
      .gte("created_at", new Date(now - 2 * HOUR).toISOString())
      .limit(10);
    const others = new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id));
    if (others.size >= 2) {
      return { kind: "hold", trust, reason: "spam", detail: `The same message from ${others.size + 1} accounts` };
    }
  }

  return { kind: "ok", trust };
}
