import { describe, expect, it } from "vitest";

import { planLifecycle, type LifecycleRow } from "../lifecyclePlan";

const NOW = new Date("2026-09-14T12:00:00Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();

function member(id: string, patch: Partial<LifecycleRow> = {}): LifecycleRow {
  return {
    user_id: id,
    plus_until: null,
    pro_until: null,
    auto_renew: null,
    billing_issue_at: null,
    plus_source: "google",
    ...patch,
  };
}

const plan = (rows: LifecycleRow[], extra: Partial<Parameters<typeof planLifecycle>[0]> = {}) =>
  planLifecycle({ rows, openDrops: [], claimedBy: new Map(), now: NOW, ...extra });

const kinds = (rows: LifecycleRow[], extra = {}) => plan(rows, extra).map((p) => `${p.kind}:${p.userId}`);

describe("plus_ending", () => {
  it("warns a member who turned renewal off, three days out", () => {
    expect(kinds([member("a", { plus_until: at(2.5), auto_renew: false })])).toEqual(["plus_ending:a"]);
  });

  it("never warns a renewing member, whose date is always about a period ahead", () => {
    expect(kinds([member("a", { plus_until: at(2), auto_renew: true })])).toEqual([]);
    expect(kinds([member("a", { plus_until: at(2), auto_renew: null })])).toEqual([]);
  });

  it("stays quiet when renewal state could not be read at all", () => {
    expect(kinds([member("a", { plus_until: at(2), auto_renew: false })], { renewalStateKnown: false })).toEqual([]);
  });

  it("does not pile on a member who already had the payment email this month", () => {
    expect(kinds([member("a", { plus_until: at(2), auto_renew: false, billing_issue_at: at(-5) })])).toEqual([]);
    expect(kinds([member("a", { plus_until: at(2), auto_renew: false, billing_issue_at: at(-40) })])).toEqual([
      "plus_ending:a",
    ]);
  });

  it("is not due a week out, and keys on the end date so a daily rerun is one email", () => {
    expect(kinds([member("a", { plus_until: at(7), auto_renew: false })])).toEqual([]);
    const today = plan([member("a", { plus_until: at(2), auto_renew: false })])[0];
    const tomorrow = planLifecycle({
      rows: [member("a", { plus_until: at(2), auto_renew: false })],
      openDrops: [],
      claimedBy: new Map(),
      now: new Date(NOW.getTime() + DAY),
    })[0];
    expect(tomorrow.dedupeKey).toBe(today.dedupeKey);
  });
});

describe("plus_ended and winback", () => {
  it("tells a member their access ended, within two days of it ending", () => {
    expect(kinds([member("a", { plus_until: at(-1) })])).toEqual(["plus_ended:a"]);
    expect(kinds([member("a", { plus_until: at(-3) })])).toEqual([]);
  });

  it("sends winback thirty days on, once in a life, and knows who had Pro", () => {
    const [p] = plan([member("a", { plus_until: at(-31), pro_until: at(-31) })]);
    expect(p).toMatchObject({ kind: "winback", dedupeKey: "winback:a", wasPro: true });
    expect(plan([member("b", { plus_until: at(-31) })])[0]).toMatchObject({ wasPro: false });
    expect(kinds([member("a", { plus_until: at(-20) })])).toEqual([]);
    expect(kinds([member("a", { plus_until: at(-40) })])).toEqual([]);
  });

  it("does not treat an active Pro member with an old Plus date as lapsed", () => {
    expect(kinds([member("a", { plus_until: at(-31), pro_until: at(20) })])).toEqual([]);
  });
});

describe("welcome catch-up", () => {
  it("welcomes an account under seven days old, keyed like the immediate send", () => {
    const [p] = plan([], { accounts: [{ id: "new", joined_at: at(-2) }] });
    expect(p).toEqual({ kind: "welcome", userId: "new", dedupeKey: "welcome:new" });
  });

  it("leaves established accounts alone, and an account with no date", () => {
    expect(
      kinds([], {
        accounts: [
          { id: "old", joined_at: at(-40) },
          { id: "undated", joined_at: null },
        ],
      }),
    ).toEqual([]);
  });

  it("uses the same key as the sign-in welcome, so an account that had it is a duplicate, not a second email", () => {
    // lib/email/accountEvents.ts sends welcome:<user>; the ledger lets one through.
    const [p] = plan([], { accounts: [{ id: "u1", joined_at: at(-1) }] });
    expect(p.dedupeKey).toBe("welcome:u1");
  });

  it("plans welcomes after all other mail, newest account first, because the job caps them", () => {
    const out = kinds([member("ending", { plus_until: at(2), auto_renew: false })], {
      accounts: [
        { id: "six-days", joined_at: at(-6) },
        { id: "an-hour", joined_at: at(-1 / 24) },
        { id: "three-days", joined_at: at(-3) },
      ],
      deliveredOrders: [{ id: "o9", email: "buyer@example.com", user_id: "u9", updated_at: at(-6) }],
    });
    expect(out).toEqual([
      "care_guide:u9",
      "plus_ending:ending",
      "welcome:an-hour",
      "welcome:three-days",
      "welcome:six-days",
    ]);
  });
});

describe("order_address", () => {
  const order = (days: number, patch: Partial<{ email: string | null; user_id: string | null }> = {}) => ({
    id: "o1",
    email: "buyer@example.com",
    user_id: null,
    created_at: at(-days),
    ...patch,
  });

  it("asks a day after a paid order arrives with no address, to the order's own email", () => {
    const [p] = plan([], { ordersMissingAddress: [order(2)] });
    expect(p).toMatchObject({ kind: "order_address", to: "buyer@example.com", reminder: false, dedupeKey: "order_address:o1:first" });
  });

  it("does not ask on the day of the order, reminds from day four, and stops after a month", () => {
    expect(kinds([], { ordersMissingAddress: [order(0.5)] })).toEqual([]);
    expect(plan([], { ordersMissingAddress: [order(5)] })[0]).toMatchObject({ reminder: true, dedupeKey: "order_address:o1:reminder" });
    expect(kinds([], { ordersMissingAddress: [order(31)] })).toEqual([]);
  });

  it("sends one email per run, never the first and the reminder together", () => {
    expect(plan([], { ordersMissingAddress: [order(6)] })).toHaveLength(1);
  });

  it("skips an order with no email to write to", () => {
    expect(kinds([], { ordersMissingAddress: [order(2, { email: null })] })).toEqual([]);
  });
});

describe("care_guide", () => {
  const delivered = (days: number, email: string | null = "buyer@example.com") => ({
    id: "o9",
    email,
    user_id: "u9",
    updated_at: at(-days),
  });

  it("follows a delivered order once, five to thirty days after delivery", () => {
    expect(plan([], { deliveredOrders: [delivered(6)] })[0]).toMatchObject({
      kind: "care_guide",
      to: "buyer@example.com",
      dedupeKey: "care_guide:o9",
    });
    expect(kinds([], { deliveredOrders: [delivered(2)] })).toEqual([]);
    expect(kinds([], { deliveredOrders: [delivered(40)] })).toEqual([]);
    expect(kinds([], { deliveredOrders: [delivered(6, null)] })).toEqual([]);
  });
});

describe("claim_closing", () => {
  const drop = { id: "d1", title: "St Nicholas", claims_close_at: at(1) };

  it("reminds active Pro members who have not claimed, in the last 48 hours", () => {
    const rows = [
      member("pro-unclaimed", { pro_until: at(10), plus_until: at(10) }),
      member("pro-claimed", { pro_until: at(10), plus_until: at(10) }),
      member("plus-only", { plus_until: at(10) }),
    ];
    const out = kinds(rows, { openDrops: [drop], claimedBy: new Map([["d1", new Set(["pro-claimed"])]]) });
    expect(out).toEqual(["claim_closing:pro-unclaimed"]);
  });

  it("says nothing about a drop closing later than 48 hours, or already closed", () => {
    const rows = [member("p", { pro_until: at(10) })];
    expect(kinds(rows, { openDrops: [{ ...drop, claims_close_at: at(3) }] })).toEqual([]);
    expect(kinds(rows, { openDrops: [{ ...drop, claims_close_at: at(-1) }] })).toEqual([]);
    expect(kinds(rows, { openDrops: [{ ...drop, claims_close_at: null }] })).toEqual([]);
  });
});
