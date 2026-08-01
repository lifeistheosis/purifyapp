import { NextResponse } from "next/server";

import { corsPreflight, corsRoute, withCors } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { communityPostSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";
import {
  isRefusal,
  verifyFatherQuote,
  verifyScriptureQuote,
  type VerifiedQuote,
} from "@/lib/community/verifyQuote";

// `user_id` is DELIBERATELY not selected. It is the Supabase auth uuid, and
// the same value is the RevenueCat appUserID and the segment in the public
// avatar storage path, so serving it to unauthenticated readers hands out a
// cross-system identifier for free. Ownership is still enforced: the DELETE
// route reads user_id server-side and compares it to the caller's token.
const POST_COLS =
  "id, kind, title, body, quote_text, quote_source, quote_href, author_name, author_avatar, reply_count, created_at";

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

  // The quotation is built HERE, from our own library, never accepted from
  // the caller. A share that cannot be traced to the work it cites is
  // refused rather than published. See lib/community/verifyQuote.ts.
  let quote: VerifiedQuote | null = null;
  if (p.kind === "scripture") {
    const v = await verifyScriptureQuote({
      book: p.book,
      chapter: p.chapter,
      verse: p.verse,
    });
    if (isRefusal(v)) {
      return NextResponse.json({ error: v.reason }, { status: 400 });
    }
    quote = v;
  } else if (p.kind === "father") {
    const v = await verifyFatherQuote({
      saintSlug: p.saintSlug,
      work: p.work,
      text: p.quoteText,
    });
    if (isRefusal(v)) {
      return NextResponse.json({ error: v.reason }, { status: 400 });
    }
    quote = v;
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("community_posts")
    .insert({
      user_id: user.id,
      kind: p.kind,
      title: p.kind === "discussion" ? p.title?.trim() || null : null,
      body: p.body?.trim() || null,
      quote_text: quote?.quoteText ?? null,
      quote_source: quote?.quoteSource ?? null,
      quote_href: quote?.quoteHref ?? null,
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
