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

export async function fetchCommunityPosts(): Promise<CommunityPost[] | null> {
  const res = await apiFetch("/api/community/posts");
  if (res.status === 404) return null; // feature dark (flag or migration)
  if (!res.ok) return [];
  const json = (await res.json()) as { posts?: CommunityPost[] };
  return json.posts ?? [];
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
  const res = await apiFetch("/api/community/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return readResult(res);
}

export async function deleteCommunityPost(id: string): Promise<CommunityResult> {
  const res = await apiFetch(`/api/community/posts/${id}`, { method: "DELETE" });
  return readResult(res);
}

export async function fetchReplies(postId: string): Promise<CommunityReply[]> {
  const res = await apiFetch(`/api/community/posts/${postId}/replies`);
  if (!res.ok) return [];
  const json = (await res.json()) as { replies?: CommunityReply[] };
  return json.replies ?? [];
}

export async function addReply(
  postId: string,
  body: string,
): Promise<CommunityResult> {
  const res = await apiFetch(`/api/community/posts/${postId}/replies`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return readResult(res);
}

export async function uploadAvatar(
  file: File,
): Promise<CommunityResult & { url?: string }> {
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
}
