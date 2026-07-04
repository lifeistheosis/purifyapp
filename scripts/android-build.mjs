// Orchestrates the Android local-first build:
//   1. stash app/api out of the tree (route handlers can't live in a static
//      export; they stay on the remote website and are called over the network
//      for auth / billing / sync / content-updates / licensed Bible),
//   2. run the Next static export (BUILD_TARGET=android → output:'export'),
//   3. ALWAYS restore app/api (finally), even if the build fails,
//   4. emit TS registries + build the content package into out/content.
//
// The website build (npm run build) is untouched — app/api is only moved for
// the duration of the export and restored immediately after.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STASH_DIR = path.join(ROOT, ".android-export-stash");

// Route trees excluded from the static export and restored afterwards:
//   - app/api: 31 route handlers — can't be exported; stay remote (auth,
//     billing, sync, content-updates, licensed Bible) and are called over HTTP.
//   - campaigns/[id], florilegium/[id]: runtime-only ids (a campaign stub and
//     user collections) with no static param set, so output:export can't
//     pre-render them. They render client-side from the local DB in a later
//     milestone; excluding them here keeps the website source untouched.
const STASH_PATHS = [
  ["app", "api"],
  ["app", "(app)", "campaigns", "[id]"],
  ["app", "(app)", "florilegium", "[id]"],
  // Purely query-driven / internal routes with no useful static form in the
  // bundle: the multi-reference lookup (?q=), the editorial language tool, and
  // the admin dashboard (force-dynamic, online-only, not part of the app).
  ["app", "(app)", "bible", "multi"],
  ["app", "(app)", "language-editor"],
  ["app", "admin"],
];

function slot(i) {
  return path.join(STASH_DIR, String(i));
}
function stashAll() {
  STASH_PATHS.forEach((parts, i) => {
    const src = path.join(ROOT, ...parts);
    if (fs.existsSync(src)) {
      fs.mkdirSync(STASH_DIR, { recursive: true });
      fs.rmSync(slot(i), { recursive: true, force: true });
      fs.renameSync(src, slot(i));
      console.log(`• stashed ${parts.join("/")} (excluded from static export)`);
    }
  });
}
function restoreAll() {
  STASH_PATHS.forEach((parts, i) => {
    if (fs.existsSync(slot(i))) {
      const dest = path.join(ROOT, ...parts);
      fs.rmSync(dest, { recursive: true, force: true });
      fs.renameSync(slot(i), dest);
      console.log(`• restored ${parts.join("/")}`);
    }
  });
  fs.rmSync(STASH_DIR, { recursive: true, force: true });
}

function run(cmd, extraEnv = {}) {
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
}

try {
  stashAll();
  run("next build", { BUILD_TARGET: "android" });
} finally {
  restoreAll();
}

// Bundle content into the exported tree so the app fetches it locally.
run("node --experimental-strip-types scripts/emit-registries.mjs");
run("node scripts/build-content-package.mjs --out out/content");
// Integrity gate: fail the build if the generated package doesn't verify.
run("node scripts/verify-package.mjs out/content/content-package.json");

console.log("\n✓ Android local bundle ready: out/ (UI) + out/content/ (data)");
