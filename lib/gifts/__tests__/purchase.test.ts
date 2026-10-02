import { describe, expect, it } from "vitest";

import { giftOf, isGiftSession, settleGiftSession, type GiftDb, type GiftSession } from "../purchase";

const BUYER = "11111111-1111-4111-8111-111111111111";
const FRIEND = "22222222-2222-4222-8222-222222222222";

function session(over: Partial<GiftSession> = {}, meta: Record<string, string> = {}): GiftSession {
  return {
    id: "cs_test_1",
    payment_status: "paid",
    amount_total: 1999,
    currency: "usd",
    metadata: { kind: "gift_plus", recipient_id: FRIEND, buyer_id: BUYER, days: "30", from_name: "Maria", ...meta },
    ...over,
  };
}

function db(answer: { code?: string; message: string } | null = null) {
  const rows: Record<string, unknown>[] = [];
  const fake: GiftDb = {
    from: () => ({
      insert: (row) => {
        rows.push(row);
        return Promise.resolve({ error: answer });
      },
    }),
  };
  return { fake, rows };
}

describe("gift sessions", () => {
  it("are told apart from shop orders by their metadata", () => {
    expect(isGiftSession(session())).toBe(true);
    expect(isGiftSession({ metadata: { order_id: "x" } })).toBe(false);
    expect(isGiftSession(null)).toBe(false);
  });

  it("refuse metadata we did not write", () => {
    expect(giftOf(session({}, { recipient_id: "not-a-uuid" }))).toBeNull();
    expect(giftOf(session({}, { days: "0" }))).toBeNull();
    expect(giftOf(session({}, { days: "99999" }))).toBeNull();
    expect(giftOf(session({}, { recipient_id: BUYER }))).toBeNull();
  });
});

describe("settleGiftSession", () => {
  it("writes one Plus gift for the friend, keyed by the session", async () => {
    const { fake, rows } = db();
    expect(await settleGiftSession(fake, session())).toBe("granted");
    expect(rows).toEqual([
      {
        user_id: FRIEND,
        tier: "plus",
        days: 30,
        message: null,
        from_name: "Maria",
        stripe_session_id: "cs_test_1",
        created_by_email: "gift:stripe",
      },
    ]);
  });

  it("does nothing a second time for the same session", async () => {
    const { fake } = db({ code: "23505", message: "duplicate" });
    expect(await settleGiftSession(fake, session())).toBe("duplicate");
  });

  it("grants nothing until the money is there", async () => {
    const { fake, rows } = db();
    expect(await settleGiftSession(fake, session({ payment_status: "unpaid" }))).toBe("unpaid");
    expect(await settleGiftSession(fake, session({ amount_total: 0 }))).toBe("unpaid");
    expect(rows).toHaveLength(0);
  });

  it("reports a failed write so Stripe retries", async () => {
    const { fake } = db({ code: "XX000", message: "boom" });
    expect(await settleGiftSession(fake, session())).toBe("failed");
  });
});
