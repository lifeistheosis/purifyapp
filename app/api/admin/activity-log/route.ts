import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Read back the admin audit log.
 *
 * WHY THIS DID NOT EXIST, WHICH IS THE POINT. lib/admin/activityLog.ts has
 * been recording who did what since 20260823, and its own header explains why:
 * comping a subscription overwrites plus_until rather than extending it and
 * replaces plus_source, so a paying subscriber loses the record that they ever
 * paid, and before the log that was attributable to nobody. Refunds, store
 * provisioning and entitlement writes are in the same position.
 *
 * All of it was being written and none of it could be read. A log with no
 * reader is a log that nobody checks, which is the same as not having one
 * right up until the moment it matters.
 *
 * SERVICE ROLE, ADMIN GATE. admin_activity_log has RLS on and NO policies, so
 * only the service role can see it at all. That is the correct posture for a
 * table recording who did what to whom, and it means this route is the single
 * door.
 *
 * THE TABLE MAY NOT EXIST. AGENTS.md is explicit that merged and applied are
 * independently true or false, so a missing relation is reported as exactly
 * that rather than as an empty log. "Nothing has happened" and "nothing can be
 * read" must not look the same on an audit screen.
 */

/** Enough to scan a week of activity without paging. */
const LIMIT = 200;

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const actor = url.searchParams.get("actor");
  const action = url.searchParams.get("action");

  const supa = createAdminClient();
  let q = supa
    .from("admin_activity_log")
    .select("id, actor_email, action, entity_type, entity_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (actor) q = q.eq("actor_email", actor);
  // Prefix match, so "shop." narrows to every shop action without the caller
  // needing to know the exact verb. Escaped, or a % typed into the filter box
  // would silently widen the query back out to everything.
  if (action) q = q.ilike("action", `${action.replace(/[%_]/g, "\\$&")}%`);

  const { data, error } = await q;

  if (error) {
    // 42P01 is "relation does not exist": the migration has not been applied.
    // Distinguished from any other failure because the fix is different and
    // the operator can act on it.
    const missing = error.code === "42P01";
    return NextResponse.json(
      {
        error: missing
          ? "The audit log table is not on this database. 20260823_admin_activity_log.sql has not been applied."
          : "The audit log could not be read.",
        detail: error.message,
        missing,
      },
      { status: missing ? 501 : 500 },
    );
  }

  return NextResponse.json(
    {
      entries: data ?? [],
      limit: LIMIT,
      // So the UI can say "the newest 200" rather than implying it is all of
      // them, which on a busy month it will not be.
      truncated: (data?.length ?? 0) >= LIMIT,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
