"use client";

// Client-side calls for Community conversations. Everything goes through
// the API via apiFetch (native rewrites to SITE_URL + Bearer), matching
// lib/campaigns/client.ts.

import { apiFetch } from "@/lib/api/client";
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

export async function fetchCommunityPosts(): Promise<PostsResult> {
  try {
    const res = await apiFetch("/api/community/posts");
    // 404 is the flag guard in app/api/community/posts/route.ts, not a failure.
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
};

/** Ids of the caller's own posts and replies. See app/api/community/mine. */
export async function fetchMyCommunityIds(): Promise<{
  postIds: string[];
  replyIds: string[];
}> {
  try {
    const res = await apiFetch("/api/community/mine");
    if (!res.ok) return { postIds: [], replyIds: [] };
    const data = (await res.json()) as { postIds?: string[]; replyIds?: string[] };
    return { postIds: data.postIds ?? [], replyIds: data.replyIds ?? [] };
  } catch {
    return { postIds: [], replyIds: [] };
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
