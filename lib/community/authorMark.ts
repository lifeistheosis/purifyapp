// The supporter mark, derived at read time from two denormalised timestamps.
//
// 20260905_community_author_mark.sql copies entitlements.plus_until and
// pro_until onto every post and reply an author writes, and nulls them when
// the author has hidden the mark. This module is the other half: the read
// routes compare those timestamps to the clock and emit 'plus' | 'pro' |
// null. The timestamps themselves never reach a response, because a
// subscription's end date is a fact about a person and the feed is served to
// anonymous readers with a shared cache.
//
// Time-based on purpose. A boolean maintained by trigger would keep marking
// a lapsed subscriber until something wrote the row again; comparing to
// now() lapses the mark at the period end exactly, with no job to run.
//
// Pure, no fs and no "use client", importable from route handlers and client
// components alike.

export type AuthorMark = "plus" | "pro" | null;

/**
 * The two columns, in the form the select strings use. Appended to POST_COLS
 * and REPLY_COLS by the routes, and the string the routes strip again when
 * the migration has not been applied.
 */
export const AUTHOR_MARK_COLS = "author_plus_until, author_pro_until";

type MarkRow = {
  author_plus_until?: unknown;
  author_pro_until?: unknown;
};

function inFuture(value: unknown, now: number): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  const at = new Date(value).getTime();
  return Number.isFinite(at) && at > now;
}

/**
 * Pro if the Pro period is still running, else Plus if the Plus period is,
 * else nothing. Pro is a superset of Plus and the webhook writes both dates
 * on a Pro purchase, so a Pro row that has lapsed to Plus reads as Plus.
 *
 * Missing or malformed columns are "no mark", which is also what a row from
 * before the migration looks like.
 */
export function deriveAuthorMark(
  row: MarkRow | null | undefined,
  now: number = Date.now(),
): AuthorMark {
  if (!row) return null;
  if (inFuture(row.author_pro_until, now)) return "pro";
  if (inFuture(row.author_plus_until, now)) return "plus";
  return null;
}

/**
 * The i18n key for a mark's label, or null for no mark. The visible words
 * are the owner's to choose ("Supporter" and "Patron" by default, or Greek
 * terms); the code only ever knows the key.
 */
export function authorMarkLabelKey(
  tier: AuthorMark | undefined,
): "community.supporterMark" | "community.patronMark" | null {
  if (tier === "pro") return "community.patronMark";
  if (tier === "plus") return "community.supporterMark";
  return null;
}

/** Narrow an unknown payload value to the three states the UI understands. */
export function asAuthorMark(value: unknown): AuthorMark {
  return value === "plus" || value === "pro" ? value : null;
}
