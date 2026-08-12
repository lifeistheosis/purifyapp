// The RevenueCat webhook had no tests at all. These pin the one decision that
// can silently destroy paid or comped access: what happens to pro_until when
// an event does not carry the `pro` entitlement.

import { describe, it, expect } from "vitest";
import { resolveWebhookGrant } from "@/lib/billing/webhookGrant";

const PLUS_EXPIRY = "2026-09-01T00:00:00.000Z";
const PRO_EXPIRY = "2026-12-01T00:00:00.000Z";

describe("resolveWebhookGrant", () => {
  describe("a Pro event", () => {
    it("sets both, because Pro is a superset of Plus", () => {
      expect(
        resolveWebhookGrant({
          isPro: true,
          plusUntil: PRO_EXPIRY,
          existing: null,
        }),
      ).toEqual({ plusUntil: PRO_EXPIRY, proUntil: PRO_EXPIRY });
    });

    it("moves Pro to the new expiry, including earlier (refund, downgrade)", () => {
      // A subscription MUST be able to shorten access. This is the deliberate
      // difference from a gift, which extends and never truncates.
      const earlier = "2026-07-01T00:00:00.000Z";
      expect(
        resolveWebhookGrant({
          isPro: true,
          plusUntil: earlier,
          existing: { pro_until: PRO_EXPIRY },
        }),
      ).toEqual({ plusUntil: earlier, proUntil: earlier });
    });
  });

  describe("a Plus-only event", () => {
    // The regression. A comped Pro member whose ordinary Play subscription
    // renewed used to lose Pro entirely, with no cancellation and no notice.
    it("leaves an active Pro window untouched", () => {
      expect(
        resolveWebhookGrant({
          isPro: false,
          plusUntil: PLUS_EXPIRY,
          existing: { pro_until: PRO_EXPIRY },
        }),
      ).toEqual({ plusUntil: PLUS_EXPIRY, proUntil: PRO_EXPIRY });
    });

    it("leaves an already-expired Pro window untouched too", () => {
      // Not this function's job to tidy up: deriveEntitlements treats a past
      // pro_until as not-Pro, so carrying it forward changes nothing a reader
      // can see, and it keeps the column honest about what was granted.
      const past = "2020-01-01T00:00:00.000Z";
      expect(
        resolveWebhookGrant({
          isPro: false,
          plusUntil: PLUS_EXPIRY,
          existing: { pro_until: past },
        }),
      ).toEqual({ plusUntil: PLUS_EXPIRY, proUntil: past });
    });

    it("stays null when there was no Pro to begin with", () => {
      expect(
        resolveWebhookGrant({
          isPro: false,
          plusUntil: PLUS_EXPIRY,
          existing: { pro_until: null },
        }),
      ).toEqual({ plusUntil: PLUS_EXPIRY, proUntil: null });
    });

    it("stays null when the account has no row at all", () => {
      expect(
        resolveWebhookGrant({
          isPro: false,
          plusUntil: PLUS_EXPIRY,
          existing: null,
        }),
      ).toEqual({ plusUntil: PLUS_EXPIRY, proUntil: null });
    });

    it("stays null when the column is absent from the row", () => {
      expect(
        resolveWebhookGrant({
          isPro: false,
          plusUntil: PLUS_EXPIRY,
          existing: {},
        }),
      ).toEqual({ plusUntil: PLUS_EXPIRY, proUntil: null });
    });

    it("treats undefined existing the same as absent", () => {
      expect(
        resolveWebhookGrant({ isPro: false, plusUntil: PLUS_EXPIRY }),
      ).toEqual({ plusUntil: PLUS_EXPIRY, proUntil: null });
    });
  });

  it("always writes the event's expiry to plusUntil, unchanged", () => {
    // plus_until is the single fact the webhook exists to persist. It is never
    // merged with what was there, because that would keep serving Plus after a
    // refund. Preserving GIFTED days across a renewal is a separate problem
    // and needs its own column; see lib/billing/webhookGrant.ts.
    for (const iso of [PLUS_EXPIRY, PRO_EXPIRY, "1999-01-01T00:00:00.000Z"]) {
      expect(
        resolveWebhookGrant({
          isPro: false,
          plusUntil: iso,
          existing: { pro_until: PRO_EXPIRY },
        }).plusUntil,
      ).toBe(iso);
    }
  });
});
