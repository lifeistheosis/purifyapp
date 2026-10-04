// What a store made is added up from every order it has.
//
// The seller's earnings page and the "Earned" card were handed the list the
// orders page reads, which stops at the newest 500, and printed its sum as
// the store's total. Nothing on the page said so. listAllSellerOrders reads
// every order in pages; the stand-in here caps at 1,000 rows a request, as
// the real API does (docs/audit/findings.yaml F-31, F-38).

import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

let client: SupabaseClient;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => client }));

const { listAllSellerOrders, listSellerOrders } = await import("../sellerData");
const { earningsSummary, monthlyEarnings } = await import("../earnings");

const pad = (i: number) => String(i).padStart(5, "0");
const start = Date.parse("2026-01-01T00:00:00Z");

// 1,300 paid orders of $20 for one store, an hour apart, and some of another's.
const orders = [
  ...Array.from({ length: 1300 }, (_, i) => ({
    id: `o${pad(i)}`,
    seller_id: "store",
    items_total_cents: 1500,
    shipping_cents: 500,
    tax_cents: 0,
    total_cents: 2000,
    currency: "usd",
    payment_status: "paid",
    fulfillment_status: "delivered",
    created_at: new Date(start + i * 3_600_000).toISOString(),
    items: [{ product_id: "p1", title: "Censer", unit_price_cents: 1500, quantity: 1 }],
  })),
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `x${pad(i)}`,
    seller_id: "another-store",
    items_total_cents: 900,
    shipping_cents: 0,
    tax_cents: 0,
    total_cents: 900,
    currency: "usd",
    payment_status: "paid",
    fulfillment_status: "delivered",
    created_at: new Date(start + i * 3_600_000).toISOString(),
    items: [],
  })),
];

describe("a seller's orders", () => {
  it("are all read for a total, past 500 and past a thousand, newest first", async () => {
    ({ client } = cappedApi({ shop_orders: orders }));
    const all = await listAllSellerOrders("store");
    expect(all).toHaveLength(1300);
    expect(all[0].id).toBe("o01299");
    expect(all[all.length - 1].id).toBe("o00000");
    expect(new Set(all.map((o) => o.id)).size).toBe(1300);
  });

  it("add up to what the store made, where the newest 500 fall short", async () => {
    ({ client } = cappedApi({ shop_orders: orders }));
    const whole = earningsSummary(await listAllSellerOrders("store"), new Map());
    expect(whole.paidOrderCount).toBe(1300);
    expect(whole.grossCents).toBe(1300 * 2000);

    // The list the orders page reads is still the newest 500, on purpose.
    const listed = await listSellerOrders("store");
    expect(listed).toHaveLength(500);
    expect(earningsSummary(listed, new Map()).grossCents).toBe(500 * 2000);
  });

  it("keep the first months in the table", async () => {
    ({ client } = cappedApi({ shop_orders: orders }));
    const months = monthlyEarnings(await listAllSellerOrders("store")).map((m) => m.month);
    expect(months).toContain("2026-01");
    expect(monthlyEarnings(await listSellerOrders("store")).map((m) => m.month)).not.toContain("2026-01");
  });

  it("answer an empty list when the read fails, as the console expects", async () => {
    ({ client } = cappedApi({ shop_orders: { error: { message: "down" } } }));
    expect(await listAllSellerOrders("store")).toEqual([]);
  });
});
