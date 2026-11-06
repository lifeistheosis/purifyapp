import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { APP_LINK_HOSTS, APP_LINK_PATHS, appLinkTarget } from "../appLinks";

const ROOT = path.resolve(__dirname, "..", "..", "..");

describe("appLinkTarget", () => {
  it("opens the gift screen for the address printed on the EIKON card", () => {
    // The QR on 200 printed cards encodes exactly this. It must never stop working.
    expect(appLinkTarget("https://purifyapp.net/gift")).toBe("/gift");
    expect(appLinkTarget("https://purifyapp.net/gift/")).toBe("/gift");
    expect(appLinkTarget("https://purifyapp.net/gift?utm_source=card")).toBe("/gift");
  });

  it("ignores every other address", () => {
    for (const url of [
      "http://purifyapp.net/gift",
      "https://evil.example/gift",
      "https://purifyapp.net.evil.example/gift",
      "https://user:pw@purifyapp.net/gift",
      "https://purifyapp.net:8443/gift",
      "https://purifyapp.net/gifts",
      "https://purifyapp.net/",
      "https://purifyapp.net/admin",
      "https://purifyapp.net/constructor",
      "net.purifyapp.purify://shortcut/morning",
      "not a url",
      42,
      null,
    ]) {
      expect(appLinkTarget(url)).toBeNull();
    }
  });
});

describe("the Android manifest answers for the same addresses", () => {
  const manifest = fs.readFileSync(path.join(ROOT, "android/app/src/main/AndroidManifest.xml"), "utf8");

  it("declares an auto-verified https filter for each host and path", () => {
    expect(manifest).toContain('android:autoVerify="true"');
    for (const host of APP_LINK_HOSTS) {
      for (const p of Object.keys(APP_LINK_PATHS)) {
        expect(manifest).toContain(`android:scheme="https" android:host="${host}" android:path="${p}"`);
      }
    }
  });

  it("claims no other https address", () => {
    const declared = [...manifest.matchAll(/android:scheme="https"[^>]*android:path="([^"]+)"/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual(Object.keys(APP_LINK_PATHS).sort());
    expect(manifest).not.toMatch(/android:pathPrefix=|android:pathPattern=/);
  });
});
