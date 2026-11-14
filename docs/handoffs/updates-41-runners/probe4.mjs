// Fault 4 probe: /plans/acts/, Mark day 1 to 5 as read, the open reader, scroll anchoring off on every
// element (as WebKit has none), each circle followed frame by frame from the tap.
//   node probe4.mjs <base: http://localhost:3100 | out dir> [anchor:on|off] [days]
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const [base, anchor = "off", daysArg = "5"] = process.argv.slice(2);
const DEV = base.startsWith("http");
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
await ctx.addInitScript(([dev, off]) => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
    if (dev) localStorage.setItem("purify:force-native", "1");
  } catch {}
  if (off) {
    const put = () => {
      const s = document.createElement("style");
      s.textContent = "*, *::before, *::after { overflow-anchor: none !important; }";
      document.head.append(s);
    };
    if (document.head) put();
    else document.addEventListener("DOMContentLoaded", put);
  }
}, [DEV, anchor === "off"]);
if (!DEV) await serveLikeTheShell(ctx, base, {});
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror", String(e).slice(0, 200)));
if (DEV) await page.goto(`${base}/plans/acts`, { waitUntil: "load", timeout: 240000 });
else await go(page, "/plans/acts/", { timeout: 60000 });
await page.waitForSelector("[data-plan-path] ol button", { timeout: 120000 });
await page.waitForTimeout(2500);
console.log("anchoring:", await page.evaluate(() => getComputedStyle(document.documentElement).overflowAnchor));
const results = [];
for (let d = Number(process.env.START || 1); d <= Number(daysArg); d++) {
  const sel = `[data-plan-path] ol button[aria-pressed="false"]`;
  const handle = await page.evaluateHandle((d) => [...document.querySelectorAll("[data-plan-path] ol li button")].find((b) => (b.textContent || "").trim() === String(d)) ?? null, d);
  const el = handle.asElement();
  if (!el) { console.log(`day ${d}: no circle`); continue; }
  await el.evaluate((b) => b.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(700);
  const box = await el.boundingBox();
  // Follow it frame by frame from the tap, for 1.5s.
  await el.evaluate((b) => {
    const frames = [];
    const t0 = performance.now();
    window.__f = { frames, done: false };
    const step = () => {
      frames.push({ t: Math.round(performance.now() - t0), top: Math.round(b.getBoundingClientRect().top * 10) / 10, y: Math.round(window.scrollY * 10) / 10, vt: document.documentElement.hasAttribute("data-in-page") });
      if (performance.now() - t0 < 1500) requestAnimationFrame(step);
      else window.__f.done = true;
    };
    requestAnimationFrame(step);
  });
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForFunction(() => window.__f?.done, null, { timeout: 5000 });
  const frames = await page.evaluate(() => window.__f.frames);
  const was = frames[0].top;
  const worst = frames.reduce((m, f) => (Math.abs(f.top - was) > Math.abs(m) ? f.top - was : m), 0);
  const end = frames[frames.length - 1].top - was;
  const pressed = await el.getAttribute("aria-pressed");
  results.push({ day: d, pressed, was, worst, end, scrolled: frames[frames.length - 1].y - frames[0].y });
  console.log(`day ${d}: pressed=${pressed} worst ${worst.toFixed(1)}px end ${end.toFixed(1)}px scrolled ${(frames[frames.length - 1].y - frames[0].y).toFixed(1)} | ` + frames.filter((f, i) => i < 14 || Math.abs(f.top - was) >= 1).slice(0, 18).map((f) => `${f.t}:${(f.top - was).toFixed(0)}${f.vt ? "v" : ""}/${f.y}`).join(" "));
}
fs.writeFileSync("/tmp/claude-0/-home-user-purifyapp/a6ff7032-5871-5aae-ac17-077a8f437292/scratchpad/probe4.json", JSON.stringify(results));
await browser.close();
