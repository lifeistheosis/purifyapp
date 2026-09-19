import { describe, expect, it } from "vitest";

import { ABANDON_AFTER_MS, decideAbandoned, isStale, sessionState } from "../abandonedCheckouts";

describe("abandoned checkouts", () => {
  it("reads Stripe's session into a state, trusting payment_status first", () => {
    expect(sessionState({ status: "complete", payment_status: "paid" }, true)).toBe("paid");
    expect(sessionState({ status: "open", payment_status: "unpaid" }, true)).toBe("open");
    expect(sessionState({ status: "expired", payment_status: "unpaid" }, true)).toBe("expired");
    expect(sessionState({ status: "complete", payment_status: "unpaid" }, true)).toBe("complete_unpaid");
    expect(sessionState(null, true)).toBe("unreadable");
    expect(sessionState(null, false)).toBe("none");
  });

  it("settles a missed payment and never cancels one", () => {
    expect(decideAbandoned("paid")).toBe("settle");
  });

  it("expires an open session before cancelling, and cancels what can never be paid", () => {
    expect(decideAbandoned("open")).toBe("expire_then_cancel");
    expect(decideAbandoned("expired")).toBe("cancel");
    expect(decideAbandoned("none")).toBe("cancel");
  });

  it("leaves what it cannot decide: a delayed payment still clearing, or Stripe not answering", () => {
    expect(decideAbandoned("complete_unpaid")).toBe("leave");
    expect(decideAbandoned("unreadable")).toBe("leave");
  });

  it("waits past Stripe's 24 hour session life before calling anything stale", () => {
    const now = Date.parse("2026-09-19T12:00:00.000Z");
    expect(isStale(new Date(now - 23 * 3_600_000).toISOString(), now)).toBe(false);
    expect(isStale(new Date(now - ABANDON_AFTER_MS + 1000).toISOString(), now)).toBe(false);
    expect(isStale(new Date(now - ABANDON_AFTER_MS - 1000).toISOString(), now)).toBe(true);
    expect(isStale("not a date", now)).toBe(false);
  });
});
