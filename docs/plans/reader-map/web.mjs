#!/usr/bin/env node
// The reader web: the reader map drawn as a web of ways (the owner,
// 2026-11-22: "make a spider web / family tree type of artifact for the
// different screens and sections and pathways").
//
//   node docs/plans/reader-map/web.mjs                     write web.html
//   node docs/plans/reader-map/web.mjs --numbers           write web-numbers.html, a mock-up
//   node docs/plans/reader-map/web.mjs [--numbers] --check fail when the page is not what the map draws now
//
// Nothing here is drawn by hand. Every plate, thread and row comes from
// docs/plans/reader-map.json, which lib/onboarding/__tests__/readerMap.test.ts
// writes from the app's own rules and holds to them: change a rule and that
// test fails until the map is written again, then this draws the web again.
// What this file adds is only where things stand on the sheet, and it stops
// (throws) on anything the rules say that it has no place for.
//
// --numbers is the same web with a count on every plate and a share on every
// thread (the owner, 2026-11-22: "we need some way to actually track data
// from a to b to see which one is working"). It is a MOCK-UP. Nothing counts
// readers by road today (docs/plans/reader-map.md, section 12), so every
// number is an example made in example() below from a few round shares, and
// the page says so wherever a number stands. It never reads a count.
//
// The page is made of the design kit's pieces (docs/brand/design-kit.md): its
// head is the kit's own template, and the web itself is the kit's Web piece
// on the night, with the Choice piece under it. Check it as any kit page:
//   node docs/brand/kit/check.mjs --page docs/plans/reader-map/web.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/plans/reader-map.json"), "utf8"));
const WALK = JSON.parse(fs.readFileSync(path.join(HERE, "walk.json"), "utf8"));
const TEMPLATE = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const NUM = process.argv.includes("--numbers");
const OUT = path.join(HERE, NUM ? "web-numbers.html" : "web.html");

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

// ── The mock-up's numbers: examples, made here, never counted ────────────

/** A count under this is not shown, as in Admin today (lib/ab/panel.ts, SMALLEST_CELL). */
const SMALLEST = 20;
const figure = (n) => (Math.round(n) < SMALLEST ? "too few to show" : `${num(Math.round(n))} readers`);
const cell = (n) => (Math.round(n) < SMALLEST ? "too few" : num(Math.round(n)));
const wentOn = (from, to) => (Math.round(from) < SMALLEST || Math.round(to) < SMALLEST ? "" : `${Math.round((100 * Math.round(to)) / Math.round(from))}%`);

/**
 * One example month: a thousand readers begin the questions, and round
 * shares say where they go. The shares are invented to look like a month
 * could, and to show what the page does with a small road. They are not
 * Purify's, and nothing here is read from a count.
 */
function example() {
  const BEGAN = 1000;
  const FROM = { orthodox: 34, catholic: 13, protestant: 17, christian: 6, "other-faith": 3, none: 14, "prefer-not": 6, "not asked": 7 };
  const THEN = {
    where: { practicing: 55, "coming back": 22, preparing: 15, skipped: 8 },
    been: { "not yet been to a church": 62, "going to a church": 26, skipped: 12 },
    level: { "completely new": 45, learning: 20, practicing: 20, skipped: 15 },
  };
  /** Where the first pick decides the strand, the share that goes each way. */
  const SPLIT = { seeker: 30, newcomer: 70, "protestant:liturgical": 35, "protestant:bible": 65 };
  /** Of a hundred readers on a road, how many open each day of the week. */
  const STAYS = [60, 47, 39, 33, 29, 26, 24];
  /** Each strand a little better or worse than the rest, so the roads can be told apart. */
  const LEAN = [100, 108, 96, 112, 104, 92, 100, 95, 110, 88];
  if (LEAN.length < COLS.length) stop("an example for more strands than it was made for");

  const background = new Map();
  const answer = new Map();
  const way = new Map();
  const on = new Map(COLS.map((c) => [c.id, 0]));
  for (const b of MAP.backgrounds) {
    const n = (BEGAN * (FROM[b.id] ?? stop(`an example share for ${b.id}`))) / 100;
    background.set(b.id, n);
    for (const a of b.answers) {
      const m = (n * (THEN[b.asks]?.[a.says] ?? stop(`an example share for ${b.asks}, ${a.says}`))) / 100;
      answer.set(`${b.id}|${a.says}`, m);
      for (const w of a.ways) {
        const k = w.firsts === "any" ? m : (m * (SPLIT[w.to] ?? stop(`an example split for ${w.to}`))) / 100;
        way.set(`${b.id}|${a.says}|${w.to}`, k);
        on.set(w.to, on.get(w.to) + k);
      }
    }
  }
  const strand = new Map();
  for (const [i, c] of COLS.entries()) {
    const reached = on.get(c.id);
    const finished = reached * 0.9;
    const days = c.road ? STAYS.map((s) => (finished * s * LEAN[i]) / 10000) : [];
    strand.set(c.id, { on: reached, picks: reached * 0.97, finished, days, plus: c.plus ? days[6] * 0.5 : null });
  }
  return { BEGAN, background, answer, way, strand };
}
const EX = NUM ? example() : null;

// ── Where things stand on the sheet ─────────────────────────────────────

const NW = 156; // a plate
const GX = 18; // between strands
const M = 24; // the sheet's edge
const W = 2 * M + COLS.length * NW + (COLS.length - 1) * GX;
const colX = (i) => M + i * (NW + GX);
const colC = (i) => colX(i) + NW / 2;

/** A plate that carries a count is one line taller. */
const E = NUM ? 18 : 0;
const MARK = 64;
const Y = { mark1: 20, start: 100, q1: 190 + E, q2: 380 + 2 * E, cross: 800 + 3 * E, rule: 816 + 3 * E, picks: 900 + 4 * E, ready: 988 + 5 * E, mark2: 1064 + 6 * E, today: 1148 + 6 * E };
const ROAD_H = 100 + E;
const DAY_H = 100 + E;
const DAY_STEP = 120 + E;
Y.mark3 = Y.today + 62 + ROAD_H + 14 + 20;
Y.days = Y.mark3 + MARK + 20;
Y.mark4 = Y.days + 6 * DAY_STEP + DAY_H + 20;
Y.plus = Y.mark4 + MARK + 20;
const PLUS_H = 96 + E;
const H = Y.plus + PLUS_H + 28;

const plates = [];
const threads = [];
const lit = (roads) => (roads.has(OPENS_ON) ? "is-lit" : "");
const roadsAttr = (roads) => (roads.size ? ` data-roads="${[...roads].join(" ")}"` : "");
const at = (x, y, w, h) => `inset-inline-start:${x}px;inset-block-start:${y}px;width:${w}px${h ? `;height:${h}px` : ""}`;

/** A plate. `n` is its count, in the mock-up only. */
function plate({ x, y, w = NW, h, small, name, line, roads = new Set(), n = null }) {
  const count = n === null ? "" : `<em>${esc(figure(n))}</em>`;
  plates.push(`<div class="k-web-node ${lit(roads)}"${roadsAttr(roads)} style="${at(x, y, w, h)}">${small ? `<small>${esc(small)}</small>` : ""}${esc(name)}${line ? `<span>${esc(line)}</span>` : ""}${count}</div>`);
}
function group({ x, y, w, h, small, name }) {
  plates.push(`<div class="k-web-group" style="${at(x, y, w, h)}"><small>${esc(small)}</small><b>${esc(name)}</b></div>`);
}
function mark(y, name) {
  plates.push(`<div class="k-web-mark" style="inset-block-start:${y}px">${esc(name)}</div>`);
}
/** A thread. `n` is the readers on it, in the mock-up only: its weight is their share of all who began. */
function thread(d, roads = new Set(), n = null) {
  const weight = n === null ? "" : ` style="--k-web-weight:${Math.min(1, n / EX.BEGAN).toFixed(3)}"`;
  threads.push(`<path${lit(roads) ? ` class="${lit(roads)}"` : ""}${roadsAttr(roads)}${weight} d="${d}"/>`);
}
const down = (x, y1, y2, roads, n = null) => thread(`M${x} ${y1}V${y2}`, roads, n);
const bend = (x1, y1, x2, y2, reach) => `M${x1} ${y1}C${x1} ${y1 + reach} ${x2} ${y2 - reach} ${x2} ${y2}`;
/** Beside a thread, the share of one plate's readers that reached the next. Nothing where either is too few. */
function share(x, y, from, to, roads) {
  const said = wentOn(from, to);
  if (said) plates.push(`<i class="k-web-share ${lit(roads)}"${roadsAttr(roads)} style="${at(x + 9, y, 40)};font-style:normal">${said}</i>`);
}

const ALL = new Set(ROADS);

// The first open.
mark(Y.mark1, "The questions");
plate({ x: (W - 220) / 2, y: Y.start, w: 220, h: 56 + E, small: "First open", name: MAP.screens.welcome, roads: ALL, n: EX ? EX.BEGAN : null });
down(W / 2, Y.start + 56 + E, Y.q1, ALL, EX ? EX.BEGAN : null);

// The first question, and its answers in the screen's own order.
{
  const n = MAP.backgrounds.length;
  const row = n * NW + (n - 1) * GX;
  const x0 = (W - row) / 2;
  group({ x: x0 - 14, y: Y.q1, w: row + 28, h: 128 + E, small: "Asked of every reader", name: MAP.screens.background });
  for (const [i, b] of MAP.backgrounds.entries()) {
    b.cx = x0 + i * (NW + GX) + NW / 2;
    plate({ x: x0 + i * (NW + GX), y: Y.q1 + 62, h: 52 + E, name: backgroundName(b), roads: roadsOfBackground(b), n: EX ? EX.background.get(b.id) : null });
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
    group({ x, y: Y.q2, w, h: 146 + E, small: `Asked after ${list(s.from.map((b) => b.label ?? "a skip"))}`, name: MAP.screens[s.asks] });
    for (const b of s.from) thread(bend(b.cx, Y.q1 + 62 + 52 + E, x + w / 2, Y.q2, 38), roadsOfBackground(b), EX ? EX.background.get(b.id) : null);
    for (const [i, a] of s.answers.entries()) {
      const ax = x + 14 + i * (AW + GX);
      const ways = new Set(s.from.flatMap((b) => b.answers[i].ways.map((way) => way.to)));
      const here = EX ? s.from.reduce((sum, b) => sum + EX.answer.get(`${b.id}|${a.says}`), 0) : null;
      plate({ x: ax, y: Y.q2 + 76, w: AW, h: 56 + E, name: a.label, roads: new Set([...ways].map(roadOfCol).filter(Boolean)), n: here });
      // From this answer to each strand it can lead to, crossing the others on the way.
      for (const to of ways) {
        const c = COLS[colAt.get(to)];
        const cx = colC(colAt.get(to));
        const along = EX ? s.from.reduce((sum, b) => sum + (EX.way.get(`${b.id}|${a.says}|${to}`) ?? 0), 0) : null;
        thread(`${bend(ax + AW / 2, Y.q2 + 76 + 56 + E, cx, Y.cross, 150)}V${c.rule ? Y.rule : Y.picks}`, new Set(c.road ? [c.road] : []), along);
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
    const here = EX ? asked.reduce((sum, i) => sum + EX.strand.get(COLS[i].id).on, 0) : null;
    plate({ x, y: Y.rule, w: colX(asked[asked.length - 1]) + NW - x, h: 56 + E, small: "Asked of the practicing", name: MAP.screens.rule, roads: new Set(asked.map((i) => COLS[i].road).filter(Boolean)), n: here });
    for (const i of asked) down(colC(i), Y.rule + 56 + E, Y.picks, new Set(COLS[i].road ? [COLS[i].road] : []), EX ? EX.strand.get(COLS[i].id).on : null);
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
  const ex = EX ? EX.strand.get(c.id) : null;
  plate({ x, y: Y.picks, h: 64 + E, small: "Asked of every reader", name: MAP.screens.picks, roads, n: ex ? ex.picks : null });
  down(cx, Y.picks + 64 + E, Y.ready, roads, ex ? ex.finished : null);
  if (ex) share(cx, Y.picks + 64 + E + 4, ex.picks, ex.finished, roads);
  plate({ x, y: Y.ready, h: 56 + E, small: "Then Today opens", name: MAP.screens.ready, roads, n: ex ? ex.finished : null });
  down(cx, Y.ready + 56 + E, Y.today, roads, ex ? ex.finished : null);

  // What sets this strand apart from its neighbour, where the first pick decides it.
  const firsts = c.firsts.size === 1 ? JSON.parse([...c.firsts][0]) : null;
  const line = !c.road
    ? "Purify as it always was"
    : c.lean
      ? `The ${c.lean === "bible" ? "Bible" : c.lean} lean`
      : Array.isArray(firsts) && firsts.length <= 3 && !firsts.includes("no pick")
        ? `First pick: ${list(firsts.map((f) => pickLabel.get(f) ?? stop(`a pick with no name: ${f}`)))}`
        : null;
  plate({ x, y: Y.today + 62, h: ROAD_H, small: c.road ? "Road" : null, name: c.road ? cap(c.road) : "No road", line, roads, n: ex ? ex.finished : null });
  down(cx, Y.today + 62 + ROAD_H, Y.days, roads, ex && c.road ? ex.days[0] : null);

  if (!c.road) {
    plate({ x, y: Y.days, h: DAY_H, name: "No first week", line: "Today as it always was" });
    continue;
  }
  if (c.steps.length !== 7) stop(`${c.id} has a week of ${c.steps.length} pages`);
  if (ex) share(cx, Y.days - 18, ex.finished, ex.days[0], roads);
  for (const [k, key] of c.steps.entries()) {
    const page = MAP.pages[key] ?? stop(`a page with no name: ${key}`);
    const y = Y.days + k * DAY_STEP;
    plate({ x, y, h: DAY_H, small: `${k + 1} · ${page.section}`, name: page.name, line: k === 6 ? "The road's door" : null, roads, n: ex ? ex.days[k] : null });
    down(cx, y + DAY_H, k === 6 ? Y.plus : y + DAY_STEP, roads, ex ? (k === 6 ? (ex.plus ?? 0) : ex.days[k + 1]) : null);
    if (ex && k < 6) share(cx, y + DAY_H + 3, ex.days[k], ex.days[k + 1], roads);
  }
  plate({ x, y: Y.plus, h: PLUS_H, small: "The Plus card", name: c.plus ? c.plus.name : "No card", line: c.plus ? null : "The locks only", roads, n: ex && c.plus ? ex.plus : null });
}

// ── The page around the web ─────────────────────────────────────────────

const WEEKS = COLS.filter((c) => c.road);
/** How many of the roads' own weeks hold a page. */
const held = new Map();
for (const c of WEEKS) for (const key of c.steps) held.set(key, [...(held.get(key) ?? []), c]);

const firstPickWords = (firsts) => (firsts.includes("no pick") ? "with any other first pick, or none" : `when the first pick is ${list(firsts.map((f) => pickLabel.get(f)))}`);
const leanName = (c) => (c.lean === "bible" ? "Bible" : c.lean);

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

/** The mock-up's trail: the lit road from its first plate to its last, a row for each. */
function trailNumbers(road) {
  const tables = WEEKS.filter((c) => c.road === road)
    .map((c) => {
      const ex = EX.strand.get(c.id);
      const steps = [
        ["Answers that lead here", ex.on],
        ["Finished the questions", ex.finished],
        ...c.steps.map((key, k) => [`Day ${k + 1}: ${MAP.pages[key].name}`, ex.days[k]]),
        ...(c.plus ? [[`Met the Plus card: ${c.plus.name}`, ex.plus]] : []),
      ];
      // The card is met by one arm of a test, so the share from day 7 to it is not a share that "went on".
      const last = c.plus ? steps.length - 2 : steps.length - 1;
      const rows = steps.map(([name, n], k) => `<tr><td>${esc(name)}</td><td class="k-num${Math.round(n) < SMALLEST ? " k-quiet" : ""}">${cell(n)}</td><td class="k-num k-quiet">${k < last ? wentOn(n, steps[k + 1][1]) : ""}</td></tr>`);
      return `${c.lean ? `<h3>The ${leanName(c)} lean</h3>\n    ` : ""}<div class="k-table-wrap">
      <table class="k-table">
        <thead><tr><th>From A to B</th><th class="k-num">Readers</th><th class="k-num">Went on</th></tr></thead>
        <tbody>
          ${rows.join("\n          ")}
        </tbody>
        <caption>Example numbers. "Too few" is a count under twenty, which is not shown, as in Admin today.</caption>
      </table>
    </div>`;
    })
    .join("\n    ");
  return `<section class="k-section" data-trail="${road}"${road === OPENS_ON ? "" : " hidden"}>
    <h2>The ${cap(road)} road, from A to B</h2>
    <p>Each row is a plate on the lit thread. "Went on" is the share of its readers who reached the next one. Where that share drops most is the plate to mend.</p>
    ${tables}
  </section>`;
}

const crossings = [...held]
  .map(([key, cols]) => ({ name: MAP.pages[key].name, section: MAP.pages[key].section, n: cols.length }))
  .filter((p) => p.n >= 3)
  .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
const most = crossings[0].n;

const REASONS = NUM
  ? [
      ["A thread as thick as its readers", "The eye finds where readers go, and where the web thins, before a number is read. Widths are to scale: a thread with half the readers is half as thick."],
      ["The count on the plate, the share beside the thread", "A plate is a place, and a thread is the way from A to B. So the figure that says how many went on stands on the way itself."],
      ["\"Too few to show\" under twenty", "It is Admin's own rule today. A handful of readers is close to a description of people, and it is no finding either. On this page it also shows the limit: a small road goes dark by the middle of its week."],
      ["Every number marked as an example", "Nothing is counted by road today. A drawing must not be taken for a result."],
      ["The same web as before", "One picture to learn. The numbers are added to it, and nothing is moved."],
    ]
  : [
      ["A web on the app's night sky", "It is the app's own look, and threads on a night read as the constellation they are. It is the one thing that leads on the page, so it is the one thing on the night."],
      ["Top to bottom, a strand for each road", "A phone is tall. A road is followed down with the thumb, a day at a time, the way a reader walks it."],
      ["Two sizes: all of it, and up close", "All of it shows the shape you asked to see, with only its four marks to read. Up close shows the words. Threads keep their weight at both."],
      ["One road lit at a time", `${num(MAP.count.readers)} sets of answers cannot be read at once. One lit thread can, with the rest left faint and still readable.`],
      ["Every plate in the app's own words", "A plate says what the screen or page says in the app, and its small line names its section, so nothing is renamed and nothing has to be translated back."],
      ["Drawn by a script, from the rules", "The test that holds the reader map writes this web's data. When a rule changes, the test fails until the web is drawn again, so the web cannot say what the app does not do."],
      ["Plates are not buttons", "A plate is too small for a thumb when all of it is shown. The choices under the web are 44px buttons, and they do the choosing."],
    ];

const head = NUM
  ? {
      title: "Purify web in numbers",
      says: "A mock-up of the Purify reader web with a count on every plate and thread. Every number is an example.",
      eyebrow: "For 2.0, a mock-up",
      h1: "Numbers on the web",
      lede: "The reader web with a count on every plate, and on every thread the share that went on.",
      meta: `Example numbers: ${num(EX.BEGAN)} readers in an example month. Nothing on this page was counted.`,
      label: "The reader web with example numbers. One road is lit. Up close, it scrolls both ways.",
      caption: "Example numbers, to show the idea. A thread is as thick as the readers on it. A plate says how many reached it, and the figure beside a thread says what share went on. Under twenty, nothing is shown. Tap the web, or Up close, to read it.",
    }
  : {
      title: "Purify reader web",
      says: "Every screen, section and way a new reader can take in Purify, drawn from the app's own rules.",
      eyebrow: "For 2.0, the mock-up phase",
      h1: "The reader web",
      lede: "Every screen, section and way a new reader can take, from the first open to the road's door.",
      meta: `${num(MAP.count.readers)} sets of answers, ${ROADS.length} roads, ${num(MAP.count.weeks)} different first weeks. Drawn from the app's own rules, 22 November 2026.`,
      label: "The reader web. One road is lit. Up close, it scrolls both ways.",
      caption: "The whole web, from the first open at the top to the one Plus card at the foot. Tap it, or Up close, to read the plates. Each plate is a screen or a page in the app's own words, and its small line names its section.",
    };

/** A road's strands as one, for the mock-up's table of roads. */
const roadSum = (road, pick) => WEEKS.filter((c) => c.road === road).reduce((sum, c) => sum + pick(EX.strand.get(c.id)), 0);

const everyRoad = NUM
  ? `<section class="k-section" data-trail="all" hidden>
    <h2>Every road at once</h2>
    <p>Light one road to read it plate by plate. The table under this sets the roads side by side.</p>
  </section>`
  : `<section class="k-section" data-trail="all" hidden>
    <h2>Every road at once</h2>
    <p>Light one road to read it step by step. All together, this is what the questions can make.</p>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Sets of answers</span><span class="k-stat-change">What the screens can give, a skip counted as an answer</span><span class="k-stat-value">${num(MAP.count.readers)}</span></div>
      <div class="k-stat"><span class="k-stat-label">Different first weeks</span><span class="k-stat-change">From ${WEEKS.length} weeks written by hand, arranged by the reader's picks</span><span class="k-stat-value">${num(MAP.count.weeks)}</span></div>
      <div class="k-stat"><span class="k-stat-label">With no road</span><span class="k-stat-change">Sets of answers that leave Purify as it always was</span><span class="k-stat-value">${num(MAP.count.noRoad)}</span></div>
      <div class="k-stat"><span class="k-stat-label">Weeks that are not whole</span><span class="k-stat-change">Not seven pages, a page twice, or the door missed</span><span class="k-stat-value">${num(MAP.count.faults)}</span></div>
    </div>
  </section>`;

const after = NUM
  ? `<section class="k-section">
    <h2>Which road is working</h2>
    <p>The roads side by side: how many readers finished the questions on each, how many opened the first day, and how many reached the road's door on day seven.</p>
    <div class="k-table-wrap">
      <table class="k-table">
        <thead><tr><th>Road</th><th class="k-num">On it</th><th class="k-num">Day 1</th><th class="k-num">The door</th></tr></thead>
        <tbody>
          ${ROADS.map((road) => {
            const on = roadSum(road, (s) => s.finished);
            const day1 = roadSum(road, (s) => s.days[0]);
            const door = roadSum(road, (s) => s.days[6]);
            const quiet = (n) => (Math.round(n) < SMALLEST ? " k-quiet" : "");
            return `<tr><td>${cap(road)}</td><td class="k-num${quiet(on)}">${cell(on)}</td><td class="k-num${quiet(day1)}">${cell(day1)}</td><td class="k-num${quiet(door)}">${cell(door)}</td></tr>`;
          }).join("\n          ")}
        </tbody>
        <caption>Example numbers. With a thousand readers a month, four of the eight roads are too small to read at their door. Plus bought, road by road, would read "too few" on every line.</caption>
      </table>
    </div>
  </section>

  <section class="k-section">
    <h2>Before this is real</h2>
    <div class="k-table-wrap">
      <table class="k-table">
        <thead><tr><th>What it needs</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td>The road as one word on the counts</td><td>Today no count says which road a reader is on. That was your choice of 11 November, and the counts say nothing of a reader's faith.</td></tr>
          <tr><td>The privacy page, and a yes from readers in the EU</td><td>It is a count about faith. The page has to say it before anything is sent, and a reader in the EU has to agree first.</td></tr>
          <tr><td>More readers than a road has</td><td>A count under twenty is not shown. Small roads go dark, as they do on this page. A road's numbers are to watch. A verdict comes from a test on all readers together.</td></tr>
          <tr><td>Its place in Admin</td><td>This page shows the idea. In Admin it is drawn from the admin's own pieces, after your yes.</td></tr>
        </tbody>
      </table>
    </div>
  </section>`
  : `<section class="k-section">
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
  </section>`;

const body = `<main class="k-page">
  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">${head.eyebrow}</span>
    <h1>${head.h1}</h1>
    <p class="k-lede">${esc(head.lede)}</p>
    <p class="k-meta">${esc(head.meta)}</p>
  </header>

  <section aria-label="The web">
    <figure class="k-web has-lit" id="web" data-road="${OPENS_ON}" style="--k-web-w:${W};--k-web-h:${H}">
      <div class="k-web-frame k-night dark-island" tabindex="0" role="group" aria-label="${esc(head.label)}">
        <div class="k-web-room">
          <div class="k-web-plane">
            <svg class="k-web-ways" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
              ${threads.join("\n              ")}
            </svg>
            ${plates.join("\n            ")}
          </div>
        </div>
      </div>
      <figcaption>${esc(head.caption)}</figcaption>
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

  ${everyRoad}

  ${ROADS.map(NUM ? trailNumbers : trail).join("\n\n  ")}

  <hr class="k-rule">

  ${after}

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
    <p class="k-meta">${NUM ? "A mock-up. Its web is drawn from the reader map; its numbers are examples." : "Drawn by a script from the reader map, which the app's own rules write."}</p>
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
const top = TEMPLATE.slice(0, open + "<body>".length)
  .replace(/<title>[^<]*<\/title>/, `<title>${head.title}</title>`)
  .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(head.says)}">`);
const html = `${top}\n${body}</body>\n</html>\n`;
const name = path.basename(OUT);

if (process.argv.includes("--check")) {
  const written = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (written !== html) {
    console.error(`${name} is not what the reader map draws now: run \`node docs/plans/reader-map/web.mjs${NUM ? " --numbers" : ""}\` and look at the page again`);
    process.exit(1);
  }
  console.log(`${name} is the reader map's own drawing`);
} else {
  fs.writeFileSync(OUT, html);
  console.log(`${name}: a sheet of ${W} by ${H}, ${plates.length} plates and marks, ${threads.length} threads, ${COLS.length} strands, ${Math.round(html.length / 1024)} KB`);
}
