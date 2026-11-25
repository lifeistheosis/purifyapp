import { describe, expect, it } from "vitest";

import { fromFor, senderAddress, senderLabel } from "../sender";

describe("the sender's name, by what the email is (his word, 2026-11-24)", () => {
  it("names legal, support and the shop, and Purify for the rest", () => {
    expect(senderLabel("terms_changed")).toBe("Purify • Legal");
    expect(senderLabel("ticket_reply")).toBe("Purify • Support");
    expect(senderLabel("ticket_received")).toBe("Purify • Support");
    for (const k of ["order_confirmation", "order_refunded", "seller_provisioned", "eikon_drop_open", "cart_reminder", "review_ask"]) {
      expect(senderLabel(k), k).toBe("Purify • Shop");
    }
    for (const k of ["welcome", "plus_ending", "winback", "first_week", "release", "campaign_test", undefined]) {
      expect(senderLabel(k), String(k)).toBe("Purify");
    }
  });
  it("keeps EMAIL_FROM's own address and changes only the name", () => {
    expect(senderAddress("Purify Shop <hello@purifyapp.net>")).toBe("hello@purifyapp.net");
    expect(senderAddress("hello@purifyapp.net")).toBe("hello@purifyapp.net");
    expect(senderAddress("")).toBeNull();
    expect(fromFor("Purify Shop <hello@purifyapp.net>", "order_confirmation")).toBe("Purify • Shop <hello@purifyapp.net>");
    expect(fromFor("hello@purifyapp.net", "welcome")).toBe("Purify <hello@purifyapp.net>");
    expect(fromFor("Purify Shop <hello@purifyapp.net>", "terms_changed", true)).toBe("Purify - Legal <hello@purifyapp.net>");
    expect(fromFor(undefined, "welcome")).toBeNull();
  });
});
