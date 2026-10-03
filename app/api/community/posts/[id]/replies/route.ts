import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { AUTHOR_MARK_COLS, deriveAuthorMark } from "@/lib/community/authorMark";
import { avatarSrc } from "@/lib/community/avatarSrc";
import { isDecoration, isNameColor } from "@/lib/profile/cosmetics";
import { isClergyMark } from "@/lib/profile/clergy";
import { hiddenAuthors, personalisedCacheHeaders } from "@/lib/community/blocks";
import { guardWrite } from "@/lib/community/guard";
import { communityEnabled } from "@/lib/community/flags";
import { callerIsGroupMember } from "@/lib/community/groupAccess";
import { notifyMentions, notifyOfReply } from "@/lib/community/notify";
import { censorName, censorPost } from "@/lib/moderation/server";
import { ensureCleanHandle } from "@/lib/profile/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { communityReplySchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { createClientFromRequest } from "@/lib/supabase/server";

// `user_id` is deliberately not selected; see the note in ../../route.ts.
//
// author_plus_until and author_pro_until are the supporter mark's two
// denormalised timestamps (20260905000100_community_author_mark.sql). They are
// selected so publicReply() can compare them to the clock, and they are
// never emitted. REPLY_COLS_BEFORE_MARK is read instead when the migration
// has not been applied.
// like_count and dislike_count sit in the base set, not beside the mark:
// they arrived with 20260826, which is older than the mark's 20260905, so any
// database that can serve a reply at all already has them. They were never
// selected before, which is the whole reason a reply could not be liked:
// the table, the trigger, the reactions route and the button all supported
// replies, and the one read that feeds the thread left the counts out.
const REPLY_COLS_BEFORE_MARK =
  "id, post_id, body, author_name, author_avatar, like_count, dislike_count, created_at";
const REPLY_COLS = `${REPLY_COLS_BEFORE_MARK}, ${AUTHOR_MARK_COLS}`;
// The author's @handle and avatar frame (20261001000000_profiles_badges.sql), with
// REPLY_COLS as the fallback while that migration is unapplied.
const REPLY_COLS_WITH_PROFILE = `${REPLY_COLS}, author_handle, author_decoration`;
// The clergy seal, the Plus name colour and the three responses
// (20261005000000_community_three.sql), with the sets above as the fallback.
const REPLY_COLS_THREE = `${REPLY_COLS_WITH_PROFILE}, author_clergy, author_name_color, amen_count, praying_count, glory_count`;

const count = (v: unknown) => (typeof v === "number" && v > 0 ? v : 0);

/**
 * The row a reader receives. An explicit projection, as in ../../route.ts:
 * this used to hand the client `data` as read, which was fine while every
 * selected column was public, and stops being fine the moment one is not.
 */
function publicReply(
  row: Record<string, unknown>,
  now: number = Date.now(),
): Record<string, unknown> {
  const mark = deriveAuthorMark(row, now);
  return {
    id: row.id,
    post_id: row.post_id,
    body: row.body,
    author_name: row.author_name,
    // Through our own domain, as in publicPost() (lib/community/avatarSrc.ts).
    author_avatar: avatarSrc(row.author_avatar as string | null),
    // The tier, never the dates. See publicPost() in ../../route.ts.
    author_mark: deriveAuthorMark(row, now),
    author_handle: (row.author_handle as string | null | undefined) ?? null,
    // A Plus cosmetic, so only while the mark is live.
    author_decoration: mark && isDecoration(row.author_decoration) ? row.author_decoration : null,
    author_name_color: mark && isNameColor(row.author_name_color) ? row.author_name_color : null,
    author_clergy: isClergyMark(row.author_clergy) ? row.author_clergy : null,
    like_count: typeof row.like_count === "number" ? row.like_count : 0,
    dislike_count: typeof row.dislike_count === "number" ? row.dislike_count : 0,
    amen_count: count(row.amen_count),
    praying_count: count(row.praying_count),
    glory_count: count(row.glory_count),
    created_at: row.created_at,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!communityEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return withCors(NextResponse.json({ replies: [] }), req);
  }
  const admin = createAdminClient();

  // A reply carries no group of its own; the parent post decides who may
  // read it. This handler reads with the service role, which bypasses RLS,
  // so the audience check has to happen here or the row policy on
  // community_post_replies never runs and a private parish thread is
  // readable by anyone who can name the post id.
  const { data: parent } = await admin
    .from("community_posts")
    .select("id, group_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!parent || parent.status !== "visible") {
    return withCors(NextResponse.json({ replies: [] }), req);
  }
  if (
    parent.group_id &&
    !(await callerIsGroupMember(req, admin, parent.group_id as string))
  ) {
    // Empty rather than 403, and identical to a post with no replies: a
    // non-member must not learn that the thread exists.
    return withCors(NextResponse.json({ replies: [] }), req);
  }

  // The authors this reader has blocked. Until 2026-09-25 only the posts feed
  // honoured a block, so a blocked person's replies went on appearing under
  // every thread: half a block. The ids are used in the WHERE clause only.
  //
  // A mute is quieter: their replies still come, folded, so the thread keeps
  // its sense, and the reader can open one (20261005).
  const hidden = await hiddenAuthors(req, admin);
  const blocked = hidden.blocked;

  const listReplies = (cols: string) => {
    let q = admin
      .from("community_post_replies")
      .select(cols)
      // Reads through the service role, which bypasses RLS, so the status
      // filter has to be explicit here. Without it a removed reply would
      // still be served to every reader.
      .eq("post_id", id)
      .eq("status", "visible");
    if (blocked.length > 0) q = q.not("user_id", "in", `(${blocked.join(",")})`);
    return q.order("created_at", { ascending: true }).limit(200);
  };

  let { data, error } = await listReplies(REPLY_COLS_THREE);
  if (error && isColumnAbsent(error)) {
    ({ data, error } = await listReplies(REPLY_COLS_WITH_PROFILE));
  }
  if (error && isColumnAbsent(error)) {
    ({ data, error } = await listReplies(REPLY_COLS));
  }
  if (error && isColumnAbsent(error)) {
    // 20260905000100_community_author_mark.sql not applied yet: read what the table
    // has and serve no mark.
    ({ data, error } = await listReplies(REPLY_COLS_BEFORE_MARK));
  }
  if (error) {
    console.warn("[community] replies failed", error.message);
    return withCors(NextResponse.json({ replies: [] }), req);
  }

  const now = Date.now();
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  // Which of these a muted reader wrote, asked by id so no author id is read.
  let mutedIds = new Set<string>();
  if (hidden.muted.length > 0 && rows.length > 0) {
    const { data: mutedRows } = await admin
      .from("community_post_replies")
      .select("id")
      .eq("post_id", id)
      .in("user_id", hidden.muted)
      .limit(200);
    mutedIds = new Set(((mutedRows ?? []) as { id: string }[]).map((r) => r.id));
  }
  const replies = rows.map((r) => ({ ...publicReply(r, now), author_muted: mutedIds.has(String(r.id)) }));
  // Private whenever the answer depends on who asked: a thread filtered by
  // this reader's blocks, or a parish thread only members may read. A
  // shared cache holding either would serve it to the next caller, and for
  // a group thread that next caller could be a non-member. Only a plain
  // public thread with nothing filtered may be cached, briefly.
  return withCors(
    NextResponse.json(
      { replies },
      { headers: personalisedCacheHeaders(blocked.length > 0 || hidden.muted.length > 0 || Boolean(parent.group_id)) },
    ),
    req,
  );
}

/** Reply to a post. Signed-in only; bumps the post's reply_count. */
async function handlePOST(req: Request, id: string) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`community-reply:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json(
      { error: "You're replying quickly. Please slow down a little." },
      { status: 429 },
    );
  }
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = communityReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  }

  const admin = createAdminClient();
  const readPost = (cols: string) => admin.from("community_posts").select(cols).eq("id", id).maybeSingle();
  // category arrives with 20261005; before it, every post is a discussion.
  let { data: postRow, error: postError } = await readPost("id, reply_count, status, group_id, category");
  if (postError && isColumnAbsent(postError)) ({ data: postRow, error: postError } = await readPost("id, reply_count, status, group_id"));
  const post = postRow as unknown as { id: string; status: string; group_id: string | null; category?: string | null } | null;
  if (!post || post.status !== "visible") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // Writing into a group thread needs the same membership the group's own
  // feed needs. Without this a non-member who guessed a post id could post
  // into a parish's private conversation, which is worse than reading it.
  if (
    post.group_id &&
    !(await callerIsGroupMember(req, admin, post.group_id as string))
  ) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const meta = (user.user_metadata ?? {}) as {
    display_name?: string;
    avatar_url?: string;
  };
  const authorName =
    (meta.display_name ?? "").trim() ||
    (user.email ? user.email.split("@")[0] : "") ||
    "Reader";

  // The word filter (lib/moderation), as on posts: masked, asked first, held
  // for a moderator.
  const ownBody = parsed.data.body.trim();
  const censored = await censorPost(admin, { body: ownBody });
  if (censored.hits > 0 && !parsed.data.confirmFiltered) {
    return NextResponse.json(
      {
        error: "Some words in this reply will be hidden until a moderator reviews them.",
        code: "filtered",
        preview: { title: null, body: censored.body },
      },
      { status: 409 },
    );
  }
  // The spam filter and the reader's posting limits, as on posts.
  const guard = await guardWrite(admin, user, { kind: "reply", body: ownBody, postId: id });
  if (guard.kind === "refuse") {
    return NextResponse.json({ error: guard.error, code: guard.code, limit: guard.limit }, { status: guard.status });
  }
  let held = guard.kind === "hold";

  await ensureCleanHandle(admin, user.id);
  const shownName = (await censorName(admin, authorName)).slice(0, 80);
  const shownBody = censored.body ?? ownBody;

  const base = {
    post_id: id,
    user_id: user.id,
    body: shownBody,
    author_name: shownName,
    author_avatar: meta.avatar_url || null,
  };
  // author_clergy is set by trigger from the writer's verification (20261005).
  let { data: createdRow, error } = await admin
    .from("community_post_replies")
    .insert({ ...base, status: held ? "held" : "visible" })
    .select("id, author_clergy")
    .single();
  if (error && (isColumnAbsent(error) || error.code === "23514")) {
    // Before 20261005: no seal, and nothing can be held, so the reply goes
    // up as it always did.
    held = false;
    ({ data: createdRow, error } = await admin.from("community_post_replies").insert(base).select("id").single());
  }
  const created = createdRow as unknown as { id: string; author_clergy?: string | null } | null;
  if (error || !created) {
    console.warn("[community] reply failed", error?.message);
    return NextResponse.json(
      { error: "Couldn't post your reply. Please try again." },
      { status: 500 },
    );
  }

  // Held from everyone until a moderator looks: not counted, nobody told.
  // Approving it counts it and sends what it would have sent now
  // (lib/community/moderation.ts).
  if (held && guard.kind === "hold") {
    const { error: holdError } = await admin
      .from("community_text_holds")
      .insert({ reply_id: created.id, reason: guard.reason, detail: guard.detail, hits: 1 });
    if (holdError) console.warn("[community] spam hold not written", holdError.message);
    if (censored.hits > 0) {
      await admin.from("community_text_holds").insert({ reply_id: created.id, original_body: ownBody, hits: censored.hits });
    }
    return NextResponse.json({ ok: true, id: created.id, held: true, code: "held" });
  }

  // Atomic. This was a read-modify-write off a `post` fetched earlier, so
  // two replies landing together both wrote the same number and one count
  // was lost. Campaigns already used an RPC for exactly this
  // (prayer_campaign_bump_counts); Community never got the same treatment.
  const { error: bumpError } = await admin.rpc("community_bump_reply_count", {
    p_post_id: id,
    p_delta: 1,
  });
  if (bumpError) {
    // The reply is already stored and is the thing that matters; a drifted
    // counter is cosmetic and the migration recomputes it.
    console.warn("[community] reply_count bump failed", bumpError.message);
  }

  // Tell the author someone answered. Best effort on purpose: the reply is
  // stored and is the thing that matters, so a notification that cannot be
  // written must not fail the request. Skipped when you reply to yourself,
  // and skipped silently when the table is absent, which is how this ships
  // dark until 20260801000000_community_notifications.sql is applied.
  const { data: me } = await admin.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  const actorHandle = (me as { handle?: string | null } | null)?.handle ?? null;
  if (censored.hits > 0) {
    const { error: holdError } = await admin
      .from("community_text_holds")
      .insert({ reply_id: created.id, original_body: ownBody, hits: censored.hits });
    if (holdError) console.warn("[community] filter hold not written", holdError.message);
  }

  // The day's feast thread is opened by @purify, and its replies are the
  // whole community's: they do not each tell the official account.
  const told =
    post.category === "feast"
      ? null
      : await notifyOfReply({
          admin,
          postId: id,
          replyId: created.id,
          actorId: user.id,
          actorName: shownName,
          actorHandle,
          excerpt: shownBody,
          // Verified clergy answering a question: the asker hears it as an answer.
          kind: post.category === "question" && created.author_clergy ? "answer" : "reply",
        });
  await notifyMentions({
    admin,
    texts: [shownBody],
    postId: id,
    replyId: created.id,
    actorId: user.id,
    actorName: shownName,
    actorHandle,
    groupId: (post as { group_id?: string | null } | null)?.group_id ?? null,
    skip: told ? [told] : [],
  });

  return NextResponse.json({ ok: true, id: created.id });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCors(await handlePOST(req, id), req);
}
export const OPTIONS = corsPreflight;
