import { describe, expect, it } from "vitest";

import {
  addFailure,
  apnsVerdict,
  describeFailures,
  emptyTally,
  explainFailure,
  fcmTokenGone,
  reasonOf,
  tallyIsEmpty,
} from "@/lib/push/failures";

describe("reasonOf", () => {
  it("takes Apple's reason, then a code, then an error's own name", () => {
    expect(reasonOf({ reason: "InvalidProviderToken", code: "x" })).toBe("InvalidProviderToken");
    expect(reasonOf({ code: "messaging/invalid-argument" })).toBe("messaging/invalid-argument");
    expect(reasonOf(new TypeError("boom"))).toBe("TypeError");
  });

  it("never returns an error's message, which could echo a key back", () => {
    expect(reasonOf(new Error("-----BEGIN PRIVATE KEY----- MIGT"))).toBe("unknown");
    expect(reasonOf(undefined)).toBe("unknown");
  });
});

describe("apnsVerdict", () => {
  it("asks the other server before judging a BadDeviceToken", () => {
    expect(apnsVerdict("BadDeviceToken")).toBe("other-host");
  });

  it("treats only Apple's never-again answers as gone", () => {
    expect(apnsVerdict("Unregistered")).toBe("gone");
    expect(apnsVerdict("DeviceTokenNotForTopic")).toBe("gone");
  });

  it("keeps the token when the problem is the key or the moment", () => {
    for (const r of ["InvalidProviderToken", "TooManyRequests", "ServiceUnavailable", "unknown"]) {
      expect(apnsVerdict(r)).toBe("keep");
    }
  });
});

describe("fcmTokenGone", () => {
  it("knows Firebase's dead-token codes and nothing else", () => {
    expect(fcmTokenGone("messaging/registration-token-not-registered")).toBe(true);
    expect(fcmTokenGone("messaging/invalid-argument")).toBe(true);
    expect(fcmTokenGone("messaging/mismatched-credential")).toBe(false);
    expect(fcmTokenGone("messaging/server-unavailable")).toBe(false);
  });
});

describe("describeFailures", () => {
  it("says nothing when nothing failed", () => {
    const t = emptyTally();
    expect(tallyIsEmpty(t)).toBe(true);
    expect(describeFailures(t)).toBe("");
  });

  it("names the platform, the count, the code and what to change, most frequent first", () => {
    const t = emptyTally();
    addFailure(t, "ios", "TooManyRequests");
    for (let i = 0; i < 3; i++) addFailure(t, "ios", "InvalidProviderToken");
    addFailure(t, "android", undefined);
    const text = describeFailures(t);
    expect(tallyIsEmpty(t)).toBe(false);
    expect(text.indexOf("3 iPhones failed (InvalidProviderToken)")).toBe(0);
    expect(text).toContain("APNS_KEY_ID");
    expect(text).toContain("1 iPhone failed (TooManyRequests)");
    expect(text).toContain("1 Android phone failed (unknown): Firebase answered unknown.");
  });

  it("puts a reason it does not know in the provider's own words", () => {
    expect(explainFailure("ios", "PayloadTooLarge")).toBe("Apple answered PayloadTooLarge.");
  });

  it("has no em dash in anything the panel can show", () => {
    const t = emptyTally();
    for (const r of ["InvalidProviderToken", "TopicDisallowed", "DeviceTokenNotForTopic", "Unregistered"]) {
      addFailure(t, "ios", r);
    }
    for (const r of ["messaging/mismatched-credential", "app/invalid-credential"]) addFailure(t, "android", r);
    expect(describeFailures(t)).not.toMatch(/\u2014/);
  });
});
