// Writes lib/saints/nameIndex.generated.ts: every form of a saint's name that
// opens the saint's card in a text (1.8), from the registry and
// lib/saints/nameForms.ts. The readers carry only this table, never the
// registry. lib/saints/__tests__/nameLinks.test.ts fails when it is stale.
//
//   node scripts/saint-names.mjs
import fs from "node:fs";
import path from "node:path";
import { SAINTS } from "../lib/saints/saints.ts";
import { nameTable } from "../lib/saints/nameForms.ts";

const rows = nameTable(SAINTS);
const out = path.join(process.cwd(), "lib", "saints", "nameIndex.generated.ts");
fs.writeFileSync(
  out,
  "// Written by scripts/saint-names.mjs from lib/saints/saints.ts and\n" +
    "// lib/saints/nameForms.ts. Do not edit by hand.\n" +
    "export const SAINT_NAME_FORMS: [string, string][] = [\n" +
    rows.map(([f, s]) => `  [${JSON.stringify(f)}, ${JSON.stringify(s)}],`).join("\n") +
    "\n];\n",
);
console.log(`lib/saints/nameIndex.generated.ts: ${rows.length} forms`);
