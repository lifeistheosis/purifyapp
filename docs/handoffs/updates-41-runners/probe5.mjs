// Fault 5 probe: /community/, a post's "N replies" tapped as a reader taps it, then followed frame by
// frame: where what it opened ends, where the page stands, whether it is still filling.
//   node probe5.mjs <base> [minReplies] [delayMs: hold the replies' answer this long] [sells: 1]
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { asAndroidShell } = await import(`${R}/lib/sells-plus.mjs`);
const [base, minArg = "3", delayArg = "0", sells = "0", pick = "0"] = process.argv.slice(2);
const DEV = base.startsWith("http");
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
await ctx.addInitScript((dev) => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
    if (dev) localStorage.setItem("purify:force-native", "1");
  } catch {}
}, DEV);
if (sells === "1") await asAndroidShell(ctx);
if (!DEV) await serveLikeTheShell(ctx, base, {});
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
const delay = Number(delayArg);
if (delay > 0)
  await ctx.route(/community.*repl|replies/i, async (route) => {
    await new Promise((r) => setTimeout(r, delay));
    await route.fallback();
  });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror", String(e).slice(0, 200)));
page.on("request", (r) => { if (/repl/i.test(r.url())) console.log("request", r.method(), r.url().slice(0, 140)); });
if (DEV) await page.goto(`${base}/community`, { waitUntil: "load", timeout: 240000 });
else await go(page, "/community/", { timeout: 60000 });
await page.waitForFunction(() => [...document.querySelectorAll("button[aria-expanded][aria-controls$='-replies']")].length > 0, null, { timeout: 120000 });
await page.waitForTimeout(3000);
const list = await page.evaluate(() => [...document.querySelectorAll("button[aria-expanded][aria-controls$='-replies']")].map((b, i) => ({ i, text: (b.textContent || "").trim(), n: Number((b.textContent || "").match(/\d+/)?.[0] ?? 0) })));
console.log("controls:", list.map((c) => `${c.i}:${c.text}`).join(" | "));
const cands = list.filter((c) => c.n >= Number(minArg));
const c = cands[Number(pick)] ?? cands[0];
if (!c) { console.log("no control with enough replies"); await browser.close(); process.exit(0); }
const handle = (await page.evaluateHandle((i) => document.querySelectorAll("button[aria-expanded][aria-controls$='-replies']")[i], c.i)).asElement();
await handle.evaluate((b) => b.scrollIntoView({ block: "center", behavior: "instant" }));
await page.waitForTimeout(800);
const box = await handle.boundingBox();
await page.evaluate((ms) => { window.__ms = ms; }, Number(process.env.MS || 6000));
await handle.evaluate((b) => {
  const frames = [];
  const t0 = performance.now();
  window.__f = { frames, done: false };
  const bar = document.querySelector("nav[aria-label], [data-tab-bar], footer nav");
  const step = () => {
    const part = document.getElementById(b.getAttribute("aria-controls"));
    const r = part?.getBoundingClientRect();
    frames.push({ t: Math.round(performance.now() - t0), y: Math.round(window.scrollY), ctl: Math.round(b.getBoundingClientRect().top), end: r ? Math.round(r.bottom) : null, busy: part ? part.querySelector('[aria-busy="true"]') !== null : null, vt: document.documentElement.hasAttribute("data-in-page") });
    if (performance.now() - t0 < (window.__ms || 6000)) requestAnimationFrame(step);
    else window.__f.done = true;
  };
  requestAnimationFrame(step);
});
await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForFunction(() => window.__f?.done, null, { timeout: 30000 });
const frames = await page.evaluate(() => window.__f.frames);
const band = await page.evaluate(() => {
  const els = [...document.querySelectorAll("body *")].filter((e) => { const s = getComputedStyle(e); return s.position === "fixed" && e.getBoundingClientRect().top > window.innerHeight / 2 && e.getBoundingClientRect().height > 30; });
  return els.map((e) => Math.round(e.getBoundingClientRect().top));
});
const pick2 = (f) => `${f.t}:y${f.y} c${f.ctl} e${f.end}${f.busy ? "B" : ""}${f.vt ? "v" : ""}`;
const changes = frames.filter((f, k) => k === 0 || f.y !== frames[k - 1].y || f.end !== frames[k - 1].end || f.busy !== frames[k - 1].busy || f.vt !== frames[k - 1].vt);
console.log(`control "${c.text}" tapped at ${Math.round(box.y)}; fixed bars below mid: ${band.join(",")}`);
console.log(changes.map(pick2).join(" | "));
const last = frames[frames.length - 1];
console.log(`END: scrolled ${last.y - frames[0].y}px, part ends at ${last.end}, control at ${last.ctl}`);
await browser.close();
