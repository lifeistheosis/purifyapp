// How heavy the app's pages are to open and to scroll, measured on the native
// export served from out/ at https://localhost, at a phone's size with the
// processor slowed four times. No server, no network. Run after
// scripts/native-build.mjs and before out/ is removed:
//   node scripts/export-perf.mjs [out dir] [path ...]
// "all KB" counts a HEAD probe as the whole file, so read it as an upper bound.
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const [outArg, ...only] = process.argv.slice(2);
const OUT = path.resolve(outArg ?? "out");
const ORIGIN = "https://localhost";
const PAGES = only.length ? only : ["/", "/prayers/today/", "/bible/", "/bible/john/1/", "/bible/genesis/1/", "/bible/psalms/118/", "/saints/", "/saints/john-chrysostom/", "/saints/gregory-the-dialogist/morals-on-the-book-of-job/", "/saints/athanasius-the-great/on-the-incarnation/", "/discover/", "/calendar/", "/shop/", "/kitchen/", "/walkthroughs/job/", "/whats-new/"];
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp3": "audio/mpeg" };

function fileFor(pathname) {
  const p = decodeURIComponent(pathname);
  const direct = path.join(OUT, p);
  if (p.endsWith("/")) return path.join(direct, "index.html");
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  if (fs.existsSync(path.join(direct, "index.html"))) return path.join(direct, "index.html");
  return direct;
}

const browser = await chromium.launch();
const rows = [];
for (const p of PAGES) {
  const htmlFile = fileFor(p);
  if (!fs.existsSync(htmlFile)) { rows.push({ page: p, note: "not in the export" }); continue; }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    window.localStorage.setItem("purify:onboarded", "2");
    window.__long = 0;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long += e.duration; }).observe({ type: "longtask", buffered: true }); } catch {}
  });
  let bytes = 0;
  await ctx.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.abort();
    const file = fileFor(url.pathname);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) { bytes += fs.statSync(file).size; return route.fulfill({ path: file, contentType: MIME[path.extname(file)] ?? "application/octet-stream" }); }
    return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const t0 = Date.now();
  await page.goto(ORIGIN + p, { waitUntil: "load", timeout: 120000 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(2500);
  const opened = await page.evaluate(() => ({ long: Math.round(window.__long), nodes: document.querySelectorAll("*").length, height: document.documentElement.scrollHeight }));
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
  rows.push({ page: p, htmlKB: Math.round(fs.statSync(htmlFile).size / 1024), loadedKB: Math.round(bytes / 1024), loadMs, longMs: opened.long, nodes: opened.nodes, p95: Math.round(frames.p95), worst: Math.round(frames.worst), slow: frames.slow, frames: frames.n });
  await ctx.close();
}
await browser.close();
console.log("page".padEnd(58), "html KB", "all KB", "load ms", "long ms", "nodes", "scroll p95", "worst", "slow/frames");
for (const r of rows) {
  if (r.note) { console.log(r.page.padEnd(58), r.note); continue; }
  console.log(r.page.padEnd(58), String(r.htmlKB).padStart(7), String(r.loadedKB).padStart(6), String(r.loadMs).padStart(7), String(r.longMs).padStart(7), String(r.nodes).padStart(5), String(r.p95).padStart(10), String(r.worst).padStart(5), `${r.slow}/${r.frames}`.padStart(11));
}
