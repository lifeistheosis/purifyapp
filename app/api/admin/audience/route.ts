import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { audienceRollup, type AudienceRollup } from "@/lib/admin/rollups";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 30-day audience breakdown: countries, regions, languages, browsers and
// devices. Used by the Audience tab.
//
// Counted in the database (lib/admin/rollups.ts). This route used to select
// the sessions with .limit(50_000) and tally them here, and the API hands
// back at most 1,000 rows whatever the limit says: on 2026-10-03 every chart
// on the tab was drawn from 1,000 of 13,976 sessions, under a total that read
// "1000 sess.".
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  let rollup: AudienceRollup;
  try {
    rollup = await audienceRollup(supa, since);
  } catch (e) {
    console.warn("[admin/audience] rollup failed", (e as Error).message);
    // 200 with a reason, not a 500: adminJson turns a failed status into null
    // and the tab would then sit on "Loading" for ever.
    return NextResponse.json(
      { windowDays: 30, unavailable: "The sessions could not be read just now." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // There was a "signed-in vs anonymous" split here, read from
  // analytics_sessions.user_id. Nothing has ever written that column
  // (app/api/track/route.ts records an anonymous session and no account), so
  // the donut showed 0 signed in on every load. It is gone rather than shown
  // as a measurement that was never taken.
  return NextResponse.json(
    {
      windowDays: 30,
      total: rollup.total,
      countries: rollup.countries,
      regions: rollup.regions,
      languages: rollup.languages,
      browsers: rollup.browsers,
      devices: rollup.devices,
      partial: rollup.partial,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
