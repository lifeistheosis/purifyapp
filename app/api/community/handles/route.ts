import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { signedInUser } from "@/lib/community/social";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who you might mean, while you type "@ma" in the composer.
 *
 * Signed-in only and rate-limited, so it is not a way to walk the list of
 * handles. Readers you follow come first; private profiles are left out.
 * Handles only: a stored display name can still be the email's local part
 * for a reader who never chose one (every Google sign-in starts that way),
 * and a suggestion list must not spell that out to whoever types a letter.
 */
type Hit = { handle: string };

async function handleGET(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(`community-handles:${user.id}`, 3600, 400)) {
    return NextResponse.json({ hits: [] });
  }
  const q = (new URL(req.url).searchParams.get("q") ?? "").toLowerCase();
  if (!/^[a-z0-9_.]{1,24}$/.test(q)) return NextResponse.json({ hits: [] });

  const admin = createAdminClient();
  // `_` is a LIKE wildcard and a handle character: escape it.
  const pattern = `${q.replace(/_/g, "\\_")}%`;
  const search = (privateFilter: boolean) => {
    let query = admin.from("profiles").select("id, handle").like("handle", pattern).neq("id", user.id);
    if (privateFilter) query = query.eq("profile_private", false);
    return query.order("handle").limit(12);
  };
  let { data, error } = await search(true);
  if (error && isColumnAbsent(error)) ({ data, error } = await search(false));
  if (error) return NextResponse.json({ hits: [] });

  const rows = (data ?? []) as { id: string; handle: string }[];
  const { data: follows } = await admin
    .from("community_follows")
    .select("followee_id")
    .eq("follower_id", user.id)
    .in("followee_id", rows.map((r) => r.id).length ? rows.map((r) => r.id) : ["00000000-0000-0000-0000-000000000000"]);
  const followed = new Set(((follows ?? []) as { followee_id: string }[]).map((f) => f.followee_id));
  const hits: Hit[] = rows
    .sort((a, b) => Number(followed.has(b.id)) - Number(followed.has(a.id)))
    .slice(0, 6)
    .map((r) => ({ handle: r.handle }));
  return NextResponse.json({ hits }, { headers: { "Cache-Control": "private, no-store" } });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
