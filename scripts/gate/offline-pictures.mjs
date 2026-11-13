// The confirm run's no-signal check (the arbiter, 2026-11-12 05:37): each page served as the apps serve
// it, every request off the device refused, scrolled to its end so lazy pictures are asked for, then
// every picture that did not draw is named. A picture the export carries (the same name in any format)
// that does not draw is a fault; one the website streams by design must keep its frame.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
// The browser the session carries, as the walks launch it (scripts/tap-walk.mjs); else Playwright's own.
const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
const PAGES = process.argv.slice(2);
const FORMATS = [".avif", ".webp", ".jpg", ".jpeg", ".png"];
const carried = (pathname) => {
  const has = (p) => { const f = path.join(OUT, p); return f.startsWith(OUT + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile(); };
  if (has(pathname)) return pathname;
  const m = /^(.*)\.(avif|webp|jpe?g|png)$/i.exec(pathname);
  return m ? FORMATS.map((e) => m[1] + e).find(has) ?? null : null;
};
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
let faults = 0;
for (const at of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await pinMotion(ctx, "on");
  await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
  await serveLikeTheShell(ctx, OUT, {});
  const offDevice = new Set();
  const page = await ctx.newPage();
  page.on("request", (r) => { const u = r.url(); if (!u.startsWith("https://localhost") && /\.(avif|webp|jpe?g|png)(\?|$)/i.test(u)) offDevice.add(u); });
  try {
    await go(page, at, { timeout: 30000 });
    await page.waitForTimeout(2500);
    // Down the page a screen at a time, so lazy pictures and undrawn rows are asked for.
    for (let i = 0; i < 80; i++) {
      const done = await page.evaluate(() => { const before = window.scrollY; window.scrollBy(0, 600); return window.scrollY === before; });
      await page.waitForTimeout(250);
      if (done) break;
    }
    await page.waitForTimeout(2500);
    const pics = await page.evaluate(() => [...document.images].map((i) => {
      const r = i.getBoundingClientRect();
      return { src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, waiting: !i.complete, w: Math.round(r.width), h: Math.round(r.height) };
    }));
    const broken = pics.filter((p) => !p.ok && !p.waiting);
    const carriedBroken = broken.filter((p) => { try { const u = new URL(p.src); return u.origin === "https://localhost" || carried(u.pathname); } catch { return false; } });
    const streamed = broken.filter((p) => !carriedBroken.includes(p));
    const collapsed = streamed.filter((p) => p.w === 0 || p.h === 0);
    const askedCarried = [...offDevice].filter((u) => carried(new URL(u).pathname));
    const bad = carriedBroken.length + askedCarried.length;
    faults += bad ? 1 : 0;
    console.log(`${bad ? "FAIL" : "pass"}  ${at}: ${pics.length} pictures, ${pics.filter((p) => p.ok).length} drawn, ${pics.filter((p) => p.waiting).length} still loading; streamed by design and not had: ${streamed.length} (${collapsed.length} without a frame)`);
    for (const p of carriedBroken) console.log(`    carried but not drawn: ${new URL(p.src).pathname}`);
    for (const u of askedCarried) console.log(`    asked of the website while the export carries it: ${new URL(u).pathname}`);
    for (const p of collapsed.slice(0, 5)) console.log(`    streamed, frame lost: ${new URL(p.src).pathname} (${p.w}x${p.h})`);
  } catch (e) {
    faults += 1;
    console.log(`FAIL  ${at}: ${String(e).split("\n")[0].slice(0, 160)}`);
  } finally {
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${PAGES.length} pages with no signal, ${faults} failed`);
