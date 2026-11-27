#!/usr/bin/env node
// The page for mock-up 14, the week's close: made from the design kit, with a reason for each
// choice (CLAUDE.md, "Every design is justified"). The stills are mock-week-close.mjs's.
//
//   node docs/plans/reader-map/mock-week-close-page.mjs   writes mock-week-close.html
//   node docs/brand/kit/check.mjs --page docs/plans/reader-map/mock-week-close.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
for (const n of ["mock-close-before", "mock-close", "mock-close-motion"]) {
  if (!fs.existsSync(path.join(HERE, "img", `${n}.jpg`))) throw new Error(`run mock-week-close.mjs first: img/${n}.jpg is missing`);
}
const phone = (name, alt, caption) => `<figure class="k-figure k-phone">
      <img src="img/${name}.jpg" width="780" height="1688" alt="${esc(alt)}">
      <figcaption>${esc(caption)}</figcaption>
    </figure>`;
const table = (heads, rows) => `<div class="k-table-wrap">
      <table class="k-table">
        <thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>`;

const body = `<main class="k-page">
  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For 2.0, mock-up 14</span>
    <h1>The week's close</h1>
    <p class="k-lede">What a reader sees on the day they keep the seventh day of their first week. Today that is one small line, and then nothing.</p>
    <p class="k-meta">Drawn from the app's own Today on the native export. The reader is on the Catholic road: day seven is Find a parish, and the next step is Your first Liturgy, as on the catechumen's road. Testers mode is on so the week's frame works; its mark at the foot is for testers only.</p>
  </header>

  <section class="k-section">
    <h2>1. Today, as it is</h2>
    ${phone("mock-close-before", "Today on day seven: the card says Day 7 of 7, kept, and nothing else.", "The card as it is: Day 7 of 7, kept. The next day it is gone.")}
    <p>A reader who kept all seven days is told nothing and handed nothing. For a reader in the Plus card's test, the next thing they meet can be Plus.</p>
  </section>

  <section class="k-section">
    <h2>2. The close</h2>
    ${phone("mock-close", "The same card: Day 7 of 7, kept. Your first week is kept. Tomorrow: Your first Liturgy.", "The same card, with one new sentence and tomorrow's step by name.")}
    <p>The card the reader has met every day of the week says the week is done and names where it leads.</p>
  </section>

  <section class="k-section">
    <h2>3. The finish</h2>
    <figure class="k-figure">
      <img src="img/mock-close-motion.jpg" width="2388" height="311" alt="Three moments of one move: the light comes down into the card, brightens, and settles; the sentence rises in, then tomorrow's step.">
      <figcaption>Three moments of one move, 1.4 seconds: the light comes down into the card, brightens and settles to a glow; the sentence comes up, then tomorrow's step.</figcaption>
    </figure>
    <p>A reader who asks for less motion sees the end alone.</p>
  </section>

  <hr class="k-rule">

  <section class="k-section">
    <h2>The words</h2>
    ${table(["The line", "Where it comes from"], [
      ["Day 7 of 7, kept", "The app's own, today"],
      ["Your first week is kept.", "New, for your yes; then in twenty languages"],
      ["Tomorrow: Your first Liturgy", "The app's own line for tomorrow, and the guide's own name"],
    ])}
  </section>

  <section class="k-section">
    <h2>Why it is drawn this way</h2>
    ${table(["The choice", "Why, and what it does for the reader"], [
      ["The same card, not a new one", "Your word on Today: nothing stacked, and no dark box holding several things. The reader knows this card, and it ends what it began."],
      ["One new sentence", "The end of the week is said once, plainly. It says nothing about the faith, so it needs no priest's read."],
      ["Tomorrow's step by name, and no button", "A kept day has no button: one thing a day. Tomorrow the card offers Your first Liturgy as that day's step, with its own Begin. The plan said one button; this is lighter, and it is your call."],
      ["No marks for the seven days", "Day 7 of 7 already says it, and seven marks would read as a count, which the week was made never to be. Each thing once."],
      ["A soft light of the palette's own silver", "Your rule: a finish is a moment of its own, and light is a soft pool or nothing. Never gold, never rays. Nothing pops, scales or settles back."],
      ["The look", "The house's card, type and dark palettes. Held to the mock check on the five palettes, the two earned by reading, and in Arabic."],
      ["The goal", "No reader ends their week and finds nothing: each is handed the Church's next step. The number is readers back in their second week, already counted."],
    ])}
  </section>

  <section class="k-section">
    <h2>What a still cannot show</h2>
    ${table(["The part", "What it would be"], [
      ["The other roads", "Each road's next step is in the plan: a parish road gets Your first Liturgy; a Liturgy road the Sunday they chose, or Find a parish; the practicing road the Church's own day."],
      ["A page with Done at its end", "The same close stands at the page's foot after the tap, in the same move."],
      ["Arabic", "The card mirrors and passes. The new sentence's Arabic comes with the build."],
    ])}
  </section>

  <section class="k-section">
    <h2>Yours to answer</h2>
    ${table(["The question", "The recommendation"], [
      ["This close: yes or no", "Yes"],
      ["After day 8: a second written week, or the Church's own day each day", "The Church's own day"],
      ["The Plus card a day after the close, never on its day", "Yes"],
    ])}
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">Each still passed the app's own mock check, all fifteen rules, before it was kept.</p>
  </footer>
</main>
`;

const open = TEMPLATE.indexOf("<body>");
if (open < 0) throw new Error("the kit's template has no <body>");
const head = TEMPLATE.slice(0, open + "<body>".length)
  .replace(/<title>[^<]*<\/title>/, "<title>The week's close</title>")
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Mock-up 14 for Purify 2.0: the close of a reader\'s first week, drawn from the app\'s own screens.">');
fs.writeFileSync(path.join(HERE, "mock-week-close.html"), `${head}\n${body}</body>\n</html>\n`);
console.log("mock-week-close.html written");
