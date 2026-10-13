// The on-device content layer is off, and one line decides it.
//
// What a reader would notice if this broke: nothing on the screen. A first
// open that freezes for seconds while 33 MB of text nobody reads is written
// into a database, and an app 33 MB heavier than it says it is.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { EXPORT_LIMITS } from "@/lib/build/exportSize";

import { LOCAL_CONTENT_ENABLED } from "../enabled";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

function sources(): string[] {
  const out: string[] = [];
  for (const top of ["app", "components", "lib"]) {
    for (const entry of fs.readdirSync(path.join(ROOT, top), { recursive: true, encoding: "utf8" })) {
      const file = `${top}/${entry.replace(/\\/g, "/")}`;
      if (/\.tsx?$/.test(file) && !file.includes("__tests__")) out.push(file);
    }
  }
  return out;
}

describe("the on-device content layer", () => {
  it("is off", () => {
    expect(LOCAL_CONTENT_ENABLED).toBe(false);
  });

  // The whole case for switching it off. The day a screen reads the store,
  // this fails, and that is the day to switch the layer on.
  it("has no screen that reads it", () => {
    const readers = sources().filter((file) => {
      // The file that defines the three hooks, and the switch's own account
      // of them, are not readers.
      if (file === "components/content/ContentProvider.tsx" || file === "lib/content/enabled.ts") return false;
      return /\buse(?:Repository|LocalContent|SyncQueue)\(/.test(read(file));
    });
    if (LOCAL_CONTENT_ENABLED) {
      expect(readers.length, "The layer is on, so something should read it.").toBeGreaterThan(0);
    } else {
      expect(
        readers,
        "A screen reads the on-device store, but the store is switched off and is " +
          "never filled, so it will read nothing. Set LOCAL_CONTENT_ENABLED in " +
          "lib/content/enabled.ts and raise the size limits to carry the package.",
      ).toEqual([]);
    }
  });

  it("is not started by the apps while it is off", () => {
    const provider = read("components/content/ContentProvider.tsx");
    const gate = provider.indexOf("if (!LOCAL_CONTENT_ENABLED) return;");
    const start = provider.indexOf('import("@/lib/content/bootstrap")');
    expect(gate).toBeGreaterThan(-1);
    expect(start).toBeGreaterThan(gate);
  });

  it("is read by the build from the same line, which is the plain word the build looks for", () => {
    // scripts/native-build.mjs looks for exactly this line.
    expect(read("lib/content/enabled.ts")).toMatch(/^export const LOCAL_CONTENT_ENABLED = (true|false);\r?$/m);
    const build = read("scripts/native-build.mjs");
    expect(build).toContain('path.join(ROOT, "lib", "content", "enabled.ts")');
    // The package is written, and checked, only inside the switch.
    const open = build.indexOf("if (localContentEnabled()) {");
    const close = build.indexOf("} else {", open);
    expect(open).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    for (const step of ["scripts/build-content-package.mjs --out out/content", "scripts/verify-package.mjs out/content/content-package.json"]) {
      const at = build.indexOf(step);
      expect(at, step).toBeGreaterThan(open);
      expect(at, step).toBeLessThan(close);
      expect(build.indexOf(step, at + 1), `${step} appears once`).toBe(-1);
    }
  });

  it("is kept: the builder, its check and the code are all still here", () => {
    for (const file of [
      "scripts/build-content-package.mjs",
      "scripts/verify-package.mjs",
      "scripts/emit-registries.mjs",
      "lib/content/bootstrap.ts",
      "lib/content/manifest.ts",
      "lib/content/repository.ts",
      "lib/content/syncQueue.ts",
    ]) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
    }
    expect(JSON.parse(read("package.json")).scripts["build:content"]).toContain("build-content-package.mjs");
  });

  // 32.7 MB on disk and 10.9 MB packed, measured 2026-10-12. The limits were
  // set for an app without it.
  it("cannot come back inside the size limits as they stand", () => {
    if (LOCAL_CONTENT_ENABLED) return;
    const MB = 1024 ** 2;
    expect(EXPORT_LIMITS.stopDiskBytes).not.toBeNull();
    expect(EXPORT_LIMITS.stopDiskBytes!).toBeLessThan((222.7 + 32.7) * MB);
    expect(EXPORT_LIMITS.stopPackedBytes!).toBeLessThan((79.8 + 10.9) * MB);
  });
});
