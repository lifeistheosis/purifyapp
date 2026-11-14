// checkMock with pixels on Updates 46's touched screens (from Updates 44's mockrun44.mjs).
// States: shop (/shop/, with two pieces looked at before so the row of them shows), piece (the Virgin of Vladimir's
// page, /shop/icons/detail/?slug=..., the export's page for a piece), drawer (the wall cross's page with the cart
// drawer opened by Add to cart).
//   node mockrun46.mjs <out dir> <jsonl> <conc> <state@width@lang@group>...
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
const ROUTE = { shop: "/shop/", piece: "/shop/icons/detail/?slug=virgin-of-vladimir-icon-with-engraved-frame", drawer: "/shop/icons/detail/?slug=byzantine-three-beam-wall-cross" };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function act(page, state) {
  if (state === "drawer") {
    const add = page.locator("[data-foot-bar] button:not(.bg-paper)").first();
    await add.click();
    await page.waitForSelector("aside.fixed.inset-y-0.end-0.z-50.translate-x-0", { timeout: 10000 });
    await page.waitForTimeout(1500);
  } else {
    await page.waitForTimeout(800);
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
  await ctx.addInitScript(([l, cart]) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
      if (cart) localStorage.setItem("purify:shop.cart", cart);
      localStorage.setItem("purify:shop.recent", JSON.stringify(["greek-christ-flag", "orthodox-cross-beanie"]));
    } catch {}
  }, [lang, state === "cart" ? JSON.stringify((process.env.CART_SLUGS ?? "").split(",").filter(Boolean).map((slug) => ({ slug, title: slug, priceCents: 4500, currency: "USD", quantity: 1 }))) : ""]);
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
