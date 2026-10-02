import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { notYet, signedInUser } from "@/lib/community/social";
import { normalizeHandle } from "@/lib/profile/handle";
import { identity } from "@/lib/profile/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mute and unmute a reader (community_mutes, 20261005).
 *
 * Quieter than a block (../block): their posts leave the reader's feeds and
 * their replies fold away, and nothing else changes. They can still follow,
 * mention and answer the reader, and they are never told. Like a block, the
 * reader names WHO by a post, a reply or a public @handle, never by an id,
 * because the feed carries none; the author is found here, server-side.
 */
const muteSchema = z
  .object({
    postId: z.string().uuid().optional(),
    replyId: z.string().uuid().optional(),
    profileHandle: z.string().max(40).optional(),
  })
  .refine((r) => [r.postId, r.replyId, r.profileHandle].filter(Boolean).length === 1, {
    message: "Mute from one thing at a time.",
  });

const unmuteSchema = z
  .object({ id: z.string().uuid().optional(), profileHandle: z.string().max(40).optional() })
  .refine((r) => Boolean(r.id) !== Boolean(r.profileHandle), { message: "Give one of id or profileHandle." });

async function authorOf(
  admin: ReturnType<typeof createAdminClient>,
  by: { postId?: string; replyId?: string; profileHandle?: string },
): Promise<{ id: string; name: string } | null> {
  if (by.postId || by.replyId) {
    const { data } = await admin
      .from(by.postId ? "community_posts" : "community_post_replies")
      .select("user_id, author_name")
      .eq("id", (by.postId ?? by.replyId) as string)
      .maybeSingle();
    const row = data as { user_id: string; author_name: string } | null;
    return row ? { id: row.user_id, name: row.author_name || "Reader" } : null;
  }
  const { data } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("handle", normalizeHandle(by.profileHandle as string))
    .maybeSingle();
  const row = data as { id: string; display_name: string | null; avatar_url?: string | null } | null;
  return row ? { id: row.id, name: (await identity(admin, row)).name } : null;
}

/** The readers this account has muted. Names only, never ids. */
async function handleGET(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_mutes")
    .select("id, muted_name, created_at")
    .eq("muter_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    if (notYet(error)) return NextResponse.json({ mutes: [] });
    // A 500, never an empty list: see the same rule on the block list.
    console.error("[community] mute list failed", error.message);
    return NextResponse.json({ error: "Could not load the readers you have muted." }, { status: 500 });
  }
  return NextResponse.json({ mutes: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

async function handlePOST(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (await rateLimited(`community-mute:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many changes just now. Please try again shortly." }, { status: 429 });
  }
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to mute someone." }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = muteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminClient();
  const author = await authorOf(admin, parsed.data);
  if (!author) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (author.id === user.id) return NextResponse.json({ error: "You cannot mute yourself." }, { status: 400 });

  const { error } = await admin
    .from("community_mutes")
    .insert({ muter_id: user.id, muted_id: author.id, muted_name: author.name.slice(0, 80) });
  // 23505: already muted, which is the state asked for.
  if (error && error.code !== "23505") {
    if (notYet(error)) return NextResponse.json({ error: "Muting opens soon.", code: "unavailable" }, { status: 409 });
    console.error("[community] mute failed", error.message);
    return NextResponse.json({ error: "Could not mute that reader." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

async function handleDELETE(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = unmuteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminClient();
  let query = admin.from("community_mutes").delete().eq("muter_id", user.id);
  if (parsed.data.id) {
    query = query.eq("id", parsed.data.id);
  } else {
    const author = await authorOf(admin, { profileHandle: parsed.data.profileHandle });
    if (!author) return NextResponse.json({ error: "Not found." }, { status: 404 });
    query = query.eq("muted_id", author.id);
  }
  const { error } = await query;
  if (error && !notYet(error)) {
    console.error("[community] unmute failed", error.message);
    return NextResponse.json({ error: "Could not unmute." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const DELETE = corsRoute(handleDELETE);
export const OPTIONS = corsPreflight;
