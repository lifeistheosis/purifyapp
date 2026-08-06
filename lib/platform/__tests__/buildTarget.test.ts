// Guards on the build-target flag, which decides whether a build is the website
// or a native bundle.
//
// Two things are worth holding still. next.config.ts cannot import the helper
// (it is loaded outside the app's module graph and does not resolve "@/"), so
// the check is written out twice and the copies can drift. And the literal
// `BUILD_TARGET === "android"` used to be pasted across ten files, which is the
// reason adding iOS was a ten-file change; if it creeps back, the next platform
// is a ten-file change again.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { BUILD_TARGET, IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

const ROOT = process.cwd();

// Files that legitimately name a single platform, and why.
//   - buildTarget.ts itself is where the names are defined.
//   - next.config.ts is the duplicate this suite exists to police.
//   - native-build.mjs validates its own --platform argument.
const ALLOWED_TO_NAME_A_PLATFORM = [
  "lib/platform/buildTarget.ts",
  "next.config.ts",
  "scripts/native-build.mjs",
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "__tests__") continue;
      sourceFiles(rel, out);
    } else if (/\.(ts|tsx|mjs)$/.test(e.name)) {
      out.push(rel);
    }
  }
  return out;
}

describe("the build target", () => {
  it("is the website unless a native export asked otherwise", () => {
    // The suite runs with BUILD_TARGET unset, which must read as "web" and
    // must NOT read as a static export: every cookies()/headers() guard in the
    // app hangs off this, and inverting it would silently disable them all.
    expect(BUILD_TARGET).toBe("web");
    expect(IS_STATIC_EXPORT).toBe(false);
  });

  it("agrees with next.config.ts about which targets export statically", () => {
    const config = fs.readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
    // output:"export" must be reachable for BOTH platforms. Dropping either
    // one here gives that platform an SSR build Capacitor cannot bundle.
    expect(config).toContain('=== "android"');
    expect(config).toContain('=== "ios"');
    expect(config).toContain('output: "export"');
  });

  it("has not let the bare platform literal creep back into app code", () => {
    const offenders: string[] = [];
    for (const dir of ["app", "lib", "components", "scripts"]) {
      for (const file of sourceFiles(dir)) {
        if (ALLOWED_TO_NAME_A_PLATFORM.includes(file)) continue;
        const src = fs.readFileSync(path.join(ROOT, file), "utf8");
        // Comments may discuss BUILD_TARGET; code may not test it directly.
        const withoutComments = src
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "");
        if (/process\.env\.BUILD_TARGET\s*===/.test(withoutComments)) {
          offenders.push(file);
        }
      }
    }
    expect(
      offenders,
      `use IS_STATIC_EXPORT from lib/platform/buildTarget instead: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
