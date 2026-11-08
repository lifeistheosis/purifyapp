import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Report a shared journal page (1.9, step 3, "with Report on it"). Signed in
 * only, as Community's report is: an anonymous report cannot be weighed or
 * limited. One report per reader per page (the table's unique index makes a
 * second tap a success, not a second report). Read by the moderation queue.
 */
const schema = z.object({
  id: z.string().uuid(),
  reason: z.string().max(500).optional().nullable(),
});

async function handlePOST(req: Request) {
  if (await rateLimited(`journal-share-report:${ipKey(req.headers)}`, 3600, 30)) {
    return NextResponse.json({ error: "Too many reports just now. Please try again shortly." }, { status: 429 });
  }
  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to report something." }, { status: 401 });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  const { error } = await createAdminClient()
    .from("shared_page_reports")
    .insert({ page_id: parsed.data.id, reporter_id: user.id, reason: parsed.data.reason?.trim() || null });
  if (error && error.code !== "23505") {
    console.error("[journal] share report failed", error.message);
    return NextResponse.json({ error: "Could not send that report." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
