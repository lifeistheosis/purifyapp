// Orchestrates the local-first build for BOTH native platforms:
//   1. stash app/api out of the tree (route handlers can't live in a static
//      export; they stay on the remote website and are called over the network
//      for auth / billing / sync / content-updates / licensed Bible),
//   2. run the Next static export (BUILD_TARGET=android|ios → output:'export'),
//   3. ALWAYS restore app/api (finally), even if the build fails,
//   4. emit TS registries + build the content package into out/content.
//
// Usage: node scripts/native-build.mjs --platform android|ios
//        (npm run build:android / npm run build:ios)
//
// The export itself is IDENTICAL for the two platforms. Everything that differs
// is downstream in Capacitor: Android serves the bundle from https://localhost,
// iOS from capacitor://localhost. The platform is threaded through only so
// BUILD_TARGET is accurate, because lib/platform/buildTarget.ts derives
// IS_STATIC_EXPORT from it and app code branches on that.
//
// BOTH platforms write to the SAME out/ directory, and step 0 below wipes it.
// Never run the two concurrently in one checkout: the second wipe lands in the
// middle of the first build. In CI they are separate jobs on separate runners,
// so this only bites locally.
//
// The website build (npm run build) is untouched: app/api is only moved for the
// duration of the export and restored immediately after.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PLATFORMS = ["android", "ios"];

function parsePlatform(argv) {
  const i = argv.indexOf("--platform");
  const value = i >= 0 ? argv[i + 1] : undefined;
  if (!value) {
    console.error(
      `✗ --platform is required (one of: ${PLATFORMS.join(", ")})\n` +
        "  e.g. node scripts/native-build.mjs --platform ios",
    );
    process.exit(1);
  }
  if (!PLATFORMS.includes(value)) {
    console.error(
      `✗ unknown platform "${value}" (expected one of: ${PLATFORMS.join(", ")})`,
    );
    process.exit(1);
  }
  return value;
}

const PLATFORM = parsePlatform(process.argv.slice(2));
const LABEL = PLATFORM === "ios" ? "iOS" : "Android";

const ROOT = process.cwd();
const STASH_DIR = path.join(ROOT, ".native-export-stash");

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
  // Internal routes with no useful static form in the bundle: the editorial
  // language tool and the admin dashboard (force-dynamic, online-only, not
  // part of the app).
  //
  // bible/multi used to be stashed here as "purely query-driven". That was the
  // cause of an Android beta bug reported 2026-07-26: the search bar pushes to
  // /bible/multi?q= for a multi-reference query, the route was absent from the
  // bundle, and the shell dropped the user on Today with their query lost. A
  // ?q= route is perfectly exportable as a static shell whose client child
  // reads useSearchParams, which is what /campaigns/detail already does, so it
  // now ships. Do not re-stash it.
  ["app", "(app)", "language-editor"],
  ["app", "admin"],
  // The owner dashboard. As of v4 its content lives inside the admin shell as
  // three tabs behind an Operations | Owner switch, and this tree holds a
  // redirect to it plus the standalone preview.
  //
  // It must STAY on this list, and the reason is stronger now than before.
  // app/owner/page.tsx is force-dynamic and calls redirect(). Under
  // output:'export' that redirect is baked into the static bundle rather than
  // failing loudly, which is the exact trap this entry has always guarded
  // against. Removing it would ship a native app whose owner route silently
  // bounces to a page the export does not contain.
  ["app", "owner"],
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
// APK: ~1,750 files, ~247 MB on the current content set. index.txt is
// load-bearing and left untouched. Next regenerates `_full` on every build, so
// this must run each build, not once.
//
// NOTE: this comment used to also claim "every other segment file is
// load-bearing". That was measured and found to be wrong; see
// pruneSegmentCache below for the evidence.
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

// Prune Next 16's client segment cache (`__next.!<b64-route-group>` entries).
// These exist to let the router prefetch individual layout/page SEGMENTS so a
// navigation can start before the full route payload arrives. That is a
// latency optimisation for a network. This app is bundled into the APK and
// served from https://localhost, so there is no latency to hide, and they cost
// 194.3 MB of a 816.8 MB export (23.8%).
//
// Two distinct kinds, measured on the 2026-07-25 export:
//
//   nested `__next.!<key>/...` directory trees — 97.3 MB, 6,720 files.
//     These CANNOT BE SERVED AT ALL in output:'export'. The client requests a
//     flat, dot-joined name:
//        /bible/john/3/__next.!KGFwcCk.bible.$d$book.$d$chapter.__PAGE__.txt
//     but the export writes a nested path:
//        /bible/john/3/__next.!KGFwcCk/bible/$d$book/$d$chapter/__PAGE__.txt
//     No static host maps one onto the other, so these 404 in the app today.
//     Deleting them is a pure size win with no behaviour change whatsoever.
//
//   flat `__next.!<key>.txt` files — 96.9 MB, 1,751 files.
//     These ARE reachable and are what the router actually uses for segment
//     prefetch. Removing them makes the router fall back to the full-route
//     `index.txt`, which is already on disk beside every page.
//
// Verified before enabling: the export was served with every `__next.!` request
// forced to 404, and client-side navigation still worked in all cases tried —
// same-route (/bible/john/3 -> /bible/john/2), into a dynamic segment
// (/saints -> /saints/theotokos), and across route trees
// (/saints/theotokos -> /bible -> /prayers). Soft navigation, correct titles,
// content rendered. The only loss is prefetch warmth, which buys nothing off a
// local disk.
//
// Next regenerates these every build, so this runs each build.
function pruneSegmentCache(dir) {
  let nestedFiles = 0;
  let nestedBytes = 0;
  let flatFiles = 0;
  let flatBytes = 0;

  const measure = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) measure(p);
      else if (entry.isFile()) {
        nestedBytes += fs.statSync(p).size;
        nestedFiles += 1;
      }
    }
  };

  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith("__next.!")) {
          measure(p);
          fs.rmSync(p, { recursive: true, force: true });
        } else {
          walk(p);
        }
      } else if (
        entry.isFile() &&
        entry.name.startsWith("__next.!") &&
        entry.name.endsWith(".txt")
      ) {
        flatBytes += fs.statSync(p).size;
        fs.rmSync(p);
        flatFiles += 1;
      }
    }
  };

  if (fs.existsSync(dir)) walk(dir);
  const mb = (b) => (b / 1048576).toFixed(1);
  console.log(
    `• pruned segment cache: ${nestedFiles} unreachable file(s) in ` +
      `${mb(nestedBytes)} MB of nested trees + ${flatFiles} prefetch file(s) ` +
      `at ${mb(flatBytes)} MB, reclaimed ${mb(nestedBytes + flatBytes)} MB`,
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
// Warn when the export outgrows this: measured 0.78 GB on 2026-07-19
// after deduplicating the i18n catalog out of every page payload (the
// root layout no longer serializes messages for English), plus ~15%
// headroom. Revisit when content legitimately grows.
const OUT_SIZE_BUDGET_BYTES = 0.9 * 1024 ** 3;

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

// Two exported paths that differ only in case are two files on Linux and ONE
// file on a case-insensitive filesystem. The Android export is produced on
// ubuntu-latest; the iOS export is produced on a macOS runner, where the volume
// is case-insensitive by default. So a collision that is invisible on Android
// silently drops a page from the iOS bundle, and the failure surfaces to a
// reader as a route that 404s inside the app.
//
// Cheaper to assert than to debug from a crash report, and it runs on both
// platforms so Android catches the collision before iOS ever ships it.
function guardExportAgainstCaseCollisions(dir) {
  const seen = new Map(); // lowercased path -> first real path
  const collisions = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      const rel = path.relative(dir, full);
      const key = rel.toLowerCase();
      const prior = seen.get(key);
      if (prior && prior !== rel) collisions.push([prior, rel]);
      else seen.set(key, rel);
      if (e.isDirectory()) walk(full);
    }
  };
  if (!fs.existsSync(dir)) return;
  walk(dir);
  if (collisions.length > 0) {
    console.error(
      `✗ ${collisions.length} exported path(s) differ only in case, which collide on a\n` +
        "  case-insensitive filesystem (the macOS runner that builds the IPA):\n" +
        collisions
          .slice(0, 20)
          .map(([a, b]) => `    ${a}\n    ${b}`)
          .join("\n"),
    );
    process.exit(1);
  }
  console.log("• case-collision guard: no exported paths collide");
}

// Start from a clean export. `next build` writes into out/ but does not delete
// stale files from routes that no longer exist, so out/ silently accumulates
// months of removed content across builds and ships it in the APK. Wipe it so
// only the current content set is bundled.
fs.rmSync(path.join(ROOT, "out"), { recursive: true, force: true });

try {
  stashAll();
  run("next build", { BUILD_TARGET: PLATFORM });
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
pruneSegmentCache(path.join(ROOT, "out"));

// Last: nothing after this may write into out/.
guardExportAgainstI18nLeaks(path.join(ROOT, "out"));
guardExportAgainstCaseCollisions(path.join(ROOT, "out"));

console.log(`\n✓ ${LABEL} local bundle ready: out/ (UI) + out/content/ (data)`);
