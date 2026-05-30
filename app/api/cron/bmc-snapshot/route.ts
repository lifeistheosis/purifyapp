import { NextResponse, type NextRequest } from "next/server";
import { fetchBmcTotal } from "@/lib/support/buymeacoffee";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPORT } from "@/data/support/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily snapshot of the current month's BMC totals into donations_monthly.
 * Idempotent: same year_month → upsert. Wire as a Render cron job (or hit
 * manually). Auth via CRON_SECRET header to keep the endpoint off the
 * public surface.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const live = await fetchBmcTotal().catch(() => null);
  if (!live) {
    return NextResponse.json(
      { ok: false, reason: "BMC unavailable" },
      { status: 503 },
    );
  }

  const supa = createAdminClient();
  const d = new Date();
  const yearMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const { data: existing } = await supa
    .from("donations_monthly")
    .select("goal_cents")
    .eq("year_month", yearMonth)
    .maybeSingle();

  await supa.from("donations_monthly").upsert(
    {
      year_month: yearMonth,
      total_cents: Math.round(live.monthlyRaisedUsd * 100),
      supporters: live.supporters,
      goal_cents: existing?.goal_cents ?? SUPPORT.monthlyGoalUsd * 100,
      snapshot_date: d.toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "year_month" },
  );

  return NextResponse.json({
    ok: true,
    yearMonth,
    raisedCents: Math.round(live.monthlyRaisedUsd * 100),
    supporters: live.supporters,
  });
}
