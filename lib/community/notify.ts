// Writing a community notification.
//
// Server-only: every call runs through the service role from a route
// handler, never from a client. That is the whole security model for
// community_notifications, which has no insert policy at all, so nobody can
// manufacture a notification addressed to somebody else.
//
// Every function here is BEST EFFORT and returns rather than throws. A
// reply that was stored is the thing that matters to the person who wrote
// it; failing their request because an inbox row could not be written would
// be the wrong trade. It also means the whole feature ships dark and
// harmless until 20260801_community_notifications.sql is applied: the
// insert fails with "relation does not exist", we log once, and the reply
// still succeeds.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Longest excerpt an inbox row shows before it is cut. */
const EXCERPT_LIMIT = 140;

export type ReplyNotification = {
  admin: SupabaseClient;
  postId: string;
  replyId: string;
  /** The person who replied, so we can skip telling them about themselves. */
  actorId: string;
  actorName: string;
  excerpt: string;
};

export function trimExcerpt(body: string, limit = EXCERPT_LIMIT): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  // Cut on a word boundary when there is one near the end, so the excerpt
  // does not stop mid-word.
  const cut = flat.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > limit - 24 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export async function notifyOfReply({
  admin,
  postId,
  replyId,
  actorId,
  actorName,
  excerpt,
}: ReplyNotification): Promise<void> {
  try {
    const { data: post } = await admin
      .from("community_posts")
      .select("user_id")
      .eq("id", postId)
      .maybeSingle();
    if (!post?.user_id) return;
    // Replying to your own post is not news.
    if (post.user_id === actorId) return;

    const { error } = await admin.from("community_notifications").insert({
      user_id: post.user_id,
      kind: "reply",
      post_id: postId,
      reply_id: replyId,
      actor_name: actorName.slice(0, 80),
      excerpt: trimExcerpt(excerpt),
    });
    if (error) {
      console.warn("[community] notification not written", error.message);
    }
  } catch (e) {
    console.warn(
      "[community] notification not written",
      e instanceof Error ? e.message : String(e),
    );
  }
}
