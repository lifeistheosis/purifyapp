// The round's finger taps on the export, as a reader taps them (real touch), anchoring off on every element.
//   node taps41.mjs <out dir>
// Fault 2: a sold-out piece's Save heart, on /shop/ and /shop/category/all/: the heart takes the tap
// (saved, the page stays), and the picture still opens the piece.
// Fault 3: the wall cross, Buy now with the box not ticked, at 390 (English, Arabic) and 800: Buy now
// followed frame by frame, the ask line shown, no checkout asked; then the box ticked, the box followed.
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const [base] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const say = (ok, what) => {
  results.push({ ok, what });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
};

async function open(route, { width = 390, lang = "en" } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1280 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 700, hasTouch: true, userAgent: NATIVE_UA, ...(lang !== "en" ? { locale: lang } : {}) });
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
    } catch {}
    const put = () => {
      const s = document.createElement("style");
      s.textContent = "*, *::before, *::after { overflow-anchor: none !important; }";
      document.head.append(s);
    };
    if (document.head) put();
    else document.addEventListener("DOMContentLoaded", put);
  }, lang);
  await serveLikeTheShell(ctx, base, {});
  const asked = [];
  // Never a real checkout: the ask is recorded and refused here.
  await ctx.route(/\/api\/shop\/checkout/, (r) => {
    asked.push(r.request().url());
    return r.abort();
  });
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const page = await ctx.newPage();
  await go(page, route, { timeout: 60000 });
  await page.waitForTimeout(3500);
  return { ctx, page, asked };
}

/** Follow an element's top frame by frame from now for `ms`; resolves to the worst move from where it stood. */
async function follow(page, handle, ms = 1200) {
  await handle.evaluate((el, ms) => {
    const t0 = performance.now();
    const was = el.getBoundingClientRect().top;
    window.__worst = 0;
    window.__done = false;
    const step = () => {
      const d = el.getBoundingClientRect().top - was;
      if (Math.abs(d) > Math.abs(window.__worst)) window.__worst = d;
      if (performance.now() - t0 < ms) requestAnimationFrame(step);
      else window.__done = true;
    };
    requestAnimationFrame(step);
  }, ms);
}
const worst = async (page) => {
  await page.waitForFunction(() => window.__done, null, { timeout: 10000 });
  return page.evaluate(() => Math.round(window.__worst * 10) / 10);
};
const centre = async (h) => {
  const b = await h.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

for (const route of ["/shop/", "/shop/category/all/"]) {
  const { ctx, page } = await open(route);
  const card = (await page.evaluateHandle(() => document.querySelector(".shop-vitrine.opacity-70")?.closest(".group") ?? null)).asElement();
  if (!card) {
    say(false, `${route}: no sold-out card on the page`);
    await ctx.close();
    continue;
  }
  const name = await card.evaluate((c) => c.querySelector("a[aria-label]")?.getAttribute("aria-label"));
  const heart = await card.$(".shop-vitrine button[aria-pressed]");
  await heart.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const at = await centre(heart);
  const hit = await page.evaluate(({ x, y }) => {
    const e = document.elementFromPoint(x, y);
    return e?.closest("button[aria-pressed]") ? "heart" : e?.closest("a") ? "link" : e?.tagName;
  }, at);
  const url = page.url();
  await page.touchscreen.tap(at.x, at.y);
  await page.waitForTimeout(1200);
  const pressed = await heart.getAttribute("aria-pressed").catch(() => null);
  say(hit === "heart" && page.url() === url && pressed === "true", `${route}: ${name}, sold out: the finger at the heart meets the ${hit}; after the tap saved=${pressed}, the page ${page.url() === url ? "stayed" : "went to " + page.url()}`);
  // The picture still opens the piece.
  const pic = await card.$(".shop-vitrine");
  const b = await pic.boundingBox();
  await page.touchscreen.tap(b.x + b.width * 0.3, b.y + b.height * 0.6);
  await page.waitForTimeout(2500);
  say(page.url() !== url && /\/shop\//.test(page.url()), `${route}: a tap on its picture opens the piece (${page.url().replace(/^https:\/\/localhost/, "")})`);
  await ctx.close();
}

for (const [width, lang] of [[390, "en"], [390, "ar"], [800, "en"]]) {
  const { ctx, page, asked } = await open("/shop/icons/byzantine-three-beam-wall-cross/", { width, lang });
  const buy = await page.$("[data-foot-bar] button.bg-paper");
  await buy.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const at = await centre(buy);
  await follow(page, buy);
  await page.touchscreen.tap(at.x, at.y);
  const moved = await worst(page);
  const line = await page.evaluate(() => {
    const alert = document.querySelector('[data-foot-bar] [role="alert"]');
    const shown = document.querySelector("[data-foot-bar] .text-crimson-soft");
    const r = shown?.getBoundingClientRect();
    const buyTop = document.querySelector("[data-foot-bar] button.bg-paper").getBoundingClientRect().top;
    return { alert: alert?.textContent?.trim() ?? "", height: Math.round(r?.height ?? 0), above: r ? r.bottom <= buyTop : null };
  });
  const box = await page.$('[data-foot-bar] input[type="checkbox"]');
  const ticked0 = await box.isChecked();
  say(Math.abs(moved) <= 4 && line.alert.length > 0 && line.height > 0 && asked.length === 0 && !ticked0, `the wall cross at ${width} (${lang}): Buy now with the box not ticked moved ${moved}px; the ask line shown ${line.height}px tall, ${line.above ? "over" : "under"} Buy now, read "${line.alert.slice(0, 48)}"; checkout asked ${asked.length} time(s)`);
  // The box ticked from its reach: the box followed, the line folds.
  const reach = await box.evaluateHandle((i) => i.parentElement);
  const rat = await centre(reach.asElement());
  await follow(page, box, 900);
  await page.touchscreen.tap(rat.x, rat.y);
  const boxMoved = await worst(page);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ alert: document.querySelector('[data-foot-bar] [role="alert"]')?.textContent?.trim() ?? "", height: Math.round(document.querySelector("[data-foot-bar] .text-crimson-soft")?.getBoundingClientRect().height ?? 0) }));
  say(Math.abs(boxMoved) <= 4 && (await box.isChecked()) && after.alert === "" && after.height === 0 && asked.length === 0, `the wall cross at ${width} (${lang}): the box ticked, it moved ${boxMoved}px; the line folded (${after.height}px), the alert empty; checkout asked ${asked.length} time(s)`);
  await ctx.close();
}

fs.writeFileSync("/tmp/claude-0/-home-user-purifyapp/a6ff7032-5871-5aae-ac17-077a8f437292/scratchpad/taps41.json", JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length} of ${results.length} pass`);
await browser.close();
