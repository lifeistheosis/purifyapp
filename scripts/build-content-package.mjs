// Build-time content packager for the local-first Android app.
//
// Reads the file-based content under data/** and emits a versioned content
// package (content-package.json + manifest.json) that the app imports into its
// local SQLite store on first run / update (see lib/content/manifest.ts).
//
// Plain Node (no TS, no deps): the checksum + record canonicalization match
// lib/content/manifest.ts exactly, and lib/content/__tests__/contentPackage
// re-verifies this script's output with the app's own verifier — so any drift
// fails CI.
//
// Scope (Milestone 1): file-based content only — Bible (public-domain Brenton
// LXX + KJV), prayers, theology, apologetics, councils, and saints' writings.
// Registry-defined content (saint profiles, topics, council metadata, full
// feast tables) lives in TypeScript modules and is packaged in the M2 export
// build, which runs in the TS context. api-bible licensed translations are
// deliberately excluded (network-only).
//
// Usage:
//   node scripts/build-content-package.mjs [--out DIR] [--full] [--version V]
//   --full   include every Bible book (default: a bounded starter set)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const args = process.argv.slice(2);
const argVal = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const OUT = path.join(ROOT, argVal("--out", ".content-build"));
const FULL = args.includes("--full");
const VERSION =
  argVal("--version", null) ??
  new Date().toISOString().slice(0, 10).replace(/-/g, ".") + "-1";

// Public-domain starter Bible set (bounded so the bundled APK stays small; the
// rest is an optional download). Slugs match data/bible/<slug>/.
const STARTER_BOOKS = [
  "genesis", "psalms", "proverbs", "isaiah",
  "matthew", "mark", "luke", "john", "acts", "romans", "james", "1-john", "revelation",
];

const records = [];
const add = (type, ref_id, title, key, obj, search) =>
  records.push({ type, ref_id, title, key: key ?? null, json: JSON.stringify(obj), search });

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const listJson = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.includes(".de."))
    : [];

// Flatten every string value in a record for the search body.
function flattenStrings(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) flattenStrings(x, out);
  else if (v && typeof v === "object") for (const x of Object.values(v)) flattenStrings(x, out);
  return out;
}
const slugOf = (f) => f.replace(/\.json$/, "");

// --- Bible (public-domain English chapters) ------------------------------
function collectBible() {
  const bibleDir = path.join(DATA, "bible");
  if (!fs.existsSync(bibleDir)) return;
  const skip = new Set([
    "original", "commentary", "cross-refs", "english-tagged", "intros", "books.json",
  ]);
  const books = fs
    .readdirSync(bibleDir)
    .filter((b) => !skip.has(b) && fs.statSync(path.join(bibleDir, b)).isDirectory())
    .filter((b) => FULL || STARTER_BOOKS.includes(b));
  for (const book of books) {
    for (const f of listJson(path.join(bibleDir, book))) {
      const ch = readJson(path.join(bibleDir, book, f));
      if (!ch?.verses) continue;
      const body = ch.verses.map((v) => v.text).join(" ");
      add("bible_chapter", `${book}/${ch.chapter}`, `${ch.name} ${ch.chapter}`, book, ch, body);
    }
  }
}

// --- Prayers (rules, hours, akathists) -----------------------------------
function collectPrayers() {
  for (const sub of ["rules", "hours", "akathists"]) {
    const dir = path.join(DATA, "prayers", sub);
    for (const f of listJson(dir)) {
      const j = readJson(path.join(dir, f));
      const id = j.id ?? slugOf(f);
      add("prayer", id, j.title ?? id, j.kind ?? j.category ?? null, j, flattenStrings(j).join(" "));
    }
  }
}

// --- Flat-file content types (theology, apologetics) ---------------------
function collectFlat(type, dir) {
  for (const f of listJson(path.join(DATA, dir))) {
    if (f === "licensed-works.json") continue;
    const j = readJson(path.join(DATA, dir, f));
    const slug = slugOf(f);
    add(type, slug, j.title ?? slug, null, j, flattenStrings(j).join(" "));
  }
}

// --- Councils (documents nested under data/councils/<slug>/**) -----------
function collectCouncils() {
  const dir = path.join(DATA, "councils");
  if (!fs.existsSync(dir)) return;
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d)) {
      const full = path.join(d, e);
      const r = rel ? `${rel}/${e}` : e;
      if (fs.statSync(full).isDirectory()) walk(full, r);
      else if (e.endsWith(".json") && !e.includes(".de.")) {
        const j = readJson(full);
        add("council", slugOf(r), j.title ?? slugOf(r), null, j, flattenStrings(j).join(" "));
      }
    }
  };
  walk(dir, "");
}

// --- Saints' writings (data/saints/<slug>/<work>.json) -------------------
function collectSaintWritings() {
  const dir = path.join(DATA, "saints");
  if (!fs.existsSync(dir)) return;
  for (const slug of fs.readdirSync(dir)) {
    const sdir = path.join(dir, slug);
    if (!fs.statSync(sdir).isDirectory()) continue; // skips top-level licensed-works.json
    for (const f of listJson(sdir)) {
      if (f === "licensed-works.json") continue;
      const j = readJson(path.join(sdir, f));
      const work = slugOf(f);
      add("saint_writing", `${slug}/${work}`, j.title ?? work, slug, j, flattenStrings(j).join(" "));
    }
  }
}

// --- Saint profiles + feast index (from emit-registries.mjs) -------------
function collectSaints() {
  const f = path.join(DATA, "_generated", "saints.json");
  if (!fs.existsSync(f)) return;
  for (const s of readJson(f)) {
    const body = flattenStrings({
      name: s.name, byname: s.byname, epithet: s.epithet,
      shortBio: s.shortBio, life: s.life,
    }).join(" ");
    add("saint", s.slug, s.name, null, s, body);
  }
}
function collectFeasts() {
  const f = path.join(DATA, "_generated", "feasts.json");
  if (!fs.existsSync(f)) return;
  for (const fe of readJson(f)) {
    add("feast", fe.ref_id, fe.name, fe.date, fe, `${fe.name} ${fe.raw}`);
  }
}

// Canonical records string — MUST match lib/content/manifest.ts canonicalRecords.
function canonicalRecords(recs) {
  const sorted = [...recs].sort((a, b) =>
    a.type === b.type
      ? a.ref_id < b.ref_id ? -1 : a.ref_id > b.ref_id ? 1 : 0
      : a.type < b.type ? -1 : 1,
  );
  return JSON.stringify(sorted.map((r) => [r.type, r.ref_id, r.title, r.key ?? "", r.json]));
}

function main() {
  collectBible();
  collectPrayers();
  collectFlat("theology", "theology");
  collectFlat("apologetics", "apologetics");
  collectCouncils();
  collectSaintWritings();
  collectSaints();
  collectFeasts();

  const counts = {};
  for (const r of records) counts[r.type] = (counts[r.type] ?? 0) + 1;

  const sha256 = crypto.createHash("sha256").update(canonicalRecords(records)).digest("hex");
  const manifest = {
    contentVersion: VERSION,
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    items: Object.entries(counts).map(([type, count]) => ({ type, count })),
    recordCount: records.length,
    sha256,
  };

  fs.mkdirSync(OUT, { recursive: true });
  const pkg = { manifest, records };
  fs.writeFileSync(path.join(OUT, "content-package.json"), JSON.stringify(pkg));
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  const bytes = fs.statSync(path.join(OUT, "content-package.json")).size;

  console.log(`Content package ${VERSION} (${FULL ? "full" : "starter"})`);
  for (const it of manifest.items) console.log(`  ${it.type}: ${it.count}`);
  console.log(`  total: ${records.length} records, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  sha256: ${sha256.slice(0, 16)}…`);
  console.log(`  → ${path.relative(ROOT, OUT)}/`);
}

main();
