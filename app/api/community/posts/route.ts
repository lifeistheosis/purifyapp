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

/**
 * Latest visible community posts.
 *
 * Public for a signed-out reader. For a signed-in one the authors they have
 * blocked are removed, which is the half of guideline 1.2 that makes the
 * block button mean anything: reporting asks someone else to act, blocking
 * has to take effect immediately and for that reader alone.
 *
 * Blocking is applied here rather than in the client because the feed does
 * not carry `user_id` (see POST_COLS above) and should not start carrying it
 * just to let the client filter. The exclusion is resolved server-side and
 * the uuids never leave this handler.
 */
export async function GET(req: Request) {
  if (!communityEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  const admin = createAdminClient();

  // `?group=<uuid>` asks for one parish group's thread instead of the public
  // feed. Membership is proved here, with the caller's own token, before a
  // single row is read: the group id travels in a URL and a URL is a guess
  // away from any other group id.
  const groupId = new URL(req.url).searchParams.get("group");
  let scopedGroup: string | null = null;
  if (groupId) {
    const supabase = await createClientFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return withCors(
        NextResponse.json({ error: "Sign in." }, { status: 401 }),
        req,
      );
    }
    const { data: member } = await admin
      .from("prayer_campaign_group_members")
      .select("group_id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      // 404 and not 403: a non-member should not learn that the group exists.
      return withCors(
        NextResponse.json({ error: "Not found." }, { status: 404 }),
        req,
      );
    }
    scopedGroup = groupId;
  }

  const blocked = await blockedAuthorIds(req, admin);

  let query = admin
    .from("community_posts")
    .select(POST_COLS)
    .eq("status", "visible");
  // The public feed carries no group posts, and a group thread carries only
  // its own. Without the `is null` half, group posts would surface in the
  // global feed the moment the column existed.
  query = scopedGroup
    ? query.eq("group_id", scopedGroup)
    : query.is("group_id", null);
  if (blocked.length > 0) {
    query = query.not("user_id", "in", `(${blocked.join(",")})`);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.warn("[community] list failed", error.message);
    return withCors(NextResponse.json({ posts: [] }), req);
  }
  return withCors(
    NextResponse.json(
      { posts: data ?? [] },
      {
        headers: {
          // A filtered feed is one reader's feed. Serving it from a shared
          // cache would hand somebody else's blocklist-shaped view to the
          // next caller, so personalised responses are never cacheable. A
          // group thread is always one reader's view for the same reason.
          "Cache-Control":
            blocked.length > 0 || scopedGroup
              ? "private, no-store"
              : "public, max-age=15",
          // The body varies by who is asking, so a shared cache must not
          // serve one reader's feed to the next. `withCors` sets Vary to
          // "Origin" and would otherwise overwrite this.
          Vary: "Origin, Authorization",
        },
      },
    ),
    req,
  );
}

/**
 * The auth uuids this caller has blocked, or [] when signed out.
 *
 * Never throws and never fails the feed: if the lookup breaks, the reader
 * sees an unfiltered feed rather than an error page. That is the softer of
 * the two failures, and it is logged.
 */
async function blockedAuthorIds(
  req: Request,
  admin: ReturnType<typeof createAdminClient>,
): Promise<string[]> {
  try {
    const supa = await createClientFromRequest(req);
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (!user) return [];
    const { data, error } = await admin
      .from("community_blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id)
      .limit(500);
    if (error) {
      console.warn("[community] block lookup failed", error.message);
      return [];
    }
    return (data ?? []).map((r) => r.blocked_id as string);
  } catch {
    return [];
  }
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

  // Posting into a parish group instead of the public feed. Membership is
  // checked server-side: the group id came from the client, and a client is
  // not a validator. A caller who is not in the group is refused rather than
  // silently posted to the global feed, which would leak a message meant for
  // a handful of people to everyone.
  let groupId: string | null = null;
  if (p.groupId) {
    const { data: member } = await admin
      .from("prayer_campaign_group_members")
      .select("group_id")
      .eq("group_id", p.groupId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    groupId = p.groupId;
  }

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
      group_id: groupId,
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
