#!/usr/bin/env node
// Merge core-chrome translations into a locale catalog, adding ONLY keys
// the catalog does not already have (human work is never overwritten).
// Usage: node scripts/i18n/merge-core.mjs <locale> <translations.json>
import fs from "node:fs";

const [locale, file] = process.argv.slice(2);
const catPath = `lib/i18n/messages/${locale}.json`;
const cat = JSON.parse(fs.readFileSync(catPath, "utf8"));
const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8"));
const add = JSON.parse(fs.readFileSync(file, "utf8"));
let added = 0, skippedExisting = 0, badKey = 0;
const PLURAL_SUFFIX = /.(zero|one|two|few|many|other|singular|plural)$/;
function inEn(k) {
  if (k in en) return true;
  // A locale may carry CLDR categories en does not need (ru .few/.many):
  // valid when the base exists in en under some plural suffix.
  const mm = k.match(PLURAL_SUFFIX);
  if (!mm) return false;
  const base = k.slice(0, -mm[0].length);
  return ["zero", "one", "two", "few", "many", "other", "singular", "plural"].some(
    (s) => base + "." + s in en,
  );
}
for (const [k, v] of Object.entries(add)) {
  if (!inEn(k)) { badKey++; console.log("  NOT IN EN:", k); continue; }
  if (k in cat) { skippedExisting++; continue; }
  cat[k] = v;
  added++;
}
fs.writeFileSync(catPath, JSON.stringify(cat, null, 2) + "\n");
console.log(`${locale}: +${added} added, ${skippedExisting} kept existing, ${badKey} bad`);
