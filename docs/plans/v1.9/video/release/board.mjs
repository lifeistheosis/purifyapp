#!/usr/bin/env node
// The 1.9 release film: the stage, and its storyboard.
//
// His word on the ad's fourth render (2026-11-20, about 22:26 UTC): "it doesn't
// feel like a major release type of video it feels like a general video that is
// to showcase the app. it needs to be cinematic." TREATMENT.md is the answer in
// words; this is the stage that answer is filmed on, and the stills of its key
// moments, for his yes before anything is rendered.
//
//   node docs/plans/v1.9/video/release/board.mjs            every frame of the storyboard, full size, and the sheet
//   node docs/plans/v1.9/video/release/board.mjs --only 3   one frame
//   node docs/plans/v1.9/video/release/board.mjs --check    checkMock on every frame
//
// What is the app's is untouched: the screen on the phone is a frame of the
// ad's own takes (../ad/take.mjs: the native export of main 6700c2e65, each
// piece the app's own element, word for word after the build as before). What
// is the film's is everything round the screen: the phone as the store
// pictures' plain slab, the dark, one soft pool of light, the ground and what
// it gives back, the camera, the type. No word is written here: every word is
// the first cut's (../scenes.mjs), read from the drop, the store pictures'
// lines and the app's labels.
//
// Light is a soft pool or nothing: no rays, no beams. Nothing here is a fixed
// colour: every tone is mixed from the palette's own night and paper.

import fs from "node:fs";
import path from "node:path";
import { MADE, ORIGIN, OUT, PHONE, checkMock, dir, launch, serveLikeTheShell, sharp, wait } from "../lib.mjs";
import { DROP, SCENES as FIRST_CUT } from "../scenes.mjs";

const [W, H] = [1080, 1920];
const fail = (text) => {
  throw new Error(text);
};

// ── The words ────────────────────────────────────────────────────────────

const wordsOf = (id) => {
  const w = FIRST_CUT.find((x) => x.id === id) ?? fail(`the first cut has no scene "${id}"`);
  if (w.lines.join(" ") !== w.title) fail(`${id}: the lines do not join into the title`);
  if (/[–—]/.test(`${w.title} ${w.sub ?? ""}`)) fail(`${id}: a dash in place of words`);
  return { lines: w.lines, sub: w.sub ?? null, from: w.from };
};
const OPEN = wordsOf("open"); // "Purify 1.9 is here.", the first sentence of the drop's caption
const TODAY = wordsOf("today");
const JOURNAL = wordsOf("journal");
const RELEASE = String(DROP.release); // "1.9"

// ── The takes ────────────────────────────────────────────────────────────

const TAKE_DIR = { today: "ad-today", journal: "ad-journal", verse: "verse", bibles: "bibles" };
const TAKES = {};
export const takeOf = (id) => {
  if (TAKES[id]) return TAKES[id];
  const file = path.join(MADE, "takes", TAKE_DIR[id] ?? fail(`no take is named "${id}"`), "take.json");
  if (!fs.existsSync(file)) fail(`no take "${TAKE_DIR[id]}": film it first (TREATMENT.md)`);
  const t = JSON.parse(fs.readFileSync(file, "utf8"));
  if (t.problems.length) fail(`the take "${TAKE_DIR[id]}" has problems: ${t.problems.join("; ")}`);
  return (TAKES[id] = t);
};
/** The picture of a take at a moment: [take, mark, seconds after it]. */
export function picture([id, mark, after]) {
  const t = takeOf(id);
  const at = (t.marks.find((m) => m.name === mark) ?? fail(`the take "${id}" has no mark "${mark}"`)).t + after;
  const f = t.frames;
  let lo = 0;
  let hi = f.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (f[mid].t <= at) lo = mid;
    else hi = mid - 1;
  }
  return `/__video/takes/${TAKE_DIR[id]}/${f[lo].file}`;
}

// ── The storyboard ───────────────────────────────────────────────────────
//
// A frame:
//   at       where it falls in the test film, in seconds, and how long the shot is held
//   screen   the take's moment on the phone: [take, mark, seconds after it]
//   phone    where the phone stands: (x, y) its middle on the film, k the film's pixels to one of the app's,
//            ry, rx, rz its turn in degrees (never more than the store pictures' side stand: 25, 7, 1.2)
//            dark   how much of the glass is still in shadow (0 lit, 1 not yet out of the dark), and from which side
//            soft   the end of the glass that falls out of focus ("far" is the edge turned away), and how much
//            sheen  where the pool of light lies on the glass, [x, y] in parts of the screen
//            blur   the whole phone out of focus, in pixels (behind a title card)
//   floor    the y of the ground the phone stands on; what the ground gives back is drawn under it
//   pool     the one pool of light: [x, y, width, height, strength]
//   mark     Purify's mark: [y of its middle, height, opacity]
//   big      the release's number, full frame
//   title    a title card: the lines, the small line, the y of its first line, its size
//   why      the reason, for the page

export const FRAMES = [
  {
    name: "Out of the dark",
    at: [0, 1.5],
    pool: [540, 900, 760, 620, 0.17],
    mark: [900, 330, 0.96],
    why: "A launch film opens by announcing, not by showing. Black, then Purify's own mark comes up out of the dark in one soft pool of light, and is held. Nothing of the app yet: the wait is what tells the eye that something is arriving.",
  },
  {
    name: "The release, by its number",
    at: [1.5, 1.1],
    pool: [540, 980, 900, 520, 0.1],
    mark: [468, 120, 0.9],
    big: RELEASE,
    why: "The number fills the frame, the way a studio sets a title. It is the release's own number from the drop, in the app's sans at its heaviest. The mark has moved up and grown small above it: the same mark, so the cut reads as one thought.",
  },
  {
    name: "The phone comes out of the dark",
    at: [2.6, 1.6],
    screen: ["today", "go", 2.5],
    phone: { x: 580, y: 1080, k: 1.02, ry: -24, rx: 6, rz: 1, dark: [0.6, "far"], sheen: [0.72, 0.3] },
    floor: 1530,
    pool: [640, 1540, 900, 230, 0.34],
    why: "The first sight of the app is small in a wide, dark frame: the phone standing on a dark ground that gives its light back, half of its glass still in shadow, the light reaching it from one side. The camera moves in slowly. This is the big scale change the last version never made, and it makes the phone an object that has arrived, not a picture of a screen.",
  },
  {
    name: "The first chapter's card",
    at: [4.2, 0.7],
    screen: ["today", "go", 2.5],
    phone: { x: 560, y: 1080, k: 1.5, ry: -24, rx: 6, rz: 1, dark: [0.55, "far"], blur: 26, dim: 0.62 },
    floor: 1760,
    pool: [600, 1300, 900, 500, 0.1],
    title: { ...TODAY, y: 760, size: 104 },
    why: "The words are an event of their own, not a caption sitting over the phone. The store picture's line for Today fills the frame for less than a second while the phone goes on moving, out of focus, behind it. Large, few words, the app's sans.",
  },
  {
    name: "Close: the day's saint",
    at: [4.9, 1.5],
    screen: ["today", "go", 1.32],
    phone: { x: 575, y: 960, k: 2.5, ry: 22, rx: 7, rz: -1.2, soft: ["top", 0.42], sheen: [0.35, 0.55], dark: [0.34, "top"] },
    pool: [300, 700, 900, 700, 0.12],
    why: "Then the frame is filled. St Nicholas and Begin arrive by the app's own pieces, seen close on a phone turned to the light, sharp where the eye should be and falling soft toward the far end, as a lens does. Two or three quick cuts live here: this is where the film quickens.",
  },
  {
    name: "The second chapter's card",
    at: [6.4, 0.7],
    screen: ["journal", "go", 2.4],
    phone: { x: 540, y: 1120, k: 1.5, ry: -25, rx: 7, rz: 1.2, dark: [0.5, "far"], blur: 26, dim: 0.62 },
    floor: 1790,
    pool: [520, 1300, 900, 500, 0.1],
    title: { lines: JOURNAL.lines, sub: null, y: 760, size: 104 },
    why: "The drop's own name for the journal, full frame, on the same beat as the first card so the film has a pulse. The journal is the head of the 1.9 note, so it is the chapter the film builds to.",
  },
  {
    name: "Close: a pen for each reading",
    at: [7.1, 1.5],
    screen: ["journal", "go", 1.5],
    phone: { x: 640, y: 780, k: 2.5, ry: -25, rx: 7, rz: 1.2, soft: ["top", 0.5], sheen: [0.6, 0.52], dark: [0.4, "top"] },
    pool: [700, 1200, 900, 700, 0.12],
    why: "The point of the journal, seen large: the day's Epistle and Gospel, each with a pen to begin a page. The pool of light lies across the glass here and travels as the camera does. The phone has turned the other way from the last close shot, so the two cuts answer each other.",
  },
  {
    name: "The journal, whole, and the promise",
    at: [8.6, 1.3],
    screen: ["journal", "go", 2.4],
    phone: { x: 600, y: 1130, k: 1.2, ry: -25, rx: 7, rz: 1.2, dark: [0.3, "far"], sheen: [0.7, 0.28] },
    floor: 1660,
    pool: [650, 1672, 940, 240, 0.36],
    title: { lines: [], sub: JOURNAL.sub, y: 300, size: 104 },
    why: "The peak, then the breath: back to the whole phone standing in the dark with its light on the ground, and the three words that matter most in this release, from the drop's own point. It is held, and the film goes still.",
  },
  {
    name: "The end card",
    at: [9.9, 1.8],
    pool: [540, 860, 820, 620, 0.17],
    mark: [690, 250, 0.96],
    title: { lines: OPEN.lines, sub: null, y: 960, size: 124 },
    why: "It lands the way it opened: the mark in its pool of light, and under it the first sentence of the drop's caption. The film ends where it began, so the viewer is left with the mark and the number and nothing else.",
  },
];
export const SECONDS = FRAMES.at(-1).at[0] + FRAMES.at(-1).at[1];
const SIDE_MOST = { ry: 25, rx: 7, rz: 1.2 };
for (const f of FRAMES) {
  const p = f.phone;
  if (!p) continue;
  if (Math.abs(p.ry) > SIDE_MOST.ry || Math.abs(p.rx) > SIDE_MOST.rx || Math.abs(p.rz) > SIDE_MOST.rz) fail(`"${f.name}": the phone turns more than the store pictures' side stand`);
  if (p.k > takeOf(f.screen[0]).sharp + 1e-9) fail(`"${f.name}": nearer than the takes were filmed`);
}

// ── The page ─────────────────────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
if (!SHEETS.length) fail("the front door names no stylesheet");

const r = Math.round;
const ink = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, transparent)`;
const dark = (pct) => `color-mix(in srgb, var(--color-night-deep) ${pct}%, transparent)`;
const plane = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, var(--color-night-deep))`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// The phone (his word, 2026-11-20: "Upgrade the phone design."): no longer the store pictures' plain slab. A band of
// brushed metal round a sheet of glass: the band is lit along its front shoulder and again faintly at its back, the
// glass sits in a fine bright lip, the corners are rounder, and the band carries its three buttons. Nothing is drawn
// on the glass itself: the screen is the app's and stays whole.
const RIM = 6;
const ROUND = 36;
const [BW, BH] = [PHONE.width + 2 * RIM, PHONE.height + 2 * RIM];
const DEEP = r(BW * 0.105);
const LEAVES = (() => {
  const out = [];
  for (let k = DEEP; k >= 1; k--) {
    const u = k / DEEP;
    const bell = (at, wide) => Math.exp(-(((u - at) / wide) ** 2));
    const tone = k <= 1 ? 52 : 8 + 30 * bell(0.2, 0.11) + 12 * bell(0.86, 0.07);
    out.push(`<div data-leaf style="transform:translateZ(${-k}px);background-color:${plane(tone.toFixed(1))}"></div>`);
  }
  return out.join("");
})();
// The buttons stand out of the band by a few pixels, half way through its depth: one on the end side, two on the start side.
const BUTTONS = [["end", 236, 92], ["start", 196, 58], ["start", 270, 58]]
  .map(([side, top, tall]) => {
    const out = [];
    for (let z = Math.round(DEEP * 0.32); z <= Math.round(DEEP * 0.68); z += 2) out.push(`<div data-button data-mock-allow="stripe" data-mock-why="a button on the side of the phone, which is a thing in the picture and not a part of any interface" style="${side === "end" ? "right" : "left"}:-3px;top:${top}px;height:${tall}px;transform:translateZ(${-z}px)"></div>`);
    return out.join("");
  })
  .join("");
const phoneBody = `<div data-phone>${LEAVES}${BUTTONS}<figure data-screen><img data-sharp alt="" src=""><img data-soft alt="" src=""><span data-shade></span><span data-sheen></span></figure></div>`;

function stagePage() {
  return `<!doctype html>
<html lang="en" dir="ltr" class="${HTML_CLASS}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, initial-scale=1">
${SHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night-deep); }
  html { scrollbar-gutter: auto; }
  [data-stage] { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night-deep); color: var(--color-paper); }
  /* In a right-to-left page the whole picture under the words turns over as one: the light, the ground, the phone. */
  [data-flip] { position: absolute; inset: 0; }
  :root[dir="rtl"] [data-flip] { transform: scaleX(-1); }
  /* The one pool of light. A pool, never beams. */
  [data-cover] { position: absolute; inset: 0; z-index: 8; pointer-events: none; }
  [data-black] { position: absolute; inset: 0; z-index: 9; background-color: var(--color-night-deep); pointer-events: none; }
  [data-pool], [data-ground], [data-vignette], [data-dim] { position: absolute; inset: 0; pointer-events: none; }
  /* The eye stands nearer than the store pictures' does, so a turned phone has depth: its near edge is larger than its far. */
  [data-space] { position: absolute; inset: 0; perspective: ${r(W * 2.1)}px; perspective-origin: ${W / 2}px ${r(H * 0.46)}px; direction: ltr; }
  [data-phone] { position: absolute; top: ${-BH / 2}px; left: ${-BW / 2}px; width: ${BW}px; height: ${BH}px; transform-style: preserve-3d; transform-origin: 50% 50%; }
  [data-leaf] { position: absolute; inset: 0; border-radius: ${ROUND + RIM}px; }
  [data-screen] { position: absolute; inset: 0; box-sizing: border-box; margin: 0; border-radius: ${ROUND + RIM}px; background-color: var(--color-night-deep); box-shadow: 0 0 0 1.5px ${plane(46)}, inset 0 0 0 1px ${ink(9)}, inset 0 0 0 ${RIM}px var(--color-night-deep); overflow: hidden; }
  [data-button] { position: absolute; width: 7px; border-radius: 3.5px; background-color: ${plane(30)}; }
  [data-screen] img { position: absolute; top: ${RIM}px; left: ${RIM}px; display: block; width: ${PHONE.width}px; height: ${PHONE.height}px; border-radius: ${ROUND}px; }
  [data-shade], [data-sheen] { position: absolute; inset: 0; border-radius: ${ROUND + RIM}px; }
  /* What the ground gives back: the same phone, turned over about the ground it stands on, soft and fading. */
  [data-back-box] { position: absolute; inset: 0; }
  [data-given] { position: absolute; inset: 0; filter: blur(7px); opacity: 0.6; }
  [data-given] [data-space] { transform-origin: 0 0; }
  [data-mark] { position: absolute; left: 0; width: ${W}px; background-color: var(--color-paper); -webkit-mask: url(/purify-cross-mark.png) center / contain no-repeat; mask: url(/purify-cross-mark.png) center / contain no-repeat; }
  [data-words] { position: absolute; inset: 0; text-align: center; }
  /* The release's number, as a studio sets a title: the app's sans at its heaviest, the width of the frame. */
  [data-big] { position: absolute; top: 560px; inset-inline: 0; margin: 0; font-family: var(--font-sans); font-weight: 700; font-size: 560px; line-height: 1; letter-spacing: -0.055em; font-variant-numeric: lining-nums; color: var(--color-paper); }
  /* The title is the app's sans (his word, 2026-11-20: the display serif is not to come back for titles). */
  [data-title] { position: absolute; inset-inline: 0; box-sizing: border-box; margin: 0; padding: 0 72px; font-family: var(--font-sans); font-weight: 600; line-height: 1.06; letter-spacing: -0.03em; color: var(--color-paper); }
  [data-title] span { display: block; }
  [data-sub] { position: absolute; inset-inline: 0; margin: 0; font-family: var(--font-sans); font-weight: 600; font-size: 84px; line-height: 1.1; letter-spacing: -0.028em; color: var(--color-paper); }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main data-stage>
  <div data-flip>
    <div data-ground aria-hidden="true"></div>
    <div data-pool aria-hidden="true"></div>
    <div data-back-box aria-hidden="true"><div data-given><div data-space>${phoneBody}</div></div></div>
    <div data-film><div data-space>${phoneBody}</div></div>
    <div data-dim aria-hidden="true"></div>
    <div data-vignette aria-hidden="true"></div>
  </div>
  <span data-mark aria-hidden="true" hidden></span>
  <div data-cover aria-hidden="true"></div>
  <div data-black aria-hidden="true"></div>
  <div data-words><p data-big hidden></p><h1 data-title hidden></h1><p data-sub hidden></p></div>
</main>
<script>
  const ink = (pct) => "color-mix(in srgb, var(--color-paper) " + pct + "%, transparent)";
  const dark = (pct) => "color-mix(in srgb, var(--color-night-deep) " + pct + "%, transparent)";
  // Wear one frame of the storyboard. Resolves when the pictures it needs are drawn.
  window.__wear = async (f) => {
    const waits = [];
    const one = (q) => document.querySelector(q);
    const [px, py, pw, ph, ps] = f.pool;
    one("[data-pool]").style.backgroundImage = "radial-gradient(ellipse " + pw + "px " + ph + "px at " + px + "px " + py + "px, " + ink((ps * 100).toFixed(1)) + ", " + ink((ps * 38).toFixed(1)) + " 38%, transparent 74%)";
    // The ground: nothing above it, and under the phone a floor that is a little less dark where the pool lies on it.
    one("[data-ground]").style.backgroundImage = f.floor ? (f.phone ? "radial-gradient(ellipse " + Math.round(250 * f.phone.k) + "px 22px at " + f.phone.x + "px " + (f.floor + 4) + "px, " + dark(92) + ", transparent 100%), " : "") + "linear-gradient(to bottom, transparent " + (f.floor - 40) + "px, " + ink(3.2) + " " + (f.floor + 6) + "px, " + ink(1.2) + " " + (f.floor + 220) + "px, transparent " + (f.floor + 420) + "px)" : "none";
    one("[data-vignette]").style.backgroundImage = "radial-gradient(ellipse 86% 74% at 50% 50%, transparent 52%, " + dark(78) + " 100%)";
    one("[data-dim]").style.backgroundColor = f.phone && f.phone.dim ? dark(f.phone.dim * 100) : "transparent";
    one("[data-black]").style.opacity = f.black ?? 0;
    // The uncovering: a soft-edged dark that lies over the whole picture and draws off it. [how far off (0 covered, 1 gone), the way it goes].
    const off = f.cover ? f.cover[0] : 1;
    // Its edge is "band" parts in a hundred of the picture deep: the deeper, the softer and slower it reads.
    const band = f.cover ? f.cover[2] ?? 22 : 22;
    const edge = -2 + (104 + band) * off;
    one("[data-cover]").style.backgroundImage = off >= 1 ? "none" : "linear-gradient(" + f.cover[1] + "deg, transparent " + (edge - band).toFixed(2) + "%, " + dark(42) + " " + (edge - band * 0.62).toFixed(2) + "%, " + dark(84) + " " + (edge - band * 0.3).toFixed(2) + "%, var(--color-night-deep) " + edge.toFixed(2) + "%)";
    const p = f.phone;
    document.querySelector("[data-film]").hidden = !p;
    document.querySelector("[data-back-box]").hidden = !p || !f.floor;
    if (p) {
      const pose = "translate3d(" + p.x + "px," + p.y + "px,0) rotateY(" + p.ry + "deg) rotateX(" + p.rx + "deg) rotateZ(" + p.rz + "deg) scale(" + p.k + ")";
      document.querySelectorAll("[data-phone]").forEach((el) => (el.style.transform = pose));
      document.querySelector("[data-film]").style.filter = p.blur ? "blur(" + p.blur + "px)" : "none";
      // The far edge is the one turned away from the eye.
      const far = p.ry < 0 ? "left" : "right";
      const side = { far: "to " + (far === "left" ? "right" : "left"), near: "to " + far, top: "to bottom", bottom: "to top" };
      document.querySelectorAll("[data-shade]").forEach((el) => {
        el.style.backgroundImage = p.dark ? "linear-gradient(" + side[p.dark[1]] + ", " + dark(Math.min(96, p.dark[0] * 100 + 14)) + " 0%, " + dark(p.dark[0] * 100) + " " + (p.dark[0] * 46).toFixed(0) + "%, transparent " + (36 + p.dark[0] * 60).toFixed(0) + "%)" : "none";
      });
      document.querySelectorAll("[data-sheen]").forEach((el) => {
        el.style.backgroundImage = p.sheen ? "radial-gradient(ellipse 78% 46% at " + p.sheen[0] * 100 + "% " + p.sheen[1] * 100 + "%, " + ink(7.5) + ", " + ink(2.6) + " 46%, transparent 78%)" : "none";
      });
      document.querySelectorAll("[data-soft]").forEach((img) => {
        img.hidden = !p.soft;
        if (!p.soft) return;
        img.style.filter = "blur(" + (p.soft[2] ?? 5) + "px)";
        const m = "linear-gradient(" + side[p.soft[0]] + ", black 0%, black " + (p.soft[1] * 34).toFixed(0) + "%, transparent " + (p.soft[1] * 100).toFixed(0) + "%)";
        img.style.maskImage = m;
        img.style.webkitMaskImage = m;
      });
      document.querySelectorAll("[data-sharp], [data-soft]").forEach((img) => {
        if (img.dataset.src === f.src) return;
        img.dataset.src = f.src;
        img.src = f.src;
        waits.push(img.decode().catch(() => {}));
      });
      if (f.floor) {
        // Turned over about the ground: y becomes 2 x floor - y. It fades as it goes down, away from the phone's foot.
        one("[data-given] [data-space]").style.transform = "translateY(" + 2 * f.floor + "px) scaleY(-1)";
        const m = "linear-gradient(to bottom, transparent " + (f.floor - 4) + "px, black " + f.floor + "px, transparent " + (f.floor + 330) + "px)";
        one("[data-back-box]").style.maskImage = m;
        one("[data-back-box]").style.webkitMaskImage = m;
      }
    }
    const mark = one("[data-mark]");
    mark.hidden = !f.mark;
    if (f.mark) {
      mark.style.top = f.mark[0] - f.mark[1] / 2 + "px";
      mark.style.height = f.mark[1] + "px";
      mark.style.opacity = f.mark[2];
      mark.style.transform = "scale(" + (f.mark[3] ?? 1) + ")";
    }
    const big = one("[data-big]");
    big.hidden = !f.big;
    if (f.big) {
      big.textContent = f.big;
      big.style.opacity = f.bigIn ?? 1;
      big.style.transform = "scale(" + (f.bigScale ?? 1) + ")";
      // The number's reveal: it stands first as a fine clean outline, and light fills the figures from the foot up, inside
      // their own edges. Nothing is laid over the picture, so there is no shadow or haze round them at any moment.
      const filling = f.bigFill != null;
      const level = filling ? (f.bigFill >= 1 ? 130 : 16 + 76 * f.bigFill) : 0; // the figures stand between about 20 and 86 parts in a hundred of their box
      big.style.webkitTextStroke = filling ? "2.5px " + ink(92) : "";
      big.style.color = filling ? "transparent" : "";
      big.style.backgroundImage = filling ? "linear-gradient(7deg, var(--color-paper) " + (level - 5).toFixed(2) + "%, transparent " + level.toFixed(2) + "%)" : "none";
      big.style.webkitBackgroundClip = filling ? "text" : "";
      big.style.backgroundClip = filling ? "text" : "";
    }
    const title = one("[data-title]");
    const sub = one("[data-sub]");
    title.hidden = !(f.title && f.title.lines.length);
    sub.hidden = !(f.title && f.title.sub);
    if (f.title) {
      title.replaceChildren(...f.title.lines.map((line, n) => {
        const u = f.title.in ? f.title.in[n] ?? 1 : 1;
        const span = Object.assign(document.createElement("span"), { textContent: line });
        span.style.opacity = Math.min(1, u * 1.5);
        span.style.transform = "translateY(" + (1 - u) * 46 + "px)";
        return span;
      }));
      title.style.top = f.title.y + "px";
      title.style.fontSize = f.title.size + "px";
      sub.textContent = f.title.sub ?? "";
      sub.style.opacity = f.title.subIn ?? 1;
      sub.style.top = f.title.y + (f.title.lines.length ? f.title.lines.length * f.title.size * 1.06 + 40 : 0) + "px";
    }
    await Promise.all(waits);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
</script>
</body>
</html>`;
}

export async function openStage(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US" });
  await serveLikeTheShell(ctx, OUT, {});
  const html = stagePage();
  await ctx.route(`${ORIGIN}/__video/**`, (route) => {
    const name = decodeURIComponent(new URL(route.request().url()).pathname.replace("/__video/", ""));
    if (name === "stage.html") return route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
    const file = path.join(MADE, name);
    if (name.startsWith("takes/") && !name.includes("..") && fs.existsSync(file)) return route.fulfill({ contentType: /\.png$/.test(file) ? "image/png" : "image/jpeg", path: file });
    return route.fulfill({ status: 404, body: "not found" });
  });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/__video/stage.html`, { waitUntil: "load" });
  const wear = (f) => page.evaluate((s) => window.__wear(s), { ...f, src: f.src ?? (f.screen ? picture(f.screen) : null) });
  // The faces are asked for by a frame that wears them, then checked: the type is the app's sans, loaded.
  await wear(FRAMES.find((f) => f.big));
  await wear(FRAMES.find((f) => f.title?.lines.length));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
  });
  await wait(400);
  const face = await page.evaluate(() => {
    const first = getComputedStyle(document.querySelector("[data-title]")).fontFamily.split(",")[0].trim();
    return { first, loaded: document.fonts.check(`600 100px ${first}`) && document.fonts.check(`700 100px ${first}`) };
  });
  if (!/DM Sans/.test(face.first) || !face.loaded) fail(`the type is not the app's sans, loaded (${JSON.stringify(face)})`);
  const cdp = await ctx.newCDPSession(page);
  const shoot = async (type = "png") => Buffer.from((await cdp.send("Page.captureScreenshot", type === "png" ? { format: "png" } : { format: "jpeg", quality: 97 })).data, "base64");
  return { page, wear, shoot };
}

// ── The work ─────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i < 0 ? null : args[i + 1] ?? true;
  };
  const HOME = dir("release", "board");
  const browser = await launch();
  const stage = await openStage(browser);
  const only = flag("only") ? [Number(flag("only"))] : FRAMES.map((_, i) => i + 1);
  if (flag("check")) {
    const results = [];
    for (const n of only) {
      const f = FRAMES[n - 1];
      await stage.wear(f);
      const result = await checkMock(stage.page, "[data-stage]");
      const failures = [...new Set(result.failures.map((x) => `${x.check}${x.palette ? ` (${x.palette})` : ""}: ${x.what}: ${x.detail}`))];
      results.push({ frame: n, name: f.name, pass: failures.length === 0, failures, allowed: result.allowed, notMeasured: result.unmeasured?.length ?? 0 });
      console.log(`${failures.length ? "NO  " : "ok  "} ${n} ${f.name}${failures.length ? `\n      ${failures.slice(0, 12).join("\n      ")}` : ""}`);
    }
    fs.writeFileSync(path.join(HOME, "check.json"), JSON.stringify(results, null, 1));
    process.exitCode = results.some((x) => !x.pass) ? 1 : 0;
  } else {
    const small = [];
    for (const n of only) {
      await stage.wear(FRAMES[n - 1]);
      const png = await stage.shoot();
      fs.writeFileSync(path.join(HOME, `frame-${n}.png`), png);
      // The page's copy: half size, which is the width a phone shows it at twice over.
      await sharp(png).resize(720).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(HOME, `frame-${n}.jpg`));
      small.push(await sharp(png).resize(270).toBuffer());
    }
    const cols = Math.min(small.length, 5);
    const file = path.join(HOME, "sheet.jpg");
    await sharp({ create: { width: cols * 276, height: Math.ceil(small.length / cols) * 486, channels: 3, background: "#666" } })
      .composite(small.map((input, i) => ({ input, left: (i % cols) * 276 + 3, top: Math.floor(i / cols) * 486 + 3 })))
      .jpeg({ quality: 80 })
      .toFile(file);
    console.log(file);
  }
  await browser.close();
}
