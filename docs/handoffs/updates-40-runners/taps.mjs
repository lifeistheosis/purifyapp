// The touched controls tapped with a finger (CDP touch) on the export, online.
//   node taps.mjs <out>
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { tapAt } = await import(`${R}/lib/tap.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const out = process.argv[2];
const PIECE = { slug: "virgin-of-vladimir-icon-with-engraved-frame", title: "Virgin of Vladimir Icon With Hand Carved Frame", priceCents: 2999, currency: "usd", imageUrl: "https://avbqyvjgcrucjwevwixt.supabase.co/storage/v1/object/public/shop-media/products/1789517132387-ibkk7-image-removebg-preview-4.png", imageAlt: "Virgin of Vladimir", quantity: 1 };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const say = (ok, what) => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${what}`); };

async function open(lang, route, { cart = false, order = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on"), ...(lang !== "en" ? { locale: lang } : {}) });
  if (lang !== "en") await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
  await ctx.addInitScript(([l, c]) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", l);
      if (c && !sessionStorage.getItem("seeded")) { localStorage.setItem("purify:shop.cart", JSON.stringify(c)); sessionStorage.setItem("seeded", "1"); }
    } catch {}
  }, [lang, cart ? [PIECE] : null]);
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, out, {});
  if (order) await ctx.route(/\/rest\/v1\/shop_orders/, (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ store_id: "6e1b0000-0000-4000-8000-000000000002", store: { public_name: "EIKON" }, items: [{ product: { slug: "russian-christ-flag" } }] }) }));
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  const page = await ctx.newPage();
  await go(page, route, { timeout: 60000 });
  await page.waitForTimeout(4000);
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, cdp };
}

// 1. The agree box, in English: its reach, and what it leaves alone.
{
  const { ctx, page, cdp } = await open("en", "/shop/cart/", { cart: true });
  const box = page.locator('input[type="checkbox"]').first();
  await box.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const b = await box.boundingBox();
  const geo = await page.evaluate(() => {
    const input = document.querySelector('input[type="checkbox"]');
    const label = input.closest("label");
    const prev = label.previousElementSibling;
    const btn = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Check out" && x.offsetParent && !x.closest("[data-foot-bar]"));
    const lr = label.getBoundingClientRect();
    return { label: [lr.top, lr.bottom, lr.left], prevBottom: prev ? prev.getBoundingClientRect().bottom : null, btnTop: btn ? btn.getBoundingClientRect().top : null };
  });
  console.log(`  box ${b.width}x${b.height} at ${Math.round(b.x)},${Math.round(b.y)}; label ${geo.label.map(Math.round)}; above ends ${Math.round(geo.prevBottom)}; Check out starts ${Math.round(geo.btnTop)}`);
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  const owner = (x, y) => page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.closest("label") ? "label" : e.tagName.toLowerCase() + (e.textContent || "").trim().slice(0, 20)) : null; }, [x, y]);
  say((await owner(cx - 20, cy)) === "label", `a point 20px to the box's start side (outside its 16px) is the label's (${await owner(cx - 20, cy)})`);
  say((await owner(cx, b.y - 14)) === "label", `a point 14px above the box is the label's`);
  say((await owner(cx, geo.label[0] - 18)) !== "label", `a point 18px above the label is not (${await owner(cx, geo.label[0] - 18)})`);
  say((await owner(cx, geo.btnTop + 1)) !== "label", `Check out's top edge is Check out's (${await owner(cx, geo.btnTop + 1)})`);
  await tapAt(cdp, cx - 20, cy);
  await page.waitForTimeout(400);
  say(await box.isChecked(), "a finger 20px to the box's start side ticks it");
  await tapAt(cdp, cx + 4, b.y - 12);
  await page.waitForTimeout(400);
  say(!(await box.isChecked()), "a finger 12px above the box unticks it");
  // Unticked, Check out asks first (the clickwrap): no POST is sent, the ask is said.
  let posted = 0;
  page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/api/shop/checkout")) posted++; });
  const btn = page.locator("button", { hasText: "Check out" }).filter({ hasNot: page.locator("[data-foot-bar]") });
  const bb = await page.evaluate(() => { const x = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Check out" && !x.closest("[data-foot-bar]")); const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await tapAt(cdp, bb.x, bb.y);
  await page.waitForTimeout(800);
  const alert = await page.locator('[role="alert"]').first().textContent().catch(() => null);
  say(posted === 0 && Boolean(alert), `unticked, Check out sends nothing and asks first ("${alert}")`);
  void btn;
  await ctx.close();
}

// 2. Remove in Arabic, from 10px past its words.
{
  const { ctx, page, cdp } = await open("ar", "/shop/cart/", { cart: true });
  const rm = page.locator("li button", { hasText: "إزالة" }).first();
  await rm.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const r = await rm.boundingBox();
  console.log(`  Remove ${r.width.toFixed(1)}x${r.height.toFixed(1)} at x ${Math.round(r.x)}`);
  await tapAt(cdp, r.x - 10, r.y + r.height / 2);
  await page.waitForTimeout(800);
  const left = await page.evaluate(() => JSON.parse(localStorage.getItem("purify:shop.cart") || "[]").length);
  say(left === 0, `a finger 10px past Remove's words (Arabic) removes the piece (${left} left)`);
  await ctx.close();
}

// 3. The piece's name opens its page; the follow-up offer's name too.
for (const [route, opts, sel] of [["/shop/cart/", { cart: true }, 'li a[data-mock-allow="target"]'], ["/shop/checkout/success/?order=7b0c2f4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f", { order: true }, 'section a[data-mock-allow="target"]']]) {
  const { ctx, page, cdp } = await open("en", route, opts);
  const a = page.locator(sel).first();
  await a.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const r = await a.boundingBox();
  const before = await page.evaluate(() => location.pathname);
  await tapAt(cdp, r.x + Math.min(30, r.width / 2), r.y + Math.min(9, r.height / 2));
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => location.pathname);
  say(after !== before && after.startsWith("/shop/icons/detail"), `${route.split("?")[0]}: the name "${(await a.textContent().catch(() => "")).slice(0, 30)}" opens ${after}`);
  await ctx.close();
}
console.log(`${results.filter(Boolean).length} of ${results.length} passed`);
await browser.close();
