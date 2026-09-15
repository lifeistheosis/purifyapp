import { describe, expect, it } from "vitest";

import { effectsFor, lifecycleDedupeKey } from "../lifecycleEvents";

const NOW = new Date("2026-09-14T12:00:00Z");

describe("effectsFor", () => {
  it("records a failed charge and owes one payment email for that period", () => {
    const e = effectsFor(
      { type: "BILLING_ISSUE", event_timestamp_ms: Date.parse("2026-09-13T08:00:00Z"), expiration_at_ms: 1_760_000_000_000 },
      NOW,
    );
    expect(e.billingIssueAt).toBe("2026-09-13T08:00:00.000Z");
    expect(e.email).toEqual({ kind: "payment_failed", periodKey: "1760000000000" });
    expect(e.autoRenew).toBeUndefined();
  });

  it("keys the payment email to the period, so a repeated report is one email", () => {
    const first = effectsFor({ type: "BILLING_ISSUE", event_timestamp_ms: 1, expiration_at_ms: 500 }, NOW);
    const again = effectsFor({ type: "BILLING_ISSUE", event_timestamp_ms: 2, expiration_at_ms: 500 }, NOW);
    expect(lifecycleDedupeKey("u", first.email!)).toBe(lifecycleDedupeKey("u", again.email!));
    const nextMonth = effectsFor({ type: "BILLING_ISSUE", event_timestamp_ms: 3, expiration_at_ms: 900 }, NOW);
    expect(lifecycleDedupeKey("u", nextMonth.email!)).not.toBe(lifecycleDedupeKey("u", first.email!));
  });

  it("turns renewal off on a cancellation and back on when it is undone", () => {
    expect(effectsFor({ type: "CANCELLATION" }, NOW)).toEqual({ autoRenew: false });
    expect(effectsFor({ type: "UNCANCELLATION" }, NOW)).toEqual({ autoRenew: true });
  });

  it("clears a billing issue when a renewal is paid", () => {
    expect(effectsFor({ type: "RENEWAL" }, NOW)).toEqual({ autoRenew: true, billingIssueAt: null });
  });

  it("thanks a new member once, keyed to the purchase", () => {
    const e = effectsFor({ type: "INITIAL_PURCHASE", purchased_at_ms: 1234 }, NOW);
    expect(e.email).toEqual({ kind: "plus_active", periodKey: "1234" });
    expect(e.autoRenew).toBe(true);
  });

  it("does nothing for events that change neither fact", () => {
    for (const type of ["EXPIRATION", "TRANSFER", "SUBSCRIBER_ALIAS", "TEST", undefined]) {
      expect(effectsFor({ type }, NOW), String(type)).toEqual({});
    }
  });
});
