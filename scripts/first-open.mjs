// The first opening of each tab and of the page each tab opens most, timed on
// the native export cold (build 97 note 3). Served as the shells serve it
// (scripts/lib/shell-server.mjs), at 390x844 in the shell's user agent, the
// processor slowed four times through CDP to stand in for a phone, and a fresh
// browser (no cache, no warm code) for every run. Offline, as the bundle is:
// nothing is fetched from outside it, and what a page tried to fetch from
// outside is counted.
//
//   node scripts/first-open.mjs [out dir] [--runs 3] [--wait 12000] [--trace] [--json file] [--no-keep-prefetch]
//
// A run is a cold start at the front door, the first screen settled, then
// --wait ms of a reader looking at Today (the time the app has to ready pages
// ahead), then a tap on a tab and a tap on the page that tab opens most.
//
// Settled, the one measure before and after: the page's address is the one
// tapped for, its main heading (the first h1 drawn in [data-route-content]) is
// shown (drawn, and at full opacity, so the page switch has ended), and no
// layout shift has happened and the heading has not moved for 300 ms. The
// time is from the tap (pointerdown) to the start of those 300 ms.
//
// Where the time goes, for each opening: what was read between the tap and the
// settle (the code, the page's payload, pictures, the page's own data from the
// bundle or outside it), when the page switched (the address committed), and
// with --trace the main thread split: chunks compiled and run, the app's own
// script (React drawing the page), style and layout, paint, and image decode.
// --no-keep-prefetch stubs the router's prefetch before the Bible chapter is
// scrolled, so KeepScrolling's own prefetch can be told apart.
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { NATIVE_UA, ORIGIN, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const at = argv.indexOf(name);
  if (at < 0) return dflt;
  const [, v] = argv.splice(at, 2);
  return v;
};
const RUNS = Number(opt("--runs", 3));
const WAIT = Number(opt("--wait", 12000));
const JSON_OUT = opt("--json", null);
const TRACE = argv.includes("--trace");
const NO_KEEP = argv.includes("--no-keep-prefetch");
// An experiment on an export without the ready-ahead: the walk itself loads
// each page's code during the wait, the way lib/nav/readyAhead.ts does it.
const AHEAD_BY_WALK = argv.includes("--ahead-by-walk") || argv.includes("--ahead-by-walk-require");
const AHEAD_REQUIRE = argv.includes("--ahead-by-walk-require");
// The floor: each tab opened a second time (Today between), the time a page
// takes once nothing about it is new.
const SECOND = argv.includes("--second");
// The onboarding's end instead: from its reminders step, "Not now", then every
// frame of the three-second slate timed (rAF), and the code read meanwhile.
const HANDOFF = argv.includes("--handoff");
const OUT = path.resolve(argv.find((a) => !a.startsWith("--")) ?? "out");
const OWN = "/opt/pw-browsers/chromium";

/** Each run: a tab (null: Today, where the cold start already is), then the page it opens most. */
const FLOWS = [
  { tab: null, name: "Today", inner: { name: "Today: Begin (the prayers of the hour)", sel: '[data-route-content] a[href^="/prayers/"]', first: true, ahead: "/prayers/evening/" } },
  { tab: "/bible/john/1/", name: "Bible tab: John 1", inner: { name: "Bible: the next chapter (John 2)", sel: '[data-route-content] a[href="/bible/john/2/"]', last: true, scroll: true, ahead: "/bible/john/2/" } },
  { tab: "/discover/", name: "Discover tab", inner: { name: "Discover: Saints", sel: '[data-route-content] a[href="/saints/"]', first: true, ahead: "/saints/" } },
  { tab: "/prayers/", name: "Prayers tab", inner: { name: "Prayers: Morning prayers", sel: '[data-route-content] a[href="/prayers/morning/"]', first: true, ahead: "/prayers/morning/" } },
  { tab: "/account/", name: "You tab", inner: { name: "You: Settings", sel: '[data-route-content] a[href="/settings/"]', first: true, ahead: "/settings/" } },
];

/** In the page: watch for the settle of an opening to `target`, timed from the next pointerdown. */
function arm(target) {
  const fo = { tap: 0, commit: 0, settled: 0, shifts: [] };
  window.__fo = fo;
  document.addEventListener("pointerdown", () => { if (!fo.tap) { fo.tap = performance.now(); performance.mark("fo-tap"); } }, { capture: true });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) fo.shifts.push(e.startTime); }).observe({ type: "layout-shift" }); } catch {}
  const heading = () => {
    for (const h of document.querySelectorAll("[data-route-content] h1, main h1")) {
      const r = h.getBoundingClientRect();
      if (r.width > 2 && r.height > 2) return h;
    }
    return null;
  };
  const shown = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) < 0.99) return false;
    }
    return true;
  };
  let since = 0;
  let sig = "";
  const frame = (now) => {
    if (!fo.tap) return requestAnimationFrame(frame);
    const here = location.pathname === target;
    if (here && !fo.commit) fo.commit = now;
    const h = here ? heading() : null;
    const ok = !!h && shown(h);
    const s = ok ? String(Math.round(h.getBoundingClientRect().top)) : "";
    const lastShift = fo.shifts.length ? fo.shifts[fo.shifts.length - 1] : 0;
    if (!ok) since = 0;
    else if (!since || s !== sig || lastShift > since) since = now;
    sig = s;
    if (ok && now - since >= 300) { fo.settled = since; performance.mark("fo-settled"); return; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** In the page: what was read between the tap and the settle. */
function readings() {
  const fo = window.__fo;
  const out = { code: [], payload: [], pictures: [], data: [], misses: 0 };
  for (const e of performance.getEntriesByType("resource")) {
    if (e.startTime < fo.tap - 1 || e.startTime > fo.settled) continue;
    const u = new URL(e.name);
    const row = { p: u.origin === location.origin ? u.pathname : u.href, end: Math.round(e.responseEnd - fo.tap) };
    if (u.pathname.endsWith("__next._tree.txt")) out.misses += 1;
    else if (u.pathname.startsWith("/_next/static/chunks/") && u.pathname.endsWith(".js")) out.code.push(row);
    else if (u.pathname.endsWith("/index.txt")) out.payload.push(row);
    else if (e.initiatorType === "img" || /\.(png|jpe?g|webp|avif|svg)$/i.test(u.pathname)) out.pictures.push(row);
    else out.data.push(row);
  }
  return { tap: fo.tap, commit: Math.round(fo.commit - fo.tap), settle: Math.round(fo.settled - fo.tap), ...out };
}

const size = (p) => {
  if (!p.startsWith("/")) return 0;
  const f = path.join(OUT, decodeURIComponent(p));
  return fs.existsSync(f) && fs.statSync(f).isFile() ? fs.statSync(f).size : 0;
};

/** The main thread between the two marks, by self time (needs --trace). */
function split(events) {
  const marks = Object.fromEntries(events.filter((e) => e.name === "fo-tap" || e.name === "fo-settled").map((e) => [e.name, e.ts]));
  if (!marks["fo-tap"] || !marks["fo-settled"]) return null;
  const main = new Set(events.filter((e) => e.ph === "M" && e.name === "thread_name" && e.args?.name === "CrRendererMain").map((e) => `${e.pid}:${e.tid}`));
  const span = events
    .filter((e) => e.ph === "X" && e.dur && main.has(`${e.pid}:${e.tid}`) && e.ts + e.dur >= marks["fo-tap"] && e.ts <= marks["fo-settled"])
    .sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const kind = (n) => {
    if (n === "EvaluateScript" || /^v8\.compile|^V8\.Compile|^v8\.parse|^v8\.deserialize|produceCache|^CacheScript/.test(n)) return "chunks compiled and run";
    if (/GC|^V8\.GC/.test(n)) return "garbage collection";
    if (n === "UpdateLayoutTree" || n === "Layout" || n === "RecalculateStyles" || n === "IntersectionObserverController::computeIntersections") return "style and layout";
    if (/^(Paint|PrePaint|Layerize|Commit|UpdateLayer|CompositeLayers|PaintImage)$/.test(n)) return "paint";
    if (/Decode/i.test(n)) return "image decode";
    if (/^(FunctionCall|RunMicrotasks|TimerFire|FireAnimationFrame|EventDispatch|v8\.callFunction|V8\.Execute|v8\.run|ParseAuthorStyleSheet|XHRReadyStateChange|HandlePostMessage)$/.test(n)) return "the app's script (React drawing the page)";
    return "other";
  };
  const totals = {};
  const stack = [];
  const self = new Map();
  for (const e of span) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    const lo = Math.max(e.ts, marks["fo-tap"]);
    const hi = Math.min(e.ts + e.dur, marks["fo-settled"]);
    const d = Math.max(0, hi - lo);
    self.set(e, (self.get(e) ?? 0) + d);
    if (stack.length) self.set(stack[stack.length - 1], (self.get(stack[stack.length - 1]) ?? 0) - d);
    stack.push(e);
  }
  for (const [e, d] of self) {
    // Within a script's own evaluation, every child is that chunk's cost.
    const k = kind(e.name);
    totals[k] = (totals[k] ?? 0) + d / 1000;
  }
  const decodeAnywhere = events.filter((e) => e.ph === "X" && /Decode/i.test(e.name) && e.ts >= marks["fo-tap"] && e.ts <= marks["fo-settled"]).reduce((a, e) => a + e.dur / 1000, 0);
  return { ...Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v)])), "image decode, any thread": Math.round(decodeAnywhere) };
}

async function tapAndSettle(page, cdp, locator, target) {
  await locator.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  await page.evaluate(arm, target);
  let events = null;
  if (TRACE) {
    events = [];
    cdp.on("Tracing.dataCollected", ({ value }) => events.push(...value));
    await cdp.send("Tracing.start", { categories: "devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline", transferMode: "ReportEvents" });
  }
  await locator.tap();
  const ok = await page.waitForFunction(() => window.__fo?.settled > 0, null, { timeout: 60000, polling: 100 }).then(() => true, () => false);
  if (TRACE) {
    const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
    await cdp.send("Tracing.end");
    await done;
    cdp.removeAllListeners("Tracing.dataCollected");
  }
  if (!ok) return { settle: null, note: "did not settle in 60 s", at: await page.evaluate(() => location.pathname) };
  const r = await page.evaluate(readings);
  const kb = (rows) => Math.round(rows.reduce((a, x) => a + size(x.p), 0) / 1024);
  const last = (rows) => (rows.length ? Math.max(...rows.map((x) => x.end)) : null);
  return {
    settle: r.settle,
    commit: r.commit,
    code: { files: r.code.length, kb: kb(r.code), lastAt: last(r.code) },
    payload: { files: r.payload.length, kb: kb(r.payload), lastAt: last(r.payload) },
    pictures: { files: r.pictures.length, kb: kb(r.pictures), lastAt: last(r.pictures) },
    data: { files: r.data.length, outside: r.data.filter((x) => !x.p.startsWith("/")).length, lastAt: last(r.data), list: r.data.map((x) => x.p).slice(0, 6) },
    prefetchMisses: r.misses,
    split: events ? split(events) : undefined,
  };
}

async function run(browser, flow) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    } catch {}
  });
  const log = await serveLikeTheShell(ctx, OUT);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const row = { flow: flow.name };
  const t0 = Date.now();
  await go(page, "/");
  await page.waitForFunction(() => [...document.querySelectorAll("[data-route-content] h1")].some((h) => h.getBoundingClientRect().height > 2), null, { timeout: 60000 });
  row.coldStart = Date.now() - t0;
  if (AHEAD_BY_WALK) {
    const pages = [flow.tab, flow.inner.ahead].filter(Boolean);
    await page.evaluate(async ([list, req]) => {
      for (const p of list) {
        const txt = await (await fetch(`${p}index.txt`)).text();
        const ids = [...new Set([...txt.matchAll(/:I\[(\d+),/g)].map((m) => Number(m[1])))];
        for (const src of new Set(txt.match(/"\/_next\/static\/chunks\/[^"]+\.js"/g)?.map((m) => m.slice(1, -1)) ?? [])) {
          if (document.querySelector(`script[src="${src}"]`)) continue;
          await new Promise((done) => {
            const s = document.createElement("script");
            s.src = src;
            s.onload = () => done();
            s.onerror = () => { s.remove(); done(); };
            document.head.appendChild(s);
          });
        }
        if (req) for (const id of ids) { try { globalThis.TURBOPACK.push([`/_next/static/chunks/ahead-${id}.js`, { otherChunks: [], runtimeModuleIds: [id] }]); } catch (e) { console.log("require failed", id, String(e)); } await new Promise((r) => setTimeout(r, 30)); }
      }
    }, [pages, AHEAD_REQUIRE]);
  }
  await page.waitForTimeout(WAIT);
  const asked = log.asked.length;
  if (flow.tab) {
    row.tab = await tapAndSettle(page, cdp, page.locator(`nav ul a[href="${flow.tab}"]`), flow.tab);
    await page.waitForTimeout(1500);
    if (SECOND) {
      await tapAndSettle(page, cdp, page.locator('nav ul a[href="/"]'), "/");
      await page.waitForTimeout(1500);
      row.tabAgain = await tapAndSettle(page, cdp, page.locator(`nav ul a[href="${flow.tab}"]`), flow.tab);
      await page.waitForTimeout(1500);
    }
  }
  const links = page.locator(flow.inner.sel);
  if (flow.inner.scroll) {
    if (NO_KEEP) await page.evaluate(() => { window.next.router.prefetch = () => {}; });
    // A thumb down the chapter to its end: KeepScrolling's zone is seen and it prefetches the next chapter.
    await page.evaluate(async () => {
      const end = document.documentElement.scrollHeight - innerHeight;
      for (let y = 0; y <= end; y += innerHeight * 0.8) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      window.scrollTo(0, end);
    });
    await page.waitForTimeout(1500);
  }
  const link = flow.inner.last ? links.last() : links.first();
  if (await link.count()) {
    const href = await link.getAttribute("href");
    row.inner = { href, ...(await tapAndSettle(page, cdp, link, new URL(href, ORIGIN).pathname)) };
  } else row.inner = { note: `no link for ${flow.inner.sel}` };
  row.missingAfterCold = [...new Set(log.asked.slice(asked).filter((p) => log.missing.includes(p)))].filter((p) => !p.endsWith("__next._tree.txt")).slice(0, 5);
  await ctx.close();
  return row;
}

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
if (HANDOFF) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
    await ctx.addInitScript(() => {
      try {
        if (!sessionStorage.getItem("fo-armed")) {
          localStorage.removeItem("purify:onboarded");
          localStorage.setItem("purify:onboarding.stage", "reminders");
          sessionStorage.setItem("fo-armed", "1");
        }
      } catch {}
    });
    const log = await serveLikeTheShell(ctx, OUT);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await go(page, "/");
    const later = page.getByRole("button", { name: /not now/i });
    await later.waitFor({ timeout: 60000 });
    await page.waitForTimeout(3000);
    const asked = log.asked.length;
    const timing = page.evaluate(() => new Promise((done) => {
      const d = [];
      let last = 0;
      let start = 0;
      const tick = (now) => {
        if (!document.querySelector(".ob-slate-mark")) return requestAnimationFrame(tick);
        if (!start) { start = now; last = now; }
        else { d.push(now - last); last = now; }
        if (now - start < 3400) requestAnimationFrame(tick);
        else done(d);
      };
      requestAnimationFrame(tick);
    }));
    await later.tap();
    const d = (await timing).sort((a, b) => a - b);
    const code = [...new Set(log.asked.slice(asked).filter((p) => p.startsWith("/_next/static/chunks/") && p.endsWith(".js")))].length;
    runs.push({ frames: d.length, p95: Math.round(d[Math.floor(d.length * 0.95)]), worst: Math.round(d[d.length - 1]), over34: d.filter((x) => x > 34).length, codeFilesRead: code });
    console.log(`handoff run ${i + 1}: ${JSON.stringify(runs[runs.length - 1])}`);
    await ctx.close();
  }
  await browser.close();
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ out: OUT, handoff: runs }, null, 2));
  process.exit(0);
}
const rows = [];
for (let i = 0; i < RUNS; i++) for (const flow of FLOWS) {
  const r = await run(browser, flow);
  r.round = i + 1;
  rows.push(r);
  console.log(`round ${i + 1} ${flow.name}: cold ${r.coldStart} ms, tab ${r.tab?.settle ?? "-"} ms${r.tabAgain ? ` (again ${r.tabAgain.settle} ms)` : ""}, ${FLOWS.find((f) => f.name === flow.name).inner.name} ${r.inner?.settle ?? r.inner?.note} ms`);
}
await browser.close();

const median = (xs) => { const v = xs.filter((x) => typeof x === "number").sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
console.log(`\nfirst openings on ${OUT}, median of ${RUNS}, tap to settled (commit = the page switched):`);
for (const flow of FLOWS) {
  const mine = rows.filter((r) => r.flow === flow.name);
  for (const [label, key] of [[flow.name, "tab"], [flow.inner.name, "inner"]]) {
    if (key === "tab" && !flow.tab) continue;
    const xs = mine.map((r) => r[key]).filter(Boolean);
    const s = median(xs.map((x) => x.settle));
    const c = median(xs.map((x) => x.commit));
    const m = xs.find((x) => x.settle === s) ?? xs[0];
    console.log(`  ${label.padEnd(44)} ${String(s).padStart(6)} ms   commit ${String(c).padStart(5)}   code ${m?.code?.files ?? "-"} files ${m?.code?.kb ?? "-"} KB   payload ${m?.payload?.kb ?? "-"} KB   pictures ${m?.pictures?.files ?? "-"}   data ${m?.data?.files ?? "-"} (outside ${m?.data?.outside ?? "-"})   misses ${m?.prefetchMisses ?? "-"}`);
    if (m?.split) console.log(`      main thread: ${Object.entries(m.split).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  }
}
console.log(`  cold start to Today drawn, median ${median(rows.map((r) => r.coldStart))} ms`);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ out: OUT, runs: RUNS, wait: WAIT, trace: TRACE, noKeepPrefetch: NO_KEEP, rows }, null, 2));
if (rows.some((r) => r.tab?.settle === null || r.inner?.settle === null || r.inner?.note)) process.exitCode = 1;
