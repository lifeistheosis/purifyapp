// How heavy the app's screens are to open and to scroll, measured on the
// native export the way the phones run it: served as the shells serve it
// (scripts/lib/shell-server.mjs), in the shell's own user agent, at a phone's
// size with the processor slowed four times. No server, no network. Run after
// scripts/native-build.mjs and before out/ is removed:
//   node scripts/export-perf.mjs [out dir] [path ...]
//
// Each screen gets a fresh app: a cold start at the front door, then the
// router's way there, which is the only way an inner screen is ever opened in
// the apps. So:
//   payload KB   the page's index.txt, what that move reads from the bundle
//   read KB      everything handed over between the tap and the screen (an
//                upper bound: a probe counts as the whole file)
//   open ms      from the router's push to the screen being drawn
//   long ms      main-thread work over 50 ms at a time, in that same stretch
// Until 1.5.2 this timed a hard load of each page's own index.html, a load no
// phone makes: the shells answer every such address with the front door.
import path from "node:path";

import { chromium } from "playwright";

import { NATIVE_UA, ORIGIN, go, inBundle, payloadBytes, serveLikeTheShell } from "./lib/shell-server.mjs";

const [outArg, ...only] = process.argv.slice(2);
const OUT = path.resolve(outArg ?? "out");
const PAGES = only.length ? only : ["/", "/prayers/today/", "/bible/", "/bible/john/1/", "/bible/genesis/1/", "/bible/psalms/118/", "/saints/", "/saints/john-chrysostom/", "/saints/gregory-the-dialogist/morals-on-the-book-of-job/", "/saints/athanasius-the-great/on-the-incarnation/", "/discover/", "/calendar/", "/shop/", "/kitchen/", "/walkthroughs/job/", "/whats-new/"];

const browser = await chromium.launch();
const rows = [];
const cold = [];
for (const p of PAGES) {
  if (!inBundle(OUT, p)) { rows.push({ page: p, note: "not in the export" }); continue; }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript(() => {
    window.localStorage.setItem("purify:onboarded", "3");
    window.localStorage.setItem("purify:whatsNewSeen", "99");
    window.__long = 0;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long += e.duration; }).observe({ type: "longtask", buffered: true }); } catch {}
  });
  const log = await serveLikeTheShell(ctx, OUT);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  // The cold start: the one document the app ever loads.
  const t0 = Date.now();
  await go(page, "/");
  const coldMs = Date.now() - t0;
  await page.waitForTimeout(2500);
  cold.push({ ms: coldMs, kb: Math.round(log.bytes / 1024), long: await page.evaluate(() => Math.round(window.__long)) });

  // The way there. The front door is where the app already is.
  let openMs = coldMs;
  let readBytes = log.bytes;
  if (p !== "/") {
    await page.evaluate(() => { window.__long = 0; });
    const before = log.bytes;
    const t1 = Date.now();
    await go(page, p);
    // Drawn: two frames after the route has committed.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    openMs = Date.now() - t1;
    await page.waitForTimeout(2500);
    readBytes = log.bytes - before;
  }
  const opened = await page.evaluate(() => ({ long: Math.round(window.__long), nodes: document.querySelectorAll("*").length, path: location.pathname }));
  // Scroll three screens the way a thumb does, and time every frame.
  const frames = await page.evaluate(async () => {
    const deltas = [];
    let last = performance.now();
    let run = true;
    const tick = (now) => { deltas.push(now - last); last = now; if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const total = Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 3);
    const start = performance.now();
    await new Promise((done) => {
      const step = (now) => {
        const t = Math.min(1, (now - start) / 1500);
        window.scrollTo(0, total * t);
        if (t < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
    run = false;
    const d = deltas.slice(2).sort((a, b) => a - b);
    return { n: d.length, p95: d.length ? d[Math.floor(d.length * 0.95)] : 0, worst: d.length ? d[d.length - 1] : 0, slow: d.filter((x) => x > 34).length };
  });
  rows.push({ page: p, arrived: opened.path === new URL(p, ORIGIN).pathname, payloadKB: Math.round(payloadBytes(OUT, p) / 1024), readKB: Math.round(readBytes / 1024), openMs, longMs: opened.long, nodes: opened.nodes, p95: Math.round(frames.p95), worst: Math.round(frames.worst), slow: frames.slow, frames: frames.n });
  await ctx.close();
}
await browser.close();

if (cold.length) {
  const mid = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  console.log(`cold start at the front door, the median of ${cold.length}: ${mid(cold.map((c) => c.ms))} ms to load, ${mid(cold.map((c) => c.kb))} KB read, ${mid(cold.map((c) => c.long))} ms of long work\n`);
}
console.log("screen".padEnd(58), "payload KB", "read KB", "open ms", "long ms", "nodes", "scroll p95", "worst", "slow/frames");
for (const r of rows) {
  if (r.note) { console.log(r.page.padEnd(58), r.note); continue; }
  console.log(r.page.padEnd(58), String(r.payloadKB).padStart(10), String(r.readKB).padStart(7), String(r.openMs).padStart(7), String(r.longMs).padStart(7), String(r.nodes).padStart(5), String(r.p95).padStart(10), String(r.worst).padStart(5), `${r.slow}/${r.frames}`.padStart(11), r.arrived ? "" : "  DID NOT ARRIVE");
}
if (rows.some((r) => !r.note && !r.arrived)) process.exit(1);
