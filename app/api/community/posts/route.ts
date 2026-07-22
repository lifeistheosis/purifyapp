import { NextResponse } from "next/server";

import { corsPreflight, corsRoute, withCors } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { communityPostSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

const POST_COLS =
  "id, user_id, kind, title, body, quote_text, quote_source, quote_href, author_name, author_avatar, reply_count, created_at";

/** Latest visible community posts (public read). */
export async function GET(req: Request) {
  if (!communityEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_posts")
    .select(POST_COLS)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.warn("[community] list failed", error.message);
    return withCors(NextResponse.json({ posts: [] }), req);
  }
  return withCors(
    NextResponse.json(
      { posts: data ?? [] },
      { headers: { "Cache-Control": "public, max-age=15" } },
    ),
    req,
  );
}

/** Create a post. Signed-in only; author identity snapshotted server-side. */
async function handlePOST(req: Request) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`community-post:${ipKey(req.headers)}`, 3600, 20)) {
    return NextResponse.json(
      { error: "You're posting quickly. Please slow down a little." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = communityPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const p = parsed.data;

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to post in the community." },
      { status: 401 },
    );
  }

  const meta = (user.user_metadata ?? {}) as {
    display_name?: string;
    avatar_url?: string;
  };
  const authorName =
    (meta.display_name ?? "").trim() ||
    (user.email ? user.email.split("@")[0] : "") ||
    "Reader";

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("community_posts")
    .insert({
      user_id: user.id,
      kind: p.kind,
      title: p.kind === "discussion" ? p.title?.trim() || null : null,
      body: p.body?.trim() || null,
      quote_text: p.kind === "discussion" ? null : p.quoteText?.trim() || null,
      quote_source: p.kind === "discussion" ? null : p.quoteSource?.trim() || null,
      quote_href: p.kind === "discussion" ? null : p.quoteHref || null,
      author_name: authorName.slice(0, 80),
      author_avatar: meta.avatar_url || null,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.warn("[community] create failed", error?.message);
    return NextResponse.json(
      { error: "Couldn't publish your post. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id: created.id });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
