import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 30-day audience breakdown: countries, regions, languages, browsers,
// signed-in vs anonymous ratio. Used by the Audience tab.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data: sess } = await supa
    .from("analytics_sessions")
    .select("country, country_code, region, accept_language, user_agent, user_id")
    .gte("first_seen", since)
    .limit(50_000);

  const rows = sess ?? [];

  // Countries
  const countryT = new Map<string, { name: string; code: string | null; count: number }>();
  for (const r of rows) {
    const name = r.country ?? "Unknown";
    const e = countryT.get(name) ?? { name, code: r.country_code ?? null, count: 0 };
    e.count += 1;
    countryT.set(name, e);
  }
  const countries = [...countryT.values()].sort((a, b) => b.count - a.count).slice(0, 15);

  // Regions
  const regionT = new Map<string, { country: string; region: string; code: string | null; count: number }>();
  for (const r of rows) {
    if (!r.region) continue;
    const key = `${r.country ?? "Unknown"}|${r.region}`;
    const e = regionT.get(key) ?? {
      country: r.country ?? "Unknown",
      region: r.region,
      code: r.country_code ?? null,
      count: 0,
    };
    e.count += 1;
    regionT.set(key, e);
  }
  const regions = [...regionT.values()].sort((a, b) => b.count - a.count).slice(0, 15);

  // Languages (primary tag only)
  const langT = new Map<string, number>();
  for (const r of rows) {
    if (!r.accept_language) continue;
    langT.set(r.accept_language, (langT.get(r.accept_language) ?? 0) + 1);
  }
  const languages = [...langT.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([code, count]) => ({ code, count }));

  // Browser family from user-agent (cheap heuristic).
  const browserT = new Map<string, number>();
  for (const r of rows) {
    const ua = r.user_agent ?? "";
    let name = "Other";
    if (/edg\//i.test(ua)) name = "Edge";
    else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) name = "Chrome";
    else if (/firefox\//i.test(ua)) name = "Firefox";
    else if (/safari\//i.test(ua)) name = "Safari";
    else if (/bot|crawl|spider/i.test(ua)) name = "Bot";
    browserT.set(name, (browserT.get(name) ?? 0) + 1);
  }
  const browsers = [...browserT.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Device: mobile vs desktop from UA.
  let mobile = 0;
  let desktop = 0;
  for (const r of rows) {
    if (/mobile|android|iphone|ipad/i.test(r.user_agent ?? "")) mobile += 1;
    else desktop += 1;
  }

  // Signed-in vs anonymous.
  let signedIn = 0;
  let anon = 0;
  for (const r of rows) {
    if (r.user_id) signedIn += 1;
    else anon += 1;
  }

  return NextResponse.json(
    {
      windowDays: 30,
      total: rows.length,
      countries,
      regions,
      languages,
      browsers,
      devices: { mobile, desktop },
      auth: { signedIn, anonymous: anon },
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
