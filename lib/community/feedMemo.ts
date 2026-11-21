/**
 * The public feed, held for a moment on the server (2026-11-21).
 *
 * Community asks for its feed again every few seconds while a reader has it
 * open (components/community/CommunityClient.tsx, POLL_MS), and every ask was
 * a read of fifty posts and their authors from the database: about 60 KB each
 * time, for each reader. One reader with Community open for an hour moved
 * about 28 MB out of Supabase. In November 2026 that took the project past
 * its free egress with under four hundred readers a month.
 *
 * The feed a reader with no block or mute of their own is shown is the same
 * feed for every such reader. The route already says so: it sends it as
 * "public, max-age=15", which lets any shared cache hand it to anyone
 * (app/api/community/posts/route.ts). So the same answer is held here, in
 * this process, for FEED_MEMO_MS, and readers who poll are one read of the
 * database between them, not one read each.
 *
 * What is never held: a group's thread, the Following tab, one post asked for
 * by its id, and the feed of a reader who has blocked or muted anyone. Those
 * are one reader's view and are read fresh every time, as before.
 *
 * A new post drops what is held (dropHeldFeeds, from the route's own POST), so
 * a post is in the next read. Edits, replies' counts, responses and removals
 * reach other readers within FEED_MEMO_MS plus the 15 seconds a browser may
 * keep the answer. What is held lives in this process only and is gone at a
 * restart.
 */

/** How long one answer is handed out again. */
export const FEED_MEMO_MS = 45_000;
/** Answers held at once: the feed, Ask a Priest, and a page for each chapter lately read. */
export const FEED_MEMO_MAX = 200;

type Held = { at: number; posts: unknown[] };

const STORE = Symbol.for("purify.community.feedMemo");

function heldFeeds(): Map<string, Held> {
  const g = globalThis as unknown as Record<symbol, Map<string, Held> | undefined>;
  let map = g[STORE];
  if (!map) {
    map = new Map<string, Held>();
    g[STORE] = map;
  }
  return map;
}

/**
 * The name an answer is held under, or null when the answer is one reader's
 * own view and must not be held at all.
 */
export function feedMemoKey(asked: {
  scopedGroup: string | null;
  following: boolean;
  onePost: string | null;
  blocked: number;
  chapter: string | null;
  category: string | null;
}): string | null {
  if (asked.scopedGroup || asked.following || asked.onePost || asked.blocked > 0) return null;
  return `feed|${asked.chapter ?? ""}|${asked.category ?? ""}`;
}

/** The answer held under this name, if it is still fresh. */
export function heldFeed(key: string, nowMs: number, held: Map<string, Held> = heldFeeds()): unknown[] | null {
  const hit = held.get(key);
  if (!hit) return null;
  if (nowMs - hit.at >= FEED_MEMO_MS) {
    held.delete(key);
    return null;
  }
  return hit.posts;
}

/** Hold an answer that was just read from the database. */
export function holdFeed(key: string, posts: unknown[], nowMs: number, held: Map<string, Held> = heldFeeds()): void {
  if (!held.has(key) && held.size >= FEED_MEMO_MAX) {
    const oldest = held.keys().next();
    if (!oldest.done) held.delete(oldest.value);
  }
  held.delete(key);
  held.set(key, { at: nowMs, posts });
}

/** Forget every held answer: something was posted. */
export function dropHeldFeeds(held: Map<string, Held> = heldFeeds()): void {
  held.clear();
}
