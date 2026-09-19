import "server-only";

// The live numbers behind purifyapp.net/invest and the owner dashboard's
// Investors tab. One function, so the page an investor reads and the panel the
// owner reads can never disagree.
//
// COUNTS ONLY. Nothing here returns a row, an id, an email or a name: every
// field is a total, a share or a series of totals. The result is injected into
// a public page, so that is not a style preference, it is the whole safety
// argument for exposing it.
//
// EVERY LIST IS READ IN PAGES. The API returns at most 1,000 rows per request,
// so a single .limit(50_000) quietly stops at 1,000. That is how the owner
// dashboard's "Web sessions, 30d" came to read a flat 1,000 against a real
// figure near 13,000. Counts use `head` requests, and anything that needs rows
// goes through pageAll(), always ordered on a unique column so no row repeats
// or slips between two pages.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscriptionStats } from "@/lib/entitlements/adminStats";
import { estimatedMrrCents } from "@/lib/premium/mrr";
import { pageAll } from "@/lib/supabase/pageAll";
import { INVESTOR_PLAN } from "./plan";

const DAY_MS = 86_400_000;

export type InvestorLive = {
  asOf: string;
  accounts: {
    total: number;
    new30: number;
    /** Cumulative accounts at the end of each day from `start`, UTC. */
    daily: { start: string; values: number[] };
    /** Accounts at the end of the launch month, the base of the growth multiple. */
    atFirstMonthEnd: number;
  };
  pageviews: { total: number; last14: number };
  audience: {
    /** Distinct countries with at least one visit, all time. */
    countries: number;
    /** Share of the last 30 days' visits from the United States. */
    usShare30: number;
  };
  shop: {
    carts: number;
    cartItems: number;
    cartValueCents: number;
    paidOrders: number;
    paidCents: number;
    /** Paid in the last 30 days, the basis of the shop's revenue a year. */
    paid30Cents: number;
    /** Median of (price minus supplier cost) over price, published pieces. */
    medianMargin: number | null;
  };
  subscriptions: { paying: number; mrrCents: number };
  /** Revenue a year Purify is running at today, in dollars. */
  runRate: { subscriptions: number; shop: number; total: number };
};

async function countOf(q: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export async function getInvestorLive(admin: SupabaseClient = createAdminClient(), now = new Date()): Promise<InvestorLive> {
  const since = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();

  const [
    joined,
    total,
    new30,
    pageviewsTotal,
    pageviews14,
    sessions30,
    sessionsAll,
    carts,
    paidOrders,
    subs,
    products,
    sourcing,
  ] = await Promise.all([
    pageAll<{ id: string; joined_at: string }>((a, b) =>
      admin.from("profiles").select("id, joined_at").order("joined_at", { ascending: true }).order("id").range(a, b),
    ),
    countOf(admin.from("profiles").select("id", { count: "exact", head: true })),
    countOf(admin.from("profiles").select("id", { count: "exact", head: true }).gte("joined_at", since(30))),
    countOf(admin.from("analytics_pageviews").select("id", { count: "exact", head: true })),
    countOf(admin.from("analytics_pageviews").select("id", { count: "exact", head: true }).gte("ts", since(14))),
    pageAll<{ session_id: string; country_code: string | null }>((a, b) =>
      admin.from("analytics_sessions").select("session_id, country_code").gte("last_seen", since(30)).order("session_id").range(a, b),
    ),
    pageAll<{ session_id: string; country_code: string | null }>((a, b) =>
      admin.from("analytics_sessions").select("session_id, country_code").order("session_id").range(a, b),
    ),
    pageAll<{ cart_token: string; item_count: number; subtotal_cents: number }>((a, b) =>
      admin.from("shop_carts").select("cart_token, item_count, subtotal_cents").gt("item_count", 0).order("cart_token").range(a, b),
    ),
    pageAll<{ id: string; total_cents: number; created_at: string }>((a, b) =>
      admin.from("shop_orders").select("id, total_cents, created_at").eq("payment_status", "paid").order("id").range(a, b),
    ),
    subscriptionStats(admin),
    pageAll<{ id: string; price_cents: number }>((a, b) =>
      admin.from("shop_products").select("id, price_cents").eq("status", "published").order("id").range(a, b),
    ),
    pageAll<{ product_id: string; supplier_cost_cents: number | null }>((a, b) =>
      admin.from("shop_product_sourcing").select("product_id, supplier_cost_cents").order("product_id").range(a, b),
    ),
  ]);

  // Accounts per day, cumulative, from launch to today.
  const perDay = new Map<string, number>();
  for (const r of joined) {
    const d = String(r.joined_at).slice(0, 10);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  const start = INVESTOR_PLAN.launch;
  const values: number[] = [];
  let running = 0;
  const today = now.toISOString().slice(0, 10);
  for (let t = Date.parse(`${start}T00:00:00Z`); ; t += DAY_MS) {
    const key = new Date(t).toISOString().slice(0, 10);
    running += perDay.get(key) ?? 0;
    values.push(running);
    if (key >= today) break;
  }
  // Accounts before launch day (test rows) would be missed by the walk above;
  // the walk is anchored on launch, so fold any earlier ones into day one.
  const early = joined.filter((r) => String(r.joined_at).slice(0, 10) < start).length;
  if (early) for (let i = 0; i < values.length; i++) values[i] += early;
  const firstMonthEnd = new Date(Date.parse(`${start}T00:00:00Z`));
  const monthEndKey = new Date(Date.UTC(firstMonthEnd.getUTCFullYear(), firstMonthEnd.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const monthEndIndex = Math.round((Date.parse(`${monthEndKey}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS);
  const atFirstMonthEnd = values[Math.min(monthEndIndex, values.length - 1)] ?? 0;

  // Where the visits come from.
  const us30 = sessions30.filter((s) => (s.country_code ?? "").toUpperCase() === "US").length;
  const countries = new Set(
    sessionsAll.map((s) => (s.country_code ?? "").toUpperCase()).filter((c) => c && c !== "XX"),
  ).size;

  // The shop.
  const since30 = since(30);
  const paidCents = paidOrders.reduce((n, o) => n + (o.total_cents ?? 0), 0);
  const paid30Cents = paidOrders
    .filter((o) => o.created_at >= since30)
    .reduce((n, o) => n + (o.total_cents ?? 0), 0);
  const costById = new Map(sourcing.map((s) => [s.product_id, s.supplier_cost_cents]));
  const margins = products
    .map((p) => {
      const cost = costById.get(p.id);
      return p.price_cents > 0 && typeof cost === "number" ? (p.price_cents - cost) / p.price_cents : null;
    })
    .filter((m): m is number => m !== null);

  const paying = subs.paidCounts.plusOnly + subs.paidCounts.pro;
  const mrrCents = estimatedMrrCents(subs.paidCounts);
  const subsYear = (mrrCents * 12) / 100;
  const shopYear = (paid30Cents * 12) / 100;

  return {
    asOf: now.toISOString(),
    accounts: { total, new30, daily: { start, values }, atFirstMonthEnd },
    pageviews: { total: pageviewsTotal, last14: pageviews14 },
    audience: {
      countries,
      usShare30: sessions30.length ? us30 / sessions30.length : 0,
    },
    shop: {
      carts: carts.length,
      cartItems: carts.reduce((n, c) => n + (c.item_count ?? 0), 0),
      cartValueCents: carts.reduce((n, c) => n + (c.subtotal_cents ?? 0), 0),
      paidOrders: paidOrders.length,
      paidCents,
      paid30Cents,
      medianMargin: median(margins),
    },
    subscriptions: { paying, mrrCents },
    runRate: { subscriptions: subsYear, shop: shopYear, total: subsYear + shopYear },
  };
}
