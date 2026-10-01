import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { handleProblem, normalizeHandle } from "@/lib/profile/handle";
import { buildProfile, loadProfileRow } from "@/lib/profile/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A reader's public profile, by @handle: what opens when you tap a name in
 * Community.
 *
 * Public, like the feed, and served the same way: the service role reads the
 * parts and lib/profile/server.ts projects a fixed field list, so neither the
 * auth uuid nor the email nor a subscription date can leave
 * (lib/security/__tests__/publicColumnExposure.test.ts lists this route).
 * The answer is the same for every viewer, so it may sit in a shared cache
 * for a few seconds.
 */
export async function GET(req: Request) {
  if (!communityEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  if (await rateLimited(`profile-read:${ipKey(req.headers)}`, 60, 120)) {
    return withCors(NextResponse.json({ error: "Slow down a little." }, { status: 429 }), req);
  }

  const handle = normalizeHandle(new URL(req.url).searchParams.get("h") ?? "");
  // Shape only: a reserved name is refused to a reader choosing it, not to a
  // reader looking it up (the Purify account itself is @purify).
  const problem = handleProblem(handle);
  if (problem && problem !== "reserved") {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }

  const admin = createAdminClient();
  const row = await loadProfileRow(admin, { handle });
  if (row === "unavailable") {
    return withCors(NextResponse.json({ error: "Profiles are not open yet." }, { status: 404 }), req);
  }
  if (!row) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }

  const { profile } = await buildProfile(admin, row, { posts: true });
  return withCors(
    NextResponse.json(
      { profile },
      { headers: { "Cache-Control": "public, max-age=20", Vary: "Origin" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
