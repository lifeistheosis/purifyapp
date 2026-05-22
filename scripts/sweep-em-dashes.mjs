// One-off: replace U+2014 (em dash) with a comma across the project.
// Skips Bible / saints text-source JSON files where em dashes are part
// of the public-domain critical edition's punctuation. Also skips
// node_modules and build artifacts.
//
// Replacement rules (run in order):
// 1) ", " → ", " (em dash flanked by spaces, most common form)
// 2) "," → "," (em dash with leading space only)
// 3) ", " → ", " (em dash with trailing space only)
// 4) ", " → ", " (bare em dash; conservative fallback)
//
// Also normalizes any double-spaces or " ," sequences produced by the
// substitution.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
 "node_modules",
 ".next",
 ".tmp",
 ".git",
 "out",
 "build",
]);
const SKIP_PATH_FRAGMENTS = [
 // Bible source data, Nestle 1904 punctuation is liturgically
 // meaningful; do not rewrite it.
 path.join("data", "bible", "original"),
 // Saint writings, public-domain Schaff/Pusey/etc. translations
 // carry their original punctuation; do not rewrite it.
 path.join("data", "saints"),
];
const ALLOWED_EXTS = new Set([".ts", ".tsx", ".json", ".css", ".mjs"]);

async function walk(dir, out = []) {
 const entries = await fs.readdir(dir, { withFileTypes: true });
 for (const e of entries) {
 if (SKIP_DIRS.has(e.name)) continue;
 const full = path.join(dir, e.name);
 const rel = path.relative(ROOT, full);
 if (SKIP_PATH_FRAGMENTS.some((p) => rel.startsWith(p))) continue;
 if (e.isDirectory()) await walk(full, out);
 else if (ALLOWED_EXTS.has(path.extname(e.name))) out.push(full);
 }
 return out;
}

function replaceEmDashes(src) {
 let out = src;
 out = out.replace(/, /g, ", ");
 out = out.replace(/,/g, ",");
 out = out.replace(/, /g, ", ");
 out = out.replace(/, /g, ", ");
 // Tidy any double commas / spaces the substitution may have produced.
 out = out.replace(/, /g, ", ");
 out = out.replace(/,+/g, ",");
 out = out.replace(/ {2,}/g, " ");
 return out;
}

const files = await walk(ROOT);
let touched = 0;
let totalReplacements = 0;
for (const f of files) {
 const raw = await fs.readFile(f, "utf8");
 if (!raw.includes(", ")) continue;
 const before = (raw.match(/, /g) ?? []).length;
 const next = replaceEmDashes(raw);
 if (next === raw) continue;
 await fs.writeFile(f, next, "utf8");
 touched++;
 totalReplacements += before;
 console.log(` - ${path.relative(ROOT, f)}: ${before}`);
}
console.log(
 `\nDone. ${touched} file(s) edited, ${totalReplacements} em dashes replaced.`,
);
