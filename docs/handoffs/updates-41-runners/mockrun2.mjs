// checkMock with pixels on the round's touched screens, each in the state its fault lives in.
//   node mockrun2.mjs <out dir> <jsonl> <conc> <state@width@lang@group>...
// state: sheet (1 Chronicles 1, the Translation sheet open), shop, all (/shop/category/all/),
//        buy (the wall cross, Buy now tapped with the box not ticked), plan (/plans/acts/, day 1 marked),
//        replies (/community/, the first thread with 3 or more replies open)
// group: 0 = the five and the two earned, 1 = looks 1-7, 2 = looks 8-14.
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { checkMock, WORN, LOOKS } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);

const [base, jsonl, conc, ...specs] = process.argv.slice(2);
const GROUPS = [WORN, LOOKS.slice(0, 7), LOOKS.slice(7)];
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
const ROUTE = { sheet: "/bible/1-chronicles/1/", shop: "/shop/", all: "/shop/category/all/", buy: "/shop/icons/byzantine-three-beam-wall-cross/", plan: "/plans/acts/", replies: "/community/" };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function act(page, state) {
  if (state === "sheet") {
    const b = page.locator('[data-title-translation]:visible, button[aria-haspopup]:visible[aria-label*="ranslation"]').first();
    await b.scrollIntoViewIfNeeded();
    await b.click();
    await page.locator('li button[aria-current="true"]:visible').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
  } else if (state === "buy") {
    const buy = page.locator("[data-foot-bar] button.bg-paper").first();
    await buy.scrollIntoViewIfNeeded();
    await buy.click();
    await page.waitForSelector('[data-foot-bar] [role="alert"]:not(:empty)', { state: "attached", timeout: 10000 });
    await page.waitForTimeout(1200);
  } else if (state === "plan") {
    const day = page.locator("[data-plan-path] ol li button").first();
    await day.scrollIntoViewIfNeeded();
    await day.click();
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(400);
  } else if (state === "replies") {
    await page.waitForFunction(() => [...document.querySelectorAll("button[aria-controls$='-replies']")].some((b) => Number((b.textContent || "").match(/\d+/)?.[0] ?? 0) >= 3), null, { timeout: 60000 });
    const h = (await page.evaluateHandle(() => [...document.querySelectorAll("button[aria-controls$='-replies']")].find((b) => Number((b.textContent || "").match(/\d+/)?.[0] ?? 0) >= 3))).asElement();
    await h.scrollIntoViewIfNeeded();
    await h.click();
    await page.waitForFunction((b) => { const p = document.getElementById(b.getAttribute("aria-controls")); return p && !p.querySelector('[aria-busy="true"]'); }, h, { timeout: 30000 });
    await page.waitForTimeout(1800);
  }
}

async function run(spec) {
  const [state, w, lang, g] = spec.split("@");
  const width = Number(w);
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHT[width] ?? 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 700, hasTouch: true, userAgent: NATIVE_UA,
    ...motionOptions("on"), ...(lang !== "en" ? { locale: lang } : {}),
  });
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
  }, lang);
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, base, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const t0 = Date.now();
  try {
    await go(page, ROUTE[state], { timeout: 60000 });
    await page.waitForTimeout(3500);
    await act(page, state);
    const r = await checkMock(page, "body", { pixels: true, palettes: GROUPS[Number(g)] });
    fs.appendFileSync(jsonl, JSON.stringify({ spec, ms: Date.now() - t0, failures: r.failures, unmeasured: r.unmeasured?.length ?? 0, allowed: r.allowed?.length ?? 0, errors }) + "\n");
    const kinds = {};
    for (const f of r.failures) kinds[f.check] = (kinds[f.check] ?? 0) + 1;
    console.log(`${spec}: ${r.failures.length} failure(s) ${JSON.stringify(kinds)} (${Math.round((Date.now() - t0) / 1000)}s)`);
  } catch (e) {
    fs.appendFileSync(jsonl, JSON.stringify({ spec, error: String(e).slice(0, 300) }) + "\n");
    console.log(`${spec}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}

const queue = [...specs];
await Promise.all(Array.from({ length: Number(conc) }, async () => {
  for (let s = queue.shift(); s; s = queue.shift()) await run(s);
}));
await browser.close();
