// The pages Theology's four lists open, in the house style (1.9;
// components/theology/LeafPage.tsx): a topic, a heresy, an answer and the
// Creed line by line, opened on the native export the way a reader opens
// them, each held to checkMock on all five palettes, and stills of each for
// the owner (scale 2).
//
//   npm run build:android && node scripts/mock-leaf-pages.mjs [folder]
//
// The screens: each kind's page as it opens, and its parts further down (the
// Fathers' words, the council's own, what it leads to). Two more are checked
// and not pictured, since they draw what the first four do not: an error
// whose council stands outside the seven and whose words are in a history
// page (Barlaam's), and an answer whose Fathers are not yet gathered (On
// deism).
//
// What it draws with: the app's own pages and their own words. Nothing is
// invented.
//
// What it cannot draw: a row's mark travelling to the head. That is a motion,
// checked and filmed by scripts/route-motion.mjs (--film).
import fs from "node:fs";
import path from "node:path";

import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const folder = path.resolve(process.argv[2] ?? "leaf-page-stills");
fs.mkdirSync(folder, { recursive: true });

const PAGE = "[data-leaf-page]";
const TYPES = { ".avif": "image/avif", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

/**
 * The Fathers' portraits and the councils' pictures are asked of the website
 * in the apps, which do not carry them (lib/today/saintFaces.ts,
 * lib/councils/page.ts), and the shell here answers nothing from outside the
 * bundle. They are answered from the same files in this checkout, which are
 * what the website serves, as a phone with signal gets them; nothing leaves
 * this machine.
 */
async function withPictures(ctx) {
  await ctx.route("https://purifyapp.net/**", (route) => {
    const file = path.resolve("public", decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, ""));
    const type = TYPES[path.extname(file).toLowerCase()];
    if (!type || !file.startsWith(path.resolve("public") + path.sep) || !fs.existsSync(file)) return route.abort();
    return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) });
  });
}

let ok = true;
const shots = [];
const fail = (what) => {
  console.log(`\nFAIL  ${what}`);
  ok = false;
};

const { browser, ctx, page } = await openPhone({ scale: 2 });
await withPictures(ctx);

/** A still of the screen as the phone shows it. */
async function still(name) {
  // A phone has no pointer resting on the screen.
  await page.mouse.move(1, 1);
  await page.waitForTimeout(900);
  const file = path.join(folder, `${name}.png`);
  await page.screenshot({ path: file });
  shots.push(file);
}

/** Bring a part of the page up under the bar, as a reader scrolls to it. */
async function upTo(selector) {
  const found = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 76);
    return true;
  }, selector);
  if (!found) fail(`${selector} is not on the page`);
  await page.waitForTimeout(700);
  return found;
}

/**
 * One page: opened, measured, checked on every palette, and pictured.
 * `parts` are the places further down that are pictured too.
 */
async function leaf(address, kind, name, { parts = [], picture = true, expects = [] } = {}) {
  await page.goto("about:blank");
  await go(page, address);
  await page.waitForSelector(`${PAGE} h1`, { timeout: 20000 });
  await page.waitForTimeout(1400);

  const seen = await page.evaluate(() => {
    const root = document.querySelector("[data-leaf-page]");
    const mark = root?.querySelector("[data-leaf-mark]");
    const back = [...document.querySelectorAll('button[aria-label="Back"], a[aria-label="Back"]')].filter((el) => el.getBoundingClientRect().width > 0);
    const box = (el) => (el ? el.getBoundingClientRect() : null);
    return {
      kind: root?.getAttribute("data-leaf-page") ?? null,
      name: root?.querySelector("h1")?.textContent?.trim() ?? "",
      mark: mark ? { how: mark.getAttribute("data-leaf-mark"), width: Math.round(box(mark).width), top: Math.round(box(mark).top) } : null,
      backs: back.length,
      wide: document.documentElement.scrollWidth - window.innerWidth,
      shell: document.querySelectorAll("[data-theology-search], [data-theology-nav]").length,
      search: Boolean(document.querySelector('[data-mobile-topbar] [aria-label="Search"]')),
    };
  });
  const label = `${name} (${address})`;
  if (seen.kind !== kind) fail(`${label}: the page is "${seen.kind}", not ${kind}`);
  if (!seen.name) fail(`${label}: the page has no name`);
  if (!seen.mark) fail(`${label}: the head wears no mark`);
  else if (seen.mark.top < 0 || seen.mark.top > 400) fail(`${label}: the head's mark is ${seen.mark.top}px down, not on the first screen`);
  // One bar and one way back: the page's own, not the apps' back bar as well.
  if (seen.backs !== 1) fail(`${label}: ${seen.backs} Back buttons on the screen, not one`);
  if (seen.wide > 0) fail(`${label}: the page is ${seen.wide}px wider than the screen`);
  if (seen.shell) fail(`${label}: the old shell's pills or its floating search are on the page`);
  if (!seen.search) fail(`${label}: the bar has no search`);
  for (const sel of expects) if (!(await page.locator(sel).count())) fail(`${label}: ${sel} is not on the page`);

  // The page's last line can be read: at the end of the page it stands over the tab bar, not under it.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  const end = await page.evaluate(() => {
    const last = document.querySelector("[data-leaf-page] article")?.lastElementChild;
    const bar = document.querySelector("[data-tab-bar]");
    return last && bar ? { last: Math.round(last.getBoundingClientRect().bottom), bar: Math.round(bar.getBoundingClientRect().top) } : null;
  });
  if (!end) fail(`${label}: no tab bar, or no last part, to measure the page's end by`);
  else if (end.last > end.bar) fail(`${label}: at the page's end its last part reaches ${end.last - end.bar}px under the tab bar`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  ok = printMockCheck(await checkMock(page, PAGE), label) && ok;
  if (!picture) return seen;
  await page.evaluate(() => window.scrollTo(0, 0));
  await still(`${name}-1`);
  let n = 2;
  for (const part of parts) {
    if (await upTo(part)) await still(`${name}-${n++}`);
  }

  // The bar takes the page's name once its heading has gone up under it.
  const barName = () =>
    page.evaluate(() => {
      const title = document.querySelector("[data-mobile-topbar] [data-topbar-title]");
      return title ? { says: title.textContent?.trim() ?? "", shown: Number(getComputedStyle(title).opacity) } : null;
    });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const before = await barName();
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(700);
  const after = await barName();
  if (!after) fail(`${label}: the bar has no place for the page's name`);
  else {
    if (after.says !== seen.name) fail(`${label}: the bar says "${after.says}", and the page is "${seen.name}"`);
    if (after.shown < 0.9) fail(`${label}: scrolled down, the bar's name is not shown`);
    if (before && before.shown > 0.1) fail(`${label}: at the top, the bar says the name the heading under it already says`);
  }
  return seen;
}

try {
  const topic = await leaf("/topics/theosis/", "topic", "topic", {
    parts: ['[data-topic-part="confessed"] li:nth-child(2)', "[data-related]"],
    expects: ["[data-leaf-lead]", "[data-citation]", "[data-related] a"],
  });
  if (topic.mark && topic.mark.how !== "picture") fail("a topic's head wears a glyph, not its subject's icon");
  if (topic.mark && topic.mark.width !== 96) fail(`a topic's picture is ${topic.mark.width}px wide, not 96`);

  await leaf("/heresies/arianism/", "heresy", "heresy", {
    parts: ['[data-heresy-part="words"]', "[data-related]"],
    expects: ["[data-heresy-facts]", '[data-heresy-part="claim"]', '[data-heresy-part="response"]', "[data-council-words]", '[data-heresy-part="condemned"] a', "[data-citation]"],
  });

  await leaf("/apologetics/atheism/", "answer", "answer", {
    parts: ['[data-answer-part="fathers"]', '[data-answer-part="scripture"]'],
    expects: ["[data-answer-line]", "[data-answer-essay] h2", "[data-answer-quote]", '[data-answer-part="scripture"] a', "[data-related] a"],
  });

  await leaf("/theology/creed/", "creed", "creed", {
    parts: ["[data-creed-sources]"],
    expects: ['[data-creed] [data-creed-article="12"]', "mark.creed-added", "[data-creed-sources] a"],
  });

  // Checked, not pictured: what the four above do not draw.
  await leaf("/heresies/barlaamism/", "heresy", "an error whose council is outside the seven", { picture: false, expects: ["[data-council-words]", '[data-heresy-part="condemned"] a'] });
  await leaf("/apologetics/deism/", "answer", "an answer whose Fathers are not yet gathered", { picture: false, expects: ['[data-answer-part="scripture"] a'] });
} finally {
  await ctx.close();
  await browser.close();
}

console.log(`\nStills in ${folder}:`);
for (const file of shots) console.log(`  ${path.basename(file)}`);
process.exit(ok ? 0 : 1);
