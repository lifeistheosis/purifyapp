// Updates 72's probe: the shop from Discover's Shop door, offline or online, every layout shift on
// the way with its box and its time, and the order the shop's three reads come back in.
//   node probe72.mjs <out dir> [--online] [--size 390x844] [--lang ar] [--runs 3] [--direct]
import path from "node:path";
import { createRequire } from "node:module";

const repo = "/home/user/purifyapp";
const { chromium } = createRequire(path.join(repo, "package.json"))("playwright");
const { serveLikeTheShell, NATIVE_UA, go, ORIGIN } = await import(path.join(repo, "scripts/lib/shell-server.mjs"));
const { pinMotion, motionOptions } = await import(path.join(repo, "scripts/lib/motion.mjs"));
const { tapAt, firstTouch } = await import(path.join(repo, "scripts/lib/tap.mjs"));

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : null; };
const has = (n) => { const i = argv.indexOf(n); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const ONLINE = has("--online");
const DIRECT = has("--direct");
const SIZE = (flag("--size") ?? "390x844").split("x").map(Number);
const LANG = flag("--lang");
const RUNS = Number(flag("--runs") ?? 1);
const out = path.resolve(argv[0] ?? path.join(repo, "out"));

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (let run = 0; run < RUNS; run++) {
  const ctx = await browser.newContext({
    viewport: { width: SIZE[0], height: SIZE[1] },
    hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: NATIVE_UA, ...motionOptions("on"),
  });
  await pinMotion(ctx, "on");
  if (LANG) await ctx.addInitScript((l) => { try { localStorage.setItem("purify.locale", l); document.cookie = `purify-locale=${l}; path=/`; } catch {} }, LANG);
  const reads = [];
  const t0 = Date.now();
  if (ONLINE) {
    // Inside the bundle as the shell answers; the main web read for real (GET only).
    await serveLikeTheShell(ctx, out);
    await ctx.unroute("**/*");
    await ctx.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      if (u.origin === ORIGIN) return route.fallback();
      if (route.request().method() !== "GET" && route.request().method() !== "OPTIONS") return route.abort();
      if (u.pathname.startsWith("/api/shop/")) reads.push({ at: Date.now() - t0, url: u.pathname + u.search, what: "asked" });
      return route.continue();
    });
    await serveLikeTheShell(ctx, out);
  } else {
    await serveLikeTheShell(ctx, out);
  }
  ctx.on("requestfailed", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/shop/")) reads.push({ at: Date.now() - t0, url: u.pathname + u.search, what: "failed" }); });
  ctx.on("requestfinished", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/shop/")) reads.push({ at: Date.now() - t0, url: u.pathname + u.search, what: "answered" }); });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await go(page, "/");
  await page.waitForTimeout(1500);
  await go(page, "/discover/");
  await page.waitForTimeout(2500);
  await firstTouch(page, cdp);
  await page.evaluate(() => {
    const describe = (n) => {
      if (!n || n.nodeType !== 1) return n ? `#text "${(n.textContent || "").trim().slice(0, 40)}"` : "?";
      const cls = (n.getAttribute("class") || "").split(/\s+/).slice(0, 4).join(".");
      const txt = (n.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50);
      return `${n.tagName.toLowerCase()}${cls ? "." + cls : ""} "${txt}"`;
    };
    window.__shifts = [];
    window.__marks = [];
    window.__t0 = performance.now();
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__shifts.push({
          t: Math.round(e.startTime - window.__t0), value: +e.value.toFixed(4),
          sources: (e.sources || []).map((s) => ({ node: describe(s.node), from: [s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height].map(Math.round), to: [s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height].map(Math.round) })),
        });
      }
    }).observe({ type: "layout-shift", buffered: false });
    // What the shop's top holds, each frame, while it settles.
    let last = "";
    const tick = () => {
      const main = document.querySelector("main") || document.body;
      const err = [...main.querySelectorAll("p")].find((p) => /reach the shop|المتجر/.test(p.textContent || ""));
      const feat = document.querySelector("section.shop-feature");
      const saintsBones = feat?.parentElement?.children?.[1];
      const state = JSON.stringify({
        path: location.pathname,
        feature: feat ? Math.round(feat.getBoundingClientRect().height) : null,
        featureTop: feat ? Math.round(feat.getBoundingClientRect().top) : null,
        second: saintsBones && saintsBones !== feat ? `${saintsBones.tagName.toLowerCase()}${saintsBones.getAttribute("aria-hidden") ? "[bones]" : ""} h${Math.round(saintsBones.getBoundingClientRect().height)}` : null,
        error: err ? Math.round(err.getBoundingClientRect().top) : null,
        busy: document.querySelectorAll("main [aria-hidden] .animate-pulse, main [aria-hidden=true] [class*=skeleton]").length,
      });
      if (state !== last) { window.__marks.push({ t: Math.round(performance.now() - window.__t0), state }); last = state; }
      if (performance.now() - window.__t0 < 6000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  if (DIRECT) {
    await page.evaluate(() => window.next.router.push("/shop/"));
  } else {
    const door = page.locator('main a[href="/shop"], main a[href="/shop/"]').first();
    await door.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.evaluate(() => { window.__marks.push({ t: Math.round(performance.now() - window.__t0), state: "scrolled to the door" }); });
    const box = await door.boundingBox();
    const under = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return `${e?.tagName} ${e?.closest("a")?.getAttribute("href")}`; }, [box.x + box.width / 2, box.y + Math.min(box.height / 2, 40)]);
    console.log("door", JSON.stringify(box), "under the finger:", under);
    await page.evaluate(() => { window.__tapAt = Math.round(performance.now() - window.__t0); });
    await tapAt(cdp, box.x + box.width / 2, box.y + Math.min(box.height / 2, 40));
  }
  await page.waitForTimeout(5000);
  const res = await page.evaluate(() => ({ shifts: window.__shifts, marks: window.__marks, tapAt: window.__tapAt ?? null }));
  console.log(`\n=== run ${run + 1}, ${ONLINE ? "online" : "offline"}, ${SIZE.join("x")}${LANG ? `, ${LANG}` : ""}; tap at ${res.tapAt}ms ===`);
  for (const r of reads) console.log(`  read ${r.what} ${r.url} at +${r.at}ms (wall)`);
  for (const m of res.marks) console.log(`  ${m.t}ms ${m.state}`);
  for (const s of res.shifts) {
    if (res.tapAt !== null && s.t < res.tapAt) continue;
    console.log(`  SHIFT ${s.t}ms value ${s.value}`);
    for (const src of s.sources) {
      const far = Math.max(Math.abs(src.to[0] - src.from[0]), Math.abs(src.to[1] - src.from[1]));
      console.log(`     ${far}px ${src.node} from ${src.from.join(",")} to ${src.to.join(",")}`);
    }
  }
  await ctx.close();
}
await browser.close();
