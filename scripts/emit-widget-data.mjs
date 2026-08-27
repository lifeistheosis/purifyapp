// Emit the day table a home screen widget reads.
//
// Runs BEFORE the Next build so the file lands in public/ and is copied
// verbatim into the static export, which is what makes it readable offline
// inside the native bundle. The app fetches it once and hands it to the
// widget bridge; the widget itself never touches the network.
//
// Why prebaked at all: the commemoration and the fast are computed in
// lib/calendar/orthodox.ts, which a Swift or Kotlin widget cannot run. The
// alternative is porting the paschalion twice and letting three copies drift.
// See lib/widget/dayTable.ts for the full reasoning, and
// components/today/VerseOfDayCard.tsx for the precedent: it prebakes 400 days
// of verses for the same class of reason.
//
// Usage:
//   node --experimental-strip-types scripts/emit-widget-data.mjs [--days 400]

import fs from "node:fs";
import path from "node:path";

import { buildDayTable } from "../lib/widget/dayTable.ts";

const args = process.argv.slice(2);
const i = args.indexOf("--days");
// 400 matches VerseOfDayCard's window. A widget that outlives its table shows
// nothing, and a year of margin means a reader who never updates the app still
// gets a correct saint for longer than a release cycle.
const DAYS = i >= 0 ? Number(args[i + 1]) : 400;

// Start yesterday, not today. A device west of UTC can be on the previous
// civil day when the build machine is already on the next one, and a widget
// with no entry for the reader's actual day is the one bug nobody would see
// in testing.
const start = new Date();
start.setUTCDate(start.getUTCDate() - 1);

const table = buildDayTable(start, DAYS);
const dest = path.join(process.cwd(), "public", "widget-day-table.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(table), "utf8");

const bytes = fs.statSync(dest).size;
console.log(
  `• widget day table: ${Object.keys(table.days).length} days from ${table.from}, ` +
    `${(bytes / 1024).toFixed(1)} KB -> public/widget-day-table.json`,
);
