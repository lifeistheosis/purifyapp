#!/usr/bin/env node
// The page for the universal bell: made from the design kit, with a reason for each
// choice (CLAUDE.md, "Every design is justified"). The stills are bell-shots.mjs's.
//
//   node docs/plans/v2.0/bell/bell-page.mjs     writes docs/plans/v2.0/bell/bell.html
//   node docs/brand/kit/check.mjs --page docs/plans/v2.0/bell/bell.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
for (const n of ["bell-1", "bell-2"]) {
  if (!fs.existsSync(path.join(HERE, "img", `${n}.jpg`))) throw new Error(`run bell-shots.mjs first: img/${n}.jpg is missing`);
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
  ["One bell, four headings: Your orders, Pray together, From other readers, From Purify", "You asked for one place for everything.", "Everything that happened since they last looked, each kind under its own name.", "The sheet and rows the bell already uses.", "Readers come back for what is theirs."],
  ["Your orders first", "A parcel on its way is the most time-sensitive thing in the sheet.", "\"Shipped, 2 hours ago\", and a tap opens that order.", "The order's own words, as Your orders says them.", "Trust in EIKON, so more orders."],
  ["Pray together, apart from the social rows", "Someone praying for you is not the same as a reply.", "Who prayed, a prayer campaign's news, a name day.", "The community's own heading.", "Prayer kept first among the readers' rows."],
  ["From Purify last: the weekly announcement, notes from the moderators, What's new", "It is the house speaking, so it comes after what is personal.", "Purify's news reaches them without an email.", "The board message's own headline.", "A channel for the gift and the founding membership at Christmas."],
  ["Bright means new; dim means seen", "The app already marks new this way, with no dots and no counts.", "They see at a glance what is new.", "Full white against a softer white.", "Calm, never nagging."],
  ["The bell fills in once for a new announcement or an order's new status", "The same one way it lights today.", "No badge counts and no buzzing.", "The filled bell.", "Attention when it is earned."],
  ["Only words the app already has", "Every heading exists in all 21 languages.", "It reads right in every language from the first day.", "No new text.", "Nothing to translate, nothing to wait for."],
  ["Orders read lean, at most every six hours", "Supabase's free quota is tight until 11 December.", "Nothing slower for the reader.", "Not seen.", "Costs stay flat, for the $5,000 goal."],
];

const body = `<main class="k-page">
  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For 2.0, built, waiting for your yes</span>
    <h1>One bell for everything</h1>
    <p class="k-lede">The bell at the top of every tab now holds your orders, prayer, other readers and Purify's own news, each under its own name.</p>
    <p class="k-meta">Pictured from the app's native export with sample rows (Maria, Thomas, Paul and the orders are no one). Both screens passed the app's mock check, all fifteen rules on every palette.</p>
  </header>

  <section class="k-section">
    <h2>As it opens</h2>
    ${phone("bell-1", "The Notifications sheet. Your orders: The Theotokos of Kazan and 1 more, Shipped, 2 hours ago, bright because it is new; Beeswax candles, a dozen, Delivered, 6 days ago. Pray together: Maria prayed for you; a prayer campaign in your prayers has an update.", "Orders first, then Pray together.")}
  </section>

  <section class="k-section">
    <h2>Pulled up to full height</h2>
    ${phone("bell-2", "The same sheet at full height. From other readers: Thomas replied to your post; Paul followed you. From Purify: 1.9 is here, bright because it is new; Purify approved your post; What's new.", "From other readers, then From Purify, with the weekly announcement on top.")}
  </section>

  <section class="k-section">
    <h2>Why each choice</h2>
    ${table(["The choice", "Why", "For the reader", "The look", "The goal"], reasons)}
  </section>

  <section class="k-section">
    <h2>Not in the bell</h2>
    <p>Reminders to pray at set times stay as the phone's own notifications. They do not wait in the bell.</p>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
  </footer>
</main>
`;

const open = TEMPLATE.indexOf("<body>");
if (open < 0) throw new Error("the kit's template has no <body>");
const head = TEMPLATE.slice(0, open + "<body>".length)
  .replace(/<title>[^<]*<\/title>/, "<title>One bell for everything</title>")
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Purify 2.0\'s notifications bell: orders, prayer, other readers and Purify\'s news in one sheet, for a yes or no.">');
fs.writeFileSync(path.join(HERE, "bell.html"), `${head}\n${body}</body>\n</html>\n`);
console.log("bell.html written");
