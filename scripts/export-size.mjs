// Weighs a native export: on disk and packed, the whole of it and _next
// alone. scripts/native-build.mjs runs it last with --guard, and it can be
// run on any export by hand:
//
//   node --experimental-strip-types scripts/export-size.mjs [out dir]
//        [--guard] [--top 12] [--no-pack] [--json]
//
// --guard   exit 1 when the export is over a ceiling (lib/build/exportSize.ts,
//           EXPORT_LIMITS). No ceiling is set today, so nothing stops.
// --top N   list the N heaviest top-level folders (12 by hand, none in a build)
// --no-pack skip the compression: quick, and the packed figures read 0
// --json    print the measure as JSON and nothing else
//
// Every run also leaves the measure in .release-logs/export-size.json, which
// is not committed: the written record of a release's weight is the table in
// docs/build/app-size.md.
import fs from "node:fs";
import path from "node:path";

import { EXPORT_LIMITS, judgeSize, measureExport, sizeLines } from "../lib/build/exportSize.ts";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => (flag(name) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const named = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--top");
const dir = path.resolve(named ?? "out");

if (!fs.existsSync(path.join(dir, "index.html"))) {
  console.error(`✗ no export at ${dir}: run npm run build:android or build:ios first`);
  process.exit(2);
}

const size = measureExport(dir, { pack: !flag("no-pack") });
const verdict = judgeSize(size, EXPORT_LIMITS);

const record = {
  measuredAt: new Date().toISOString(),
  platform: process.env.BUILD_TARGET ?? null,
  packed: !flag("no-pack"),
  total: size.total,
  next: size.next,
  folders: size.folders.slice(0, 20),
};
const logs = path.resolve(".release-logs");
fs.mkdirSync(logs, { recursive: true });
fs.writeFileSync(path.join(logs, "export-size.json"), `${JSON.stringify(record, null, 2)}\n`);

if (flag("json")) {
  console.log(JSON.stringify(record, null, 2));
} else {
  const top = Number(value("top", flag("guard") ? 0 : 12));
  for (const line of sizeLines(size, EXPORT_LIMITS, top)) console.log(line);
  for (const line of verdict.warn) console.warn(`⚠ ${line}`);
  for (const line of verdict.stop) console.error(`✗ ${line}`);
}

if (flag("guard") && verdict.stop.length > 0) process.exit(1);
