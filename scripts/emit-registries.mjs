// Emit TypeScript content registries to JSON for the content packager.
//
// Saint profiles live in lib/saints/saints.ts as an inline `SAINTS` array (not
// data files), so the plain-Node packager can't read them. This script runs
// with Node's type-stripping (`node --experimental-strip-types`), imports the
// registry directly, and writes data/_generated/{saints,feasts}.json — which
// build-content-package.mjs then bundles. saints.ts is self-contained (no
// imports, no enums), so type-stripping loads it cleanly.
//
// Run via: node --experimental-strip-types scripts/emit-registries.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "data", "_generated");
mkdirSync(OUT, { recursive: true });

const { SAINTS } = await import("../lib/saints/saints.ts");

// Normalize a feast day string to "MM-DD" when possible (so the calendar /
// saint-of-the-day lookups can key on it). Accepts "MM-DD", "Month D", "D Month".
const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
};
function toMmDd(s) {
  if (!s || typeof s !== "string") return null;
  const t = s.trim().toLowerCase();
  let m = t.match(/^(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = t.match(/^([a-z]+)\s+(\d{1,2})/); // "November 13"
  if (m && MONTHS[m[1]]) return `${String(MONTHS[m[1]]).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})\s+([a-z]+)/); // "13 November"
  if (m && MONTHS[m[2]]) return `${String(MONTHS[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

const feasts = [];
for (const s of SAINTS) {
  for (const fd of s.feastDays ?? []) {
    const mmdd = toMmDd(fd);
    feasts.push({
      ref_id: `${s.slug}@${fd}`.replace(/\s+/g, "-"),
      date: mmdd,
      raw: fd,
      name: s.name,
      saintSlug: s.slug,
    });
  }
}

writeFileSync(path.join(OUT, "saints.json"), JSON.stringify(SAINTS));
writeFileSync(path.join(OUT, "feasts.json"), JSON.stringify(feasts));

const parsed = feasts.filter((f) => f.date).length;
console.log(
  `Emitted ${SAINTS.length} saints, ${feasts.length} feast entries ` +
    `(${parsed} with parsed MM-DD). Sample feastDays: ` +
    JSON.stringify(SAINTS.slice(0, 3).map((s) => s.feastDays)),
);
