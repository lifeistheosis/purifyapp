// Content-package integrity gate (build-time). Recomputes the SHA-256 over the
// package's canonical records and compares it to the stored manifest checksum,
// and checks per-type counts — catching truncation/corruption of the generated
// file. (The app's own verifier, lib/content/manifest.ts, is exercised against
// this output by lib/content/__tests__/realPackage.test.ts, which guards
// packager-vs-verifier drift.)
//
// Run via: node scripts/verify-package.mjs [path]

import fs from "node:fs";
import crypto from "node:crypto";

const path = process.argv[2] ?? "out/content/content-package.json";
if (!fs.existsSync(path)) {
  console.error(`✗ no content package at ${path}`);
  process.exit(1);
}

// Must match lib/content/manifest.ts canonicalRecords + scripts/build-content-package.mjs.
function canonicalRecords(recs) {
  const sorted = [...recs].sort((a, b) =>
    a.type === b.type
      ? a.ref_id < b.ref_id ? -1 : a.ref_id > b.ref_id ? 1 : 0
      : a.type < b.type ? -1 : 1,
  );
  return JSON.stringify(sorted.map((r) => [r.type, r.ref_id, r.title, r.key ?? "", r.json]));
}

const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
const { manifest, records } = pkg;

const fail = (msg) => {
  console.error(`✗ content package integrity FAILED: ${msg}`);
  process.exit(1);
};

if (records.length !== manifest.recordCount)
  fail(`records ${records.length} != manifest ${manifest.recordCount}`);

const counts = {};
for (const r of records) counts[r.type] = (counts[r.type] ?? 0) + 1;
for (const it of manifest.items)
  if (counts[it.type] !== it.count)
    fail(`count for ${it.type}: ${counts[it.type] ?? 0} != ${it.count}`);

const sha = crypto.createHash("sha256").update(canonicalRecords(records)).digest("hex");
if (sha !== manifest.sha256) fail("checksum mismatch");

console.log(
  `✓ content package integrity OK: ${manifest.recordCount} records, ` +
    `version ${manifest.contentVersion}, schema ${manifest.schemaVersion}`,
);
