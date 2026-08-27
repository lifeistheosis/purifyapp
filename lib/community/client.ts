"use client";

// Client-side calls for Community conversations. Everything goes through
// the API via apiFetch (native rewrites to SITE_URL + Bearer), matching
// lib/campaigns/client.ts.

import { apiFetch } from "@/lib/api/client";
import { parseReactionMap, type ReactionState } from "@/lib/community/reactions";
import type { CommunityPost, CommunityReply } from "./types";

export type CommunityResult = { ok: boolean; error?: string; id?: string };

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
    };
  }
  return { ok: true, id: json.id as string | undefined };
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
): Promise<PostsResult> {
  try {
    const qs = groupId ? `?group=${encodeURIComponent(groupId)}` : "";
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
};

const EMPTY_MINE: MyCommunityState = {
  postIds: [],
  replyIds: [],
  reactions: { posts: {}, replies: {} },
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
): Promise<CommunityResult> {
  try {
    const res = await apiFetch(`/api/community/posts/${postId}/replies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
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
