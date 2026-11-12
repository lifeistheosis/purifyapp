import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { giftFocus, type OrderGiftOrder } from "../orderGift";

/**
 * Two faults on /gift/ (the gate's final run of 2026-11-12; the arbiter's word
 * of 02:08 UTC).
 *
 * A buyer whose parcel's recipient had claimed the month with its label was
 * told "We could not find an EIKON order on this account", with "Your other
 * orders: Order EIK-..., Already claimed" under it: no order was chosen for
 * the ticket when every gift had been claimed by someone else, so the page
 * fell through to the words for a reader with no order. The newest order is
 * now the ticket's, and the ticket's own words for it are true: "This order's
 * gift has already been claimed." (orderGift.errAlready), the rest still
 * "Your other orders". No new words were needed.
 *
 * And "Try again", shown when the gift's state cannot be read, was 85 by 36
 * to a finger: it is 44 tall now.
 *
 * What it cannot see: the screen. The export check draws the page in these
 * states and measures them.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const order = (id: string, paidAt: string, o: Partial<OrderGiftOrder> = {}): OrderGiftOrder => ({
  id,
  number: `EIK-${id.toUpperCase().padEnd(8, "0")}`,
  paidAt,
  months: 1,
  delivered: true,
  claimed: false,
  mine: false,
  ...o,
});

describe("the order the gift page's ticket is about", () => {
  it("is the newest order when every gift was claimed by someone else, not none", () => {
    const orders = [order("a", "2026-10-01", { claimed: true }), order("b", "2026-11-01", { claimed: true })];
    expect(giftFocus(orders, null)?.id).toBe("b");
  });

  it("is none only for a reader with no order at all", () => {
    expect(giftFocus([], null)).toBeNull();
  });

  it("keeps the choices it made before, in their order", () => {
    const a = order("a", "2026-09-01", { claimed: true, mine: true });
    const b = order("b", "2026-10-01");
    const c = order("c", "2026-11-01", { delivered: false });
    expect(giftFocus([a, b, c], null, "a")?.id).toBe("a"); // just claimed
    expect(giftFocus([a, b, c], "b")?.id).toBe("b"); // being claimed on arrival
    expect(giftFocus([a, b, c], null)?.id).toBe("c"); // still on its way
    expect(giftFocus([a, b], null)?.id).toBe("b"); // nobody has claimed it
    expect(giftFocus([a, order("d", "2026-11-02", { claimed: true })], null)?.id).toBe("a"); // this reader claimed it
  });

  it("is read by the page, whose ticket says a claimed order's gift was claimed", () => {
    const page = read("components/gifts/OrderGiftClient.tsx");
    expect(page).toContain("const focus: OrderGiftOrder | null = giftFocus(orders, autoId, claimed?.orderId);");
    expect(page).toContain('{focus.mine ? t("orderGift.claimedEarlier") : t("orderGift.errAlready")}');
  });
});

describe("the present's form, for a parcel someone else sent", () => {
  // A buyer may be sent a parcel too: since the ticket takes a reader's own order (giftFocus), the form had
  // gone from every reader with an order (the arbiter's word of 05:05 UTC). It stands below their own
  // orders for every signed-in reader, but not while a plan runs, when a claim writes nothing ("has_plus").
  const page = read("components/gifts/OrderGiftClient.tsx");

  it("stands for every signed-in reader with no plan running, orders of their own or none", () => {
    expect(page).toContain("const showForm = state?.signedIn === true && !plus?.running && !lit;");
    expect(page).not.toMatch(/const showForm = [^;]*focus/);
  });

  it("stands below the reader's own orders, in the house's own section, in the words it had", () => {
    const orders = page.indexOf("{others.length > 0 ? (");
    const form = page.indexOf("{showForm ? (");
    expect(orders).toBeGreaterThan(0);
    expect(form).toBeGreaterThan(orders);
    expect(page).toMatch(/\{showForm \? \(\s*<form onSubmit=\{claimByNumber\} className="mt-6">\s*<p className="set-h">\{t\("orderGift\.otherTitle"\)\}<\/p>\s*<p className="set-hint">\{t\("orderGift\.otherBody"\)\}<\/p>/);
  });
});

describe("the gift page's Try again", () => {
  it("is 44 tall to a finger", () => {
    const page = read("components/gifts/OrderGiftClient.tsx");
    expect(page).toMatch(/className="set-btn shrink-0"[\s\S]{0,200}?style=\{\{ minHeight: 44 \}\}\s*>\s*\{t\("orderGift\.retry"\)\}/);
  });
});
