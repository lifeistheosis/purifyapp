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
  if (!user) return NextResponse.json({ postIds: [], replyIds: [] });

  try {
    const admin = createAdminClient();
    const [{ data: posts }, { data: replies }] = await Promise.all([
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
    ]);
    return NextResponse.json(
      {
        postIds: (posts ?? []).map((r) => r.id as string),
        replyIds: (replies ?? []).map((r) => r.id as string),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ postIds: [], replyIds: [] });
  }
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
