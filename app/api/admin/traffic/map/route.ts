import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { arrivalOf } from "@/lib/admin/arrivals";
import { windowStart } from "@/lib/admin/dayWindow";
import { tallyCountries, tallyRegions, type Visit } from "@/lib/admin/map/tally";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAll } from "@/lib/supabase/pageAll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where readers are, by country and, for one country, by region: the heat
 * map on Traffic (the owner's pick on sheet r3-15, 2026-10-30, Traffic A with
 * C's zoom, and his note 31).
 *
 * Every country with a visit in the window, each with its visits, its top
 * regions, how its readers arrived and what they read on, for the card; and
 * with `in=US`, that country's regions the same way, each with its cities,
 * for the zoom. Counted from the session rows (country, region and city are
 * kept on each since the first analytics commit, lib/analytics/geo.ts), and
 * only the counts leave the server: no referrer, no user agent, no session.
 *
 * NOT POLLED. Read when the page opens or the period changes, like Sources,
 * because a window of days is thousands of rows read a page at a time. The
 * readers on the site now come from /api/admin/stats, which the panel
 * already polls. If a window holds more sessions than one answer reads, the
 * answer says the count is partial instead of passing a short one off.
 *
 * Admin only: 403 to anyone else.
 */

const RANGES = { "1d": 1, "7d": 7, "30d": 30 } as const;
type Range = keyof typeof RANGES;

/** The most sessions one answer reads, as the Sources route reads. */
const MOST_ROWS = 40_000;

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

type Row = {
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  referrer: string | null;
  user_agent: string | null;
};

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const asked = params.get("range") ?? "1d";
  const range: Range = asked in RANGES ? (asked as Range) : "1d";
  const inCode = (params.get("in") ?? "").trim().toUpperCase();
  const zoom = /^[A-Z]{2}$/.test(inCode) ? inCode : null;
  const windowDays = RANGES[range];
  const since = windowStart(windowDays);

  const supa = createAdminClient();
  let rows: Row[];
  try {
    rows = await pageAll<Row>(
      (from, to) =>
        supa
          .from("analytics_sessions")
          .select("country, country_code, region, city, referrer, user_agent")
          .gte("first_seen", since)
          .order("session_id")
          .range(from, to),
      MOST_ROWS,
    );
  } catch (e) {
    console.warn("[admin/traffic/map] sessions read failed", (e as Error).message);
    // 200 with a reason: a failed status would leave the map on "Loading".
    return NextResponse.json({ range, windowDays, unavailable: "The sessions could not be read just now." }, NO_STORE);
  }

  const visits: Visit[] = rows.map((r) => {
    const a = arrivalOf(r.referrer, r.user_agent);
    return { code: r.country_code, country: r.country, region: r.region, city: r.city, from: a.from, on: a.on };
  });
  const { countries, unplaced } = tallyCountries(visits);
  const regions = zoom ? tallyRegions(visits, zoom) : null;

  return NextResponse.json(
    {
      range,
      windowDays,
      since,
      total: rows.length,
      countries,
      unplaced,
      in: zoom,
      regions: regions ? regions.regions : null,
      regionsUnplaced: regions ? regions.unplaced : null,
      partial: rows.length >= MOST_ROWS ? { rows: rows.length } : null,
      generatedAt: new Date().toISOString(),
    },
    NO_STORE,
  );
}
