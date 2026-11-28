// A year of Plus given by email: the Christmas gift (2.0). His word,
// 2026-11-28: "yes build the gift page at 59.99". The money rules are the
// shop's (F-03): the price is the server's, the client sends words, and
// nothing is granted unless the session was paid in full in dollars.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  GIFT_CARD,
  GIFT_CARD_KIND,
  GIFT_CODE,
  cardDue,
  cardMetadata,
  cardOf,
  deliverOn,
  giveSchema,
  newGiftCode,
  paidInFull,
  settleGiftCardSession,
  whenChoices,
  type CardDb,
  type CardSession,
} from "@/lib/gifts/card";
import { giftCardEmail } from "@/lib/gifts/cardEmail";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const at = (iso: string) => new Date(iso);
const GIVE = { fromName: "  Anna  ", toName: "Maria", toEmail: " Maria@Example.com ", message: "Christ is born! Read with me this year.", when: "dec25" as const };

describe("the giver's words", () => {
  it("takes names, an email and a line, tidied; never a price", () => {
    const p = giveSchema.parse({ ...GIVE, price: 1, amount: 1 });
    expect(p).toEqual({ fromName: "Anna", toName: "Maria", toEmail: "maria@example.com", message: "Christ is born! Read with me this year.", when: "dec25" });
    expect(giveSchema.parse({ ...GIVE, message: "  " }).message).toBeNull();
    expect(giveSchema.parse({ ...GIVE, fromName: "Anna\n\nBcc: x@y.z" }).fromName).toBe("Anna Bcc: x@y.z");
  });

  it("refuses what it cannot send", () => {
    expect(giveSchema.safeParse({ ...GIVE, toEmail: "not an email" }).success).toBe(false);
    expect(giveSchema.safeParse({ ...GIVE, fromName: "   " }).success).toBe(false);
    expect(giveSchema.safeParse({ ...GIVE, toName: "x".repeat(61) }).success).toBe(false);
    expect(giveSchema.safeParse({ ...GIVE, message: "x".repeat(281) }).success).toBe(false);
    expect(giveSchema.safeParse({ ...GIVE, when: "easter" }).success).toBe(false);
  });
});

describe("when it arrives", () => {
  it("is the next Christmas Day or 7 January, today included, or as soon as it is paid", () => {
    expect(deliverOn("now", at("2026-11-28T10:00:00Z"))).toBeNull();
    expect(deliverOn("dec25", at("2026-11-28T10:00:00Z"))).toBe("2026-12-25");
    expect(deliverOn("jan7", at("2026-11-28T10:00:00Z"))).toBe("2027-01-07");
    expect(deliverOn("jan7", at("2027-01-07T20:00:00Z"))).toBe("2027-01-07");
    expect(deliverOn("dec25", at("2026-12-26T10:00:00Z"))).toBe("2027-12-25");
  });

  it("offers a Christmas day only in its season, and only while it is still ahead", () => {
    expect(whenChoices(at("2026-10-15T12:00:00Z"))).toEqual(["now"]);
    expect(whenChoices(at("2026-11-28T12:00:00Z"))).toEqual(["now", "dec25", "jan7"]);
    expect(whenChoices(at("2026-12-25T08:00:00Z"))).toEqual(["now", "jan7"]);
    expect(whenChoices(at("2027-01-05T12:00:00Z"))).toEqual(["now", "jan7"]);
    expect(whenChoices(at("2027-01-07T12:00:00Z"))).toEqual(["now"]);
  });

  it("goes out at 13:00 UTC on its day", () => {
    expect(cardDue(null, at("2026-11-28T03:00:00Z"))).toBe(true);
    expect(cardDue("2026-12-25", at("2026-12-25T12:59:00Z"))).toBe(false);
    expect(cardDue("2026-12-25", at("2026-12-25T13:00:00Z"))).toBe(true);
    expect(cardDue("2026-12-25", at("2026-12-28T01:00:00Z"))).toBe(true);
  });
});

describe("the code in the link", () => {
  it("is 24 letters and digits with nothing to confuse", () => {
    expect(newGiftCode()).toMatch(GIFT_CODE);
    expect(newGiftCode(new Uint8Array(24))).toBe("A".repeat(24));
    expect(GIFT_CODE.test("O0I1".repeat(6))).toBe(false);
  });
});

describe("the payment", () => {
  const now = at("2026-11-28T10:00:00Z");
  const session = (o: Partial<CardSession> = {}): CardSession => ({
    id: "cs_test_1",
    payment_status: "paid",
    amount_total: GIFT_CARD.cents,
    currency: "usd",
    metadata: cardMetadata(giveSchema.parse(GIVE), now),
    customer_details: { email: "anna@example.com" },
    ...o,
  });

  it("is $59.99, in dollars, for a year", () => {
    expect(GIFT_CARD).toEqual({ cents: 5999, currency: "usd", days: 365 });
    expect(session().metadata).toMatchObject({ kind: GIFT_CARD_KIND, deliver_on: "2026-12-25", to_email: "maria@example.com" });
  });

  it("counts only when paid in full, in dollars, to the cent", () => {
    expect(paidInFull(session())).toBe(true);
    expect(paidInFull(session({ currency: "USD" }))).toBe(true);
    expect(paidInFull(session({ amount_total: 5998 }))).toBe(false);
    expect(paidInFull(session({ amount_total: 599900 }))).toBe(false);
    expect(paidInFull(session({ currency: "eur" }))).toBe(false);
    expect(paidInFull(session({ currency: null }))).toBe(false);
    expect(paidInFull(session({ payment_status: "unpaid" }))).toBe(false);
  });

  it("reads back only the card it wrote", () => {
    expect(cardOf(session())).toEqual({ from_name: "Anna", to_name: "Maria", to_email: "maria@example.com", message: "Christ is born! Read with me this year.", days: 365, deliver_on: "2026-12-25" });
    expect(cardOf(session({ metadata: { ...session().metadata, kind: "gift_plus" } }))).toBeNull();
    expect(cardOf(session({ metadata: { ...session().metadata, to_email: "nope" } }))).toBeNull();
    expect(cardOf(session({ metadata: { ...session().metadata, deliver_on: "Christmas" } }))).toBeNull();
  });

  const db = (error: { code?: string; message: string } | null = null) => {
    const rows: Record<string, unknown>[] = [];
    const client: CardDb = {
      from: () => ({
        insert: (row) => {
          rows.push(row);
          return { select: () => ({ single: async () => ({ data: error ? null : { id: "card-1" }, error }) }) };
        },
      }),
    };
    return { client, rows };
  };

  it("writes the paid card once; a redelivered event does nothing", async () => {
    const { client, rows } = db();
    const r = await settleGiftCardSession(client, session(), "C".repeat(24));
    expect(r).toMatchObject({ result: "saved", card: { id: "card-1", code: "C".repeat(24), to_name: "Maria" } });
    expect(rows[0]).toMatchObject({ code: "C".repeat(24), amount_cents: 5999, currency: "usd", stripe_session_id: "cs_test_1", buyer_email: "anna@example.com", days: 365 });
    expect((await settleGiftCardSession(db({ code: "23505", message: "dup" }).client, session())).result).toBe("duplicate");
    expect((await settleGiftCardSession(db({ message: "down" }).client, session())).result).toBe("failed");
  });

  it("writes nothing for a session not paid in full, or not one of ours", async () => {
    const short = db();
    expect((await settleGiftCardSession(short.client, session({ amount_total: 100 }))).result).toBe("unpaid");
    const odd = db();
    expect((await settleGiftCardSession(odd.client, session({ metadata: { kind: GIFT_CARD_KIND } }))).result).toBe("invalid");
    expect(short.rows.length + odd.rows.length).toBe(0);
  });
});

describe("the email on the day", () => {
  it("says who it is from in their words, escaped, with one button to open it", () => {
    const mail = giftCardEmail({ from_name: "Anna <b>", to_name: "Maria", message: "<script>alert(1)</script>", code: "C".repeat(24) });
    expect(mail.subject).toBe("Anna <b> gave you a year of Purify Plus");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("Anna <b>");
    expect(mail.html).toContain(`/gift/card?code=${"C".repeat(24)}`);
    expect(mail.text).toContain("Open your gift");
    expect(`${mail.html}${mail.text}`).not.toContain("—");
  });
});

describe("the wiring", () => {
  it("prices on the server and sells on the website alone", () => {
    const route = read("app/api/gifts/card/checkout/route.ts");
    expect(route).toContain("unit_amount: GIFT_CARD.cents");
    expect(route).toContain("giveSchema.safeParse(body)");
    expect(route).not.toMatch(/body\.(price|amount|cents)/);
    expect(read("scripts/native-build.mjs")).toContain('["app", "(app)", "give"]');
  });

  it("settles a card before the reader's gift and the shop, and sends due cards hourly", () => {
    const hook = read("app/api/shop/stripe-webhook/route.ts");
    expect(hook.indexOf("isGiftCardSession(")).toBeGreaterThan(-1);
    expect(hook.indexOf("isGiftCardSession(")).toBeLessThan(hook.indexOf("isGiftSession(event"));
    expect(read("lib/ops/maintenance.ts")).toContain("sendDueGiftCards(admin, new Date(now))");
  });

  it("keeps the card's table to the service role, and its SQL safe to run twice", () => {
    const sql = read("supabase/migrations/20261128080347_gift_cards.sql");
    expect(sql).toContain("create table if not exists public.gift_cards");
    expect(sql).toContain("alter table public.gift_cards enable row level security");
    expect(sql).not.toMatch(/create policy/i);
    for (const role of ["public", "anon", "authenticated"]) expect(sql).toContain(`revoke execute on function public.redeem_gift_card(text, uuid) from ${role};`);
  });

  it("tells readers on the privacy page what a gift keeps", () => {
    expect(read("components/legal/PrivacyText.tsx")).toContain("<strong>A gift of Plus</strong>");
  });
});
