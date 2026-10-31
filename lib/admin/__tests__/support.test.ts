import { describe, expect, it } from "vitest";

import {
  askedAbout,
  draftRefundReply,
  draftReshipReply,
  draftStoreReply,
  draftTrackingReply,
  giftLine,
  giftsLine,
  greeting,
  planLine,
  inInbox,
  orderNumberIn,
  readerSince,
  requestKind,
  requestState,
  storeName,
  storeRefundRule,
  STATE_STATUS,
} from "../support";

/**
 * The support console's reasoning (Messages, the owner's pick A, with his
 * note 28). What would go wrong if this broke: a request shown as waiting on
 * him after he answered it, the wrong order put beside a request, a reply
 * telling a reader Purify refunds an App Store charge it cannot touch, or a
 * draft that states something about a parcel nobody knows.
 */

describe("where a request stands", () => {
  it("maps the four ticket statuses onto on you, on them and done, and back", () => {
    expect(requestState("open")).toBe("you");
    expect(requestState("pending")).toBe("them");
    expect(requestState("resolved")).toBe("done");
    expect(requestState("closed")).toBe("done");
    for (const s of ["you", "them", "done"] as const) expect(requestState(STATE_STATUS[s])).toBe(s);
  });

  it("lists everything not done under Waiting, the answered ones alone under On them", () => {
    expect(inInbox("open", "waiting")).toBe(true);
    expect(inInbox("pending", "waiting")).toBe(true);
    expect(inInbox("pending", "them")).toBe(true);
    expect(inInbox("open", "them")).toBe(false);
    expect(inInbox("closed", "done")).toBe(true);
    expect(inInbox("resolved", "waiting")).toBe(false);
  });
});

describe("what a request is about", () => {
  it("finds an order number however it was typed", () => {
    expect(orderNumberIn("I ordered on the 8th (EIK-5A3E19C0). Is it lost?")).toBe("EIK-5A3E19C0");
    expect(orderNumberIn("my order eik5a3e19c0 never came")).toBe("EIK-5A3E19C0");
    expect(orderNumberIn("nothing here")).toBeNull();
  });

  it("names a request Order or Plus, and nothing when it is neither", () => {
    expect(requestKind({ orderId: null, subject: "Where is my order?", body: "" })).toBe("Order");
    expect(requestKind({ orderId: null, subject: "Charged twice for Plus?", body: "on my iPhone" })).toBe("Plus");
    expect(requestKind({ orderId: "o1", subject: "Question", body: "" })).toBe("Order");
    expect(requestKind({ orderId: null, subject: "Thank you", body: "for the app" })).toBeNull();
  });

  it("puts the order the form attached, else the number typed, else the latest beside it", () => {
    const orders = [
      { id: "5a3e19c0-0000-0000-0000-000000000000", created_at: "2026-10-08T10:00:00Z" },
      { id: "64d1b8f5-0000-0000-0000-000000000000", created_at: "2026-10-20T10:00:00Z" },
    ];
    expect(askedAbout({ order_id: orders[1].id, texts: ["EIK-5A3E19C0"] }, orders)).toEqual({
      orderId: orders[1].id,
      how: "ticket",
    });
    expect(askedAbout({ order_id: null, texts: ["it is EIK-5A3E19C0"] }, orders)).toEqual({
      orderId: orders[0].id,
      how: "number",
    });
    expect(askedAbout({ order_id: null, texts: ["where is it"] }, orders)).toEqual({ orderId: orders[1].id, how: "latest" });
    expect(askedAbout({ order_id: null, texts: ["hello"] }, [])).toBeNull();
  });

  it("does not trust an attached order that is not the reader's", () => {
    const orders = [{ id: "5a3e19c0-0000-0000-0000-000000000000", created_at: "2026-10-08T10:00:00Z" }];
    expect(askedAbout({ order_id: "someone-elses", texts: [] }, orders)?.how).toBe("latest");
  });
});

describe("who refunds a plan", () => {
  it("never offers to refund a store purchase from here", () => {
    for (const source of ["apple", "google"]) {
      const rule = storeRefundRule(source);
      expect(rule.who).toBe(source);
      expect(rule.page?.url).toMatch(/^https:\/\//);
      expect(rule.replyLine).toContain(source === "apple" ? "Apple" : "Google");
    }
    expect(storeRefundRule("apple").page?.url).toBe("https://reportaproblem.apple.com");
  });

  it("sends a website plan to Stripe's own dashboard, and says nobody paid for a gift", () => {
    expect(storeRefundRule("stripe").who).toBe("stripe");
    expect(storeRefundRule("gift").who).toBe("nobody");
    expect(storeRefundRule("comp").who).toBe("nobody");
    expect(storeRefundRule(null).who).toBe("unknown");
  });

  it("names the store in the reader's words", () => {
    expect(storeName("apple")).toBe("App Store");
    expect(storeName("google")).toBe("Google Play");
    expect(storeName("mystery")).toBeNull();
  });
});

describe("the drafts", () => {
  it("writes a shipped parcel's reply from our own step and the carrier's link", () => {
    const text = draftTrackingReply(
      {
        name: "A. Sample",
        piece: "prayer rope",
        word: "Shipped",
        step: 4,
        of: 5,
        at: "2026-10-24T15:00:00Z",
        tracking: "9400100000000000000000",
      },
      "UTC",
    );
    expect(text).toContain("Hi A., your prayer rope left us on October 24 with USPS and is on its way: step 4 of 5.");
    expect(text).toContain("https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000");
    expect(text.endsWith("Edgar, the Purify Team")).toBe(true);
  });

  it("does not promise a tracking link it does not have", () => {
    const text = draftTrackingReply(
      { name: null, piece: null, word: "Preparing Your Order", step: 2, of: 5, at: null, tracking: null },
      "UTC",
    );
    expect(text.startsWith("Hi there, your order is with us and has not left yet: preparing your order, step 2 of 5.")).toBe(true);
    expect(text).not.toContain("http");
  });

  it("adds the gift to a refund or reship reply only when the switch is on", () => {
    expect(draftRefundReply("C. Sample", "$36.00", 90)).toContain("3 months of Purify Plus");
    expect(draftRefundReply("C. Sample", "$36.00", null)).not.toContain("Plus");
    expect(draftReshipReply("C. Sample", "Byzantine wall cross", 90)).toContain("we are sending another Byzantine wall cross, at no charge");
  });

  it("hands a store charge to the store, with the gift as the thank you", () => {
    const text = draftStoreReply("B. Sample", storeRefundRule("apple"), 90);
    expect(text).toContain("https://reportaproblem.apple.com");
    expect(text).toContain("3 months of Purify Plus");
    expect(draftStoreReply("B. Sample", storeRefundRule("stripe"), 90)).toBeNull();
    expect(giftLine(storeRefundRule("apple"))).toBe("A thank you for your patience while Apple sorts out the charge.");
  });

  it("greets by the first name on file", () => {
    expect(greeting("A. Sample")).toBe("Hi A.,");
    expect(greeting("  ")).toBe("Hi there,");
  });

  it("never writes an em dash into a reply", () => {
    const all = [
      draftTrackingReply({ name: "A", piece: "x", word: "Delivered", step: 5, of: 5, at: "2026-10-24T00:00:00Z", tracking: null }, "UTC"),
      draftRefundReply("A", "$1.00", 90),
      draftReshipReply("A", null, 30),
      draftStoreReply("A", storeRefundRule("google"), null) ?? "",
    ].join("\n");
    expect(all.includes(String.fromCharCode(0x2014))).toBe(false);
  });
});

describe("the plan and the gifts, in a line each", () => {
  it("names the plan and where it was bought, and nothing when there is none now", () => {
    expect(planLine({ tier: "plus", until: null, source: "google", renews: null, store: null })).toBe("Purify Plus · Google Play");
    expect(planLine({ tier: "pro", until: null, source: null, renews: null, store: null })).toBe("Purify Pro");
    expect(planLine({ tier: null, until: null, source: "apple", renews: null, store: null })).toBeNull();
    expect(planLine(null)).toBeNull();
  });

  it("counts the gifts and says which wait to be opened", () => {
    const g = (claimed: boolean) => ({ tier: "plus", days: 90, created_at: "2026-08-12T00:00:00Z", claimed_at: claimed ? "2026-08-13T00:00:00Z" : null });
    expect(giftsLine([])).toBe("no gifts yet");
    expect(giftsLine([g(true)])).toBe("1 gift, opened");
    expect(giftsLine([g(true), g(false)])).toBe("2 gifts, 1 waiting");
  });
});

describe("the reader line", () => {
  it("says the month they joined, with the year when it was not this one", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    expect(readerSince("2026-03-04T10:00:00Z", now, "UTC")).toBe("reader since March");
    expect(readerSince("2025-06-04T10:00:00Z", now, "UTC")).toBe("reader since June 2025");
    expect(readerSince(null, now, "UTC")).toBeNull();
  });
});
