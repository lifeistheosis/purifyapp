import { NextResponse, type NextRequest } from "next/server";
import { getLocalizedPrayerJson } from "@/lib/i18n/localizedContent";
import { resolveLocale } from "@/lib/i18n/locales";

export const runtime = "nodejs";

// Serves the localized rule JSON for the service worker to precache.
// /api/prayer/rule/morning → data/prayers/rules/morning.{locale}.json
//                           (falls back to morning.json)
//
// 5-minute browser cache is fine; the worker bumps its own cache name on
// release. This route is one of the few /api/* paths the service worker
// is allowed to cache (the prefix is otherwise on the NEVER_CACHE list,
// but the prayer-rule path is explicit on the precache list).
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ruleId: string }> },
) {
  const { ruleId } = await ctx.params;
  if (!/^[a-z0-9-]+$/.test(ruleId)) {
    return NextResponse.json({ error: "Bad rule id" }, { status: 400 });
  }
  const locale = resolveLocale(req.nextUrl.searchParams.get("locale"));
  const result = await getLocalizedPrayerJson(`rules/${ruleId}.json`, locale);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { rule: result.data, isLocalized: result.isLocalized, locale },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } },
  );
}
