// Updates 44's taps on the export, as a reader taps them (real touch), anchoring off on every element.
//   node taps44.mjs <out dir> <json out> [cart slugs, comma-separated]
// The buy bar's room (Updates 43's Open 1): the wall cross at 390 (English, Arabic) on Jordan, a look with a foot,
// and on Dark: the bar's height and layer measured, and whether anything between it and the page's root makes a
// layer of its own (so its z-index is weighed against the foot's); Buy now with the box not ticked (the ask line,
// no checkout asked); the box ticked; Buy now again (checkout asked once, refused here, and the line says why).
// The cart's bar on Jordan with the given slugs in the cart: its height and layer, and Check out tapped with the
// box not ticked (the summary brought up, no checkout asked).
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { LOOKS, PALETTES } = await import(`${R}/mock-check.mjs`);
const [base, outFile, slugs = ""] = process.argv.slice(2);
const JORDAN = LOOKS.find(([label]) => label === "Jordan");
const DARK = PALETTES.find(([label]) => label === "Dark");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const say = (ok, what) => {
  results.push({ ok, what });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
};

async function open(route, { width = 390, lang = "en", palette, cart = "" }) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...(lang !== "en" ? { locale: lang } : {}) });
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript(([l, c]) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
      if (c) localStorage.setItem("purify:shop.cart", c);
    } catch {}
    const put = () => {
      const s = document.createElement("style");
      s.textContent = "*, *::before, *::after { overflow-anchor: none !important; }";
      document.head.append(s);
    };
    if (document.head) put();
    else document.addEventListener("DOMContentLoaded", put);
  }, [lang, cart]);
  await serveLikeTheShell(ctx, base, {});
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const asked = [];
  // Never a real checkout: the ask is recorded and refused here. Registered last, so it runs first (Playwright runs
  // the newest matching route first; the main web's route refuses every write too, but would not count it).
  await ctx.route(/\/api\/shop\/checkout/, (r) => {
    asked.push(`${r.request().method()} ${r.request().url()}`);
    return r.abort();
  });
  const page = await ctx.newPage();
  await go(page, route, { timeout: 60000 });
  await page.waitForTimeout(3500);
  // Worn as checkMock wears it: the palette's mode, and its look or none.
  await page.evaluate(([m, l]) => {
    const h = document.documentElement;
    if (m) h.setAttribute("data-reading-mode", m);
    else h.removeAttribute("data-reading-mode");
    if (l) h.setAttribute("data-look", l);
    else h.removeAttribute("data-look");
  }, [palette[1] ?? null, palette[2] ?? null]);
  await page.waitForTimeout(600);
  return { ctx, page, asked };
}

/** The bar's place and layer, the foot's layer, and any layer of its own between the bar and the root. */
const measure = (page, selector) =>
  page.evaluate((sel) => {
    const bar = document.querySelector(sel);
    const r = bar.getBoundingClientRect();
    const cs = getComputedStyle(bar);
    const foot = getComputedStyle(document.body, "::after");
    const layers = [];
    for (let p = bar.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      const own = s.transform !== "none" || s.filter !== "none" || Number(s.opacity) < 1 || s.isolation === "isolate" || (s.zIndex !== "auto" && s.position !== "static") || /transform|opacity|filter/.test(s.willChange) || /paint|layout|strict|content/.test(s.contain) || s.backdropFilter !== "none" || s.mixBlendMode !== "normal" || s.translate !== "none" || s.scale !== "none" || s.rotate !== "none";
      if (own) layers.push(p.tagName + (p.className ? "." + String(p.className).split(" ").slice(0, 3).join(".") : ""));
    }
    return { top: Math.round(r.top), height: Math.round(r.height), z: cs.zIndex, pb: cs.paddingBottom, footZ: foot.zIndex, foot: foot.content !== "none" && foot.display !== "none", layers, look: document.documentElement.getAttribute("data-look") };
  }, selector);
const centre = async (h) => {
  const b = await h.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const line = (page) =>
  page.evaluate(() => ({
    alert: document.querySelector('[data-foot-bar] [role="alert"]')?.textContent?.trim() ?? "",
    height: Math.round(document.querySelector("[data-foot-bar] .text-crimson-soft")?.getBoundingClientRect().height ?? 0),
  }));

const tops = {};
for (const [palette, lang] of [[JORDAN, "en"], [JORDAN, "ar"], [DARK, "en"], [DARK, "ar"]]) {
  const where = `the wall cross at 390 (${lang}) on ${palette[0]}`;
  const { ctx, page, asked } = await open("/shop/icons/byzantine-three-beam-wall-cross/", { lang, palette });
  const m = await measure(page, "[data-foot-bar]");
  tops[`${palette[0]} ${lang}`] = m.top;
  const overFoot = !m.foot || (Number(m.z) > Number(m.footZ) && m.layers.length === 0);
  say(m.height <= 240 && overFoot, `${where}: the bar stands at ${m.top} to ${m.top + m.height} (${m.height}px tall, padding under it ${m.pb}); its layer ${m.z}, the foot's ${m.foot ? m.footZ : "none (no foot)"}; layers of their own between it and the root: ${m.layers.length ? m.layers.join(", ") : "none"}`);
  const buy = await page.$("[data-foot-bar] button.bg-paper");
  const box = await page.$('[data-foot-bar] input[type="checkbox"]');
  // Buy now with the box not ticked: the ask line, no checkout.
  let at = await centre(buy);
  const hit = await page.evaluate(({ x, y }) => (document.elementFromPoint(x, y)?.closest("button.bg-paper") ? "Buy now" : document.elementFromPoint(x, y)?.tagName), at);
  await page.touchscreen.tap(at.x, at.y);
  await page.waitForTimeout(900);
  const l1 = await line(page);
  const m1 = await measure(page, "[data-foot-bar]");
  say(hit === "Buy now" && l1.alert.length > 0 && l1.height > 0 && asked.length === 0 && !(await box.isChecked()), `${where}: the finger at Buy now meets ${hit}; tapped with the box not ticked, the ask line shown (${l1.height}px, "${l1.alert.slice(0, 40)}"), the bar now from ${m1.top}; checkout asked ${asked.length} time(s)`);
  // The box ticked from its reach.
  const reach = (await box.evaluateHandle((i) => i.parentElement)).asElement();
  at = await centre(reach);
  await page.touchscreen.tap(at.x, at.y);
  await page.waitForTimeout(700);
  const l2 = await line(page);
  say((await box.isChecked()) && l2.alert === "" && asked.length === 0, `${where}: the box ticked from its reach, the ask line folded (${l2.height}px); checkout asked ${asked.length} time(s)`);
  // Buy now with the box ticked: checkout asked once, refused here; the line says why.
  at = await centre(buy);
  await page.touchscreen.tap(at.x, at.y);
  await page.waitForTimeout(2500);
  const l3 = await line(page);
  say(asked.length === 1 && l3.alert.length > 0 && page.url().includes("/shop/icons/byzantine-three-beam-wall-cross"), `${where}: Buy now with the box ticked asked checkout ${asked.length} time(s), refused in the walk; the line reads "${l3.alert.slice(0, 48)}"; the page stayed`);
  await ctx.close();
}
say(tops["Jordan en"] === tops["Dark en"] && tops["Jordan ar"] === tops["Dark ar"], `the bar's top on Jordan as on Dark: ${JSON.stringify(tops)}`);

if (slugs) {
  const cart = JSON.stringify(slugs.split(",").map((slug) => ({ slug, title: slug, priceCents: 4500, currency: "USD", quantity: 1 })));
  for (const lang of ["en", "ar"]) {
    const where = `the cart at 390 (${lang}) on Jordan`;
    const { ctx, page, asked } = await open("/shop/cart/", { lang, palette: JORDAN, cart });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    const sel = "[data-foot-bar].safe-pb";
    const m = await measure(page, sel);
    const shown = m.top < 844 - 20;
    say(shown && m.height <= 240 && Number(m.z) > Number(m.footZ) && m.layers.length === 0, `${where}: the bar ${shown ? "shown" : "not shown"} at ${m.top} to ${m.top + m.height} (${m.height}px, padding ${m.pb}); its layer ${m.z}, the foot's ${m.footZ}; layers of their own above it: ${m.layers.length ? m.layers.join(", ") : "none"}`);
    const button = await page.$(`${sel} button.bg-paper`);
    const at = await centre(button);
    await page.touchscreen.tap(at.x, at.y);
    await page.waitForTimeout(1800);
    const after = await measure(page, sel);
    say(after.top >= 844 - 4 && asked.length === 0, `${where}: Check out tapped with the box not ticked: the summary brought up and the bar gone (its top ${after.top}); checkout asked ${asked.length} time(s)`);
    await ctx.close();
  }
}

fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length} of ${results.length} pass`);
await browser.close();
