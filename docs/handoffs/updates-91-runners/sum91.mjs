// Updates 91: one line per walk, then every finding in words.  node sum91.mjs <json dir>
import fs from "node:fs";
const dir = process.argv[2];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  const reached = j.results.flatMap((r) => r.controls ?? []).length;
  console.log(`${f}: ${j.mode}, ${j.reader}, screens ${j.screens}, tapped ${j.tapped}, reached ${reached}, findings ${j.findings.length}, unsure ${j.unsure.length}, errors ${j.errors.length}, control errors ${j.controlErrors.length}`);
  for (const x of j.findings) console.log(`   - ${String(x.what ?? JSON.stringify(x)).slice(0, 260)}`);
}
