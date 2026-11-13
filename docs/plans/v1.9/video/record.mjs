#!/usr/bin/env node
// The 1.9 video's takes: the app itself, tapped by a finger and filmed.
//
//   node docs/plans/v1.9/video/record.mjs            every take
//   node docs/plans/v1.9/video/record.mjs journal    one take
//   node docs/plans/v1.9/video/record.mjs --dry ...  no film: a still at each look, for checking a take
//
// Each take opens the 1.9 export as a new reader with no Plus (lib.mjs) and
// does what a reader's finger does: taps, a hold, the page drawn up. The
// buttons' press, the page transitions and a card carrying its picture into
// its page are the app's own; nothing in a screen is drawn or changed.
// Before the film rolls, a take may go to where it starts. A take fails if a
// picture on the heritage list is ever in view, if a campaign is named, or if
// the reader is not a new reader.
//
// Frames and take.json go to .promo/v1.9-video/takes/<id>/ (out of git).

import { go, launchCamera, take, wait } from "./lib.mjs";

const TAKES = {
  /** Today on the feast of St Nicholas: the day's saint, the fast, and the Nativity Fast's night. */
  async today(h) {
    await dismiss(h);
    await h.roll();
    await h.look("today");
    h.mark("start");
    await h.rest(900);
    await h.drag(318, 1500, { name: "to the night" });
    await h.look("the night");
    h.mark("night");
    await h.rest(1700);
  },

  /** You, Your journal, and the pen beside the day's Gospel: a page begun. */
  async journal(h) {
    await dismiss(h);
    await h.roll();
    h.mark("start");
    await h.rest(500);
    await h.tap(h.page.getByRole("link", { name: "You", exact: true }), { name: "You" });
    await h.page.getByText("Your journal", { exact: true }).first().waitFor({ state: "visible" });
    await h.rest(750);
    await h.look("you");
    await h.tap(h.page.getByText("Your journal", { exact: true }), { name: "Your journal" });
    await h.page.waitForSelector("[data-journal-today]");
    h.mark("journal");
    await h.rest(1100);
    await h.look("journal");
    await h.tap(h.page.getByRole("button", { name: /^Gospel/ }), { name: "the pen by the Gospel" });
    await h.page.getByText("Reflection", { exact: true }).first().waitFor({ state: "visible" });
    h.mark("page");
    await h.rest(1500);
    await h.look("a page begun");
  },

  /** John 1: a finger held on verse 1, a highlight, then Study as a reader with no Plus meets it. */
  async verse(h) {
    await go(h.page, "/bible/john/1");
    await h.page.waitForSelector('button[aria-label="Open commentary on verse 1"]');
    await wait(1500);
    await h.roll();
    h.mark("start");
    await h.rest(500);
    await h.drag(150, 800, { name: "the chapter drawn up" });
    await h.rest(300);
    await h.look("john 1");
    if (await h.page.getByRole("dialog", { name: /Verse actions/ }).isVisible()) throw new Error("the verse's tools opened before the hold");
    await h.hold(await verseOne(h), () => h.page.getByRole("dialog", { name: /Verse actions/ }).waitFor({ state: "visible" }), { name: "held on John 1:1" });
    h.mark("tools");
    if (!(await h.page.getByRole("dialog", { name: /Verse actions/ }).getByText("John 1:1", { exact: false }).first().isVisible())) throw new Error("the tools are not John 1:1's");
    await h.rest(900);
    const tools = await h.look("the verse's tools");
    if (/\bCopied\b/.test(tools.words)) throw new Error("lifting the finger copied the verse");
    const sheet = h.page.getByRole("dialog", { name: /Verse actions/ });
    await h.tap(sheet.getByRole("button", { name: "Highlight color: Blue" }), { name: "a highlight" });
    await sheet.getByRole("button", { name: "Remove highlight" }).waitFor({ state: "visible" });
    h.mark("highlight");
    await h.rest(900);
    await h.tap(sheet.getByText("Study", { exact: true }), { name: "Study" });
    await h.page.getByText("Cross-references", { exact: true }).first().waitFor({ state: "visible" });
    h.mark("study");
    await h.rest(1100);
    await h.look("study");
    await h.drag(240, 1100, { name: "the study sheet drawn up" });
    await h.rest(900);
    await h.look("study, lower");
  },

  /** The translations list, drawn up to the Bibles to download. */
  async bibles(h) {
    await go(h.page, "/bible/john/1");
    await h.page.waitForSelector('button[aria-label="Open commentary on verse 1"]');
    await wait(1500);
    await h.roll();
    h.mark("start");
    await h.rest(500);
    await h.tap(h.page.getByRole("button", { name: /Switch translation/ }), { name: "KJV" });
    await h.page.getByRole("dialog", { name: "Translation" }).waitFor({ state: "visible" });
    h.mark("list");
    await h.rest(900);
    await h.look("translations");
    await h.drag(330, 1300, { at: { x: 206, y: 640 }, name: "to the Bibles to download" });
    await h.rest(500);
    await h.drag(300, 1200, { at: { x: 206, y: 640 }, name: "further" });
    await h.rest(1100);
    await h.look("the Bibles to download");
  },

  /** The calendar: November, the 23rd, St Amphilochius, and his web. */
  async saints(h) {
    await go(h.page, "/calendar");
    await h.page.getByRole("link", { name: /^November 2026/ }).waitFor({ state: "visible" });
    await wait(1500);
    await h.roll();
    h.mark("start");
    await h.rest(600);
    await h.look("december");
    await h.tap(h.page.getByRole("link", { name: /^November 2026/ }), { name: "November" });
    await h.page.getByRole("link", { name: /November 23,/ }).waitFor({ state: "visible" });
    await h.rest(700);
    await h.look("november");
    await h.tap(h.page.getByRole("link", { name: /November 23,/ }), { name: "the 23rd" });
    await h.rest(600);
    await h.drag(330, 1000, { name: "to the day's saints" });
    await h.rest(500);
    await h.look("23 november");
    h.mark("day");
    await h.tap(h.page.getByRole("link", { name: /Amphilochius/ }), { name: "St Amphilochius" });
    await h.page.getByRole("link", { name: /in the saint web/ }).waitFor({ state: "visible" });
    h.mark("saint");
    await h.rest(1500);
    await h.look("st amphilochius");
    await h.tap(h.page.getByRole("link", { name: /in the saint web/ }), { name: "Web" });
    await h.page.getByRole("button", { name: /Gregory of Nyssa/ }).first().waitFor({ state: "visible" });
    h.mark("web");
    await h.rest(2600);
    await h.look("his web");
  },

  /** St Xenia of St Petersburg's page, her life drawn up. */
  async xenia(h) {
    await go(h.page, "/saints/xenia-of-petersburg");
    await h.page.getByRole("heading", { name: /Xenia/ }).first().waitFor({ state: "visible" });
    await wait(1500);
    await h.roll();
    h.mark("start");
    await h.rest(1200);
    await h.look("st xenia");
    await h.drag(300, 2200, { name: "her life" });
    await h.rest(800);
    await h.look("st xenia, lower");
  },

  /** St Athanasius, his writings, and On the Incarnation opened from its cover. */
  async fathers(h) {
    await go(h.page, "/saints/athanasius-the-great");
    await h.page.getByRole("button", { name: "Writings" }).first().waitFor({ state: "visible" });
    await wait(1500);
    await h.roll();
    h.mark("start");
    await h.rest(600);
    await h.look("st athanasius");
    await h.tap(h.page.getByRole("button", { name: "Writings" }).first(), { name: "Writings" });
    await h.page.getByRole("link", { name: /^On the Incarnation/ }).first().waitFor({ state: "visible" });
    await h.rest(1000);
    await h.look("his writings");
    await h.tap(h.page.getByRole("link", { name: /^On the Incarnation/ }).first(), { name: "On the Incarnation" });
    await h.page.getByRole("heading", { name: "On the Incarnation" }).first().waitFor({ state: "visible" });
    h.mark("work");
    await h.rest(1400);
    await h.look("on the incarnation");
    await h.drag(360, 1500, { name: "the work drawn up" });
    await h.rest(900);
    await h.look("on the incarnation, lower");
  },

  /** Theology, and the Creed line by line with the words Constantinople added lit. */
  async creed(h) {
    await go(h.page, "/theology");
    await h.page.getByText("The Creed, line by line", { exact: true }).first().waitFor({ state: "visible" });
    await wait(1500);
    await h.roll();
    h.mark("start");
    await h.rest(700);
    await h.look("theology");
    await h.tap(h.page.getByText("The Creed, line by line", { exact: true }), { name: "The Creed, line by line" });
    await h.page.getByText("We believe in one God", { exact: false }).first().waitFor({ state: "visible" });
    h.mark("creed");
    await h.rest(1300);
    await h.look("the creed");
    await h.drag(420, 2000, { name: "the Creed drawn up" });
    await h.rest(900);
    await h.look("the creed, lower");
  },

  /** Reading mode: True black chosen, then the looks drawn up, each Plus set under its mark. */
  async looks(h) {
    await go(h.page, "/settings/reading-mode");
    await h.page.getByText("True black", { exact: true }).first().waitFor({ state: "visible" });
    await wait(1500);
    await h.roll();
    h.mark("start");
    await h.rest(800);
    await h.look("reading mode");
    await h.tap(h.page.getByText("True black", { exact: true }), { name: "True black" });
    h.mark("black");
    await h.rest(1300);
    await h.tap(h.page.getByText("Dark", { exact: true }), { name: "Dark" });
    await h.rest(900);
    await h.drag(300, 1500, { name: "the looks drawn up" });
    await h.rest(1000);
    await h.look("the looks");
  },
};

/** Today's one-question card, put away with its own Dismiss button before the film rolls, as a reader would. */
async function dismiss(h) {
  const button = h.page.locator('button[aria-label="Dismiss"]').first();
  await button.waitFor({ state: "visible", timeout: 20000 });
  for (let tries = 0; tries < 4 && (await button.isVisible()); tries++) {
    await wait(600);
    await h.page.touchscreen.tap(...Object.values(await h.spot(button)));
    await button.waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
  }
  if (await button.isVisible()) throw new Error("Today: the one-question card is still there");
  await h.page.evaluate(() => window.scrollTo(0, 0));
  await wait(1200);
}

/** Where John 1:1's own words are on the screen: the middle of the first line of the verse's text. */
async function verseOne(h) {
  const spot = await h.page.evaluate(() => {
    // The smallest thing on the page that holds the verse's words and not the next verse's.
    let verse = null;
    for (const el of (document.querySelector("main") ?? document.body).querySelectorAll("*")) {
      const text = el.textContent;
      if (!text.includes("In the beginning was the Word") || text.includes("The same was in the beginning")) continue;
      if (el.closest("details, summary, [role=dialog]")) continue;
      if (!verse || verse.contains(el)) verse = el;
    }
    if (!verse) return null;
    // Its first line of words.
    const walker = document.createTreeWalker(verse, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!/[A-Za-z]{2}/.test(node.textContent)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const first = range.getClientRects()[0];
      if (!first || first.width < 4) continue;
      const line = verse.getBoundingClientRect();
      const y = first.top + first.height / 2;
      if (y < 90 || y > innerHeight - 130) return null;
      return { x: Math.min(line.left + line.width / 2, first.left + 150), y };
    }
    return null;
  });
  if (!spot) throw new Error("John 1:1 is not on the screen");
  return spot;
}

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const wanted = args.filter((a) => !a.startsWith("--"));
for (const a of wanted) if (!TAKES[a]) throw new Error(`no take ${a}: ${Object.keys(TAKES).join(", ")}`);
const browser = await launchCamera();
let failed = 0;
for (const [id, run] of Object.entries(TAKES)) {
  if (wanted.length && !wanted.includes(id)) continue;
  const h = await take(browser, id, { film: !dry });
  if (dry) {
    const look = h.look;
    h.look = async (name) => {
      const seen = await look(name);
      console.log(`     ${name}: ${await h.still(name.replace(/\W+/g, "-"))}${Object.keys(seen.heritage).length ? `  HERITAGE ${Object.keys(seen.heritage)}` : ""}`);
      return seen;
    };
  }
  let error = null;
  try {
    await run(h);
  } catch (e) {
    error = e;
    await h.still("failed").catch(() => {});
  }
  const record = await h.end();
  if (error) record.problems.push(`the take stopped: ${error.message.split("\n")[0]}`);
  failed += record.problems.length ? 1 : 0;
  const fps = record.frames.length && record.seconds ? (record.frames.length / record.seconds).toFixed(0) : "0";
  console.log(`${record.problems.length ? "NO  " : "ok  "} ${id}  ${record.seconds.toFixed(1)}s of the app's time, ${record.frames.length} frames (${fps} a second)${record.problems.length ? `\n      ${record.problems.join("\n      ")}` : ""}`);
}
await browser.close();
process.exitCode = failed ? 1 : 0;
