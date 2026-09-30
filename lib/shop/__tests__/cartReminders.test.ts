import { describe, expect, it } from "vitest";

import { checkEmailCopy, explainEmail } from "@/lib/email/__tests__/emailCopyHelpers";
import { renderMarketing } from "@/lib/email/marketing";
import { cartDealBody, cartReminderBody } from "@/lib/email/templates/cartBodies";
import type { MarketingBody } from "@/lib/email/templates/marketingBodies";

import { cartLines, dealKey, reminderKey, remindersOwed, REMIND_AFTER_MS, REMIND_WITHIN_MS, type ReminderCart } from "../cartReminders";

const NOW = Date.parse("2026-09-30T16:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const HOUR = 3_600_000;
const items = [{ slug: "flag", title: "Christ Flag, Greek", quantity: 1, addedAt: ago(40 * HOUR) }];
const cart = (c: Partial<ReminderCart>): ReminderCart => ({ cart_token: "t1", user_id: "u1", items, updated_at: ago(30 * HOUR), ...c });

describe("who is owed a cart note", () => {
  it("writes a day after the cart was left, and not before", () => {
    expect(remindersOwed([cart({})], new Map(), NOW)).toHaveLength(1);
    expect(remindersOwed([cart({ updated_at: ago(REMIND_AFTER_MS - HOUR) })], new Map(), NOW)).toHaveLength(0);
  });

  it("leaves a cart alone after a week, and anyone without an account", () => {
    expect(remindersOwed([cart({ updated_at: ago(REMIND_WITHIN_MS + HOUR) })], new Map(), NOW)).toHaveLength(0);
    expect(remindersOwed([cart({ user_id: null })], new Map(), NOW)).toHaveLength(0);
  });

  it("says nothing to someone who has paid since", () => {
    expect(remindersOwed([cart({})], new Map([["u1", NOW - 2 * HOUR]]), NOW)).toHaveLength(0);
    expect(remindersOwed([cart({})], new Map([["u1", NOW - 50 * HOUR]]), NOW)).toHaveLength(1);
  });

  it("writes once per account, about the cart it touched last", () => {
    const owed = remindersOwed(
      [cart({ cart_token: "old", updated_at: ago(60 * HOUR) }), cart({ cart_token: "new", updated_at: ago(26 * HOUR) })],
      new Map(),
      NOW,
    );
    expect(owed.map((o) => o.cartToken)).toEqual(["new"]);
  });

  it("keys a note on the cart's state, so a changed cart can be noted again", () => {
    const [a] = remindersOwed([cart({ updated_at: "2026-09-29T08:00:00.000Z" })], new Map(), NOW);
    const [b] = remindersOwed([cart({ updated_at: "2026-09-29T09:30:00.000Z" })], new Map(), NOW);
    expect(reminderKey(a)).not.toBe(reminderKey(b));
    expect(dealKey("u1", "flag", 5)).toBe("cart_deal:u1:flag:5");
  });

  it("reads only well-formed lines", () => {
    expect(cartLines([{ slug: "a", title: "A", quantity: 2 }, { slug: 3 }, null, { slug: "b", title: "B" }])).toEqual([
      { slug: "a", title: "A", quantity: 2 },
      { slug: "b", title: "B", quantity: 1 },
    ]);
  });
});

describe("the cart notes keep the email rules", () => {
  const TOKEN = "3f1c2a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f";
  const ADDRESS = "PO Box 123, Springfield, IL 62701";
  function passes(body: MarketingBody) {
    const email = renderMarketing(body, "shop_offers", TOKEN, ADDRESS);
    const v = checkEmailCopy({ subject: email.subject, body: email.text });
    expect(v, explainEmail(v)).toEqual([]);
  }

  it("passes the doctrine, one piece or several", () => {
    passes(cartReminderBody([{ title: "Christ Flag, Greek", quantity: 1 }]));
    passes(cartReminderBody([{ title: "Christ Flag, Greek", quantity: 2 }, { title: "Prayer rope", quantity: 1 }]));
  });

  it("passes the doctrine with a deal in it", () => {
    passes(cartDealBody({ title: "Christ Flag, Greek", percent: 10, price: "$22.49", until: "Friday, October 2" }));
  });
});

describe("what the notes led to", () => {
  it("counts a note as followed when the reader pays within a week", async () => {
    const { outcomesOfNotes } = await import("../cartReminders");
    const out = outcomesOfNotes(
      [
        { user_id: "a", kind: "cart_reminder", created_at: "2026-09-20T12:00:00Z" },
        { user_id: "b", kind: "cart_reminder", created_at: "2026-09-20T12:00:00Z" },
        { user_id: "a", kind: "cart_deal", created_at: "2026-09-22T12:00:00Z" },
      ],
      [
        { user_id: "a", created_at: "2026-09-23T09:00:00Z" },
        { user_id: "b", created_at: "2026-09-19T09:00:00Z" },
      ],
    );
    expect(out).toEqual({ cart_reminder: { sent: 2, recovered: 1 }, cart_deal: { sent: 1, recovered: 1 } });
  });
});
