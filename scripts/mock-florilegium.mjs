// The Florilegium as build 89 notes 6 and 12 redrew it, opened on the native
// export the way a reader opens it, each screen held to checkMock on all five
// palettes, and a still of each for the owner (scale 2).
//
//   npm run build:android && node scripts/mock-florilegium.mjs [folder]
//
// The screens: the first page; the same with the naming field open; a
// starter's page; a starter the reader already keeps; a gathering; a gathering
// with a note being written; the Plus page's preview of it; and gathering a
// line: the Gather button under a Father's passage, the sheet it opens, the
// sheet naming a new gathering, and the same sheet from a verse in the Bible.
//
// What it draws with: gatherings of real verses, word for word from data/bible,
// and one line of a Father from the app's own library with its author and work
// (data/plans/sayings.json, which the Plus previews also draw from). Nothing
// is invented.
//
// What it cannot draw: the view of a reader whose Plus has lapsed. A build
// made here carries no purchase key, so Plus is enforced nowhere in it
// (lib/entitlements/entitlements.ts, canSell) and every reader is let in.
// That view was looked at on the website's build with Plus enforced, and is
// held in code by lib/florilegium/__tests__/lapsedReadOnly.test.ts.
import fs from "node:fs";
import path from "node:path";

import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const folder = path.resolve(process.argv[2] ?? "florilegium-stills");
fs.mkdirSync(folder, { recursive: true });

const bible = (book, chapter) => JSON.parse(fs.readFileSync(path.resolve(`data/bible/${book}/${chapter}.json`), "utf8")).verses;
const verse = (book, name, chapter, n, note) => ({
  id: `${book}-${chapter}-${n}`,
  addedAt: 1,
  kind: "scripture",
  text: bible(book, chapter).find((v) => v.n === n).text,
  reference: `${name} ${chapter}:${n}`,
  book,
  chapter,
  verse: n,
  ...(note ? { note } : {}),
});
const saying = JSON.parse(fs.readFileSync(path.resolve("data/plans/sayings.json"), "utf8")).gospels?.["69"];
const father = saying ? [{ id: "father", addedAt: 2, kind: "father", text: saying.text, author: saying.author, work: saying.work }] : [];
const prologue = JSON.parse(fs.readFileSync(path.resolve("data/florilegium/starters.json"), "utf8")).starters.find((s) => s.id === "prologue");

const mine = [
  // The reader's own copy of a starter, as Keep writes it: named and described as the starter is.
  {
    id: "kept-prologue",
    title: "The Prologue of John",
    description: "John 1:1-18",
    createdAt: 4,
    updatedAt: 4,
    items: [...prologue.lines].reverse().map((l) => verse("john", "John", 1, l.verse)),
  },
  {
    id: "on-the-light",
    title: "On the light",
    createdAt: 3,
    updatedAt: 3,
    items: [verse("john", "John", 1, 5, "Read at Pascha."), ...father, verse("john", "John", 8, 12), verse("psalms", "Psalms", 26, 1)],
  },
  { id: "for-the-fast", title: "For the fast", createdAt: 2, updatedAt: 2, items: [verse("matthew", "Matthew", 6, 21), verse("psalms", "Psalms", 50, 10)] },
];

const { browser, ctx, page } = await openPhone({ scale: 2, set: { "purify:florilegia": JSON.stringify(mine) } });
// The starters' pictures are the saints' covers, which the apps ask the
// website for and never carry (lib/readAloud/covers.ts). The shell here
// answers nothing from outside the bundle, so each would be the manuscript
// plate. They are answered from the same files in this checkout, which are
// what the website serves, as a phone with signal gets them; nothing leaves
// this machine.
await ctx.route("https://purifyapp.net/covers/**", (route) => {
  const file = path.resolve("public", decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, ""));
  if (!file.startsWith(path.resolve("public", "covers")) || !fs.existsSync(file)) return route.abort();
  return route.fulfill({ status: 200, contentType: file.endsWith(".avif") ? "image/avif" : "image/jpeg", body: fs.readFileSync(file) });
});
let ok = true;
const shots = [];

/** One screen: checked, then pictured whole. */
async function screen(name, root, label, { whole = true } = {}) {
  // A phone has no pointer resting on the screen: the one that made the last tap is put aside, so no row is lit under it.
  await page.mouse.move(1, 1);
  await page.waitForTimeout(700);
  ok = printMockCheck(await checkMock(page, root), label) && ok;
  const file = path.join(folder, `${name}.png`);
  if (whole) {
    // The whole page in one picture: a phone as tall as the page.
    const tall = await page.evaluate(() => Math.max(844, Math.min(3200, document.documentElement.scrollHeight)));
    await page.setViewportSize({ width: 390, height: tall });
    await page.waitForTimeout(500);
    await page.screenshot({ path: file });
    await page.setViewportSize({ width: 390, height: 844 });
  } else {
    await page.screenshot({ path: file });
  }
  shots.push(file);
}

try {
  await go(page, "/florilegium/");
  await page.waitForSelector("[data-florilegium-yours] a[data-gathering]", { timeout: 20000 });
  await screen("1-first-page", '[data-florilegium-page="hub"]', "the Florilegium's first page");

  await page.locator("[data-florilegium-begin]").click();
  await page.waitForSelector("#florilegium-name", { timeout: 8000 });
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  await screen("2-naming", '[data-florilegium-page="hub"]', "the first page, naming a new gathering");

  await page.goto("about:blank");
  await go(page, "/florilegium/begin/beatitudes/");
  await page.waitForSelector("[data-starter-keep]", { timeout: 20000 });
  await screen("3-starter", "[data-starter-page]", "a starter's page");

  await page.goto("about:blank");
  await go(page, "/florilegium/begin/prologue/");
  await page.waitForSelector("[data-starter-kept]", { timeout: 20000 });
  await screen("4-starter-kept", "[data-starter-page]", "a starter the reader keeps");

  await page.goto("about:blank");
  await go(page, "/florilegium/");
  await page.waitForSelector('a[data-gathering="on-the-light"]', { timeout: 20000 });
  await page.locator('a[data-gathering="on-the-light"]').click();
  await page.waitForSelector("[data-gathering-page]", { timeout: 20000 });
  await screen("5-gathering", '[data-florilegium-page="gathering"]', "a gathering");

  // The second line has no note yet: Add note opens the field.
  await page.locator("[data-gathered-line]").nth(1).locator("button").first().click();
  await page.waitForSelector("[data-gathered-line] textarea", { timeout: 8000 });
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  await screen("6-gathering-note", '[data-florilegium-page="gathering"]', "a gathering, writing a note");

  // The Plus page's preview of it, as a reader without Plus opens it: the
  // bar's Plus button on Prayers, then Try it on the Florilegium's row. (Your
  // plan draws the same preview, but only for a subscriber, whom no build
  // made here can sign in.)
  await page.goto("about:blank");
  await go(page, "/prayers/");
  await page.waitForTimeout(1500);
  await page.locator("button").filter({ hasText: /^Plus$/ }).first().click();
  const row = page.locator('[data-plus-try-open="florilegium"]');
  await row.first().waitFor({ timeout: 15000 });
  await row.first().scrollIntoViewIfNeeded();
  await row.first().click();
  await page.waitForSelector('[data-plus-try="florilegium"]', { timeout: 15000 });
  await screen("7-plus-preview", '[data-plus-try="florilegium"]', "the Plus page's preview of the Florilegium", { whole: false });

  // Gathering a line. Under a Father's passage in a study: the row of three
  // actions, and the sheet its Gather opens. The deck stands at the end of
  // the first part of the study that has one.
  await page.goto("about:blank");
  await go(page, "/theology/essence-energies/read/");
  await page.waitForTimeout(2000);
  const rowDrawn = () =>
    page.evaluate(() => {
      const row = [...document.querySelectorAll("[data-quote-tools]")].find((e) => e.getBoundingClientRect().width > 0);
      if (!row) return false;
      row.setAttribute("data-mock-root", "");
      window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 470);
      return true;
    });
  let deck = await rowDrawn();
  const parts = await page.locator("[data-part-segments] li button").count();
  for (let n = 1; n < parts && !deck; n++) {
    await page.locator("[data-part-segments] li button").nth(n).click();
    await page.waitForTimeout(800);
    deck = await rowDrawn();
  }
  if (!deck) {
    console.log("\nNo passage deck was drawn on the study: the Gather button was not checked.");
    ok = false;
  } else {
    await screen("8-gather-button", "[data-mock-root]", "a passage's three actions, Gather among them", { whole: false });
    await page.locator("[data-mock-root] [data-gather]").click();
    const picker = '[role=dialog]:has([data-gather-into])';
    await page.waitForSelector(picker, { timeout: 15000 });
    await screen("9-picker", picker, "the sheet that picks a gathering", { whole: false });
    await page.locator(`${picker} [data-florilegium-begin]`).click();
    await page.waitForSelector("#picker-new-name", { timeout: 8000 });
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
    await screen("10-picker-naming", picker, "the sheet, naming a new gathering", { whole: false });
    // Back to the list, and the line into On the light: the sheet stays a moment to show it.
    await page.locator(`${picker} form button[type=button]`).click();
    await page.locator(`${picker} [data-gather-row="on-the-light"]`).click();
    await page.mouse.move(1, 1);
    await page.waitForSelector(`${picker} [data-gathered]`, { timeout: 4000 });
    await page.waitForTimeout(250);
    const shown = path.join(folder, "11-picker-gathered.png");
    await page.screenshot({ path: shown });
    shots.push(shown);
    // And it closes itself.
    await page.waitForSelector(picker, { state: "detached", timeout: 6000 });
    console.log("\nThe sheet showed where the line went, and closed itself.");
  }

  // The same sheet from a verse in the Bible: a tap on the verse, Study, Gather to florilegium.
  await page.goto("about:blank");
  await go(page, "/bible/john/8/");
  await page.waitForSelector("#v12", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const at = await page.evaluate(() => {
    const el = document.querySelector("#v12");
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 300);
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + 140), y: Math.round(r.top + 16) };
  });
  await page.waitForTimeout(500);
  await page.touchscreen.tap(at.x, at.y);
  const study = page.locator("[role=dialog] [role=menuitem]").filter({ hasText: /^Study/ }).first();
  await study.waitFor({ timeout: 10000 });
  // The verse's card takes no tap in the moment after the one that opened it, so a lifting finger chooses nothing.
  await page.waitForTimeout(1000);
  await study.click();
  const toGather = page.locator("[role=dialog] button, [role=dialog] [role=menuitem]").filter({ hasText: /Gather to florilegium/ }).first();
  await toGather.waitFor({ timeout: 10000 });
  await toGather.click();
  const fromVerse = '[role=dialog]:has([data-gather-into])';
  await page.waitForSelector(fromVerse, { timeout: 15000 });
  await screen("12-picker-from-a-verse", fromVerse, "the same sheet, from a verse in the Bible", { whole: false });

  console.log(`\nStills in ${folder}:`);
  for (const file of shots) console.log(`  ${path.basename(file)}`);
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
