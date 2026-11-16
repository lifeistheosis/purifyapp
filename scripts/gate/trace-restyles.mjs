#!/usr/bin/env node
// What made each restyle (Updates 98l, build 98 note 2): reads a Chrome trace written with the
// invalidation tracking on (scripts/gate/listen-walk.mjs --trace <dir> --why) and prints every
// style recalculation on the page's main thread from the tap, with how many elements it styled,
// and the changes that asked for it: a class or attribute changed, an inline style written, the
// element's own name. A change on <html> or <body> that sets a value every element inherits
// restyles the whole page (Updates 98h found it for the mini player, 98k for the dock).
//
//   node scripts/gate/trace-restyles.mjs <trace.json> [--floor 1000] [--for 1300]
//
// --floor: the fewest elements a recalculation styles to be printed (the trace's StyleResolver marks). The tap is the first
// pointerdown, touchstart, touchend or click, as scripts/gate/trace-frames.mjs reads it.
import fs from "node:fs";

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const at = argv.indexOf(name);
  return at >= 0 ? Number(argv.splice(at, 2)[1]) : dflt;
};
const FLOOR = flag("--floor", 1000);
const SPAN = flag("--for", 1300);
const file = argv[0];
if (!file) throw new Error("usage: trace-restyles.mjs <trace.json> [--floor 1000] [--for 1300]");
const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const events = Array.isArray(raw) ? raw : raw.traceEvents;
const taps = events.filter((e) => e.name === "EventDispatch" && ["touchstart", "pointerdown", "touchend", "click"].includes(e.args?.data?.type)).sort((a, b) => a.ts - b.ts);
if (!taps.length) throw new Error("no tap in the trace");
const first = taps[0];
const main = `${first.pid}:${first.tid}`;
const t0 = first.ts;
const end = t0 + SPAN * 1000;
const ms = (us) => Math.round(us / 100) / 10;
const onMain = (e) => `${e.pid}:${e.tid}` === main;

// Each recalculation is a Document::recalcStyle (a frame's or one a script forced); the elements it
// styled are the StyleResolver::ResolveStyle marks inside it.
const recalcs = events.filter((e) => onMain(e) && e.ph === "X" && e.name === "Document::recalcStyle" && e.ts >= t0 && e.ts <= end).sort((a, b) => a.ts - b.ts);
const resolves = events.filter((e) => onMain(e) && e.name === "StyleResolver::ResolveStyle" && e.ts >= t0 && e.ts <= end).map((e) => e.ts).sort((a, b) => a - b);
const styled = (r) => {
  let n = 0;
  for (const ts of resolves) if (ts >= r.ts && ts <= r.ts + r.dur) n += 1;
  return n;
};
const marks = events
  .filter((e) => onMain(e) && /InvalidationTracking$/.test(e.name) && e.ts >= t0 - 50000 && e.ts <= end)
  .sort((a, b) => a.ts - b.ts);

const describe = (e) => {
  const d = e.args?.data ?? {};
  const node = (d.nodeName ?? "").split(" ")[0] || "?";
  const what = [d.reason, d.changedClass && `class ${d.changedClass}`, d.changedAttribute && `attribute ${d.changedAttribute}`, d.changedId && `id ${d.changedId}`, d.changedPseudo && `pseudo ${d.changedPseudo}`, d.extraData].filter(Boolean).join(", ");
  return `${node}: ${what || e.name}`;
};

console.log(`${file}: tap at 0 (${first.args.data.type}), restyles of ${FLOOR} elements or more in the ${SPAN}ms after`);
let since = t0 - 50000;
let shown = 0;
for (const r of recalcs) {
  const count = styled(r);
  const asked = marks.filter((m) => m.ts > since && m.ts <= r.ts);
  since = r.ts + r.dur;
  if (count < FLOOR) continue;
  shown += 1;
  console.log(`  ${ms(r.ts - t0)}ms: ${ms(r.dur)}ms, ${count} elements`);
  const tally = new Map();
  for (const m of asked) {
    const key = describe(m);
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  // The root's and the body's own changes first: those reach every element.
  const rows = [...tally].sort((a, b) => Number(/^(HTML|BODY)/.test(b[0])) - Number(/^(HTML|BODY)/.test(a[0])) || b[1] - a[1]);
  for (const [key, n] of rows.slice(0, 12)) console.log(`      ${n > 1 ? `${n} x ` : ""}${key}`);
  if (rows.length > 12) console.log(`      ... and ${rows.length - 12} more kinds`);
}
if (!shown) console.log("  none");
