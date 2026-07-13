// The entitlement derivation is the launch switch: enforcement is scoped
// per surface (native vs web), and deriveEntitlements takes the resolved
// `enforced` flag explicitly. We test the pure function directly in both
// states, plus the surface-scoping helper.

import { describe, it, expect } from "vitest";
import {
  deriveEntitlements,
  plusEnforcedFor,
  PLUS_ENFORCED_NATIVE,
  PLUS_ENFORCED_WEB,
  OPEN_ENTITLEMENTS,
  FREE_ENTITLEMENTS,
  type EntitlementRow,
} from "@/lib/entitlements/entitlements";

const NOW = new Date("2026-06-12T00:00:00Z");
const FUTURE = "2027-01-01T00:00:00Z";
const PAST = "2025-01-01T00:00:00Z";

describe("surface scoping", () => {
  it("ships with BOTH switches off (guards against an accidental flip)", () => {
    expect(PLUS_ENFORCED_NATIVE).toBe(false);
    expect(PLUS_ENFORCED_WEB).toBe(false);
  });

  it("plusEnforcedFor maps native/web to their switches", () => {
    expect(plusEnforcedFor(true)).toBe(PLUS_ENFORCED_NATIVE);
    expect(plusEnforcedFor(false)).toBe(PLUS_ENFORCED_WEB);
  });
});

describe("deriveEntitlements — not enforced", () => {
  it("opens everything regardless of the row", () => {
    expect(deriveEntitlements(null, { enforced: false, now: NOW })).toEqual(
      OPEN_ENTITLEMENTS,
    );
    expect(
      deriveEntitlements(
        { is_supporter: false, plus_until: null, plus_source: null },
        { enforced: false, now: NOW },
      ),
    ).toEqual(OPEN_ENTITLEMENTS);
    expect(OPEN_ENTITLEMENTS.sync).toBe(true);
    expect(OPEN_ENTITLEMENTS.plusFeatures).toBe(true);
  });
});

describe("deriveEntitlements — enforced", () => {
  const enforced = (row: EntitlementRow | null) =>
    deriveEntitlements(row, { enforced: true, now: NOW });

  it("signed-out / no row: free, no sync, no plus features", () => {
    expect(enforced(null)).toEqual(FREE_ENTITLEMENTS);
  });

  it("supporter: lifetime SYNC, but NOT the Plus feature layer", () => {
    const e = enforced({
      is_supporter: true,
      plus_until: null,
      plus_source: null,
    });
    expect(e.sync).toBe(true);
    expect(e.plusFeatures).toBe(false); // the locked distinction
    expect(e.supporter).toBe(true);
    expect(e.plus).toBe(false);
  });

  it("active Plus subscription: sync AND the full feature layer", () => {
    const e = enforced({
      is_supporter: false,
      plus_until: FUTURE,
      plus_source: "google",
    });
    expect(e.plus).toBe(true);
    expect(e.sync).toBe(true);
    expect(e.plusFeatures).toBe(true);
  });

  it("expired Plus: falls back to free", () => {
    const e = enforced({
      is_supporter: false,
      plus_until: PAST,
      plus_source: "google",
    });
    expect(e.plus).toBe(false);
    expect(e.sync).toBe(false);
    expect(e.plusFeatures).toBe(false);
  });

  it("supporter with expired Plus: keeps sync via the supporter promise", () => {
    const e = enforced({
      is_supporter: true,
      plus_until: PAST,
      plus_source: "google",
    });
    expect(e.sync).toBe(true); // supporter promise survives a lapsed sub
    expect(e.plusFeatures).toBe(false); // but not the feature layer
  });

  it("supporter who also pays for Plus: gets the full feature layer", () => {
    const e = enforced({
      is_supporter: true,
      plus_until: FUTURE,
      plus_source: "google",
    });
    expect(e.sync).toBe(true);
    expect(e.plusFeatures).toBe(true);
  });

  it("a cancelled-but-still-active sub (future expiry) is still Plus", () => {
    // The webhook writes plus_until = period end even on CANCELLATION, so
    // the user keeps Plus until that moment. Derivation only sees the date.
    const e = enforced({
      is_supporter: false,
      plus_until: FUTURE,
      plus_source: "google",
    });
    expect(e.plus).toBe(true);
  });

  it("active Pro: pro AND plus (superset), sync AND feature layer", () => {
    const e = enforced({
      is_supporter: false,
      plus_until: null,
      plus_source: "google",
      pro_until: FUTURE,
    });
    expect(e.pro).toBe(true);
    expect(e.plus).toBe(true); // Pro includes Plus
    expect(e.sync).toBe(true);
    expect(e.plusFeatures).toBe(true);
  });

  it("expired Pro: not pro, not plus", () => {
    const e = enforced({
      is_supporter: false,
      plus_until: null,
      plus_source: "google",
      pro_until: PAST,
    });
    expect(e.pro).toBe(false);
    expect(e.plus).toBe(false);
  });

  it("a plain Plus sub is not Pro", () => {
    const e = enforced({
      is_supporter: false,
      plus_until: FUTURE,
      plus_source: "google",
    });
    expect(e.plus).toBe(true);
    expect(e.pro).toBe(false);
  });
});
