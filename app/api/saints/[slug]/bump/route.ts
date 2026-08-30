import { NextResponse, type NextRequest } from "next/server";
import { corsPreflight, withCors } from "@/lib/api/cors";
import { createClientFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SAINTS, getSaint } from "@/lib/saints/saints";
import { rateLimited } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

// Defense-in-depth: precomputed allowlist of known saint slugs. Validating
// against this Set before any DB work blocks parameter-pollution probes
// even if getSaint() were ever to widen its acceptance.
const SAINT_SLUGS = new Set(SAINTS.map((s) => s.slug));

// POST toggles a bump for the signed-in user on a given saint.
// Anon callers get 401. Returns the new state + the public total.
//
// NATIVE-READY, and it was not. The app calls this cross-origin from
// https://localhost with a Bearer token and no cookies, so the cookie-only
// createClient() saw no user and answered 401 to a signed-in reader, and the
// preflight had nothing to answer it. Per AGENTS.md an authenticated route
// needs all three: createClientFromRequest, withCors on every return, and an
// exported OPTIONS.
export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { slug } = await params;
  if (!SAINT_SLUGS.has(slug) || !getSaint(slug)) {
    return withCors(NextResponse.json({ error: "Unknown saint" }, { status: 404 }), req);
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) {
    return withCors(NextResponse.json({ error: "Sign in required" }, { status: 401 }), req);
  }

  // 30 toggles per minute per user is generous for a real human and tight
  // for a bot using a leaked session.
  if (await rateLimited(`bump:${user.id}`, 60, 30)) {
    return withCors(new NextResponse(null, { status: 429 }), req);
  }

  const { data: existing } = await supa
    .from("saint_bumps")
    .select("id")
    .eq("user_id", user.id)
    .eq("saint_slug", slug)
    .maybeSingle();

  let bumped: boolean;
  if (existing) {
    const { error } = await supa.from("saint_bumps").delete().eq("id", existing.id);
    if (error) return withCors(NextResponse.json({ error: error.message }, { status: 500 }), req);
    bumped = false;
  } else {
    const { error } = await supa
      .from("saint_bumps")
      .insert({ user_id: user.id, saint_slug: slug });
    if (error) return withCors(NextResponse.json({ error: error.message }, { status: 500 }), req);
    bumped = true;
  }

  // Read the fresh total via the public aggregate view. Service-role read
  // sidesteps any view-grant edge cases and is cheap (single indexed row).
  const admin = createAdminClient();
  const { data: agg } = await admin
    .from("saint_bump_counts")
    .select("bumps")
    .eq("saint_slug", slug)
    .maybeSingle();

  return withCors(
    NextResponse.json(
      { bumped, total: agg?.bumps ?? 0 },
      { headers: { "Cache-Control": "no-store" } },
    ),
    req,
  );
}

// The native shells preflight this cross-origin POST. Without an OPTIONS
// handler the browser never gets to send the POST at all.
export const OPTIONS = corsPreflight;
