// The three legal pages and their sheet in the shared look (1.9;
// components/legal/LegalPage.tsx, LegalContents.tsx, legalStyle.ts): the
// Terms of Service, the Privacy Policy and EIKON's shipping and returns,
// opened on the native export the way a reader opens them, each measured,
// held to checkMock on all five palettes, and pictured for the owner
// (scale 2).
//
//   npm run build:android && node scripts/mock-legal-pages.mjs [folder]
//
// What it measures on each page: one bar and one way back, the bar taking
// the page's name once the head has gone up; the mark on the first screen;
// nothing wider than the screen; the contents folded under the opening
// words, saying how many sections the text has; opened, one row for each
// heading, in order and in the heading's own words, each a finger's 44px; a
// tap bringing its section up under the bar with no address change; and the
// page's end over the tab bar.
//
// In the sheet (from the sign-up page's line): the same text and the same
// folded list; a tap moves the sheet's own scroll and nothing beneath it,
// and leaves the history as it was, so one press of Back still closes it;
// a link inside to another of the three brings that text and its own list.
//
// In Arabic: the frame mirrors, the list's name is the reader's, and the
// English headings in it read left to right and say they are English.
//
// What it draws with: the app's own pages and their own words. Nothing is
// invented. A wide page's rail is the website's surface and is pictured
// from there.
import fs from "node:fs";
import path from "node:path";

import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const folder = path.resolve(process.argv[2] ?? "legal-page-stills");
fs.mkdirSync(folder, { recursive: true });

const PAGE = "[data-legal-page]";
let ok = true;
const shots = [];
const fail = (what) => {
  console.log(`\nFAIL  ${what}`);
  ok = false;
};

/** A still of the screen as the phone shows it. */
async function still(page, name) {
  // A phone has no pointer resting on the screen.
  await page.mouse.move(1, 1);
  await page.waitForTimeout(900);
  const file = path.join(folder, `${name}.png`);
  await page.screenshot({ path: file });
  shots.push(file);
}

/** The text's headings and the folded list beside them, as the page has them now. */
const read = (page, root) =>
  page.evaluate((sel) => {
    const at = document.querySelector(sel);
    const fold = at?.querySelector('[data-legal-contents="fold"]');
    const say = (el) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const box = (el) => el.getBoundingClientRect();
    const rows = fold ? [...fold.querySelectorAll("ul button")] : [];
    const head = fold?.querySelector(":scope > button");
    return {
      headings: at ? [...at.querySelectorAll("h2")].filter((h) => !h.closest("[data-legal-also]")).map(say) : [],
      fold: fold ? { open: head?.getAttribute("aria-expanded") === "true", height: Math.round(box(head).height), says: say(head), dir: fold.getAttribute("dir"), lang: fold.getAttribute("lang") } : null,
      rows: rows.map((r) => ({ says: say(r), height: Math.round(box(r).height), shown: box(r).height > 0, lang: r.querySelector("span")?.getAttribute("lang") ?? null, dir: r.querySelector("span")?.getAttribute("dir") ?? null })),
    };
  }, root);

/** Where the nth heading stands on the screen. */
const headingTop = (page, root, n) => page.evaluate(({ sel, n }) => Math.round([...document.querySelector(sel).querySelectorAll("h2")][n].getBoundingClientRect().top), { sel: root, n });

async function contents(page, root, label, { tap, pictures = [] } = {}) {
  const closed = await read(page, root);
  if (!closed.fold) return fail(`${label}: no contents under the opening words`);
  if (closed.fold.open) fail(`${label}: the contents are open before anyone asked`);
  if (closed.fold.height < 44) fail(`${label}: the contents' row is ${closed.fold.height}px, under a finger's 44`);
  if (!closed.fold.says.endsWith(String(closed.headings.length))) fail(`${label}: the contents say "${closed.fold.says}", and the text has ${closed.headings.length} sections`);
  if (closed.rows.some((r) => r.shown)) fail(`${label}: folded, its rows still show`);

  await page.locator(`${root} [data-legal-contents="fold"] > button`).click();
  await page.waitForTimeout(500);
  const open = await read(page, root);
  if (!open.fold?.open) fail(`${label}: a tap did not open the contents`);
  const said = open.rows.map((r) => r.says);
  if (JSON.stringify(said) !== JSON.stringify(open.headings)) fail(`${label}: the contents' rows are not the text's headings, word for word and in order`);
  const small = open.rows.filter((r) => r.height < 44);
  if (small.length) fail(`${label}: ${small.length} of the contents' rows are under 44px (${small[0].height})`);
  if (pictures[0]) await still(page, pictures[0]);

  const n = Math.min(tap ?? 2, open.rows.length - 1);
  const was = await page.evaluate(() => ({ href: location.href, length: history.length, y: window.scrollY }));
  await page.locator(`${root} [data-legal-contents="fold"] ul button`).nth(n).click();
  await page.waitForTimeout(1500);
  const top = await headingTop(page, root, n);
  const now = await page.evaluate(() => ({ href: location.href, length: history.length, y: window.scrollY }));
  if (top < 0 || top > 260) fail(`${label}: after a tap on "${said[n]}", its heading is ${top}px down the screen, not up under the bar`);
  if (now.href !== was.href || now.length !== was.length) fail(`${label}: a tap on the contents changed the address or the history`);
  if (pictures[1]) await still(page, pictures[1]);
  return { open, was, now };
}

const { browser, ctx, page } = await openPhone({ scale: 2 });
// Nothing outside the app's own bundle answers: the texts must open with no signal.
await ctx.route(/^https?:\/\/(?!localhost[:/])/, (route) => route.abort());

async function legal(address, doc, name, { bar = true, tap, cards = false } = {}) {
  await page.goto("about:blank");
  await go(page, address);
  await page.waitForSelector(`${PAGE} h1`, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const label = `${name} (${address})`;
  const seen = await page.evaluate(() => {
    const root = document.querySelector("[data-legal-page]");
    const mark = root?.querySelector("[data-legal-head] .theology-plate");
    const back = [...document.querySelectorAll('[data-mobile-topbar] button[aria-label="Back"], [data-mobile-topbar] a[aria-label="Back"]')].filter((el) => el.getBoundingClientRect().width > 0);
    return {
      doc: root?.getAttribute("data-legal-page") ?? null,
      title: root?.querySelector("[data-legal-text] h1")?.textContent?.trim() ?? "",
      name: root?.querySelector("#legal-page-name")?.textContent?.trim() ?? "",
      mark: mark ? Math.round(mark.getBoundingClientRect().top) : null,
      backs: back.length,
      wide: document.documentElement.scrollWidth - window.innerWidth,
      rail: [...document.querySelectorAll('[data-legal-contents="rail"]')].filter((el) => el.getBoundingClientRect().width > 0).length,
      gold: [...root.querySelectorAll("*")].filter((el) => /gold/.test(el.className?.toString?.() ?? "")).length,
    };
  });
  if (seen.doc !== doc) fail(`${label}: the page is "${seen.doc}", not ${doc}`);
  if (!seen.title) fail(`${label}: the text has no title`);
  if (!seen.name) fail(`${label}: the head does not name the page`);
  if (seen.mark === null || seen.mark < 0 || seen.mark > 400) fail(`${label}: the head's mark is not on the first screen`);
  if (bar && seen.backs !== 1) fail(`${label}: ${seen.backs} Back buttons in the bar, not one`);
  if (seen.wide > 0) fail(`${label}: the page is ${seen.wide}px wider than the screen`);
  if (seen.rail) fail(`${label}: the rail shows on a phone`);
  if (seen.gold) fail(`${label}: ${seen.gold} parts wear gold`);

  await still(page, `${name}-1`);

  if (bar) {
    // The bar takes the page's name once the head has gone up under it.
    const barName = () =>
      page.evaluate(() => {
        const title = document.querySelector("[data-mobile-topbar] [data-topbar-title]");
        return title ? { says: title.textContent?.trim() ?? "", shown: Number(getComputedStyle(title).opacity) } : null;
      });
    const before = await barName();
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.waitForTimeout(700);
    const after = await barName();
    if (!after) fail(`${label}: the bar has no place for the page's name`);
    else {
      if (after.says !== seen.name) fail(`${label}: the bar says "${after.says}", and the page is "${seen.name}"`);
      if (after.shown < 0.9) fail(`${label}: scrolled down, the bar's name is not shown`);
      if (before && before.shown > 0.1) fail(`${label}: at the top, the bar already says the name the head under it says`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
  }

  await contents(page, PAGE, label, { tap, pictures: [`${name}-2`, `${name}-3`] });

  // Held to the guardrails with the list open, so its rows are measured too.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  ok = printMockCheck(await checkMock(page, PAGE), label) && ok;

  if (cards) {
    await page.evaluate(() => {
      const el = document.querySelector("[data-legal-text] .theology-tray:not([data-legal-contents])");
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120);
    });
    await still(page, `${name}-cards`);
  }

  // The page's last part can be read: at the end it stands over the tab bar, not under it.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  const end = await page.evaluate(() => {
    const last = document.querySelector("[data-legal-also]");
    const tabs = document.querySelector("[data-tab-bar]");
    return last && tabs ? { last: Math.round(last.getBoundingClientRect().bottom), bar: Math.round(tabs.getBoundingClientRect().top), rows: last.querySelectorAll("a").length } : null;
  });
  if (!end) fail(`${label}: no tab bar, or no last part, to measure the page's end by`);
  else {
    if (end.last > end.bar) fail(`${label}: at the page's end its last part reaches ${end.last - end.bar}px under the tab bar`);
    if (end.rows !== 2) fail(`${label}: the foot leads to ${end.rows} texts, not the other two`);
  }
  await still(page, `${name}-end`);
}

try {
  await legal("/terms/", "terms", "terms", { tap: 12 });
  await legal("/privacy/", "privacy", "privacy", { tap: 1, cards: true });
  await legal("/shop/policies/", "shop-policies", "shop", { bar: false, tap: 3 });

  // The sheet, from the sign-up page's line.
  await page.goto("about:blank");
  await go(page, "/signup/");
  await page.waitForSelector('[data-legal-link="terms"]', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.locator('[data-legal-link="terms"]').first().click();
  const SHEET = '[data-legal-sheet="terms"]';
  await page.waitForSelector(`${SHEET} h1`, { timeout: 20000 });
  await page.waitForTimeout(1200);
  await still(page, "sheet-1");
  const beneath = await page.evaluate(() => window.scrollY);
  const got = await contents(page, SHEET, "the Terms in the sheet", { tap: 12, pictures: ["sheet-2", "sheet-3"] });
  const moved = await page.evaluate((sel) => Math.round(document.querySelector(sel).parentElement.scrollTop), SHEET);
  if (moved < 400) fail(`the Terms in the sheet: a tap on the contents moved the sheet's own scroll ${moved}px`);
  if ((await page.evaluate(() => window.scrollY)) !== beneath) fail("the Terms in the sheet: the page beneath moved");
  if (got && got.now.length !== got.was.length) fail("the Terms in the sheet: the history grew, so Back would not close the sheet in one press");
  await page.evaluate((sel) => document.querySelector(sel).parentElement.scrollTo({ top: 0 }), SHEET);
  await page.waitForTimeout(400);
  ok = printMockCheck(await checkMock(page, '[role="dialog"]'), "the Terms in the sheet") && ok;

  // A link inside to another of the three brings that text, and its own list.
  const toPrivacy = page.locator(`${SHEET} a[href="/privacy"], ${SHEET} a[href="/privacy/"]`).first();
  if (await toPrivacy.count()) {
    await toPrivacy.scrollIntoViewIfNeeded();
    await toPrivacy.click();
    await page.waitForSelector('[data-legal-sheet="privacy"] h1', { timeout: 20000 });
    await page.waitForTimeout(1200);
    const other = await read(page, '[data-legal-sheet="privacy"]');
    if (!other.fold || !other.fold.says.endsWith(String(other.headings.length)) || other.headings.length < 10) {
      fail(`the Privacy Policy in the sheet: its contents say "${other.fold?.says}", and it has ${other.headings.length} sections`);
    }
    if (other.fold?.open) fail("the Privacy Policy in the sheet: its contents arrive open");
  } else fail("the Terms in the sheet: no link to the Privacy Policy to follow");
} finally {
  await ctx.close();
}

// In Arabic: the frame mirrors, the list's name is the reader's, and the English in it reads left to right.
{
  const ar = await openPhone({ scale: 2, browser, set: { "CapacitorStorage.purify_locale": "ar" } });
  await ar.ctx.route(/^https?:\/\/(?!localhost[:/])/, (route) => route.abort());
  try {
    await go(ar.page, "/terms/");
    await ar.page.waitForSelector(`${PAGE} h1`, { timeout: 20000 });
    await ar.page.waitForFunction(() => document.documentElement.getAttribute("dir") === "rtl", null, { timeout: 20000 }).catch(() => {});
    await ar.page.waitForTimeout(1500);
    const dir = await ar.page.evaluate(() => {
      const head = document.querySelector("[data-legal-head]");
      const plate = head.querySelector(".theology-plate").getBoundingClientRect();
      const name = head.querySelector("p").getBoundingClientRect();
      const h1 = document.querySelector("[data-legal-text] h1");
      return { page: document.documentElement.getAttribute("dir"), plateRightOfName: plate.left > name.left, h1Dir: getComputedStyle(h1).direction, h1Lang: h1.closest("[lang]")?.getAttribute("lang") };
    });
    if (dir.page !== "rtl") fail(`in Arabic: the page runs ${dir.page}`);
    if (!dir.plateRightOfName) fail("in Arabic: the head does not mirror (the mark is not at the right)");
    if (dir.h1Dir !== "ltr" || dir.h1Lang !== "en") fail(`in Arabic: the English title runs ${dir.h1Dir} and says it is "${dir.h1Lang}"`);
    await still(ar.page, "arabic-1");
    await ar.page.locator(`${PAGE} [data-legal-contents="fold"] > button`).click();
    await ar.page.waitForTimeout(500);
    const list = await read(ar.page, PAGE);
    if (list.fold?.dir !== "rtl" || list.fold?.lang !== "ar") fail(`in Arabic: the contents' own name runs ${list.fold?.dir} in "${list.fold?.lang}"`);
    if (list.rows.some((r) => r.dir !== "ltr" || r.lang !== "en")) fail("in Arabic: an English heading in the contents does not read left to right as English");
    await still(ar.page, "arabic-2");
  } finally {
    await ar.ctx.close();
  }
}
await browser.close();

console.log(`\nStills in ${folder}:`);
for (const file of shots) console.log(`  ${path.basename(file)}`);
process.exit(ok ? 0 : 1);
