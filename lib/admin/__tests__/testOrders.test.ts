// His own test shop orders, kept out of the money (his item 54): an order
// placed with a developer account's email is his test, whatever its case, and
// so is the Stripe ledger's copy of its charge. Everything else stays.

import { describe, expect, it } from "vitest";

import { DEVELOPER_EMAILS } from "@/lib/dev/developer";

import { isOwnTestOrder, notOwnTestOrdersFilter, withoutOwnTestCharges, withoutOwnTestOrders } from "../testOrders";

const DEV = DEVELOPER_EMAILS[0];

describe("his own test orders", () => {
  it("are the orders placed with a developer account's email, in any case", () => {
    expect(isOwnTestOrder({ email: DEV })).toBe(true);
    expect(isOwnTestOrder({ email: ` ${DEV.toUpperCase()} ` })).toBe(true);
    expect(isOwnTestOrder({ email: "reader@example.com" })).toBe(false);
    expect(isOwnTestOrder({ email: null })).toBe(false);
    expect(isOwnTestOrder({})).toBe(false);
  });

  it("leave the money, and every other order stays in its order", () => {
    const orders = [
      { id: "a", email: "reader@example.com", total_cents: 2500 },
      { id: "b", email: DEV, total_cents: 4999 },
      { id: "c", email: null, total_cents: 1200 },
    ];
    expect(withoutOwnTestOrders(orders).map((o) => o.id)).toEqual(["a", "c"]);
  });

  it("are left out of a count the database makes, while an order with no email stays", () => {
    const f = notOwnTestOrdersFilter();
    expect(f.startsWith("email.is.null,")).toBe(true);
    for (const email of DEVELOPER_EMAILS) expect(f).toContain(`email.not.ilike."${email}"`);
  });

  it("take their charges and refunds out of Stripe's ledger, by payment intent, and nothing else", () => {
    const rows = [
      { id: "t1", intent: "pi_test", net: 4800 },
      { id: "t2", intent: "pi_test", net: -4800 },
      { id: "t3", intent: "pi_sale", net: 2400 },
      { id: "t4", intent: null, net: -500 },
    ];
    expect(withoutOwnTestCharges(rows, new Set(["pi_test"])).map((r) => r.id)).toEqual(["t3", "t4"]);
    expect(withoutOwnTestCharges(rows, new Set()).map((r) => r.id)).toEqual(["t1", "t2", "t3", "t4"]);
  });
});
