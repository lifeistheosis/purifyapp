import { NextResponse, type NextRequest } from "next/server";

import { SUPPORT, type ExpenseLine } from "@/data/support/support";
import { getAdminUser } from "@/lib/admin/access";
import {
  goodsAtCost,
  landedAt,
  moneyFigures,
  moneyWindow,
  plusAfterCut,
  shopBuckets,
  shopNet,
  type MoneyOrder,
  type MoneyPeriod,
} from "@/lib/admin/money";
import { cachedLedger, summarise } from "@/lib/billing/stripeLedger";
import { subscriptionStats } from "@/lib/entitlements/adminStats";
import { estimatedMrrCents } from "@/lib/premium/mrr";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAllSettled } from "@/lib/supabase/pageAll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Money's Overview: what came in, what went out, and what was kept (the
 * owner's pick A on sheet r3-15, 2026-10-30). lib/admin/money.ts says what
 * each figure is made of and which are estimates.
 *
 * Every part is read on its own and checked: the shop's orders, the cost of
 * what they sold (Catalogue's sourcing), who pays for Plus, the cost lines,
 * the donations typed in by hand, and Stripe's fees from its own ledger. A
 * part that does not answer is null and named in `unread`; nothing is
 * written. Read when the view opens or the period changes, never on a timer,
 * because Stripe's ledger is a call to Stripe.
 *
 * Admin only: 403 to anyone else.
 */

const PERIODS: readonly MoneyPeriod[] = ["month", "30d", "90d", "12m"];
const NO_STORE = { headers: { "Cache-Control": "no-store" } };

type Order = MoneyOrder & { email: string | null };

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const asked = req.nextUrl.searchParams.get("period") ?? "month";
  const period: MoneyPeriod = (PERIODS as readonly string[]).includes(asked) ? (asked as MoneyPeriod) : "month";
  const now = new Date();
  const w = moneyWindow(period, now);
  const admin = createAdminClient();
  const unread: string[] = [];

  const [ordersRes, openRes, expensesRes, donationsRes, subs] = await Promise.all([
    // The period and the one before it, for the chart, by when the money
    // landed (or the checkout started, where no payment time was recorded).
    pageAllSettled((from, to) =>
      admin
        .from("shop_orders")
        .select("email, total_cents, payment_status, created_at, paid_at, items:shop_order_items(product_id, quantity)")
        .in("payment_status", ["paid", "refunded"])
        .or(`paid_at.gte."${w.beforeSince}",and(paid_at.is.null,created_at.gte."${w.beforeSince}")`)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    // Checkouts still open: begun in the last day and not paid. Older ones
    // are abandoned, and Orders and the attention strip say so.
    admin
      .from("shop_orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "pending")
      .gte("created_at", new Date(now.getTime() - 86_400_000).toISOString()),
    admin.from("expense_lines").select("monthly_cents, active"),
    admin.from("donations_monthly").select("year_month, total_cents, goal_cents").order("year_month", { ascending: true }),
    subscriptionStats(admin).catch((e: Error) => {
      console.warn("[admin/money] entitlements read failed", e.message);
      return null;
    }),
  ]);

  // ── The shop ─────────────────────────────────────────────────────────
  const all = ordersRes.error ? null : (ordersRes.data as Order[]);
  if (ordersRes.error) unread.push("the orders");
  const inWindow = (all ?? []).filter((o) => landedAt(o) >= w.since);
  const shop = all ? shopNet(inWindow) : null;

  // ── The goods, at their cost in Catalogue ────────────────────────────
  let goods: { cents: number; units: number; unknownUnits: number } | null = null;
  if (all) {
    const ids = [...new Set(inWindow.flatMap((o) => (o.items ?? []).map((i) => i.product_id)).filter((id): id is string => Boolean(id)))];
    const cost = new Map<string, number | null>();
    let costRead = true;
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await admin
        .from("shop_product_sourcing")
        .select("product_id, supplier_cost_cents")
        .in("product_id", ids.slice(i, i + 100));
      if (error) {
        costRead = false;
        break;
      }
      for (const s of (data ?? []) as { product_id: string; supplier_cost_cents: number | null }[]) cost.set(s.product_id, s.supplier_cost_cents);
    }
    if (costRead) goods = goodsAtCost(inWindow, cost);
    else unread.push("the goods' costs");
  }

  // ── Plus, after the stores' cut (an estimate) ───────────────────────
  let plusCents: number | null = null;
  if (subs) {
    const store = (subs.bySource.apple ?? 0) + (subs.bySource.google ?? 0);
    const web = subs.bySource.stripe ?? 0;
    plusCents = plusAfterCut(estimatedMrrCents(subs.paidCounts), w.months, store + web > 0 ? store / (store + web) : 1);
  } else unread.push("who pays for Plus");

  // ── The cost lines, a month of them per month in the period ─────────
  let monthlyCostCents: number | null = null;
  let costLines = 0;
  if (expensesRes.error) unread.push("the cost lines");
  else {
    const rows = (expensesRes.data ?? []) as { monthly_cents: number; active: boolean }[];
    // An empty table falls back to the committed list, as the Costs view does.
    const lines =
      rows.length > 0
        ? rows.filter((r) => r.active).map((r) => r.monthly_cents)
        : (SUPPORT.expenses as ExpenseLine[]).map((e) => Math.round(e.monthlyUsd * 100));
    monthlyCostCents = lines.reduce((a, b) => a + b, 0);
    costLines = lines.length;
  }

  // ── Stripe's fees, from its own ledger ──────────────────────────────
  let feesCents: number | null = null;
  let stripeNote: string | null = null;
  const ledger = await cachedLedger(period === "30d" ? "30d" : period === "12m" ? "all" : "90d", new Map()).catch(() => null);
  if (!ledger) stripeNote = "Stripe could not be asked just now";
  else if (!ledger.configured) stripeNote = "Stripe is not connected on this server";
  else if (ledger.error) stripeNote = "Stripe's ledger could not be read just now";
  else feesCents = summarise(ledger.rows.filter((r) => r.created >= w.since)).feesCents;
  if (stripeNote) unread.push("Stripe's fees");

  // ── Donations, typed in by hand, apart ──────────────────────────────
  const donationRows = donationsRes.error ? null : ((donationsRes.data ?? []) as { year_month: string; total_cents: number; goal_cents: number | null }[]);
  const sinceMonth = w.since.slice(0, 7);
  const donationsCents = donationRows ? donationRows.filter((d) => d.year_month >= sinceMonth).reduce((a, d) => a + d.total_cents, 0) : null;
  const thisMonth = now.toISOString().slice(0, 7);
  const monthRow = donationRows?.find((d) => d.year_month === thisMonth) ?? null;

  const figures = moneyFigures({
    shopCents: shop?.netCents ?? null,
    plusCents,
    costLinesCents: monthlyCostCents === null ? null : monthlyCostCents * w.months,
    goodsCents: goods?.cents ?? null,
    goodsUnknownUnits: goods?.unknownUnits ?? 0,
    feesCents,
  });

  const recent = (all ?? [])
    .filter((o) => o.payment_status === "paid")
    .sort((a, b) => (landedAt(b) > landedAt(a) ? 1 : -1))
    .slice(0, 5)
    .map((o) => ({ email: o.email, totalCents: o.total_cents, at: landedAt(o) }));

  return NextResponse.json(
    {
      period,
      label: w.label,
      beforeLabel: w.beforeLabel,
      since: w.since,
      months: w.months,
      buckets: w.buckets,
      cameIn: { ...figures.cameIn, shopCents: shop?.netCents ?? null, plusCents },
      wentOut: {
        ...figures.wentOut,
        costLinesCents: monthlyCostCents === null ? null : monthlyCostCents * w.months,
        goodsCents: goods?.cents ?? null,
        goodsUnits: goods?.units ?? null,
        goodsUnknownUnits: goods?.unknownUnits ?? 0,
        feesCents,
        stripeNote,
      },
      kept: figures.kept,
      donations: {
        // SELF-REPORTED: shown apart, never in a total (lib/admin/profit.ts).
        cents: donationsCents,
        recorded: (donationRows?.length ?? 0) > 0,
        thisMonthCents: monthRow?.total_cents ?? null,
        goalCents: typeof monthRow?.goal_cents === "number" ? monthRow.goal_cents : SUPPORT.monthlyGoalUsd * 100,
      },
      chart: all ? shopBuckets(all, w, now) : null,
      recent,
      lines: {
        revenue: {
          paidOrders: shop?.paid ?? null,
          averageCents: shop && shop.paid > 0 ? Math.round(shop.netCents / shop.paid) : null,
          refunds: shop?.refunded ?? null,
          openCheckouts: openRes.error ? null : (openRes.count ?? 0),
        },
        subscriptions: subs
          ? {
              paying: subs.paidPlus,
              pro: subs.paidCounts.pro,
              comped: subs.compedPlus,
              gifted: subs.giftedPlus,
              grandfathered: subs.legacyPlus,
            }
          : null,
        costs: { monthlyCents: monthlyCostCents, lines: costLines },
      },
      unread,
      generatedAt: now.toISOString(),
    },
    NO_STORE,
  );
}
