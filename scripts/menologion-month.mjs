// A month of the Church's calendar, line by line: the path that repeats.
//
//   node --experimental-strip-types scripts/menologion-month.mjs plan <month>
//   node --experimental-strip-types scripts/menologion-month.mjs check <month>
//
// `plan` prints every line of the month as the app's calendar has it
// (data/calendar/daily-saints.json), with what the app has for each: a page,
// of the new standard ("entry") or an older one with a life of ours, its
// works, its icon's rights, the History events and councils that name it.
// It is the start of a month's work: the table the plan is written from.
//
// `check` prints what keeps the month from being done (lib/saints/month.ts,
// monthProblems) and exits 1 while anything does. A month marked done in
// DONE_MONTHS is held to the same by lib/saints/__tests__/menologionMonth.test.ts.
//
// The steps between the two are docs/editorial/menologion-month.md. November
// 2026 was the first month done this way (docs/1.9-build/notes/november-saints.md).

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const [cmd, monthArg] = process.argv.slice(2);

const { SAINTS } = await import("../lib/saints/saints.ts");
const { iconRightsFor } = await import("../lib/saints/iconRights.ts");
const { HISTORY_EVENTS } = await import("../lib/history/events.ts");
const { COUNCILS } = await import("../lib/councils/councils.ts");
const { DONE_MONTHS, MONTH_NAMES, monthNumber, monthProblems, monthRows } = await import("../lib/saints/month.ts");

const month = monthArg ? monthNumber(monthArg) : null;
if (!["plan", "check"].includes(cmd) || !month) {
  console.error("usage: node --experimental-strip-types scripts/menologion-month.mjs plan|check <month>");
  process.exit(2);
}
const name = MONTH_NAMES[month - 1];

const calendar = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "calendar", "daily-saints.json"), "utf8"));
const data = {
  calendar,
  saints: SAINTS,
  iconSettled: (src) => Boolean(iconRightsFor(src)),
  sectionsOf: (saint, work) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${work}.json`), "utf8")).sections;
    } catch {
      return null;
    }
  },
  eventsFor: (slug) => HISTORY_EVENTS.filter((e) => e.status === "published" && e.rel?.saints?.includes(slug)).length,
  councilsFor: (slug) => COUNCILS.filter((c) => (c.principalFathers ?? []).some((f) => f.slug === slug)).length,
  held: DONE_MONTHS[name]?.held ?? [],
};

if (cmd === "plan") {
  const rows = monthRows(month, data);
  const saints = rows.filter((r) => !r.feast);
  console.log(`# ${name[0].toUpperCase()}${name.slice(1)}: ${rows.length} lines, ${saints.length} saints' lines, ${rows.length - saints.length} feasts`);
  console.log(
    `${saints.filter((r) => r.page !== "none").length} with a page (${saints.filter((r) => r.page === "entry").length} of the new standard), ` +
      `${saints.filter((r) => r.page === "none").length} with none; ` +
      `${saints.filter((r) => r.icon === "unsettled").length} icons with no rights record.\n`,
  );
  console.log("| Day | Line | Page | Works | Icon | Events | Councils |");
  console.log("|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const page = r.feast ? (r.slug ? `feast, opens ${r.slug}` : "feast") : r.page === "none" ? (r.held ? `held: ${r.held}` : "**none**") : `${r.page} (${r.slug})`;
    console.log(`| ${r.day} | ${r.name} | ${page} | ${r.works || ""} | ${r.icon === "none" ? "" : r.icon} | ${r.events || ""} | ${r.councils || ""} |`);
  }
}

if (cmd === "check") {
  const problems = monthProblems(month, data);
  if (!problems.length) {
    console.log(`${name}: every saint's line has a page, and every new page meets the standard.`);
  } else {
    for (const p of problems) console.log(`${p.day}  ${p.name}${p.slug ? ` (${p.slug})` : ""}: ${p.problem}`);
    console.log(`\n${problems.length} things keep ${name} from being done.`);
    process.exit(1);
  }
}
