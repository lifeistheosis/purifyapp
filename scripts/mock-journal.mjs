#!/usr/bin/env node
// The journal on the native export, with a finger's taps: stills held to the
// mockup checker, and a walk of the writing sheet.
//
// Why it exists (build 93 note 8, the owner on 2026-11-11: "when I click
// title or anything ... Honestly, just buggy", and of Verse, Quote, Highlight
// and More: "that same bug happens in each of these sections"). The journal
// had source-reading tests and no walk of its own, and what he met cannot be
// read from source: Title tapped while the sheet was still arriving, the
// cursor taken back by the sheet's own timer, a pull that dragged the page.
// A walk with a mouse does not meet them either. This one puts a finger
// down: `page.touchscreen.tap`, and a pull made of real touch events.
//
// The export (after `npm run build:android`) is ./out, answered as the
// phones' shells answer it (scripts/lib/shell-server.mjs): nothing leaves
// this machine, every request to another origin is refused.
//
//   node scripts/mock-journal.mjs [scale] [only] [folder]     the stills
//   WALK=1 node scripts/mock-journal.mjs                      the walk
//   WALK=1 FLOWS="title" node scripts/mock-journal.mjs        only the flows whose names hold those words
//   WALK=1 HALF=1/2 node scripts/mock-journal.mjs             every other flow (and HALF=2/2 the rest, side by side)
//
// `scale` 2 for pictures a person will see (1 to check); `only` is "all" or
// the stills' numbers ("01,03"); `folder` is where they are written, a
// folder of its own name and never one in docs.
//
// TWO READERS, ONE EXPORT. Plus is asked for only where the build can sell it
// (lib/entitlements/entitlements.ts: the store's key in the build). The
// export the other harnesses use is cut with no key, so it locks nothing, and
// on it every reader has Plus's parts. A new reader, as the owner walks a
// test build, has no Plus and meets its locks. That needs the export
// scripts/plus-order-walk.mjs and scripts/learn-walk.mjs ask for, built as
// the store's is, with Plus enforced and a key to sell it by. The key is a
// stand-in, a word and not a key; nothing is bought and no store is reached:
//
//   NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android
//   SELLS_PLUS=1 WALK=1 node scripts/mock-journal.mjs      a new reader with no Plus
//   WALK=1 node scripts/mock-journal.mjs                   a reader for whom nothing is locked
//
// With SELLS_PLUS the page says it is the Android shell, as those two walks
// do, since that is where the export sells Plus. Without it the same export
// locks nothing: the app cannot tell which store it is in, and then asks for
// Plus only where both sell it. So both readers are walked on the one export.
// Most flows are walked as either reader; the few that need one are named
// and left on the other.
import fs from "node:fs";
import path from "node:path";

import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const SCALE = Number(process.argv[2] ?? 1);
const ONLY = process.argv[3] && process.argv[3] !== "all" ? new Set(process.argv[3].split(",")) : null;
const OUT = path.resolve(process.argv[4] ?? "journal-stills");
const WALK = process.env.WALK === "1";
const FLOWS = (process.env.FLOWS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
/** HALF=1/2 or 2/2: every other flow, so two processes can walk side by side (a flow is about 40 seconds: the app is opened anew for each). */
const HALF = /^([12])\/2$/.exec(process.env.HALF ?? "")?.[1] ?? null;
let flowCount = 0;
/** The export was cut with the stores' stand-in keys (see the header): a reader with no Plus meets its locks. */
const SELLS_PLUS = process.env.SELLS_PLUS === "1";

if (!WALK) fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── A finger ─────────────────────────────────────────────────────────────

/** Tap the middle of what this locator finds, as a finger does. */
async function tap(page, locator, what = "it") {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${what} is not on the screen`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  return box;
}

/** A finger put down at (x, y), moved by (dx, dy) in small steps, and lifted. Gives the sheet's own transform while it is held. */
async function pull(page, x, y, dx, dy, steps = 10) {
  const cdp = await page.context().newCDPSession(page);
  const at = (px, py) => [{ x: px, y: py, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(x, y) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(x + (dx * i) / steps, y + (dy * i) / steps) });
    await wait(16);
  }
  const held = await sheetMoved(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
  return held;
}

/** How far the writing sheet's panel stands from its rest, in pixels down. */
const sheetMoved = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector("[data-journal-composer]")?.closest("[role=dialog]")?.querySelector("[data-sheet-panel], [style*=transform]");
    if (!panel) return null;
    const m = /translate3d\(\s*[-\d.]+px,\s*([-\d.]+)px/.exec(panel.style.transform ?? "");
    return m ? Math.round(Number(m[1])) : 0;
  });

/** What has the cursor, in words. */
const cursor = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "nothing";
    if (el.hasAttribute("data-journal-title")) return "Title";
    if (el.closest("[data-page-text]")) return "the words";
    if (el.closest("[data-page-quote]")) return el.tagName === "TEXTAREA" ? "the quote" : "who said it";
    if (el.closest("[data-page-verse-finder]")) return "the verse finder";
    if (el.closest("[data-page-props-panel]")) return "the notebook panel";
    return `${el.tagName.toLowerCase()} ${el.getAttribute("role") ?? ""}`.trim();
  });

const scrolled = (page) => page.evaluate(() => Math.round(document.querySelector("[data-journal-composer]")?.closest(".overflow-y-auto")?.scrollTop ?? -1));
const dialogs = (page) =>
  page.evaluate(() => [...document.querySelectorAll("[role=dialog], [role=alertdialog]")].map((d) => (d.getAttribute("aria-label") ?? d.querySelector("h1, h2")?.textContent ?? "").trim()));

/** The Android shell, as far as the app's own check goes: Plus is sold there (scripts/plus-order-walk.mjs). */
function android() {
  window.androidBridge = { postMessage() {} };
  window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
}

/** The app open at a place: the journal on its page for the day unless another is named. */
async function journal({ scale = 1, set = {}, at = "/journal", ready = "[data-journal-today]" } = {}) {
  const o = await openPhone({ scale, set });
  if (SELLS_PLUS) await o.ctx.addInitScript(android);
  o.errors = [];
  o.page.on("pageerror", (e) => {
    // The stand-in shell has no plugins, and the app's own Back listener says so
    // (lib/platform/useAndroidBack.ts asks @capacitor/app). A phone has them. Nothing else is let by.
    if (SELLS_PLUS && /^"\w+" plugin is not implemented on android$/.test(e.message)) return;
    o.errors.push(e.message);
  });
  await go(o.page, at);
  await o.page.waitForSelector(ready, { timeout: 30000 });
  await wait(1200);
  return o;
}

/**
 * Write tapped; `rest` waits for the sheet to stand still; and then, as a
 * reader does, a finger put down where they write (`begin`), which is what
 * brings the cursor and the keyboard: the sheet gives neither by itself
 * (build 95 note 6).
 */
async function write(page, rest = true, begin = rest) {
  await tap(page, page.locator("[data-journal-write]").last(), "Write");
  await page.waitForSelector("[data-journal-title]", { state: "attached", timeout: 10000 });
  if (rest) await wait(1300);
  if (begin) await tapToWrite(page);
}

/** A finger put down at the foot of the page's last words: the cursor goes to their end, as a tap under the last line does. */
async function tapToWrite(page) {
  const field = page.locator("[data-journal-composer] [data-page-text] textarea, [data-journal-composer] > label textarea").last();
  await field.scrollIntoViewIfNeeded();
  const box = await field.boundingBox();
  if (!box) throw new Error("the place to write is not on the screen");
  const foot = await sheetScroll(page).evaluate((el) => el.getBoundingClientRect().bottom);
  await page.touchscreen.tap(box.x + box.width - 12, Math.min(box.y + box.height, foot) - 8);
  await wait(200);
}

const tools = (page) => page.locator("[data-page-toolbar] [role=toolbar] button");
const VERSE = 0, QUOTE = 1, HIGHLIGHT = 2, MORE = 3;

/** A page kept as a draft, as the journal keeps the one being written (lib/journal/entries.ts). */
const draft = (body, more = {}) => ({ "purify:journal.draft": JSON.stringify({ kind: "reflection", body, ...more }) });

/** A work the apps carry, for a quote from the library: its words are read off its own page, never typed here. */
const WORK = "/saints/athanasius-the-great/on-the-incarnation/";

/**
 * A draft with every kind of block on it. The library quote is made as Quote
 * in journal makes one (lib/journal/quoteInJournal.ts): a paragraph of the
 * work as its page has it, the page's own name for itself, and the page as
 * the way back.
 */
async function pageOfEveryBlock(page) {
  await go(page, WORK);
  await page.waitForFunction(() => [...document.querySelectorAll("main p")].some((p) => p.textContent.trim().length > 80), null, { timeout: 30000 });
  await wait(600);
  const from = await page.evaluate(() => {
    const cite = document.querySelector("[data-cite]")?.getAttribute("data-cite") ?? document.querySelector("main h1")?.textContent ?? "";
    const paragraphs = [...document.querySelectorAll("main p")].map((p) => p.textContent.replace(/\s+/g, " ").trim());
    // The first paragraph of the work short enough to sit on a phone's screen with the rest.
    return { cite: cite.replace(/\s+/g, " ").trim(), text: paragraphs.find((t) => t.length > 80 && t.length < 240 && !t.includes("§")) ?? "" };
  });
  if (!from.text || !from.cite) throw new Error(`the work's page gave no paragraph to quote (cite "${from.cite}")`);
  const body = [
    "# A day in November",
    "What I read this morning, and what stayed with me.",
    "[[verse john 3:16]]",
    "> Begin again tomorrow.\n> ~ My grandmother",
    `[[library ${WORK}]]\n> ${from.text}\n> ~ ${from.cite}`,
    "==yellow== Lord Jesus Christ, Son of God, have mercy on me.",
    "## For this week",
    "- [x] Read the Gospel of the day\n- [ ] Call home",
    "---",
    "[[callout candle]]\n> Remember the departed on Saturday.",
    "And the last words of the page.",
  ].join("\n\n");
  await page.evaluate((b) => localStorage.setItem("purify:journal.draft", JSON.stringify({ kind: "reflection", body: b })), body);
  await go(page, "/journal");
  await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
  await wait(900);
  return from;
}

// ── Push 3's readers: pages kept before, and a gathering kept from the app's own starter ──

const ago = (days) => new Date(Date.now() - days * 864e5).toISOString();
const OLDER = { id: "11111111-1111-4111-8111-111111111111", kind: "reflection", body: "# An older page\n\nWords kept last week.", createdAt: ago(6), updatedAt: ago(6) };
const OTHER = { id: "44444444-4444-4444-8444-444444444444", kind: "prayer", body: "Another page, kept before.", createdAt: ago(8), updatedAt: ago(8) };
const IN_A_NOTEBOOK = { id: "66666666-6666-4666-8666-666666666666", kind: "reflection", body: "[[notebook Advent 2026]]\n\nWhat I mean to keep through the fast.", createdAt: ago(9), updatedAt: ago(9) };
const HALF_THOUGHT = "Half a thought I mean to finish.";
/** Pages already in the journal. */
const kept = (...list) => ({ "purify:journal": JSON.stringify(list) });
const records = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("purify:journal") ?? "[]"));
const waiting = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("purify:journal.draft") ?? "null"));
const writeSays = async (page) => (await page.locator("[data-journal-write]").last().innerText()).trim();

/**
 * The app's own starter, read from the app's own file, and the gathering Keep
 * makes of it (lib/florilegium/starters.ts, starterItems): its lines are the
 * app's Scripture, never typed here. For a reader who cannot keep one through
 * the app: one whose Plus has lapsed.
 */
const STARTER = JSON.parse(fs.readFileSync(new URL("../data/florilegium/starters.json", import.meta.url), "utf8")).starters.find((x) => x.id === "prologue");
const STARTER_NAME = JSON.parse(fs.readFileSync(new URL("../lib/i18n/messages/en.json", import.meta.url), "utf8"))[STARTER.nameKey];
const LAPSED_ID = "55555555-5555-4555-8555-555555555555";
function lapsed({ pages = true } = {}) {
  const at = Date.now() - 30 * 864e5;
  const gathering = {
    id: LAPSED_ID,
    title: STARTER_NAME,
    description: `John ${STARTER.chapter}:${STARTER.lines[0].verse}-${STARTER.lines.at(-1).verse}`,
    createdAt: at,
    updatedAt: at,
    // First verse first, as the store leaves them once Keep has added the last verse first (each new line goes on top).
    items: STARTER.lines.map((l, i) => ({ id: `line-${l.verse}`, addedAt: at + STARTER.lines.length - i, kind: "scripture", text: l.text, reference: `John ${STARTER.chapter}:${l.verse}`, book: STARTER.book, chapter: STARTER.chapter, verse: l.verse })),
  };
  const written = [
    { id: "22222222-2222-4222-8222-222222222222", kind: "reflection", body: `# In the beginning\n\n[[notebook ${STARTER_NAME}]]\n\nRead before the Liturgy this morning, slowly.`, createdAt: ago(40), updatedAt: ago(40) },
    { id: "33333333-3333-4333-8333-333333333333", kind: "question", body: `[[notebook ${STARTER_NAME}]]\n\nWhat do I notice when I read it aloud?`, createdAt: ago(43), updatedAt: ago(43) },
  ];
  return { "purify:florilegia": JSON.stringify([gathering]), "purify:journal": JSON.stringify(pages ? written : []) };
}

/** The writing sheet's own scroll. */
const sheetScroll = (page) => page.locator("[data-journal-composer]").locator("xpath=ancestor::*[contains(@class,'overflow-y-auto')][1]");

// ── The stills ───────────────────────────────────────────────────────────

const results = [];
async function shot(name, label, selector, prepare, { set = {}, first = false, at, ready } = {}) {
  if (WALK) return;
  if (ONLY && !ONLY.has(name.slice(0, 2))) return;
  const { browser, page, errors } = await journal({ scale: SCALE, set, at, ready });
  try {
    if (prepare) await prepare(page);
    // `first`: the picture before the check, where what it shows lasts a moment (a card lit).
    if (first) await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    await wait(900);
    const ok = printMockCheck(await checkMock(page, selector), label);
    results.push([label, ok]);
    await wait(300);
    if (!first) await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    if (errors.length) console.log(`  page errors on ${name}:`, errors.slice(0, 3));
  } finally {
    await browser.close();
  }
}

await shot("01-today", "the journal's page for the day", "main, [data-journal-today]", null);

await shot("02-sheet", "the writing sheet at rest: the kinds as the house's switch, and nothing between Title and the words", "[role=dialog]", async (page) => {
  await write(page);
});

await shot("03-cards", "a verse, a quote and the place to write on, which says so", "[role=dialog]", async (page) => {
  await write(page);
  await tap(page, tools(page).nth(VERSE), "Verse");
  await wait(400);
  await page.keyboard.type("John 3:16");
  await wait(500);
  await tap(page, page.locator("[data-page-verse-finder] li button").first(), "the verse");
  await wait(600);
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(400);
  await page.keyboard.type("Begin again tomorrow.");
  await wait(300);
  await page.keyboard.press("Tab");
  await page.keyboard.type("My grandmother");
  await wait(300);
});

await shot("04-more", "More: Plus's four blocks, and under them the page's own notebook, tags and look", "[role=dialog]", async (page) => {
  await write(page);
  await tap(page, tools(page).nth(MORE), "More");
  await wait(500);
});

await shot(
  "05-notebook-line",
  "a page that has a notebook and tags: one quiet line under its title",
  "[role=dialog]",
  async (page) => {
    await write(page);
  },
  { set: draft("# A day in November\n\n[[notebook Advent 2026]]\n[[tags fasting, peace]]\n\nWhat I read this morning.") },
);

await shot("06-highlight-none", "Highlight with nothing written: lit, and one line where its colours would open", "[role=dialog]", async (page) => {
  await write(page);
  await tap(page, tools(page).nth(HIGHLIGHT), "Highlight");
  await wait(500);
});

await shot("07-highlight", "Highlight with words written: its colours, and the words marked", "[role=dialog]", async (page) => {
  await write(page);
  await page.keyboard.type("Lord Jesus Christ, Son of God, have mercy on me.");
  await tap(page, tools(page).nth(HIGHLIGHT), "Highlight");
  await wait(350);
  await tap(page, page.locator("[data-page-colors] [data-hl-swatch]").first(), "a colour");
  await wait(350);
  await tap(page, tools(page).nth(HIGHLIGHT), "Highlight");
  await wait(500);
});

// The pairs of his "before" pictures (docs/1.9-build/notes/build-93/08d, 08e and 08g).
await shot("08-early-tap", "Title tapped 60ms after Write: nothing opens under the finger, and the page stays where it was", "[role=dialog]", async (page) => {
  await write(page, false);
  await wait(60);
  const box = await page.locator("[data-journal-title]").boundingBox();
  await page.touchscreen.tap(box.x + 80, box.y + box.height / 2);
  await wait(1300);
});

await shot("09-one-quote", "Quote tapped twice: one card, with the cursor in it", "[role=dialog]", async (page) => {
  await write(page);
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(400);
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(500);
});

await shot(
  "10-verse-once",
  "the same verse asked for twice: one card, lit for a moment",
  "[role=dialog]",
  async (page) => {
    await write(page);
    for (let round = 0; round < 2; round++) {
      await tap(page, tools(page).nth(VERSE), "Verse");
      await wait(400);
      await page.keyboard.type("John 3:16");
      await wait(500);
      await tap(page, page.locator("[data-page-verse-finder] li button").first(), "the verse");
      await wait(round === 0 ? 700 : 450);
    }
  },
  { first: true },
);

// The pair of 08f: Quote twice and the verse finder open. One card, the kinds as a switch, nothing under Title,
// Highlight lit, and the finder's field quiet (the search field's own, app/globals.css: no ring and no glow).
await shot("11-verse-finder", "Quote tapped twice, then Verse: one card, and the finder's field quiet", "[role=dialog]", async (page) => {
  await write(page);
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(400);
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(400);
  await tap(page, tools(page).nth(VERSE), "Verse");
  await wait(600);
});

// Each block in a form of its own (build 93 note 8, push 2), and the ways in (note 9).
await shot("12-blocks", "a page with a verse, a quote of one's own and a Father's words: each with its mark, none in a box", "[role=dialog]", async (page) => {
  await pageOfEveryBlock(page);
  await write(page);
});

await shot("13-blocks-more", "the same page further down: marked words, and Plus's heading, checklist, divider and callout", "[role=dialog]", async (page) => {
  await pageOfEveryBlock(page);
  await write(page);
  await sheetScroll(page).evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await wait(500);
});

await shot(
  "14-you-rows",
  "You, for a reader who has written and gathered nothing: Your journal and Your Florilegium lead the rows",
  "[data-you-rows]",
  async (page) => {
    // The tab as it opens: for a reader who has kept nothing, the rows are on the first screen.
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(900);
  },
  { at: "/account", ready: "[data-you-rows] li" },
);

await shot(
  "15-settings",
  "Settings: under the account, the journal and the Florilegium, there to be chosen",
  "#journal",
  async (page) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(500);
  },
  { at: "/settings", ready: "#journal a" },
);

// Push 3's shape (build 93 note 19): a gathering with its journal pages under its lines.
/**
 * One of the app's own starter gatherings, kept through the app, with two
 * pages written in its notebook. Its lines are the app's; the pages' words
 * are plain ones. Returns the gathering's address as the apps open it.
 */
async function gatheringWithPages(page) {
  await go(page, "/florilegium/begin/prologue");
  await page.waitForSelector("[data-starter-keep]", { timeout: 30000 });
  await wait(900);
  await tap(page, page.locator("[data-starter-keep]").first(), "Keep this gathering");
  await page.waitForSelector("[data-starter-kept]", { timeout: 15000 });
  const kept = await page.evaluate(() => {
    const f = JSON.parse(localStorage.getItem("purify:florilegia") ?? "[]")[0];
    return f ? { id: f.id, title: f.title } : null;
  });
  if (!kept) throw new Error("the starter was not kept");
  const day = (ago) => new Date(Date.now() - ago * 864e5).toISOString();
  const records = [
    { id: "22222222-2222-4222-8222-222222222222", kind: "reflection", body: `# In the beginning\n\n[[notebook ${kept.title}]]\n\nRead before the Liturgy this morning, slowly.`, createdAt: day(0), updatedAt: day(0) },
    { id: "33333333-3333-4333-8333-333333333333", kind: "question", body: `[[notebook ${kept.title}]]\n\nWhat do I notice when I read it aloud?`, createdAt: day(3), updatedAt: day(3) },
  ];
  await page.evaluate((list) => {
    localStorage.setItem("purify:journal", JSON.stringify(list));
    window.dispatchEvent(new Event("purify:journal"));
  }, records);
  await go(page, `/florilegium/gathering?g=${encodeURIComponent(kept.id)}`);
  await page.waitForSelector("[data-gathering-pages]", { timeout: 30000 });
  await wait(1200);
  return kept;
}

await shot(
  "16-gathering-pages",
  "a gathering with its pages: under its lines, the journal's pages written in it, and the way to write one",
  "[data-gathering-page]",
  async (page) => {
    await gatheringWithPages(page);
    await page.locator("[data-gathering-pages]").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(700);
  },
  { at: "/florilegium", ready: "main h1, [data-route-content] h1" },
);

await shot(
  "17-journal-gathering",
  "the journal with a gathering's notebook chosen: its chip wears the flower, and one line over its pages leads to its lines",
  "main",
  async (page) => {
    await gatheringWithPages(page);
    await go(page, "/journal");
    await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    await wait(900);
    const chip = page.locator('[data-journal-notebook="gathering"]').first();
    await chip.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(500);
    await tap(page, chip, "the gathering's chip");
    await wait(700);
    await page.locator("[data-journal-gathering]").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(600);
  },
  { at: "/florilegium", ready: "main h1, [data-route-content] h1" },
);

await shot(
  "18-notebook-choice",
  "a page's notebook: the reader's gatherings are offered first, each with the flower, then the other notebooks",
  "[role=dialog]",
  async (page) => {
    await gatheringWithPages(page);
    await page.evaluate((r) => {
      localStorage.setItem("purify:journal", JSON.stringify([...JSON.parse(localStorage.getItem("purify:journal") ?? "[]"), r]));
      window.dispatchEvent(new Event("purify:journal"));
    }, IN_A_NOTEBOOK);
    await go(page, "/journal");
    await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    await wait(900);
    await write(page);
    await tap(page, tools(page).nth(MORE), "More");
    await wait(400);
    await tap(page, page.locator("[data-page-more-props]"), "Add to a notebook");
    await wait(600);
  },
  { at: "/florilegium", ready: "main h1, [data-route-content] h1" },
);

await shot(
  "19-gathering-320",
  "a gathering on a 320px phone: a line's three things to do go under its source, every name whole",
  "[data-gathering-page]",
  async (page) => {
    await gatheringWithPages(page);
    await page.setViewportSize({ width: 320, height: 700 });
    await wait(700);
    await page.locator("[data-gathered-line]").nth(1).evaluate((el) => el.scrollIntoView({ block: "start" }));
    await wait(600);
  },
  { at: "/florilegium", ready: "main h1, [data-route-content] h1" },
);

// A reader whose Plus has lapsed (an export that sells Plus, SELLS_PLUS=1): what they wrote is theirs to open, and nothing new is begun.
if (SELLS_PLUS) {
  await shot(
    "20-gathering-lapsed",
    "a gathering for a reader whose Plus has lapsed: the pages they wrote are listed to open, with no way to write",
    "[data-gathering-page]",
    async (page) => {
      await page.locator("[data-gathering-pages]").evaluate((el) => el.scrollIntoView({ block: "center" }));
      await wait(700);
    },
    { set: lapsed(), at: `/florilegium/gathering?g=${LAPSED_ID}`, ready: "[data-gathering-pages]" },
  );
}

// ── The walk ─────────────────────────────────────────────────────────────

const walked = [];
const left = [];
const expectThat = (cond, what) => {
  if (!cond) throw new Error(what);
};

/** Who is walking: a new reader with no Plus on an export that sells it, or a reader for whom nothing is locked. */
const READER = SELLS_PLUS ? "free" : "plus";

async function flow(label, run, { set = {}, reader = "any", at, ready } = {}) {
  if (!WALK) return;
  if (FLOWS.length && !FLOWS.some((f) => label.toLowerCase().includes(f))) return;
  flowCount += 1;
  if (HALF && (flowCount % 2 === 1) !== (HALF === "1")) return;
  if (reader !== "any" && reader !== READER) {
    left.push(`${label}: ${reader === "free" ? "needs an export that sells Plus (SELLS_PLUS=1; see the header)" : "needs a reader with Plus's parts (an export that locks nothing)"}`);
    return;
  }
  const { browser, page, errors } = await journal({ set, at, ready });
  let ok = true;
  let why = "";
  try {
    await run(page);
    if (errors.length) throw new Error(`page errors: ${errors.slice(0, 2).join(" | ")}`);
  } catch (e) {
    ok = false;
    why = e.message.split("\n")[0];
  } finally {
    await browser.close();
  }
  walked.push([label, ok, why]);
  console.log(`${ok ? "ok  " : "NO  "} ${label}${why ? `: ${why}` : ""}`);
}

if (WALK) console.log(`\nThe walk, as ${READER === "free" ? "a new reader with no Plus" : "a reader for whom nothing is locked"}:`);

// Title, tapped at five moments after Write. Before 2026-11-11: at 60ms the tap met the row under Title
// (a door to Plus), the notebook panel opened and the page moved 161px; at 140ms and 240ms Title took the
// cursor and the sheet's timer gave it to the words.
for (const delay of [60, 140, 240, 400, 800]) {
  await flow(`title: tapped ${delay}ms after Write, the finger is not overruled and nothing else opens`, async (page) => {
    await write(page, false);
    await wait(delay);
    const box = await page.locator("[data-journal-title]").boundingBox();
    await page.touchscreen.tap(box.x + 80, box.y + box.height / 2);
    await wait(60);
    const taken = await cursor(page);
    await wait(1100);
    const after = await cursor(page);
    const rest = await page.locator("[data-journal-title]").boundingBox();
    expectThat((await page.locator("[data-page-props-panel]").count()) === 0, "the notebook panel opened");
    expectThat((await dialogs(page)).length === 1, `another sheet opened: ${(await dialogs(page)).join(", ")}`);
    expectThat((await scrolled(page)) === 0, `the page moved ${await scrolled(page)}px`);
    // Whatever the finger chose is kept. While the sheet is still rising, Title has moved on by the time the
    // finger lands, and it may meet the words under Title: that is the page itself, and it too is kept.
    expectThat(after === taken, `the cursor went from ${taken} to ${after}`);
    expectThat(taken === "Title" || taken === "the words", `the tap gave the cursor to ${taken}`);
    // A Title that was standing still when it was tapped has the cursor.
    if (Math.abs(rest.y - box.y) < 2) expectThat(after === "Title", `Title was tapped at rest and the cursor is in ${after}`);
    if (delay >= 400) expectThat(Math.abs(rest.y - box.y) < 2, `${delay}ms after Write the sheet was still ${Math.round(box.y - rest.y)}px from its rest`);
  });
}

await flow("title: with no finger put down, no field has the cursor once the sheet is up, and a tap where they write gives it", async (page) => {
  await write(page, true, false);
  expectThat((await cursor(page)) !== "the words" && (await cursor(page)) !== "Title", `the cursor is in ${await cursor(page)} with no finger put down`);
  expectThat((await scrolled(page)) === 0, `the page moved ${await scrolled(page)}px`);
  await tapToWrite(page);
  expectThat((await cursor(page)) === "the words", `after a tap where they write the cursor is in ${await cursor(page)}`);
});

await flow("nothing between Title and the words: no door stands under Title on a page with no notebook", async (page) => {
  await write(page);
  expectThat((await page.locator("[data-page-props]").count()) === 0, "a line stands under Title");
  const title = await page.locator("[data-journal-title]").boundingBox();
  const words = await page.locator("[data-page-text] textarea").first().boundingBox();
  // What a finger meets just under Title is the place to write.
  const under = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("[data-page-text]") !== null, [title.x + 80, title.y + title.height + 14]);
  expectThat(under, "something other than the words is under Title");
  expectThat(words.y - (title.y + title.height) < 24, `the words stand ${Math.round(words.y - title.y - title.height)}px under Title`);
});

await flow("a kind: tapped with the cursor in Title, it is chosen and the cursor stays in Title", async (page) => {
  await write(page);
  await tap(page, page.locator("[data-journal-title]"), "Title");
  await wait(250);
  await page.keyboard.type("A day in November");
  for (const kind of ["Prayer", "Question", "Reflection"]) {
    await tap(page, page.locator("[data-journal-kinds] [role=radio]", { hasText: kind }), kind);
    await wait(250);
    expectThat((await page.locator("[data-journal-kinds] [role=radio][aria-checked=true]").innerText()).trim() === kind, `${kind} is not chosen`);
    expectThat((await cursor(page)) === "Title", `after ${kind} the cursor is in ${await cursor(page)}`);
  }
  expectThat((await page.locator("[data-journal-title]").inputValue()) === "A day in November", "the title's words changed");
  // Each part is a finger wide and high.
  for (const box of await page.locator("[data-journal-kinds] [role=radio]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()))) {
    expectThat(box.width >= 44 && box.height >= 44, `a kind is ${Math.round(box.width)} by ${Math.round(box.height)}`);
  }
});

await flow("quote: tapped twice with nothing typed, there is one card and the cursor is in it; a third after words lays a second", async (page) => {
  await write(page);
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(400);
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(400);
  expectThat((await page.locator("[data-page-quote]").count()) === 1, `${await page.locator("[data-page-quote]").count()} quote cards`);
  expectThat((await cursor(page)) === "the quote", `the cursor is in ${await cursor(page)}`);
  await page.keyboard.type("Begin again tomorrow.");
  await wait(200);
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(400);
  expectThat((await page.locator("[data-page-quote]").count()) === 2, "a quote with words in it kept a second from being laid");
  expectThat((await cursor(page)) === "the quote", `the cursor is in ${await cursor(page)}`);
  expectThat((await page.locator("[data-page-quote] textarea").nth(1).inputValue()) === "", "the cursor is not in the new card");
});

await flow("verse: asked for twice, it is laid once, and its card is lit for a moment and then is not", async (page) => {
  await write(page);
  for (const round of [1, 2]) {
    await tap(page, tools(page).nth(VERSE), "Verse");
    await wait(400);
    expectThat((await cursor(page)) === "the verse finder", `the finder has no cursor (${await cursor(page)})`);
    await page.keyboard.type("John 3:16");
    await wait(500);
    await tap(page, page.locator("[data-page-verse-finder] li button").first(), "the verse");
    await wait(350);
    expectThat((await page.locator("[data-page-verse]").count()) === 1, `round ${round}: ${await page.locator("[data-page-verse]").count()} verse cards`);
    expectThat((await page.locator("[data-page-verse-finder]").count()) === 0, "the finder stayed open");
    if (round === 2) expectThat((await page.locator("[data-page-verse][data-page-noticed]").count()) === 1, "the card already there was not lit");
  }
  await wait(1700);
  expectThat((await page.locator("[data-page-noticed]").count()) === 0, "the card stayed lit");
  // Another verse is another card.
  await tap(page, tools(page).nth(VERSE), "Verse");
  await wait(400);
  await page.keyboard.type("John 3:17");
  await wait(500);
  await tap(page, page.locator("[data-page-verse-finder] li button").first(), "the verse");
  await wait(500);
  expectThat((await page.locator("[data-page-verse]").count()) === 2, "a different verse was not laid");
});

await flow("the place to write: with a card on the page it still says so, and a tap there writes", async (page) => {
  await write(page);
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(400);
  await page.keyboard.type("Begin again tomorrow.");
  const last = page.locator("[data-page-text] textarea").last();
  expectThat((await last.getAttribute("placeholder")) === "Write what is on your heart, or pray in your own words.", `the place to write says "${await last.getAttribute("placeholder")}"`);
  const box = await last.boundingBox();
  expectThat(box.height >= 120, `the place to write is ${Math.round(box.height)}px tall`);
  await page.touchscreen.tap(box.x + 60, box.y + 40);
  await wait(250);
  expectThat((await cursor(page)) === "the words", `a tap there gave the cursor to ${await cursor(page)}`);
  await page.keyboard.type("What I want to remember.");
  expectThat((await last.inputValue()) === "What I want to remember.", "the words were not written there");
});

const discs = (page) => page.locator("[data-page-colors] [data-hl-swatch]");
const NONE = "Highlight marks your own words. Write a few first.";

await flow("highlight: with nothing written it is lit and says so in one line; once there are words its colours take the line's place", async (page) => {
  await write(page);
  const tool = tools(page).nth(HIGHLIGHT);
  expectThat(await tool.isEnabled(), "Highlight is dim");
  await tap(page, tool, "Highlight");
  await wait(350);
  expectThat((await tool.getAttribute("aria-pressed")) === "true", "Highlight does not show it is open");
  expectThat((await page.locator("[data-page-highlight-none]").count()) === 1 && (await page.locator("[data-page-highlight-none]").innerText()).trim() === NONE, "the line is not there");
  expectThat((await discs(page).count()) === 0, "colours are offered for no words");
  expectThat((await cursor(page)) === "the words", `the cursor went to ${await cursor(page)}`);
  // Written a few: the colours open where the line was, with nothing more to tap.
  await page.keyboard.type("Lord, have mercy.");
  await wait(300);
  expectThat((await page.locator("[data-page-highlight-none]").count()) === 0, "the line stayed once there were words");
  expectThat((await discs(page).count()) >= 6, `${await discs(page).count()} colours`);
  // A second tap closes it.
  await tap(page, tool, "Highlight");
  await wait(300);
  expectThat((await discs(page).count()) === 0 && (await tool.getAttribute("aria-pressed")) !== "true", "a second tap did not close the colours");
});

await flow("highlight: a colour chosen marks the words, the cursor stays in them, and Remove takes it off", async (page) => {
  await write(page);
  await page.keyboard.type("Lord, have mercy.");
  await tap(page, tools(page).nth(HIGHLIGHT), "Highlight");
  await wait(350);
  const first = discs(page).first();
  const colour = await first.getAttribute("data-hl-color");
  await tap(page, first, "a colour");
  await wait(400);
  expectThat((await page.locator(`[data-page-text] [data-hl-color="${colour}"]`).count()) === 1, "the words do not wear the colour");
  expectThat((await discs(page).count()) === 0, "the colours stayed open");
  expectThat((await cursor(page)) === "the words", `after a colour the cursor is in ${await cursor(page)}`);
  await page.keyboard.type(" Again.");
  expectThat((await page.locator("[data-page-text] textarea").first().inputValue()) === "Lord, have mercy. Again.", "what was typed next did not reach the words");
  // Open again: the colour worn carries the check, and Remove takes it away.
  await tap(page, tools(page).nth(HIGHLIGHT), "Highlight");
  await wait(350);
  expectThat((await discs(page).first().getAttribute("aria-pressed")) === "true", "the colour worn is not marked");
  await tap(page, page.locator("[data-page-colors] button", { hasText: "Remove" }), "Remove");
  await wait(400);
  expectThat((await page.locator("[data-page-text] [data-hl-color]").count()) === 0, "the colour stayed");
  expectThat((await cursor(page)) === "the words", `after Remove the cursor is in ${await cursor(page)}`);
});

await flow("highlight: with the cursor in Title it marks the last words written, and says nothing when there are none", async (page) => {
  await write(page);
  await tap(page, page.locator("[data-journal-title]"), "Title");
  await wait(250);
  await tap(page, tools(page).nth(HIGHLIGHT), "Highlight");
  await wait(350);
  expectThat((await page.locator("[data-page-highlight-none]").count()) === 1, "with nothing written the line is not there");
  expectThat((await cursor(page)) === "Title", `the cursor went to ${await cursor(page)}`);
  await tap(page, tools(page).nth(HIGHLIGHT), "Highlight");
  await wait(250);
  await tap(page, page.locator("[data-page-text] textarea").last(), "the words");
  await wait(250);
  await page.keyboard.type("Lord, have mercy.");
  await tap(page, page.locator("[data-journal-title]"), "Title");
  await wait(250);
  await tap(page, tools(page).nth(HIGHLIGHT), "Highlight");
  await wait(350);
  await tap(page, discs(page).nth(1), "a colour");
  await wait(400);
  expectThat((await page.locator("[data-page-text] [data-hl-color]").count()) === 1, "the last words written were not marked");
  expectThat((await cursor(page)) === "Title", `after a colour the cursor is in ${await cursor(page)}`);
});

await flow("a pull: one that begins on Title or on the words does not move the sheet; its head still pulls it", async (page) => {
  await write(page);
  const title = await page.locator("[data-journal-title]").boundingBox();
  expectThat((await pull(page, title.x + 60, title.y + title.height / 2, 0, 60)) === 0, "a pull from Title moved the sheet");
  await wait(300);
  const words = await page.locator("[data-page-text] textarea").last().boundingBox();
  expectThat((await pull(page, words.x + 60, words.y + 30, 0, 80)) === 0, "a pull from the words moved the sheet");
  await wait(300);
  expectThat((await page.locator("[data-journal-composer]").count()) === 1, "the sheet closed");
  // The head: the handle over Close and Done.
  const done = await page.locator("[data-journal-done]").boundingBox();
  const moved = await pull(page, 195, done.y - 14, 0, 60);
  expectThat(moved !== null && moved > 20, `a pull from the sheet's head moved it ${moved}px`);
  await wait(600);
  expectThat((await page.locator("[data-journal-composer]").count()) === 1, "a short pull of its head closed the sheet");
});

await flow("more: the page's notebook is there under Plus's four, opens its panel, and once named stands as one line under Title", async (page) => {
  await write(page);
  await tap(page, tools(page).nth(MORE), "More");
  await wait(400);
  const choices = await page.locator("[data-page-more] button").allInnerTexts();
  expectThat(choices.map((c) => c.trim()).join(", ") === "Heading, Checklist, Divider, Callout, Add to a notebook", `More holds ${choices.join(", ")}`);
  // Rows the width of the sheet, one under another, a hairline between two and none over the first.
  const rows = await page.locator("[data-page-more] button").evaluateAll((els) =>
    els.map((el) => ({ w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height, y: el.getBoundingClientRect().y, line: getComputedStyle(el.parentElement.querySelector("span[aria-hidden]")).display !== "none" })),
  );
  expectThat(rows.every((r) => r.w >= 340 && r.h >= 44), `a row is ${rows.map((r) => `${Math.round(r.w)} by ${Math.round(r.h)}`).join(", ")}`);
  expectThat(rows.every((r, i) => i === 0 || r.y > rows[i - 1].y), "the rows are not one under another");
  expectThat(rows.map((r) => r.line).join() === "false,true,true,true,false", `the hairlines are ${rows.map((r) => r.line).join()}`);
  await tap(page, page.locator("[data-page-more-props]"), "Add to a notebook");
  await wait(500);
  expectThat((await page.locator("[data-page-props-panel]").count()) === 1, "the notebook panel did not open");
  expectThat((await dialogs(page)).length === 1, `another sheet opened: ${(await dialogs(page)).join(", ")}`);
  await tap(page, page.locator("[data-page-props-panel] input").first(), "the notebook's name");
  await wait(200);
  await page.keyboard.type("Advent 2026");
  await wait(200);
  const line = page.locator("[data-page-props]");
  expectThat((await line.count()) === 1 && (await line.innerText()).trim() === "Advent 2026", "the line under Title does not name the notebook");
  expectThat((await line.boundingBox()).height >= 44, "the line is under 44px");
}, { reader: "plus" });

await flow("a page with a notebook: its line under Title opens the panel", async (page) => {
  await write(page);
  const line = page.locator("[data-page-props]");
  expectThat((await line.innerText()).replace(/\s+/g, " ").trim() === "Advent 2026 · #fasting · #peace", `the line says "${await line.innerText()}"`);
  await tap(page, line, "the line");
  await wait(500);
  expectThat((await page.locator("[data-page-props-panel]").count()) === 1, "the panel did not open");
  expectThat((await page.locator("[data-journal-title]").inputValue()) === "A day in November", "the title is not the page's");
}, { set: draft("# A day in November\n\n[[notebook Advent 2026]]\n[[tags fasting, peace]]\n\nWhat I read this morning."), reader: "plus" });

await flow("done: a page with a title, a verse and words is kept, and stands first in the list under today", async (page) => {
  await write(page);
  await tap(page, page.locator("[data-journal-title]"), "Title");
  await wait(250);
  await page.keyboard.type("A day in November");
  await tap(page, tools(page).nth(VERSE), "Verse");
  await wait(400);
  await page.keyboard.type("John 3:16");
  await wait(500);
  await tap(page, page.locator("[data-page-verse-finder] li button").first(), "the verse");
  await wait(600);
  expectThat((await cursor(page)) === "the words", `after the verse the cursor is in ${await cursor(page)}`);
  await page.keyboard.type("What I read this morning.");
  await wait(200);
  await tap(page, page.locator("[data-journal-done]"), "Done");
  await wait(900);
  expectThat((await page.locator("[data-journal-composer]").count()) === 0, "the sheet stayed open");
  const entry = page.locator("[data-journal-entry]").first();
  expectThat((await entry.locator("[data-journal-entry-title]").innerText()).trim() === "A day in November", "the page's title is not in the list");
  expectThat((await entry.innerText()).includes("What I read this morning."), "the page's words are not in the list");
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("purify:journal") ?? "[]"));
  expectThat(kept.length === 1 && kept[0].body === "# A day in November\n\n[[verse john 3:16]]\n\nWhat I read this morning.", `kept as ${JSON.stringify(kept[0]?.body)}`);
});

/** Is what this selector finds wholly on the screen (390 by 844)? */
const onScreen = async (page, selector) => {
  const b = await page.locator(selector).first().boundingBox();
  return !!b && b.y >= 0 && b.y + b.height <= 844.5 && b.x >= 0 && b.x + b.width <= 390.5;
};

await flow("the tools: each opens over the row, wholly on the screen, and the page does not move under it", async (page) => {
  await write(page);
  const title = await page.locator("[data-journal-title]").boundingBox();
  for (const [at, name, panel] of [
    [VERSE, "Verse", "[data-page-verse-finder]"],
    [HIGHLIGHT, "Highlight", "[data-page-highlight-none]"],
    [MORE, "More", "[data-page-more]"],
  ]) {
    await tap(page, tools(page).nth(at), name);
    await wait(450);
    expectThat((await page.locator(panel).count()) === 1, `${name} opened nothing`);
    expectThat(await onScreen(page, panel), `${name} opened off the screen`);
    expectThat(await onScreen(page, "[data-page-toolbar] [role=toolbar]"), `with ${name} open the tools left the screen`);
    const now = await page.locator("[data-journal-title]").boundingBox();
    expectThat(Math.abs(now.y - title.y) < 1, `with ${name} open Title moved ${Math.round(now.y - title.y)}px`);
    await tap(page, tools(page).nth(at), name);
    await wait(300);
    expectThat((await page.locator(panel).count()) === 0, `a second tap on ${name} did not close it`);
  }
  // One at a time: a second tool takes the first one's place.
  await tap(page, tools(page).nth(VERSE), "Verse");
  await wait(350);
  await tap(page, tools(page).nth(MORE), "More");
  await wait(350);
  expectThat((await page.locator("[data-page-verse-finder]").count()) === 0 && (await page.locator("[data-page-more]").count()) === 1, "two panels stood open");
});

await flow("a card: its remove takes it off the page, and the words left are one place to write", async (page) => {
  await write(page);
  await page.keyboard.type("Before.");
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(400);
  await page.keyboard.type("Begin again tomorrow.");
  expectThat((await page.locator("[data-page-quote]").count()) === 1, "no quote card");
  const remove = page.locator("[data-page-quote] button[aria-label=Remove]");
  const box = await remove.boundingBox();
  expectThat(box.width >= 44 && box.height >= 44, `the remove is ${Math.round(box.width)} by ${Math.round(box.height)}`);
  await tap(page, remove, "Remove");
  await wait(400);
  expectThat((await page.locator("[data-page-quote]").count()) === 0, "the card stayed");
  expectThat((await page.locator("[data-page-text] textarea").count()) === 1, `${await page.locator("[data-page-text] textarea").count()} places to write`);
  expectThat((await page.locator("[data-page-text] textarea").first().inputValue()) === "Before.", "the words before the card changed");
});

await flow("close: what was written waits as it was, and Write brings it back", async (page) => {
  await write(page);
  await tap(page, page.locator("[data-journal-title]"), "Title");
  await wait(250);
  await page.keyboard.type("A day in November");
  await tap(page, page.locator("[data-page-text] textarea").last(), "the words");
  await wait(250);
  await page.keyboard.type("What I read this morning.");
  await wait(700);
  await tap(page, page.locator("[role=dialog] button", { hasText: "Close" }).first(), "Close");
  await wait(900);
  expectThat((await page.locator("[data-journal-composer]").count()) === 0, "the sheet stayed open");
  expectThat((await page.evaluate(() => JSON.parse(localStorage.getItem("purify:journal") ?? "[]").length)) === 0, "Close kept a page no one asked to keep");
  await write(page);
  expectThat((await page.locator("[data-journal-title]").inputValue()) === "A day in November", "the title did not come back");
  expectThat((await page.locator("[data-page-text] textarea").last().inputValue()) === "What I read this morning.", "the words did not come back");
});

await flow("more, with Plus's parts: each of the four lays its block and the cursor goes to it", async (page) => {
  await write(page);
  for (const [name, block, where] of [
    ["Heading", "[data-page-heading-block]", "input, textarea"],
    ["Checklist", "[data-page-check]", "input, textarea"],
    ["Callout", "[data-page-callout]", "input, textarea"],
    ["Divider", "[data-page-divider]", null],
  ]) {
    await tap(page, tools(page).nth(MORE), "More");
    await wait(350);
    await tap(page, page.locator("[data-page-more] button", { hasText: name }), name);
    await wait(450);
    expectThat((await page.locator(block).count()) === 1, `${name} laid ${await page.locator(block).count()} blocks`);
    expectThat((await page.locator("[data-page-more]").count()) === 0, `More stayed open after ${name}`);
    expectThat((await dialogs(page)).length === 1, `${name} opened ${(await dialogs(page)).slice(1).join(", ")}`);
    if (where) expectThat(await page.evaluate(([b, w]) => !!document.activeElement?.closest(b) && document.activeElement.matches(w), [block, where]), `after ${name} the cursor is in ${await cursor(page)}`);
  }
}, { reader: "plus" });

await flow("more, without Plus: each of the four is named whole with the Plus mark, lays nothing and opens the Plus sheet, which closes alone", async (page) => {
  await write(page);
  for (const name of ["Heading", "Checklist", "Divider", "Callout"]) {
    await tap(page, tools(page).nth(MORE), "More");
    await wait(350);
    const choice = page.locator("[data-page-more] button", { hasText: name });
    const words = (await choice.innerText()).replace(/\s+/g, " ").trim();
    expectThat(words === `${name} Purify Plus`, `${name} wears no Plus mark: "${words}"`);
    // Its name is whole. In build 93 the four read "H...", "C...", "D..." and "C...".
    const cut = await page.locator("[data-page-more] button").evaluateAll((rows) => rows.filter((b) => b.children[1].scrollWidth > b.children[1].clientWidth + 1).map((b) => b.children[1].textContent));
    expectThat(cut.length === 0, `cut short: ${cut.join(", ")}`);
    await tap(page, choice, name);
    await wait(900);
    expectThat((await page.locator("[data-page-block]").count()) === 1, `${name} laid a block without Plus`);
    expectThat((await dialogs(page)).length === 2, `${name} did not open the Plus sheet`);
    if (name === "Heading") {
      // A finger's way out: the sheet's own close.
      const closes = page.locator('[role=dialog][aria-label="Purify Plus"] button[aria-label=Close]');
      const boxes = await closes.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
      await tap(page, closes.nth(boxes.findIndex((w) => w > 0 && w < 100)), "the Plus sheet's close");
    } else {
      // A key's way out: one press closes one sheet, and the writing sheet under it stays (lib/ui/escape.ts).
      await page.keyboard.press("Escape");
    }
    await wait(900);
    expectThat((await dialogs(page)).length === 1, `after ${name} ${(await dialogs(page)).length} sheets are up`);
    expectThat((await page.locator("[data-journal-composer]").count()) === 1, "the writing sheet closed with the Plus sheet");
  }
}, { reader: "free" });

await flow("a page with a notebook, without Plus: its line wears the Plus mark and opens the Plus sheet, and Title is still Title's", async (page) => {
  await write(page);
  const line = page.locator("[data-page-props]");
  const words = (await line.innerText()).replace(/\s+/g, " ").trim();
  expectThat(words === "Advent 2026 · #fasting · #peace Purify Plus", `the line says "${words}"`);
  await tap(page, page.locator("[data-journal-title]"), "Title");
  await wait(350);
  expectThat((await cursor(page)) === "Title", `a tap on Title gave the cursor to ${await cursor(page)}`);
  expectThat((await dialogs(page)).length === 1, "a tap on Title opened the Plus sheet");
  await tap(page, line, "the line");
  await wait(900);
  expectThat((await page.locator("[data-page-props-panel]").count()) === 0, "the notebook panel opened without Plus");
  expectThat((await dialogs(page)).length === 2, "the line did not open the Plus sheet");
}, { set: draft("# A day in November\n\n[[notebook Advent 2026]]\n[[tags fasting, peace]]\n\nWhat I read this morning."), reader: "free" });

// ── Push 2: each block its own, and the ways in ───────────────────────────

await flow("the blocks: a verse, a quote of one's own and a Father's words are in no box, and each wears its own mark", async (page) => {
  const from = await pageOfEveryBlock(page);
  await write(page);
  const looks = await page.evaluate(() =>
    ["[data-page-verse]", "[data-page-quote]", "[data-page-library]"].map((sel) => {
      const el = document.querySelector(sel);
      const cs = getComputedStyle(el);
      return {
        sel,
        border: ["Top", "Right", "Bottom", "Left"].map((side) => parseFloat(cs[`border${side}Width`])).reduce((a, b) => a + b, 0),
        ground: cs.backgroundColor,
        marks: el.querySelectorAll("svg[aria-hidden=true]").length,
      };
    }),
  );
  for (const l of looks) {
    expectThat(l.border === 0, `${l.sel} has a border`);
    // Clear: an alpha of nothing, however the browser writes the colour (rgba(0, 0, 0, 0), oklab(0 0 0 / 0)).
    expectThat(/(,|\/) ?0\)$|^transparent$/.test(l.ground), `${l.sel} stands on a ground of its own (${l.ground})`);
    expectThat(l.marks >= 2, `${l.sel} wears no mark`);
  }
  // Scripture: its place is its heading, over where its words go.
  const place = page.locator("[data-page-verse-place]");
  expectThat((await place.innerText()).trim() === "John 3:16", `the verse's heading says "${await place.innerText()}"`);
  const placeBox = await place.boundingBox();
  const under = await page.locator("[data-page-verse] > :nth-child(2)").boundingBox();
  expectThat(placeBox.height >= 44 && under.y >= placeBox.y + placeBox.height - 12, "the verse's place is not its heading");
  // A Father's words: the words, then the one way back, named as the page names itself.
  const source = page.locator("[data-page-library-source]");
  expectThat((await source.innerText()).trim() === from.cite, `the source says "${await source.innerText()}", the page "${from.cite}"`);
  expectThat((await page.locator("[data-page-library] blockquote").innerText()).replace(/\s+/g, " ").trim() === from.text, "the library's words are not as its page has them");
  expectThat((await page.locator("[data-page-library] a").count()) === 1 && (await source.getAttribute("href")).replace(/\/$/, "") === WORK.replace(/\/$/, ""), "the way back is not one link to the work");
  expectThat((await source.boundingBox()).height >= 44, "the way back is under 44px");
  expectThat((await page.locator("[data-page-library]").innerText()).includes("Quoted from Purify's library"), "it does not say it is quoted from the library");
  // A quote of one's own: the writer's, with no way out of the page and no library's mark.
  expectThat((await page.locator("[data-page-quote] a").count()) === 0, "a quote of one's own has a link");
  expectThat((await page.locator("[data-page-quote] textarea").inputValue()) === "Begin again tomorrow." && (await page.locator("[data-page-quote] input").inputValue()) === "My grandmother", "the quote's words are not the writer's");
  expectThat(await page.locator("[data-page-quote] textarea").evaluate((el) => getComputedStyle(el).fontStyle === "italic"), "the quote's words are not in italic");
  // Every remove is a finger wide, on the screen's side of its block.
  const removes = await page.locator("[data-page-block] button[aria-label=Remove]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  expectThat(removes.length >= 3 && removes.every((r) => r.width >= 44 && r.height >= 44 && r.x + r.width <= 390.5), `a remove is ${removes.map((r) => `${Math.round(r.width)} by ${Math.round(r.height)}`).join(", ")}`);
});

await flow("a verse's heading opens the passage at the verse, Back returns to the journal, and the page is as it was left", async (page) => {
  await write(page);
  await tap(page, tools(page).nth(VERSE), "Verse");
  await wait(400);
  await page.keyboard.type("John 3:16");
  await wait(500);
  await tap(page, page.locator("[data-page-verse-finder] li button").first(), "the verse");
  await wait(600);
  await page.keyboard.type("What I read this morning.");
  await wait(700);
  // With no signal and nothing kept the heading still stands, and under it the way to read.
  expectThat((await page.locator("[data-page-verse]").innerText()).replace(/\s+/g, " ").trim() === "John 3:16 Open to read", `the card says "${(await page.locator("[data-page-verse]").innerText()).replace(/\s+/g, " ").trim()}"`);
  await tap(page, page.locator("[data-page-verse-place]"), "the verse's heading");
  await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/bible/john/3", null, { timeout: 15000 });
  expectThat((await page.evaluate(() => location.hash)) === "#v16", `the passage opened at "${await page.evaluate(() => location.hash)}"`);
  await wait(1500);
  expectThat((await page.locator("[data-journal-composer]").count()) === 0, "the writing sheet came along to the Bible");
  await page.goBack();
  await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/journal", null, { timeout: 15000 });
  await page.waitForSelector("[data-journal-today]", { timeout: 15000 });
  await wait(900);
  // What was being written waits, and Write goes on with it.
  expectThat((await page.locator("[data-journal-write]").last().innerText()).trim() === "Continue writing", `the button says "${(await page.locator("[data-journal-write]").last().innerText()).trim()}"`);
  await write(page);
  expectThat((await page.locator("[data-page-verse-place]").innerText()).trim() === "John 3:16", "the verse is not on the page any more");
  expectThat((await page.locator("[data-page-text] textarea").last().inputValue()) === "What I read this morning.", "the words are not on the page any more");
});

/** You's rows, by address, name and line, and where each stands on the screen. */
const youRows = (page) =>
  page.locator("[data-you-rows] li").evaluateAll((els) =>
    els.map((li) => ({
      href: (li.querySelector("a")?.getAttribute("href") ?? "").replace(/\/$/, ""),
      name: (li.querySelector("p")?.textContent ?? "").trim(),
      line: (li.querySelectorAll("p")[1]?.textContent ?? "").trim(),
      height: li.getBoundingClientRect().height,
      lock: !!li.querySelector("[data-you-row-plus]"),
    })),
  );

await flow(
  "You: Your journal and Your Florilegium lead the rows for a reader who has written nothing, and each opens its page and comes back",
  async (page) => {
    const rows = await youRows(page);
    expectThat(rows[0]?.href === "/journal" && rows[0].name === "Your journal" && rows[0].line === "What you write, and your notes on verses", `the first row is ${JSON.stringify(rows[0])}`);
    expectThat(rows[1]?.href === "/florilegium" && rows[1].name === "Your Florilegium" && rows[1].line === "The lines you keep", `the second row is ${JSON.stringify(rows[1])}`);
    expectThat(rows[2]?.href === "/prayers/personal" && rows.at(-1).href === "/settings", `after them: ${rows.slice(2).map((r) => r.href).join(", ")}`);
    expectThat(rows.every((r) => r.height >= 44), `a row is ${rows.map((r) => Math.round(r.height)).join(", ")}px high`);
    // The mark is the reader's: the padlock on the Florilegium alone without Plus, and none with Plus's parts.
    expectThat(!rows[0].lock && rows[1].lock === (READER === "free"), `the locks are ${rows.map((r) => r.lock).join()}`);
    // Nothing is written, so the shelf has no journal cover: the row is the journal's door.
    expectThat((await page.locator('[data-you-kept] a[href^="/journal"]').count()) === 0, "a reader who has written nothing has a journal cover on the shelf");
    for (const [n, path, there] of [
      [0, "/journal", "[data-journal-today]"],
      [1, "/florilegium", "main h1, [data-route-content] h1"],
    ]) {
      const row = page.locator("[data-you-rows] li a").nth(n);
      await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await wait(500);
      const before = await page.evaluate(() => Math.round(window.scrollY));
      await tap(page, row, path);
      await page.waitForFunction((p) => location.pathname.replace(/\/$/, "") === p, path, { timeout: 15000 });
      await page.waitForSelector(there, { timeout: 15000 });
      await wait(900);
      await page.goBack();
      await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/account", null, { timeout: 15000 });
      await page.waitForSelector("[data-you-rows] li", { timeout: 15000 });
      await wait(1200);
      const after = await page.evaluate(() => Math.round(window.scrollY));
      expectThat(Math.abs(after - before) <= 4, `Back from ${path} landed ${after - before}px from where the reader was`);
    }
  },
  { at: "/account", ready: "[data-you-rows] li" },
);

await flow(
  "Settings: under the account, the journal and the Florilegium are there to choose, and each opens its page and comes back",
  async (page) => {
    const ids = await page.locator("section[id]").evaluateAll((els) => els.map((el) => el.id));
    expectThat(ids[0] === "account" && ids[1] === "journal", `Settings opens with ${ids.slice(0, 3).join(", ")}`);
    const rows = await page.locator("#journal a").evaluateAll((els) =>
      // innerText, so two parts drawn apart (a name and the mark beside it) are read apart.
      els.map((a) => ({ href: (a.getAttribute("href") ?? "").replace(/\/$/, ""), words: [...a.querySelectorAll("p")].map((p) => p.innerText.replace(/\s+/g, " ").trim()), height: a.getBoundingClientRect().height })),
    );
    expectThat(rows.length === 2 && rows[0].href === "/journal" && rows[1].href === "/florilegium", `the rows are ${rows.map((r) => r.href).join(", ")}`);
    expectThat(rows[0].words.join(" | ") === "Your journal | What you write, and your notes on verses", `the journal's row says ${rows[0].words.join(" | ")}`);
    expectThat(rows[1].words.join(" | ") === `Your Florilegium${READER === "free" ? " Purify Plus" : ""} | The lines you keep`, `the Florilegium's row says ${rows[1].words.join(" | ")}`);
    expectThat(rows.every((r) => r.height >= 44), "a row is under 44px");
    expectThat((await page.locator("#journal h2").count()) === 0, "a heading stands over the two");
    for (const [n, path, there] of [
      [0, "/journal", "[data-journal-today]"],
      [1, "/florilegium", "main h1, [data-route-content] h1"],
    ]) {
      await tap(page, page.locator("#journal a").nth(n), path);
      await page.waitForFunction((p) => location.pathname.replace(/\/$/, "") === p, path, { timeout: 15000 });
      await page.waitForSelector(there, { timeout: 15000 });
      await wait(900);
      await page.goBack();
      await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/settings", null, { timeout: 15000 });
      await page.waitForSelector("#journal a", { timeout: 15000 });
      await wait(900);
    }
  },
  { at: "/settings", ready: "#journal a" },
);

// A reader without Plus, on an export that sells it.
await flow("without Plus: nothing under Title opens the Plus sheet, and the notebook's door in More does, named for the journal", async (page) => {
  await write(page);
  expectThat((await page.locator("[data-page-props]").count()) === 0, "a line stands under Title");
  const title = await page.locator("[data-journal-title]").boundingBox();
  await page.touchscreen.tap(title.x + 80, title.y + title.height + 14);
  await wait(700);
  expectThat((await dialogs(page)).length === 1, `a tap under Title opened ${(await dialogs(page)).slice(1).join(", ")}`);
  expectThat((await cursor(page)) === "the words", `a tap under Title gave the cursor to ${await cursor(page)}`);
  await tap(page, tools(page).nth(MORE), "More");
  await wait(400);
  await tap(page, page.locator("[data-page-more-props]"), "Add to a notebook");
  await wait(900);
  expectThat((await page.locator("[data-page-props-panel]").count()) === 0, "the notebook panel opened without Plus");
  expectThat((await dialogs(page)).length === 2, "the Plus sheet did not open");
}, { reader: "free" });

// ── Push 3: what waits is never lost (fact 17), and the Florilegium and the notebooks as one (note 19) ──

const closeSheet = async (page) => {
  await tap(page, page.locator("[role=dialog] button", { hasText: "Close" }).first(), "Close");
  await wait(900);
  expectThat((await page.locator("[data-journal-composer]").count()) === 0, "the sheet stayed open");
};
/** An entry in the list tapped, and its sheet at rest. */
const openEntry = async (page, words) => {
  const row = page.locator("[data-journal-entry]", { hasText: words }).first();
  await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await wait(400);
  await tap(page, row, `the entry "${words}"`);
  await page.waitForSelector("[data-journal-title]", { state: "attached", timeout: 10000 });
  await wait(1300);
};
const lastWords = (page) => page.locator("[data-page-text] textarea").last().inputValue();
const byId = (list, id) => list.find((r) => r.id === id);

// Before 2026-11-11: the entry opened took the half thought's place in the journal's one draft, and it was gone.
await flow(
  "what waits: half a thought is written and closed, an older entry is opened, and the half thought is kept as a page with nothing else changed",
  async (page) => {
    await write(page);
    await page.keyboard.type(HALF_THOUGHT);
    await wait(600);
    await closeSheet(page);
    expectThat((await writeSays(page)) === "Continue writing", `the button says "${await writeSays(page)}"`);
    expectThat((await records(page)).length === 2, "Close kept a page no one asked to keep");
    await openEntry(page, "Words kept last week.");
    expectThat((await page.locator("[data-journal-title]").inputValue()) === "An older page", "the older entry did not open");
    const list = await records(page);
    expectThat(list.length === 3 && list[0].body === HALF_THOUGHT, `the half thought was not kept: ${JSON.stringify(list.map((r) => r.body))}`);
    expectThat(byId(list, OLDER.id).updatedAt === OLDER.updatedAt && byId(list, OTHER.id).updatedAt === OTHER.updatedAt, "a page that was not touched took a new date");
    await closeSheet(page);
    // It is in the list, first under today, as Done would have kept it.
    expectThat((await page.locator("[data-journal-entry]").first().innerText()).includes(HALF_THOUGHT), "the half thought is not in the list");
    // The older entry was only read: it does not wait, and Write is Write.
    expectThat((await writeSays(page)) === "Write" && (await waiting(page)) === null, `after reading an entry the button says "${await writeSays(page)}"`);
    expectThat((await records(page)).length === 3, "reading an entry made a copy");
  },
  { set: kept(OLDER, OTHER) },
);

// Before 2026-11-11: an entry read and closed waited; Write said "Continue writing" and opened that entry again.
await flow(
  "what waits: an entry opened to be read and closed does not wait: Write begins a new page, and no copy or new date is made",
  async (page) => {
    const before = JSON.stringify(await records(page));
    await openEntry(page, "Words kept last week.");
    await closeSheet(page);
    expectThat((await writeSays(page)) === "Write", `the button says "${await writeSays(page)}"`);
    expectThat((await waiting(page)) === null, "a page that was only read waits");
    expectThat(JSON.stringify(await records(page)) === before, "reading an entry changed the list");
    await write(page);
    expectThat((await page.locator("[data-journal-title]").inputValue()) === "" && (await lastWords(page)) === "", "Write opened the entry that was read");
    // Nothing written: nothing waits, and nothing is kept.
    await closeSheet(page);
    expectThat((await writeSays(page)) === "Write" && (await waiting(page)) === null, "an empty page waits");
    await openEntry(page, "Another page, kept before.");
    await closeSheet(page);
    expectThat(JSON.stringify(await records(page)) === before, "an empty page was kept, or a date changed");
  },
  { set: kept(OLDER, OTHER) },
);

await flow(
  "what waits: an entry changed and closed goes on when it is opened again, and when another is opened it is changed once, in place",
  async (page) => {
    await openEntry(page, "Words kept last week.");
    await page.keyboard.type(" And a line more.");
    await wait(600);
    await closeSheet(page);
    expectThat((await writeSays(page)) === "Continue writing", `the button says "${await writeSays(page)}"`);
    expectThat(byId(await records(page), OLDER.id).body === OLDER.body, "Close changed the kept entry");
    // The same page: it goes on with what waits.
    await openEntry(page, "Words kept last week.");
    expectThat((await lastWords(page)) === "Words kept last week. And a line more.", `opened again it reads "${await lastWords(page)}"`);
    expectThat(byId(await records(page), OLDER.id).body === OLDER.body, "opening the same page kept it early");
    await closeSheet(page);
    // Another page: what waits is kept first, as Done keeps it.
    await openEntry(page, "Another page, kept before.");
    const list = await records(page);
    const older = byId(list, OLDER.id);
    expectThat(list.length === 2, `${list.length} pages: a copy was made`);
    expectThat(older.body === "# An older page\n\nWords kept last week. And a line more.", `kept as ${JSON.stringify(older.body)}`);
    expectThat(older.createdAt === OLDER.createdAt && Date.parse(older.updatedAt) > Date.parse(OLDER.updatedAt), "its first date changed, or its change was not dated");
    expectThat(byId(list, OTHER.id).updatedAt === OTHER.updatedAt, "the entry opened took a new date");
    expectThat((await lastWords(page)) === "Another page, kept before.", "the entry asked for did not open");
    await closeSheet(page);
    expectThat((await writeSays(page)) === "Write", `after it the button says "${await writeSays(page)}"`);
  },
  { set: kept(OLDER, OTHER) },
);

// Before 2026-11-11: Continue writing then opened the removed entry, and Done put the words on it, where no one saw them again.
await flow(
  "what waits: an entry taken away takes its waiting changes with it; Write is Write again, and Undo brings back what was written",
  async (page) => {
    await openEntry(page, "Words kept last week.");
    await page.keyboard.type(" And a line more.");
    await wait(600);
    await closeSheet(page);
    expectThat((await writeSays(page)) === "Continue writing", `the button says "${await writeSays(page)}"`);
    const row = page.locator("[data-journal-entry]", { hasText: "Words kept last week." }).first();
    await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(400);
    const box = await row.boundingBox();
    await pull(page, box.x + box.width - 60, box.y + box.height / 2, -240, 0);
    await page.waitForSelector("[data-undo-bar]", { timeout: 8000 });
    await wait(500);
    const gone = byId(await records(page), OLDER.id);
    expectThat(!!gone.deletedAt, "the swipe did not take the entry away");
    expectThat(gone.body.endsWith("And a line more."), "what was written was not kept on the entry before it went");
    expectThat((await waiting(page)) === null, "a page that is gone still waits");
    await tap(page, page.locator("[data-undo-bar] button").first(), "Undo");
    await wait(900);
    const back = byId(await records(page), OLDER.id);
    expectThat(!back.deletedAt && back.body.endsWith("And a line more."), "Undo did not bring back what was written");
    expectThat((await page.locator("[data-journal-entry]", { hasText: "And a line more." }).count()) === 1, "the entry is not in the list again");
    // Undo's bar has gone; the button is the journal's own again, and it begins a new page.
    await page.locator("[data-journal-write]").last().waitFor({ state: "visible", timeout: 15000 });
    expectThat((await writeSays(page)) === "Write", `the button says "${await writeSays(page)}"`);
  },
  { set: kept(OLDER, OTHER) },
);

const onGathering = async (page) => {
  await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/florilegium/gathering", null, { timeout: 15000 });
  await page.waitForSelector("[data-gathering-page]", { timeout: 15000 });
  await wait(1000);
};
/** From a gathering to the journal, with the writing sheet at rest. */
const sheetFromGathering = async (page) => {
  await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/journal", null, { timeout: 15000 });
  await page.waitForSelector("[data-journal-title]", { state: "attached", timeout: 15000 });
  await wait(1500);
};
const FLOR = { at: "/florilegium", ready: "main h1, [data-route-content] h1", reader: "plus" };

await flow(
  "a gathering: Write in this gathering begins a page there; kept, it stands in the journal and under the gathering's lines, and its row opens it again",
  async (page) => {
    const g = await gatheringWithPages(page);
    const rowsBefore = await page.locator("[data-gathering-page-row]").count();
    expectThat(rowsBefore === 2, `${rowsBefore} pages listed`);
    expectThat((await page.locator("#gathering-pages").innerText()).trim() === "Your pages", "the part is not named");
    const begin = page.locator("[data-gathering-write]");
    await begin.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(500);
    expectThat((await begin.innerText()).trim() === "Write in this gathering" && (await begin.boundingBox()).height >= 44, "the way to write is not there, or is under 44px");
    await tap(page, begin, "Write in this gathering");
    await sheetFromGathering(page);
    expectThat((await page.locator("[data-page-props]").innerText()).trim() === g.title, `the page's notebook line says "${await page.locator("[data-page-props]").innerText()}"`);
    expectThat((await cursor(page)) === "the words", `the cursor is in ${await cursor(page)}`);
    await page.keyboard.type("Read again tonight.");
    await wait(400);
    await tap(page, page.locator("[data-journal-done]"), "Done");
    await wait(900);
    const first = page.locator("[data-journal-entry]").first();
    expectThat((await first.innerText()).includes("Read again tonight.") && (await first.innerText()).includes(g.title), "the page is not in the journal's list under its notebook");
    expectThat((await records(page))[0].body === `[[notebook ${g.title}]]\n\nRead again tonight.`, `kept as ${JSON.stringify((await records(page))[0].body)}`);
    // Back, as a reader goes back: the gathering, where they were, with the new page first.
    await page.goBack();
    await onGathering(page);
    const rows = page.locator("[data-gathering-page-row]");
    expectThat((await rows.count()) === 3 && (await rows.first().innerText()).includes("Read again tonight."), "the new page is not first under the gathering's lines");
    await rows.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(500);
    await tap(page, rows.first(), "the page's row");
    await sheetFromGathering(page);
    expectThat((await lastWords(page)) === "Read again tonight.", "the row did not open its page");
    await closeSheet(page);
    expectThat((await writeSays(page)) === "Write", `a page that was only read waits: "${await writeSays(page)}"`);
  },
  FLOR,
);

await flow(
  "a gathering: closed with nothing written, a page begun there is no page, and nothing waits",
  async (page) => {
    await gatheringWithPages(page);
    const begin = page.locator("[data-gathering-write]");
    await begin.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(500);
    await tap(page, begin, "Write in this gathering");
    await sheetFromGathering(page);
    expectThat(await page.locator("[data-journal-done]").isDisabled(), "Done is lit on a page with nothing on it");
    await closeSheet(page);
    expectThat((await writeSays(page)) === "Write" && (await waiting(page)) === null, `an empty page waits: "${await writeSays(page)}"`);
    expectThat((await records(page)).length === 2, "an empty page was kept");
  },
  FLOR,
);

await flow(
  "a gathering: a line's Write a page lays that line as the page's card, once, and a second line joins it on the same page",
  async (page) => {
    const g = await gatheringWithPages(page);
    const line = (n) => page.locator("[data-gathered-line]").nth(n);
    const writeFrom = async (n) => {
      await line(n).evaluate((el) => el.scrollIntoView({ block: "center" }));
      await wait(500);
      const where = (await line(n).locator("a").first().innerText()).trim();
      await tap(page, line(n).locator("[data-gathered-write]"), "Write a page");
      await sheetFromGathering(page);
      return where;
    };
    const first = await writeFrom(0);
    expectThat((await page.locator("[data-page-verse-place]").count()) === 1 && (await page.locator("[data-page-verse-place]").innerText()).trim() === first, `the card is not the line (${first})`);
    expectThat((await page.locator("[data-page-props]").innerText()).trim() === g.title, "the page is not in the gathering");
    expectThat((await cursor(page)) === "the words", `the cursor is in ${await cursor(page)}`);
    // A card alone is something: the page waits.
    await closeSheet(page);
    expectThat((await writeSays(page)) === "Continue writing", `the button says "${await writeSays(page)}"`);
    await page.goBack();
    await onGathering(page);
    // The same line again: the page goes on, with one card.
    await writeFrom(0);
    expectThat((await page.locator("[data-page-verse-place]").count()) === 1, `${await page.locator("[data-page-verse-place]").count()} cards for one line`);
    await closeSheet(page);
    await page.goBack();
    await onGathering(page);
    const second = await writeFrom(1);
    const places = (await page.locator("[data-page-verse-place]").allInnerTexts()).map((x) => x.trim());
    expectThat(places.length === 2 && places[0] === first && places[1] === second, `the page holds ${places.join(", ")}`);
    expectThat((await records(page)).length === 2, "a page was kept before Done");
  },
  FLOR,
);

await flow(
  "a gathering: a page that waits from elsewhere is kept before a page begins here, and the new page is the gathering's alone",
  async (page) => {
    const g = await gatheringWithPages(page);
    const begin = page.locator("[data-gathering-write]");
    await begin.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(500);
    await tap(page, begin, "Write in this gathering");
    await sheetFromGathering(page);
    const list = await records(page);
    expectThat(list.length === 3 && list[0].body === HALF_THOUGHT, `the page that waited was not kept: ${JSON.stringify(list.map((r) => r.body.slice(0, 30)))}`);
    expectThat((await page.locator("[data-journal-title]").inputValue()) === "" && (await lastWords(page)) === "", "the new page carries the words that waited");
    expectThat((await page.locator("[data-page-props]").innerText()).trim() === g.title, "the new page is not in the gathering");
  },
  { ...FLOR, set: draft(HALF_THOUGHT) },
);

await flow(
  "the journal: a gathering's notebook wears the flower; chosen, one line says how many lines it keeps and opens it, and Back returns",
  async (page) => {
    const g = await gatheringWithPages(page);
    await page.evaluate((r) => {
      localStorage.setItem("purify:journal", JSON.stringify([...JSON.parse(localStorage.getItem("purify:journal") ?? "[]"), r]));
      window.dispatchEvent(new Event("purify:journal"));
    }, IN_A_NOTEBOOK);
    await go(page, "/journal");
    await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    await wait(900);
    const chips = await page.locator("[data-journal-notebook]").evaluateAll((els) => els.map((el) => `${el.getAttribute("data-journal-notebook")}: ${el.textContent.trim()}`));
    expectThat(chips.join(" | ") === `notebook: Advent 2026 | gathering: ${g.title}`, `the notebooks are ${chips.join(" | ")}`);
    // Each name on one line in its chip, however many chips the row scrolls (it stood on three lines until 2026-11-11).
    const pills = await page.locator("button:has([data-journal-notebook])").evaluateAll((els) => els.map((el) => ({ name: el.textContent.trim(), h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width })));
    expectThat(pills.every((c) => c.h <= 40 && c.w > 90), `a notebook's chip is squeezed: ${pills.map((c) => `${c.name} ${Math.round(c.w)} by ${Math.round(c.h)}`).join(", ")}`);
    expectThat((await page.locator("[data-journal-gathering]").count()) === 0, "the line stands with no notebook chosen");
    const chip = page.locator('[data-journal-notebook="gathering"]').first();
    await chip.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(500);
    await tap(page, chip, "the gathering's chip");
    await wait(700);
    const line = page.locator("[data-journal-gathering]");
    expectThat((await line.count()) === 1, "the line to the gathering is not there");
    expectThat((await line.innerText()).replace(/\s+/g, " ").trim() === `${g.title} · ${STARTER.lines.length} lines`, `the line says "${(await line.innerText()).replace(/\s+/g, " ").trim()}"`);
    expectThat((await line.boundingBox()).height >= 44, "the line is under 44px");
    expectThat((await page.locator("[data-journal-entry]").count()) === 2, `${await page.locator("[data-journal-entry]").count()} pages shown for the gathering`);
    // An ordinary notebook has no such line.
    await tap(page, page.locator('[data-journal-notebook="notebook"]').first(), "the notebook's chip");
    await wait(600);
    expectThat((await page.locator("[data-journal-gathering]").count()) === 0, "a notebook that is no gathering leads to one");
    await tap(page, chip, "the gathering's chip");
    await wait(600);
    await line.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(400);
    await tap(page, line, "the line to the gathering");
    await onGathering(page);
    expectThat((await page.evaluate(() => new URLSearchParams(location.search).get("g"))) === g.id, "it opened another gathering");
    await page.goBack();
    await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/journal", null, { timeout: 15000 });
    await page.waitForSelector("[data-journal-today]", { timeout: 15000 });
  },
  FLOR,
);

await flow(
  "a page's notebook: the reader's gatherings are offered first, with the flower, and one tapped puts the page in it",
  async (page) => {
    const g = await gatheringWithPages(page);
    await page.evaluate((r) => {
      localStorage.setItem("purify:journal", JSON.stringify([...JSON.parse(localStorage.getItem("purify:journal") ?? "[]"), r]));
      window.dispatchEvent(new Event("purify:journal"));
    }, IN_A_NOTEBOOK);
    await go(page, "/journal");
    await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    await wait(900);
    await write(page);
    await tap(page, tools(page).nth(MORE), "More");
    await wait(400);
    await tap(page, page.locator("[data-page-more-props]"), "Add to a notebook");
    await wait(600);
    const offered = await page.locator("[data-page-notebook-choice]").evaluateAll((els) =>
      els.map((el) => ({ kind: el.getAttribute("data-page-notebook-choice"), name: el.textContent.trim(), h: el.getBoundingClientRect().height, icon: el.querySelectorAll("svg").length })),
    );
    expectThat(offered.map((o) => `${o.kind}: ${o.name}`).join(" | ") === `gathering: ${g.title} | notebook: Advent 2026`, `offered ${offered.map((o) => `${o.kind}: ${o.name}`).join(" | ")}`);
    expectThat(offered.every((o) => o.h >= 44 && o.icon === 1), "a choice is under 44px or wears no mark");
    await tap(page, page.locator('[data-page-notebook-choice="gathering"]').first(), "the gathering");
    await wait(500);
    expectThat((await page.locator("[data-page-props]").innerText()).trim() === g.title, `the page's notebook line says "${await page.locator("[data-page-props]").innerText()}"`);
    // The one the page is in is no longer offered; the way out of it is.
    const after = await page.locator("[data-page-notebook-choice]").allInnerTexts();
    expectThat(after.map((x) => x.trim()).join(" | ") === "Advent 2026", `once chosen, offered ${after.join(" | ")}`);
  },
  FLOR,
);

// The arbiter's first check: at 320 the line's row keeps every name whole and 44px, wrapping if it must.
await flow(
  "a gathering at 320px: each line's row keeps every name whole and 44px, wraps under its source, and nothing runs off the screen",
  async (page) => {
    await gatheringWithPages(page);
    await page.setViewportSize({ width: 320, height: 700 });
    await wait(900);
    const lines = await page.locator("[data-gathered-line]").evaluateAll((els) =>
      els.map((el) => {
        const source = el.querySelector("a").getBoundingClientRect();
        const tools = [...el.querySelectorAll("[data-gathered-tools] button")].map((b) => {
          const r = b.getBoundingClientRect();
          return { name: b.textContent.trim(), w: r.width, h: r.height, x: r.x, right: r.right, y: r.y, cut: b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1, lines: Math.round(r.height / 44) };
        });
        return { source: { bottom: source.bottom, h: source.height }, tools };
      }),
    );
    expectThat(lines.length >= 3, `${lines.length} lines`);
    for (const l of lines) {
      expectThat(l.tools.map((t) => t.name).join(", ") === "Add note, Write a page, Remove", `a line offers ${l.tools.map((t) => t.name).join(", ")}`);
      for (const t of l.tools) {
        expectThat(t.h >= 44 && t.w >= 44, `${t.name} is ${Math.round(t.w)} by ${Math.round(t.h)}`);
        expectThat(!t.cut, `${t.name} is cut`);
        expectThat(t.x >= 0 && t.right <= 320.5, `${t.name} runs off the screen (${Math.round(t.x)} to ${Math.round(t.right)})`);
      }
      // One line of three, each name on one line.
      expectThat(new Set(l.tools.map((t) => Math.round(t.y))).size === 1 && l.tools.every((t) => t.h < 60), "the three are not on one line, or a name is broken in two");
      expectThat(l.source.h >= 44, "the source is under 44px");
    }
    expectThat((await page.evaluate(() => document.documentElement.scrollWidth)) <= 320, `the page is ${await page.evaluate(() => document.documentElement.scrollWidth)}px wide`);
    // The pages' part too.
    const part = await page.locator("[data-gathering-pages] button").evaluateAll((els) => els.map((b) => ({ h: b.getBoundingClientRect().height, right: b.getBoundingClientRect().right })));
    expectThat(part.length === 3 && part.every((b) => b.h >= 44 && b.right <= 320.5), "a row of the pages' part is under 44px or off the screen");
    // And every written rule of the mockup checker, at this width.
    const check = await checkMock(page, "[data-gathering-page]");
    expectThat(printMockCheck(check, "a gathering at 320px"), "the mockup checker fails it at 320px");
  },
  FLOR,
);

// The arbiter's second check: a reader who never had Plus sees the Florilegium as today.
await flow(
  "without Plus: the Florilegium is the Plus card as before, with no pages part and no way to write offered",
  async (page) => {
    expectThat((await page.locator("[data-plus-gate]").count()) === 1, "the Plus card is not there");
    for (const absent of ["[data-gathering-pages]", "[data-gathering-write]", "[data-gathered-write]", "[data-florilegium-hub]", "[data-florilegium-read-only]"]) {
      expectThat((await page.locator(absent).count()) === 0, `${absent} is shown to a reader with no Plus`);
    }
    // The journal's own door to notebooks is the one it had: More's row with the Plus mark. No gathering is offered, and no new words.
    await go(page, "/journal");
    await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    await wait(900);
    expectThat((await page.locator("[data-journal-notebook], [data-journal-gathering]").count()) === 0, "a notebook or a gathering is shown in an empty journal");
    await write(page);
    await tap(page, tools(page).nth(MORE), "More");
    await wait(400);
    await tap(page, page.locator("[data-page-more-props]"), "Add to a notebook");
    await wait(900);
    expectThat((await page.locator("[data-page-notebook-choice]").count()) === 0 && (await dialogs(page)).length === 2, "the notebook choice opened without Plus");
  },
  { at: "/florilegium", ready: "[data-plus-gate]", reader: "free" },
);

await flow(
  "Plus lapsed: a kept gathering's pages are listed to open, with no way to write here; a row opens its page in the journal",
  async (page) => {
    expectThat((await page.locator("[data-florilegium-read-only] [data-gathering-page]").count()) === 1 && (await page.locator("[data-plus-gate]").count()) === 1, "the gathering to read and the Plus card are not both there");
    expectThat((await page.locator("[data-gathering-page-row]").count()) === 2, `${await page.locator("[data-gathering-page-row]").count()} pages listed`);
    for (const absent of ["[data-gathering-write]", "[data-gathered-write]", "[data-gathered-tools]", "[data-gathering-tools]"]) {
      expectThat((await page.locator(absent).count()) === 0, `${absent} is offered to a reader whose Plus has lapsed`);
    }
    const row = page.locator("[data-gathering-page-row]").first();
    await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wait(500);
    expectThat((await row.boundingBox()).height >= 44, "a page's row is under 44px");
    await tap(page, row, "the page's row");
    await sheetFromGathering(page);
    expectThat((await page.locator("[data-journal-title]").inputValue()) === "In the beginning", "the row did not open its page");
    // What they wrote is theirs to read and change; its notebook line wears the Plus mark, as before.
    expectThat((await page.locator("[data-page-props]").innerText()).replace(/\s+/g, " ").trim() === `${STARTER_NAME} Purify Plus`, `the notebook line says "${(await page.locator("[data-page-props]").innerText()).replace(/\s+/g, " ").trim()}"`);
  },
  { set: lapsed(), at: `/florilegium/gathering?g=${LAPSED_ID}`, ready: "[data-gathering-pages]", reader: "free" },
);

await flow(
  "Plus lapsed, nothing written in the gathering: no pages part stands there at all",
  async (page) => {
    expectThat((await page.locator("[data-gathered-line]").count()) === STARTER.lines.length, "the gathering's lines are not all there to read");
    for (const absent of ["[data-gathering-pages]", "[data-gathering-write]", "[data-gathered-write]"]) {
      expectThat((await page.locator(absent).count()) === 0, `${absent} is shown with nothing written`);
    }
  },
  { set: lapsed({ pages: false }), at: `/florilegium/gathering?g=${LAPSED_ID}`, ready: "[data-florilegium-read-only] [data-gathering-page]", reader: "free" },
);

// ── Build 95, note 4 (the owner on 2026-11-13: "notebook is not really optimized + some visual and ux bugs") ──

await flow(
  "build 95: the journal arrives whole: nothing under today's page moves as it comes",
  async (page) => {
    // The measure is the browser's own: what moved, with no finger down, and by how much of the screen.
    await page.evaluate(() => {
      window.__moved = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__moved.push(e.value);
      }).observe({ type: "layout-shift" });
    });
    await go(page, "/journal");
    await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    await wait(1500);
    const moved = await page.evaluate(() => window.__moved);
    // The old page: an empty 200px, then 268px, and the filters dropped 68px (0.037 of the screen).
    expectThat(Math.max(0, ...moved) < 0.01, `the page moved as it arrived (${moved.map((v) => v.toFixed(3)).join(", ")})`);
    expectThat((await page.locator("[data-journal-entry]").count()) > 0, "the pages kept before are not listed");
  },
  { set: kept(OLDER, OTHER), at: "/bible", ready: "main" },
);

await flow("build 95: the keyboard comes up on a page with nothing written, and the kinds stay where they were", async (page) => {
  await write(page);
  const before = await page.locator("[data-journal-kinds]").boundingBox();
  // An Android app's window grows short by its keyboard (lib/ui/viewport.ts): 320px of an 844px phone.
  await page.setViewportSize({ width: 390, height: 844 - 320 });
  await wait(700);
  const after = await page.locator("[data-journal-kinds]").boundingBox();
  const top = await sheetScroll(page).evaluate((el) => ({ scrolled: el.scrollTop, head: el.getBoundingClientRect().top }));
  expectThat(top.scrolled === 0, `the sheet scrolled ${top.scrolled}px with nothing written`);
  expectThat(!!after && !!before && Math.abs(after.y - before.y) < 1 && after.y >= top.head, `the kinds went from ${before?.y} to ${after?.y}, the sheet's head ending at ${top.head}`);
  // And the line being written is still kept in view once the words pass the foot.
  await page.keyboard.type("One.\nTwo.\nThree.\nFour.\nFive.\nSix.\nSeven.\nEight.\nNine.\nTen.\nEleven.");
  await wait(300);
  const line = await sheetScroll(page).evaluate((el) => ({ field: document.activeElement.getBoundingClientRect().bottom, foot: el.getBoundingClientRect().bottom }));
  expectThat(line.field <= line.foot, `the last line written is ${Math.round(line.field - line.foot)}px under the sheet's foot`);
});

await flow(
  "build 95: a highlight's wash is laid as its words are: the same size, the same lines",
  async (page) => {
    await write(page);
    const laid = await page.evaluate(() => {
      const block = document.querySelector("[data-page-text]:has([data-page-wash])");
      const field = block.querySelector("textarea");
      const wash = block.querySelector("[data-page-wash]");
      const lines = (rects) => new Set([...rects].map((r) => Math.round(r.top))).size;
      const words = document.createRange();
      words.selectNodeContents(wash.firstChild);
      const line = parseFloat(getComputedStyle(field).lineHeight);
      const own = getComputedStyle(wash);
      return {
        fieldSize: getComputedStyle(field).fontSize,
        washSize: getComputedStyle(wash.parentElement).fontSize,
        fieldLines: Math.round(field.scrollHeight / line),
        washLines: lines(words.getClientRects()),
        room: parseFloat(own.paddingInlineStart) + parseFloat(own.paddingInlineEnd) + Math.abs(parseFloat(own.marginInlineStart)) + Math.abs(parseFloat(own.marginInlineEnd)),
      };
    });
    expectThat(laid.fieldSize === laid.washSize, `the words are written at ${laid.fieldSize} and their wash laid at ${laid.washSize}`);
    expectThat(laid.room === 0, `the wash takes ${laid.room}px of each line that the words do not`);
    expectThat(laid.fieldLines === laid.washLines && laid.washLines >= 6, `the words stand on ${laid.fieldLines} lines and their wash on ${laid.washLines}`);
  },
  // Long enough to break many times at 390: one word sooner on any line shows in the count by the end.
  { set: draft(`==yellow== ${"Lord Jesus Christ, Son of God, have mercy on me. ".repeat(7).trim()}`) },
);

// ── Build 95, note 6 (the owner, 2026-11-13: "whenever you click on a different section in the journal UI the typing pad pops up automatically and it's buggy when it pops up") ──

/** Whether a place to write has the cursor: what brings the keyboard up on a phone. */
const hasCursor = (page) => page.evaluate(() => ["TEXTAREA", "INPUT"].includes(document.activeElement?.tagName ?? "") && !["checkbox", "radio"].includes(document.activeElement.type));

await flow(
  "build 95: no section opens the keyboard by itself: Write, an entry opened, Verse, Quote, Highlight, More and each of its blocks",
  async (page) => {
    await write(page, true, false);
    expectThat(!(await hasCursor(page)), "Write gave a field the cursor");
    for (const [name, at] of [["Verse", VERSE], ["Quote", QUOTE], ["Highlight", HIGHLIGHT], ["More", MORE]]) {
      await tap(page, tools(page).nth(at), name);
      await wait(450);
      expectThat(!(await hasCursor(page)), `${name} gave a field the cursor`);
      // Whatever it opened is shut again, as a second tap does (Quote opens nothing).
      if (name !== "Quote") await tap(page, tools(page).nth(at), name);
      await wait(250);
    }
    expectThat((await page.locator("[data-page-quote]").count()) === 1, "Quote laid no card with the keyboard down");
    // Close keeps the page; opened again from the foot, it stands with no cursor.
    await tap(page, page.locator("[data-journal-composer]").locator("xpath=ancestor::*[@role='dialog'][1]").getByRole("button", { name: "Close" }), "Close");
    await wait(900);
    await write(page, true, false);
    expectThat(!(await hasCursor(page)), "the page opened again gave a field the cursor");
  },
);

await flow(
  "build 95: an entry opened from the list is read with the keyboard down",
  async (page) => {
    await tap(page, page.locator("[data-journal-entry]").first(), "the entry");
    await page.waitForSelector("[data-journal-title]", { state: "attached", timeout: 10000 });
    await wait(1300);
    expectThat(!(await hasCursor(page)), "an entry opened gave a field the cursor");
  },
  { set: kept(OLDER, OTHER) },
);

await flow("build 95: a reader who is writing keeps the cursor: Quote goes on in the quote, and Verse in its finder", async (page) => {
  await write(page);
  await page.keyboard.type("Words of my own.");
  await tap(page, tools(page).nth(QUOTE), "Quote");
  await wait(350);
  expectThat(await page.evaluate(() => document.activeElement?.closest("[data-page-quote]") !== null), "Quote, tapped while writing, did not take the cursor into the quote");
  await tap(page, tools(page).nth(VERSE), "Verse");
  await wait(350);
  expectThat(await page.evaluate(() => document.activeElement?.closest("[data-page-verse-finder]") !== null), "Verse, tapped while writing, did not take the cursor into its finder");
});

if (WALK) {
  for (const l of left) console.log(`left  ${l}`);
  console.log("\n" + walked.map(([l, ok]) => `${ok ? "PASS" : "FAIL"}  ${l}`).join("\n"));
  process.exit(walked.every(([, ok]) => ok) ? 0 : 1);
}

console.log("\n" + results.map(([l, ok]) => `${ok ? "PASS" : "FAIL"}  ${l}`).join("\n"));
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
