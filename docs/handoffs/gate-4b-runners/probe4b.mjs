// Gate 4b (2026-11-15): the two screens the guardrail walk failed at 390, measured again at a calm moment.
//   eph     /bible/ephesians/4/#v26-27 (a verse link's landing): verse 1's opacity read at 0.4s steps from the
//           router push, and checkMock { pixels: true } on Dark at 1.5s (inside the landing's two-second
//           step back, components/bible/VerseFocusFlash.tsx) and again at 4s (after it).
//   eikon   /shop/eikon/ on Light: checkMock { pixels: true } on Light at 4s, the backdrop's opacity, and a still.
//   node probe4b.mjs <out dir> <shots dir> <eph|eikon>...    (a new reader, the Android shell; online, GET only)
import fs from "node:fs";
import path from "node:path";
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { checkMock, WORN } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { asAndroidShell } = await import(`${R}/lib/sells-plus.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const [base, shots, ...what] = process.argv.slice(2);
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const only = (name) => WORN.filter(([n]) => n === name);
const count = (r) => ({ failures: r.failures.length, sample: r.failures.slice(0, 2).map((f) => (typeof f === "string" ? f : JSON.stringify(f)).slice(0, 160)) });

for (const w of what) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
  await pinMotion(ctx, "on");
  await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, path.resolve(base), {});
  for (const u of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(u, mainWeb);
  const page = await ctx.newPage();
  await go(page, "/", { timeout: 60000 });
  await page.waitForTimeout(2500);
  const rec = { what: w };
  if (w === "eph") {
    const t0 = Date.now();
    await go(page, "/bible/ephesians/4/#v26-27", { timeout: 60000 });
    rec.opacity = [];
    for (let k = 0; k < 10; k++) {
      rec.opacity.push(await page.evaluate(() => {
        const v = document.getElementById("v1");
        return { focus: document.documentElement.hasAttribute("data-verse-focus"), v1: v ? +getComputedStyle(v).opacity : null };
      }).then((o) => ({ ms: Date.now() - t0, ...o })));
      await page.waitForTimeout(400);
    }
    await go(page, "/", { timeout: 60000 });
    await page.waitForTimeout(2000);
    await go(page, "/bible/ephesians/4/#v26-27", { timeout: 60000 });
    await page.waitForTimeout(1500);
    rec.at1500 = count(await checkMock(page, "body", { pixels: true, palettes: only("Dark") }));
    await page.waitForTimeout(2500);
    rec.at4000 = count(await checkMock(page, "body", { pixels: true, palettes: only("Dark") }));
  }
  if (w === "eikon") {
    await go(page, "/shop/eikon/", { timeout: 60000 });
    await page.waitForTimeout(4000);
    rec.light = count(await checkMock(page, "body", { pixels: true, palettes: only("Light") }));
    await page.evaluate(() => document.documentElement.setAttribute("data-reading-mode", "parchment"));
    await page.waitForTimeout(800);
    rec.backdrop = await page.evaluate(() => {
      const d = document.querySelector(".dark-island > div[aria-hidden]");
      const h = document.querySelector(".dark-island h1");
      return { backdrop: d ? { bg: getComputedStyle(d).backgroundColor, opacity: getComputedStyle(d).opacity, z: getComputedStyle(d).zIndex } : null, h1: h ? getComputedStyle(h).color : null, body: getComputedStyle(document.body).backgroundColor };
    });
    await page.screenshot({ path: path.join(shots, "eikon-light.png") });
  }
  console.log(JSON.stringify(rec));
  await ctx.close();
}
await browser.close();
