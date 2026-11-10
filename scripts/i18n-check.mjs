#!/usr/bin/env node
// i18n hygiene + coverage + hardcoded-string scan (Beta 2.3).
//
// Usage:
//   node scripts/i18n-check.mjs             hygiene + coverage report
//   node scripts/i18n-check.mjs --json      machine-readable output
//   node scripts/i18n-check.mjs --scan      also scan converted dirs for
//                                           hardcoded JSX strings
//
// Exit codes: 1 on hygiene failures (duplicate keys, malformed or
// mismatched placeholders, em dashes, orphaned keys); coverage gaps are
// reported but do not fail (missing keys fall back to English by
// design). The hardcode scan fails only for directories listed in
// CONVERTED_DIRS, the ratchet that keeps finished surfaces clean.

import fs from "node:fs";
import path from "node:path";

import { CONVERTED_DIRS, scanDirs } from "./i18n/scan.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const MESSAGES_DIR = path.join(ROOT, "lib", "i18n", "messages");

// The directories whose UI strings have been fully extracted (the ratchet),
// with the reading of a file: scripts/i18n/scan.mjs.

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const doScan = args.has("--scan");
// --dirs a,b,c : scan these directories instead of CONVERTED_DIRS and
// report hits without failing (triage mode for unconverted surfaces).
const argv = process.argv.slice(2);
const dirsIdx = argv.indexOf("--dirs");
const triageDirs = dirsIdx >= 0 && argv[dirsIdx + 1] ? argv[dirsIdx + 1].split(",") : null;

const failures = [];
const warnings = [];

// ---------- 1. Catalog hygiene ----------

function rawKeyList(rawText) {
  // JSON.parse silently dedupes; detect duplicates from the raw text.
  const keys = [];
  const re = /^\s*"((?:[^"\\]|\\.)*)"\s*:/gm;
  let m;
  while ((m = re.exec(rawText))) keys.push(m[1]);
  return keys;
}

function placeholders(value) {
  return new Set([...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]));
}

const catalogFiles = fs
  .readdirSync(MESSAGES_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

const catalogs = new Map();
for (const file of catalogFiles) {
  const p = path.join(MESSAGES_DIR, file);
  const raw = fs.readFileSync(p, "utf8");
  const keys = rawKeyList(raw);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (dupes.length > 0) {
    failures.push(`${file}: duplicate keys: ${[...new Set(dupes)].join(", ")}`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    failures.push(`${file}: invalid JSON (${e.message})`);
    continue;
  }
  for (const [k, v] of Object.entries(data)) {
    if (typeof v !== "string") {
      failures.push(`${file}: ${k} is not a string`);
      continue;
    }
    if (v.includes("—")) {
      failures.push(`${file}: ${k} contains an em dash (editorial rule: never in user-facing copy)`);
    }
    // Unbalanced or nested braces mean a broken placeholder.
    const stripped = v.replace(/\{[a-zA-Z0-9_]+\}/g, "");
    if (stripped.includes("{") || stripped.includes("}")) {
      failures.push(`${file}: ${k} has a malformed placeholder: ${JSON.stringify(v)}`);
    }
  }
  catalogs.set(path.basename(file, ".json"), data);
}

// ---------- 2. Coverage vs en ----------

const en = catalogs.get("en") ?? {};
const enKeys = new Set(Object.keys(en));
const coverage = [];
for (const [code, data] of catalogs) {
  if (code === "en") continue;
  const keys = Object.keys(data);
  const present = keys.filter((k) => enKeys.has(k));
  const PLURAL_SUFFIX = /.(zero|one|two|few|many|other|singular|plural)$/;
  const pluralSibling = (k) => {
    const mm = k.match(PLURAL_SUFFIX);
    if (!mm) return false;
    const base = k.slice(0, -mm[0].length);
    return ["zero", "one", "two", "few", "many", "other", "singular", "plural"].some(
      (s) => enKeys.has(base + "." + s),
    );
  };
  const orphaned = keys.filter((k) => !enKeys.has(k) && !pluralSibling(k));
  const missing = [...enKeys].filter((k) => !(k in data));
  for (const k of orphaned) {
    failures.push(`${code}.json: orphaned key not in en.json: ${k}`);
  }
  for (const k of present) {
    const want = placeholders(en[k]);
    const got = placeholders(data[k]);
    // Plural-category values may idiomatically omit {count} (Arabic
    // "one day" carries the number in the word); extra placeholders
    // are still an error.
    const same = PLURAL_SUFFIX.test(k)
      ? [...got].every((t) => want.has(t))
      : want.size === got.size && [...want].every((t) => got.has(t));
    if (!same) {
      failures.push(
        `${code}.json: ${k} placeholder mismatch (en: {${[...want].join(",")}} vs {${[...got].join(",")}})`,
      );
    }
  }
  coverage.push({
    locale: code,
    keys: keys.length,
    ofEn: enKeys.size,
    pct: enKeys.size === 0 ? 0 : Math.round((present.length / enKeys.size) * 1000) / 10,
    missing: missing.length,
  });
}
coverage.sort((a, b) => b.pct - a.pct);

// ---------- 3. Hardcoded-string scan (ratchet) ----------

// Heuristics, not a parser: flag JSX text nodes with letters in them and
// user-facing string props. The allowlist file silences intentional
// literals (brand names, citations, punctuation-only nodes).
const scanResults = [];
if (doScan || triageDirs) {
  for (const { file: rel, hits } of scanDirs(ROOT, triageDirs ?? CONVERTED_DIRS)) {
    scanResults.push({ file: rel, hits });
    if (triageDirs) {
      console.log(`${rel} (${hits.length}):`);
      for (const h of hits.slice(0, 12)) console.log(`   L${h.line} ${h.text}`);
    } else {
      failures.push(
        `${rel}: ${hits.length} hardcoded string(s) in a converted directory (first: line ${hits[0].line} "${hits[0].text}")`,
      );
    }
  }
}

// ---------- Output ----------

if (asJson) {
  console.log(JSON.stringify({ failures, warnings, coverage, scanResults }, null, 2));
} else {
  console.log(`Catalogs: ${catalogFiles.length}, en keys: ${enKeys.size}\n`);
  console.log("Coverage vs en.json:");
  for (const c of coverage) {
    const bar = "#".repeat(Math.round(c.pct / 5)).padEnd(20, ".");
    console.log(`  ${c.locale.padEnd(4)} ${bar} ${String(c.pct).padStart(5)}%  (${c.keys}/${c.ofEn}, ${c.missing} missing)`);
  }
  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
  if (failures.length > 0) {
    console.log(`\nFAILURES (${failures.length}):`);
    for (const f of failures) console.log(`  - ${f}`);
  } else {
    console.log("\nHygiene: clean.");
  }
}

process.exit(failures.length > 0 ? 1 : 0);
