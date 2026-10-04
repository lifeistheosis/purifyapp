import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { pageAllIn } from "@/lib/supabase/pageAll";
import { isoWeekOf } from "@/lib/whatsNew/boardShape";

import { sendMarketingTo, type MarketingReport } from "./marketing";
import { subscribersOf } from "./preferences";
import { communityDigestBody, digestText, type DigestPost } from "./templates/communityBodies";

/**
 * The weekly Community email, from the daily lifecycle job, on Sundays only
 * (UTC), once per reader per week (keyed on the ISO week, so the job's second
 * run that day is a duplicate and nothing more).
 *
 * To readers who turned "The week in Community" on, and to nobody else: the
 * list is off until a reader turns it on (20261005), like every list.
 *
 * What it carries: the week's five most answered conversations in the public
 * feed, up to three things the people the reader follows wrote, and how many
 * readers asked for prayers. A reader who blocked an author never sees them
 * here either. Nothing from a parish group, nothing held for review.
 */

const DAY = 86_400_000;
const TOP = 5;
const FOLLOWING = 3;

type Row = {
  id: string;
  user_id: string;
  kind: string;
  category?: string | null;
  title: string | null;
  body: string | null;
  quote_text: string | null;
  quote_source: string | null;
  author_name: string;
  like_count: number | null;
  reply_count: number | null;
  amen_count?: number | null;
  praying_count?: number | null;
  glory_count?: number | null;
};

/** How much a post was answered: replies count double, every response once. Pure. */
export function digestScore(r: Pick<Row, "like_count" | "reply_count" | "amen_count" | "praying_count" | "glory_count">): number {
  return (r.like_count ?? 0) + 2 * (r.reply_count ?? 0) + (r.amen_count ?? 0) + (r.praying_count ?? 0) + (r.glory_count ?? 0);
}

function asDigest(r: Row): DigestPost {
  const label =
    r.category === "question"
      ? "Question for clergy"
      : r.category === "feast"
        ? "Feast day"
        : r.kind === "scripture" || r.kind === "father"
          ? (r.quote_source ?? "A shared line")
          : "Discussion";
  return { author: r.author_name, text: digestText(r.title, r.body, r.quote_text), label };
}

export async function runCommunityDigest(
  admin: SupabaseClient,
  now: Date,
  limit?: number,
): Promise<{ due: boolean; report: MarketingReport | null; errors: string[] }> {
  const errors: string[] = [];
  if (now.getUTCDay() !== 0) return { due: false, report: null, errors };

  const since = new Date(now.getTime() - 7 * DAY).toISOString();
  const read = (cols: string) =>
    admin
      .from("community_posts")
      .select(cols)
      .eq("status", "visible")
      .is("group_id", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300);
  let { data, error } = await read(
    "id, user_id, kind, category, title, body, quote_text, quote_source, author_name, like_count, reply_count, amen_count, praying_count, glory_count",
  );
  if (error) {
    // Before 20261005: no categories or responses, the rest as before.
    ({ data, error } = await read("id, user_id, kind, title, body, quote_text, quote_source, author_name, like_count, reply_count"));
  }
  if (error) {
    errors.push(`community_posts: ${error.message}`);
    return { due: true, report: null, errors };
  }
  const posts = (data ?? []) as unknown as Row[];
  if (posts.length === 0) return { due: true, report: null, errors };

  const { subscribers, error: subError } = await subscribersOf(admin, "community_digest");
  if (subError) {
    errors.push(`email_preferences: ${subError}`);
    return { due: true, report: null, errors };
  }
  if (subscribers.length === 0) return { due: true, report: null, errors };
  const ids = subscribers.map((s) => s.userId);

  // Whom each reader follows and whom each has blocked, whole. Both were one
  // request each, asking for 20,000 rows: the API gives 1,000 and says
  // nothing, and it was asked with every subscriber's id in the address at
  // once. Past either edge a reader's email would have lost the people they
  // follow, or shown them an author they had blocked. So the ids go in pieces
  // and each piece is read in pages (lib/supabase/pageAll.ts).
  //
  // A failed read stops the send and is reported. It used to be dropped, and
  // an empty block list then read as "this reader has blocked nobody". A table
  // that is not there yet is different: nobody can have followed or blocked
  // anyone, so it reads as none, as it always did.
  const orNone = <T>(read: Promise<T[]>): Promise<T[]> =>
    read.catch((e: Error) => {
      if (isTableAbsent(e.cause as Parameters<typeof isTableAbsent>[0])) return [];
      throw e;
    });
  let follows: { follower_id: string; followee_id: string }[];
  let blocks: { blocker_id: string; blocked_id: string }[];
  try {
    [follows, blocks] = await Promise.all([
      orNone(
        pageAllIn<{ follower_id: string; followee_id: string }>(ids, (some, from, to) =>
          admin
            .from("community_follows")
            .select("follower_id, followee_id")
            .in("follower_id", some)
            .order("follower_id")
            .order("followee_id")
            .range(from, to),
        ),
      ),
      orNone(
        pageAllIn<{ blocker_id: string; blocked_id: string }>(ids, (some, from, to) =>
          admin
            .from("community_blocks")
            .select("blocker_id, blocked_id")
            .in("blocker_id", some)
            .order("id")
            .range(from, to),
        ),
      ),
    ]);
  } catch (e) {
    errors.push(`community follows and blocks: ${(e as Error).message}`);
    return { due: true, report: null, errors };
  }
  const prayers = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("prayer_request_at", since);
  const followsOf = new Map<string, Set<string>>();
  for (const f of follows) {
    (followsOf.get(f.follower_id) ?? followsOf.set(f.follower_id, new Set()).get(f.follower_id)!).add(f.followee_id);
  }
  const blockedBy = new Map<string, Set<string>>();
  for (const b of blocks) {
    (blockedBy.get(b.blocker_id) ?? blockedBy.set(b.blocker_id, new Set()).get(b.blocker_id)!).add(b.blocked_id);
  }
  const ranked = [...posts].sort((a, b) => digestScore(b) - digestScore(a));
  const week = isoWeekOf(now.toISOString().slice(0, 10));

  const report = await sendMarketingTo(admin, {
    list: "community_digest",
    kind: "community_digest",
    limit,
    keyFor: (id) => `community_digest:${week}:${id}`,
    body: (s) => {
      const blocked = blockedBy.get(s.userId) ?? new Set<string>();
      const top = ranked.filter((p) => !blocked.has(p.user_id) && p.user_id !== s.userId).slice(0, TOP);
      const shown = new Set(top.map((p) => p.id));
      const theirs = followsOf.get(s.userId) ?? new Set<string>();
      const following = posts.filter((p) => theirs.has(p.user_id) && !blocked.has(p.user_id) && !shown.has(p.id)).slice(0, FOLLOWING);
      return communityDigestBody({
        top: top.map(asDigest),
        following: following.map(asDigest),
        prayers: prayers.error ? 0 : (prayers.count ?? 0),
      });
    },
  });
  errors.push(...report.errors);
  return { due: true, report, errors };
}
