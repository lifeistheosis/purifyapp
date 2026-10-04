// The shop's lists are read whole: the carts a note is owed for, the payments
// that excuse someone from one, and the sales a reorder line is worked out
// from.
//
// The API returns at most 1,000 rows a request, whatever .limit() asks for,
// and says nothing when it stops (docs/audit/findings.yaml F-31). Every read
// here goes through a stand-in that caps the way the real API does, so each
// of these fails if its read goes back to being one request.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import { sendCartReminders } from "../cartReminderSweep";
import { readStockLines } from "../lowStockServer";

const DAY = 86_400_000;
const pad = (i: number) => String(i).padStart(5, "0");

// With no postal address the marketing sender refuses the whole send before
// it looks anyone up, so nothing here can reach a mail provider.
beforeEach(() => vi.stubEnv("EMAIL_POSTAL_ADDRESS", ""));
afterEach(() => vi.unstubAllEnvs());

describe("cart notes", () => {
  const now = Date.parse("2026-10-04T12:00:00Z");
  const leftAt = new Date(now - 2 * DAY).toISOString();
  const switches = [{ id: 1, cart_reminders_enabled: true, cart_deal_email_enabled: false }];
  const carts = Array.from({ length: 1500 }, (_, i) => ({
    cart_token: `c${pad(i)}`,
    user_id: `r${pad(i)}`,
    item_count: 1,
    items: [{ slug: "icon-of-the-theotokos", title: "Icon of the Theotokos", quantity: 1 }],
    updated_at: leftAt,
  }));
  const order = (id: string, userId: string, at: number) => ({
    id,
    user_id: userId,
    payment_status: "paid",
    created_at: new Date(at).toISOString(),
  });
  // Twelve hundred orders from people with no cart, and after them in the
  // list the one that matters: a reader who paid a day after leaving a cart.
  const orders = [
    ...Array.from({ length: 1200 }, (_, i) => order(`o${pad(i)}`, `buyer${pad(i)}`, now - 3 * DAY)),
    order("z-late", "r00042", now - DAY),
  ];

  it("owes a note for every cart past the first thousand, and none to a reader who has since paid", async () => {
    const { client } = cappedApi({ shop_settings: switches, shop_carts: carts, shop_orders: orders });
    const report = await sendCartReminders(client, now);
    expect(report.errors).toEqual([]);
    expect(report.owed).toBe(1499);
    expect(report.reminders?.refused).toBe("no_postal_address");
  });

  it("sends nothing when the payments cannot be read, and says so", async () => {
    const { client } = cappedApi({
      shop_settings: switches,
      shop_carts: carts,
      shop_orders: { error: { message: "down" } },
    });
    const report = await sendCartReminders(client, now);
    expect(report.owed).toBe(0);
    expect(report.reminders).toBeUndefined();
    expect(report.errors).toEqual(["shop_orders: down"]);
  });
});

describe("the low stock line", () => {
  it("counts every sale in the window, past the first thousand orders", async () => {
    const now = Date.parse("2026-10-04T12:00:00Z");
    const { client } = cappedApi({
      shop_stores: [
        { id: "eikon", seller: { seller_type: "purify_owned" } },
        { id: "other", seller: { seller_type: "independent" } },
      ],
      shop_products: [
        { id: "p1", slug: "censer", title: "Censer", inventory_status: "ready_to_ship", quantity_available: 40, store_id: "eikon", status: "published" },
      ],
      shop_orders: Array.from({ length: 1300 }, (_, i) => ({
        id: `o${pad(i)}`,
        payment_status: "paid",
        created_at: new Date(now - 5 * DAY).toISOString(),
        items: [{ product_id: "p1", quantity: 1 }],
      })),
    });
    const lines = await readStockLines(client, now);
    expect(lines).toHaveLength(1);
    expect(lines[0].soldInWindow).toBe(1300);
  });
});
