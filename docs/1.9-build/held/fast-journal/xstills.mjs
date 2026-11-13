// Stills of the Fast and the Journal from the export, for his eyes (scale 2), at a phone's and a tablet's size.
import fs from "node:fs";
import path from "node:path";
import { browser, open, go, wait, tap, PAGES, EVERY_BLOCK } from "./xlib.mjs";
const DIR = path.resolve(process.argv[2]);
const NEW = process.argv[3] === "new"; // the redrawn screens (their own marks to tap)
fs.mkdirSync(DIR, { recursive: true });
const SIZES = [["390", 390, 844], ["800", 800, 1280]];
for (const [name, width, height] of SIZES) {
  const shot = async (file, set, at, ready, prepare) => {
    const { ctx, page, errors } = await open({ width, height, scale: 2, set });
    try {
      await go(page, at);
      await page.waitForSelector(ready, { timeout: 30000 });
      await wait(1600);
      if (prepare) await prepare(page);
      await page.screenshot({ path: path.join(DIR, `${file}-${name}.png`) });
    } catch (e) { console.log(`${file}-${name}: FAILED ${String(e).slice(0, 200)}`); }
    if (errors.length) console.log(`${file}-${name}: errors`, errors.slice(0, 2));
    await ctx.close();
  };
  await shot("fast-new", {}, "/fasting", "h1");
  await shot("fast-marked", {}, "/fasting", "h1", async (page) => {
    if (NEW) {
      await tap(page, page.locator("[data-fast-mark=today] [role=radio]").nth(0));
      const rows = page.locator("[data-fast-day]");
      await rows.nth(2).scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 220));
      await wait(300);
      await tap(page, rows.nth(2));
      await wait(500);
      await tap(page, page.locator("[data-fast-days] li").nth(2).locator("[role=radio]").nth(1));
    } else {
      const marks = page.locator("button[aria-pressed]");
      await tap(page, marks.nth(0));
      await marks.nth(10).scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 220));
      await wait(300);
      await tap(page, marks.nth(10));
    }
    await wait(700);
  });
  await shot("journal-new", {}, "/journal", "[data-journal-today]");
  await shot("journal-pages", { "purify:journal": JSON.stringify(PAGES) }, "/journal", "[data-journal-today]");
  await shot("journal-list", { "purify:journal": JSON.stringify(PAGES) }, "/journal", "[data-journal-today]", async (page) => {
    await page.evaluate(() => window.scrollTo(0, 560));
    await wait(500);
  });
  await shot("journal-sheet", { "purify:journal.draft": JSON.stringify({ kind: "reflection", body: EVERY_BLOCK }) }, "/journal", "[data-journal-today]", async (page) => {
    await tap(page, page.locator("[data-journal-write]:visible").last());
    await wait(1800);
  });
}
// The redrawn sheet: the quoting and the picture. The verse's words are the app's own, read from the
// export's own chapter and kept as the app keeps a starred verse's (lib/remember/schedule.ts).
if (NEW) {
  let words = "";
  {
    const { ctx, page } = await open({});
    await go(page, "/bible/john/3");
    await page.waitForSelector("#v16", { timeout: 30000 });
    await wait(800);
    words = await page.evaluate(() => {
      const p = document.querySelector("#v16 p").cloneNode(true);
      p.querySelectorAll("a, sup, button, [aria-hidden]").forEach((el) => el.remove());
      return p.textContent.replace(/^\s*(\d+\s*)+/, "").trim();
    });
    await ctx.close();
    console.log("the verse, from the export:", JSON.stringify(words));
  }
  const kept = { "purify:remember": JSON.stringify({ entries: {}, texts: { "john/3/16": words }, items: {} }) };
  const COVERED = ["# A day in November", "[[cover arsenius-the-great.jpg]]", "What I read this morning, and what stayed with me.", "[[verse john 3:16]]", "> Begin again tomorrow.\n> ~ My grandmother", "And the last words of the page."].join("\n\n");
  const withCover = [{ ...PAGES[0], body: COVERED }, ...PAGES.slice(1)];
  for (const [name, width, height] of SIZES) {
    const shot = async (file, opts, prepare) => {
      const { ctx, page, errors } = await open({ width, height, scale: 2, ...opts });
      try {
        await go(page, "/journal");
        await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
        await wait(1600);
        await prepare(page);
        await page.screenshot({ path: path.join(DIR, `${file}-${name}.png`) });
      } catch (e) { console.log(`${file}-${name}: FAILED ${String(e).slice(0, 200)}`); }
      if (errors.length) console.log(`${file}-${name}: errors`, errors.slice(0, 2));
      await ctx.close();
    };
    const openFirst = async (page) => {
      const row = page.locator("[data-journal-entry]", { hasText: "A day in November" }).first();
      await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await wait(400);
      await tap(page, row);
      await wait(1800);
    };
    const scrollSheet = (page, top) => page.locator("[data-journal-composer]").locator("xpath=ancestor::*[contains(@class,'overflow-y-auto')][1]").evaluate((el, t) => (el.scrollTop = t), top);
    await shot("sheet-quotes", { set: { ...kept, "purify:journal.draft": JSON.stringify({ kind: "reflection", body: EVERY_BLOCK }) } }, async (page) => {
      await tap(page, page.locator("[data-journal-write]:visible").last());
      await wait(1800);
    });
    await shot("list-cover", { set: { ...kept, "purify:journal": JSON.stringify(withCover) } }, async (page) => {
      await page.evaluate(() => window.scrollTo(0, 560));
      await wait(500);
    });
    await shot("sheet-cover", { set: { ...kept, "purify:journal": JSON.stringify(withCover) } }, openFirst);
    await shot("sheet-more", { set: { ...kept, "purify:journal": JSON.stringify(withCover) } }, async (page) => {
      await openFirst(page);
      await scrollSheet(page, 300);
      await tap(page, page.locator("[data-page-toolbar] [role=toolbar] button").nth(3));
      await wait(600);
    });
    // The pictures to choose from are Plus's: shown as a reader with Plus sees them.
    await shot("sheet-cover-panel", { sells: false, set: { ...kept, "purify:journal": JSON.stringify(withCover) } }, async (page) => {
      await openFirst(page);
      await scrollSheet(page, 300);
      await tap(page, page.locator("[data-page-toolbar] [role=toolbar] button").nth(3));
      await wait(600);
      await tap(page, page.locator("[data-page-more-cover]"));
      await wait(900);
    });
  }
}
await browser.close();
console.log("stills in", DIR);
