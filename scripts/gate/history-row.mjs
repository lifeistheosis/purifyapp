// Why the "after 451" row on /history/ will not come to the middle when scrolled into view.
import fs from "node:fs";
import { chromium } from "playwright";
import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
// The browser the session carries, as the walks launch it (scripts/tap-walk.mjs); else Playwright's own.
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
await pinMotion(ctx, "on");
await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
await serveLikeTheShell(ctx, new URL("../../out", import.meta.url).pathname, {});
const fetched = new Map();
const mainWeb = async (route) => {
  const req = route.request();
  if (req.method() !== "GET") return route.abort();
  const url = req.url();
  try {
    if (!fetched.has(url)) fetched.set(url, (async () => { const r = await fetch(url); const kept = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k))); return { status: r.status, headers: kept, body: Buffer.from(await r.arrayBuffer()) }; })());
    return route.fulfill(await fetched.get(url));
  } catch { return route.abort(); }
};
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
const page = await ctx.newPage();
await go(page, "/", { timeout: 30000 });
await page.waitForTimeout(1500);
await go(page, "/discover/");
await page.waitForTimeout(1500);
await go(page, "/history/");
await page.waitForTimeout(3500);
const probe = () => page.evaluate(() => {
  const a = [...document.querySelectorAll("a")].find((el) => /The Estrangement of the Non-Chalcedonian/.test(el.textContent || ""));
  const r = a.getBoundingClientRect();
  const se = document.scrollingElement;
  const scrollers = [];
  for (let n = a.parentElement; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (/auto|scroll/.test(cs.overflowY) && n.scrollHeight > n.clientHeight) scrollers.push(`${n.tagName.toLowerCase()}.${[...n.classList].slice(0, 3).join(".")} top ${n.scrollTop}/${n.scrollHeight - n.clientHeight}`);
  }
  const cv = [];
  for (let n = a; n && cv.length < 4; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.contentVisibility !== "visible") cv.push(`${n.tagName.toLowerCase()}.${[...n.classList].slice(0, 2).join(".")}: ${cs.contentVisibility} ${cs.containIntrinsicSize}`); }
  const h = getComputedStyle(document.documentElement);
  const li = a.closest("li");
  const prev = [];
  for (let n = li?.previousElementSibling, k = 0; n && k < 4; n = n.previousElementSibling, k++) {
    const img = n.querySelector("img");
    const ib = img?.getBoundingClientRect();
    prev.push(`${Math.round(n.getBoundingClientRect().height)}px${img ? ` img ${img.complete ? "loaded" : "waiting"} ${Math.round(ib.height)}px ${(img.getAttribute("src") || "").split("/").pop().slice(0, 28)} ${img.getAttribute("height") ? "h-attr" : "no-h"} ar:${getComputedStyle(img.parentElement).aspectRatio}/${getComputedStyle(img).aspectRatio}` : " no img"}`);
  }
  return { prev, rowTop: Math.round(r.top), rowBottom: Math.round(r.bottom), scrollY: Math.round(scrollY), max: se.scrollHeight - innerHeight, snap: h.scrollSnapType, pad: h.scrollPaddingBottom, scrollers, cv };
});
console.log("before", JSON.stringify(await probe()));
await page.evaluate(() => [...document.querySelectorAll("a")].find((el) => /The Estrangement of the Non-Chalcedonian/.test(el.textContent || "")).scrollIntoView({ block: "center" }));
for (const ms of [0, 100, 300, 600, 1000]) { await page.waitForTimeout(ms ? ms - [0,0,100,300,600][[0,100,300,600,1000].indexOf(ms)] : 0); console.log(`after ${ms}ms`, JSON.stringify(await probe())); }
await page.waitForTimeout(150);
console.log("at once", JSON.stringify(await probe()));
await page.waitForTimeout(1500);
console.log("later", JSON.stringify(await probe()));
await page.evaluate(() => window.scrollBy(0, 300));
await page.waitForTimeout(800);
console.log("+300", JSON.stringify(await probe()));
await browser.close();
