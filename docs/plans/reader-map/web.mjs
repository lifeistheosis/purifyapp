#!/usr/bin/env node
// The reader web: the reader map drawn as a web of ways (the owner,
// 2026-11-22: "make a spider web / family tree type of artifact for the
// different screens and sections and pathways").
//
//   node docs/plans/reader-map/web.mjs           write web.html
//   node docs/plans/reader-map/web.mjs --check   fail when web.html is not what the map draws now
//
// Nothing here is drawn by hand. Every plate, thread and row comes from
// docs/plans/reader-map.json, which lib/onboarding/__tests__/readerMap.test.ts
// writes from the app's own rules and holds to them: change a rule and that
// test fails until the map is written again, then this draws the web again.
// What this file adds is only where things stand on the sheet, and it stops
// (throws) on anything the rules say that it has no place for.
//
// The page is made of the design kit's pieces (docs/brand/design-kit.md): its
// head is the kit's own template, and the web itself is the kit's Web piece
// on the night, with the Choice piece over it. Check it as any kit page:
//   node docs/brand/kit/check.mjs --page docs/plans/reader-map/web.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/plans/reader-map.json"), "utf8"));
const WALK = JSON.parse(fs.readFileSync(path.join(HERE, "walk.json"), "utf8"));
const TEMPLATE = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const OUT = path.join(HERE, "web.html");

/** The road the page opens on: one lit thread says what the web is at a glance. */
const OPENS_ON = "catholic";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const num = (n) => n.toLocaleString("en-US");
const list = (words, last = "or") => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} ${last} ${words[words.length - 1]}`);
const stop = (why) => {
  throw new Error(`the web has no place for this: ${why}`);
};

// ── What the map says ───────────────────────────────────────────────────

const ROADS = MAP.roads.map((r) => r.id);
const pickLabel = new Map(MAP.picks.map((p) => [p.id, p.label]));

/** The strands: one for readers with no road, then one for each road's own week (the Protestant road has two). */
const COLS = [{ id: "none", road: null, lean: null, steps: [], plus: null, types: new Set(), rules: new Set(), firsts: new Set() }];
for (const r of MAP.roads) for (const w of r.weeks) COLS.push({ id: w.to, road: r.id, lean: w.lean, steps: w.steps, plus: r.plus, types: new Set(), rules: new Set(), firsts: new Set() });
const colAt = new Map(COLS.map((c, i) => [c.id, i]));

for (const b of MAP.backgrounds)
  for (const a of b.answers)
    for (const w of a.ways) {
      const c = COLS[colAt.get(w.to)] ?? stop(`a way to ${w.to}`);
      c.types.add(a.type);
      c.rules.add(a.rule);
      c.firsts.add(JSON.stringify(w.firsts));
    }
for (const c of COLS) {
  if (c.types.size !== 1) stop(`${c.id} is reached by readers of more than one type (${[...c.types].join(", ")})`);
  if (c.rules.size !== 1) stop(`${c.id} is reached both with and without the rule's question`);
  c.type = [...c.types][0];
  c.rule = [...c.rules][0];
}

/** The roads that share how Today looks, side by side. */
const LOOKS = [];
for (const [i, c] of COLS.entries()) {
  const last = LOOKS[LOOKS.length - 1];
  if (last && last.type === c.type) last.to = i;
  else if (LOOKS.some((l) => l.type === c.type)) stop(`the ${c.type} look is split by another`);
  else LOOKS.push({ type: c.type, from: i, to: i });
}
const LOOK_NAME = { orthodox: "For the Orthodox", learning: "For one learning", new: "For one who is new" };

/** The second question's three screens, each with the first answers that lead to it. */
const SECOND = ["where", "been", "level"].map((asks) => {
  const from = MAP.backgrounds.filter((b) => b.asks === asks);
  if (!from.length) stop(`no first answer leads to the ${asks} screen`);
  const says = from[0].answers.map((a) => a.says).join("|");
  for (const b of from) if (b.answers.map((a) => a.says).join("|") !== says) stop(`${b.id} is offered other answers on the ${asks} screen`);
  return { asks, from, answers: from[0].answers.map((a) => ({ says: a.says, label: a.label ?? "Skipped" })) };
});
if (SECOND.reduce((n, s) => n + s.from.length, 0) !== MAP.backgrounds.length) stop("a first answer that leads to none of the three screens");

const roadOfCol = (to) => COLS[colAt.get(to)].road;
const roadsOfBackground = (b) => new Set(b.answers.flatMap((a) => a.ways.map((w) => roadOfCol(w.to))).filter(Boolean));
const backgroundName = (b) => b.label ?? "Skipped";

// ── Where things stand on the sheet ─────────────────────────────────────

const NW = 156; // a plate
const GX = 18; // between strands
const M = 24; // the sheet's edge
const W = 2 * M + COLS.length * NW + (COLS.length - 1) * GX;
const colX = (i) => M + i * (NW + GX);
const colC = (i) => colX(i) + NW / 2;

const MARK = 64;
const Y = { mark1: 20, start: 100, q1: 190, q2: 380, cross: 800, rule: 816, picks: 900, ready: 988, mark2: 1064, today: 1148 };
const ROAD_H = 100;
const DAY_H = 100;
const DAY_STEP = 120;
Y.mark3 = Y.today + 62 + ROAD_H + 14 + 20;
Y.days = Y.mark3 + MARK + 20;
Y.mark4 = Y.days + 6 * DAY_STEP + DAY_H + 20;
Y.plus = Y.mark4 + MARK + 20;
const PLUS_H = 96;
const H = Y.plus + PLUS_H + 28;

const plates = [];
const threads = [];
const lit = (roads) => (roads.has(OPENS_ON) ? "is-lit" : "");
const roadsAttr = (roads) => (roads.size ? ` data-roads="${[...roads].join(" ")}"` : "");
const at = (x, y, w, h) => `inset-inline-start:${x}px;inset-block-start:${y}px;width:${w}px${h ? `;height:${h}px` : ""}`;

function plate({ x, y, w = NW, h, small, name, line, roads = new Set() }) {
  plates.push(`<div class="k-web-node ${lit(roads)}"${roadsAttr(roads)} style="${at(x, y, w, h)}">${small ? `<small>${esc(small)}</small>` : ""}${esc(name)}${line ? `<span>${esc(line)}</span>` : ""}</div>`);
}
function group({ x, y, w, h, small, name }) {
  plates.push(`<div class="k-web-group" style="${at(x, y, w, h)}"><small>${esc(small)}</small><b>${esc(name)}</b></div>`);
}
function mark(y, name) {
  plates.push(`<div class="k-web-mark" style="inset-block-start:${y}px">${esc(name)}</div>`);
}
function thread(d, roads = new Set()) {
  threads.push(`<path${lit(roads) ? ` class="${lit(roads)}"` : ""}${roadsAttr(roads)} d="${d}"/>`);
}
const down = (x, y1, y2, roads) => thread(`M${x} ${y1}V${y2}`, roads);
const bend = (x1, y1, x2, y2, reach) => `M${x1} ${y1}C${x1} ${y1 + reach} ${x2} ${y2 - reach} ${x2} ${y2}`;

const ALL = new Set(ROADS);

// The first open.
mark(Y.mark1, "The questions");
plate({ x: (W - 220) / 2, y: Y.start, w: 220, h: 56, small: "First open", name: MAP.screens.welcome, roads: ALL });
down(W / 2, Y.start + 56, Y.q1, ALL);

// The first question, and its answers in the screen's own order.
{
  const n = MAP.backgrounds.length;
  const row = n * NW + (n - 1) * GX;
  const x0 = (W - row) / 2;
  group({ x: x0 - 14, y: Y.q1, w: row + 28, h: 128, small: "Asked of every reader", name: MAP.screens.background });
  for (const [i, b] of MAP.backgrounds.entries()) {
    b.cx = x0 + i * (NW + GX) + NW / 2;
    plate({ x: x0 + i * (NW + GX), y: Y.q1 + 62, h: 52, name: backgroundName(b), roads: roadsOfBackground(b) });
  }
}

// The second question: three screens, by the first answer.
{
  const AW = 132;
  const widths = SECOND.map((s) => s.answers.length * AW + (s.answers.length - 1) * GX + 28);
  const gap = (W - 2 * M - widths.reduce((a, b) => a + b, 0)) / (SECOND.length - 1);
  if (gap < 8) stop("the second question's three screens do not fit side by side");
  let x = M;
  for (const [g, s] of SECOND.entries()) {
    const w = widths[g];
    group({ x, y: Y.q2, w, h: 146, small: `Asked after ${list(s.from.map((b) => b.label ?? "a skip"))}`, name: MAP.screens[s.asks] });
    for (const b of s.from) thread(bend(b.cx, Y.q1 + 62 + 52, x + w / 2, Y.q2, 38), roadsOfBackground(b));
    for (const [i, a] of s.answers.entries()) {
      const ax = x + 14 + i * (AW + GX);
      const ways = new Set(s.from.flatMap((b) => b.answers[i].ways.map((way) => way.to)));
      plate({ x: ax, y: Y.q2 + 76, w: AW, h: 56, name: a.label, roads: new Set([...ways].map(roadOfCol).filter(Boolean)) });
      // From this answer to each strand it can lead to, crossing the others on the way.
      for (const to of ways) {
        const c = COLS[colAt.get(to)];
        const cx = colC(colAt.get(to));
        thread(`${bend(ax + AW / 2, Y.q2 + 76 + 56, cx, Y.cross, 150)}V${c.rule ? Y.rule : Y.picks}`, new Set(c.road ? [c.road] : []));
      }
    }
    x += w + gap;
  }
}

// The rule's question, asked only on the strands the practicing take.
{
  const asked = COLS.map((c, i) => (c.rule ? i : -1)).filter((i) => i >= 0);
  if (asked.length) {
    if (asked[asked.length - 1] - asked[0] !== asked.length - 1) stop("the strands asked for their rule do not stand side by side");
    const x = colX(asked[0]);
    plate({ x, y: Y.rule, w: colX(asked[asked.length - 1]) + NW - x, h: 56, small: "Asked of the practicing", name: MAP.screens.rule, roads: new Set(asked.map((i) => COLS[i].road).filter(Boolean)) });
    for (const i of asked) down(colC(i), Y.rule + 56, Y.picks, new Set(COLS[i].road ? [COLS[i].road] : []));
  }
}

// Every strand: the last question, the handoff, the road, its week, its one Plus card.
mark(Y.mark2, "The roads");
mark(Y.mark3, MAP.screens.week);
mark(Y.mark4, "After the week");
for (const look of LOOKS) {
  const x = colX(look.from) - 7;
  group({ x, y: Y.today, w: colX(look.to) + NW + 7 - x, h: 62 + ROAD_H + 14, small: "How Today looks", name: LOOK_NAME[look.type] ?? stop(`a reader type with no name here: ${look.type}`) });
}
for (const [i, c] of COLS.entries()) {
  const x = colX(i);
  const cx = colC(i);
  const roads = new Set(c.road ? [c.road] : []);
  plate({ x, y: Y.picks, h: 64, small: "Asked of every reader", name: MAP.screens.picks, roads });
  down(cx, Y.picks + 64, Y.ready, roads);
  plate({ x, y: Y.ready, h: 56, small: "Then Today opens", name: MAP.screens.ready, roads });
  down(cx, Y.ready + 56, Y.today, roads);

  // What sets this strand apart from its neighbour, where the first pick decides it.
  const firsts = c.firsts.size === 1 ? JSON.parse([...c.firsts][0]) : null;
  const line = !c.road
    ? "Purify as it always was"
    : c.lean
      ? `The ${c.lean === "bible" ? "Bible" : c.lean} lean`
      : Array.isArray(firsts) && firsts.length <= 3 && !firsts.includes("no pick")
        ? `First pick: ${list(firsts.map((f) => pickLabel.get(f) ?? stop(`a pick with no name: ${f}`)))}`
        : null;
  plate({ x, y: Y.today + 62, h: ROAD_H, small: c.road ? "Road" : null, name: c.road ? cap(c.road) : "No road", line, roads });
  down(cx, Y.today + 62 + ROAD_H, Y.days, roads);

  if (!c.road) {
    plate({ x, y: Y.days, h: DAY_H, name: "No first week", line: "Today as it always was" });
    continue;
  }
  if (c.steps.length !== 7) stop(`${c.id} has a week of ${c.steps.length} pages`);
  for (const [k, key] of c.steps.entries()) {
    const page = MAP.pages[key] ?? stop(`a page with no name: ${key}`);
    const y = Y.days + k * DAY_STEP;
    plate({ x, y, h: DAY_H, small: `${k + 1} · ${page.section}`, name: page.name, line: k === 6 ? "The road's door" : null, roads });
    down(cx, y + DAY_H, k === 6 ? Y.plus : y + DAY_STEP, roads);
  }
  plate({ x, y: Y.plus, h: PLUS_H, small: "The Plus card", name: c.plus ? c.plus.name : "No card", line: c.plus ? null : "The locks only", roads });
}

// ── The page around the web ─────────────────────────────────────────────

const WEEKS = COLS.filter((c) => c.road);
/** How many of the roads' own weeks hold a page. */
const held = new Map();
for (const c of WEEKS) for (const key of c.steps) held.set(key, [...(held.get(key) ?? []), c]);

const firstPickWords = (firsts) => (firsts.includes("no pick") ? "with any other first pick, or none" : `when the first pick is ${list(firsts.map((f) => pickLabel.get(f)))}`);

function trail(road) {
  const r = MAP.roads.find((x) => x.id === road);
  const cols = WEEKS.filter((c) => c.road === road);
  const rows = [];
  for (const b of MAP.backgrounds)
    for (const a of b.answers)
      for (const w of a.ways) {
        if (roadOfCol(w.to) !== road) continue;
        const lean = COLS[colAt.get(w.to)].lean;
        const when = w.firsts === "any" ? "" : `, ${firstPickWords(w.firsts)}${lean ? ` (the ${lean === "bible" ? "Bible" : lean} lean)` : ""}`;
        rows.push(`<tr><td>${esc(backgroundName(b))}</td><td>${esc((a.label ?? "Skipped") + when)}</td></tr>`);
      }

  const weeks = cols
    .map((c) => {
      const stats = c.steps
        .map((key, k) => {
          const page = MAP.pages[key];
          const others = new Set((held.get(key) ?? []).map((o) => o.road).filter((o) => o !== road));
          const also = others.size ? `on ${others.size} other road${others.size === 1 ? "" : "s"}` : "on this road only";
          return `<div class="k-stat"><span class="k-stat-label">${esc(page.name)}</span><span class="k-stat-change">${esc(`${page.section} · ${also}${k === 6 ? " · the road's door" : ""}`)}</span><span class="k-stat-value">${k + 1}</span></div>`;
        })
        .join("\n      ");
      return `<h3>${c.lean ? `The week, ${c.lean === "bible" ? "Bible" : c.lean} lean` : "The road's own week"}</h3>\n    <div class="k-stats">\n      ${stats}\n    </div>`;
    })
    .join("\n    ");

  // The road's first card, as it was photographed on the app (shots.mjs, walk.json).
  const words = WALK.roads[road]?.card?.words ?? stop(`no photo of the ${road} road's card`);
  const shown = Object.values(MAP.pages)
    .filter((p) => words.includes(p.name))
    .sort((a, b) => b.name.length - a.name.length)[0];
  const first = MAP.pages[cols[0].steps[0]];
  const moved = shown && shown.name !== first.name ? ` This reader's first pick brought ${shown.name} to the front, ahead of ${first.name}.` : "";

  const plus = r.plus
    ? `A week after the questions, a reader without Plus can meet one card on Today, once: <strong>${esc(r.plus.name)}</strong>. ${esc(r.plus.does)} It is a live test: one arm meets the card, the other meets only the locks.`
    : "No card on this road. This reader meets Plus only at the locks.";

  return `<section class="k-section" data-trail="${road}"${road === OPENS_ON ? "" : " hidden"}>
    <h2>The ${cap(road)} road</h2>
    <p>${num(r.readers)} of the ${num(MAP.count.readers)} sets of answers land here. The reader's picks then arrange the week: ${num(r.differentWeeks)} different first weeks come from this road, over ${r.differentPages} pages.</p>
    <h3>Who lands here</h3>
    <div class="k-table-wrap">
      <table class="k-table">
        <thead><tr><th>First answer</th><th>Second answer</th></tr></thead>
        <tbody>
          ${rows.join("\n          ")}
        </tbody>
      </table>
    </div>
    ${weeks}
    <figure class="k-figure k-phone">
      <img src="img/card-${road}.jpg" width="780" height="512" loading="lazy" alt="The card on Today: Your first week, 1 of 7, ${esc(shown ? shown.name : first.name)}.">
      <figcaption>The week's first card on Today, photographed on the app at a phone's width.${esc(moved)}</figcaption>
    </figure>
    <h3>After the week</h3>
    <p>${plus}</p>
  </section>`;
}

const crossings = [...held]
  .map(([key, cols]) => ({ name: MAP.pages[key].name, section: MAP.pages[key].section, n: cols.length }))
  .filter((p) => p.n >= 3)
  .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
const most = crossings[0].n;

const REASONS = [
  ["A web on the app's night sky", "It is the app's own look, and threads on a night read as the constellation they are. It is the one thing that leads on the page, so it is the one thing on the night."],
  ["Top to bottom, a strand for each road", "A phone is tall. A road is followed down with the thumb, a day at a time, the way a reader walks it."],
  ["Two sizes: all of it, and up close", "All of it shows the shape you asked to see, with only its four marks to read. Up close shows the words. Threads keep their weight at both."],
  ["One road lit at a time", `${num(MAP.count.readers)} sets of answers cannot be read at once. One lit thread can, with the rest left faint and still readable.`],
  ["Every plate in the app's own words", "A plate says what the screen or page says in the app, and its small line names its section, so nothing is renamed and nothing has to be translated back."],
  ["Drawn by a script, from the rules", "The test that holds the reader map writes this web's data. When a rule changes, the test fails until the web is drawn again, so the web cannot say what the app does not do."],
  ["Plates are not buttons", "A plate is too small for a thumb when all of it is shown. The choices above the web are 44px buttons, and they do the choosing."],
];

const body = `<main class="k-page">
  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For 2.0, the mock-up phase</span>
    <h1>The reader web</h1>
    <p class="k-lede">Every screen, section and way a new reader can take, from the first open to the road's door.</p>
    <p class="k-meta">${num(MAP.count.readers)} sets of answers, ${ROADS.length} roads, ${num(MAP.count.weeks)} different first weeks. Drawn from the app's own rules, 22 November 2026.</p>
  </header>

  <section aria-label="The web">
    <figure class="k-web has-lit" id="web" data-road="${OPENS_ON}" style="--k-web-w:${W};--k-web-h:${H}">
      <div class="k-web-frame k-night dark-island" tabindex="0" role="group" aria-label="The reader web. One road is lit. Up close, it scrolls both ways.">
        <div class="k-web-room">
          <div class="k-web-plane">
            <svg class="k-web-ways" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
              ${threads.join("\n              ")}
            </svg>
            ${plates.join("\n            ")}
          </div>
        </div>
      </div>
      <figcaption>The whole web, from the first open at the top to the one Plus card at the foot. Tap it, or Up close, to read the plates. Each plate is a screen or a page in the app's own words, and its small line names its section.</figcaption>
    </figure>
    <span class="k-eyebrow" id="pick-road">Light one road</span>
    <div class="k-choice" role="group" aria-labelledby="pick-road" style="--k-choice-cols:3">
      <button type="button" id="road-all" data-pick-road="" aria-pressed="false">All roads</button>
      ${ROADS.map((id) => `<button type="button" id="road-${id}" data-pick-road="${id}" aria-pressed="${id === OPENS_ON}">${cap(id)}</button>`).join("\n      ")}
    </div>
    <span class="k-eyebrow" id="pick-size">How close</span>
    <div class="k-choice" role="group" aria-labelledby="pick-size" style="--k-choice-cols:2">
      <button type="button" id="size-whole" data-pick-size="whole" aria-pressed="true">All of it</button>
      <button type="button" id="size-near" data-pick-size="near" aria-pressed="false">Up close</button>
    </div>
  </section>

  <section class="k-section" data-trail="all" hidden>
    <h2>Every road at once</h2>
    <p>Light one road to read it step by step. All together, this is what the questions can make.</p>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Sets of answers</span><span class="k-stat-change">What the screens can give, a skip counted as an answer</span><span class="k-stat-value">${num(MAP.count.readers)}</span></div>
      <div class="k-stat"><span class="k-stat-label">Different first weeks</span><span class="k-stat-change">From ${WEEKS.length} weeks written by hand, arranged by the reader's picks</span><span class="k-stat-value">${num(MAP.count.weeks)}</span></div>
      <div class="k-stat"><span class="k-stat-label">With no road</span><span class="k-stat-change">Sets of answers that leave Purify as it always was</span><span class="k-stat-value">${num(MAP.count.noRoad)}</span></div>
      <div class="k-stat"><span class="k-stat-label">Weeks that are not whole</span><span class="k-stat-change">Not seven pages, a page twice, or the door missed</span><span class="k-stat-value">${num(MAP.count.faults)}</span></div>
    </div>
  </section>

  ${ROADS.map(trail).join("\n\n  ")}

  <hr class="k-rule">

  <section class="k-section">
    <h2>Where the roads cross</h2>
    <p>The pages that hold the most threads. Change one of these, and that many of the ${WEEKS.length} hand-written weeks change with it.</p>
    <ul class="k-bars">
      ${crossings.map((p) => `<li><span class="k-bars-name">${esc(p.name)}</span><span class="k-bars-value">${p.n} of ${WEEKS.length}</span><span class="k-bars-bar" style="width:${Math.round((p.n / most) * 100)}%"></span></li>`).join("\n      ")}
    </ul>
  </section>

  <section class="k-section">
    <h2>What each pick brings</h2>
    <p>${esc(MAP.screens.picks)} The first pick can decide the road. Every pick brings its own page into the week.</p>
    <div class="k-table-wrap">
      <table class="k-table">
        <thead><tr><th>The pick</th><th>The page it brings</th></tr></thead>
        <tbody>
          ${MAP.picks.map((p) => `<tr><td>${esc(p.label)}</td><td>${esc(list(p.brings.map((key) => MAP.pages[key].name)))}</td></tr>`).join("\n          ")}
        </tbody>
        <caption>Where a pick has more than one page, how far along the reader is decides which.</caption>
      </table>
    </div>
  </section>

  <section class="k-section">
    <h2>Why it is drawn this way</h2>
    <div class="k-table-wrap">
      <table class="k-table">
        <thead><tr><th>The choice</th><th>Why, and what it does for you</th></tr></thead>
        <tbody>
          ${REASONS.map(([what, why]) => `<tr><td>${esc(what)}</td><td>${esc(why)}</td></tr>`).join("\n          ")}
        </tbody>
      </table>
    </div>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">Drawn by a script from the reader map, which the app's own rules write.</p>
  </footer>
</main>

<script>
(() => {
  const web = document.getElementById("web");
  if (!web) return;
  const frame = web.querySelector(".k-web-frame");
  const plane = web.querySelector(".k-web-plane");
  const sheet = Number(getComputedStyle(web).getPropertyValue("--k-web-w"));
  let size = "whole";
  let road = web.dataset.road || "";

  const scale = () => (size === "whole" ? frame.clientWidth / sheet : 1);
  const fit = () => web.style.setProperty("--k-web-s", String(scale()));

  /** Bring a point of the sheet (as shares of its width and height) to the middle of the frame. */
  function bring(fx, fy) {
    const p = plane.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    frame.scrollLeft += p.left + fx * p.width - (f.left + f.width / 2);
    if (fy !== null) frame.scrollTop += p.top + fy * p.height - (f.top + f.height / 2);
  }
  /** Bring the lit road's strand under the eye, keeping how far down the reader is. */
  function bringRoad() {
    const head = road && web.querySelector('.k-web-node[data-roads="' + road + '"]');
    if (!head) return;
    const p = plane.getBoundingClientRect();
    const h = head.getBoundingClientRect();
    bring((h.left + h.width / 2 - p.left) / p.width, null);
  }

  function setSize(next, point) {
    size = next;
    web.dataset.zoom = next;
    for (const b of document.querySelectorAll("[data-pick-size]")) b.setAttribute("aria-pressed", String(b.dataset.pickSize === next));
    fit();
    if (next !== "near") return;
    frame.scrollTop = 0;
    if (point) bring(point.x, point.y);
    else bringRoad();
  }

  function light(next) {
    road = next;
    web.classList.toggle("has-lit", Boolean(next));
    for (const el of web.querySelectorAll("[data-roads]")) el.classList.toggle("is-lit", Boolean(next) && el.dataset.roads.split(" ").includes(next));
    for (const b of document.querySelectorAll("[data-pick-road]")) b.setAttribute("aria-pressed", String(b.dataset.pickRoad === next));
    for (const s of document.querySelectorAll("[data-trail]")) s.hidden = s.dataset.trail !== (next || "all");
    if (size === "near") bringRoad();
  }

  for (const b of document.querySelectorAll("[data-pick-road]")) b.addEventListener("click", () => light(b.dataset.pickRoad));
  for (const b of document.querySelectorAll("[data-pick-size]")) b.addEventListener("click", () => setSize(b.dataset.pickSize));
  // A tap on the whole web goes near, to the place tapped.
  frame.addEventListener("click", (e) => {
    if (size !== "whole") return;
    const p = plane.getBoundingClientRect();
    setSize("near", { x: (e.clientX - p.left) / p.width, y: (e.clientY - p.top) / p.height });
  });
  if ("ResizeObserver" in window) new ResizeObserver(fit).observe(frame);
  setSize("whole");
})();
</script>
`;

// ── The page: the kit's own head, then the body above ────────────────────

const open = TEMPLATE.indexOf("<body>");
if (open < 0) stop("the kit's template has no <body>");
const head = TEMPLATE.slice(0, open + "<body>".length)
  .replace(/<title>[^<]*<\/title>/, "<title>Purify reader web</title>")
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Every screen, section and way a new reader can take in Purify, drawn from the app\'s own rules.">');
const html = `${head}\n${body}</body>\n</html>\n`;

if (process.argv.includes("--check")) {
  const written = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (written !== html) {
    console.error("web.html is not what the reader map draws now: run `node docs/plans/reader-map/web.mjs` and look at the page again");
    process.exit(1);
  }
  console.log("web.html is the reader map's own drawing");
} else {
  fs.writeFileSync(OUT, html);
  console.log(`web.html: a sheet of ${W} by ${H}, ${plates.length} plates and marks, ${threads.length} threads, ${COLS.length} strands, ${Math.round(html.length / 1024)} KB`);
}
