// What a long frame was spent on (Updates 98h, build 98 note 8): reads a Chrome trace that the motion
// walk wrote with --trace (scripts/motion-walk.mjs, Now Playing's opening or closing, each from the
// tap) and prints every task on the page's main thread over a floor, from the tap, with its own time
// split by what ran in it (self time: a forced style or layout inside a script counts as style or
// layout, not twice), and the raster done on the other threads in each 50ms from the tap.
//
//   node scripts/gate/trace-frames.mjs <trace.json> [--floor 8] [--for 1300]
import fs from "node:fs";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? Number(argv.splice(at, 2)[1]) : fallback;
};
const FLOOR = flag("--floor", 8);
const SPAN = flag("--for", 1300);
const file = argv[0];
if (!file) throw new Error("usage: node scripts/gate/trace-frames.mjs <trace.json> [--floor 8] [--for 1300]");
const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const events = Array.isArray(raw) ? raw : raw.traceEvents;

const names = new Map();
for (const e of events) if (e.ph === "M" && e.name === "thread_name") names.set(`${e.pid}:${e.tid}`, e.args?.name ?? "");
// The page's main thread is the renderer main that saw the tap.
const taps = events.filter((e) => e.name === "EventDispatch" && ["touchstart", "pointerdown", "touchend", "click"].includes(e.args?.data?.type));
if (!taps.length) throw new Error("no tap in the trace");
const first = taps.reduce((a, b) => (b.ts < a.ts ? b : a));
const main = `${first.pid}:${first.tid}`;
const t0 = first.ts;
const end = t0 + SPAN * 1000;
const ms = (us) => Math.round(us / 100) / 10;

// Complete events on the main thread, nested by time, for self times.
const onMain = events.filter((e) => `${e.pid}:${e.tid}` === main && e.ph === "X" && e.dur > 0 && e.ts >= t0 - 50000 && e.ts <= end).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
const tops = [];
const stack = [];
for (const e of onMain) {
  while (stack.length && stack.at(-1).e.ts + stack.at(-1).e.dur <= e.ts) stack.pop();
  const parent = stack.at(-1);
  const node = { e, self: e.dur, kids: [] };
  if (parent) {
    parent.self -= Math.min(e.dur, parent.self);
    parent.kids.push(node);
  } else tops.push(node);
  stack.push(node);
}
const label = (e) => {
  const d = e.args?.data ?? {};
  if (e.name === "EventDispatch") return `EventDispatch ${d.type}`;
  if (e.name === "FunctionCall") return `FunctionCall ${d.functionName || "?"}`;
  if (e.name === "TimerFire") return "TimerFire";
  return e.name;
};
const sumSelf = (node, into) => {
  into.set(label(node.e), (into.get(label(node.e)) ?? 0) + node.self);
  for (const k of node.kids) sumSelf(k, into);
  return into;
};
console.log(`${file}: tap at 0 (${first.args.data.type}), main-thread tasks of ${FLOOR}ms or more in the ${SPAN}ms after`);
for (const top of tops) {
  if (top.e.ts + top.e.dur < t0 || top.e.dur < FLOOR * 1000) continue;
  const parts = [...sumSelf(top, new Map())].filter(([, us]) => us >= 1000).sort((a, b) => b[1] - a[1]);
  console.log(`  ${ms(top.e.ts - t0)}ms: ${ms(top.e.dur)}ms  ${parts.map(([n, us]) => `${n} ${ms(us)}`).join(", ")}`);
}
// Raster and image decoding off the main thread, in 50ms steps from the tap.
const off = events.filter((e) => e.ph === "X" && e.dur > 0 && e.ts >= t0 && e.ts <= end && `${e.pid}:${e.tid}` !== main && /RasterTask|ImageDecodeTask|Decode Image|DrawFrame|SkiaOutputSurfaceImplOnGpu::SwapBuffers|Display::DrawAndSwap/.test(e.name));
const steps = new Map();
for (const e of off) {
  const step = Math.floor((e.ts - t0) / 50000) * 50;
  const key = `${e.name}`;
  const row = steps.get(step) ?? new Map();
  row.set(key, (row.get(key) ?? 0) + e.dur);
  steps.set(step, row);
}
console.log("  off the main thread (ms of work in each 50ms from the tap):");
for (const [step, row] of [...steps].sort((a, b) => a[0] - b[0])) {
  const parts = [...row].filter(([, us]) => us >= 2000).map(([n, us]) => `${n} ${ms(us)}`);
  if (parts.length) console.log(`    ${step}ms: ${parts.join(", ")}`);
}
