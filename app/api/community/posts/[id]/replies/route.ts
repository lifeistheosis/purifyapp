import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { callerIsGroupMember } from "@/lib/community/groupAccess";
import { notifyOfReply } from "@/lib/community/notify";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { communityReplySchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

// `user_id` is deliberately not selected; see the note in ../../route.ts.
const REPLY_COLS =
  "id, post_id, body, author_name, author_avatar, created_at";

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

  const { data } = await admin
    .from("community_post_replies")
    .select(REPLY_COLS)
    // Reads through the service role, which bypasses RLS, so the status
    // filter has to be explicit here. Without it a removed reply would
    // still be served to every reader.
    .eq("post_id", id)
    .eq("status", "visible")
    .order("created_at", { ascending: true })
    .limit(200);
  return withCors(NextResponse.json({ replies: data ?? [] }), req);
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
  const { data: post } = await admin
    .from("community_posts")
    .select("id, reply_count, status, group_id")
    .eq("id", id)
    .maybeSingle();
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

  const { data: created, error } = await admin
    .from("community_post_replies")
    .insert({
      post_id: id,
      user_id: user.id,
      body: parsed.data.body.trim(),
      author_name: authorName.slice(0, 80),
      author_avatar: meta.avatar_url || null,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.warn("[community] reply failed", error?.message);
    return NextResponse.json(
      { error: "Couldn't post your reply. Please try again." },
      { status: 500 },
    );
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
  // dark until 20260801_community_notifications.sql is applied.
  await notifyOfReply({
    admin,
    postId: id,
    replyId: created.id,
    actorId: user.id,
    actorName: authorName,
    excerpt: parsed.data.body.trim(),
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
