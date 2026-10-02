import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin/access";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { identity } from "@/lib/profile/server";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

import { insertNotifications, notifyClergyOfQuestion, notifyMentions, notifyOfReply } from "./notify";
import { STAFF_BADGES } from "./trustServer";

// Moderation, once, for everyone who moderates: the team's console
// (/admin, behind the email allowlist) and readers holding the Moderator
// badge, who work the same queue from their phone (/community/moderate).
// Every action is written to community_mod_log with who took it.
//
// Service role throughout. A moderator never learns a reader's auth id or
// email from any of this: reports and holds are addressed by their own ids.

export type ModActor = {
  /** Null for the filters acting on their own. */
  id: string | null;
  name: string;
  email: string | null;
  /** An admin by email: the team's console, word lists, pins. */
  admin: boolean;
};

export const AUTO: ModActor = { id: null, name: "Auto-moderation", email: null, admin: false };

/** The signed-in reader as a moderator, or null when they are not one. */
export async function moderatorFor(admin: SupabaseClient, user: Pick<User, "id" | "email">): Promise<ModActor | null> {
  const byEmail = isAdminEmail(user.email);
  if (!byEmail) {
    const { data, error } = await admin
      .from("user_badges")
      .select("badge")
      .eq("user_id", user.id)
      .in("badge", [...STAFF_BADGES])
      .limit(1);
    if (error || (data ?? []).length === 0) return null;
  }
  const { data: row } = await admin.from("profiles").select("id, display_name, avatar_url").eq("id", user.id).maybeSingle();
  const name = row
    ? (await identity(admin, row as { id: string; display_name: string | null; avatar_url?: string | null })).name
    : "Moderator";
  return { id: user.id, name, email: user.email ?? null, admin: byEmail };
}

export type LogTarget = "post" | "reply" | "profile" | "report" | "hold" | "term" | "clergy";

/** Write one line to the log. Best effort: a missing table never fails an action. */
export async function logMod(
  admin: SupabaseClient,
  actor: ModActor,
  entry: { action: string; target: LogTarget | null; targetId?: string | null; summary?: string | null },
): Promise<void> {
  try {
    const { error } = await admin.from("community_mod_log").insert({
      actor_id: actor.id,
      actor_name: actor.name.slice(0, 80),
      actor_email: actor.email,
      action: entry.action.slice(0, 60),
      target_kind: entry.target,
      target_id: entry.targetId ?? null,
      summary: entry.summary ? entry.summary.replace(/\s+/g, " ").trim().slice(0, 300) : null,
    });
    if (error && !isTableAbsent(error)) console.warn("[moderation] log not written", error.message);
  } catch (e) {
    console.warn("[moderation] log not written", e instanceof Error ? e.message : String(e));
  }
}

export type ModLogRow = {
  id: string;
  actor_name: string;
  action: string;
  target_kind: string | null;
  target_id: string | null;
  summary: string | null;
  created_at: string;
};

/** The latest log lines. The team's console also sees the address that acted. */
export async function readModLog(
  admin: SupabaseClient,
  opts: { limit?: number; withEmail?: boolean } = {},
): Promise<{ rows: (ModLogRow & { actor_email?: string | null })[]; live: boolean }> {
  const cols = `id, actor_name, action, target_kind, target_id, summary, created_at${opts.withEmail ? ", actor_email" : ""}`;
  const { data, error } = await admin
    .from("community_mod_log")
    .select(cols)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 60);
  if (error) {
    if (isTableAbsent(error)) return { rows: [], live: false };
    throw new Error(error.message);
  }
  return { rows: (data ?? []) as unknown as (ModLogRow & { actor_email?: string | null })[], live: true };
}

// ── The queue ───────────────────────────────────────────────────────────────

export const HOLD_COLS =
  "id, post_id, reply_id, reason, detail, original_title, original_body, hits, created_at, post:community_posts(id, kind, title, body, quote_text, quote_source, author_name, author_handle, status), reply:community_post_replies(id, post_id, body, author_name, author_handle, status)";
/** Before 20261005: no reason or detail, every hold is the word filter's. */
const HOLD_COLS_BEFORE_REASON = HOLD_COLS.replace("reason, detail, ", "");

/** Everything waiting for a decision, newest first. */
export async function readPendingHolds(admin: SupabaseClient): Promise<{ rows: Record<string, unknown>[]; live: boolean }> {
  const read = (cols: string) =>
    admin.from("community_text_holds").select(cols).eq("status", "pending").order("created_at", { ascending: false }).limit(100);
  let { data, error } = await read(HOLD_COLS);
  if (error && isColumnAbsent(error)) {
    ({ data, error } = await read(HOLD_COLS_BEFORE_REASON));
    if (!error) data = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({ ...r, reason: "words", detail: null })) as never;
  }
  if (error) {
    if (isTableAbsent(error)) return { rows: [], live: false };
    throw new Error(error.message);
  }
  return { rows: (data ?? []) as unknown as Record<string, unknown>[], live: true };
}

const REPORT_COLS =
  "id, post_id, reply_id, reason, created_at, post:community_posts(id, kind, title, body, quote_text, quote_source, author_name, status), reply:community_post_replies(id, post_id, body, author_name, status)";

/**
 * The reported profile beside each profile report: its handle, name and the
 * reader-written parts a moderator might clear. Read separately rather than
 * embedded, because community_reports.profile_id points at auth.users and
 * PostgREST cannot follow that to public.profiles.
 */
async function withReportedProfiles<T extends { profile_id?: string | null }>(admin: SupabaseClient, rows: T[]) {
  const ids = [...new Set(rows.map((r) => r.profile_id).filter((v): v is string => Boolean(v)))];
  if (ids.length === 0) return rows.map((r) => ({ ...r, profile: null }));
  const read = (cols: string) => admin.from("profiles").select(cols).in("id", ids);
  // parish arrives with 20261002_community_social.sql; before it, without.
  let { data, error } = await read("id, handle, display_name, bio, status_text, banner_url, parish");
  if (error && isColumnAbsent(error)) ({ data, error } = await read("id, handle, display_name, bio, status_text, banner_url"));
  type P = {
    id: string;
    handle: string | null;
    display_name: string | null;
    bio: string | null;
    status_text: string | null;
    banner_url: string | null;
    parish?: string | null;
  };
  const byId = new Map(((data ?? []) as unknown as P[]).map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = r.profile_id ? byId.get(r.profile_id) : undefined;
    return {
      ...r,
      profile: p
        ? { handle: p.handle, name: p.display_name, bio: p.bio, status: p.status_text, banner_url: p.banner_url, parish: p.parish ?? null }
        : null,
    };
  });
}

/**
 * Open reports on posts, replies and profiles, each with what was reported.
 * The profile_id itself is dropped before anything leaves: a moderator acts
 * on a profile by the report's id.
 */
export async function readOpenReports(admin: SupabaseClient): Promise<Record<string, unknown>[]> {
  const query = (cols: string) =>
    admin.from("community_reports").select(cols).eq("status", "open").order("created_at", { ascending: false }).limit(100);
  const first = await query(`${REPORT_COLS}, profile_id`);
  const result = isColumnAbsent(first.error) ? await query(REPORT_COLS) : first;
  if (result.error) throw new Error(result.error.message);
  const rows = await withReportedProfiles(
    admin,
    (result.data ?? []) as unknown as ({ profile_id?: string | null } & Record<string, unknown>)[],
  );
  // The auth id leaves here as a yes or no, never as itself.
  return rows.map(({ profile_id, ...rest }) => ({ ...rest, is_profile: Boolean(profile_id) }));
}

// ── The actions ─────────────────────────────────────────────────────────────

export const MOD_ACTIONS = [
  "remove_post",
  "remove_reply",
  "restore_post",
  "restore_reply",
  "dismiss_report",
  "approve_hold",
  "keep_hold",
  "remove_hold",
  "clear_profile",
  "reset_handle",
] as const;
export type ModAction = (typeof MOD_ACTIONS)[number];

export type ModResult = { ok: true } | { ok: false; status: number; error: string };

type Hold = {
  id: string;
  post_id: string | null;
  reply_id: string | null;
  reason?: string | null;
  original_title: string | null;
  original_body: string | null;
  status: string;
};

const PLAIN_HANDLE = () => `reader${Math.floor(100000 + Math.random() * 900000)}`;

function excerpt(text: string | null | undefined, max = 80): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

async function resolveHolds(
  admin: SupabaseClient,
  actor: ModActor,
  target: { post_id?: string; reply_id?: string },
  status: "approved" | "removed",
  only?: (reason: string) => boolean,
): Promise<string[]> {
  const column = target.post_id ? "post_id" : "reply_id";
  const id = (target.post_id ?? target.reply_id) as string;
  const { data, error } = await admin.from("community_text_holds").select("id, reason").eq(column, id).eq("status", "pending");
  let rows = (data ?? []) as { id: string; reason?: string | null }[];
  if (error && isColumnAbsent(error)) {
    const legacy = await admin.from("community_text_holds").select("id").eq(column, id).eq("status", "pending");
    rows = ((legacy.data ?? []) as { id: string }[]).map((r) => ({ ...r, reason: "words" }));
  } else if (error) return [];
  const chosen = rows.filter((r) => !only || only(r.reason ?? "words"));
  if (chosen.length > 0) {
    await admin
      .from("community_text_holds")
      .update({ status, resolved_by_email: actor.email ?? actor.name, resolved_at: new Date().toISOString() })
      .in(
        "id",
        chosen.map((r) => r.id),
      );
  }
  return chosen.map((r) => r.reason ?? "words");
}

async function closeReports(
  admin: SupabaseClient,
  actor: ModActor,
  target: { post_id?: string; reply_id?: string; profile_id?: string },
  status: "actioned" | "dismissed",
) {
  const [column, id] = Object.entries(target)[0] as [string, string];
  await admin
    .from("community_reports")
    .update({ status, handled_by_email: actor.email ?? actor.name, handled_at: new Date().toISOString() })
    .eq(column, id)
    .eq("status", "open");
}

const HELD_AT_WRITE = (reason: string) => reason === "spam" || reason === "links" || reason === "new_account";

async function removePost(admin: SupabaseClient, actor: ModActor, id: string, reason?: string | null): Promise<ModResult> {
  const { data: post } = await admin.from("community_posts").select("id, title, body, author_name").eq("id", id).maybeSingle();
  if (!post) return { ok: false, status: 404, error: "That post is gone." };
  const { error } = await admin
    .from("community_posts")
    .update({ status: "removed", removed_reason: reason?.trim() || null, removed_by_email: actor.email ?? actor.name })
    .eq("id", id);
  if (error) return { ok: false, status: 500, error: error.message };
  await closeReports(admin, actor, { post_id: id }, "actioned");
  await resolveHolds(admin, actor, { post_id: id }, "removed");
  const p = post as { title: string | null; body: string | null; author_name: string };
  await logMod(admin, actor, { action: "remove_post", target: "post", targetId: id, summary: `${p.author_name}: ${excerpt(p.title || p.body)}` });
  return { ok: true };
}

async function removeReply(admin: SupabaseClient, actor: ModActor, id: string, reason?: string | null): Promise<ModResult> {
  const { data: reply } = await admin.from("community_post_replies").select("post_id, status, body, author_name").eq("id", id).maybeSingle();
  if (!reply) return { ok: false, status: 404, error: "That reply is gone." };
  const r = reply as { post_id: string; status: string; body: string; author_name: string };
  const { error } = await admin
    .from("community_post_replies")
    .update({ status: "removed", removed_reason: reason?.trim() || null, removed_by_email: actor.email ?? actor.name })
    .eq("id", id);
  if (error) return { ok: false, status: 500, error: error.message };
  // The parent's counter follows only a reply that was being counted.
  if (r.status === "visible") await admin.rpc("community_bump_reply_count", { p_post_id: r.post_id, p_delta: -1 });
  await closeReports(admin, actor, { reply_id: id }, "actioned");
  await resolveHolds(admin, actor, { reply_id: id }, "removed");
  await logMod(admin, actor, { action: "remove_reply", target: "reply", targetId: id, summary: `${r.author_name}: ${excerpt(r.body)}` });
  return { ok: true };
}

/**
 * Put back something that was hidden: held by the spam filter, or hidden by
 * reports. It stays up after this, whatever more reports say, until someone
 * removes it by hand. What was held when it was written also sends, now, the
 * notifications it would have sent then.
 */
async function restorePost(admin: SupabaseClient, actor: ModActor, id: string): Promise<ModResult> {
  const read = (cols: string) => admin.from("community_posts").select(cols).eq("id", id).maybeSingle();
  const first = await read("id, user_id, status, title, body, author_name, author_handle, group_id, category");
  // category arrives with 20261005; before it, no post is a question.
  const { data } = isColumnAbsent(first.error)
    ? await read("id, user_id, status, title, body, author_name, author_handle, group_id")
    : first;
  const post = data as unknown as {
    id: string;
    user_id: string;
    status: string;
    title: string | null;
    body: string | null;
    author_name: string;
    author_handle: string | null;
    group_id: string | null;
    category?: string | null;
  } | null;
  if (!post) return { ok: false, status: 404, error: "That post is gone." };
  if (post.status !== "held") return { ok: false, status: 409, error: "That post is not hidden." };
  const now = new Date().toISOString();
  const { error } = await admin.from("community_posts").update({ status: "visible", mod_cleared_at: now }).eq("id", id);
  if (error) return { ok: false, status: 500, error: error.message };
  await closeReports(admin, actor, { post_id: id }, "dismissed");
  const reasons = await resolveHolds(admin, actor, { post_id: id }, "approved", (r) => r !== "words");
  if (reasons.some(HELD_AT_WRITE)) {
    await insertNotifications(admin, [
      { user_id: post.user_id, kind: "approved", post_id: id, actor_name: "Purify", excerpt: post.title || post.body },
    ]);
    await notifyMentions({
      admin,
      texts: [post.title, post.body],
      postId: id,
      actorId: post.user_id,
      actorName: post.author_name,
      actorHandle: post.author_handle,
      groupId: post.group_id,
    });
    // A question waited with its notifications: clergy hear of it now.
    if (post.category === "question" && !post.group_id) {
      await notifyClergyOfQuestion({
        admin,
        postId: id,
        actorId: post.user_id,
        actorName: post.author_name,
        actorHandle: post.author_handle,
        excerpt: post.title || post.body,
      });
    }
  }
  await logMod(admin, actor, { action: "restore_post", target: "post", targetId: id, summary: `${post.author_name}: ${excerpt(post.title || post.body)}` });
  return { ok: true };
}

async function restoreReply(admin: SupabaseClient, actor: ModActor, id: string): Promise<ModResult> {
  const { data } = await admin
    .from("community_post_replies")
    .select("id, post_id, user_id, status, body, author_name, author_handle")
    .eq("id", id)
    .maybeSingle();
  const reply = data as {
    id: string;
    post_id: string;
    user_id: string;
    status: string;
    body: string;
    author_name: string;
    author_handle: string | null;
  } | null;
  if (!reply) return { ok: false, status: 404, error: "That reply is gone." };
  if (reply.status !== "held") return { ok: false, status: 409, error: "That reply is not hidden." };
  const { error } = await admin
    .from("community_post_replies")
    .update({ status: "visible", mod_cleared_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, status: 500, error: error.message };
  await admin.rpc("community_bump_reply_count", { p_post_id: reply.post_id, p_delta: 1 });
  await closeReports(admin, actor, { reply_id: id }, "dismissed");
  const reasons = await resolveHolds(admin, actor, { reply_id: id }, "approved", (r) => r !== "words");
  if (reasons.some(HELD_AT_WRITE)) {
    const { data: parent } = await admin.from("community_posts").select("group_id").eq("id", reply.post_id).maybeSingle();
    await insertNotifications(admin, [
      { user_id: reply.user_id, kind: "approved", post_id: reply.post_id, reply_id: id, actor_name: "Purify", excerpt: reply.body },
    ]);
    const told = await notifyOfReply({
      admin,
      postId: reply.post_id,
      replyId: id,
      actorId: reply.user_id,
      actorName: reply.author_name,
      actorHandle: reply.author_handle,
      excerpt: reply.body,
    });
    await notifyMentions({
      admin,
      texts: [reply.body],
      postId: reply.post_id,
      replyId: id,
      actorId: reply.user_id,
      actorName: reply.author_name,
      actorHandle: reply.author_handle,
      groupId: (parent as { group_id?: string | null } | null)?.group_id ?? null,
      skip: told ? [told] : [],
    });
  }
  await logMod(admin, actor, { action: "restore_reply", target: "reply", targetId: id, summary: `${reply.author_name}: ${excerpt(reply.body)}` });
  return { ok: true };
}

async function decideHold(admin: SupabaseClient, actor: ModActor, action: "approve_hold" | "keep_hold" | "remove_hold", id: string): Promise<ModResult> {
  const first = await admin
    .from("community_text_holds")
    .select("id, post_id, reply_id, reason, original_title, original_body, status")
    .eq("id", id)
    .maybeSingle();
  let hold = first.data as Hold | null;
  if (first.error && isColumnAbsent(first.error)) {
    const legacy = await admin
      .from("community_text_holds")
      .select("id, post_id, reply_id, original_title, original_body, status")
      .eq("id", id)
      .maybeSingle();
    hold = legacy.data ? ({ ...(legacy.data as Hold), reason: "words" } as Hold) : null;
  }
  if (!hold) return { ok: false, status: 404, error: "That item is not in the queue." };
  if (hold.status !== "pending") return { ok: false, status: 409, error: "Already decided." };
  const reason = hold.reason ?? "words";

  if (action === "remove_hold") {
    return hold.post_id ? removePost(admin, actor, hold.post_id, "Held for review") : removeReply(admin, actor, hold.reply_id as string, "Held for review");
  }

  if (reason !== "words") {
    // Held from everyone: approving shows it, and there is nothing to keep.
    if (action === "keep_hold") return { ok: false, status: 400, error: "Approve or remove this one." };
    return hold.post_id ? restorePost(admin, actor, hold.post_id) : restoreReply(admin, actor, hold.reply_id as string);
  }

  // The word filter's: the post is up with words masked.
  let error: { message: string } | null = null;
  if (action === "approve_hold") {
    // As written: the original words back in the public row.
    if (hold.post_id) {
      ({ error } = await admin
        .from("community_posts")
        .update({ title: hold.original_title, body: hold.original_body })
        .eq("id", hold.post_id));
    } else if (hold.reply_id && hold.original_body) {
      ({ error } = await admin.from("community_post_replies").update({ body: hold.original_body }).eq("id", hold.reply_id));
    }
  }
  if (error) return { ok: false, status: 500, error: "That could not be done. Nothing changed." };
  await admin
    .from("community_text_holds")
    .update({
      status: action === "approve_hold" ? "approved" : "kept",
      resolved_by_email: actor.email ?? actor.name,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", hold.id);
  await logMod(admin, actor, {
    action: action === "approve_hold" ? "approve_words" : "keep_masked",
    target: hold.post_id ? "post" : "reply",
    targetId: hold.post_id ?? hold.reply_id,
    summary: excerpt(hold.original_title || hold.original_body),
  });
  return { ok: true };
}

async function profileAction(admin: SupabaseClient, actor: ModActor, action: "clear_profile" | "reset_handle", reportId: string): Promise<ModResult> {
  const { data: rep } = await admin.from("community_reports").select("profile_id").eq("id", reportId).maybeSingle<{ profile_id: string | null }>();
  const profileId = rep?.profile_id ?? null;
  if (!profileId) return { ok: false, status: 400, error: "That report is not about a profile." };
  const { data: before } = await admin.from("profiles").select("handle, banner_url").eq("id", profileId).maybeSingle<{ handle: string | null; banner_url: string | null }>();
  let error: { message: string; code?: string } | null = null;
  if (action === "clear_profile") {
    ({ error } = await admin.from("profiles").update({ bio: null, status_text: null, banner_url: null, parish: null, social_links: [] }).eq("id", profileId));
    if (error && isColumnAbsent(error)) {
      ({ error } = await admin.from("profiles").update({ bio: null, status_text: null, banner_url: null, parish: null }).eq("id", profileId));
    }
    if (error && isColumnAbsent(error)) {
      ({ error } = await admin.from("profiles").update({ bio: null, status_text: null, banner_url: null }).eq("id", profileId));
    }
    // Banners live under b/<uuid> in the public avatars bucket
    // (app/api/profile/banner/route.ts); anything else is not ours to delete.
    const marker = "/storage/v1/object/public/avatars/";
    const at = before?.banner_url ? before.banner_url.indexOf(marker) : -1;
    const path = at >= 0 ? decodeURIComponent((before!.banner_url as string).slice(at + marker.length).split("?")[0]) : null;
    if (!error && path && /^b\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(path)) {
      const { error: delError } = await admin.storage.from("avatars").remove([path]);
      if (delError) console.warn("[moderation] banner not deleted", path, delError.message);
    }
  } else {
    // A few tries: a clash on six random digits is unlikely, not impossible.
    for (let i = 0; i < 5; i++) {
      ({ error } = await admin.from("profiles").update({ handle: PLAIN_HANDLE(), handle_changed_at: new Date().toISOString() }).eq("id", profileId));
      if (!error || error.code !== "23505") break;
    }
  }
  if (error) return { ok: false, status: 500, error: error.message };
  await closeReports(admin, actor, { profile_id: profileId }, "actioned");
  await logMod(admin, actor, {
    action,
    target: "profile",
    targetId: reportId,
    summary: before?.handle ? `@${before.handle}` : null,
  });
  return { ok: true };
}

/** Run one moderation action as `actor`. */
export async function runModAction(
  admin: SupabaseClient,
  actor: ModActor,
  action: ModAction,
  id: string,
  reason?: string | null,
): Promise<ModResult> {
  switch (action) {
    case "remove_post":
      return removePost(admin, actor, id, reason);
    case "remove_reply":
      return removeReply(admin, actor, id, reason);
    case "restore_post":
      return restorePost(admin, actor, id);
    case "restore_reply":
      return restoreReply(admin, actor, id);
    case "approve_hold":
    case "keep_hold":
    case "remove_hold":
      return decideHold(admin, actor, action, id);
    case "clear_profile":
    case "reset_handle":
      return profileAction(admin, actor, action, id);
    case "dismiss_report": {
      // Dismissing is recorded, not deleted: a post reported five times and
      // dismissed five times reads very differently from one reported once.
      const { data: rep } = await admin.from("community_reports").select("id, status").eq("id", id).maybeSingle();
      if (!rep) return { ok: false, status: 404, error: "That report is gone." };
      const { error } = await admin
        .from("community_reports")
        .update({ status: "dismissed", handled_by_email: actor.email ?? actor.name, handled_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return { ok: false, status: 500, error: error.message };
      await logMod(admin, actor, { action: "dismiss_report", target: "report", targetId: id });
      return { ok: true };
    }
  }
}
