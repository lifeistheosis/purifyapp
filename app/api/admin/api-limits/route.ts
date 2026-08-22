import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isApiConfigured } from "@/lib/bible/api-bible";
import { readApiBibleUsage } from "@/lib/bible/apiUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where this project stands against the API.Bible free tier.
 *
 * Three ceilings: 150,000 calls a month, 100,000 monthly active users, and a
 * non-commercial condition. Crossing any one needs enterprise terms from
 * support@api.bible.
 *
 * EVERY FIGURE HERE IS MEASURED OR REPORTED AS NULL. A compliance dashboard
 * that fills a gap with a plausible number is worse than one that admits the
 * gap, because the number it invents is always the reassuring one.
 */

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  // Calls are counted per UTC day, so the month-to-date figure starts at the
  // first of the current UTC month rather than 30 days ago. The ceiling is a
  // calendar-month one and comparing a rolling 30 days against it would be a
  // different question wearing the same number.
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const usage = await readApiBibleUsage(monthStart);

  const [sessionsRes, signedInRes, entitlementsRes, ordersRes] = await Promise.all([
    // Every session started in the window. A session is not a person: one
    // reader across three devices and two weeks is several rows. This is
    // therefore a CEILING on monthly actives, never the figure itself.
    supa
      .from("analytics_sessions")
      .select("session_id", { count: "exact", head: true })
      .gte("first_seen", since),

    // Sessions that knew who the reader was. Distinct users among these would
    // be a floor, if the column were ever written.
    supa
      .from("analytics_sessions")
      .select("user_id")
      .gte("first_seen", since)
      .not("user_id", "is", null),

    // Monetization, part one: an entitlement whose source is a store is a
    // purchase. `comp` is a gift and proves nothing about commerce.
    supa.from("entitlements").select("plus_source, plus_until, pro_until"),

    // Monetization, part two: a paid order is money regardless of subscriptions.
    supa
      .from("shop_orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid"),
  ]);

  const sessions30 = sessionsRes.error ? null : sessionsRes.count ?? 0;

  const signedInUsers30 = signedInRes.error
    ? null
    : new Set(
        (signedInRes.data ?? [])
          .map((r) => (r as { user_id: string | null }).user_id)
          .filter((v): v is string => typeof v === "string"),
      ).size;

  const nowMs = now.getTime();
  const ents = entitlementsRes.error ? [] : (entitlementsRes.data ?? []);
  const paidSources = ents.filter((e) => {
    const r = e as { plus_source: string | null };
    return r.plus_source !== null && r.plus_source !== "comp";
  }).length;
  const activePlus = ents.filter((e) => {
    const r = e as { plus_until: string | null };
    return r.plus_until !== null && Date.parse(r.plus_until) > nowMs;
  }).length;
  const activePro = ents.filter((e) => {
    const r = e as { pro_until: string | null };
    return r.pro_until !== null && Date.parse(r.pro_until) > nowMs;
  }).length;

  const paidOrders = ordersRes.error ? 0 : ordersRes.count ?? 0;

  // Monetized on evidence, not on a setting someone forgot to flip. A store
  // purchase or a paid order is money having changed hands; either is enough.
  const monetized = paidSources > 0 || paidOrders > 0;

  const licensedConfigured = (["niv", "nkjv", "nlt"] as const).filter((t) =>
    isApiConfigured(t),
  );

  return NextResponse.json(
    {
      // Real requests this UTC month, deduplicated against the six-hour fetch
      // cache so this counts calls to API.Bible rather than readers opening a
      // cached chapter. Null when the counter could not be read, which the
      // panel renders as "not measured" and never as zero.
      monthlyCalls: usage.monthToDate,
      callsInstrumented: true,
      /** Per-day counts, so the calendar can paint API usage like any series. */
      callsByDay: usage.days,

      mau: {
        /** Upper bound. Sessions, not people. */
        ceiling: sessions30,
        /** Lower bound from identified sessions. Zero where the column is unwritten. */
        floor: signedInUsers30,
      },

      monetized,
      monetization: {
        paidEntitlements: paidSources,
        activePlus,
        activePro,
        paidOrders,
      },

      /** Which licensed translations are actually switched on in this environment. */
      licensedConfigured,
      apiBibleLive: licensedConfigured.length > 0,

      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
