// A book opens on its cover (1.9; components/reading/OpeningCover.tsx), opened
// on the native export the way a reader opens it, the cover held to checkMock
// on all five palettes, and a still of each screen for the owner (scale 2).
//
//   npm run build:android && node scripts/mock-opening-cover.mjs [folder]
//
// The screens: the reading room, where a cover is tapped; the book's page as
// that tap opens it, its cover over the head of its first chapter; the next
// chapter, which wears none; the same book left in the middle, gone down to
// the reader's paragraph; the page on a phone 640px tall and on one 667px
// tall, where the cover is held smaller; on Parchment; and a council's
// document from its shelf.
//
// What it draws with: the app's own books and their own words. The place a
// reader left is a paragraph of the book itself, kept as the reader keeps it
// (lib/reader/position.ts). Nothing is invented.
//
// What it cannot draw: the cover travelling. That is a motion, and it is
// checked and filmed by scripts/route-motion.mjs (--film).
import fs from "node:fs";
import path from "node:path";

import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const folder = path.resolve(process.argv[2] ?? "opening-cover-stills");
fs.mkdirSync(folder, { recursive: true });

/**
 * The books' covers are pictures the apps ask the website for and never carry
 * (lib/readAloud/covers.ts; a council's document is a window onto its
 * council's icon, under /history/media), and the shell here answers nothing
 * from outside the bundle. They are answered from the same files in this
 * checkout, which are what the website serves, as a phone with signal gets
 * them; nothing leaves this machine.
 */
async function withCovers(ctx) {
  for (const folder of ["covers", "history/media"]) {
    await ctx.route(`https://purifyapp.net/${folder}/**`, (route) => {
      const file = path.resolve("public", decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, ""));
      if (!file.startsWith(path.resolve("public", folder)) || !fs.existsSync(file)) return route.abort();
      return route.fulfill({ status: 200, contentType: file.endsWith(".avif") ? "image/avif" : "image/jpeg", body: fs.readFileSync(file) });
    });
  }
}

const BOOK = { saint: "augustine-of-hippo", work: "confessions" };
const HEAD = "[data-opening-cover]";
const COVER = `${HEAD} [data-cover]`;

let ok = true;
const shots = [];
const fail = (what) => {
  console.log(`\nFAIL  ${what}`);
  ok = false;
};

/** One screen: the cover checked where there is one, then pictured as the phone shows it. */
async function screen(page, name, label, { check = true } = {}) {
  // A phone has no pointer resting on the screen.
  await page.mouse.move(1, 1);
  await page.waitForTimeout(900);
  if (check) ok = printMockCheck(await checkMock(page, HEAD), label) && ok;
  const file = path.join(folder, `${name}.png`);
  await page.screenshot({ path: file });
  shots.push(file);
}

/** The cover's picture is in, so no still shows a plate that a picture is about to land on. */
const pictured = (page) => page.waitForSelector(`${COVER} [data-cover-picture="shown"]`, { timeout: 15000 }).catch(() => fail("the cover's picture never came"));

const first = await openPhone({ scale: 2 });
await withCovers(first.ctx);
try {
  const { page } = first;

  // The reading room, and the book's cover in it, tapped.
  await go(page, "/reading/");
  const tile = `[data-reading-row] li a[href="/saints/${BOOK.saint}/${BOOK.work}/"]`;
  await page.waitForSelector(tile, { timeout: 20000 });
  await page.locator(tile).first().scrollIntoViewIfNeeded();
  await page.evaluate((sel) => {
    const a = document.querySelector(sel);
    window.scrollTo(0, a.getBoundingClientRect().top + window.scrollY - 330);
  }, tile);
  await page.waitForSelector(`${tile} [data-cover-picture="shown"]`, { timeout: 15000 }).catch(() => {});
  await screen(page, "1-reading-room", "", { check: false });

  await page.locator(tile).first().click();
  await page.waitForSelector("[data-work-head]", { timeout: 20000 });
  await pictured(page);
  await screen(page, "2-book-opens", "a book's page as it opens: its cover over the chapter's head");
  const opened = await page.evaluate((sel) => {
    const cover = document.querySelector(sel);
    const head = document.querySelector("[data-work-head]");
    return cover && head ? { width: Math.round(cover.getBoundingClientRect().width), above: cover.getBoundingClientRect().bottom <= head.getBoundingClientRect().top } : null;
  }, COVER);
  if (!opened) fail("the book's page has no cover at its head");
  else {
    if (!opened.above) fail("the cover does not stand over the chapter's head");
    if (opened.width !== 160) fail(`on a phone 844px tall the cover is ${opened.width}px wide, not 160`);
  }

  // The next chapter, by the pill: the chapter's own page, as before.
  await page.locator('[data-work-pill] button[aria-label^="Next"]').click();
  await page.waitForFunction(() => /^#s\d+$/.test(location.hash), null, { timeout: 8000 });
  await page.waitForTimeout(600);
  if (await page.locator(COVER).count()) fail("the next chapter wears the cover too");
  await screen(page, "3-next-chapter", "", { check: false });

  // And back to the chapter the book opened on: the page as it was left.
  await page.locator('[data-work-pill] button[aria-label^="Previous"]').click();
  await page.waitForTimeout(700);
  if (!(await page.locator(COVER).count())) fail("back on the chapter the book opened on, the cover is gone");

  // The same book, left in the middle: the last paragraph of its first
  // chapter that has words. It opens on its cover and goes down to it.
  const text = JSON.parse(fs.readFileSync(path.resolve("data", "saints", BOOK.saint, `${BOOK.work}.json`), "utf8"));
  const chapter = text.sections[0];
  const at = chapter.paragraphs.map((p, i) => ({ i, words: p.trim() ? p.trim().split(/\s+/).length : 0 })).filter((p) => p.words > 0 && p.i > 0)[3];
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [
    `purify.reader.position.${BOOK.saint}/${BOOK.work}`,
    { sectionN: chapter.n, paragraph: at.i, savedAt: Date.now() },
  ]);
  await page.goto("about:blank");
  await go(page, `/saints/${BOOK.saint}/${BOOK.work}/`);
  await page.waitForSelector("[data-work-head]", { timeout: 20000 });
  const landed = await page
    .waitForFunction(([n, i]) => window.scrollY > 40 && document.querySelector(`[data-place="${n}:${i}"]`)?.getAttribute("data-focus") === "true", [chapter.n, at.i], { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (!landed) fail("a book left in the middle did not go on to the reader's paragraph");
  await page.waitForTimeout(1200);
  await screen(page, "4-left-in-the-middle", "", { check: false });
  await page.evaluate((key) => localStorage.removeItem(key), `purify.reader.position.${BOOK.saint}/${BOOK.work}`);

  // Short phones: the cover held smaller, so the book's first lines are
  // still in sight over the chapter pill. 640px tall, pictured, and 667px
  // (an iPhone SE), measured.
  const short = async (height) => {
    await page.goto("about:blank");
    await page.setViewportSize({ width: 360, height });
    await go(page, `/saints/${BOOK.saint}/${BOOK.work}/`);
    await page.waitForSelector("[data-work-head]", { timeout: 20000 });
    await pictured(page);
    await page.waitForTimeout(900);
    return page.evaluate((sel) => {
      const cover = document.querySelector(sel);
      const words = document.querySelector("[data-work-reader] [data-place]");
      const pill = document.querySelector("[data-work-pill]");
      const line = words ? parseFloat(getComputedStyle(words).lineHeight) : 0;
      return cover && words && pill
        ? { width: Math.round(cover.getBoundingClientRect().width), room: Math.round(pill.getBoundingClientRect().top - words.getBoundingClientRect().top), line: Math.round(line) }
        : null;
    }, COVER);
  };
  for (const [height, lines] of [
    [667, 1.5],
    [640, 0.8],
  ]) {
    const small = await short(height);
    if (!small) fail(`a phone ${height}px tall: the page is missing its cover, its words or its pill`);
    else {
      if (small.width !== 112) fail(`on a phone ${height}px tall the cover is ${small.width}px wide, not the row's own 112`);
      const seen = small.room / small.line;
      if (seen < lines) fail(`on a phone ${height}px tall only ${seen.toFixed(1)} of the first lines stand over the chapter pill`);
      else console.log(`\nOn a phone ${height}px tall the cover is ${small.width}px wide and ${seen.toFixed(1)} lines of the book stand over the pill (${small.room}px).`);
    }
  }
  await screen(page, "5-small-phone", "the same on a phone 640px tall");
  await page.setViewportSize({ width: 390, height: 844 });

  // A council's document, from its council's shelf.
  await page.goto("about:blank");
  await go(page, "/reading/councils/first-nicaea/");
  const book = "[data-council-shelf] li a[href^='/councils/first-nicaea/']";
  await page.waitForSelector(book, { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.locator(book).first().click();
  await page.waitForSelector("[data-work-head]", { timeout: 20000 });
  await pictured(page);
  await screen(page, "6-council-document", "a council's document: its shelf's cover over the section's head");
} finally {
  await first.ctx.close();
}

// On Parchment, the reading palette with a light page: the cover is the same dark poster on it.
const light = await openPhone({ scale: 2, set: { "purify.reader.theme": "parchment" }, browser: first.browser });
await withCovers(light.ctx);
try {
  const { page } = light;
  await go(page, `/saints/${BOOK.saint}/${BOOK.work}/`);
  await page.waitForSelector("[data-work-head]", { timeout: 20000 });
  await pictured(page);
  const mode = await page.evaluate(() => document.documentElement.getAttribute("data-reading-mode"));
  if (mode !== "parchment") fail(`the reading palette was "${mode}", so this did not draw Parchment`);
  await screen(page, "7-parchment", "the same on Parchment");
} finally {
  await light.ctx.close();
  await first.browser.close();
}

console.log(`\nStills in ${folder}:`);
for (const file of shots) console.log(`  ${path.basename(file)}`);
process.exit(ok ? 0 : 1);
