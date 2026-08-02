// Guards on the update prompt, which cannot be exercised without a device.
//
// The one failure mode worth being careful of is prompting every reader to
// fetch a build that is not on the store yet, so these assert the shape of
// the declaration and the release ritual around it rather than the UI.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { CURRENT_RELEASE } from "@/lib/appUpdate/release";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

const ROOT = process.cwd();

describe("the declared release", () => {
  it("names the version this build actually is", () => {
    // If these drift, the prompt tells a reader to update TO the version
    // they are already running.
    expect(CURRENT_RELEASE.versionName).toBe(CURRENT_VERSION);
  });

  it("agrees with android/app/build.gradle about the version name", () => {
    const gradle = fs.readFileSync(
      path.join(ROOT, "android/app/build.gradle"),
      "utf8",
    );
    const m = gradle.match(/versionName\s*=\s*"([^"]+)"/);
    expect(m, "versionName not found in build.gradle").toBeTruthy();
    // version.ts carries "Beta 3.0", the gradle file carries "3.0".
    expect(CURRENT_RELEASE.versionName.replace(/^Beta\s+/, "")).toBe(m![1]);
  });

  it("has a non-negative integer versionCode, where 0 means no prompt", () => {
    expect(Number.isInteger(CURRENT_RELEASE.androidVersionCode)).toBe(true);
    expect(CURRENT_RELEASE.androidVersionCode).toBeGreaterThanOrEqual(0);
  });

  it("points at Purify's own Play listing, over https", () => {
    const gradle = fs.readFileSync(
      path.join(ROOT, "android/app/build.gradle"),
      "utf8",
    );
    const appId = gradle.match(/applicationId\s+"([^"]+)"/)?.[1];
    expect(appId).toBeTruthy();
    expect(CURRENT_RELEASE.androidStoreUrl.startsWith("https://")).toBe(true);
    expect(CURRENT_RELEASE.androidStoreUrl).toContain(appId!);
  });

  it("carries every message key the prompt renders", () => {
    const en = JSON.parse(
      fs.readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8"),
    ) as Record<string, string>;
    for (const key of [
      "update.title",
      "update.body",
      "update.versions",
      "update.cta",
      "update.later",
    ]) {
      expect(typeof en[key], `${key} missing from en.json`).toBe("string");
    }
    // The two placeholders the component substitutes.
    expect(en["update.versions"]).toContain("{installed}");
    expect(en["update.versions"]).toContain("{latest}");
  });

  it("is mounted in the ROOT layout, not the (app) group", () => {
    // The native app cold-starts onto Today (app/page.tsx), which is outside
    // the (app) group. Mounted there, the prompt never reaches the reader
    // who opens Purify, prays, and closes it. Same trap PrayerSyncBridge
    // was moved out of.
    const root = fs.readFileSync(path.join(ROOT, "app/layout.tsx"), "utf8");
    const group = fs.readFileSync(
      path.join(ROOT, "app/(app)/layout.tsx"),
      "utf8",
    );
    expect(root).toContain("<UpdateBridge />");
    expect(group).not.toContain("<UpdateBridge />");
  });
});
