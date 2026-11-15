// Gate 5 (from Updates 97's sum97.mjs): each motion walk's line from its JSON: controls reached and tapped per name,
// errors, and every finding (kind, screen, what).
//   node sum5.mjs [dir] [prefix...]
import fs from "node:fs";
import zlib from "node:zlib";
const [dir = "docs/handoffs/gate-5-walks", ...prefixes] = process.argv.slice(2);
const WANT = ["Read it in Purify", "See all", "Matthew 28:19-20", "Try again", "1782 Philokalia", "New Martyrs", "Hesychast councils", "Context for verse 1", "Context for verse 5"];
for (const f of fs.readdirSync(dir).filter((x) => /^(on|onr|off|offr)-(open|new)\.json\.gz$/.test(x) && (!prefixes.length || prefixes.some((p) => x.startsWith(p)))).sort()) {
  const j = JSON.parse(zlib.gunzipSync(fs.readFileSync(`${dir}/${f}`)));
  const per = {};
  for (const r of j.results) for (const c of (r.controls ?? []).filter((c) => c.verdict !== "skipped")) for (const w of WANT) if ((c.name ?? "").includes(w)) (per[w] ??= new Set()).add(r.at);
  const tapped = Object.entries(per).map(([w, s]) => `${w}: ${s.size} screen${s.size === 1 ? "" : "s"}`).join("; ");
  console.log(`${f}: ${j.reader}, ${j.mode}; screens ${j.screens}, tapped ${j.tapped}, errors ${j.errors.length}, control errors ${j.controlErrors.length}, findings ${j.findings.length}, unsure ${j.unsure?.length ?? "?"}`);
  console.log(`  named, by screen: ${tapped || "none"}`);
  for (const e of [...j.errors, ...j.controlErrors].slice(0, 6)) console.log(`  ! ${JSON.stringify(e).slice(0, 220)}`);
  for (const x of j.findings) console.log(`  - ${x.check ?? ""} ${(x.screens ?? []).join(" ")} | ${(x.what ?? "").slice(0, 240)}`);
  for (const x of j.unsure ?? []) console.log(`  ? ${(x.screens ?? []).join(" ")} | ${(x.what ?? JSON.stringify(x)).slice(0, 200)}`);
}
