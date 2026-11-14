// The saints' page with a filter chosen, motion reduced: where the grid and the count stand, and a still of them.
//   node look.mjs <lang> <png>
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const [lang, file] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("reduce"), ...(lang !== "en" ? { locale: lang } : {}) });
if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
await ctx.addInitScript((l) => {
  localStorage.setItem("purify:onboarded", "99");
  localStorage.setItem("purify:whatsNewSeen", "99");
  localStorage.setItem("CapacitorStorage.purify_locale", l);
}, lang);
await pinMotion(ctx, "reduce");
await serveLikeTheShell(ctx, "/home/user/purifyapp/out", {});
const page = await ctx.newPage();
await go(page, "/saints/", { timeout: 60000 });
await page.waitForTimeout(2500);
const grid = () => page.evaluate(() => {
  const g = document.querySelector(".cv-card")?.parentElement;
  return g ? Math.round(g.getBoundingClientRect().top + scrollY) : null;
});
const g0 = await grid();
const b = (await page.$$("button[aria-pressed]"))[1];
await b.click();
await page.waitForTimeout(800);
const g1 = await grid();
const geo = await page.evaluate(() => {
  const g = document.querySelector(".cv-card").parentElement;
  const p = g.parentElement.querySelector(":scope > p");
  const r = p.getBoundingClientRect();
  const above = g.parentElement.previousElementSibling.getBoundingClientRect();
  return { text: p.textContent, count: [Math.round(r.left), Math.round(r.right), Math.round(r.top + scrollY), Math.round(r.height)], timelineBottom: Math.round(above.bottom + scrollY) };
});
console.log(JSON.stringify({ gridBefore: g0, gridAfter: g1, ...geo }));
await page.evaluate((y) => window.scrollTo(0, y - 260), g1);
await page.waitForTimeout(300);
await page.screenshot({ path: file, clip: { x: 0, y: 120, width: 390, height: 300 } });
await browser.close();
