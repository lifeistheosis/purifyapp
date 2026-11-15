// Build 98 note 5, his words (2026-11-15 about 21:14 UTC): "still wanted you to be able to quote from here by
// linking real works from purify". The editor's Quote searches Purify's library (components/journal/
// LibraryQuote.tsx, lib/journal/libraryQuote.ts).
//
// On the export, as the Android shell serves it: the journal, Write, then the Quote tool tapped as a reader taps
// (a touch), "Incarnation" typed, St Athanasius's On the Incarnation opened to its passages, "became man" found
// in them, and the first passage tapped. It must land as a library quote: the passage's words, the Father and
// the work named, "Quoted from Purify's library", and Open leading to the work's section inside the app. Then
// "Words of your own" lays an empty quote of one's own, with no library mark.
//
// Then checkMock with pixels, on the five palettes and every look, at 390, 800 and 1032, in English and in
// Arabic: the Quote's search with its results, a work's passages, and the page with the quote laid.
//
//   node scripts/gate/export.mjs, then:
//   node scripts/quote-library-walk.mjs [out] [--width 390] [--no-looks]
import path from "node:path";

import { chromium } from "playwright";

import { checkMock, printMockCheck, PALETTES, LOOKS } from "./mock-check.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const OUT = path.resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "out");
const only = process.argv.includes("--width") ? Number(process.argv[process.argv.indexOf("--width") + 1]) : null;
const looks = !process.argv.includes("--no-looks");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let failed = 0;
const say = (ok, line) => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${line}`);
};

async function phone(width, height, lang) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  const set = { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...(lang === "ar" ? { "CapacitorStorage.purify_locale": "ar" } : {}) };
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, set);
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return { ctx, page, errors };
}

/** A tap with a finger, at the middle of what the selector names. */
async function tap(page, selector) {
  const el = page.locator(`${selector} >> visible=true`).first();
  await el.waitFor({ timeout: 20000 });
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (!box) throw new Error(`${selector} is not on the screen`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + Math.min(box.height / 2, 22));
}

/** Typing as the keyboard does, into the field the selector names. */
async function type(page, selector, words) {
  await tap(page, selector);
  await page.keyboard.type(words, { delay: 15 });
}

for (const [w, h] of [[390, 844], [800, 1280], [1032, 1376]].filter(([w]) => !only || w === only)) {
  for (const lang of ["en", "ar"]) {
    const label = `${w} ${lang}`;
    const { ctx, page, errors } = await phone(w, h, lang);
    await go(page, "/journal/");
    await page.waitForTimeout(1500);
    await tap(page, "[data-journal-write]");
    await page.waitForSelector("[data-page-toolbar] [role=toolbar]", { timeout: 20000 });
    await page.waitForTimeout(900);
    await tap(page, "[data-page-toolbar] [role=toolbar] button:nth-child(2)");
    await page.waitForSelector("[data-quote-library] input", { timeout: 10000 });
    await type(page, "[data-quote-library] input", "Incarnation");
    const work = '[data-quote-page^="/saints/athanasius-the-great/on-the-incarnation"]';
    const found = await page.locator(work).first().waitFor({ timeout: 15000 }).then(() => true, () => false);
    say(found, `${label}: the Quote's search finds On the Incarnation (${await page.locator("[data-quote-page]").count()} pages, ${await page.locator("[data-quote-own]").count()} row of one's own words)`);
    const dialog = '[role="dialog"]';
    const palettes = looks ? [...PALETTES, ...LOOKS] : PALETTES;
    if (found) {
      const r1 = await checkMock(page, dialog, { pixels: true, palettes });
      say(printMockCheck(r1, `the Quote's library search, ${label}`), "checkMock above");
      await tap(page, work);
      await page.waitForSelector("[data-quote-passage], [data-quote-passages] li", { timeout: 20000 });
      await page.waitForTimeout(600);
      await type(page, "[data-quote-passages] input", "became man");
      await page.waitForTimeout(500);
      const passages = await page.locator("[data-quote-passage]").count();
      say(passages > 0, `${label}: the work's passages holding "became man": ${passages}`);
      const r2 = await checkMock(page, dialog, { pixels: true, palettes });
      say(printMockCheck(r2, `a work's passages, ${label}`), "checkMock above");
      const words = (await page.locator("[data-quote-passage]").first().textContent())?.trim() ?? "";
      await tap(page, "[data-quote-passage]");
      await page.waitForSelector("[data-page-library]", { timeout: 10000 });
      await page.waitForTimeout(600);
      const laid = await page.evaluate(() => {
        const fig = [...document.querySelectorAll("[data-page-library]")].pop();
        const a = fig?.querySelector("[data-page-library-source]");
        return { text: fig?.querySelector("blockquote, p")?.textContent?.trim() ?? fig?.textContent ?? "", cite: a?.textContent?.trim() ?? "", href: a?.getAttribute("href") ?? "", all: fig?.textContent ?? "" };
      });
      say(laid.all.includes(words.slice(0, 60)), `${label}: the passage laid word for word ("${words.slice(0, 50)}...")`);
      say(/Athanasius|أثناسيوس/.test(laid.cite) && /Incarnation|التجسد/.test(laid.cite), `${label}: cited "${laid.cite}"`);
      say(/^\/saints\/athanasius-the-great\/on-the-incarnation\/?#s\d+$/.test(laid.href), `${label}: Open leads to ${laid.href}`);
      const r3 = await checkMock(page, dialog, { pixels: true, palettes });
      say(printMockCheck(r3, `the page with the library quote laid, ${label}`), "checkMock above");
      // Words of one's own, the second choice: an empty quote of one's own, never the library's mark.
      const libraryBefore = await page.locator("[data-page-library]").count();
      await tap(page, "[data-page-toolbar] [role=toolbar] button:nth-child(2)");
      await tap(page, "[data-quote-own]");
      await page.waitForTimeout(600);
      const own = await page.evaluate(() => document.activeElement?.closest("[data-page-library]") === null && document.activeElement?.tagName === "TEXTAREA");
      say(own && (await page.locator("[data-page-library]").count()) === libraryBefore, `${label}: Words of your own opens a quote of one's own, with no library mark`);
    }
    say(errors.length === 0, `${label}: page errors ${errors.length ? errors.slice(0, 2).join(" | ") : "none"}`);
    await ctx.close();
  }
}
await browser.close();
console.log(failed ? `${failed} FAIL` : "all ok");
process.exit(failed ? 1 : 0);
