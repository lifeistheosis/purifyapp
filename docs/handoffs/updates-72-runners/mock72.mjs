// Updates 72: checkMock { pixels: true } on the shop home's error state ("We couldn't reach the
// shop"), the export served as the shell serves it with no network, from Discover's Shop door's
// own page. Every width and language given, on the five palettes and the fourteen looks.
//   node mock72.mjs <out dir> 390@en 390@ar 800@en ...
import fs from "node:fs";
import path from "node:path";
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { checkMock, WORN, LOOKS } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);

const [base, ...specs] = process.argv.slice(2);
const OUT = path.resolve(base);
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
const messages = (l) => JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/${l}.json`, "utf8"));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let failed = 0;
for (const spec of specs) {
  const [w, lang] = spec.split("@");
  const width = Number(w);
  const said = messages(lang)["shop.couldntReachTheShop"];
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHT[width] ?? 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 700, hasTouch: true, userAgent: NATIVE_UA,
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
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  await go(page, "/", { timeout: 60000 });
  await page.waitForTimeout(1500);
  await go(page, "/shop/", { timeout: 60000 });
  await page.getByText(said, { exact: true }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  const where = await page.evaluate((said) => {
    const p = [...document.querySelectorAll("p")].find((e) => e.textContent.trim() === said);
    const home = p?.closest('[class*="max-w-[1200px]"]');
    if (!home) return null;
    home.setAttribute("data-run72", "");
    const card = home.querySelector("section.shop-feature");
    const frame = card?.querySelector("[aria-hidden] > div");
    return {
      dir: document.documentElement.dir || "ltr",
      card: card ? Math.round(card.getBoundingClientRect().height) : null,
      frame: frame ? { cls: frame.className, h: Math.round(frame.getBoundingClientRect().height), anim: getComputedStyle(frame).animationName } : null,
      error: Math.round(p.getBoundingClientRect().top),
    };
  }, said);
  if (!where) throw new Error(`${spec}: the error state was not found`);
  await page.screenshot({ path: path.join(process.env.SHOTS ?? ".", `mock72-${width}-${lang}.png`) });
  const res = await checkMock(page, "[data-run72]", { pixels: true, palettes: [...WORN, ...LOOKS] });
  const fails = res.failures ?? [];
  failed += fails.length;
  console.log(`${spec}: dir ${where.dir}, card ${where.card}px, kept frame ${where.frame ? `${where.frame.h}px, animation ${where.frame.anim}` : "none"}, error at ${where.error}; checkMock: ${fails.length} failure(s), ${(res.unmeasured ?? []).length} unmeasured, ${(res.allowed ?? []).length} allowed`);
  for (const f of fails.slice(0, 12)) console.log(`   FAIL ${f.check} ${f.palette ?? ""} ${f.what}: ${f.detail}`);
  await ctx.close();
}
await browser.close();
console.log(failed ? `\n${failed} failure(s)` : "\ncheckMock: every spec passed");
process.exit(failed ? 1 : 0);
