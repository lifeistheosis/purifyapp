// One bell for everything (2.0). His word, 2026-11-28: "make the notification
// button on the app a universal notification system (updates/announcements
// from purify, updates about their orders, updates to pray, updates from
// community etc)". The sheet sets each under its own name: the reader's
// orders, Pray together, other readers, and Purify (its announcement, what
// its moderators sent, What's new).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { aboutPrayer, type CommunityNotification } from "@/lib/community/inbox";
import { boardFresh } from "@/lib/notifications/board";
import { ORDER_NOTICE_COLS, ORDER_NOTICES_SHOWN, freshOrders, orderNotices, type OrderNoticeRow } from "@/lib/notifications/orders";
import { STATUS_KEY } from "@/lib/shop/orderStory";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const NOW = Date.parse("2026-11-28T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const order = (id: string, o: Partial<OrderNoticeRow>): OrderNoticeRow => ({
  id,
  payment_status: "paid",
  fulfillment_status: "supplier_order_placed",
  created_at: daysAgo(10),
  paid_at: daysAgo(10),
  updated_at: daysAgo(2),
  items: [{ title: "The Theotokos of Kazan" }],
  ...o,
});

describe("the reader's orders in the bell", () => {
  it("shows paid orders that changed in the last thirty days, newest change first, five at most", () => {
    const rows = [
      order("old", { updated_at: daysAgo(40) }),
      order("unpaid", { payment_status: "pending", updated_at: daysAgo(0) }),
      order("cancelled", { payment_status: "cancelled", updated_at: daysAgo(0) }),
      order("a", { updated_at: daysAgo(3) }),
      order("b", { updated_at: daysAgo(1), items: [{ title: "Prayer rope" }, { title: "Censer" }, { title: "Charcoal" }] }),
    ];
    const notices = orderNotices(rows, NOW);
    expect(notices.map((n) => n.id)).toEqual(["b", "a"]);
    expect(notices[0]).toMatchObject({ first: "Prayer rope", more: 2, href: "/shop/orders/detail?id=b", statusKey: STATUS_KEY[notices[0].status] });
    const many = Array.from({ length: 9 }, (_, i) => order(`o${i}`, { updated_at: daysAgo(i) }));
    expect(orderNotices(many, NOW)).toHaveLength(ORDER_NOTICES_SHOWN);
    // A state the bell does not know is left out rather than drawn without a word.
    expect(orderNotices([order("odd", { fulfillment_status: "lost_at_sea" as OrderNoticeRow["fulfillment_status"] })], NOW)).toEqual([]);
  });

  it("lights the bell for an order whose word changed, never before the device has seen the orders", () => {
    const notices = orderNotices([order("a", {}), order("b", { updated_at: daysAgo(1) })], NOW);
    expect(freshOrders(notices, null).size).toBe(0);
    const seen = Object.fromEntries(notices.map((n) => [n.id, n.status]));
    expect(freshOrders(notices, seen).size).toBe(0);
    expect([...freshOrders(notices, { ...seen, a: "Order Confirmed" })]).toEqual(["a"]);
    expect([...freshOrders(notices, { a: seen.a })]).toEqual(["b"]);
  });

  it("asks only for what the bell shows: no pictures, no addresses, no money", () => {
    expect(ORDER_NOTICE_COLS).not.toMatch(/media|address|cents|tracking/);
  });
});

describe("Purify's announcement in the bell", () => {
  it("is new once, when its date is past the one the device last saw", () => {
    expect(boardFresh(null, "2026-11-10")).toBe(false);
    expect(boardFresh({ date: "2026-11-10" }, null)).toBe(false);
    expect(boardFresh({ date: "2026-11-10" }, "2026-11-10")).toBe(false);
    expect(boardFresh({ date: "2026-11-24" }, "2026-11-10")).toBe(true);
  });
});

describe("Pray together in the bell", () => {
  const n = (kind: CommunityNotification["kind"], target_kind: string | null = null) => ({ kind, target_kind });
  it("holds who prayed, name days and a prayer campaign's news; what Purify sent stays Purify's", () => {
    expect(aboutPrayer(n("prayed"))).toBe(true);
    expect(aboutPrayer(n("name_day"))).toBe(true);
    expect(aboutPrayer(n("reply", "campaign"))).toBe(true);
    expect(aboutPrayer(n("reply", "post"))).toBe(false);
    expect(aboutPrayer(n("mention"))).toBe(false);
    expect(aboutPrayer(n("approved", "campaign"))).toBe(false);
  });
});

describe("the sheet", () => {
  const sheet = read("components/nav/NotificationsSheet.tsx");
  it("sets each under its own name, in order: orders, Pray together, other readers, Purify", () => {
    const at = (s: string) => sheet.indexOf(s);
    expect(at('data-bell="orders"')).toBeGreaterThan(-1);
    expect(at('data-bell="orders"')).toBeLessThan(at('data-bell="prayer"'));
    expect(at('data-bell="prayer"')).toBeLessThan(at('data-bell="readers"'));
    expect(at('data-bell="readers"')).toBeLessThan(at('data-bell="purify"'));
    for (const key of ["shop.yourOrders", "community.prayTogether", "community.notifications", "notifications.fromPurify"]) expect(sheet).toContain(`t("${key}")`);
    // Each row once: a prayer row is not also a row from other readers.
    expect(sheet).toContain("rows.filter((n) => !fromPurify(n) && !aboutPrayer(n))");
    // The announcement opens What's new, where it stands in full.
    expect(sheet).toMatch(/\{board \? \(\s*<li>\s*<Link href="\/whats-new"/);
  });

  it("lights the bell for a new announcement or an order's new word too", () => {
    expect(read("components/nav/NotificationsButton.tsx")).toContain(
      "const lit = inbox.unread > 0 || whatsNewUnseen(seen) || hasUnseenEnd(downloads) || boardNew || ordersNew.size > 0;",
    );
  });
});
