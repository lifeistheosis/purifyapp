import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Shop revenue, bucketed by UTC day, with the days actually attached.
 *
 * WHY THIS EXISTS AT ALL. /api/admin/overview already computes a 30 point daily
 * net series, and it is unusable for a calendar for four separate reasons:
 *
 *   1. It throws the dates away. The route computes a day key inside its loop
 *      and serializes only `number[]`. The payload has no `generatedAt` either,
 *      so a client cannot reconstruct the anchor even approximately.
 *   2. It is re-anchored every 60 seconds against the server's clock. Across
 *      UTC midnight the array shifts by one position with nothing in it to
 *      detect the shift, so a client that inferred dates would be a day wrong
 *      for the rest of the session.
 *   3. It caps at 1000 orders, newest first. Past that the OLDEST days silently
 *      read zero, which on a calendar paints as "no sales that day" rather than
 *      "not counted".
 *   4. It is labelled "Shop, donations, subs" in the hero and is shop only.
 *
 * This route fixes all four for its own output. It does not touch the overview
 * route, which many other cards depend on.
 *
 * TWO THINGS THIS DATA IS NOT, both of which the UI must say out loud:
 *
 * SHOP ONLY. Donations exist only as monthly rows and the daily cron overwrites
 * its own snapshots (year_month is the primary key), so no daily donation
 * history has ever been retained. Subscription revenue has no date dimension at
 * all and is an estimated run rate. Neither can be placed on a day, so neither
 * is here, and the metric is named "Shop revenue" rather than "Revenue".
 *
 * CHECKOUT START, NOT SETTLEMENT. There is no paid_at column on shop_orders;
 * the Stripe webhook flips payment_status without stamping a time. So an order
 * created at 23:50 UTC on the 17th and paid on the 18th is counted on the 17th.
 * For a sparkline that is noise. On a calendar, where a specific day is being
 * pointed at, it is a claim, so the day view states it.
 */

/** Paid counts, refunded is kept so the order is visible and contributes zero. */
const isRevenue = (s: string) => s === "paid" || s === "refunded";
const netOf = (o: { total_cents: number; payment_status: string }) =>
  o.payment_status === "refunded" ? 0 : o.total_cents;

/** One page of rows. Supabase caps a request well below a busy month. */
const PAGE = 1000;
/** Refuse a range that would page forever. Two years of daily buckets. */
const MAX_DAYS = 750;

function isDayKey(v: string | null): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12),
  );

  // Default: the 90 days ending today, enough to fill a month grid plus the
  // adjacent months it spills into.
  const to = isDayKey(toParam) ? toParam : keyOf(todayUtc);
  const from = isDayKey(fromParam) ? fromParam : keyOf(shift(todayUtc, -89));

  if (from > to) {
    return NextResponse.json({ error: "from is after to" }, { status: 400 });
  }
  if (daySpan(from, to) > MAX_DAYS) {
    return NextResponse.json(
      { error: `Range too wide. ${MAX_DAYS} days maximum.` },
      { status: 400 },
    );
  }

  // Inclusive of the whole `to` day, so an order at 23:59 on the last day is
  // counted. Exclusive upper bound on the following midnight rather than
  // `lte` on a date string, which would silently drop that day's afternoon.
  const startIso = `${from}T00:00:00.000Z`;
  const endIso = `${addOneDay(to)}T00:00:00.000Z`;

  const supa = createAdminClient();

  // PAGED, not capped. The overview route's .limit(1000) is exactly the bug
  // this avoids: it drops the oldest orders, which on a calendar are the days
  // furthest from today, and paints them as days with no sales.
  const rows: { total_cents: number; payment_status: string; created_at: string }[] = [];
  let offset = 0;
  let truncated = false;
  for (;;) {
    const { data, error } = await supa
      .from("shop_orders")
      .select("total_cents, payment_status, created_at")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      return NextResponse.json(
        { error: "Could not read orders", detail: error.message },
        { status: 500 },
      );
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as typeof rows));
    if (data.length < PAGE) break;
    offset += PAGE;
    // A hard stop so a pathological range cannot loop forever. Reported rather
    // than swallowed, because a silently short answer is the original defect.
    if (offset > PAGE * 50) {
      truncated = true;
      break;
    }
  }

  // Every day in the range, including the ones with nothing in them. A calendar
  // needs to know the difference between a day that sold nothing and a day
  // outside the range, and only an explicit zero can say the first.
  const buckets = new Map<string, { netCents: number; orderCount: number }>();
  for (let d = from; d <= to; d = addOneDay(d)) {
    buckets.set(d, { netCents: 0, orderCount: 0 });
  }

  for (const o of rows) {
    if (!isRevenue(o.payment_status)) continue;
    // The created_at column is an ISO timestamp in UTC, so the first ten
    // characters are its UTC calendar day. Same slice the overview route and
    // the analytics buckets use, so every surface agrees on which day is which.
    const day = o.created_at.slice(0, 10);
    const b = buckets.get(day);
    if (!b) continue;
    b.netCents += netOf(o);
    b.orderCount += 1;
  }

  const days = [...buckets.entries()].map(([date, b]) => ({
    date,
    netCents: b.netCents,
    orderCount: b.orderCount,
  }));

  return NextResponse.json(
    {
      days,
      from,
      to,
      // Present, unlike on /api/admin/overview, so a client can tell how old
      // this answer is and whether it straddles a UTC midnight.
      generatedAt: new Date().toISOString(),
      basis: "shop_orders.created_at",
      truncated,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/* Local day helpers. Deliberately not imported from lib/rhythm/dayKey.ts:
   that module is client-facing and pulls in the liturgical calendar for
   startOfDayLocal, which has no business in a server route that only ever
   speaks UTC. These three are the UTC-noon frame and nothing else. */

function keyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function shift(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function addOneDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return keyOf(shift(new Date(Date.UTC(y, m - 1, d, 12)), 1));
}

function daySpan(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}
