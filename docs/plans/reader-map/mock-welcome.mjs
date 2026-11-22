#!/usr/bin/env node
// Mock-up 13 of the mock-up phase: the welcome on Today with no box, and each thing once (the
// owner, 2026-11-22, with two pictures of his own Today: "I want a better welcome back screen
// honestly. (so first thing they see on the today) I don't like the black box square design and
// remember multiplicity optimization because the screens we have know it shows the same stuff
// twice which ruins immersion").
//
//   node docs/plans/reader-map/mock-welcome.mjs <export>
//
// writes img/mock-welcome-before.jpg (Today as it is), img/mock-welcome.jpg (the new first screen),
// img/mock-welcome-church.jpg (where the saint and the fast stand, once) and mock-welcome.html.
//
// Drawn from the app's own Today on the native export, as the reader in his pictures has it: a
// practicing Orthodox reader on the evening of Sunday 22 November 2026, day 8 of the Nativity
// Fast, fourteen days kept (what that reader's phone keeps is set before the page opens). Never by
// hand. The lead's own parts are kept and moved, and every class worn is one the screen already
// wears, so every colour and size is the app's:
//
//   the box      its edge, its corners and its side margins are taken away. The lead's night runs
//                the screen's whole width under the top bar, and ends in the horizon the star's
//                drawing already has. The hill under that horizon takes the page's own ground, so
//                the page begins where the sky ends.
//   the words    on the sky, clear of the star's side: the date, the hour's greeting (the app's own
//                words, today.greetingEvening) and Pascha's count under it. The star's three lines
//                are not drawn on it.
//   the action   under the horizon, on the page's own ground: the hour's prayer and the screen's
//                one Begin, as they are.
//   once         the saint stood in the lead and again in The Church today: he stands in The
//                Church today. The fast stood three times (the star's band, the lead, The Fast):
//                it stands in The Fast, which takes the star's own count and today's reading.
//
// No word is new. Held to checkMock before a still is kept.

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

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);

/** The hour's greeting, in the app's own words. */
const GREETING = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8"))["today.greetingEvening"];
if (!GREETING) throw new Error("the app has no evening greeting");

/** The evening of the owner's pictures, and the fourteen days before it. */
const NOW = "2026-11-22T17:55:00+02:00";
const DAYS = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 10, 22 - i)).toISOString().slice(0, 10));
/** What the phone of a practicing reader keeps, with fourteen days of morning prayers said. */
const KEPT = {
  "purify:onboarded": "4",
  "purify:level": "practicing",
  "purify:depth": "practicing",
  "purify:background": "orthodox",
  "purify:calendar.style": "new",
  "purify.prayers.morning.dates": JSON.stringify(DAYS),
};

/** Runs in the page: the lead with no box, the sky over the page, and each thing once. */
function draw(greeting) {
  const lead = document.querySelector("[data-day-lead]");
  const band = lead?.querySelector("[data-nativity-star]");
  const greet = lead?.children[1];
  const fast = document.querySelector('[data-today-band="fast"]');
  if (!lead || !band || !greet || greet.children.length !== 3 || !fast) return "Today is not the screen expected";
  const [date, saint, prayer] = greet.children;
  const bandText = band.children[1];
  const [bEyebrow, , bToday] = bandText.children;
  const hill = band.querySelector("path.fill-night-deep");
  const under = saint.querySelector("p");
  const fastWords = fast.children[0];
  const fastEyebrow = fastWords?.children[0];
  const fastLine = fastWords?.children[fastWords.children.length - 1];
  if (!bEyebrow || !bToday || !hill || !under || !fastEyebrow || !fastLine) return "the lead is not built as expected";
  const [season, count] = bEyebrow.textContent.split(" · ");
  const pascha = under.textContent.split(" · ").pop();
  if (!count || !pascha) return "the star's line or Pascha's count is not as expected";

  // The box is taken away: no edge, no corners, the screen's whole width, flush under the top bar.
  // Its margins undo the page's own padding, read from the page and not assumed.
  const pad = getComputedStyle(lead.parentElement);
  lead.className = "relative mb-5";
  lead.style.marginTop = `-${pad.paddingTop}`;
  lead.style.marginInline = `-${pad.paddingInlineStart} -${pad.paddingInlineEnd}`;
  // The page's own ground, read here, outside the night, for the hill under the horizon.
  lead.style.setProperty("--page-ground", "var(--color-night)");

  // The sky: the lead's own night with the fast's star, dark on every palette as the lead is.
  const sky = document.createElement("div");
  sky.className = "day-lead dark-island relative overflow-hidden";
  band.className = "dark-island tap-press relative block min-h-[196px] overflow-hidden bg-night-deep nat-rise";
  band.setAttribute("aria-label", `${season} · ${count}`);
  bandText.remove();
  hill.removeAttribute("class");
  hill.style.fill = "var(--page-ground)";

  // On the sky, clear of the star's own side: the date, the hour's greeting, and Pascha's count
  // under it, in the look of the lead's own line under a greeting.
  const words = document.createElement("div");
  words.className = "pointer-events-none absolute start-0 top-0 w-[64%] ps-5 pt-4";
  const hello = document.createElement("h2");
  hello.className = "title-in mt-2 font-serif text-heading leading-[1.1] text-paper";
  hello.textContent = greeting;
  const until = document.createElement("p");
  until.className = "mt-1 font-sans text-detail text-paper/65";
  until.textContent = pascha;
  words.append(date, hello, until);
  sky.append(band, words);

  // Under the horizon, on the page's own ground: the hour's prayer and the one Begin.
  prayer.className = "px-5 pt-3";
  lead.replaceChildren(sky, prayer);

  // Once: the fast's count and today's reading stand in The Fast, in its own lines' look.
  fastEyebrow.textContent = `${fastEyebrow.textContent} · ${count}`;
  bToday.className = `${fastLine.className.replace("mt-0.5", "mt-2")}`;
  fastWords.append(bToday);
  window.scrollTo(0, 0);
  const r = lead.getBoundingClientRect();
  return Math.round(r.left) === 0 && Math.round(r.right) === document.documentElement.clientWidth ? "ok" : `the sky runs from ${r.left} to ${r.right} of ${document.documentElement.clientWidth}`;
}

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = false;
/** The lead's height on the screen, before and after, in px. */
const high = { before: 0, after: 0 };
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: "Europe/Athens", reducedMotion: "reduce" });
  await ctx.addInitScript((kept) => {
    localStorage.setItem("purify:whatsNewSeen", "99");
    for (const [k, v] of Object.entries(kept)) localStorage.setItem(k, v);
    window.androidBridge = { postMessage() {} };
    window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
  }, KEPT);
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(NOW) });
  await go(page, "/");
  await page.locator("[data-day-lead]").first().waitFor({ state: "visible", timeout: 30000 });
  await page.locator('[data-today-band="fast"]').first().waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(4000);
  const still = async (name) => {
    const file = path.join(IMG, `${name}.jpg`);
    await sharp(await page.screenshot({ type: "png" })).jpeg({ quality: 84, mozjpeg: true }).toFile(file);
    console.log(`  still: ${path.relative(ROOT, file)}`);
  };

  // Today as it is.
  await still("mock-welcome-before");
  const height = () => page.evaluate(() => Math.round(document.querySelector("[data-day-lead]").getBoundingClientRect().height));
  high.before = await height();

  const drawn = await page.evaluate(draw, GREETING);
  if (drawn !== "ok") throw new Error(drawn);
  await page.waitForTimeout(900);
  high.after = await height();
  ok = printMockCheck(await checkMock(page, "body"), "mock-up 13: the welcome with no box, each thing once");
  await still("mock-welcome");

  // Where the saint and the fast stand, once: The Church today, under the top bar.
  await page.evaluate(() => {
    const band = document.querySelector('[data-today-band="saint"]');
    const label = band.parentElement.parentElement.previousElementSibling ?? band;
    const bar = document.querySelector('[data-screen-edge="top"]').getBoundingClientRect().bottom;
    window.scrollTo(0, label.getBoundingClientRect().top + scrollY - bar - 12);
  });
  await page.waitForTimeout(700);
  await still("mock-welcome-church");
} finally {
  await browser.close();
}
if (!ok) {
  console.error("the still failed the mock check: no page is written");
  process.exit(1);
}
console.log("the stills stand");

// ── The page: the kit's own head, now and new side by side, and the reason for each choice ──

const TEMPLATE = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const img = (name, alt) => `<img src="img/${name}.jpg" width="780" height="1688" alt="${esc(alt)}">`;
const table = (heads, rows) => `<div class="k-table-wrap">
      <table class="k-table">
        <thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("\n          ")}
        </tbody>
      </table>
    </div>`;

const NOW_ALT = "Today as it is: a dark box holding the star's band with three lines about the fast, the date, the saint of the day with the fast again, and Evening prayers with Begin.";
const NEW_ALT = `The new first screen: a night sky across the whole width with the date, ${GREETING} and Pascha's count, the star over the horizon, and under the horizon Evening prayers with one Begin, then the streak and the verse of the day.`;

const body = `<main class="k-page">
  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For 2.0, mock-up 13</span>
    <h1>A new welcome on Today</h1>
    <p class="k-lede">No box. One sky, one greeting, one button, and each thing shown once.</p>
    <p class="k-meta">Drawn from the app's own Today as it stood on your phone: Sunday evening, day 8 of the fast, 14 days kept.</p>
  </header>

  <section class="k-section">
    <h2>Now and new</h2>
    <div class="k-pair">
      <figure class="k-figure">
        ${img("mock-welcome-before", NOW_ALT)}
        <figcaption>Now</figcaption>
      </figure>
      <figure class="k-figure">
        ${img("mock-welcome", NEW_ALT)}
        <figcaption>New</figcaption>
      </figure>
    </div>
  </section>

  <section class="k-section">
    <h2>The new first screen</h2>
    <figure class="k-figure k-phone">
      ${img("mock-welcome", NEW_ALT)}
      <figcaption>Drawn from Today's own lead. Taken away: the box, the saint's row and the star's three lines. Moved: the hour's prayer under the horizon. No word is new.</figcaption>
    </figure>
    ${table(["The choice", "Why, and what it does for the reader"], [
      ["No box", "Your word. The night runs the whole width of the screen and ends in the horizon, so the top of Today is a place and not a card."],
      ["The page begins at the horizon", "The hill under the star takes the page's own ground. What the reader does next stands on that ground: one line and one Begin."],
      ["A greeting first", "A welcome is a greeting. The hour's own words stand largest, with the date over them and Pascha's count under them."],
      ["One Begin, higher", "The hour's prayer is still the screen's one white button. It now sits in the upper half, under the thumb."],
      ["The star says nothing in words", "Its three lines made the fast a third thing in the box. The star still rises a little each day, and still opens the fast's readings."],
      ["Shorter", `The lead was ${high.before} high and is ${high.after}. The streak and the verse of the day are on the first screen.`],
    ])}
  </section>

  <section class="k-section">
    <h2>Each thing once</h2>
    ${table(["The thing", "On Today now", "In the new one"], [
      ["The saint of the day", "Twice: in the box, and in The Church today", "Once, in The Church today, with the face"],
      ["The fast", "Three times: the star's band, the box, and The Fast", "Once, in The Fast, with its day and today's reading"],
      ["Pascha's count", "Once, in the box", "Once, under the greeting"],
      ["The hour's prayer", "Once, in the box", "Once, under the horizon"],
      ["The star", "In the box, with three lines of words", "In the sky, with no words"],
    ])}
    <figure class="k-figure k-phone">
      ${img("mock-welcome-church", "The Church today in the new one: Today's Saint with the face, then The Fast, day 8 of 40, with the rule for food and today's reading, Hymns on the Nativity, then Today's Readings.")}
      <figcaption>Drawn from The Church today as it is. Moved here: the fast's day and today's reading, from the star's band. The saint's band is untouched.</figcaption>
    </figure>
  </section>

  <section class="k-section">
    <h2>What it costs</h2>
    <ul class="k-list">
      <li>For an Orthodox reader the saint and the fast leave the first screen. They are one scroll down. If you want them higher, The Church today can stand right under the streak.</li>
      <li>The star no longer says in words what it is. Its day and its reading stand in The Fast.</li>
    </ul>
  </section>

  <section class="k-section">
    <h2>What a still cannot show</h2>
    ${table(["The part", "What it would be"], [
      ["The star", "It rises to its place on the first open of the day, as it does now."],
      ["The rest of the year", "The lead already has a night sky of its own outside the fast. The same welcome would stand on it."],
      ["A new reader", "The day's step of the first week would stand where the hour's prayer is: one line and the one Begin."],
      ["A great feast", "Not drawn yet. The feast's name leads today, and it has to lead here too and still be said once."],
      ["Other screens", "Drawn at one phone's width. Wide screens, the Light palette and Arabic are held before it is built."],
    ])}
  </section>

  <section class="k-section">
    <h2>Your note, kept apart</h2>
    <p>When a reader finishes a prayer or a day, the finish is a moment of its own: smooth and well made. It is written into the rules and the plan. It is not drawn here.</p>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">The still passed the app's own mock check before it was kept.</p>
  </footer>
</main>
`;

const open = TEMPLATE.indexOf("<body>");
if (open < 0) throw new Error("the kit's template has no <body>");
const head = TEMPLATE.slice(0, open + "<body>".length)
  .replace(/<title>[^<]*<\/title>/, "<title>Purify welcome mock-up</title>")
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="A new welcome on Today with no box and each thing shown once, drawn from the app\'s own Today.">');
fs.writeFileSync(path.join(HERE, "mock-welcome.html"), `${head}\n${body}</body>\n</html>\n`);
console.log(`mock-welcome.html written (the lead was ${high.before} high and is ${high.after})`);
