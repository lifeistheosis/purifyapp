// A post or reply its writer deleted after others had answered (1.9, build 95
// note 10: a reader asked to edit and remove their own posts and replies).
//
// Deleting your own words takes them away. When nobody else has answered,
// the row goes, as a post's always did. When others have, deleting the row
// would take their answers with it (a post's replies go with the post) or
// leave them hanging in a thread that no longer says what they answered. So
// the row stays as a placeholder in the state 'withdrawn': its words, its
// writer's name and picture cleared, shown as "Removed by its author", and
// the thread under it or after it stays readable.
//
// 'withdrawn' is a state of its own, not a flag on a visible row, on
// purpose: every read of Community asks for status = 'visible' (the feed's
// other lists, a profile, the weekly letter, the counts, both tables' row
// policies), so a placeholder is in none of them without anyone remembering
// to leave it out. Only the three reads that show it ask for it by name: the
// feed, one post by its id, and a thread's replies.
//
// Pure: the routes, the server's own-words module and the tests share it.

/** The state a deleted post or reply keeps when others had answered. */
export const WITHDRAWN = "withdrawn" as const;

/** The name an older app draws on a placeholder: the table's own default for a reader with none. */
export const PLACEHOLDER_NAME = "Reader";

/**
 * What a post keeps when its writer deletes it after others replied: none of
 * their words, the line it shared, the chapter their words were about, their
 * name or their picture. Unpinned, so an announcement withdrawn does not sit
 * over the feed.
 */
export const WITHDRAWN_POST_PATCH = {
  status: WITHDRAWN,
  title: null,
  body: null,
  quote_text: null,
  quote_source: null,
  quote_href: null,
  chapter_ref: null,
  author_name: PLACEHOLDER_NAME,
  author_avatar: null,
  author_handle: null,
  author_decoration: null,
  author_name_color: null,
  pinned_at: null,
  pinned_by: null,
} as const;

/** The same, for a schema without the columns added since 20261001: the words, the name and the picture. */
export const WITHDRAWN_POST_PATCH_MIN = {
  status: WITHDRAWN,
  title: null,
  body: null,
  quote_text: null,
  quote_source: null,
  quote_href: null,
  author_name: PLACEHOLDER_NAME,
  author_avatar: null,
} as const;

/** What a reply keeps. `body` is not null in the table, so it is emptied. */
export const WITHDRAWN_REPLY_PATCH = {
  status: WITHDRAWN,
  body: "",
  author_name: PLACEHOLDER_NAME,
  author_avatar: null,
  author_handle: null,
  author_decoration: null,
  author_name_color: null,
} as const;

export const WITHDRAWN_REPLY_PATCH_MIN = {
  status: WITHDRAWN,
  body: "",
  author_name: PLACEHOLDER_NAME,
  author_avatar: null,
} as const;

const count = (v: unknown) => (typeof v === "number" && v > 0 ? v : 0);

export function isWithdrawn(row: { status?: unknown } | null | undefined): boolean {
  return row?.status === WITHDRAWN;
}

/**
 * The post a reader receives for a placeholder: where it stood, when, what it
 * was for, and how many replies hang from it. Nothing of its writer. Every
 * field a post carries is here, so an app from before 1.9 draws a post with
 * no words by "Reader" rather than failing; 1.9 draws "Removed by its author".
 */
export function withdrawnPost(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    kind: row.kind === "scripture" || row.kind === "father" ? row.kind : "discussion",
    title: null,
    body: null,
    quote_text: null,
    quote_source: null,
    quote_href: null,
    author_name: PLACEHOLDER_NAME,
    author_avatar: null,
    author_verified: false,
    author_mark: null,
    author_handle: null,
    author_decoration: null,
    author_name_color: null,
    author_clergy: null,
    reply_count: count(row.reply_count),
    like_count: 0,
    dislike_count: 0,
    created_at: row.created_at,
    pinned_at: null,
    // A question keeps its label, so the answers under it are still found as
    // answers; the day's feast thread keeps its own.
    category: row.category === "question" || row.category === "feast" ? row.category : null,
    chapter_ref: null,
    feast_slug: null,
    amen_count: 0,
    praying_count: 0,
    glory_count: 0,
    clergy_reply_count: count(row.clergy_reply_count),
    edited_at: null,
    removed_by_author: true,
  };
}

/** The reply a reader receives for a placeholder. */
export function withdrawnReply(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    post_id: row.post_id,
    body: "",
    author_name: PLACEHOLDER_NAME,
    author_avatar: null,
    author_mark: null,
    author_handle: null,
    author_decoration: null,
    author_name_color: null,
    author_clergy: null,
    like_count: 0,
    dislike_count: 0,
    amen_count: 0,
    praying_count: 0,
    glory_count: 0,
    created_at: row.created_at,
    edited_at: null,
    removed_by_author: true,
    author_muted: false,
  };
}

/**
 * A feed's rows as they are shown: a withdrawn post only while replies still
 * hang from it. With none left it has nothing to hold up, and is not shown.
 */
export function shownPosts<T extends { status?: unknown; reply_count?: unknown }>(rows: T[]): T[] {
  return rows.filter((r) => !isWithdrawn(r) || count(r.reply_count) > 0);
}

/**
 * A thread's rows, oldest first, as they are shown: a withdrawn reply only
 * where a reply still follows it. One with nothing after it answers nobody.
 */
export function shownReplies<T extends { status?: unknown }>(rows: T[]): T[] {
  let end = rows.length;
  while (end > 0 && isWithdrawn(rows[end - 1])) end -= 1;
  return rows.slice(0, end);
}

/** A thread's count: what readers can read, never a placeholder. */
export function readableCount(replies: readonly { removed_by_author?: boolean }[]): number {
  return replies.filter((r) => !r.removed_by_author).length;
}
