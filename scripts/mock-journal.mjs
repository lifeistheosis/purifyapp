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

/** The journal, open on its page for the day. */
async function journal({ scale = 1, set = {} } = {}) {
  const o = await openPhone({ scale, set });
  if (SELLS_PLUS) await o.ctx.addInitScript(android);
  o.errors = [];
  o.page.on("pageerror", (e) => {
    // The stand-in shell has no plugins, and the app's own Back listener says so
    // (lib/platform/useAndroidBack.ts asks @capacitor/app). A phone has them. Nothing else is let by.
    if (SELLS_PLUS && /^"\w+" plugin is not implemented on android$/.test(e.message)) return;
    o.errors.push(e.message);
  });
  await go(o.page, "/journal");
  await o.page.waitForSelector("[data-journal-today]", { timeout: 30000 });
  await wait(1200);
  return o;
}

/** Write tapped; `rest` waits for the sheet to stand still. */
async function write(page, rest = true) {
  await tap(page, page.locator("[data-journal-write]").last(), "Write");
  await page.waitForSelector("[data-journal-title]", { state: "attached", timeout: 10000 });
  if (rest) await wait(1300);
}

const tools = (page) => page.locator("[data-page-toolbar] [role=toolbar] button");
const VERSE = 0, QUOTE = 1, HIGHLIGHT = 2, MORE = 3;

/** A page kept as a draft, as the journal keeps the one being written (lib/journal/entries.ts). */
const draft = (body, more = {}) => ({ "purify:journal.draft": JSON.stringify({ kind: "reflection", body, ...more }) });

// ── The stills ───────────────────────────────────────────────────────────

const results = [];
async function shot(name, label, selector, prepare, { set = {}, first = false } = {}) {
  if (WALK) return;
  if (ONLY && !ONLY.has(name.slice(0, 2))) return;
  const { browser, page, errors } = await journal({ scale: SCALE, set });
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

// ── The walk ─────────────────────────────────────────────────────────────

const walked = [];
const left = [];
const expectThat = (cond, what) => {
  if (!cond) throw new Error(what);
};

/** Who is walking: a new reader with no Plus on an export that sells it, or a reader for whom nothing is locked. */
const READER = SELLS_PLUS ? "free" : "plus";

async function flow(label, run, { set = {}, reader = "any" } = {}) {
  if (!WALK) return;
  if (FLOWS.length && !FLOWS.some((f) => label.toLowerCase().includes(f))) return;
  flowCount += 1;
  if (HALF && (flowCount % 2 === 1) !== (HALF === "1")) return;
  if (reader !== "any" && reader !== READER) {
    left.push(`${label}: ${reader === "free" ? "needs an export that sells Plus (SELLS_PLUS=1; see the header)" : "needs a reader with Plus's parts (an export that locks nothing)"}`);
    return;
  }
  const { browser, page, errors } = await journal({ set });
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

await flow("title: with no finger put down, the words are ready to write once the sheet is up", async (page) => {
  await write(page);
  expectThat((await cursor(page)) === "the words", `the cursor is in ${await cursor(page)}`);
  expectThat((await scrolled(page)) === 0, `the page moved ${await scrolled(page)}px`);
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

if (WALK) {
  for (const l of left) console.log(`left  ${l}`);
  console.log("\n" + walked.map(([l, ok]) => `${ok ? "PASS" : "FAIL"}  ${l}`).join("\n"));
  process.exit(walked.every(([, ok]) => ok) ? 0 : 1);
}

console.log("\n" + results.map(([l, ok]) => `${ok ? "PASS" : "FAIL"}  ${l}`).join("\n"));
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
