// Where a pinned announcement sits in the feed.
//
// The database already returns posts in this order (see the feed route), so
// this exists for the client, which reorders locally: a reader posting
// something new prepends it, and without this it would land above an
// announcement the owner deliberately put at the top. Two implementations of
// "what order is this feed in" would drift, so the rule lives here and both
// sides call it.
//
// Pure, so vitest can hold it. The panel's controls are in
// components/admin/tabs/CommunityTab.tsx and the reader's rendering is in
// components/community/CommunityClient.tsx.

export type PinnablePost = {
  /** ISO timestamp, or null when not pinned. */
  pinned_at?: string | null;
  created_at: string;
};

/**
 * Pinned first, newest pin highest, then everything else newest first.
 *
 * STABLE AND NON-MUTATING. The caller's array is left alone, because the feed
 * array is React state and sorting it in place is a mutation React cannot see.
 *
 * Ties fall back to created_at so the order is total: two posts pinned in the
 * same millisecond, which a bulk operation could produce, must not be able to
 * swap places between renders and make the feed jitter.
 */
export function sortPinnedFirst<T extends PinnablePost>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const ap = a.pinned_at ?? null;
    const bp = b.pinned_at ?? null;
    if (ap && !bp) return -1;
    if (!ap && bp) return 1;
    if (ap && bp && ap !== bp) return ap < bp ? 1 : -1;
    // Both pinned at the same instant, or neither pinned: newest first.
    if (a.created_at === b.created_at) return 0;
    return a.created_at < b.created_at ? 1 : -1;
  });
}

/** The pinned ones, in the order they are shown. */
export function pinnedPosts<T extends PinnablePost>(posts: T[]): T[] {
  return sortPinnedFirst(posts).filter((p) => Boolean(p.pinned_at));
}

/**
 * How many announcements may sit at the top at once.
 *
 * Not enforced in the database, on purpose: a hard constraint there would make
 * a legitimate fourth pin fail with a foreign-looking error at the worst
 * moment. It is enforced where it can explain itself, in the panel, which
 * tells the owner what would be displaced before they do it.
 *
 * Three, because the point of an announcement is that it is above everything
 * else, and a feed whose first screen is entirely announcements has no feed
 * left to be above.
 */
export const MAX_PINNED = 3;
