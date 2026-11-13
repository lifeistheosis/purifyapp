// Probe: a tap on an author's name on /community/: the profile card's visual top (with its transform), its layout top, height and styles, frame by frame, and the layout shifts the browser reports.
import { chromium } from "/home/user/purifyapp/node_modules/playwright/index.mjs";
import { serveLikeTheShell, go, NATIVE_UA } from "/home/user/purifyapp/scripts/lib/shell-server.mjs";
import { pinMotion, motionOptions } from "/home/user/purifyapp/scripts/lib/motion.mjs";
import { mainWeb, standInFor } from "/home/user/purifyapp/scripts/lib/main-web.mjs";
import { asAndroidShell } from "/home/user/purifyapp/scripts/lib/sells-plus.mjs";
const [OUT, NAME = "Purify"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
await pinMotion(ctx, "on");
await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
await asAndroidShell(ctx);
await serveLikeTheShell(ctx, OUT, {});
for (const site of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(site, mainWeb);
await ctx.route("https://purifyapp.net/api/community/posts**", async (route) => {
  const req = route.request();
  if (req.method() !== "GET") return route.abort();
  try {
    const r = await fetch(req.url());
    const headers = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())));
    const answer = { status: r.status, headers, body: Buffer.from(await r.arrayBuffer()) };
    return route.fulfill(standInFor(req.url(), answer) ?? answer);
  } catch { return route.abort(); }
});
const page = await ctx.newPage();
await go(page, "/community/", { timeout: 30000 });
await page.waitForTimeout(3500);
await page.evaluate(() => {
  const log = (window.__p = []);
  const t0 = performance.now();
  new PerformanceObserver((l) => { for (const e of l.getEntries()) for (const s of e.sources ?? []) if (s.node?.closest?.("[data-profile-card]") === s.node) log.push(`${Math.round(e.startTime - t0)}ms SHIFT ${s.node.getAttribute?.("data-profile-card") !== null ? "card" : "?"} from ${Math.round(s.previousRect.y)} to ${Math.round(s.currentRect.y)} (h ${Math.round(s.previousRect.height)}->${Math.round(s.currentRect.height)})`); }).observe({ type: "layout-shift" });
  let last = "";
  const step = () => {
    const c = document.querySelector("[data-profile-card]");
    if (c) {
      const r = c.getBoundingClientRect();
      const key = `vis top ${Math.round(r.top)} h ${Math.round(r.height)} | layout h ${c.offsetHeight} style.h "${c.style.height}" tf "${c.style.transform}" tr "${c.style.transition}"`;
      if (key !== last) log.push(`${Math.round(performance.now() - t0)}ms ${key}`);
      last = key;
    }
    if (performance.now() - t0 < 3000) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});
const spot = await page.evaluate((name) => {
  const b = [...document.querySelectorAll("article button")].find((x) => (x.getAttribute("aria-label") || x.textContent || "").trim() === name);
  if (!b) return null;
  b.scrollIntoView({ block: "center", behavior: "instant" });
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, NAME);
console.log(`the name: ${JSON.stringify(spot)}`);
await page.waitForTimeout(600);
await page.evaluate(() => (window.__p.length = 0));
await page.touchscreen.tap(spot.x, spot.y);
await page.waitForTimeout(3200);
for (const l of await page.evaluate(() => window.__p)) console.log(l);
await browser.close();
