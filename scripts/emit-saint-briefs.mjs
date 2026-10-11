// Write data/calendar/profiled-saints.json from the saints registry.
//
//   node --experimental-strip-types scripts/emit-saint-briefs.mjs
//   node --experimental-strip-types scripts/emit-saint-briefs.mjs --check
//
// The calendar reads that file, not lib/saints/saints.ts, so that a screen
// which only needs today's saint does not load every saint's life. See
// lib/saints/brief.ts for why and for the shape of a row.
//
// Run it after any change to a profile's slug, name, epithet, feast days,
// icon, short life or life. --check writes nothing and exits 1 when the file
// is behind the registry, which is how the native build uses it.
//
// saints.ts and brief.ts are loadable as they stand: neither imports anything
// at run time, so this needs no "@/" resolver (scripts/lib/alias-hooks.mjs).

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "calendar", "profiled-saints.json");
const CHECK = process.argv.includes("--check");

const { SAINTS } = await import("../lib/saints/saints.ts");
const { briefOf } = await import("../lib/saints/brief.ts");

const rows = SAINTS.map(briefOf);

const slugs = new Set();
for (const row of rows) {
  if (slugs.has(row.slug)) {
    console.error(`[saint-briefs] two profiles share the slug "${row.slug}".`);
    process.exit(1);
  }
  slugs.add(row.slug);
}

// One row to a line, so a changed profile is a one-line diff.
const text = "[\n" + rows.map((row) => "  " + JSON.stringify(row)).join(",\n") + "\n]\n";

let onDisk = null;
try {
  onDisk = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch {
  // Missing or unreadable: behind, by definition.
}
// Compared as data, not as text: a checkout may change the line endings.
const fresh = JSON.stringify(onDisk) === JSON.stringify(rows);

if (CHECK) {
  if (!fresh) {
    console.error(
      "[saint-briefs] data/calendar/profiled-saints.json is behind lib/saints/saints.ts.\n" +
        "  Run: node --experimental-strip-types scripts/emit-saint-briefs.mjs",
    );
    process.exit(1);
  }
  console.log(`[saint-briefs] ${rows.length} profiles, the file matches the registry.`);
} else if (fresh) {
  console.log(`[saint-briefs] ${rows.length} profiles, nothing to write.`);
} else {
  fs.writeFileSync(FILE, text);
  console.log(
    `[saint-briefs] wrote ${rows.length} profiles, ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB.`,
  );
}
