// Updates 31: the round's touched controls, tapped as a reader taps them, on the export (390 by 844, real touch,
// motion on): "Learn how to pray it" on Prayers (its words, its pill, where it leads), and a picture card of the
// first launch's last question (picked, numbered, its name still in its halo). Stills to <shots>.
//   NODE_USE_ENV_PROXY=1 node docs/handoffs/updates-31-walks/tap-touched.mjs <out> <shots> [ar]
import { chromium } from "/home/user/purifyapp/node_modules/playwright/index.mjs";
import { serveLikeTheShell, go, NATIVE_UA } from "/home/user/purifyapp/scripts/lib/shell-server.mjs";
import { pinMotion, motionOptions, assertMotion } from "/home/user/purifyapp/scripts/lib/motion.mjs";
const [OUT, SHOTS, LANG = "en"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const say = (ok, what) => console.log(`${ok ? "pass" : "FAIL"} ${what}`);
async function phone(first) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await pinMotion(ctx, "on");
  await ctx.addInitScript(([first, lang]) => { try { if (lang !== "en") localStorage.setItem("CapacitorStorage.purify_locale", lang); if (first) { if (!sessionStorage.getItem("f")) { sessionStorage.setItem("f", "1"); localStorage.setItem("purify:onboarded", "0"); localStorage.setItem("purify:ab.seed", "0.42"); } } else { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } } catch {} }, [first, LANG]);
  await serveLikeTheShell(ctx, OUT, {});
  return { ctx, page: await ctx.newPage() };
}
const tap = async (page, loc) => { await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); const b = await loc.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
{
  const { ctx, page } = await phone(false);
  await go(page, "/prayers/", { timeout: 30000 });
  await page.waitForTimeout(2500);
  say(!(await assertMotion(page, "on")), "Prayers: the app's motion is on");
  const all = await page.locator('a[href^="/prayers/learning/jesus-prayer"]:visible').allInnerTexts();
  console.log(`  the links to the lesson on the screen: ${JSON.stringify(all.map((t) => t.replace(/\s+/g, " ").trim()))}`);
  const said = LANG === "ar" ? "تعلّم كيف تصليها" : "Learn how to pray it";
  const link = page.locator('a[href^="/prayers/learning/jesus-prayer"]:visible', { hasText: said }).first();
  const words = (await link.innerText()).trim();
  say(!/[→←↗›»]/.test(words), `"${words}": no typed arrow`);
  const box = await link.boundingBox();
  say(box && box.height >= 44, `its pill is ${box && Math.round(box.height)}px tall`);
  await page.screenshot({ path: `${SHOTS}/prayers-pill-${LANG}.png`, clip: { x: 0, y: Math.max(0, box.y - 260), width: 390, height: 360 } });
  await tap(page, link);
  await page.waitForURL(/\/prayers\/learning\/jesus-prayer/, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  say(/\/prayers\/learning\/jesus-prayer/.test(page.url()), `a tap leads to ${new URL(page.url()).pathname}`);
  await ctx.close();
}
{
  const { ctx, page } = await phone(true);
  await go(page, "/", { timeout: 30000 });
  await page.waitForTimeout(6000);
  for (let step = 0; step < 14; step++) {
    const done = await page.evaluate(() => { const d = document.querySelector("[role=dialog]") ?? document; if (d.querySelector(".ob-pick")) return true; const w = [...d.querySelectorAll("button")].find((b) => /without an account|بدون حساب/i.test(b.textContent ?? "")); if (w) return void w.click(), false; const rows = [...d.querySelectorAll("[data-choice-row], .ob-pill, .ob-choice")]; if (rows.length && !rows.some((r) => r.getAttribute("aria-pressed") === "true" || r.getAttribute("aria-checked") === "true")) return void rows[0].click(), false; const g = [...d.querySelectorAll("button.bg-paper")].filter((b) => !b.disabled).pop(); if (g) g.click(); return false; });
    if (done) break;
    await page.waitForTimeout(1600);
  }
  await page.waitForTimeout(2500);
  const card = page.locator(".ob-pick").nth(1);
  const name = (await card.innerText()).trim();
  const halo = await card.locator(".words-halo").count();
  say(halo === 1, `"${name}": its name wears the halo`);
  await tap(page, card);
  await page.waitForTimeout(900);
  say((await card.getAttribute("aria-pressed")) === "true", `"${name}": a tap picks it`);
  say((await card.locator(".ob-pick-n").innerText().catch(() => "")).trim() === "1", `"${name}": numbered 1`);
  await page.screenshot({ path: `${SHOTS}/first-picked-${LANG}.png` });
  await tap(page, card);
  await page.waitForTimeout(900);
  say((await card.getAttribute("aria-pressed")) === "false", `"${name}": a second tap takes it out`);
  await ctx.close();
}
await browser.close();
