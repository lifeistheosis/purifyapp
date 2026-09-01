import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CURRENT_RELEASE, servedRelease } from "../release";

/**
 * The override that lets a store approval start prompting without a deploy.
 *
 * THE ASYMMETRY IS THE WHOLE TEST. Setting a build number LATE is harmless:
 * nobody is prompted, which is the resting state anyway. Setting it EARLY
 * tells every installed app a newer build exists and sends it to a store
 * listing that does not have one. So every case here is about refusing a
 * value rather than accepting one, and the fallback is always the committed
 * constant.
 */

const ORIGINAL = { ...process.env };

beforeEach(() => {
  delete process.env.ANDROID_VERSION_CODE;
  delete process.env.IOS_BUILD_NUMBER;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.restoreAllMocks();
});

describe("servedRelease", () => {
  it("serves the committed record when nothing is set", () => {
    expect(servedRelease()).toEqual(CURRENT_RELEASE);
  });

  it("honours a positive Android version code", () => {
    process.env.ANDROID_VERSION_CODE = "42";
    expect(servedRelease().androidVersionCode).toBe(42);
  });

  it("leaves everything else alone when it overrides one field", () => {
    process.env.ANDROID_VERSION_CODE = "42";
    const r = servedRelease();
    expect(r.versionName).toBe(CURRENT_RELEASE.versionName);
    expect(r.androidStoreUrl).toBe(CURRENT_RELEASE.androidStoreUrl);
    expect(r.iosBuildNumber).toBe(CURRENT_RELEASE.iosBuildNumber);
  });

  it.each(["0", "-3", "1.5", "abc", "", " ", "12abc"])(
    "refuses %o and falls back to the committed value",
    (value) => {
      process.env.ANDROID_VERSION_CODE = value;
      expect(servedRelease().androidVersionCode).toBe(
        CURRENT_RELEASE.androidVersionCode,
      );
    },
  );

  it("does not let a bad value prompt anybody", () => {
    // The failure this guards: a typo parsing as something truthy and every
    // installed app being sent to a store listing for a build that is not up.
    process.env.ANDROID_VERSION_CODE = "not-a-number";
    expect(servedRelease().androidVersionCode).toBe(0);
  });

  it("honours an iOS build number once the store URL is a real Adam ID", () => {
    // The committed URL carries a real numeric id, so the guard should pass.
    // If this ever fails, the URL has been replaced with a placeholder and the
    // iOS half of the override is correctly refusing to work.
    expect(CURRENT_RELEASE.iosStoreUrl).toMatch(/id\d{6,}/);
    process.env.IOS_BUILD_NUMBER = "7";
    expect(servedRelease().iosBuildNumber).toBe(7);
  });

  it("reads the two stores independently", () => {
    // Play and the App Store do not promote on the same day, and whichever
    // lands first must be able to start prompting alone.
    process.env.ANDROID_VERSION_CODE = "11";
    const r = servedRelease();
    expect(r.androidVersionCode).toBe(11);
    expect(r.iosBuildNumber).toBe(CURRENT_RELEASE.iosBuildNumber);
  });
});
