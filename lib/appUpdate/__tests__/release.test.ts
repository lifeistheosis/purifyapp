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

  it("agrees with the Xcode project about the version name", () => {
    // The reason iOS sat at MARKETING_VERSION 1.0 while the product shipped
    // Beta 3.0 is that the release ritual listed four identifiers and this was
    // not one of them. Holding it here means it cannot drift again without a
    // red build, which is the only mechanism that has ever worked for the
    // other four.
    const pbx = fs.readFileSync(
      path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj"),
      "utf8",
    );
    const versions = [...pbx.matchAll(/MARKETING_VERSION\s*=\s*([^;]+);/g)].map(
      (m) => m[1].trim().replace(/^"|"$/g, ""),
    );
    expect(versions.length, "MARKETING_VERSION not found in project.pbxproj")
      .toBeGreaterThan(0);
    // Debug and Release must not disagree with each other either.
    expect(new Set(versions).size, `MARKETING_VERSION differs across configurations: ${versions.join(", ")}`).toBe(1);
    expect(CURRENT_RELEASE.versionName.replace(/^Beta\s+/, "")).toBe(versions[0]);
  });

  it("has non-negative integer build numbers, where 0 means no prompt", () => {
    for (const [name, value] of [
      ["androidVersionCode", CURRENT_RELEASE.androidVersionCode],
      ["iosBuildNumber", CURRENT_RELEASE.iosBuildNumber],
    ] as const) {
      expect(Number.isInteger(value), `${name} must be an integer`).toBe(true);
      expect(value, `${name} must not be negative`).toBeGreaterThanOrEqual(0);
    }
  });

  it("does not point iOS readers at a placeholder listing once it prompts", () => {
    // iosStoreUrl carries a zeroed Adam ID until the App Store Connect record
    // exists. That is harmless while iosBuildNumber is 0, because
    // checkForUpdate returns before it is ever read. Raising the number without
    // filling in the id would hand every iPhone reader a dead App Store link,
    // so the two must move together.
    expect(CURRENT_RELEASE.iosStoreUrl.startsWith("https://apps.apple.com/")).toBe(
      true,
    );
    if (CURRENT_RELEASE.iosBuildNumber > 0) {
      expect(
        CURRENT_RELEASE.iosStoreUrl,
        "set the real Adam ID before declaring an iOS build",
      ).not.toContain("id0000000000");
    }
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
