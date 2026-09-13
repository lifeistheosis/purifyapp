import { describe, expect, it } from "vitest";

import { PUSH_ENV, deliveryGaps, describeGaps, missingPushEnv } from "@/lib/push/deliveryGaps";

const none = { web: false, android: false, ios: false };
const all = { web: true, android: true, ios: true };

describe("missingPushEnv", () => {
  it("names every variable when nothing is set", () => {
    const m = missingPushEnv({});
    expect(m.web).toEqual([...PUSH_ENV.web]);
    expect(m.android).toEqual(["FCM_SERVICE_ACCOUNT_JSON"]);
    expect(m.ios).toEqual([...PUSH_ENV.ios]);
  });

  it("treats an empty string as unset", () => {
    expect(missingPushEnv({ FCM_SERVICE_ACCOUNT_JSON: "" }).android).toEqual(["FCM_SERVICE_ACCOUNT_JSON"]);
  });

  it("names only what is still missing", () => {
    const m = missingPushEnv({ APNS_KEY_P8: "x", APNS_TEAM_ID: "y" });
    expect(m.ios).toEqual(["APNS_KEY_ID", "APNS_BUNDLE_ID"]);
  });
});

describe("deliveryGaps", () => {
  it("reports every transport the audience needed, largest first", () => {
    // The shape of the owner's report: 266 devices and nothing configured.
    const gaps = deliveryGaps({ web: 0, android: 212, ios: 54 }, none, missingPushEnv({}));
    expect(gaps.map((g) => g.transport)).toEqual(["android", "ios"]);
    expect(gaps.map((g) => g.devices)).toEqual([212, 54]);
  });

  it("ignores a transport nobody in the audience uses", () => {
    const gaps = deliveryGaps({ web: 0, android: 10, ios: 0 }, none, missingPushEnv({}));
    expect(gaps.map((g) => g.transport)).toEqual(["android"]);
  });

  it("catches the partial send the old status could not see", () => {
    // Firebase set, Apple not. broadcastStatus logs this as "sent" because
    // Android delivered; the iPhones were skipped without a word.
    const gaps = deliveryGaps(
      { web: 0, android: 20, ios: 7 },
      { web: false, android: true, ios: false },
      missingPushEnv({ FCM_SERVICE_ACCOUNT_JSON: "eyJ9" }),
    );
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ transport: "ios", devices: 7 });
  });

  it("reports nothing when everything is configured", () => {
    expect(deliveryGaps({ web: 3, android: 3, ios: 3 }, all, missingPushEnv({}))).toEqual([]);
  });

  it("calls a set-but-refused transport malformed, not missing", () => {
    // Every variable present, provider still declined: a bad .p8 or raw JSON.
    const env = Object.fromEntries(PUSH_ENV.ios.map((k) => [k, "set"]));
    const gaps = deliveryGaps({ web: 0, android: 0, ios: 5 }, none, missingPushEnv(env));
    expect(gaps[0].malformed).toBe(true);
    expect(gaps[0].missing).toEqual([]);
  });
});

describe("describeGaps", () => {
  it("says which keys, on which platform, for how many devices", () => {
    const text = describeGaps(
      deliveryGaps({ web: 0, android: 212, ios: 54 }, none, missingPushEnv({})),
    );
    expect(text).toContain("Android, 212 devices: FCM_SERVICE_ACCOUNT_JSON is not set.");
    expect(text).toContain("iPhone, 54 devices: APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID and APNS_BUNDLE_ID are not set.");
    // Largest audience first, so the fix that reaches the most people leads.
    expect(text.indexOf("Android")).toBeLessThan(text.indexOf("iPhone"));
  });

  it("gets singular and plural right", () => {
    const text = describeGaps(deliveryGaps({ web: 1, android: 0, ios: 0 }, none, missingPushEnv({})));
    expect(text).toContain("Web push, 1 device: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT are not set.");
  });

  it("points at the server log for a malformed key", () => {
    const env = Object.fromEntries(PUSH_ENV.android.map((k) => [k, "not base64"]));
    const text = describeGaps(deliveryGaps({ web: 0, android: 2, ios: 0 }, none, missingPushEnv(env)));
    expect(text).toMatch(/could not be read/);
  });

  it("is empty when there is nothing to say", () => {
    expect(describeGaps([])).toBe("");
  });

  it("never contains an em dash", () => {
    const text = describeGaps(deliveryGaps({ web: 4, android: 4, ios: 4 }, none, missingPushEnv({})));
    expect(text).not.toMatch(/[—–]/);
  });
});
