// A frame probe (Updates 14, 2026-11-13): open one screen of the export as the walks do, make one
// change (a real touch on a control, or the router asked for an address), and log, every frame from
// it: the address, pushState calls, the View Transition's update and `ready`, the layout shifts the
// browser reports (their boxes' tops), kept-place and reader reads of storage, and the watched
// boxes (only frames where one changed), with nodes added or removed. It is how Gate 2.0's jumps
// were sorted into the page switch's own swap (under the old page's picture) and late parts landing
// in the live page (after `ready`).
//
//   node scripts/gate/probe.mjs --out <out> --start /chants/ --tap 'a:has-text("Psalm 135")' \
//     --watch '.route-fade' [--watch <sel>...] [--ms 1500] [--cpu 4] [--online] [--reduce] [--push /plans/]
//
// --cpu slows the page as a walk's load does (4 found the council's cover; the page at full speed hid it).
import { chromium } from "playwright";

import { mainWeb } from "../lib/main-web.mjs";
import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { tapAt } from "../lib/tap.mjs";

const a = process.argv.slice(2);
const one = (n, d) => (a.indexOf(n) >= 0 ? a[a.indexOf(n) + 1] : d);
const many = (n) => a.flatMap((x, i) => (x === n ? [a[i + 1]] : []));
const OUT = one("--out", "out");
const START = one("--start", "/");
const TAP = one("--tap");
const WATCH = many("--watch");
const MS = Number(one("--ms", "1500"));
const MODE = a.includes("--reduce") ? "reduce" : "on";
const WIDTH = Number(one("--width", "390"));
const BEFORE = one("--before", null);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(MODE) });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  } catch {}
});
await pinMotion(ctx, MODE);
await serveLikeTheShell(ctx, OUT, {});
if (a.includes("--online")) for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
await go(page, "/", { timeout: 60000 });
await page.waitForTimeout(1200);
await go(page, START, { timeout: 60000 });
await page.waitForTimeout(2500);
if (BEFORE) await page.evaluate(BEFORE);
const PUSH = one("--push", null);
let box = null;
if (!PUSH) {
  const target = page.locator(TAP).first();
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  box = await target.boundingBox();
  if (!box) throw new Error("no box for " + TAP);
}
await page.evaluate((watch) => {
  const log = [];
  window.__probe = log;
  const t0 = performance.now();
  window.__t0 = t0;
  for (const k of ["pushState", "replaceState"]) {
    const orig = history[k].bind(history);
    history[k] = (s, u, url) => {
      log.push({ t: Math.round(performance.now() - t0), ev: k, url: String(url) });
      return orig(s, u, url);
    };
  }
  const getItem = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) {
    if (/position|reader/i.test(k)) log.push({ t: Math.round(performance.now() - t0), s: `GET ${k} at ${location.pathname}${location.hash}` });
    return getItem.call(this, k);
  };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) for (const x of e.sources || []) {
      const n = x.node && (x.node.nodeType === 1 ? x.node : x.node.parentElement);
      log.push({ t: Math.round(e.startTime - t0), s: `SHIFT ${n ? n.tagName + (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ')[0] : '') : '?'} ${Math.round(x.previousRect.y)} -> ${Math.round(x.currentRect.y)}` });
    }
  }).observe({ type: "layout-shift" });
  const sv = document.startViewTransition;
  document.startViewTransition = function (arg) {
    log.push({ t: Math.round(performance.now() - t0), s: "VT start" });
    const tr = sv.call(this, arg);
    tr.ready.then(() => log.push({ t: Math.round(performance.now() - t0), s: "VT ready" }), () => log.push({ t: Math.round(performance.now() - t0), s: "VT ready rejected" }));
    tr.updateCallbackDone.then(() => log.push({ t: Math.round(performance.now() - t0), s: "VT update done" }), () => {});
    return tr;
  };
  let last = "";
  const frame = () => {
    const parts = [location.pathname + location.hash];
    for (const sel of watch) {
      const el = document.querySelector(sel);
      if (!el) parts.push(`${sel}=none`);
      else {
        const r = el.getBoundingClientRect();
        parts.push(`${sel}=${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    const s = parts.join(" | ");
    if (s !== last) log.push({ t: Math.round(performance.now() - t0), s });
    last = s;
    if (performance.now() - t0 < 10000) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  new MutationObserver((recs) => {
    for (const r of recs) {
      for (const [kind, list] of [["added", r.addedNodes], ["removed", r.removedNodes]]) {
        for (const n of list) {
          if (n.nodeType !== 1) continue;
          for (const sel of watch) {
            if (n.matches?.(sel) || n.querySelector?.(sel)) log.push({ t: Math.round(performance.now() - t0), s: `MUT ${kind} ${sel}` });
          }
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}, WATCH);
const cdp = await ctx.newCDPSession(page);
if (one("--cpu", null)) await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(one("--cpu")) });
await page.evaluate(() => (window.__tap = Math.round(performance.now() - window.__t0)));
if (PUSH) await page.evaluate((h) => window.next.router.push(h), PUSH);
else await tapAt(cdp, box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(MS);
const log = await page.evaluate(() => ({ tap: window.__tap, log: window.__probe }));
console.log(`tap at ${log.tap}ms`);
for (const l of log.log) console.log(`${String(l.t - log.tap).padStart(6)}ms ${l.ev ? `${l.ev} ${l.url}` : l.s}`);
await browser.close();
