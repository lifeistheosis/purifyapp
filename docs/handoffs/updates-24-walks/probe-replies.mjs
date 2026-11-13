// Probe: what happens, and when, after a tap on a post's "0 replies" on /community/ (scratch, not committed).
import { chromium } from "/home/user/purifyapp/node_modules/playwright/index.mjs";
import { serveLikeTheShell, go, NATIVE_UA } from "/home/user/purifyapp/scripts/lib/shell-server.mjs";
import { pinMotion, motionOptions } from "/home/user/purifyapp/scripts/lib/motion.mjs";
import { mainWeb } from "/home/user/purifyapp/scripts/lib/main-web.mjs";

const OUT = process.argv[2];
const LABEL = process.argv[3] ?? "0 replies";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  } catch {}
  const log = (window.__probe = []);
  const t0 = () => performance.now();
  const svt = document.startViewTransition?.bind(document);
  if (svt) {
    document.startViewTransition = (cb) => {
      log.push([Math.round(t0()), "startViewTransition"]);
      const t = svt(cb);
      t.ready.then(() => log.push([Math.round(t0()), "vt ready"]), (e) => log.push([Math.round(t0()), `vt ready rejected ${e?.name}`]));
      t.finished.then(() => log.push([Math.round(t0()), "vt finished"]));
      return t;
    };
  }
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "attributes" && m.attributeName === "data-in-page") log.push([Math.round(t0()), `data-in-page ${document.documentElement.hasAttribute("data-in-page")}`]);
    }
  }).observe(document.documentElement, { attributes: true });
  const of = window.fetch;
  window.fetch = async (...a) => {
    const u = String(a[0]?.url ?? a[0]);
    const r = await of(...a);
    if (/repl/i.test(u)) log.push([Math.round(t0()), `fetch done ${u.slice(0, 90)} ${r.status}`]);
    return r;
  };
});
await pinMotion(ctx, "on");
await serveLikeTheShell(ctx, OUT, {});
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
const page = await ctx.newPage();
await go(page, "/", { timeout: 60000 });
await page.waitForTimeout(1500);
await go(page, "/community/", { timeout: 60000 });
await page.waitForTimeout(4000);
const btn = page.getByRole("button", { name: LABEL, exact: true }).first();
await btn.scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
const before = await page.evaluate(() => {
  window.__probe.length = 0;
  window.__tap = performance.now();
  const card = [...document.querySelectorAll("article")];
  return card.length;
});
// Watch the card's words frame by frame for 900ms.
await page.evaluate((label) => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === label);
  const card = b.closest("article");
  window.__card = card;
  const tap = performance.now();
  let last = "";
  const step = () => {
    const now = performance.now() - tap;
    const txt = card.innerText.replace(/\s+/g, " ").slice(-160);
    const h = Math.round(card.getBoundingClientRect().height);
    const key = `${h}|${txt}`;
    if (key !== last) window.__probe.push([Math.round(performance.now()), `card h=${h} words: ...${txt.slice(-90)}`]);
    last = key;
    if (now < 1200) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}, LABEL);
await btn.tap();
await page.waitForTimeout(1400);
const log = await page.evaluate(() => window.__probe.map(([t, s]) => `${Math.round(t - window.__tap)}ms ${s}`));
console.log(`articles: ${before}`);
for (const l of log) console.log(l);
await browser.close();
