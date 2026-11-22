#!/usr/bin/env node
// Mock-ups 9 to 12 of the mock-up phase: four other ways to draw Today's lead for a reader in
// their first week (the owner, 2026-11-22, on mock-up 8: "can we actually revamped that design?
// try out different things").
//
//   node docs/plans/reader-map/mock-today-leads.mjs <export> [a|b|c|d]
//
// writes img/mock-lead-a.jpg to img/mock-lead-d.jpg and mock-today-leads.html.
// With a letter, only that still is drawn again; the page is written when all four stand.
//
// Each is the app's own Today on the native export, as a reader in their first week has it (what
// that reader's phone keeps is set before the page opens), never drawn by hand. The lead's own
// parts are kept and moved: its night and star, its small lines, its greeting, its verse, its one
// white Begin. Every class worn is one the screen already wears, so every colour and size is the
// app's. The week's card below is taken away in all four: its words stand in the lead.
//
//   a  the step leads     the step's name stands on the night, where the season's line stood, and
//                         Begin comes straight under it; the day (its date, the season, the
//                         greeting, the verse) follows, quieter.
//   b  one night          the star stands alone as the picture; under it everything is centred,
//                         as a chapter opens in the app: the day, the greeting, the verse, the
//                         step, Begin. No line divides it.
//   c  short              the season's two lines, the greeting, the step, Begin. The hour's verse
//                         is not drawn (the verse of the day stands right under the lead), so
//                         what follows the lead is seen without a scroll.
//   d  your picture       the lead wears the picture of what this reader came for, the one on the
//                         card they tapped in the questions (lib/onboarding/pictures.ts), fading
//                         into the night as that card's picture fades into its ground; then the
//                         step, its line, Begin, and the day on one line. The questions' cards are
//                         half the screen wide and the lead is all of it, so the still wears the
//                         larger copy of the same icon, the one the reading room's covers use
//                         (public/covers/authors, docs/licensing/COVER_ICONS.md), which the apps
//                         do not carry today.
//
// No word is new: each line is the lead's or the card's own, and the date and the season are set
// on one line. Every still is held to checkMock before it is kept.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const ONLY = process.argv[3] ?? null;
const IMG = path.join(HERE, "img");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { NATIVE_UA, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { checkMock, printMockCheck } = await import(at("scripts/mock-check.mjs"));

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);

/** What the phone of a reader in their first week keeps: a Catholic who has not yet been to a church, and came for Daily quiet. */
const KEPT = {
  "purify:onboarded": "4",
  "purify:level": "inquirer",
  "purify:depth": "inquirer",
  "purify:background": "catholic",
  "purify:intent": "quiet",
  "purify:intents": '["quiet"]',
  "purify:firststeps.eligible": "1",
  "purify:onboarded.day": "2026-12-06",
  "purify:fasting-rule": "hidden",
  "purify:calendar.style": "new",
};

/** Runs in the page: the lead's own parts by name, the step's words from the week's card, and the card taken away. */
function parts() {
  const card = document.querySelector("[data-first-step]");
  const lead = document.querySelector("[data-day-lead]");
  const band = lead?.querySelector("[data-nativity-star]");
  const greet = lead?.children[1];
  if (!card || !lead || !band || !greet || greet.children.length !== 5) return null;
  const [cEyebrow, cTitle, cLine] = card.querySelectorAll("p");
  const close = card.querySelector("button[aria-label]");
  const [date, hello, verse, cite, slotWrap] = greet.children;
  const slot = slotWrap.children[0];
  const [small, name] = slot.querySelectorAll("p");
  const begin = slotWrap.querySelector("a[data-pray-hour]");
  const bandText = band.children[1];
  const [bEyebrow, bTitle, bToday] = bandText.children;
  if (!cEyebrow || !cTitle || !close || !small?.querySelector("span") || !name || !begin || !bEyebrow || !bTitle) return null;
  begin.setAttribute("href", card.querySelector("a").getAttribute("href"));
  const step = { eyebrow: cEyebrow.textContent, name: cTitle.textContent, line: cLine?.textContent ?? "" };
  window.__step = step;
  card.remove();
  // The date and the season on one line, each in its own words.
  const day = `${date.textContent.split(" · ")[0]} · ${bEyebrow.textContent}`;
  return { lead, band, art: band.children[0], bandText, bEyebrow, bTitle, bToday, greet, date, hello, verse, cite, slotWrap, slot, small, name, begin, close, step, day };
}

const DRAW = {
  // a. The step leads: its name on the night, Begin straight under it, the day after.
  a: () => {
    const p = window.__parts();
    if (!p) return "Today is not the screen expected";
    const top = document.createElement("div");
    top.className = p.band.className.replace("tap-press ", "");
    top.setAttribute("data-nativity-star", "");
    const words = document.createElement("div");
    words.className = p.bandText.className;
    const eyebrow = document.createElement("p");
    eyebrow.className = p.bEyebrow.className;
    eyebrow.textContent = p.step.eyebrow;
    const name = document.createElement("h2");
    name.className = "mt-1.5 block font-serif text-heading leading-[1.1] text-paper";
    name.textContent = p.step.name;
    const line = document.createElement("p");
    line.className = p.bToday.className;
    line.textContent = p.step.line;
    words.append(eyebrow, name, line);
    p.close.className = "absolute end-2 top-2 inline-flex size-11 items-center justify-center rounded-full text-paper/50";
    top.append(p.art, words, p.close);
    p.band.replaceWith(top);
    // Under the night: Begin, then the day, quieter.
    const day = document.createElement("div");
    day.className = "mt-4";
    p.date.textContent = p.day;
    const hello = document.createElement("p");
    hello.className = p.name.className;
    hello.textContent = p.hello.textContent;
    day.append(p.date, hello, p.verse, p.cite);
    p.begin.style.marginTop = "0";
    p.greet.replaceChildren(p.begin, day);
    return "ok";
  },
  // b. One night: the star alone as the picture, and everything under it centred.
  b: () => {
    const p = window.__parts();
    if (!p) return "Today is not the screen expected";
    p.band.setAttribute("aria-label", p.bEyebrow.textContent);
    p.bandText.remove();
    p.greet.classList.add("text-center");
    p.date.textContent = p.day;
    p.slotWrap.className = "mt-4";
    p.small.classList.add("justify-center");
    p.small.querySelector("span").textContent = p.step.eyebrow;
    p.name.textContent = p.step.name;
    // The star's band is a link, so the button stands beside it on the lead, over its corner.
    p.close.className = "absolute end-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full text-paper/50";
    p.lead.append(p.close);
    return "ok";
  },
  // c. Short: the season's two lines, the greeting, the step, Begin.
  c: () => {
    const p = window.__parts();
    if (!p) return "Today is not the screen expected";
    p.bToday.remove();
    p.band.style.minHeight = "150px";
    p.verse.remove();
    p.cite.remove();
    p.small.querySelector("span").textContent = p.step.eyebrow;
    p.name.textContent = p.step.name;
    const words = document.createElement("div");
    words.className = "min-w-0 flex-1";
    words.append(p.small, p.name);
    p.slot.className = "flex items-start gap-3";
    p.slot.append(words, p.close);
    return "ok";
  },
  // d. Your picture: what this reader came for, fading into the night; the step, Begin, the day.
  d: () => {
    const p = window.__parts();
    if (!p) return "Today is not the screen expected";
    const top = document.createElement("div");
    top.className = "relative block overflow-hidden bg-night-soft";
    top.style.height = "236px";
    const img = document.createElement("img");
    img.src = "/covers/authors/gregory-palamas.v1.jpg";
    img.alt = "";
    img.className = "absolute inset-0 h-full w-full object-cover";
    img.style.objectPosition = "50% 14%";
    const wash = document.createElement("span");
    wash.setAttribute("aria-hidden", "true");
    wash.className = "absolute inset-0";
    wash.style.background = "linear-gradient(to bottom, transparent 30%, var(--color-night-deep) 86%)";
    top.append(img, wash);
    const eyebrow = document.createElement("p");
    eyebrow.className = p.date.className;
    eyebrow.textContent = p.step.eyebrow;
    const name = document.createElement("h2");
    name.className = "mt-1.5 block font-serif text-heading leading-[1.1] text-paper";
    name.textContent = p.step.name;
    const line = document.createElement("p");
    line.className = p.bToday.className;
    line.textContent = p.step.line;
    const words = document.createElement("div");
    words.className = "min-w-0 flex-1";
    words.append(eyebrow, name, line);
    const head = document.createElement("div");
    head.className = "flex items-start gap-3";
    head.append(words, p.close);
    p.date.textContent = p.day;
    p.date.classList.add("mt-4");
    p.greet.style.marginTop = "-30px";
    p.greet.style.paddingTop = "0";
    p.greet.replaceChildren(head, p.begin, p.date);
    p.lead.style.background = "var(--color-night-deep)";
    p.band.replaceWith(top);
    return img.decode().then(() => "ok", () => "the picture did not arrive");
  },
};
/** The step this reader has on day one, as the week's card says it. The stills are held to these words. */
const STEP = { eyebrow: "Your first week · 1 of 7", name: "The Jesus Prayer", line: "One short prayer, said slowly, at the heart of Orthodox stillness." };
const LABEL = { a: "mock-up 9: the step leads", b: "mock-up 10: one night, centred", c: "mock-up 11: short", d: "mock-up 12: your picture" };

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = true;
try {
  for (const which of Object.keys(DRAW)) {
    if (ONLY && ONLY !== which) continue;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: "Europe/Athens", reducedMotion: "reduce" });
    await ctx.addInitScript((kept) => {
      localStorage.setItem("purify:whatsNewSeen", "99");
      for (const [k, v] of Object.entries(kept)) localStorage.setItem(k, v);
      window.androidBridge = { postMessage() {} };
      window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
    }, KEPT);
    await serveLikeTheShell(ctx, OUT, {});
    const page = await ctx.newPage();
    // d's picture at the lead's size: the reading room's copy of the icon, which the export does not hold.
    await page.route("**/covers/authors/gregory-palamas.v1.jpg", (route) => route.fulfill({ path: path.join(ROOT, "public/covers/authors/gregory-palamas.v1.jpg"), contentType: "image/jpeg" }));
    await page.clock.install({ time: new Date("2026-12-06T09:30:00+02:00") });
    await go(page, "/");
    await page.locator("[data-first-step]").first().waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(3500);
    await page.evaluate(`window.__parts = ${parts.toString()}`);
    const drawn = await page.evaluate(DRAW[which]);
    if (drawn !== "ok") throw new Error(`${which}: ${drawn}`);
    // The page below names the step: it is the screen's own, or nothing is written.
    const step = await page.evaluate(() => window.__step);
    for (const k of Object.keys(STEP)) if (step[k] !== STEP[k]) throw new Error(`${which}: the step's ${k} is "${step[k]}", and the page says "${STEP[k]}"`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    ok = printMockCheck(await checkMock(page, "body"), LABEL[which]) && ok;
    const file = path.join(IMG, `mock-lead-${which}.jpg`);
    await sharp(await page.screenshot({ type: "png" })).jpeg({ quality: 84, mozjpeg: true }).toFile(file);
    console.log(`  still: ${path.relative(ROOT, file)}\n`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (!ok) {
  console.error("a still failed the mock check: no page is written");
  process.exit(1);
}
for (const which of Object.keys(DRAW)) {
  if (!fs.existsSync(path.join(IMG, `mock-lead-${which}.jpg`))) {
    console.error(`mock-lead-${which}.jpg is not drawn yet: no page is written`);
    process.exit(1);
  }
}
console.log("the four stills stand");

// ── The page: the kit's own head, the four stills in one place, and the reason for each choice ──

const TEMPLATE = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const table = (heads, rows) => `<div class="k-table-wrap">
        <table class="k-table">
          <thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("\n            ")}
          </tbody>
        </table>
      </div>`;
const DAY = "Sunday, December 6 · Nativity Fast · day 22 of 40";

/** Each take: its short name on the switch, its title, what the still shows, what was moved, and the reason for each choice. */
const TAKES = [
  {
    id: "a",
    pick: "Step first",
    title: "1. Step first",
    alt: `Today's lead with the step on the night sky: ${STEP.eyebrow}, ${STEP.name}, ${STEP.line} Under it one Begin, then ${DAY}, Good morning and the morning's verse.`,
    caption: "Drawn from Today's own lead. Moved: the step and its line onto the night, Begin right under it, the greeting below. No word is new.",
    rows: [
      ["The step is the first thing on Today", "In the first week it is the one thing to do. The eye lands on it before anything else."],
      ["Begin sits right under it", "The button is in the upper half of the screen, and nothing stands between the step and its button."],
      ["The greeting and the verse follow, smaller", "They are still there for a reader who reads on."],
      ["What it costs", "\"The star rises a little each day\" and today's reading leave the lead for these seven days. The fast stays as words on the date's line."],
    ],
  },
  {
    id: "b",
    pick: "One night",
    title: "2. One night",
    alt: `Today's lead with the star alone on the night sky and everything under it centred: ${DAY}, Good morning, the morning's verse, ${STEP.eyebrow}, ${STEP.name}, and one Begin.`,
    caption: "Drawn from Today's own lead. Moved: the words off the sky, and every line onto one centre line. No word is new.",
    rows: [
      ["The star alone is the picture", "No words on the sky, so the lead opens like a window before it says anything."],
      ["One centre line, and no rule across it", "Your word was stacked. Rules and left edges make tiers. A centre line makes the lead read as one thought that ends in one button."],
      ["The greeting stays the largest line", "Today still greets the reader first, as it does now. The step stands where the hour's prayer was."],
      ["What it costs", "It is the tallest of the four, so the verse of the day starts lower. And the star no longer says in words that it opens the fast's readings."],
    ],
  },
  {
    id: "c",
    pick: "Short",
    title: "3. Short",
    alt: `A shorter lead: Nativity Fast, day 22 of 40, The star rises a little each day; Sunday, December 6, 147 days until Pascha; Good morning; ${STEP.eyebrow}, ${STEP.name}, and one Begin. The verse of the day is whole under it.`,
    caption: "Drawn from Today's own lead. Taken away: the hour's verse and one line of the star's band. No word is new.",
    rows: [
      ["Mock-up 8, made shorter", "The least change from what you saw: the same parts in the same order, with less of each."],
      ["The hour's verse is not drawn", "The verse of the day stands right under the lead, so the screen held two verses. Without it the lead ends above the middle of the screen."],
      ["More of Today on the first screen", "The verse of the day and its buttons are whole without a scroll, so Today reads as a page and less as a pile of cards."],
      ["What it costs", "It is the plainest of the four. It mends the two Begins and the height, and changes nothing else."],
    ],
  },
  {
    id: "d",
    pick: "Your picture",
    title: "4. Your picture",
    alt: `Today's lead wearing the icon of St Gregory Palamas, the picture of Daily quiet, fading into the night. Under it: ${STEP.eyebrow}, ${STEP.name}, ${STEP.line} One Begin, then ${DAY}.`,
    caption: "Drawn from Today's own lead and the picture this reader tapped in the questions. Moved: the picture in where the star was, the step under it. No word is new.",
    rows: [
      ["The lead wears the picture of what the reader came for", "It is the one they tapped in the questions, so they know it. You asked for a day that is personal to the reader, and what they picked is the one thing Today knows about them."],
      ["The picture fades into the night", "As the questions' cards fade into their ground. The words stand on the night under it, never on the icon."],
      ["The step, its line, one Begin", "The picture says what the week is for, the words say what today is, and the button is the only thing to tap."],
      ["What it costs", "The greeting, the hour's verse and the star give way for the seven days. Each of the eleven picks needs its picture at this size, and four of them are stand-ins until yours are made."],
    ],
  },
];

const take = (t) => `<div data-take="${t.id}">
      <h3>${esc(t.title)}</h3>
      <figure class="k-figure k-phone">
        <img src="img/mock-lead-${t.id}.jpg" width="780" height="1688" alt="${esc(t.alt)}">
        <figcaption>${esc(t.caption)}</figcaption>
      </figure>
      ${table(["The choice", "Why, and what it does for the reader"], t.rows)}
    </div>`;

const body = `<main class="k-page">
  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For 2.0, mock-ups 9 to 12</span>
    <h1>Today's lead, four ways</h1>
    <p class="k-lede">One lead and one Begin, drawn four different ways for a reader in their first week.</p>
    <p class="k-meta">Drawn from the app's own Today. The same reader as before: a Catholic who has not yet been to an Orthodox church, and came for Daily quiet. Day one: ${esc(STEP.name)}.</p>
  </header>

  <section class="k-section">
    <h2>Flip between them</h2>
    <div data-take-picker hidden>
      <p id="pick-take">Tap a name. The still changes in place, so the eye sees only what differs.</p>
      <div class="k-choice" role="group" aria-labelledby="pick-take" style="--k-choice-cols:2">
        ${TAKES.map((t, i) => `<button type="button" data-pick-take="${t.id}" aria-pressed="${i === 0}">${esc(t.pick)}</button>`).join("\n        ")}
      </div>
    </div>
    ${TAKES.map(take).join("\n    ")}
  </section>

  <hr class="k-rule">

  <section class="k-section">
    <h2>The same in all four</h2>
    <ul class="k-list">
      <li>One Begin. The week's card under the lead is gone, and its words stand in the lead.</li>
      <li>The small close mark passes a step, as it does on the card today.</li>
      <li>When the day is kept, the lead is the usual one again: the greeting, and the hour's prayer with its own Begin.</li>
      <li>The mend of the switch stays: a step is kept only once its page has moved.</li>
      <li>No word is new. In three of them the date and the fast share one line.</li>
    </ul>
  </section>

  <section class="k-section">
    <h2>The one I would choose</h2>
    <p>Number 4, Your picture, for the first week. It is the only one where two readers who came for different things see a different Today, and that is what you asked a day to be.</p>
    <p>If the greeting and the verse must stay in the lead, then number 1, Step first.</p>
  </section>

  <section class="k-section">
    <h2>What a still cannot show</h2>
    ${table(["The part", "What it would be"], [
      ["The opening", "Begin opens the day in the house's motion. In number 4 the picture could ride into the day's page, as a card carries its picture."],
      ["The fast's readings", "In numbers 1 and 4 the star's band is gone, so the fast's line would open its readings."],
      ["The other pictures", "Each of the eleven picks has its picture in the app already. The still wears a larger copy of the same icon than the apps carry today."],
      ["Other screens", "Each was drawn at one phone's width. The one you choose is held to every width, every palette and Arabic before it is built."],
    ])}
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">Each still passed the app's own mock check before it was kept.</p>
  </footer>
</main>
<script>
  // One take at a time, in one place. With no script the four stand one under the other.
  (() => {
    const picker = document.querySelector("[data-take-picker]");
    const picks = [...document.querySelectorAll("[data-pick-take]")];
    const takes = [...document.querySelectorAll("[data-take]")];
    if (!picker || !picks.length) return;
    const show = (id) => {
      for (const b of picks) b.setAttribute("aria-pressed", String(b.dataset.pickTake === id));
      for (const t of takes) t.hidden = t.dataset.take !== id;
    };
    for (const b of picks) b.addEventListener("click", () => show(b.dataset.pickTake));
    picker.hidden = false;
    show(picks[0].dataset.pickTake);
  })();
</script>
`;

const open = TEMPLATE.indexOf("<body>");
if (open < 0) throw new Error("the kit's template has no <body>");
const head = TEMPLATE.slice(0, open + "<body>".length)
  .replace(/<title>[^<]*<\/title>/, "<title>Purify lead mock-ups</title>")
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Four drawings of Today\'s lead for a reader in their first week, from the app\'s own Today.">');
fs.writeFileSync(path.join(HERE, "mock-today-leads.html"), `${head}\n${body}</body>\n</html>\n`);
console.log("mock-today-leads.html written");
