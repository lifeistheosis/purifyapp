import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { ADMIN_VIEW_TABS } from "@/lib/admin/pages";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { USAGE_BATCH, summarizeUsage, type UsageRow } from "@/lib/admin/usage";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAllSettled } from "@/lib/supabase/pageAll";

export const dynamic = "force-dynamic";

/**
 * The admin's own usage log (lib/admin/usage.ts says what and why).
 *
 * POST records a batch of view and action events for the signed-in admin.
 * GET returns the readout for the signed-in admin's own visits, over the
 * last 30 days or, with ?days=7, the last seven. It used to count every
 * admin's use together, so another admin's visits read as his and could
 * move his rail (his pick B for the Audit log on r3-17, 2026-10-30: "Only
 * your own visits count").
 *
 * SERVICE ROLE, ADMIN GATE. admin_usage has RLS on and no policies, so this
 * route is its only door, the same posture as admin_activity_log. The table
 * is created by docs/1.8-build/sql/admin-usage.sql, which the owner runs by
 * hand; until then POST drops the batch quietly (a usage log must never make
 * the admin itself fail) and GET says the table is missing.
 */

const DAYS = 30;
const ROW_CAP = 20_000;

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // A batch goes out every half minute at most, and on leaving the page.
  if (await rateLimited(`admin-usage:${adminUser.id}`, 60, 30)) {
    return NextResponse.json({ error: "Too many" }, { status: 429 });
  }

  const parsed = USAGE_BATCH.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad batch" }, { status: 400 });

  const rows = parsed.data.events.map((e) => ({
    actor_email: adminUser.email ?? null,
    kind: e.kind,
    tab: e.tab,
    ms: e.kind === "view" ? e.ms : null,
    from_tab: e.kind === "view" ? e.from : null,
    label: e.kind === "action" ? e.label : null,
  }));

  const { error } = await createAdminClient().from("admin_usage").insert(rows);
  if (error && !isTableAbsent(error)) {
    console.warn("[admin-usage] insert failed", error.message);
  }
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const days = new URL(req.url).searchParams.get("days") === "7" ? 7 : DAYS;
  const known = ADMIN_VIEW_TABS.filter((t) => !t.startsWith("owner-"));
  // Rows are kept by the address that made them. An account without one has
  // no rows of its own to read, and is never handed somebody else's.
  const email = adminUser.email ?? null;
  if (!email) {
    return NextResponse.json({ days, ...summarizeUsage([], known) }, { headers: { "Cache-Control": "no-store" } });
  }

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  // In pages: one request answers at most 1,000 rows (lib/supabase/pageAll.ts),
  // and a month of use passes that within days.
  const admin = createAdminClient();
  const { data, error } = await pageAllSettled(
    (from, to) =>
      admin
        .from("admin_usage")
        .select("id, kind, tab, ms, from_tab, label, at")
        .eq("actor_email", email)
        .gte("at", since)
        .order("id", { ascending: false })
        .range(from, to),
    ROW_CAP,
  );

  if (error) {
    const missing = isTableAbsent(error);
    return NextResponse.json(
      {
        error: missing
          ? "The usage table is not on this database yet. docs/1.8-build/sql/admin-usage.sql has not been run."
          : "The usage log could not be read.",
        missing,
      },
      { status: missing ? 501 : 500 },
    );
  }

  return NextResponse.json(
    { days, ...summarizeUsage((data ?? []) as UsageRow[], known) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
