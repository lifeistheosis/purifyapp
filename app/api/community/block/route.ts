import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Block and unblock a reader in Community conversations.
 *
 * App Review guideline 1.2 requires four things of a user-generated content
 * surface: filtering, reporting, blocking abusive users, and a published
 * contact. Conversations shipped with three. This is the fourth.
 *
 * The caller identifies WHO to block by naming a post or reply, never a user
 * id. The public feed deliberately omits `user_id` (it is also the RevenueCat
 * appUserID and the avatar storage path segment), so the client has no way to
 * name an author directly and should not be given one. The author is resolved
 * here, under the service role, from the item the reader is looking at.
 *
 * Unblocking works off the block row's own id, which the reader already owns
 * and can list, so that path needs no user id either.
 */
const blockSchema = z
  .object({
    postId: z.string().uuid().optional(),
    replyId: z.string().uuid().optional(),
  })
  .refine((r) => Boolean(r.postId) !== Boolean(r.replyId), {
    message: "Block from one thing at a time.",
  });

const unblockSchema = z.object({ id: z.string().uuid() });

/** The two columns needed to record a block, read under the service role. */
type ItemAuthor = { user_id: string; author_name: string };

async function requireUser(req: Request) {
  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  return user;
}

/** The readers this account has blocked. Names only, never ids. */
async function handleGET(req: Request) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_blocks")
    .select("id, blocked_name, created_at")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[community] block list failed", error.message);
    return NextResponse.json({ blocks: [] });
  }
  return NextResponse.json({ blocks: data ?? [] });
}

async function handlePOST(req: Request) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`community-block:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json(
      { error: "Too many changes just now. Please try again shortly." },
      { status: 429 },
    );
  }
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to block someone." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = blockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { postId, replyId } = parsed.data;

  const admin = createAdminClient();

  // Resolve the author from the item, server-side.
  let author: ItemAuthor | null = null;
  if (postId) {
    const { data } = await admin
      .from("community_posts")
      .select("user_id, author_name")
      .eq("id", postId)
      .maybeSingle();
    author = (data as ItemAuthor | null) ?? null;
  } else {
    const { data } = await admin
      .from("community_post_replies")
      .select("user_id, author_name")
      .eq("id", replyId as string)
      .maybeSingle();
    author = (data as ItemAuthor | null) ?? null;
  }
  if (!author) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // The check constraint would reject this anyway; answering plainly is
  // kinder than a 500, and blocking yourself would empty your own feed.
  if (author.user_id === user.id) {
    return NextResponse.json(
      { error: "You cannot block yourself." },
      { status: 400 },
    );
  }

  const { error } = await admin.from("community_blocks").insert({
    blocker_id: user.id,
    blocked_id: author.user_id,
    blocked_name: author.author_name || "Reader",
  });
  // 23505 is the unique index: already blocked. From the reader's point of
  // view that is the state they asked for, so it is a success.
  if (error && error.code !== "23505") {
    console.error("[community] block failed", error.message);
    return NextResponse.json(
      { error: "Could not block that reader." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

async function handleDELETE(req: Request) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = unblockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  // Scoped to blocker_id as well as id, so a guessed row id cannot lift
  // somebody else's block.
  const { error } = await admin
    .from("community_blocks")
    .delete()
    .eq("id", parsed.data.id)
    .eq("blocker_id", user.id);
  if (error) {
    console.error("[community] unblock failed", error.message);
    return NextResponse.json(
      { error: "Could not undo that block." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const DELETE = corsRoute(handleDELETE);
export const OPTIONS = corsPreflight;
