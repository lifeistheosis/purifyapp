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
  // The shop (EIKON marketplace) now ships in the app: its pages are client
  // components that fetch live from the /api/shop/catalog routes and read the
  // buyer's own orders/messages via the Supabase client (Shop v2, Beta 1.9).
  // Only the SELLER CONSOLE stays web-only — it's a merchant surface, still
  // force-dynamic with server reads, and merchants manage listings from a
  // browser, so there is no useful offline form to bundle.
  ["app", "(app)", "shop", "seller"],
  // Support ticket form: force-dynamic (signed-in prefill + ticket writes),
  // network-only like the shop it shipped with. The static /support page
  // stays in the bundle; only the contact form is web-only.
  ["app", "(app)", "support", "contact"],
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

// Prune the RSC prefetch payload duplicate that `next build` emits per route.
// For every statically-exported route Next writes `index.txt` (the full-route
// flight payload the client router fetches for soft navigation) AND a
// byte-identical `__next._full.txt` beside it — the `/_full` segment key is a
// build-time server-cache artifact that the client segment cache NEVER requests
// in output:'export' mode (the string "_full" appears nowhere in
// next/dist/client). So `__next._full.txt` is dead weight that ships in the
// APK: ~1,750 files, ~247 MB on the current content set. index.txt and every
// other segment file are load-bearing and left untouched. Next regenerates
// `_full` on every build, so this must run each build, not once.
function pruneFullPayloadDuplicates(dir) {
  let files = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else if (entry.isFile() && entry.name === "__next._full.txt") {
        bytes += fs.statSync(p).size;
        fs.rmSync(p);
        files += 1;
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  console.log(
    `• pruned ${files} __next._full.txt duplicate(s), reclaimed ${(bytes / 1048576).toFixed(1)} MB`,
  );
}

// Post-export guard (Beta 2.3 language patch). The translated corpus in
// data/**/i18n and {id}.{locale}.json siblings is hundreds of MB and must
// NEVER ship in the APK (the app fetches translations from the live API).
// The export bakes English only and build-content-package skips locale
// files, so a hit here means a new leak path opened: fail loudly instead
// of silently shipping a bloated bundle onto a near-full disk.
// _next/ is exempt: the UI message catalogs are bundled there on purpose
// (tiny per-locale chunks the client loads when switching language).
const LOCALE_CODES = [
  "es", "ro", "el", "ru", "fr", "de", "sr", "uk", "it", "pt", "bg", "ar",
  "fil", "tr", "ka", "hu", "id", "ne", "pl", "ur",
];
const LOCALE_SIBLING_RE = new RegExp(`\\.(${LOCALE_CODES.join("|")})\\.json$`);
// Warn when the export outgrows this: measured 1.20 GB pre-prune on
// 2026-07-19 plus ~15% headroom. Revisit when content legitimately grows.
const OUT_SIZE_BUDGET_BYTES = 1.4 * 1024 ** 3;

function guardExportAgainstI18nLeaks(dir) {
  const leaks = [];
  let totalBytes = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "_next") continue;
        if (entry.name === "i18n") {
          leaks.push(path.relative(dir, p));
          continue;
        }
        walk(p);
      } else {
        totalBytes += fs.statSync(p).size;
        if (LOCALE_SIBLING_RE.test(entry.name)) {
          leaks.push(path.relative(dir, p));
        }
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  if (leaks.length > 0) {
    console.error(
      `✗ i18n content leaked into the export (${leaks.length} path(s)):\n` +
        leaks.slice(0, 20).map((l) => `    ${l}`).join("\n"),
    );
    process.exit(1);
  }
  const gb = (totalBytes / 1024 ** 3).toFixed(2);
  if (totalBytes > OUT_SIZE_BUDGET_BYTES) {
    console.warn(
      `⚠ out/ (excluding _next) is ${gb} GB, over the ${(OUT_SIZE_BUDGET_BYTES / 1024 ** 3).toFixed(2)} GB budget — investigate before shipping`,
    );
  } else {
    console.log(`• export size guard: out/ (excluding _next) ${gb} GB, no i18n leaks`);
  }
}

// Start from a clean export. `next build` writes into out/ but does not delete
// stale files from routes that no longer exist, so out/ silently accumulates
// months of removed content across builds and ships it in the APK. Wipe it so
// only the current content set is bundled.
fs.rmSync(path.join(ROOT, "out"), { recursive: true, force: true });

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

// Trim the redundant RSC prefetch duplicates now that the export is complete
// (after the content package + its integrity gate, so nothing downstream reads
// the pruned files).
pruneFullPayloadDuplicates(path.join(ROOT, "out"));

// Last: nothing after this may write into out/.
guardExportAgainstI18nLeaks(path.join(ROOT, "out"));

console.log("\n✓ Android local bundle ready: out/ (UI) + out/content/ (data)");
