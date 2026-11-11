// Learn by heart: the reader chooses what they learn, and changes it whenever
// they like (1.9, build 93 note 11; the owner's word of 2026-11-11: "Allow
// you to switch the learn the verse whenever you want. Also allow a learn the
// quote ... or maybe they want to pick a custom quote, allow them to do that,
// or a custom verse").
//
// The rules are held by lib/remember/__tests__ (items, sources) and
// lib/sync/__tests__/learnedWordsTravel.test.ts; this reads what is drawn, on
// the export, at phone size, with a finger's taps, as a new reader:
//
//   - a reader who has kept nothing is shown the way in, on You
//   - their own words are learned marked "Added by you", with no name on
//     them and no share picture
//   - a quote is taken from the app's cited sayings, under whose words they
//     are, with the line that opens its place
//   - a pasted line that "Who said it" finds is learned in the book's words;
//     one it cannot find may be learned anyway, marked "Added by you" and
//     never under a saint's name; with no connection the sheet says so
//   - a verse is taken by its reference, shown from the Bible before it is
//     taken; a reference that names no verse is said to
//   - Change is on You's card, on Today's card and in the practise sheet
//   - Today's card asks the one chosen, and answering it says when it is back
//   - what was added can be taken off, and the choice given up
//   - without Plus the choosing is open and Show the words carries the lock
//
// The website's two answers (a verse's words, Who said it) are stood in for
// here, so the walk needs no network and says the same thing every run.
//
//   npm run build:android, then: node scripts/learn-walk.mjs [--stills dir]

import fs from "node:fs";
import path from "node:path";

import { go } from "./lib/shell-server.mjs";
import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";

const argv = process.argv.slice(2);
const stillsAt = argv.indexOf("--stills");
const STILLS = stillsAt >= 0 ? path.resolve(argv[stillsAt + 1]) : null;
if (STILLS) fs.mkdirSync(STILLS, { recursive: true });

const results = [];
const say = (ok, what) => {
  results.push(Boolean(ok));
  console.log(`${ok ? "pass" : "FAIL"} ${what}`);
};

const JOHN = "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
const PSALM = "The Lord is my shepherd; I shall not want.";
const PLACE = { kind: "father", href: "/saints/john-chrysostom/paschal-homily#p-1-4", author: "St. John Chrysostom", work: "The Paschal Homily", place: "" };
const BOOK_WORDS = "Let no one fear death, for the Saviour’s death hath set us free.";
const OWN = "Lord Jesus Christ, Son of God, have mercy on me, a sinner.";

let browser;
/** What the website answers this reader; a test changes it between taps. */
const web = { find: "found", online: true };

async function phone(set = {}, { android = false } = {}) {
  const opened = await openPhone({ scale: STILLS ? 2 : 1, set: { "purify:fasting-rule": "hidden", ...set }, browser });
  browser = opened.browser;
  await opened.page.emulateMedia({ reducedMotion: "reduce" });
  if (android) {
    // The Android app, where Plus is locked and sold.
    await opened.ctx.addInitScript(() => {
      window.androidBridge = {};
      window.Capacitor = { ...(window.Capacitor ?? {}), getPlatform: () => "android", isNativePlatform: () => true };
    });
  }
  await opened.ctx.route("**/api/bible/verse**", (route) => {
    const u = new URL(route.request().url());
    const book = u.searchParams.get("book");
    const n = Number(u.searchParams.get("verse") ?? u.searchParams.get("from") ?? 0);
    const text = book === "john" ? JOHN : book === "psalms" ? PSALM : null;
    return route.fulfill({ status: text ? 200 : 404, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ verses: text ? [{ n, text }] : [] }) });
  });
  await opened.ctx.route("**/api/quotes/find**", (route) => {
    if (!web.online) return route.abort("internetdisconnected");
    const found = web.find === "found" ? [{ match: "exact", share: 1, cite: PLACE, excerpt: `… he said: ${BOOK_WORDS} He hath destroyed it …`, words: BOOK_WORDS }] : [];
    return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ found }) });
  });
  return opened;
}

const launched = (page) =>
  page
    .waitForFunction(() => {
      const f = document.querySelector("[data-launch-frame]");
      return !f || getComputedStyle(f).display === "none" || Number(getComputedStyle(f).opacity) === 0;
    }, null, { timeout: 30000 })
    .catch(() => {});

const CARD = "[data-you-verse]";
const sheetOf = (page, title) => page.locator(`[role="dialog"][aria-label="${title}"]`);
const settle = (page, ms = 700) => page.waitForTimeout(ms);
const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("purify:remember") ?? "{}"));

async function still(page, name, selector) {
  if (!STILLS) return;
  await settle(page, 500);
  await page.screenshot({ path: path.join(STILLS, `${name}.png`) });
  say(printMockCheck(await checkMock(page, selector), `${name}.png`), `the house's rules on ${name}.png`);
}

/** Open the chooser from You's card, on the kind named. */
async function openChooser(page, kind) {
  await page.locator(`${CARD} [data-learn-change]`).first().tap();
  const sheet = sheetOf(page, "What will you learn?");
  await sheet.waitFor({ timeout: 15000 });
  await settle(page);
  if (kind) {
    await sheet.getByRole("button", { name: kind, exact: true }).tap();
    await settle(page, 300);
  }
  return sheet;
}

// ── 1. A new reader, nothing kept: the way in, and their own words ─────────
{
  const { ctx, page } = await phone();
  await go(page, "/account");
  await launched(page);
  const card = page.locator(CARD);
  say(await card.waitFor({ timeout: 30000 }).then(() => true, () => false), "You: a reader who kept nothing is shown the way in");
  say((await card.getAttribute("data-you-verse")) === "empty", "it is the empty card, with one control");
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await still(page, "01-you-way-in", CARD);

  let sheet = await openChooser(page);
  const chips = await sheet.locator("[data-learn-kinds] button").allInnerTexts();
  say(chips.join("|") === "A verse|A quote|Your own words", `the sheet offers three kinds (${chips.join(", ")})`);
  say((await sheet.locator("[data-learn-choose]").getAttribute("data-learn-choose")) === "verse", "it opens on A verse");
  say(/Save a verse/.test(await sheet.innerText()), "with no kept verse, it says how one comes to be here");
  await still(page, "02-choose-verse-empty", '[role="dialog"]');

  await sheet.getByRole("button", { name: "Your own words", exact: true }).tap();
  await settle(page, 300);
  const take = sheet.locator("[data-learn-take]");
  say(await take.isDisabled(), "Your own words: Learn this waits for words");
  await sheet.locator("[data-learn-own]").fill(OWN);
  await still(page, "03-choose-own", '[role="dialog"]');
  await take.tap();
  let practise = sheetOf(page, "Learn by heart");
  say(await practise.waitFor({ timeout: 15000 }).then(() => true, () => false), "taking them up opens the practise sheet, named Learn by heart");
  await settle(page);
  say((await practise.locator("[data-practise-name]").innerText()).trim() === "Added by you", "they are marked Added by you, which claims no author");
  say(!/St\.|Abba|Chrysostom/.test(await practise.innerText()), "and no saint's name stands on them");
  say((await practise.locator("[data-cite]").count()) === 0, "nor any source line");
  await still(page, "04-practise-own", '[role="dialog"]');
  await practise.getByRole("button", { name: "Show the words", exact: true }).tap();
  await settle(page);
  say((await practise.innerText()).includes("have mercy on me"), "Show the words shows them");
  await practise.getByRole("button", { name: "I know it" }).tap();
  await settle(page);
  say(/It comes back tomorrow\./.test(await practise.innerText()), "I know it: it comes back tomorrow");
  await practise.getByRole("button", { name: "Done", exact: true }).tap();
  await practise.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

  say((await card.getAttribute("data-you-verse")) === "own", "You's card now holds the reader's own words");
  const words = (await card.innerText()).replace(/\s+/g, " ");
  say(/You are learning/.test(words) && words.includes(OWN) && /Added by you/.test(words), "under You are learning, with the words and Added by you");
  say((await card.locator("[data-you-share]").count()) === 0, "with no Share: own words are not sent out as a picture in Purify's look");
  say((await card.locator("a").count()) === 0, "and they link nowhere");
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await still(page, "05-you-own", CARD);
  const kept = await store(page);
  const ownKey = kept.chosen?.key ?? "";
  say(/^own:/.test(ownKey) && Object.keys(kept.items[ownKey] ?? {}).sort().join() === "addedAt,key,kind,text", "kept with no field a name could stand in");

  // ── 2. A quote from the app's cited sayings ────────────────────────────
  sheet = await openChooser(page);
  say((await sheet.locator("[data-learn-choose]").getAttribute("data-learn-choose")) === "own", "Change opens the sheet on the kind being learned");
  say((await sheet.locator('[data-learn-list="own"] [data-learn-row][aria-pressed="true"]').count()) === 1, "with the one chosen marked");
  await sheet.getByRole("button", { name: "A quote", exact: true }).tap();
  await settle(page, 400);
  const rows = sheet.locator('[data-learn-list="quote"] [data-learn-row]');
  const count = await rows.count();
  say(count >= 20, `A quote: the app's cited sayings are offered (${count})`);
  const firstRow = (await rows.first().innerText()).replace(/\s+/g, " ");
  await still(page, "06-choose-quote", '[role="dialog"]');
  await rows.first().tap();
  practise = sheetOf(page, "Learn by heart");
  await practise.waitFor({ timeout: 15000 });
  await settle(page);
  const by = (await practise.locator("[data-practise-name]").innerText()).trim();
  say(by.length > 3 && firstRow.startsWith(by), `the quote is under whose words they are ("${by}")`);
  const cite = practise.locator('a[data-cite="father"]').first();
  const citeHref = (await cite.getAttribute("href").catch(() => null)) ?? "";
  say(/^\/saints\/|^\/councils\//.test(citeHref), `with the line that opens its place (${citeHref})`);
  await still(page, "07-practise-quote", '[role="dialog"]');
  await page.keyboard.press("Escape");
  await practise.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  say((await card.getAttribute("data-you-verse")) === "quote", "You's card now holds the quote");
  say((await card.locator("[data-you-share]").count()) === 1, "a quote keeps Share");
  say(((await card.locator("a").first().getAttribute("href")) ?? "") === citeHref, "and the card opens its place in the book");
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await still(page, "08-you-quote", CARD);

  // ── 3. A pasted line: found, not found, no connection ──────────────────
  sheet = await openChooser(page, "A quote");
  await sheet.locator("[data-learn-paste]").fill("Let no one fear death, for the Savior's death has set us free");
  await sheet.locator("[data-learn-find]").tap();
  const found = sheet.locator('[data-learn-found="exact"]');
  say(await found.waitFor({ timeout: 15000 }).then(() => true, () => false), "a pasted line that is found is shown, word for word");
  const shown = (await found.locator("blockquote").innerText()).trim();
  say(shown === BOOK_WORDS, "in the book's own words, not the paste");
  await still(page, "09-choose-quote-found", '[role="dialog"]');
  await found.locator("[data-learn-take]").tap();
  practise = sheetOf(page, "Learn by heart");
  await practise.waitFor({ timeout: 15000 });
  await settle(page);
  say((await practise.locator("[data-practise-name]").innerText()).trim() === "St. John Chrysostom", "and learned under the author on the book's cover");
  const afterFound = await store(page);
  say(afterFound.items[afterFound.chosen.key]?.text === BOOK_WORDS, "what is kept is the book's words");
  await page.keyboard.press("Escape");
  await practise.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

  web.find = "none";
  sheet = await openChooser(page, "A quote");
  const pasted = "Acquire a peaceful spirit, and around you thousands will be saved.";
  await sheet.locator("[data-learn-paste]").fill(pasted);
  await sheet.locator("[data-learn-find]").tap();
  const none = sheet.locator('[data-learn-found="none"]');
  say(await none.waitFor({ timeout: 15000 }).then(() => true, () => false), "a line that is not found is said not to be");
  await still(page, "10-choose-quote-not-found", '[role="dialog"]');
  await none.locator("[data-learn-as-own]").tap();
  practise = sheetOf(page, "Learn by heart");
  await practise.waitFor({ timeout: 15000 });
  await settle(page);
  say((await practise.locator("[data-practise-name]").innerText()).trim() === "Added by you", "and may be learned anyway, marked Added by you");
  say(!/Seraphim|St\./.test(await practise.innerText()), "never under a saint's name");
  await page.keyboard.press("Escape");
  await practise.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

  web.online = false;
  sheet = await openChooser(page, "A quote");
  await sheet.locator("[data-learn-paste]").fill("Let no one fear death, for the Savior's death has set us free");
  await sheet.locator("[data-learn-find]").tap();
  say(await sheet.locator('[data-learn-said="learn.offline"]').waitFor({ timeout: 15000 }).then(() => true, () => false), "with no connection, the sheet says finding a quote needs one");
  web.online = true;
  web.find = "found";

  // ── 4. A verse by its reference ────────────────────────────────────────
  await sheet.getByRole("button", { name: "A verse", exact: true }).tap();
  await settle(page, 300);
  const field = sheet.locator("[data-learn-reference]");
  await field.fill("Zzz 3:16");
  say(await sheet.locator("[data-learn-none]").waitFor({ timeout: 8000 }).then(() => true, () => false), "a reference that names no verse is said to");
  await field.fill("John 3:16");
  const offered = sheet.locator("[data-learn-offered]");
  say(await offered.waitFor({ timeout: 15000 }).then(() => true, () => false), "a reference shows its verse before it is taken");
  await page.waitForFunction(() => /For God so loved/.test(document.querySelector("[data-learn-offered]")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  say((await offered.innerText()).includes("For God so loved the world"), "from the Bible the app carries");
  await still(page, "11-choose-verse-reference", '[role="dialog"]');
  await offered.locator("[data-learn-take]").tap();
  practise = sheetOf(page, "Remember the verse");
  say(await practise.waitFor({ timeout: 15000 }).then(() => true, () => false), "taking it opens the practise sheet, named Remember the verse");
  await settle(page);
  say((await practise.locator("[data-practise-name]").innerText()).trim() === "John 3:16", "under its reference");
  // Change, inside the practise sheet.
  await practise.locator("[data-learn-change]").tap();
  sheet = sheetOf(page, "What will you learn?");
  say(await sheet.waitFor({ timeout: 15000 }).then(() => true, () => false), "Change inside the practise sheet opens the chooser");
  await settle(page);
  say((await sheet.locator('[data-learn-list="verse"] [data-learn-row][aria-pressed="true"]').count()) === 1, "with the verse marked as the one chosen");
  await still(page, "12-choose-verse-chosen", '[role="dialog"]');

  // ── 5. Taking one off ──────────────────────────────────────────────────
  await sheet.getByRole("button", { name: "Your own words", exact: true }).tap();
  await settle(page, 300);
  const ownRows = sheet.locator('[data-learn-list="own"] [data-learn-row]');
  const before = await ownRows.count();
  await sheet.locator('[data-learn-list="own"] [data-learn-remove]').first().tap();
  await settle(page, 300);
  say((await ownRows.count()) === before - 1, `own words can be taken off the list (${before} to ${before - 1})`);
  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  say((await card.getAttribute("data-you-verse")) === "verse", "You's card holds the verse chosen");
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await still(page, "13-you-verse", CARD);
  await ctx.close();
}

// ── 6. Today asks the one chosen, and Change is there too ───────────────────
{
  const added = Date.now() - 86_400_000;
  const quote = { kind: "quote", key: "q:walkwalkwalk01", text: BOOK_WORDS, by: "St. John Chrysostom", cite: { href: PLACE.href, author: PLACE.author, work: PLACE.work, place: "" }, addedAt: added };
  const { ctx, page } = await phone({
    "purify:bookmarks": JSON.stringify([
      { id: "b1", addedAt: added - 5000, label: "John 3:16", kind: "bible-verse", book: "john", bookName: "John", chapter: 3, verse: 16 },
      { id: "b2", addedAt: added - 4000, label: "Psalms 22:1", kind: "bible-verse", book: "psalms", bookName: "Psalms", chapter: 22, verse: 1 },
    ]),
    "purify:remember": JSON.stringify({ entries: {}, texts: { "john/3/16": JOHN, "psalms/22/1": PSALM }, items: { [quote.key]: quote }, chosen: { key: quote.key, at: added } }),
  });
  await go(page, "/");
  await launched(page);
  const today = page.locator("section", { has: page.locator("[data-learn-change]") }).filter({ hasText: "St. John Chrysostom" }).first();
  say(await today.waitFor({ timeout: 30000 }).then(() => true, () => false), "Today: the card asks the quote the reader chose, before the saved verses");
  await today.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const words = (await today.innerText()).replace(/\s+/g, " ");
  say(/^Learn by heart/.test(words) && !/Remember the verse/.test(words), "named Learn by heart, since it is not a verse");
  await still(page, "14-today-quote", "section:has([data-learn-change])");
  await today.locator("[data-learn-change]").tap();
  let sheet = sheetOf(page, "What will you learn?");
  say(await sheet.waitFor({ timeout: 15000 }).then(() => true, () => false), "Change on Today's card opens the chooser");
  await settle(page);
  await sheet.getByRole("button", { name: "A verse", exact: true }).tap();
  await settle(page, 300);
  const verseRows = sheet.locator('[data-learn-list="verse"] [data-learn-row]');
  say((await verseRows.count()) === 2, "A verse: the verses the reader kept are there");
  say((await sheet.locator("[data-learn-daily]").count()) === 1, "and the row that gives the choice up");
  await still(page, "15-choose-verse-kept", '[role="dialog"]');
  await sheet.locator("[data-learn-daily]").tap();
  await sheet.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  say(!(await store(page)).chosen?.key, "giving the choice up leaves none chosen");
  await settle(page);
  const card = page.locator("section", { has: page.locator("[data-learn-change]") }).filter({ hasText: "John 3:16" }).first();
  say(await card.waitFor({ timeout: 10000 }).then(() => true, () => false), "and Today's card goes back to the longest-kept verse");
  say(/Remember the verse/.test(await card.innerText()), "named Remember the verse again");
  await card.getByRole("button", { name: "I know it" }).tap();
  await settle(page);
  const done = page.locator("section", { has: page.locator("[data-learn-change]") }).filter({ hasText: "It comes back tomorrow." }).first();
  say(await done.waitFor({ timeout: 10000 }).then(() => true, () => false), "answered, the card says when it comes back, and Change is still there");
  await still(page, "16-today-answered", "section:has([data-learn-change])");

  // You shows the day's kept verse again, with Change.
  await go(page, "/account");
  await settle(page, 1500);
  const you = page.locator(CARD);
  await you.waitFor({ timeout: 20000 }).catch(() => {});
  say(/A verse you kept/.test(await you.innerText()), "You: with none chosen, the day picks a kept verse, as before");
  say((await you.locator("[data-learn-change]").count()) === 1, "and Change is under it");
  await ctx.close();
}

// ── 7. Without Plus: choosing is open, Show the words carries the lock ──────
{
  const { ctx, page } = await phone({}, { android: true });
  await go(page, "/account");
  await launched(page);
  const card = page.locator(CARD);
  await card.waitFor({ timeout: 30000 }).catch(() => {});
  const sheet = await openChooser(page, "Your own words");
  await sheet.locator("[data-learn-own]").fill(OWN);
  await sheet.locator("[data-learn-take]").tap();
  const practise = sheetOf(page, "Learn by heart");
  say(await practise.waitFor({ timeout: 15000 }).then(() => true, () => false), "without Plus: choosing is open, and the practise sheet opens");
  await settle(page);
  const show = practise.getByRole("button", { name: /Show the words/ });
  const locked = (await show.locator("svg").count()) > 0;
  if (locked) {
    await still(page, "17-practise-locked", '[role="dialog"]');
    await show.tap();
    await settle(page, 1500);
    const upgrade = page.locator('[role="dialog"]').filter({ hasText: /Purify Plus/ }).last();
    say(await upgrade.isVisible(), "Show the words carries the lock and opens the Plus sheet");
  } else {
    say(false, "this export was not built with Plus's locks on (NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 and a selling key): the lock was not walked");
  }
  await ctx.close();
}

await browser?.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `\n${failed} of ${results.length} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
