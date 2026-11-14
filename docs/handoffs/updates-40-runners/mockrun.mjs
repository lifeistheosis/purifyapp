// checkMock with pixels on routes of the export (or the dev probe), one line of JSON per run.
//   node mockrun.mjs <out dir | http://localhost:3100> <jsonl> <conc> <route@width@lang@group[@cart][@order]>...
// group: 0 = the five and the two earned (WORN), 1 = looks 1-7, 2 = looks 8-14.
// cart: the Virgin of Vladimir in the cart. order: the success page's order stood in (shop_orders GET).
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { checkMock, WORN, LOOKS } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);

const [base, jsonl, conc, ...specs] = process.argv.slice(2);
const DEV = base.startsWith("http");
const GROUPS = [WORN, LOOKS.slice(0, 7), LOOKS.slice(7)];
const HEIGHT = { 390: 844, 800: 1280, 1032: 1376 };
const PIECE = {
  slug: "virgin-of-vladimir-icon-with-engraved-frame",
  title: "Virgin of Vladimir Icon With Hand Carved Frame",
  priceCents: 2999,
  currency: "usd",
  imageUrl: "https://avbqyvjgcrucjwevwixt.supabase.co/storage/v1/object/public/shop-media/products/1789517132387-ibkk7-image-removebg-preview-4.png",
  imageAlt: "Virgin of Vladimir",
  quantity: 1,
};
const SET = [
  PIECE,
  { slug: "prayer-rope-cross-tassel", title: "Prayer Rope with Cross & Tassel", priceCents: 2995, currency: "usd", imageUrl: "/shop/media/prayer-rope-blessing-cross-tassel.png", imageAlt: "Prayer rope", quantity: 1 },
  { slug: "byzantine-three-beam-wall-cross", title: "Three-Beam Byzantine Wall Cross", priceCents: 1499, currency: "usd", imageUrl: "/shop/media/byzantine-three-beam-wall-cross.png", imageAlt: "Wall cross", quantity: 1 },
];
const ORDER = {
  store_id: "6e1b0000-0000-4000-8000-000000000002",
  store: { public_name: "EIKON" },
  items: [{ product: { slug: "russian-christ-flag" } }],
};
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});

async function run(spec) {
  const [route, w, lang, g, ...extra] = spec.split("@");
  const width = Number(w);
  const ctx = await browser.newContext({
    viewport: { width, height: HEIGHT[width] ?? 844 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    isMobile: width < 700,
    hasTouch: true,
    userAgent: NATIVE_UA,
    ...motionOptions("on"),
    ...(lang !== "en" ? { locale: lang } : {}),
  });
  const origin = DEV ? base : "https://localhost";
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: origin }]);
  await ctx.addInitScript(
    ([l, cart, dev]) => {
      try {
        localStorage.setItem("purify:onboarded", "99");
        localStorage.setItem("purify:whatsNewSeen", "99");
        localStorage.setItem("CapacitorStorage.purify_locale", l);
        if (dev) localStorage.setItem("purify:force-native", "1");
        if (cart && !sessionStorage.getItem("seeded")) {
          localStorage.setItem("purify:shop.cart", JSON.stringify(cart));
          sessionStorage.setItem("seeded", "1");
        }
      } catch {}
    },
    [lang, extra.includes("set") ? SET : extra.includes("cart") ? [PIECE] : null, DEV],
  );
  await pinMotion(ctx, "on");
  if (!DEV) await serveLikeTheShell(ctx, base, {});
  if (extra.includes("order"))
    await ctx.route(/\/rest\/v1\/shop_orders/, (r) =>
      r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(ORDER) }),
    );
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const t0 = Date.now();
  try {
    if (DEV) await page.goto(`${base}${route.replace(/\/(?=$|\?)/, "")}`, { waitUntil: "load", timeout: 180000 });
    else await go(page, route, { timeout: 60000 });
    await page.waitForTimeout(3500);
    if (extra.includes("press")) {
      const b = (await page.$$("button[aria-pressed]"))[1];
      await b.scrollIntoViewIfNeeded();
      await b.click();
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(500);
    }
    const r = await checkMock(page, "body", { pixels: true, palettes: GROUPS[Number(g)] });
    const line = { spec, ms: Date.now() - t0, failures: r.failures, unmeasured: r.unmeasured?.length ?? 0, allowed: r.allowed?.length ?? 0, errors };
    fs.appendFileSync(jsonl, JSON.stringify(line) + "\n");
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
