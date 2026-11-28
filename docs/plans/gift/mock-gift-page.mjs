#!/usr/bin/env node
// The page for the Christmas gift of Plus: made from the design kit, with a reason for each
// choice (CLAUDE.md, "Every design is justified"). The stills are mock-gift.mjs's.
//
//   node docs/plans/gift/mock-gift-page.mjs     writes docs/plans/gift/mock-gift.html
//   node docs/brand/kit/check.mjs --page docs/plans/gift/mock-gift.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
for (const n of ["give", "opened", "built-give", "built-thanks", "built-card"]) {
  if (!fs.existsSync(path.join(HERE, "img", `${n}.jpg`))) throw new Error(`run mock-gift.mjs first: img/${n}.jpg is missing`);
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

const reasons = [
  ["The ticket leads, with no picture above it", "It is the gift card the app already gives with every EIKON order, so a reader meets a gift they have seen before.", "The first thing they see is the gift itself: Purify Plus, a year.", "The house's own card, its tear line and its two notches.", "One clear offer, nothing to look past."],
  ["\"They open it on the day you choose: Christmas Day, or the Nativity on 7 January\"", "Orthodox Christians keep the Nativity on either calendar.", "Whichever calendar their family keeps, the giver can match it.", "One plain line on the ticket's foot.", "Two Christmases make a selling window that runs to 7 January."],
  ["From, To, their email, a line from you", "A gift says who it is from. The one it is given to sees the name and the line.", "The giver writes a sentence of their own, and the gift arrives personal.", "The app's own quiet field, the one his tapped-field rule shaped.", "A personal gift is given more often than a voucher."],
  ["When it arrives: Now, 25 December, 7 January", "A gift bought on 10 December should still open on Christmas morning.", "It is bought early and arrives on the day.", "Settings' own choice track: a small choice, where a pill row belongs.", "People can buy early, so December sales come sooner."],
  ["One button: \"Give a year · $59.99\"", "The price stands once, on the action it belongs to.", "No hunting for what it costs.", "The house's white button, as on the claim page.", "Cash up front, paid by card (Stripe), in the bank in about two days."],
  ["The terms in one line", "A gift that renews would bill the one it was given to. This one ends.", "No renewal and nothing for them to cancel: the giver gives without worry.", "Plain secondary text under the button.", "Trust, which is what a premium gift sells on."],
  ["What Plus opens, unchanged", "It is what the year holds, in the app's own words.", "The giver sees what they are giving.", "The claim page's list, as it is.", "It sells the year without a new line written."],
  ["The one it is given to: the claim page, with Anna's name and line", "The page exists and works today, with its card that opens in light.", "They see who it is from, then sign in and it is theirs.", "Her line sits on the ticket's tear line, in the house's italic.", "Nothing new to build on their side."],
];

const body = `<main class="k-page">
  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For the goal, $5,000 unspent by the end of February</span>
    <h1>A year of Plus, given at Christmas</h1>
    <p class="k-lede">A page where someone gives a year of Purify Plus to someone else, paid on the web, opened through the gift page the app already has.</p>
    <p class="k-meta">Drawn from the app's own gift page on the native export, changing only what is proposed. The giver's page lives on the website alone, since the stores' rules keep a web sale out of the apps, so the app's tab bar is hidden on it. Both stills passed the app's mock check, all fifteen rules on every palette.</p>
  </header>

  <section class="k-section">
    <h2>The giver</h2>
    ${phone("give", "The gift page: a ticket reading A gift for Christmas, Purify Plus, A year, from you. Fields for From (Anna), To (Maria), their email and a line from you. When it arrives: Now, 25 December (chosen), 7 January. A white button: Give a year · $59.99, and one line of terms under it.", "Anna gives Maria a year, to open on Christmas Day.")}
  </section>

  <section class="k-section">
    <h2>The one it is given to</h2>
    ${phone("opened", "The claim page: the ticket reads A gift from Anna, Purify Plus, A year, given to you, with her line in italic on the tear line, then Sign in to receive it.", "Maria opens the link in her email on Christmas morning.")}
    <p>After she signs in, the card opens in light, as an EIKON gift does today.</p>
  </section>

  <section class="k-section">
    <h2>As built, 28 November</h2>
    <p>Your yes, then the build: the same pages from the website's own production build, at phone width, with sample names. The dates follow the reader's own format.</p>
    ${phone("built-give", "The giver's page as built: A gift for Christmas, Purify Plus, A year, from you; From Anna, To Maria, their email, a line; When it arrives: Now, December 25 (chosen), January 7; Give a year · $59.99.", "The giver's page.")}
    ${phone("built-thanks", "After paying: Thank you, Purify Plus, It will reach them on December 25, Your receipt comes by email from our payment provider, Back to Purify.", "After paying.")}
    ${phone("built-card", "The card's page, signed out: A gift from Anna, Purify Plus, A year, given to you, her line on the tear line, Sign in to receive it, What Plus opens.", "What Maria sees from her email.")}
  </section>

  <section class="k-section">
    <h2>Why each choice</h2>
    ${table(["The choice", "Why", "For the reader", "The look", "The goal"], reasons)}
  </section>

  <hr class="k-rule">

  <section class="k-section">
    <h2>To go live, your three calls</h2>
    <ol>
      <li><strong>The table's SQL:</strong> <code style="overflow-wrap:anywhere">supabase/migrations/20261128080347_gift_cards.sql</code>. Read and say yes; merging runs it on production. Tested here: it runs twice cleanly, and a card opens once only.</li>
      <li><strong>The gift alone to the main web, ahead of 2.0:</strong> a deploy, at your word. The apps need no update: giving is on the web, and the email opens on the web.</li>
      <li><strong>Stripe Tax:</strong> on or off for this sale.</li>
    </ol>
  </section>

  <section class="k-section">
    <h2>What it takes to build, at your yes</h2>
    <ul>
      <li><strong>The work:</strong> about $15 to $30. Stripe takes the one payment. Purify keeps the gift and emails Maria on the day chosen. The claim page gives her the year.</li>
      <li><strong>A new table</strong> for the gifts, so a migration and your sign-off on its SQL before it reaches production.</li>
      <li><strong>The privacy page gets one line.</strong> Maria's email is a person's data she did not give us, so it is used only to deliver the gift. The page has to say so.</li>
      <li><strong>Sales tax:</strong> Stripe can work it out for digital goods (Stripe Tax). Your call whether to turn it on.</li>
      <li><strong>Where it is shown:</strong> TikTok edits, the website and email. The apps cannot link to it, except where Apple allows a link out (the United States).</li>
      <li><strong>To matter for the goal, it has to be live by about 10 December.</strong></li>
    </ul>
  </section>

  <section class="k-section">
    <h2>Your calls</h2>
    <ol>
      <li><strong>The price:</strong> $59.99 is proposed, a little under a year of Plus in the stores.</li>
      <li><strong>Yes or no</strong> to this drawing, and to building it on the website.</li>
      <li><strong>The email Maria gets:</strong> drawn next, if this is a yes.</li>
    </ol>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">Sample names and words only: Anna and Maria are no one.</p>
  </footer>
</main>
`;

const open = TEMPLATE.indexOf("<body>");
if (open < 0) throw new Error("the kit's template has no <body>");
const head = TEMPLATE.slice(0, open + "<body>".length)
  .replace(/<title>[^<]*<\/title>/, "<title>A year of Plus, given</title>")
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="The Christmas gift of Purify Plus, drawn from the app\'s own gift page for a yes or no, with a reason for each choice.">');
fs.writeFileSync(path.join(HERE, "mock-gift.html"), `${head}\n${body}</body>\n</html>\n`);
console.log("mock-gift.html written");
