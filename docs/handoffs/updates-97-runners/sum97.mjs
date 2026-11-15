// Updates 97 (from Updates 95's sum95.mjs): each walk's line from its JSON: controls reached, errors, and every finding (kind, screen, what).
import fs from "node:fs";
import zlib from "node:zlib";
const dir = process.argv[2] ?? "docs/handoffs/updates-97-runners";
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json.gz")).sort()) {
  const j = JSON.parse(zlib.gunzipSync(fs.readFileSync(`${dir}/${f}`)));
  const named = j.results.flatMap((r) => (r.controls ?? []).map((c) => c.name));
  console.log(`${f}: ${j.reader}, ${j.mode}; screens ${j.screens}, tapped ${j.tapped}, errors ${j.errors.length}, control errors ${j.controlErrors.length}, findings ${j.findings.length}, unsure ${j.unsure.length}`);
  for (const want of ["Matthew 28:19-20"]) if (!named.some((n) => n.includes(want))) console.log(`  NOT REACHED: ${want}`);
  for (const x of j.findings) console.log(`  - ${x.kind ?? ""} ${(x.screens ?? []).join(" ")} | ${(x.what ?? "").slice(0, 220)}`);
}
