// Build 98 note 7 (his word of 2026-11-15, about 21:30 UTC, over the books sheet: "incorporate the change Bible
// version with this screen"): the version being read at the books sheet's head, a tap turning the sheet to the
// versions and back, the line under the chapter's title opening the same sheet on its versions, and a choice
// that keeps the reader's verse. Done with a finger's taps on the export as the Android shell shows it, at 390,
// 800 and 1032 and in Arabic, each view held to checkMock with pixels on the five palettes, the two earned by
// reading and the fourteen looks. At 390 the World English Bible is downloaded from the branch's own web build
// running here (as scripts/gate/bible-downloads-local.mjs answers it) and chosen from verse 20 of Luke 10.
// Run from the repository's root; writes nothing.
//   node scripts/gate/books-version.mjs [export folder, default out/] [web, default http://localhost:3000]
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { EVERY, checkMock } from "../mock-check.mjs";

const OWN = "/opt/pw-browsers/chromium";
const ROOT = new URL("../..", import.meta.url).pathname;
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const WEB = process.argv[3] ?? "http://localhost:3000";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
let faults = 0;
const say = (ok, what) => {
  if (!ok) faults += 1;
  console.log(`${ok ? "ok   " : "FAULT"} ${what}`);
};

for (const [w, h, lang] of [[390, 844, "en"], [800, 1280, "en"], [1032, 1366, "en"], [390, 844, "ar"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: w < 700, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await pinMotion(ctx, "on");
  await ctx.addInitScript((lang) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      if (lang !== "en") localStorage.setItem("CapacitorStorage.purify_locale", lang);
    } catch {}
  }, lang);
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(/^https:\/\/purifyapp\.net\/(bibles\/|icon-192\.png)/, async (route) => {
    const u = new URL(route.request().url());
    try {
      return route.fulfill({ response: await route.fetch({ url: `${WEB}${u.pathname}`, headers: { ...route.request().headers(), origin: "https://localhost" } }) });
    } catch {
      return route.abort();
    }
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (loc) => {
    const b = await loc.boundingBox().catch(() => null);
    if (!b) return false;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
    await page.waitForTimeout(50);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(1100);
    return true;
  };
  const state = () =>
    page.evaluate(() => {
      const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => x.getBoundingClientRect().height > 0);
      if (d) d.setAttribute("data-books-check", "1");
      const v = d?.querySelector("[data-books-version]");
      return { open: !!d, books: !!d?.querySelector("[data-books-sheet]"), versions: !!d?.querySelector("[data-books-versions]"), rows: d?.querySelectorAll("[data-books-versions] button").length ?? 0, label: v?.textContent.trim() ?? null, expanded: v?.getAttribute("aria-expanded") ?? null, title: d?.querySelector("p")?.textContent.trim() ?? null };
    });
  const held = async (what) => {
    const r = await checkMock(page, '[data-books-check="1"]', { pixels: true, palettes: EVERY });
    say(r.failures.length === 0, `${w} ${lang}: ${what} on the five palettes, the two earned and the fourteen looks${r.failures.length ? `: ${r.failures.slice(0, 4).map((f) => `${f.check} [${f.palette}] ${f.what}: ${f.detail}`.slice(0, 200)).join("; ")}` : ""}`);
  };
  const closeLabel = JSON.parse(fs.readFileSync(path.join(ROOT, `lib/i18n/messages/${lang}.json`), "utf8"))["common.close"];
  const close = () => page.locator(`[data-books-check="1"] button[aria-label="${closeLabel}"]`).first();

  await go(page, "/bible/luke/10/", { timeout: 60000 });
  await page.waitForTimeout(2000);
  // The books, from the chapter's title.
  await tap(page.locator("[data-title-books]").filter({ visible: true }).first());
  let s = await state();
  say(s.open && s.books && !!s.label && s.expanded === "false", `${w} ${lang}: the books sheet opens with "${s.title}" and the version "${s.label}" at its head`);
  await held("the books with the version at their head");
  // The version tapped: the same sheet turns to the versions.
  await tap(page.locator('[data-books-check="1"] [data-books-version]'));
  s = await state();
  say(s.open && s.versions && !s.books && s.rows >= 2 && s.expanded === "true", `${w} ${lang}: a tap on the version turns the sheet to the versions (${s.rows} rows), the chevron turned`);
  await held("the versions");
  // And back.
  await tap(page.locator('[data-books-check="1"] [data-books-version]'));
  s = await state();
  say(s.open && s.books && !s.versions, `${w} ${lang}: a second tap turns it back to the books`);
  await tap(close());
  s = await state();
  say(!s.open, `${w} ${lang}: the sheet's close shuts it`);
  // The line under the title opens the same sheet on its versions; the version read, chosen, closes it.
  await tap(page.locator("[data-title-translation]").filter({ visible: true }).first());
  s = await state();
  say(s.open && s.versions && !s.books, `${w} ${lang}: the line under the title opens the same sheet on its versions`);
  await tap(page.locator('[data-books-check="1"] [data-books-versions] button[aria-current="true"]').first());
  s = await state();
  say(!s.open, `${w} ${lang}: the version chosen there closes it, as the line's own sheet did`);

  if (w === 390 && lang === "en") {
    // From verse 20: the books sheet from the pill, the version, the World English Bible downloaded and chosen.
    await page.evaluate(() => document.getElementById("v20")?.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(1200);
    const before = await page.evaluate(() => Math.round(document.getElementById("v20").getBoundingClientRect().top));
    await tap(page.locator("[data-reader-pill] button[aria-haspopup='dialog']").filter({ visible: true }).first());
    await tap(page.locator('[data-books-check="1"] [data-books-version], [role=dialog] [data-books-version]').first());
    const web = page.locator('[role=dialog] [data-books-versions] button[aria-label^="Download World English Bible"]').first();
    await tap(web);
    const t0 = Date.now();
    do {
      await page.waitForTimeout(600);
      s = await state();
    } while (Date.now() - t0 < 60000 && !(s.books && s.label === "WEB"));
    say(s.open && s.books && s.label === "WEB", `390 en: the World English Bible downloaded and chosen in the sheet, which turns back to the books with "${s.label}" at its head`);
    await tap(close());
    await page.waitForTimeout(2500);
    const after = await page.evaluate(() => {
      const v = document.getElementById("v20");
      return v ? { top: Math.round(v.getBoundingClientRect().top), words: v.textContent.trim().slice(0, 60) } : null;
    });
    say(!!after && Math.abs(after.top - before) < 120, `390 en: verse 20 kept through the choice (its top at ${before} before, ${after?.top} after; now "${after?.words}")`);
  }
  await ctx.close();
}
await browser.close();
console.log(faults ? `${faults} FAULT(S)` : "no faults");
process.exit(faults ? 1 : 0);
