// The entitlement derivation is the launch switch: enforcement is scoped
// per surface (android, ios, web), and deriveEntitlements takes the resolved
// `enforced` flag explicitly. We test the pure function directly in both
// states, plus the surface-scoping helper.

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  deriveEntitlements,
  plusEnforcedFor,
  proShipsFree,
  PLUS_ENFORCED_ANDROID,
  PLUS_ENFORCED_IOS,
  PLUS_ENFORCED_WEB,
  OPEN_ENTITLEMENTS,
  FREE_ENTITLEMENTS,
  type EntitlementRow,
} from "@/lib/entitlements/entitlements";

const NOW = new Date("2026-06-12T00:00:00Z");
const FUTURE = "2027-01-01T00:00:00Z";
const PAST = "2025-01-01T00:00:00Z";

describe("surface scoping", () => {
  it("ships with EVERY switch off (guards against an accidental flip)", () => {
    expect(PLUS_ENFORCED_ANDROID).toBe(false);
    expect(PLUS_ENFORCED_IOS).toBe(false);
    expect(PLUS_ENFORCED_WEB).toBe(false);
  });

  it("maps each surface to its own switch", () => {
    expect(plusEnforcedFor("android")).toBe(PLUS_ENFORCED_ANDROID);
    expect(plusEnforcedFor("ios")).toBe(PLUS_ENFORCED_IOS);
    expect(plusEnforcedFor("web")).toBe(PLUS_ENFORCED_WEB);
  });

  // The regression this split exists to prevent. One shared
  // NEXT_PUBLIC_PLUS_ENFORCED_NATIVE secret feeds both android-apk.yml and
  // ios-release.yml, so throwing the Android launch switch would otherwise
  // have enforced Plus on the next iOS build, where the App Store products
  // sit at MISSING_METADATA and nobody can buy it back.
  it("keeps iOS independent of the Android switch", () => {
    expect(PLUS_ENFORCED_IOS).toBe(false);
    expect(plusEnforcedFor("ios")).toBe(false);
  });

  // The server sees one UA token for both shells, so it asks as
  // "native-unknown". That must never enforce on the strength of one store.
  it("enforces native-unknown only when BOTH stores are launched", () => {
    expect(plusEnforcedFor("native-unknown")).toBe(
      PLUS_ENFORCED_ANDROID && PLUS_ENFORCED_IOS,
    );
    expect(plusEnforcedFor("native-unknown")).toBe(false);
  });
});

// The flags are module-level constants read from process.env at import, so
// these re-import the module under a stubbed environment. This is the actual
// regression guard: it reproduces throwing the Play launch switch and proves
// iOS does not come with it.
describe("launch switches under a stubbed environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function load() {
    vi.resetModules();
    return import("@/lib/entitlements/entitlements");
  }

  it("legacy NEXT_PUBLIC_PLUS_ENFORCED_NATIVE turns on Android but never iOS", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLUS_ENFORCED_NATIVE", "true");
    const m = await load();
    expect(m.PLUS_ENFORCED_ANDROID).toBe(true);
    expect(m.PLUS_ENFORCED_IOS).toBe(false);
    expect(m.plusEnforcedFor("android")).toBe(true);
    expect(m.plusEnforcedFor("ios")).toBe(false);
    // Still open, because iOS has not launched.
    expect(m.plusEnforcedFor("native-unknown")).toBe(false);
    expect(m.plusEnforcedFor("web")).toBe(false);
  });

  it("the explicit Android switch also leaves iOS alone", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLUS_ENFORCED_ANDROID", "true");
    const m = await load();
    expect(m.PLUS_ENFORCED_ANDROID).toBe(true);
    expect(m.PLUS_ENFORCED_IOS).toBe(false);
  });

  it("iOS enforces only on its own switch", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLUS_ENFORCED_IOS", "true");
    const m = await load();
    expect(m.PLUS_ENFORCED_IOS).toBe(true);
    expect(m.PLUS_ENFORCED_ANDROID).toBe(false);
  });

  it("native-unknown enforces once both stores are launched", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLUS_ENFORCED_ANDROID", "true");
    vi.stubEnv("NEXT_PUBLIC_PLUS_ENFORCED_IOS", "true");
    const m = await load();
    expect(m.plusEnforcedFor("native-unknown")).toBe(true);
    expect(m.plusEnforcedFor("web")).toBe(false);
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
    expect(OPEN_ENTITLEMENTS.proFeatures).toBe(true);
  });

  it("never opens the paid Pro membership itself", () => {
    // proFeatures is the software layer; `pro` drives real fulfillment
    // (EIKON Box, shipping) and must stay false in the open gate.
    expect(OPEN_ENTITLEMENTS.pro).toBe(false);
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
    expect(e.proFeatures).toBe(true);
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

  it("a plain Plus sub is not Pro and lacks the Pro feature layer", () => {
    const e = enforced({
      is_supporter: false,
      plus_until: FUTURE,
      plus_source: "google",
    });
    expect(e.plus).toBe(true);
    expect(e.pro).toBe(false);
    expect(e.proFeatures).toBe(false);
  });
});

describe("proShipsFree — the Pro-only shipping rule", () => {
  it("active Pro ships free", () => {
    expect(proShipsFree({ pro_until: FUTURE }, NOW)).toBe(true);
  });

  it("a Plus-only row pays shipping (the perk moved to Pro)", () => {
    expect(proShipsFree({ pro_until: null }, NOW)).toBe(false);
  });

  it("expired Pro pays shipping", () => {
    expect(proShipsFree({ pro_until: PAST }, NOW)).toBe(false);
  });

  it("no row / absent column pays shipping", () => {
    expect(proShipsFree(null, NOW)).toBe(false);
    expect(proShipsFree(undefined, NOW)).toBe(false);
    expect(proShipsFree({}, NOW)).toBe(false);
  });

  it("garbage timestamps fail closed", () => {
    expect(proShipsFree({ pro_until: "not-a-date" }, NOW)).toBe(false);
  });
});
