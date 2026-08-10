#!/usr/bin/env node
// Find text that disappears when the reader turns on light mode.
//
// WHY THIS EXISTS
//
// The palette works by re-mapping the @theme colour variables under
// html[data-reading-mode="parchment"] (app/globals.css). Every utility class
// built on those tokens re-themes for free: `text-paper` is white on the dark
// ground and near-black ink on the light one, because --color-paper flips.
//
// Anything that hardcodes a light colour does NOT flip. `text-white`,
// `rgba(255,255,255,...)`, `#fff` and friends stay white, and white on
// #f1e8d4 parchment is invisible. app/globals.css:1224-1225 already records
// this hazard and re-inks .lic-notes by hand for exactly this reason.
//
// This script REPORTS. It does not fix anything. Light mode shipped without a
// full contrast sweep as a deliberate scope decision, so this is how the size
// of the remaining work gets measured rather than guessed.
//
// Usage:
//   node scripts/audit-light-contrast.mjs
//   node scripts/audit-light-contrast.mjs --json
//   node scripts/audit-light-contrast.mjs components/today
//
// Exit code is always 0. This is a report, not a gate. Make it a gate once the
// count reaches zero and you want it to stay there.

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const roots = args.filter((a) => !a.startsWith("--"));
const DIRS = roots.length > 0 ? roots : ["app", "components"];

/** Hardcoded light values that will not flip with the palette. */
const PATTERNS = [
  { id: "text-white", re: /\btext-white\b(?!\/)/g, note: "opaque white text" },
  { id: "text-white-alpha", re: /\btext-white\/\d+\b/g, note: "translucent white text" },
  { id: "rgba-white", re: /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/g, note: "white rgba()" },
  { id: "hex-white", re: /#(?:fff|ffffff)\b/gi, note: "white hex" },
  { id: "border-white", re: /\bborder-white(?:\/\d+)?\b/g, note: "white border" },
  { id: "bg-white", re: /\bbg-white(?:\/\d+)?\b/g, note: "white fill" },
];

/**
 * Lines that are fine as they are.
 *
 * A value inside a data-reading-mode block is the override doing its job. A
 * value on a surface that is dark in every palette (an icon on a photograph, a
 * deliberately black hero) is also fine, but this script cannot tell, so those
 * are reported and triaged by eye.
 */
function isExempt(line) {
  return (
    line.includes("data-reading-mode") ||
    line.includes("impeccable-disable") ||
    /^\s*(\/\/|\*|\/\*)/.test(line)
  );
}

const SKIP_DIRS = new Set(["node_modules", ".next", "out", "__tests__"]);

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(p, out);
    } else if (/\.(tsx|ts|css)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

const files = [];
for (const d of DIRS) walk(d, files);

const hits = [];
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (isExempt(line)) return;
    for (const p of PATTERNS) {
      p.re.lastIndex = 0;
      const found = line.match(p.re);
      if (found) {
        hits.push({
          file: file.replace(/\\/g, "/"),
          line: i + 1,
          pattern: p.id,
          note: p.note,
          text: line.trim().slice(0, 120),
          count: found.length,
        });
      }
    }
  });
}

if (asJson) {
  console.log(JSON.stringify({ files: files.length, hits }, null, 2));
  process.exit(0);
}

// Group by top two path segments, which is close enough to "by surface".
const byArea = new Map();
for (const h of hits) {
  const area = h.file.split("/").slice(0, 2).join("/");
  if (!byArea.has(area)) byArea.set(area, []);
  byArea.get(area).push(h);
}

const areas = [...byArea.entries()].sort((a, b) => b[1].length - a[1].length);

console.log(`Scanned ${files.length} files in ${DIRS.join(", ")}.\n`);

for (const [area, list] of areas) {
  console.log(`${area}  (${list.length})`);
  for (const h of list.slice(0, 12)) {
    console.log(`   ${h.file}:${h.line}  ${h.note}`);
    console.log(`      ${h.text}`);
  }
  if (list.length > 12) console.log(`   ... and ${list.length - 12} more`);
  console.log("");
}

const byPattern = new Map();
for (const h of hits) byPattern.set(h.pattern, (byPattern.get(h.pattern) ?? 0) + 1);

console.log("By pattern:");
for (const [id, n] of [...byPattern.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(4)}  ${id}`);
}

console.log(
  `\n${hits.length} hardcoded light value(s) that will not flip with the palette.\n` +
    "Each is a candidate for vanishing on the light ground. Not all are defects:\n" +
    "a value on a surface that stays dark in every palette is fine. Triage by\n" +
    "opening the surface in light mode rather than by reading this list alone.",
);

process.exit(0);
