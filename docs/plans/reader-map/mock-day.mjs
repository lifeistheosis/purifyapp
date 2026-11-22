#!/usr/bin/env node
// Mock-ups 5 to 7 of the mock-up phase: one day of the first week, worked on (the owner,
// 2026-11-22: "I want each day of the path actually worked on. right now it's just acts as a
// hyperlink to a page", then, asked what makes a day kept: "tapping done").
//
//   node docs/plans/reader-map/mock-day.mjs <export>
//
// writes img/mock-day-begins.jpg, img/mock-day-done.jpg, img/mock-day-kept.jpg and mock-day.html.
//
// Drawn from the app's own screens on the native export, never by hand. The walk is a reader's:
// Begin, Catholic, Continue, Not yet, Daily quiet, Continue, and then Begin on the week's card on
// Today, which opens the lesson "The Jesus Prayer" as it does today. On that page only what is
// proposed is changed, in three moments:
//
//   it begins   the small line over the title says the day of the week, in the week's own mark
//               (the card's eyebrow, as FirstStepsNudge draws it), and a line under the title says
//               why it is here for this reader and how long it is (the page's own "5 min").
//   done        at the foot, the page's own primary button says "Done for today". The two lesson
//               links stay, both as the quiet link the page already draws.
//   kept        after the tap, the week's own card stands where the button was: the day kept,
//               tomorrow's step by its name and the app's own line for it, and the way back.
//               The card is the one this reader tapped on Today, taken from the screen itself.
//
// Tomorrow's step is the app's own rule's answer for this reader (weekFor, asked on 2026-11-22):
// Start with the Fathers. Every still is held to checkMock before it is kept.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const IMG = path.join(HERE, "img");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { NATIVE_UA, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { checkMock, printMockCheck } = await import(at("scripts/mock-check.mjs"));
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/plans/reader-map.json"), "utf8"));
const WALK = JSON.parse(fs.readFileSync(path.join(HERE, "walk.json"), "utf8"));

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);

const TODAY = MAP.pages.jesusPrayer;
const TOMORROW = MAP.pages.fathersPath;
/** The app's own line for tomorrow's page, as its card on Today says it (walk.json, the Catholic road's first card). */
const TOMORROW_LINE = WALK.roads.catholic.card.words.split(TOMORROW.name)[1]?.replace(/\s*Begin\s*$/, "").trim();
if (!TOMORROW_LINE) throw new Error("the app's own line for tomorrow's page was not found");

/** The proposed words. "Your first week · 1 of 7" and every page's name and line are the app's own; the rest are new, and his to pass. */
export const DAY = {
  eyebrow: "Your first week · 1 of 7",
  why: "For peace in a hard time",
  done: "Done for today",
  kept: "Day 1 of 7, kept",
  tomorrow: `Tomorrow: ${TOMORROW.name}`,
  line: TOMORROW_LINE,
  back: "Back to Today",
};

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = true;
const must = (said) => {
  if (said !== "ok") throw new Error(said);
};

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: "Europe/Athens", reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    localStorage.setItem("purify:whatsNewSeen", "99");
    window.androidBridge = { postMessage() {} };
    window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
  });
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  await go(page, "/");
  const d = page.locator('[role="dialog"]').first();
  await d.waitFor({ state: "visible", timeout: 30000 });
  const tap = async (re) => {
    const b = d.getByRole("button", { name: re }).first();
    await b.waitFor({ state: "visible", timeout: 15000 });
    await b.click();
    await page.waitForTimeout(1200);
  };
  await tap(/^Begin/);
  await tap(/^Catholic/);
  await tap(/^Continue/);
  await tap(/^Not yet/);
  await tap(/^Daily quiet/);
  await tap(/^Continue with/);

  // The week's card on Today, as this reader has it: kept whole, to stand again at the day's end.
  const card = page.locator("[data-first-step]").first();
  await card.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(2500);
  if (!(await card.innerText()).includes(TODAY.name)) throw new Error(`the week's first card is not ${TODAY.name}`);
  const cardHtml = await card.evaluate((c) => c.outerHTML);
  // Its Begin stands under the tab bar as Today opens, so the card is brought clear of it first.
  await page.evaluate(() => window.scrollBy(0, document.querySelector("[data-first-step]").getBoundingClientRect().top - 200));
  await page.waitForTimeout(600);
  await card.locator("a").first().click();
  await page.waitForURL((u) => u.pathname.startsWith(TODAY.href), { timeout: 15000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);

  const keep = async (name, label) => {
    await page.waitForTimeout(900);
    ok = printMockCheck(await checkMock(page, "body"), label) && ok;
    const file = path.join(IMG, `${name}.jpg`);
    await sharp(await page.screenshot({ type: "png" })).jpeg({ quality: 84, mozjpeg: true }).toFile(file);
    console.log(`  still: ${path.relative(ROOT, file)} (${fs.statSync(file).size} bytes)\n`);
  };

  // 5. The day begins.
  must(
    await page.evaluate((day) => {
      const header = document.getElementById("lesson-title")?.parentElement;
      const small = header?.querySelector("p");
      if (!header || !small || !/min/.test(small.textContent)) return "the lesson's head is not the one expected";
      const long = small.textContent.split("·").pop().trim();
      small.className = "font-sans text-caption font-semibold text-premium-ink";
      small.textContent = day.eyebrow;
      const why = document.createElement("p");
      why.className = "mt-1.5 font-sans text-detail leading-[1.55] text-paper/65";
      why.textContent = `${day.why} · ${long}`;
      header.append(why);
      return "ok";
    }, DAY),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await keep("mock-day-begins", "mock-up 5: the day begins");

  // 6. Done, at the foot.
  must(
    await page.evaluate((day) => {
      const links = [...document.querySelectorAll("a")];
      const next = links.find((a) => /^Next lesson/.test(a.innerText.trim()));
      const before = links.find((a) => /^Previous lesson/.test(a.innerText.trim()));
      if (!next || !before) return "the lesson's foot is not the one expected";
      const done = document.createElement("button");
      done.type = "button";
      done.id = "mock-done";
      done.className = next.className;
      done.textContent = day.done;
      next.before(done);
      // One primary at the foot: the lesson's own two ways on stay, both as its quiet link.
      next.className = before.className;
      next.style.display = "flex";
      return "ok";
    }, DAY),
  );
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await keep("mock-day-done", "mock-up 6: done, at the foot");

  // 7. Kept: the week's card stands where the button was.
  must(
    await page.evaluate(({ day, cardHtml }) => {
      const done = document.getElementById("mock-done");
      if (!done) return "the button is gone";
      const holder = document.createElement("div");
      holder.innerHTML = cardHtml;
      const card = holder.firstElementChild;
      card.classList.remove("ob-day1-in", "mt-4");
      card.removeAttribute("data-first-step");
      const [eyebrow, title, line] = card.querySelectorAll("p");
      const link = card.querySelector("a");
      if (!eyebrow || !title || !line || !link) return "the week's card is not the one expected";
      eyebrow.textContent = day.kept;
      title.textContent = day.tomorrow;
      line.textContent = day.line;
      card.querySelector('button[aria-label]')?.remove();
      link.setAttribute("href", "/");
      link.firstChild.textContent = day.back;
      done.replaceWith(card);
      return "ok";
    }, { day: DAY, cardHtml }),
  );
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await keep("mock-day-kept", "mock-up 7: kept, and tomorrow named");
  await ctx.close();
} finally {
  await browser.close();
}
if (!ok) {
  console.error("a still failed the mock check: no page is written");
  process.exit(1);
}

// ── The page: the kit's own head, and the three stills with their reasons ──

const TEMPLATE = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const figure = (name, alt, caption) => `<figure class="k-figure k-phone">
      <img src="img/${name}.jpg" width="780" height="1688" alt="${esc(alt)}">
      <figcaption>${esc(caption)}</figcaption>
    </figure>`;
const table = (heads, rows) => `<div class="k-table-wrap">
      <table class="k-table">
        <thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("\n          ")}
        </tbody>
      </table>
    </div>`;

const body = `<main class="k-page">
  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For 2.0, mock-ups 5 to 7</span>
    <h1>One day, worked on</h1>
    <p class="k-lede">A day of the first week with a beginning, a middle and an end, where today there is a link.</p>
    <p class="k-meta">Drawn from the app's own screens. The same reader as before: a Catholic who has not yet been to an Orthodox church, and came for peace in a hard time. Day one: ${esc(TODAY.name)}.</p>
  </header>

  <section class="k-section">
    <h2>1. It begins as a day</h2>
    <p>Today the page says "Lesson 3" and does not know it is anyone's day. Here its first line is the week's own mark, and under the title it says why it is here for this reader.</p>
    ${figure("mock-day-begins", `The lesson ${TODAY.name}, opened as day one: over the title, ${DAY.eyebrow}; under it, ${DAY.why}, 5 minutes.`, "Drawn from the lesson's own page. New: the line over the title, in the week's own mark, and the line under it. The lesson itself is untouched.")}
    <p>The lesson is the same for every reader, as your rule asks. Only the frame around it is the reader's own.</p>
  </section>

  <section class="k-section">
    <h2>2. The reader says when it is done</h2>
    <p>The page already has its middle: the teaching, the prayer itself and "Try this". What it lacks is an end. One button at the foot: "${esc(DAY.done)}".</p>
    ${figure("mock-day-done", `The foot of the lesson: the button ${DAY.done}, and under it the lesson's own two links as quiet links.`, "Drawn from the lesson's own foot. New: the button's words. Today the button there says \"Next lesson\", which leads this reader away from their week; it stays, as a quiet link.")}
    <p>A day is kept when the reader taps it, and not before. Today it is counted at the first tap on Today, whether or not anything was read.</p>
  </section>

  <section class="k-section">
    <h2>3. It ends on tomorrow</h2>
    <p>The tap is answered at once, where the finger is: the week's own card stands in the button's place, with the day kept and tomorrow's step by its name.</p>
    ${figure("mock-day-kept", `After the tap: the week's card says ${DAY.kept}; ${DAY.tomorrow}; and a link, ${DAY.back}.`, "Drawn with the card this reader tapped on Today, taken from the screen itself. New: its three lines' words, and \"Back to Today\" where Begin was. Tomorrow's step is the app's own rule's answer for this reader.")}
    <p>The card that opened the day closes it. On Today the same card would stand in this state until tomorrow, so nothing vanishes under the finger. The small "Lesson read" over the card is the app's own mark, as it is today.</p>
  </section>

  <hr class="k-rule">

  <section class="k-section">
    <h2>The new words</h2>
    ${table(["The line", "Where it stands"], [
      [DAY.why, "Under the title: why this day is here"],
      [DAY.done, "The button at the foot"],
      [DAY.kept, "The card, after the tap"],
      ["Tomorrow: and the page's name", "The card, after the tap"],
      [DAY.back, "The card's link"],
    ])}
    <p>"${esc(DAY.eyebrow)}", every page's name and every page's own line are the app's today.</p>
  </section>

  <section class="k-section">
    <h2>Why it is drawn this way</h2>
    ${table(["The choice", "Why, and what it does for the reader"], [
      ["A frame around the page, and the page untouched", "Your rule is that no page knows who reads it. The frame is about the reader's own answers, so it needs no new teaching and no page changes for anyone."],
      ["The week's own mark over the title", "It is the line the card on Today wears, so the reader knows at once that this is their day and which one."],
      ["Done, by the reader's own tap", "Your answer of 22 November. It is the one honest sign that a day was kept, and it gives the day an end."],
      ["One primary button at the foot", "Today the foot's button leads to the next lesson, away from the week. One button means one next step, and for this reader the next step is to finish today."],
      ["The card comes back at the end", "The tap is answered where the finger is, tomorrow is named, and the card that opened the day is the one that closes it."],
    ])}
  </section>

  <section class="k-section">
    <h2>What a still cannot show</h2>
    ${table(["The part", "What it would be"], [
      ["The opening", "The card grows into the day in the house's motion. Today the card vanishes and Today jumps before the page moves, which is the rough switch you named."],
      ["The card's place on Today", "Clear of the tab bar. Today its Begin stands under it when Today opens."],
      ["How much of a page is the day's", "This lesson is five minutes, so it is all of it. A section's front page, such as the councils, needs one thing chosen from it first."],
      ["The week's own place", "The seven days of mock-up 4, with what is kept, what is today and what is ahead."],
    ])}
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">Each still passed the app's own mock check before it was kept.</p>
  </footer>
</main>
`;

const open = TEMPLATE.indexOf("<body>");
if (open < 0) throw new Error("the kit's template has no <body>");
const head = TEMPLATE.slice(0, open + "<body>".length)
  .replace(/<title>[^<]*<\/title>/, "<title>Purify day mock-ups</title>")
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Three drawings of one day of the first week, worked on, from the app\'s own screens.">');
fs.writeFileSync(path.join(HERE, "mock-day.html"), `${head}\n${body}</body>\n</html>\n`);
console.log("mock-day.html written");
