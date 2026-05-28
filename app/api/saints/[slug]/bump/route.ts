import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
export async function POST(_req: NextRequest, { params }: { params: Params }) {
  const { slug } = await params;
  if (!SAINT_SLUGS.has(slug) || !getSaint(slug)) {
    return NextResponse.json({ error: "Unknown saint" }, { status: 404 });
  }

  const supa = await createClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  // 30 toggles per minute per user is generous for a real human and tight
  // for a bot using a leaked session.
  if (await rateLimited(`bump:${user.id}`, 60, 30)) {
    return new NextResponse(null, { status: 429 });
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    bumped = false;
  } else {
    const { error } = await supa
      .from("saint_bumps")
      .insert({ user_id: user.id, saint_slug: slug });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  return NextResponse.json(
    { bumped, total: agg?.bumps ?? 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
