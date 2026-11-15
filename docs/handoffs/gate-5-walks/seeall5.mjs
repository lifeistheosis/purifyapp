// Gate 5 (2026-11-15): checkMock { pixels: true } on /reading/ with a See all's list opened in place (Updates 94's
// mend, components/reading/CoverRow.tsx openListInPlace), all 21 palettes and looks (EVERY), as no fixer measured it.
// Updates 94's offline94.mjs, reading the main web as guardrail-walk.mjs --online does (every other address
// outside the bundle aborted). Reached the app's way (a cold start at the front door, then the router); the first
// See all that opens in place ("?..." address) tapped with real touch; checkMock run on the list once it is in.
//   NODE_USE_ENV_PROXY=1 node seeall5.mjs <out dir> <jsonl> <spec>...    spec: <width>@<lang>@<new|open>
import fs from "node:fs";
import path from "node:path";

const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { checkMock, EVERY } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { asAndroidShell } = await import(`${R}/lib/sells-plus.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);

const [base, jsonl, ...specs] = process.argv.slice(2);
const OUT = path.resolve(base);
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
const messages = (l) => JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/${l}.json`, "utf8"));
const EN = messages("en");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const short = (r) => ({ failures: r.failures.map((f) => (typeof f === "string" ? f : JSON.stringify(f)).slice(0, 300)), unmeasured: r.unmeasured?.length ?? 0 });

async function run(spec) {
  const [w, lang, reader] = spec.split("@");
  const width = Number(w);
  const m = messages(lang);
  const t = (k) => m[k] ?? EN[k];
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHT[width] ?? 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA,
    ...motionOptions("on"), ...(lang !== "en" ? { locale: lang } : {}),
  });
  await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
  }, lang);
  await pinMotion(ctx, "on");
  if (reader === "new") await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route((u) => !u.href.startsWith("https://localhost"), (r) => r.abort());
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const rec = { spec };
  try {
    await go(page, "/reading/", { timeout: 60000 });
    const label = t("common.seeAll");
    const link = page.locator('a[href^="?"]', { hasText: label }).first();
    await link.waitFor({ timeout: 60000 });
    await page.waitForTimeout(2000);
    rec.href = await link.getAttribute("href");
    await link.evaluate((a) => a.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForTimeout(400);
    const b = await link.boundingBox();
    rec.link = { w: Math.round(b.width), h: Math.round(b.height) };
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(3000);
    rec.at = await page.evaluate(() => ({ search: location.search, sy: Math.round(scrollY), dir: document.documentElement.dir || "ltr", seeAllLeft: document.querySelectorAll('a[href^="?"]').length }));
    await page.screenshot({ path: path.join(path.dirname(jsonl), `seeall-${spec.replace(/@/g, "_")}.png`), scale: "css", type: "jpeg", quality: 55 });
    rec.mock = short(await checkMock(page, "body", { pixels: true, palettes: EVERY }));
    rec.errors = errors;
    console.log(`${spec}: ${rec.href} -> ${rec.at.search} sy ${rec.at.sy} dir ${rec.at.dir}; link ${rec.link.w}x${rec.link.h}; checkMock ${rec.mock.failures.length} failures, ${rec.mock.unmeasured} unmeasured; errors ${errors.length}`);
    for (const f of rec.mock.failures) console.log(`  - ${f.slice(0, 260)}`);
  } catch (e) {
    rec.error = String(e).slice(0, 300);
    rec.errors = errors;
    await page.screenshot({ path: path.join(path.dirname(jsonl), `fail-seeall-${spec.replace(/@/g, "_")}.png`), scale: "css", type: "jpeg", quality: 55 }).catch(() => {});
    console.log(`${spec}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    fs.appendFileSync(jsonl, JSON.stringify(rec) + "\n");
    await ctx.close();
  }
}

for (const s of specs) await run(s);
await browser.close();
