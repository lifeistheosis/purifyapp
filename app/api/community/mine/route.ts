import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which of the visible posts and replies belong to the caller.
 *
 * The feed used to answer this by shipping `user_id` on every row and letting
 * the client compare. That handed the Supabase auth uuid, which is also the
 * RevenueCat appUserID and the public avatar path segment, to anyone who
 * fetched the feed, including signed-out readers. And it could not have been
 * fixed by trimming the column alone, because the feed is served with
 * `Cache-Control: public` and therefore cannot carry anything per-user.
 *
 * So ownership is its own authenticated, uncached call. It returns ids and
 * nothing else: no names, no bodies, nothing that could identify another
 * reader.
 *
 * ── Reactions ride here for exactly the same reason ─────────────────────
 *
 * Which way this reader voted is per-user state, and the feed is served
 * `Cache-Control: public`, so it cannot carry it either. It could have been a
 * second endpoint or a direct client read of community_reactions, which RLS
 * would scope correctly. It is here instead because it is the same question:
 * "of what is on screen, what is mine". One authenticated round trip answers
 * both, and a reader whose ownership loaded but whose likes had not would see
 * every button briefly un-pressed and be tempted to press again.
 *
 * The values are 1 and -1 rather than "like"/"dislike" so the button gets the
 * ReactionState it already reasons in, with no mapping in between to disagree.
 */
async function handleGET(req: Request) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`community-mine:${ipKey(req.headers)}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  // Signed out is not an error here: it simply means nothing is yours.
  if (!user) {
    return NextResponse.json({
      postIds: [],
      replyIds: [],
      reactions: { posts: {}, replies: {} },
    });
  }

  try {
    const admin = createAdminClient();
    const [{ data: posts }, { data: replies }, { data: reactions }] =
      await Promise.all([
        admin
          .from("community_posts")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "visible")
          .order("created_at", { ascending: false })
          .limit(200),
        admin
          .from("community_post_replies")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "visible")
          .order("created_at", { ascending: false })
          .limit(500),
        // No status filter: a reaction to a post that was later hidden is
        // still this reader's reaction, and filtering it out here would make
        // the button forget a press the database still holds.
        admin
          .from("community_reactions")
          .select("post_id, reply_id, value")
          .eq("user_id", user.id)
          .limit(1000),
      ]);

    const byPost: Record<string, number> = {};
    const byReply: Record<string, number> = {};
    for (const r of reactions ?? []) {
      const value = Number(r.value);
      if (value !== 1 && value !== -1) continue;
      if (r.post_id) byPost[String(r.post_id)] = value;
      else if (r.reply_id) byReply[String(r.reply_id)] = value;
    }

    return NextResponse.json(
      {
        postIds: (posts ?? []).map((r) => r.id as string),
        replyIds: (replies ?? []).map((r) => r.id as string),
        reactions: { posts: byPost, replies: byReply },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({
      postIds: [],
      replyIds: [],
      reactions: { posts: {}, replies: {} },
    });
  }
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
