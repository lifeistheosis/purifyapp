import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { censorPost } from "@/lib/moderation/server";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

import type { CommunityUser } from "./adminStanding";
import { guardEdit } from "./guard";
import { trimExcerpt } from "./notify";
import {
  WITHDRAWN,
  WITHDRAWN_POST_PATCH,
  WITHDRAWN_POST_PATCH_MIN,
  WITHDRAWN_REPLY_PATCH,
  WITHDRAWN_REPLY_PATCH_MIN,
} from "./withdrawn";

// A reader's own posts and replies: editing them and deleting them (1.9,
// build 95 note 10, a reader's ask: "We should have the ability to remove or
// edit our comments under replies and posts").
//
// Service role throughout, called from the routes after they have proved who
// is asking. Every write here names the writer's id as well as the row's, so
// a row that is not theirs is never touched, whatever an earlier read said.
//
// WHAT IS KEPT, AND FOR HOW LONG, is the Privacy Policy's ("Community"):
// posts and replies "are kept until you delete them", and a report "is
// deleted with the post". So:
//
//   - Deleting takes the words away at once. When nobody else has answered,
//     the row goes, and the database takes its reports, its word-filter
//     holds, its notifications, reactions and responses with it. When others
//     have, the row stays as a placeholder with nothing of its writer
//     (./withdrawn.ts), and those same things that carried its words are
//     deleted here by hand, since nothing cascades from a row that stays.
//   - An edit replaces the words. Nothing keeps the words it replaced, which
//     would need a line in the Privacy Policy that is the owner's to write.
//     What moderation needs is kept another way: while a report on it is
//     open, it cannot be edited, so a moderator judges what was reported,
//     not what it was changed to. It can always be deleted.

export type OwnResult =
  | {
      ok: true;
      /** Deleted outright, or kept as a placeholder because others answered. */
      outcome?: "deleted" | "withdrawn";
      /** After an edit: what readers now see. */
      post?: { title: string | null; body: string | null; edited_at: string | null };
      reply?: { body: string; edited_at: string | null };
    }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      preview?: { title: string | null; body: string | null };
      limit?: number;
    };

const NOT_FOUND: OwnResult = { ok: false, status: 404, error: "Not found." };
const NOT_YOURS_POST: OwnResult = { ok: false, status: 403, error: "Not your post." };
const NOT_YOURS_REPLY: OwnResult = { ok: false, status: 403, error: "Not your reply." };
/** A report on it is open, or it is held for a moderator: the words stay as they are until one has looked. */
export const UNDER_REVIEW: OwnResult = {
  ok: false,
  status: 409,
  code: "under_review",
  error: "A moderator is looking at this, so it can't be edited for now. You can still delete it.",
};
/** Before the migration that brings edited_at: an edit would change the words with no "edited" to say so. */
const NO_EDITS_YET: OwnResult = { ok: false, status: 503, code: "edits_unavailable", error: "Editing isn't available yet." };

/** Is there a report on it that a moderator has not decided? */
async function openReport(admin: SupabaseClient, column: "post_id" | "reply_id", id: string): Promise<boolean> {
  const { data, error } = await admin.from("community_reports").select("id").eq(column, id).eq("status", "open").limit(1);
  // Unread is not "none": refusing an edit for an outage is the safe side.
  if (error) return true;
  return (data ?? []).length > 0;
}

/**
 * The word-filter holds still waiting on old words. Approving one puts its
 * original words back over the row (moderation.ts, decideHold), which after
 * an edit would undo the edit with words the writer took out.
 */
async function dropWaitingWordHolds(admin: SupabaseClient, column: "post_id" | "reply_id", id: string): Promise<void> {
  const first = await admin.from("community_text_holds").delete().eq(column, id).eq("status", "pending").eq("reason", "words");
  if (first.error && isColumnAbsent(first.error)) {
    // Before 20261005 every hold is the word filter's.
    await admin.from("community_text_holds").delete().eq(column, id).eq("status", "pending");
  } else if (first.error) {
    console.warn("[community] waiting holds not dropped", first.error.message);
  }
}

/** What a placeholder no longer carries anywhere: its reports, its holds, and the notices that quote it. */
async function forgetWords(admin: SupabaseClient, target: { post_id: string } | { reply_id: string }): Promise<void> {
  const [column, id] = "post_id" in target ? (["post_id", target.post_id] as const) : (["reply_id", target.reply_id] as const);
  const reports = await admin.from("community_reports").delete().eq(column, id);
  if (reports.error) console.warn("[community] reports not deleted", reports.error.message);
  const holds = await admin.from("community_text_holds").delete().eq(column, id);
  if (holds.error) console.warn("[community] holds not deleted", holds.error.message);
  // A post's own notices are those about it and no reply under it (a mention
  // in it, a question to clergy, "approved"); a reply under it is someone
  // else's words, told in a notice of its own, and stays.
  const notices =
    column === "post_id"
      ? await admin.from("community_notifications").delete().eq("post_id", id).is("reply_id", null)
      : await admin.from("community_notifications").delete().eq("reply_id", id);
  if (notices.error) console.warn("[community] notices not deleted", notices.error.message);
}

/**
 * The notices that quote it, made to quote what it says now, each as it was
 * first written (lib/community/notify.ts): a mention quotes a post's title
 * and words together, a question to clergy and "approved" its title or else
 * its words, and every notice about a reply its words.
 */
async function retellExcerpt(
  admin: SupabaseClient,
  target: { post_id: string; title: string | null; body: string | null } | { reply_id: string; body: string },
): Promise<void> {
  const cut = (text: string | null) => (text ? trimExcerpt(text) : null);
  const results =
    "post_id" in target
      ? await Promise.all([
          admin
            .from("community_notifications")
            .update({ excerpt: cut([target.title, target.body].filter(Boolean).join(" ")) })
            .eq("post_id", target.post_id)
            .is("reply_id", null)
            .eq("kind", "mention"),
          admin
            .from("community_notifications")
            .update({ excerpt: cut(target.title || target.body) })
            .eq("post_id", target.post_id)
            .is("reply_id", null)
            .in("kind", ["question", "approved"]),
        ])
      : [
          await admin
            .from("community_notifications")
            .update({ excerpt: cut(target.body) })
            .eq("reply_id", target.reply_id)
            .in("kind", ["reply", "answer", "mention", "approved"]),
        ];
  for (const res of results) if (res.error) console.warn("[community] notices not retold", res.error.message);
}

/** A check the table refused (23514): the state 'withdrawn' is not allowed yet. */
const refusedByCheck = (e: { code?: string | null } | null | undefined) => e?.code === "23514";

// ── Deleting ────────────────────────────────────────────────────────────────

/**
 * Delete your own post. Never a prayer campaign's thread, which goes only
 * with its campaign (lib/campaigns/thread.ts), and which answers as a post
 * that is not there, as every other read of Community does.
 */
export async function removeOwnPost(admin: SupabaseClient, userId: string, id: string): Promise<OwnResult> {
  const { data } = await admin.from("community_posts").select("id, user_id, status").eq("id", id).maybeSingle();
  const row = data as { id: string; user_id: string; status: string } | null;
  if (!row || row.status === "campaign" || row.status === WITHDRAWN) return NOT_FOUND;
  if (row.user_id !== userId) return NOT_YOURS_POST;

  // Others answered while it was up: their replies stay, under a placeholder.
  if (row.status === "visible") {
    const { data: others } = await admin
      .from("community_post_replies")
      .select("id")
      .eq("post_id", id)
      .eq("status", "visible")
      .neq("user_id", userId)
      .limit(1);
    if ((others ?? []).length > 0) {
      const write = (patch: Record<string, unknown>) =>
        admin.from("community_posts").update(patch).eq("id", id).eq("user_id", userId).eq("status", "visible").select("id");
      let { data: done, error } = await write({ ...WITHDRAWN_POST_PATCH });
      if (error && isColumnAbsent(error)) ({ data: done, error } = await write({ ...WITHDRAWN_POST_PATCH_MIN }));
      if (!error && (done ?? []).length > 0) {
        await forgetWords(admin, { post_id: id });
        return { ok: true, outcome: "withdrawn" };
      }
      // Before this release's migration the table knows no 'withdrawn': the
      // post is deleted as it always was, replies and all.
      // Its state changed a moment ago (held by reports, or removed): it is
      // deleted below, as a post that was not up always was.
      if (error && !refusedByCheck(error)) {
        console.warn("[community] post not withdrawn", error.message);
        return { ok: false, status: 500, error: "Couldn't delete it." };
      }
    }
  }

  const { error } = await admin.from("community_posts").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, status: 500, error: "Couldn't delete it." };
  return { ok: true, outcome: "deleted" };
}

/**
 * Delete your own reply in Community. A comment under a prayer campaign is
 * taken off from the campaign, in the campaign's own way (removeNote in
 * lib/campaigns/thread.ts), and is not found here.
 */
export async function removeOwnReply(admin: SupabaseClient, userId: string, id: string): Promise<OwnResult> {
  const { data } = await admin.from("community_post_replies").select("id, post_id, user_id, status, created_at").eq("id", id).maybeSingle();
  const reply = data as { id: string; post_id: string; user_id: string; status: string; created_at: string } | null;
  if (!reply || reply.status === WITHDRAWN) return NOT_FOUND;
  const { data: parentRow } = await admin.from("community_posts").select("id, status").eq("id", reply.post_id).maybeSingle();
  const parent = parentRow as { id: string; status: string } | null;
  if (!parent || parent.status === "campaign") return NOT_FOUND;
  if (reply.user_id !== userId) return NOT_YOURS_REPLY;

  const counted = reply.status === "visible";
  const recount = async () => {
    // The post's count follows only a reply that was being counted.
    if (!counted) return;
    const { error } = await admin.rpc("community_bump_reply_count", { p_post_id: reply.post_id, p_delta: -1 });
    if (error) console.warn("[community] reply_count bump failed", error.message);
  };

  // Someone else answered after it, in a thread readers can open: the
  // placeholder keeps their answer from hanging under nothing.
  if (counted && (parent.status === "visible" || parent.status === WITHDRAWN)) {
    const { data: later } = await admin
      .from("community_post_replies")
      .select("id")
      .eq("post_id", reply.post_id)
      .eq("status", "visible")
      .neq("user_id", userId)
      .gt("created_at", reply.created_at)
      .limit(1);
    if ((later ?? []).length > 0) {
      const write = (patch: Record<string, unknown>) =>
        admin.from("community_post_replies").update(patch).eq("id", id).eq("user_id", userId).eq("status", "visible").select("id");
      let { data: done, error } = await write({ ...WITHDRAWN_REPLY_PATCH });
      if (error && isColumnAbsent(error)) ({ data: done, error } = await write({ ...WITHDRAWN_REPLY_PATCH_MIN }));
      if (!error && (done ?? []).length > 0) {
        await forgetWords(admin, { reply_id: id });
        await recount();
        return { ok: true, outcome: "withdrawn" };
      }
      if (error && !refusedByCheck(error)) {
        console.warn("[community] reply not withdrawn", error.message);
        return { ok: false, status: 500, error: "Couldn't delete it." };
      }
    }
  }

  const { error } = await admin.from("community_post_replies").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, status: 500, error: "Couldn't delete it." };
  await recount();
  return { ok: true, outcome: "deleted" };
}

// ── Editing ─────────────────────────────────────────────────────────────────

type Editor = CommunityUser & Pick<User, "created_at">;

/** The words of a post as its kind takes them: a discussion's title and words, a share's own words only. */
export function postEditWords(
  kind: string,
  input: { title?: string | null; body?: string | null },
): { ok: true; title: string | null; body: string | null } | { ok: false; error: string } {
  if (kind === "discussion") {
    const title = input.title?.trim() || null;
    const body = input.body?.trim() ?? "";
    if (body.length < 2) return { ok: false, error: "Write a little more before posting." };
    return { ok: true, title, body };
  }
  // A shared verse or a Father's line is Purify's own, from the library,
  // verbatim (docs/editorial-standards.md): never changed by anyone. What the
  // reader wrote beside it is theirs to change. A share has no title.
  return { ok: true, title: null, body: input.body?.trim() || null };
}

/**
 * Edit your own post. The same word filter and spam filter as posting; no
 * new notifications (an @mention added later tells nobody); the notices
 * that quote it are made to quote the new words.
 */
export async function editOwnPost(
  admin: SupabaseClient,
  user: Editor,
  id: string,
  input: { title?: string | null; body?: string | null; confirmFiltered?: boolean },
  isMember: (groupId: string) => Promise<boolean>,
  now: Date = new Date(),
): Promise<OwnResult> {
  const read = (cols: string) => admin.from("community_posts").select(cols).eq("id", id).maybeSingle();
  const first = await read("id, user_id, status, kind, title, body, group_id, edited_at");
  if (first.error && isColumnAbsent(first.error)) return NO_EDITS_YET;
  const row = first.data as unknown as {
    user_id: string;
    status: string;
    kind: string;
    title: string | null;
    body: string | null;
    group_id: string | null;
  } | null;
  if (!row || row.status === "campaign" || row.status === WITHDRAWN || row.status === "removed") return NOT_FOUND;
  if (row.user_id !== user.id) return NOT_YOURS_POST;
  if (row.status !== "visible") return UNDER_REVIEW;
  // Writing in a parish's thread needs its membership, as posting there does.
  if (row.group_id && !(await isMember(row.group_id))) return NOT_FOUND;

  const words = postEditWords(row.kind, input);
  if (!words.ok) return { ok: false, status: 400, error: words.error };
  // Nothing changed: nothing is written, and it is not marked edited.
  if (words.title === (row.title ?? null) && words.body === (row.body ?? null)) {
    return { ok: true, post: { title: row.title, body: row.body, edited_at: (first.data as { edited_at?: string | null }).edited_at ?? null } };
  }
  if (await openReport(admin, "post_id", id)) return UNDER_REVIEW;

  const censored = await censorPost(admin, { title: words.title, body: words.body });
  if (censored.hits > 0 && !input.confirmFiltered) {
    return {
      ok: false,
      status: 409,
      code: "filtered",
      error: "Some words in this post will be hidden until a moderator reviews them.",
      preview: { title: censored.title, body: censored.body },
    };
  }
  const guard = await guardEdit(admin, user, [words.title, words.body]);
  if (guard.kind === "refuse") return { ok: false, status: guard.status, code: guard.code, error: guard.error, limit: guard.limit };

  const editedAt = now.toISOString();
  const { data: written, error } = await admin
    .from("community_posts")
    .update({ title: censored.title, body: censored.body, edited_at: editedAt })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "visible")
    .select("id");
  if (error) {
    if (isColumnAbsent(error)) return NO_EDITS_YET;
    console.warn("[community] post edit failed", error.message);
    return { ok: false, status: 500, error: "Couldn't save your edit. Please try again." };
  }
  // Held or taken down a moment ago: nothing was written.
  if ((written ?? []).length === 0) return UNDER_REVIEW;

  await dropWaitingWordHolds(admin, "post_id", id);
  if (censored.hits > 0) {
    const { error: holdError } = await admin
      .from("community_text_holds")
      .insert({ post_id: id, original_title: words.title, original_body: words.body, hits: censored.hits });
    if (holdError) console.warn("[community] filter hold not written", holdError.message);
  }
  await retellExcerpt(admin, { post_id: id, title: censored.title, body: censored.body });
  return { ok: true, post: { title: censored.title, body: censored.body, edited_at: editedAt } };
}

/** Edit your own reply in Community, by the same rules as a post. */
export async function editOwnReply(
  admin: SupabaseClient,
  user: Editor,
  id: string,
  input: { body: string; confirmFiltered?: boolean },
  isMember: (groupId: string) => Promise<boolean>,
  now: Date = new Date(),
): Promise<OwnResult> {
  const first = await admin.from("community_post_replies").select("id, post_id, user_id, status, body, edited_at").eq("id", id).maybeSingle();
  if (first.error && isColumnAbsent(first.error)) return NO_EDITS_YET;
  const reply = first.data as { post_id: string; user_id: string; status: string; body: string; edited_at?: string | null } | null;
  if (!reply || reply.status === WITHDRAWN || reply.status === "removed") return NOT_FOUND;
  const { data: parentRow } = await admin.from("community_posts").select("id, status, group_id").eq("id", reply.post_id).maybeSingle();
  const parent = parentRow as { status: string; group_id: string | null } | null;
  if (!parent || parent.status === "campaign" || parent.status === "removed") return NOT_FOUND;
  if (reply.user_id !== user.id) return NOT_YOURS_REPLY;
  if (reply.status !== "visible" || parent.status === "held") return UNDER_REVIEW;
  if (parent.group_id && !(await isMember(parent.group_id))) return NOT_FOUND;

  const body = input.body.trim();
  if (body.length < 1) return { ok: false, status: 400, error: "Write a little more before posting." };
  if (body === reply.body) return { ok: true, reply: { body: reply.body, edited_at: reply.edited_at ?? null } };
  if (await openReport(admin, "reply_id", id)) return UNDER_REVIEW;

  const censored = await censorPost(admin, { body });
  if (censored.hits > 0 && !input.confirmFiltered) {
    return {
      ok: false,
      status: 409,
      code: "filtered",
      error: "Some words in this reply will be hidden until a moderator reviews them.",
      preview: { title: null, body: censored.body },
    };
  }
  const guard = await guardEdit(admin, user, [body]);
  if (guard.kind === "refuse") return { ok: false, status: guard.status, code: guard.code, error: guard.error, limit: guard.limit };

  const shown = censored.body ?? body;
  const editedAt = now.toISOString();
  const { data: written, error } = await admin
    .from("community_post_replies")
    .update({ body: shown, edited_at: editedAt })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "visible")
    .select("id");
  if (error) {
    if (isColumnAbsent(error)) return NO_EDITS_YET;
    console.warn("[community] reply edit failed", error.message);
    return { ok: false, status: 500, error: "Couldn't save your edit. Please try again." };
  }
  if ((written ?? []).length === 0) return UNDER_REVIEW;

  await dropWaitingWordHolds(admin, "reply_id", id);
  if (censored.hits > 0) {
    const { error: holdError } = await admin.from("community_text_holds").insert({ reply_id: id, original_body: body, hits: censored.hits });
    if (holdError) console.warn("[community] filter hold not written", holdError.message);
  }
  await retellExcerpt(admin, { reply_id: id, body: shown });
  return { ok: true, reply: { body: shown, edited_at: editedAt } };
}
