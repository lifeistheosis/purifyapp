"use client";

// Client-side calls for Community conversations. Everything goes through
// the API via apiFetch (native rewrites to SITE_URL + Bearer), matching
// lib/campaigns/client.ts.

import { apiFetch } from "@/lib/api/client";
import { parseReactionMap, type ReactionState } from "@/lib/community/reactions";
import { parseResponseMap, type ResponseCounts, type ResponseKind } from "@/lib/community/responses";
import type { CommunityPost, CommunityReply } from "./types";

export type CommunityResult = {
  ok: boolean;
  error?: string;
  id?: string;
  /**
   * "filtered": the word filter would mask some of it; ask, then send again
   * with confirmFiltered. "held": it was kept and waits for a moderator.
   * "duplicate", "too_many_links", "too_many_mentions", "slow_down",
   * "slow_down_new": the spam filter's refusals (lib/community/guard.ts).
   */
  code?: string;
  preview?: { title: string | null; body: string | null };
  /** Kept, and shown to nobody until a moderator approves it. */
  held?: boolean;
  /** The limit a refusal names (links, mentions, posts an hour). */
  limit?: number;
};

async function readResult(res: Response): Promise<CommunityResult> {
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    return {
      ok: false,
      error: (json.error as string) || "Something went wrong.",
      code: typeof json.code === "string" ? json.code : undefined,
      preview: json.preview as CommunityResult["preview"],
      limit: typeof json.limit === "number" ? json.limit : undefined,
    };
  }
  return { ok: true, id: json.id as string | undefined, held: json.held === true, code: typeof json.code === "string" ? json.code : undefined };
}

const NETWORK_ERROR = "Network dropped. Please try again.";

/**
 * Three genuinely different outcomes, kept apart.
 *
 * They used to collapse into two. A 404 meant the feature was dark, and
 * BOTH a non-ok response and a thrown fetch returned `[]`, which the panel
 * renders as "It's quiet here. Be the first to share a line." So a reader
 * offline in a church, or hitting a 500, was told the community was empty.
 * That is a lie the app tells confidently, and it is worse than a spinner.
 *
 * Before the try/catch was added it was worse in the other direction: a
 * thrown fetch rejected inside the effect, `setPosts` never ran, and the
 * panel hung on "Gathering the conversation" forever.
 */
export type PostsResult =
  | { state: "dark" }
  | { state: "ok"; posts: CommunityPost[] }
  | { state: "error" };

/**
 * The public feed, or one parish group's thread when `groupId` is given.
 *
 * A group thread is not a different endpoint: same posts table, same
 * moderation, same replies. Only the audience differs, and that is enforced
 * by the route and by the row policy, not by this argument.
 */
export async function fetchCommunityPosts(
  groupId?: string | null,
  opts: { following?: boolean; chapter?: string; category?: "question" } = {},
): Promise<PostsResult> {
  try {
    const qs = groupId
      ? `?group=${encodeURIComponent(groupId)}`
      : opts.following
        ? "?following=1"
        : opts.chapter
          ? `?chapter=${encodeURIComponent(opts.chapter)}`
          : opts.category
            ? `?category=${opts.category}`
            : "";
    const res = await apiFetch(`/api/community/posts${qs}`);
    // 404 is the flag guard in app/api/community/posts/route.ts, not a failure.
    // For a group it also means "not a member", which is deliberately
    // indistinguishable from "no such group".
    if (res.status === 404) return { state: "dark" };
    if (!res.ok) return { state: "error" };
    const json = (await res.json()) as { posts?: CommunityPost[] };
    return { state: "ok", posts: json.posts ?? [] };
  } catch {
    return { state: "error" };
  }
}

/**
 * One post by its id, for a notification about a post that is no longer in
 * the feed's newest fifty. Null when it is gone, hidden, or not this reader's
 * to see: the route answers all three the same way, on purpose.
 */
export async function fetchCommunityPost(postId: string): Promise<CommunityPost | null> {
  try {
    const res = await apiFetch(`/api/community/posts?post=${encodeURIComponent(postId)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { posts?: CommunityPost[] };
    return json.posts?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * A share sends a LOCATOR into Purify's library, not the quotation. The
 * server loads the cited verse or work and writes the text and citation
 * itself, so an invented quotation cannot be published under a saint's name.
 * See lib/community/verifyQuote.ts.
 */
export type CreatePostInput = {
  kind: "discussion" | "scripture" | "father";
  title?: string | null;
  body?: string | null;
  /** scripture locator */
  book?: string | null;
  chapter?: number | null;
  verse?: number | null;
  /** father locator */
  saintSlug?: string | null;
  work?: string | null;
  /** Only for `father`, and only ever checked against the cited work. */
  quoteText?: string | null;
  /** Post into a parish group's thread rather than the public feed. */
  groupId?: string | null;
  /** The writer saw the word-filter warning and chose to post anyway. */
  confirmFiltered?: boolean;
  /** A question for clergy (Ask a Priest). */
  category?: "question" | null;
  /** The Bible chapter it is about, from that chapter's page ("john/3"). */
  chapterRef?: string | null;
};

/** Ids of the caller's own posts and replies. See app/api/community/mine. */
export type MyCommunityState = {
  postIds: string[];
  replyIds: string[];
  /** Post/reply id to the reaction this reader holds: 1 like, -1 dislike. */
  reactions: {
    posts: Record<string, ReactionState>;
    replies: Record<string, ReactionState>;
  };
  /** Amen, Praying, Glory to God held, by post and reply id. */
  responses: {
    posts: Record<string, ResponseKind[]>;
    replies: Record<string, ResponseKind[]>;
  };
  /** The reader moderates (the Moderator or Team badge, or the team's own address). */
  moderator: boolean;
};

const EMPTY_MINE: MyCommunityState = {
  postIds: [],
  replyIds: [],
  reactions: { posts: {}, replies: {} },
  responses: { posts: {}, replies: {} },
  moderator: false,
};

export async function fetchMyCommunityIds(): Promise<MyCommunityState> {
  try {
    const res = await apiFetch("/api/community/mine");
    if (!res.ok) return EMPTY_MINE;
    const data = (await res.json()) as {
      postIds?: string[];
      replyIds?: string[];
      reactions?: {
        posts?: Record<string, unknown>;
        replies?: Record<string, unknown>;
      };
      responses?: {
        posts?: Record<string, unknown>;
        replies?: Record<string, unknown>;
      };
      moderator?: unknown;
    };
    // Narrowed rather than cast, in lib/community/reactions.ts where it is
    // tested. This is the only place the wire shape becomes a ReactionState.
    return {
      postIds: data.postIds ?? [],
      replyIds: data.replyIds ?? [],
      reactions: {
        posts: parseReactionMap(data.reactions?.posts),
        replies: parseReactionMap(data.reactions?.replies),
      },
      responses: {
        posts: parseResponseMap(data.responses?.posts),
        replies: parseResponseMap(data.responses?.replies),
      },
      moderator: data.moderator === true,
    };
  } catch {
    return EMPTY_MINE;
  }
}

/** Report a post or a reply. Exactly one id. */
export async function reportCommunityItem(input: {
  postId?: string;
  replyId?: string;
  reason?: string | null;
}): Promise<CommunityResult> {
  try {
    const res = await apiFetch("/api/community/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export async function createCommunityPost(
  input: CreatePostInput,
): Promise<CommunityResult> {
  try {
    const res = await apiFetch("/api/community/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export async function deleteCommunityPost(id: string): Promise<CommunityResult> {
  try {
    const res = await apiFetch(`/api/community/posts/${id}`, { method: "DELETE" });
    return readResult(res);
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

/**
 * Replies, with failure kept apart from emptiness.
 *
 * The same lie `PostsResult` was written to stop, one level down. This used
 * to return `[]` for a 500, a 404 and a dropped connection alike, so a post
 * whose own row says "12 replies" expanded into a silent empty box. The
 * reader is told the thread is empty when in fact we could not reach it.
 */
export type RepliesResult =
  | { state: "ok"; replies: CommunityReply[] }
  | { state: "error" };

export async function fetchReplies(postId: string): Promise<RepliesResult> {
  try {
    const res = await apiFetch(`/api/community/posts/${postId}/replies`);
    if (!res.ok) return { state: "error" };
    const json = (await res.json()) as { replies?: CommunityReply[] };
    return { state: "ok", replies: json.replies ?? [] };
  } catch {
    return { state: "error" };
  }
}

export async function addReply(
  postId: string,
  body: string,
  confirmFiltered = false,
): Promise<CommunityResult> {
  try {
    const res = await apiFetch(`/api/community/posts/${postId}/replies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(confirmFiltered ? { body, confirmFiltered } : { body }),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export async function uploadAvatar(
  file: File,
): Promise<CommunityResult & { url?: string }> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await apiFetch("/api/community/avatar", {
      method: "POST",
      body: form,
    });
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      /* empty */
    }
    if (!res.ok) {
      return {
        ok: false,
        error: (json.error as string) || "Couldn't update your photo.",
      };
    }
    return { ok: true, url: json.url as string | undefined };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

/**
 * Block the author of a post or reply.
 *
 * Identified by the item, never by a user id: the feed deliberately does not
 * carry `user_id`, and the route resolves the author server-side. See
 * app/api/community/block/route.ts.
 */
export async function blockCommunityAuthor(input: {
  postId?: string;
  replyId?: string;
  /** From a profile, by its public @handle. */
  profileHandle?: string;
}): Promise<CommunityResult> {
  try {
    const res = await apiFetch("/api/community/block", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

/** One reader this account has blocked. Name and date only, never an id. */
export type BlockedReader = { id: string; blocked_name: string; created_at: string };

/**
 * The readers this account has blocked, newest first.
 *
 * `null` means the list could not be read, which the caller must show as a
 * failure. An empty array means nobody is blocked. Collapsing the two would
 * tell a reader who is still blocking someone that they are not.
 */
export async function listBlockedReaders(): Promise<BlockedReader[] | null> {
  try {
    const res = await apiFetch("/api/community/block", { method: "GET" });
    if (!res.ok) return null;
    const json = (await res.json()) as { blocks?: unknown };
    if (!Array.isArray(json.blocks)) return null;
    return json.blocks.filter(
      (b): b is BlockedReader =>
        !!b &&
        typeof (b as BlockedReader).id === "string" &&
        typeof (b as BlockedReader).blocked_name === "string",
    );
  } catch {
    return null;
  }
}

/** Lift a block, by the block row's own id (from GET /api/community/block). */
export async function unblockCommunityAuthor(
  id: string,
): Promise<CommunityResult> {
  try {
    const res = await apiFetch("/api/community/block", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

// ── Amen, Praying, Glory to God ──────────────────────────────────────────────

/** Turn one response on or off. Sends the end state, never a toggle. */
export async function setResponse(input: {
  postId?: string;
  replyId?: string;
  kind: ResponseKind;
  on: boolean;
}): Promise<{ ok: true; counts: ResponseCounts; mine: ResponseKind[] } | { ok: false; error: string }> {
  try {
    const res = await apiFetch("/api/community/responses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => ({}))) as { counts?: ResponseCounts; mine?: ResponseKind[]; error?: string };
    if (!res.ok || !json.counts) return { ok: false, error: json.error ?? "Couldn't save that." };
    return { ok: true, counts: json.counts, mine: Array.isArray(json.mine) ? json.mine : [] };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

// ── Mute ─────────────────────────────────────────────────────────────────────

/** Mute the author of a post or reply, or a profile by @handle. */
export async function muteCommunityAuthor(input: {
  postId?: string;
  replyId?: string;
  profileHandle?: string;
}): Promise<CommunityResult> {
  try {
    const res = await apiFetch("/api/community/mute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

/** Unmute, by the mute's own id (from the list) or a profile's @handle. */
export async function unmuteCommunityAuthor(input: { id?: string; profileHandle?: string }): Promise<CommunityResult> {
  try {
    const res = await apiFetch("/api/community/mute", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export type MutedReader = { id: string; muted_name: string; created_at: string };

/** The readers this account has muted; null when the list could not be read. */
export async function listMutedReaders(): Promise<MutedReader[] | null> {
  try {
    const res = await apiFetch("/api/community/mute", { method: "GET" });
    if (!res.ok) return null;
    const json = (await res.json()) as { mutes?: unknown };
    if (!Array.isArray(json.mutes)) return null;
    return json.mutes.filter(
      (m): m is MutedReader => !!m && typeof (m as MutedReader).id === "string" && typeof (m as MutedReader).muted_name === "string",
    );
  } catch {
    return null;
  }
}

// ── The prayer wall ──────────────────────────────────────────────────────────

export type PrayerRequest = {
  handle: string;
  name: string;
  avatar: string | null;
  since: string;
  count: number;
  prayed: boolean;
  mine: boolean;
};

export async function fetchPrayerWall(): Promise<{ state: "ok"; requests: PrayerRequest[] } | { state: "error" | "dark" }> {
  try {
    const res = await apiFetch("/api/community/prayer-wall");
    if (res.status === 404) return { state: "dark" };
    if (!res.ok) return { state: "error" };
    const json = (await res.json()) as { requests?: PrayerRequest[] };
    return { state: "ok", requests: Array.isArray(json.requests) ? json.requests : [] };
  } catch {
    return { state: "error" };
  }
}

// ── Moderation ───────────────────────────────────────────────────────────────

export type ModAction =
  | "remove_post"
  | "remove_reply"
  | "restore_post"
  | "restore_reply"
  | "dismiss_report"
  | "approve_hold"
  | "keep_hold"
  | "remove_hold"
  | "clear_profile"
  | "reset_handle";

export type ModHold = {
  id: string;
  post_id: string | null;
  reply_id: string | null;
  reason: "words" | "spam" | "links" | "new_account" | "reports";
  detail: string | null;
  original_title: string | null;
  original_body: string | null;
  hits: number;
  created_at: string;
  post: { id: string; kind: string; title: string | null; body: string | null; quote_text?: string | null; author_name: string; author_handle: string | null; status: string } | null;
  reply: { id: string; post_id: string; body: string; author_name: string; author_handle: string | null; status: string } | null;
};

export type ModReport = {
  id: string;
  post_id: string | null;
  reply_id: string | null;
  is_profile?: boolean;
  reason: string | null;
  created_at: string;
  post: { id: string; kind: string; title: string | null; body: string | null; quote_text: string | null; quote_source: string | null; author_name: string; status: string } | null;
  reply: { id: string; post_id: string; body: string; author_name: string; status: string } | null;
  profile: { handle: string | null; name: string | null; bio: string | null; status: string | null; banner_url: string | null; parish: string | null } | null;
};

export type ModLogLine = {
  id: string;
  actor_name: string;
  action: string;
  target_kind: string | null;
  target_id: string | null;
  summary: string | null;
  created_at: string;
};

export type ModQueue = { holds: ModHold[]; reports: ModReport[]; log: ModLogLine[]; me: { name: string; admin: boolean } };

export async function fetchModQueue(): Promise<{ ok: true; queue: ModQueue } | { ok: false; status: number; error: string }> {
  try {
    const res = await apiFetch("/api/community/moderation", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as Partial<ModQueue> & { error?: string };
    if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "The queue could not be read." };
    return {
      ok: true,
      queue: {
        holds: Array.isArray(json.holds) ? json.holds : [],
        reports: Array.isArray(json.reports) ? json.reports : [],
        log: Array.isArray(json.log) ? json.log : [],
        me: json.me ?? { name: "", admin: false },
      },
    };
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }
}

/** How many things wait, for the moderators' button; null when unknown. */
export async function fetchModWaiting(): Promise<number | null> {
  try {
    const res = await apiFetch("/api/community/moderation?summary=1", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { waiting?: number };
    return typeof json.waiting === "number" ? json.waiting : null;
  } catch {
    return null;
  }
}

export async function moderate(action: ModAction, id: string, reason?: string | null): Promise<CommunityResult> {
  try {
    const res = await apiFetch("/api/community/moderation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, id, reason: reason ?? null }),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}
