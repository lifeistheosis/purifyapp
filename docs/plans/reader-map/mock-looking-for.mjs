#!/usr/bin/env node
// Mock-ups 2 to 4 of the mock-up phase: the question "What are you looking for?", drawn again
// (the owner, 2026-11-22: "I feel like the what are you looking for section is very very important
// we should focalize in that for a second", then "all recommended and let's continue").
//
//   node docs/plans/reader-map/mock-looking-for.mjs <export> [need|picks|week]
//
// writes img/mock-need.jpg, img/mock-picks.jpg, img/mock-week.jpg and mock-looking-for.html.
// With a name, only that still is drawn again; the page is written when all three stand.
//
// Each is drawn from the app's own screen on the native export, never by hand. The walk taps as a
// reader would (Begin, Catholic, Continue, Not yet, two picture cards, Continue), stands on the
// app's screen, and then only what is proposed is changed:
//
//   the need    the second question's screen, a Step with ChoiceCards: the title's words, a line
//               under it as Step draws its `body`, five cards in place of two, their icons
//               (PrayerRope, Compass, Book, Candle, Church, each as components/ui/icons draws it).
//   the picks   the question's own screen with two cards picked: the line under the title, and
//               under each picked card's name the day of the week it joins.
//   the week    the handoff's own slate at "Your space is ready": its mark taken away, its title
//               and a line, its rows made the seven days (the day's number in the row's disc), and
//               the app's own primary button under them.
//
// The week shown is the app's own rule's answer for this reader (lib/onboarding/week.ts, weekFor:
// a Catholic who has not yet been to a church, first Daily quiet, then The councils and Church
// history), asked of the rule on 2026-11-22. Every still is held to checkMock before it is kept.

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
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/plans/reader-map.json"), "utf8"));

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);

/** The proposed words. The lines marked "the app's own" are in the catalogue today; the rest are new, and his to pass. */
export const NEED = {
  title: "What brings you here?",
  body: "One answer. It is where your first week begins.",
  cards: [
    { title: "To pray each day", sub: "Regular morning and evening prayer", own: "onboard.intent.prayerSub", icon: "PrayerRope", pick: "A rule of prayer" },
    { title: "To understand the faith", sub: "The faith, set out in the Fathers' own words", own: "onboard.intent.beliefsSub", icon: "Compass", pick: "What the Orthodox believe" },
    { title: "To read the Scriptures", sub: "Matthew, Mark, Luke and John, a chapter a day", own: "onboard.intent.gospelsSub", icon: "Book", pick: "The Gospels" },
    { title: "Peace in a hard time", sub: "Stillness, and some peace from anxiety", own: "onboard.intent.quietSub", icon: "Candle", pick: "Daily quiet" },
    { title: "To get ready for church", sub: "What to know before you go, and what you will see, one card at a time.", own: "onboard.day1.firstLiturgy.body", icon: "Church", pick: "The Liturgy" },
  ],
};
export const PICKS = {
  sub: "Pick up to two more. They join your first week in the order you tap.",
  days: ["Day 4 of your week", "Day 5 of your week"],
};
/** The week the app's own rule gives this reader, by page (docs/plans/reader-map.json names each). */
const WEEK_PAGES = ["jesusPrayer", "fathersPath", "nicaea", "councils", "history", "leo", "parish"];
const WHY = { 0: "For peace in a hard time", 3: "Your pick", 4: "Your pick", 6: "Where your week leads" };
export const WEEK = {
  title: MAP.screens.week,
  sub: MAP.screens.weekSub,
  days: WEEK_PAGES.map((key, i) => ({ page: MAP.pages[key].name, why: WHY[i] ?? MAP.pages[key].section })),
  button: "Begin day 1",
};

const svg = (inner) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const knots = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
  return `<circle cx="${(12 + 5 * Math.cos(a)).toFixed(3)}" cy="${(7.6 + 5 * Math.sin(a)).toFixed(3)}" r="1" fill="currentColor" stroke="none"></circle>`;
}).join("");
/** As components/ui/icons draws them. Compass and Book are the screen's own two, kept as the app drew them. */
const ICONS = {
  PrayerRope: svg(`<circle cx="12" cy="7.6" r="5" stroke-opacity="0.4"></circle>${knots}<line x1="12" y1="13" x2="12" y2="15" stroke-opacity="0.6"></line><line x1="12" y1="15" x2="12" y2="22"></line><line x1="10" y1="16.4" x2="14" y2="16.4"></line><line x1="9" y1="18.2" x2="15" y2="18.2"></line><line x1="10.4" y1="20.6" x2="13.6" y2="19.7"></line>`),
  Candle: svg(`<path d="M12 2.8 C13.5 4.6, 13.7 6.4, 12 8.2 C10.3 6.4, 10.5 4.6, 12 2.8 Z" fill="currentColor"></path><path d="M12 8.2 V9.6"></path><path d="M10.1 21 V10.4 C10.1 10 10.4 9.7 10.8 9.7 H13.2 C13.6 9.7 13.9 10 13.9 10.4 V21"></path><path d="M8 21 H16"></path>`),
  Church: svg(`<line x1="12" y1="1.8" x2="12" y2="4.4"></line><line x1="10.9" y1="2.9" x2="13.1" y2="2.9"></line><path d="M12 4.4 C9.6 5.9 9.7 8.1 12 9.2 C14.3 8.1 14.4 5.9 12 4.4 Z"></path><path d="M7.5 20.5 V10.8 H16.5 V20.5"></path><path d="M10.3 20.5 V15.4 C10.3 13.7 13.7 13.7 13.7 15.4 V20.5"></path><line x1="6" y1="20.5" x2="18" y2="20.5"></line>`),
};

const SECOND = MAP.screens.been;
const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});

/** A new reader, walked to the second question as a Catholic. */
async function reader() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: "Europe/Athens", reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    localStorage.setItem("purify:whatsNewSeen", "99");
    window.androidBridge = { postMessage() {} };
    window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
  });
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date("2026-12-06T09:30:00+02:00") });
  await go(page, "/");
  const d = page.locator('[role="dialog"]').first();
  await d.waitFor({ state: "visible", timeout: 30000 });
  const tap = async (re) => {
    const b = d.getByRole("button", { name: re }).first();
    await b.waitFor({ state: "visible", timeout: 15000 });
    await b.click();
    await page.waitForTimeout(1300);
  };
  await tap(/^Begin/);
  await tap(/^Catholic/);
  await tap(/^Continue/);
  await d.getByText(SECOND).waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(900);
  return { ctx, page, d, tap };
}
/** The same reader, on to the question itself with two cards picked. */
async function picking() {
  const r = await reader();
  await r.tap(/^Not yet/);
  await r.d.getByText(MAP.screens.picks).waitFor({ state: "visible", timeout: 15000 });
  await r.page.waitForTimeout(800);
  await r.tap(/^The councils/);
  await r.tap(/^Church history/);
  return r;
}

let ok = true;
async function keep(page, name, label) {
  await page.waitForTimeout(900);
  ok = printMockCheck(await checkMock(page, '[role="dialog"]'), label) && ok;
  const file = path.join(IMG, `${name}.jpg`);
  await sharp(await page.screenshot({ type: "png" })).jpeg({ quality: 84, mozjpeg: true }).toFile(file);
  console.log(`  still: ${path.relative(ROOT, file)} (${fs.statSync(file).size} bytes)\n`);
}
const must = (said) => {
  if (said !== "ok") throw new Error(said);
};

try {
  // 2. The need.
  if (!ONLY || ONLY === "need") {
    const { ctx, page } = await reader();
    must(
      await page.evaluate(({ need, icons }) => {
        const d = document.querySelector('[role="dialog"]');
        const h2 = d.querySelector("h2");
        const two = [...d.querySelectorAll("button.ob-choice")];
        if (!h2 || two.length !== 2) return `the screen is not the one expected: ${two.length} cards`;
        const drawn = { Compass: two[0].querySelector("span.size-10 svg").outerHTML, Book: two[1].querySelector("span.size-10 svg").outerHTML, ...icons };
        h2.textContent = need.title;
        const body = document.createElement("p");
        body.className = "onboard-step-in mt-3 font-sans text-ui leading-[1.6] text-paper/70";
        body.textContent = need.body;
        h2.after(body);
        const list = two[0].parentElement;
        while (list.querySelectorAll("button.ob-choice").length < need.cards.length) list.append(two[0].cloneNode(true));
        for (const [i, card] of [...list.querySelectorAll("button.ob-choice")].entries()) {
          const [title, sub] = card.querySelectorAll("span.min-w-0 > span");
          title.textContent = need.cards[i].title;
          sub.textContent = need.cards[i].sub;
          if (!drawn[need.cards[i].icon]) return `no drawing of ${need.cards[i].icon}`;
          card.querySelector("span.size-10 svg").outerHTML = drawn[need.cards[i].icon];
          card.style.animationDelay = "0ms";
          if (card.getAttribute("aria-pressed") !== "false") return "a card is chosen before any tap";
        }
        return "ok";
      }, { need: NEED, icons: ICONS }),
    );
    await keep(page, "mock-need", "mock-up 2: the need comes first");
    await ctx.close();
  }

  // 3. The picks.
  if (!ONLY || ONLY === "picks") {
    const { ctx, page } = await picking();
    must(
      await page.evaluate((picks) => {
        const d = document.querySelector('[role="dialog"]');
        const sub = d.querySelector("h2")?.nextElementSibling;
        const picked = [...d.querySelectorAll('ul button[aria-pressed="true"]')];
        if (!sub || picked.length !== picks.days.length) return `the screen is not the one expected: ${picked.length} cards picked`;
        sub.textContent = picks.sub;
        picked.sort((a, b) => Number(a.querySelector(".ob-pick-n").textContent) - Number(b.querySelector(".ob-pick-n").textContent));
        for (const [i, card] of picked.entries()) {
          const line = document.createElement("span");
          line.className = "block font-sans text-caption font-semibold text-paper";
          line.textContent = picks.days[i];
          card.querySelector("span.words-halo").append(line);
        }
        return "ok";
      }, PICKS),
    );
    await keep(page, "mock-picks", "mock-up 3: the picks say what they do");
    await ctx.close();
  }

  // 4. The week, paid back.
  if (!ONLY || ONLY === "week") {
    const { ctx, page, d } = await picking();
    const button = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((b) => /^Continue with/.test(b.textContent)).outerHTML);
    // The slate passes into Today by itself, so its clock is held and stepped to "ready". Then what
    // it was still waiting to do is called off and the clock let go, since the mock check waits
    // on the page's own clock and would wait for ever on a held one.
    await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 20));
    await d.getByRole("button", { name: /^Continue with/ }).first().click();
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) {
      await page.clock.runFor(250);
      ready = (await d.innerText().catch(() => "")).includes(MAP.screens.ready);
    }
    if (!ready) throw new Error("the handoff never said it was ready");
    await page.evaluate(() => {
      // The held clock numbers its timers upward from a large number, so the ones still waiting
      // are the last few thousand below a new one.
      const top = Number(setTimeout(() => {}, 0));
      // Each kind of timer is called off by its own word; the clock refuses any other.
      const calls = [clearTimeout, clearInterval, window.cancelAnimationFrame, window.cancelIdleCallback].filter(Boolean);
      for (let id = top; id > top - 20000; id--) {
        for (const call of calls) {
          try {
            call(id);
          } catch {
            // not that kind
          }
        }
      }
    });
    await page.clock.resume();
    await page.waitForTimeout(1200);
    if (!(await d.innerText().catch(() => "")).includes(MAP.screens.ready)) throw new Error("the handoff did not stay once its clock was let go");
    must(
      await page.evaluate(({ week, button }) => {
        const slate = document.querySelector('[role="dialog"] [role="status"]');
        const h2 = slate?.querySelector("h2");
        const ul = slate?.querySelector("ul");
        const row = ul?.querySelector("li");
        if (!h2 || !row) return "the handoff is not the slate expected";
        slate.querySelector(".ob-slate-mark")?.remove();
        // The title's space above it was the mark's; without it the seven rows and the button stand clear of the foot.
        h2.classList.remove("mt-8");
        h2.querySelector(".ob-slate-title").textContent = week.title;
        const sub = document.createElement("p");
        sub.className = "mt-2 font-sans text-ui leading-[1.45] text-paper/60";
        sub.textContent = week.sub;
        h2.after(sub);
        ul.replaceChildren(
          ...week.days.map((day, i) => {
            const li = row.cloneNode(true);
            li.style.animationDelay = "0ms";
            const disc = li.querySelector("span.size-6");
            disc.className += " font-sans text-caption font-bold";
            disc.textContent = String(i + 1);
            const [why, name] = li.querySelectorAll("span.min-w-0 > span");
            why.textContent = day.why;
            name.textContent = day.page;
            return li;
          }),
        );
        const foot = document.createElement("div");
        foot.className = "mt-7 w-full max-w-[320px]";
        foot.innerHTML = button;
        foot.querySelector("button").textContent = week.button;
        ul.after(foot);
        return "ok";
      }, { week: WEEK, button }),
    );
    await keep(page, "mock-week", "mock-up 4: the week, paid back");
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (!ok) {
  console.error("a still failed the mock check: no page is written");
  process.exit(1);
}
for (const name of ["mock-need", "mock-picks", "mock-week"]) {
  if (!fs.existsSync(path.join(IMG, `${name}.jpg`))) {
    console.error(`${name}.jpg is not drawn yet: no page is written`);
    process.exit(1);
  }
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
    <span class="k-eyebrow">For 2.0, mock-ups 2 to 4</span>
    <h1>The question, drawn again</h1>
    <p class="k-lede">"${esc(MAP.screens.picks)}" in three screens: the need first, picks that say what they do, and the week paid back.</p>
    <p class="k-meta">Drawn from the app's own screens. One reader throughout: a Catholic who has not yet been to an Orthodox church.</p>
  </header>

  <section class="k-section">
    <h2>1. The need comes first</h2>
    <p>One question before the picture cards, in plain needs. The reader gives one answer, and it is where their week begins.</p>
    ${figure("mock-need", `The proposed screen: ${NEED.title} Five answers: ${NEED.cards.map((c) => c.title).join(", ")}.`, "Drawn from the second question's own screen. New: the question, the line under it and the five names. The small line on each card is the app's own.")}
    <p>Nothing has to be written for it. Each need is one of today's eleven answers under a plainer name, so each already has its page for every reader:</p>
    ${table(["The need", "Today's answer it stands for"], NEED.cards.map((c) => [c.title, c.pick]))}
  </section>

  <section class="k-section">
    <h2>2. The picks say what they do</h2>
    <p>Your picture cards stay as they are. The line under the question now says how many picks count, and a picked card says which day it joins.</p>
    ${figure("mock-picks", "The question's own screen with two cards picked. Under each picked card's name: the day of the week it joins.", "Drawn from the question's own screen, with The councils and Church history tapped. New: the line under the question, and the day under each picked card's name.")}
    <p>Today the screen says "Pick as many as you like", and only the first three change anything. Here the promise and the rule are the same.</p>
  </section>

  <section class="k-section">
    <h2>3. The week, paid back</h2>
    <p>The questions end on the reader's own week: seven days by name, and why each of theirs is there. One button begins day one.</p>
    ${figure("mock-week", `The proposed last screen: ${WEEK.title}. ${WEEK.days.map((d, i) => `${i + 1}, ${d.page}`).join("; ")}. One button: ${WEEK.button}.`, "Drawn from the handoff's own rows. New: the seven days in place of the four lines, the day's number in each row's disc, and the button. Today this screen passes into Today by itself.")}
    <p>The week is the app's own rule's answer for these answers, not an example made for the drawing.</p>
  </section>

  <hr class="k-rule">

  <section class="k-section">
    <h2>The new words</h2>
    <p>Every line that is not in the app today. All of them are yours to change.</p>
    ${table(["The line", "Where it stands"], [
      [NEED.title, "The need: the question"],
      [NEED.body, "The need: under the question"],
      ...NEED.cards.map((c) => [c.title, "The need: an answer"]),
      [PICKS.sub, "The picks: under the question"],
      [PICKS.days[0], "The picks: on a picked card"],
      [WHY[0], "The week: why day one is there"],
      [WHY[3], "The week: why a picked day is there"],
      [WHY[6], "The week: the last day"],
      [WEEK.button, "The week: the button"],
    ])}
  </section>

  <section class="k-section">
    <h2>Why it is drawn this way</h2>
    ${table(["The choice", "Why, and what it does for the reader"], [
      ["The need as its own question, one answer", "Nine of today's eleven cards are shelves of the library, and the two needs stand ninth and tenth, a scroll away. A need said first, in one tap, is what the reader came with."],
      ["The app's own choice cards for it", "They are the cards the two questions before it use, so the three read as one conversation. Each has room for a line that says what the need means."],
      ["Your picture cards untouched", "They are your pick of 27 October, and they are the best looking screen in the questions. Only their line changes, and a picked card gains one."],
      ["\"Up to two more\", and the day on the card", "The reader is told what a tap does at the moment they tap. Nothing is promised that the week does not keep."],
      ["The week as the last screen, with one button", "It is the payoff for every answer given, and it is seen before Today is. The button takes the reader into day one, where today the screen fades away by itself."],
      ["Why a day is there, said in three words", "\"For peace in a hard time\" and \"Your pick\" show the reader that Purify listened. The other days name their section of the app."],
    ])}
  </section>

  <section class="k-section">
    <h2>Still open</h2>
    ${table(["The question", "What it turns on"], [
      ["Which road for a reader who is \"Just curious\"?", "Today their first pick chooses between the seeker's road and the newcomer's. With the need asked first, that choice has to read the picture cards."],
      ["Two picks push two of the road's own pages out", "For this reader the week loses \"Your first Liturgy\" and \"The Excommunications of 1054\" to make room. That is today's rule. The first Liturgy is where every road leads, so it may deserve to stay."],
      ["The picture cards' order", "Not drawn. The cards could stand in the reader's own order, by where they come from."],
      ["The lines about a need", "They are plain, and they are new. A priest's glance before they ship."],
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
  .replace(/<title>[^<]*<\/title>/, "<title>Purify question mock-ups</title>")
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Three drawings of the question What are you looking for, from the app\'s own screens.">');
fs.writeFileSync(path.join(HERE, "mock-looking-for.html"), `${head}\n${body}</body>\n</html>\n`);
console.log("mock-looking-for.html written");
