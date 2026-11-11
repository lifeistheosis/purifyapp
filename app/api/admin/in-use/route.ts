import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { allTimeDays } from "@/lib/admin/allTime";
import { parseDaysWindow } from "@/lib/admin/dayWindow";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { FEATURE_EVENTS, summarizeFeatures, type FeatureEventRow, type FeatureSums } from "@/lib/analytics/featureCounting";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type InUseAdminPayload =
  | ({ absent: false; truncated: boolean; days: number } & FeatureSums)
  | { absent: true }
  | { unavailable: string };

const DAY = 86_400_000;
/** Rows are read a page at a time; past this many, the sums say they are partial. */
const MAX_ROWS = 100_000;
const PAGE = 1_000;

// Traffic > In use (1.9, admin item A5): which Bibles are downloaded, which
// reading plans are begun and finished, how many journal pages are written
// and shared, and which versions of the app are in use
// (lib/analytics/featureCounting.ts). Only those six events of
// analytics_events are read, and nothing in them names a reader. The window
// is 7, 30 or 90 days.
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();
  // 7, 30 or 90 days, or All time, from the first of these events.
  const asked = parseDaysWindow(new URL(req.url).searchParams.get("days"), [7, 30, 90], 30);
  const days = asked === "all" ? await allTimeDays(supa, "analytics_events", "ts", FEATURE_EVENTS) : asked;
  const from = new Date(Date.now() - days * DAY).toISOString();

  const rows: FeatureEventRow[] = [];
  let truncated = false;
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supa
      .from("analytics_events")
      .select("name, props")
      .in("name", [...FEATURE_EVENTS])
      .gte("ts", from)
      // Then by id: these rows are kept to the day, so every row of a day has
      // the same time, and pages cut through a tie may repeat a row or skip
      // one (lib/supabase/pageAll.ts).
      .order("ts", { ascending: true })
      .order("id", { ascending: true })
      .range(start, start + PAGE - 1);
    if (error) {
      const payload: InUseAdminPayload = isTableAbsent(error) ? { absent: true } : { unavailable: error.message };
      return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
    }
    rows.push(...((data ?? []) as FeatureEventRow[]));
    if (!data || data.length < PAGE) break;
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  const payload: InUseAdminPayload = { absent: false, truncated, days, ...summarizeFeatures(rows) };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
