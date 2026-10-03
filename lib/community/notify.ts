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
// harmless until 20260801000000_community_notifications.sql is applied: the
// insert fails with "relation does not exist", we log once, and the reply
// still succeeds.

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { extractMentions } from "./mentions";
import { sendCommunityPushes } from "./push";

/** Longest excerpt an inbox row shows before it is cut. */
const EXCERPT_LIMIT = 140;

export type ReplyNotification = {
  admin: SupabaseClient;
  postId: string;
  replyId: string;
  /** The person who replied, so we can skip telling them about themselves. */
  actorId: string;
  actorName: string;
  /** The replier's @handle, so the inbox can open their profile. */
  actorHandle?: string | null;
  excerpt: string;
  /** "answer" when verified clergy reply to a question (20261005). */
  kind?: "reply" | "answer";
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

/**
 * Tell a post's author about a reply. Returns who was told (the author), so
 * a mention of the same reader in that reply does not tell them twice.
 */
export async function notifyOfReply({
  admin,
  postId,
  replyId,
  actorId,
  actorName,
  actorHandle = null,
  excerpt,
  kind = "reply",
}: ReplyNotification): Promise<string | null> {
  try {
    const { data: post } = await admin
      .from("community_posts")
      .select("user_id")
      .eq("id", postId)
      .maybeSingle();
    if (!post?.user_id) return null;
    // Replying to your own post is not news.
    if (post.user_id === actorId) return null;
    await insertNotifications(admin, [
      {
        user_id: post.user_id,
        kind,
        post_id: postId,
        reply_id: replyId,
        actor_name: actorName,
        actor_handle: actorHandle,
        excerpt,
      },
    ]);
    return post.user_id as string;
  } catch (e) {
    console.warn(
      "[community] notification not written",
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }
}

// ── Every other kind (20261002000000_community_social.sql) ─────────────────────

export type NotificationKind =
  | "reply"
  | "mention"
  | "follow"
  | "name_day"
  | "prayed"
  | "gift"
  // 20261005: a question for clergy, clergy answering it, a held post approved.
  | "question"
  | "answer"
  | "approved";

export type NotificationRow = {
  user_id: string;
  kind: NotificationKind;
  post_id?: string | null;
  reply_id?: string | null;
  actor_name: string;
  actor_handle?: string | null;
  excerpt?: string | null;
};

/**
 * Write one or more inbox rows. Best effort, like everything here: a failed
 * notification never fails the request that caused it.
 *
 * `actor_handle` arrives with 20261002; until it is applied the insert is
 * retried without it, so a reply still notifies its post's author in the
 * window between this code deploying and the migration running.
 */
export async function insertNotifications(admin: SupabaseClient, rows: NotificationRow[]): Promise<void> {
  if (rows.length === 0) return;
  const clean = rows.map((r) => ({
    ...r,
    actor_name: r.actor_name.slice(0, 80),
    excerpt: r.excerpt ? trimExcerpt(r.excerpt) : null,
  }));
  try {
    let { error } = await admin.from("community_notifications").insert(clean);
    if (error && /actor_handle/.test(error.message)) {
      ({ error } = await admin.from("community_notifications").insert(
        clean.map((r) => ({
          user_id: r.user_id,
          kind: r.kind,
          post_id: r.post_id ?? null,
          reply_id: r.reply_id ?? null,
          actor_name: r.actor_name,
          excerpt: r.excerpt,
        })),
      ));
    }
    if (error) {
      console.warn("[community] notification not written", error.message);
      return;
    }
    schedulePushes(admin, clean);
  } catch (e) {
    console.warn("[community] notification not written", e instanceof Error ? e.message : String(e));
  }
}

/**
 * The same rows on the readers' devices (lib/community/push.ts), after the
 * response has gone, so nobody waits on Apple or Google to see their reply
 * posted. Outside a request (a script, a test) there is nothing to wait for
 * and no push is sent.
 */
function schedulePushes(admin: SupabaseClient, rows: NotificationRow[]): void {
  const pushes = rows.map((r) => ({
    user_id: r.user_id,
    kind: r.kind,
    post_id: r.post_id ?? null,
    actor_name: r.actor_name,
    actor_handle: r.actor_handle ?? null,
  }));
  try {
    after(() => sendCommunityPushes(admin, pushes));
  } catch {
    // Not inside a request.
  }
}

/** The readers in `ids` who have blocked `actorId`, so they are not notified by them. */
export async function blockedBy(admin: SupabaseClient, ids: string[], actorId: string): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await admin
    .from("community_blocks")
    .select("blocker_id")
    .eq("blocked_id", actorId)
    .in("blocker_id", ids);
  if (error) return new Set();
  return new Set(((data ?? []) as { blocker_id: string }[]).map((r) => r.blocker_id));
}

/**
 * Tell each reader @mentioned in a post or reply. At most five handles, never
 * the writer, never someone who has blocked them, and in a parish group only
 * the group's own members, so a mention cannot announce a post its reader
 * would not be allowed to open.
 */
export async function notifyMentions({
  admin,
  texts,
  postId,
  replyId,
  actorId,
  actorName,
  actorHandle,
  groupId,
  skip = [],
}: {
  admin: SupabaseClient;
  texts: (string | null | undefined)[];
  postId: string;
  replyId?: string | null;
  actorId: string;
  actorName: string;
  actorHandle: string | null;
  groupId?: string | null;
  /** Readers already told about this by another notification. */
  skip?: string[];
}): Promise<void> {
  try {
    const handles = extractMentions(texts);
    if (handles.length === 0) return;
    const { data } = await admin.from("profiles").select("id, handle").in("handle", handles);
    let ids = ((data ?? []) as { id: string }[]).map((r) => r.id).filter((id) => id !== actorId && !skip.includes(id));
    if (ids.length === 0) return;
    const blocked = await blockedBy(admin, ids, actorId);
    ids = ids.filter((id) => !blocked.has(id));
    if (groupId && ids.length > 0) {
      const { data: members } = await admin
        .from("prayer_campaign_group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .in("user_id", ids);
      const inGroup = new Set(((members ?? []) as { user_id: string }[]).map((m) => m.user_id));
      ids = ids.filter((id) => inGroup.has(id));
    }
    const excerpt = texts.filter(Boolean).join(" ");
    await insertNotifications(
      admin,
      ids.map((id) => ({
        user_id: id,
        kind: "mention" as const,
        post_id: postId,
        reply_id: replyId ?? null,
        actor_name: actorName,
        actor_handle: actorHandle,
        excerpt,
      })),
    );
  } catch (e) {
    console.warn("[community] mentions not notified", e instanceof Error ? e.message : String(e));
  }
}

/**
 * A new question in Ask a Priest, to the verified clergy who answer them
 * (clergy_verifications, 20261005). Never the asker, never clergy who have
 * blocked them, and only for the public feed: a parish group's question is
 * for that parish. Best effort, like everything here.
 */
export async function notifyClergyOfQuestion({
  admin,
  postId,
  actorId,
  actorName,
  actorHandle,
  excerpt,
}: {
  admin: SupabaseClient;
  postId: string;
  actorId: string;
  actorName: string;
  actorHandle: string | null;
  excerpt: string | null;
}): Promise<void> {
  try {
    const { data, error } = await admin.from("clergy_verifications").select("user_id").eq("status", "verified").limit(200);
    if (error) return;
    let ids = ((data ?? []) as { user_id: string }[]).map((r) => r.user_id).filter((id) => id !== actorId);
    if (ids.length === 0) return;
    const blocked = await blockedBy(admin, ids, actorId);
    ids = ids.filter((id) => !blocked.has(id));
    await insertNotifications(
      admin,
      ids.map((id) => ({
        user_id: id,
        kind: "question" as const,
        post_id: postId,
        actor_name: actorName,
        actor_handle: actorHandle,
        excerpt,
      })),
    );
  } catch (e) {
    console.warn("[community] clergy not notified", e instanceof Error ? e.message : String(e));
  }
}
