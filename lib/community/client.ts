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

export type CreatePostInput = {
  kind: "discussion" | "scripture" | "father";
  title?: string | null;
  body?: string | null;
  quoteText?: string | null;
  quoteSource?: string | null;
  quoteHref?: string | null;
};

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

export async function fetchReplies(postId: string): Promise<CommunityReply[]> {
  try {
    const res = await apiFetch(`/api/community/posts/${postId}/replies`);
    if (!res.ok) return [];
    const json = (await res.json()) as { replies?: CommunityReply[] };
    return json.replies ?? [];
  } catch {
    return [];
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
