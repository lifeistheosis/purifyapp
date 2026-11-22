#!/usr/bin/env node
// The promo cut to "Forever" (slowed): the storyboard.
//
// The brief is forever-edit-prompt.md: 35.2 seconds, an intro and eight bars of
// 3.9 seconds, cut to hits that were measured. This is one still for each row
// of that cut, for his yes or no before anything is rendered as film.
//
//   node docs/plans/v1.9/video/release/forever-board.mjs            every still, full size, and the sheet
//   node docs/plans/v1.9/video/release/forever-board.mjs --only 5   one still
//   node docs/plans/v1.9/video/release/forever-board.mjs --check    checkMock on every still
//
// The stage is the release film's own (board.mjs: the palette's deepest night,
// the phone, what the ground gives back, the type in the app's sans). The
// screen on the phone is a frame of a take of the native export of main
// 6700c2e65: a new reader with no Plus, Dark, Sunday 6 December 2026. Nothing
// of the app is drawn.
//
// Words: the hook and its answer are fixed in the brief at his word (the
// question, and John 14:6 word for word from the app's own Bible). Every other
// word is read here from the drop, the store pictures' lines or the app's
// labels, and a line that does not join back into its source is refused.

import fs from "node:fs";
import path from "node:path";
import { MADE, ROOT, checkMock, dir, launch, sharp } from "../lib.mjs";
import { openStage } from "./board.mjs";

const fail = (text) => {
  throw new Error(text);
};
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

// ── The words ────────────────────────────────────────────────────────────

const DROP = read("docs/plans/v1.9/drop.json");
const STORE = read("docs/plans/v1.9/store/results.json");
const APP = read("lib/i18n/messages/en.json");
const point = (id) => DROP.points.find((p) => p.id === id) ?? fail(`the drop has no point "${id}"`);
const storeLine = (shot) => STORE.pictures.find((p) => p.shot === shot)?.caption ?? fail(`the store pictures have no "${shot}"`);
const label = (key) => APP[key] ?? fail(`the app has no label ${key}`);
const caption = DROP.pieces.find((p) => p.id === "instagram-caption")?.text ?? fail("the drop has no caption");
/** Words, where they break, and where they are from. The lines must join back into the words. */
const words = (text, lines, from, sub = null) => {
  if (lines.join(" ") !== text) fail(`"${text}": the lines do not join into it`);
  if (/[–—]/.test(`${text} ${sub ?? ""}`)) fail(`"${text}": a dash in place of words`);
  return { text, lines, sub, from };
};

// The hook is the film's one written line, fixed in the brief at his word (2026-11-21, about 23:05 UTC: "I like it").
export const HOOK = words("Do all religions worship the same God?", ["Do all", "religions", "worship the", "same God?"], "the hook, fixed in the brief at your word");
// The answer is Scripture, word for word: the app's own King James text, checked here against the app's own file.
const JOHN_14_6 = "I am the way, the truth, and the life: no man cometh unto the Father, but by me.";
const inTheApp = read("data/bible/john/14.json");
if (!JSON.stringify(inTheApp).includes(JOHN_14_6)) fail("John 14:6 does not read so in the app's own Bible");
export const ANSWER = words(JOHN_14_6, ["I am the way,", "the truth,", "and the life:", "no man cometh", "unto the Father,", "but by me."], "John 14:6, word for word from the app's own Bible (King James)", "John 14:6");

export const TITLES = {
  today: words(storeLine("today"), ["The day's saint,", "fast and readings"], "the store pictures' line for Today"),
  journal: words(point("journal").name, ["Your journal,", "by the Church's day"], "the drop's point for the journal, its name"),
  verse: words(point("verse").name, ["Every verse,", "opened"], "the drop's point for the verse, its name"),
  bibles: words(point("bibles").name, ["Seven more", "Bibles"], "the drop's point for the Bibles, its name"),
  fathers: words(storeLine("fathers"), ["The Fathers", "on the verse", "you are reading"], "the store pictures' line for the Fathers"),
  saint: words(storeLine("saint"), ["The lives", "of the saints"], "the store pictures' line for the saint"),
  creed: words(point("creed").name, ["The Creed", "by council"], "the drop's point for the Creed, its name"),
  pray: words(label("community.prayTogether"), ["Pray together"], "the app's own labels", label("community.prayerCampaigns")),
  end: words(caption.match(new RegExp(`Purify ${DROP.release} is here[^.]*\\.`))?.[0] ?? fail("the caption does not open so"), ["Purify 1.9", "is here."], "the first sentence of the drop's caption"),
};

// ── The takes ────────────────────────────────────────────────────────────

const TAKES = {};
const takeOf = (folder) => {
  if (TAKES[folder]) return TAKES[folder];
  const file = path.join(MADE, "takes", folder, "take.json");
  if (!fs.existsSync(file)) fail(`no take "${folder}": film it first (forever-edit.md)`);
  const t = JSON.parse(fs.readFileSync(file, "utf8"));
  if (t.problems.length) fail(`the take "${folder}" has problems: ${t.problems.join("; ")}`);
  return (TAKES[folder] = t);
};
/** The picture of a take at a moment: [take's folder, mark, seconds after it]. */
const picture = ([folder, mark, after]) => {
  const t = takeOf(folder);
  const at = (t.marks.find((m) => m.name === mark) ?? fail(`the take "${folder}" has no mark "${mark}" (${t.marks.map((m) => m.name).join(", ")})`)).t + after;
  let last = t.frames[0];
  for (const f of t.frames) if (f.t <= at) last = f;
  return `/__video/takes/${folder}/${last.file}`;
};

// ── The cut ──────────────────────────────────────────────────────────────
//
// A row of the cut (the brief's table), and its still:
//   at      [from, to] in seconds, and `on` the measured hits inside it that something lands on
//   music   what the track does there
//   still   the moment the still shows, in seconds of the film
//   screen, phone, floor, pool, mark, title   as in board.mjs (the stage's own words)
//   small   the size of the small line under a title, where it is not the stage's own
//   why     the reason, for the page
//
// The phone's floor is where its foot stands: about y + 429 * k for a phone that is nearly upright.

const NO_POOL = [540, 960, 10, 10, 0];
export const ROWS = [
  {
    name: "The hook",
    at: [0, 2.07],
    on: [0.07],
    music: "near silence, one soft hit",
    still: 0.6,
    pool: NO_POOL,
    title: { lines: HOOK.lines, sub: null, y: 540, size: 178 },
    why: "A feed decides in the first second, so the film opens on a question and nothing else. It is whole on the first soft hit, in the app's sans, as wide as the frame, with no fade to wait through. No glow behind it: the words on the dark and nothing more, as you asked of the last film's type.",
  },
  {
    name: "The answer",
    at: [2.07, 3.72],
    on: [2.07],
    music: "the second soft hit",
    still: 2.9,
    pool: NO_POOL,
    title: { lines: ANSWER.lines, sub: ANSWER.sub, y: 500, size: 112 },
    small: 50,
    why: "The question is answered in Scripture's own words and no one else's: John 14:6 from the app's own Bible, word for word, with its place under it. It changes on the second hit by a clean cut and goes to dark just before the first swell, so the swell opens on the phone. Nothing is added to the verse and nothing argues.",
  },
  {
    name: "Today",
    at: [3.72, 7.62],
    on: [3.72, 4.37, 5.02, 5.67, 6.66],
    music: "bar 1, the first swell",
    still: 5.9,
    screen: ["ad-today", "go", 1.95],
    phone: { x: 540, y: 1000, k: 1.5, ry: -9, rx: 5, rz: 0, dark: [0.42, "bottom"], sheen: [0.5, 0.16] },
    floor: 1652,
    pool: [540, 1668, 980, 250, 0.34],
    why: "On the swell the phone rises out of the dark, lit from above, its screen bare. The day's card lands on 4.37, St Nicholas on 5.02 and Begin on 5.67, each the app's own piece settling before the next beat. One slow move in for the whole bar. The still is the moment Begin has landed.",
  },
  {
    name: "Today's title",
    at: [6.66, 7.62],
    on: [6.66],
    music: "bar 1, its last beat",
    still: 7.0,
    extra: true,
    screen: ["ad-today", "go", 2.6],
    phone: { x: 540, y: 1000, k: 1.62, ry: -9, rx: 5, rz: 0, dark: [0.5, "bottom"], blur: 26, dim: 0.62 },
    floor: 1704,
    pool: [540, 1300, 900, 500, 0.08],
    title: { lines: TITLES.today.lines, sub: null, y: 800, size: 112 },
    why: "How every bar's title lands: late in the bar, full width, for under a second, while the phone goes on moving out of focus behind it, and gone before the next swell. No caption ever sits over the phone. Shown once here; each bar's own words are under its still.",
  },
  {
    name: "The journal",
    at: [7.62, 11.52],
    on: [7.64, 8.99, 9.64, 10.31],
    music: "bar 2",
    still: 9.9,
    screen: ["ad-journal", "go", 1.75],
    phone: { x: 640, y: 780, k: 2.5, ry: -25, rx: 7, rz: 1.2, soft: ["top", 0.5], sheen: [0.6, 0.52], dark: [0.4, "top"] },
    pool: [700, 1200, 900, 700, 0.1],
    title_words: "journal",
    why: "A hard cut on 7.64 from the whole phone to a close shot, the phone already on its side stand: the change of scale is the cut. The day's page rises, and the Epistle and the Gospel slide in on 8.99 and 9.64, each with its pen. The journal is the head of the 1.9 note, so it comes second and close.",
  },
  {
    name: "Hold a verse",
    at: [11.52, 15.42],
    on: [11.61, 12.28, 13.61, 14.28],
    music: "bar 3",
    still: 12.9,
    screen: ["verse", "tools", 0.75],
    phone: { x: 520, y: 880, k: 2.5, ry: 16, rx: 6, rz: -1, soft: ["top", 0.36], sheen: [0.4, 0.6] },
    pool: [380, 900, 900, 700, 0.1],
    title_words: "verse",
    why: "Very close on the Bible's text. A finger holds John 1:1, by real touch, and the verse's own tools rise on 12.28. The far end of the glass falls soft so the eye stays on the verse. Only what every reader has is opened; nothing of Plus is shown in use.",
  },
  {
    name: "Seven more Bibles",
    at: [15.42, 19.32],
    on: [15.91, 17.25, 17.9, 18.55, 19.25],
    music: "bar 4",
    still: 17.5,
    screen: ["bibles", "list", 0.9],
    phone: { x: 560, y: 1050, k: 1.12, ry: -22, rx: 6, rz: 1, dark: [0.22, "far"], sheen: [0.7, 0.3] },
    floor: 1540,
    pool: [600, 1552, 880, 220, 0.34],
    title_words: "bibles",
    why: "After three bars near the glass the frame opens wide and dark, the phone small in it. That is the breath in the middle of the film. The list of Bibles is drawn up on the beats 17.25, 17.90 and 18.55, each Bible in its own script.",
  },
  {
    name: "The Fathers on the verse",
    at: [19.32, 23.22],
    on: [20.25, 21.25, 21.87],
    music: "bar 5",
    still: 22.0,
    screen: ["fathers-verse", "fathers", 1.0],
    phone: { x: 540, y: 980, k: 1.72, ry: 21, rx: 6, rz: -1, dark: [0.3, "far"], sheen: [0.32, 0.5] },
    floor: 1774,
    pool: [500, 1786, 980, 240, 0.3],
    title_words: "fathers",
    why: "A slow orbit round the phone, the one bar where the camera travels sideways. The Fathers' commentary rises from under the verse on 21.25 and is at rest on 21.87. It is the app's own sheet, opened by a tap on the verse's own mark.",
  },
  {
    name: "A saint's life",
    at: [23.22, 27.12],
    on: [23.55, 24.54, 25.19, 25.84, 26.52],
    music: "bar 6",
    still: 23.9,
    screen: ["saints", "saint", 1.2],
    phone: { x: 540, y: 1250, k: 2.5, ry: -8, rx: 4, rz: 0.6, soft: ["bottom", 0.4], sheen: [0.6, 0.3] },
    pool: [540, 700, 900, 700, 0.1],
    title_words: "saint",
    why: "The bar opens with the saint's picture filling the frame, then the camera pulls back through 24.54, 25.19 and 25.84 until the whole page stands on the phone. St Amphilochius of Iconium: his picture is clear of the heritage list. The still is the opening, before the pull back.",
  },
  {
    name: "The Creed by council",
    at: [27.12, 31.02],
    on: [27.49, 28.19, 28.84, 29.49, 30.49],
    music: "bar 7, the music at its fullest",
    still: 29.6,
    screen: ["creed", "creed", 1.1],
    phone: { x: 560, y: 900, k: 2.5, ry: 12, rx: 5, rz: -0.8, soft: ["bottom", 0.34], sheen: [0.45, 0.4] },
    pool: [480, 800, 1000, 800, 0.14],
    title_words: "creed",
    why: "The music is fullest here, so the camera is at its nearest and the Creed fills the frame. Its lines arrive one on each beat, 28.19, 28.84 and 29.49, the council's name over them, the words Constantinople added lit by the app itself.",
  },
  {
    name: "Prayer campaigns",
    at: [31.02, 34.48],
    on: [31.16, 32.16, 33.81],
    music: "bar 8, the last swell, building",
    still: 34.0,
    screen: ["pray", "campaign", 1.3],
    phone: { x: 540, y: 1020, k: 1.32, ry: -14, rx: 6, rz: 0.8, dark: [0.18, "far"], sheen: [0.68, 0.28] },
    floor: 1596,
    pool: [560, 1608, 960, 240, 0.36],
    title_words: "pray",
    why: "Wide again, so the last thing before the hit is the whole phone standing in its light. A campaign's own page builds on 32.16, and its Pray button lands last, on 33.81, and is held for the hit. The brief asked for the count of those praying to land last; the app shows no count on this page for a new campaign, so nothing is drawn in its place. Sample campaigns from the walks' own stand-in. Posted only once campaigns are open to every reader.",
  },
  {
    name: "The end card",
    at: [34.48, 35.2],
    on: [34.48],
    music: "the one big hit",
    still: 34.9,
    pool: NO_POOL,
    mark: [700, 250, 0.96],
    title: { lines: TITLES.end.lines, sub: null, y: 960, size: 124 },
    why: "A cut to dark exactly on the loudest moment, then Purify's mark and the drop's first sentence, full size and still. Nothing moves on the hit: the stillness is the point. No glow behind the mark, as on the last film. The mark is kept for this card alone.",
  },
];
export const SECONDS = 35.2;
const SIDE_MOST = { ry: 25, rx: 7, rz: 1.2 };
for (const f of ROWS) {
  if (f.at[1] <= f.at[0] || f.still < f.at[0] || f.still > f.at[1]) fail(`"${f.name}": its still is outside its row`);
  if (f.title_words && !TITLES[f.title_words]) fail(`"${f.name}": no such words`);
  const p = f.phone;
  if (!p) continue;
  if (Math.abs(p.ry) > SIDE_MOST.ry || Math.abs(p.rx) > SIDE_MOST.rx || Math.abs(p.rz) > SIDE_MOST.rz) fail(`"${f.name}": the phone turns more than the store pictures' side stand`);
}

// ── The work ─────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i < 0 ? null : args[i + 1] ?? true;
  };
  const HOME = dir("release", "forever-board");
  for (const f of ROWS) if (f.phone && f.phone.k > takeOf(f.screen[0]).sharp + 1e-9) fail(`"${f.name}": nearer than its take was filmed`);
  const browser = await launch();
  const stage = await openStage(browser);
  const wear = async (f) => {
    await stage.wear({ ...f, src: f.screen ? picture(f.screen) : null });
    // The small line under the verse is small: the stage's own small line is a title's size.
    await stage.page.evaluate((px) => {
      const sub = document.querySelector("[data-sub]");
      sub.style.fontSize = px ? `${px}px` : "";
      sub.style.fontWeight = px ? "500" : "";
      sub.style.letterSpacing = px ? "0" : "";
    }, f.small ?? null);
  };
  const only = flag("only") ? [Number(flag("only"))] : ROWS.map((_, i) => i + 1);
  if (flag("check")) {
    const results = [];
    for (const n of only) {
      const f = ROWS[n - 1];
      await wear(f);
      const result = await checkMock(stage.page, "[data-stage]");
      const failures = [...new Set(result.failures.map((x) => `${x.check}${x.palette ? ` (${x.palette})` : ""}: ${x.what}: ${x.detail}`))];
      results.push({ still: n, name: f.name, pass: failures.length === 0, failures, allowed: result.allowed, notMeasured: result.unmeasured?.length ?? 0 });
      console.log(`${failures.length ? "NO  " : "ok  "} ${n} ${f.name}${failures.length ? `\n      ${failures.slice(0, 12).join("\n      ")}` : ""}`);
    }
    fs.writeFileSync(path.join(HOME, "check.json"), JSON.stringify(results, null, 1));
    process.exitCode = results.some((x) => !x.pass) ? 1 : 0;
  } else {
    const small = [];
    for (const n of only) {
      await wear(ROWS[n - 1]);
      const png = await stage.shoot();
      fs.writeFileSync(path.join(HOME, `still-${n}.png`), png);
      await sharp(png).resize(720).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(HOME, `still-${n}.jpg`));
      small.push(await sharp(png).resize(270).toBuffer());
    }
    const cols = Math.min(small.length, 6);
    const file = path.join(HOME, "sheet.jpg");
    await sharp({ create: { width: cols * 276, height: Math.ceil(small.length / cols) * 486, channels: 3, background: "#666" } })
      .composite(small.map((input, i) => ({ input, left: (i % cols) * 276 + 3, top: Math.floor(i / cols) * 486 + 3 })))
      .jpeg({ quality: 80 })
      .toFile(file);
    console.log(file);
  }
  await browser.close();
}
