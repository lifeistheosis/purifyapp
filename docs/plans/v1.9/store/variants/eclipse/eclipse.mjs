#!/usr/bin/env node
// Eclipse and stars: the eight screens, each with a design of its own, on the
// foundation the owner chose (his word to the store pictures chat,
// 2026-11-12, of the third round's Nimbus: "go all in on the eclipse starts
// but make every design different and uniqu").
//
//   node docs/plans/v1.9/store/variants/eclipse/eclipse.mjs            all eight
//   node docs/plans/v1.9/store/variants/eclipse/eclipse.mjs journal    one
//
// Settled by his word before this: black and white, the phone in 3D, and a
// piece of the real screen lifted off the glass. His word on the first eight
// ("I need each section to be entirely different though") made each picture
// a composition of its own: the phone's pose and size, where the line
// stands, the idea in the night sky and how the piece is lifted all change.
//   01 today     Totality       phone turned left; one great disc behind it
//   02 greek     Crescent       phone face-on and large, off the foot; a
//                               crescent over its shoulder; the line at the side
//   03 fathers   Orbits         phone turned right; rings round a small disc
//   04 journal   Moonrise       phone lying on the floor; the moon half risen
//   05 prayers   Northern Cross phone small, up and to one side; the stars of
//                               the Northern Cross joined; the line at the foot
//   06 saint     Limb           phone close and large; a great disc fills the
//                               head of the picture, the line upon it
//   07 calendar  Phases         phone face-on and small; the moon's phases in
//                               an arc over it
//   08 reading   Ring           phone turned right and high; the book's cover
//                               drawn out large inside a ring; the line at the foot
// Each screen is the app's own, taken as ../../make.mjs takes it; each lifted
// piece is cut from that same picture of the screen, so nothing of the
// interface is drawn. Every colour is the palette's paper over its night; the
// accent is the house's --color-gold, a near-white grey. Nothing fans out
// from a point: a disc has a rim and no beams. Stars are plain round dots.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../../../..");
const OUT = path.join(ROOT, "out");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { checkMock, CHECKS } = await import(at("scripts/mock-check.mjs"));
const { NATIVE_UA, ORIGIN, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { heritageNamedIn } = await import(at("lib/marketing/heritagePictures.ts"));

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first (see ../../make.mjs)");

const DAY = "2026-12-06T09:30:00-05:00";
const ZONE = "America/New_York";
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const r = Math.round;

// ── The size: Play phone ─────────────────────────────────────────────────

const W = 1080;
const H = 1920;
const VIEW = [412, 846];
const CAP = r(H * 0.165);
const SW = r(W * 0.62); // the screen
const SH = Math.floor((SW * VIEW[1]) / VIEW[0]);
const RIM = r(SW * 0.022); // the body round the screen
const BW = SW + 2 * RIM;
const BH = SH + 2 * RIM;
const RADIUS = r(SW * 0.075);
const DEEP = r(BW * 0.105); // how thick the body is, about a phone's own proportion
const STEP = 1.5;
const EDGE = 2;
const K = SW / VIEW[0]; // picture pixels to one of the app's

// ── The eight screens ────────────────────────────────────────────────────

/** Tap the middle of what a selector finds, as a finger does. */
async function tap(page, selector) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 20000 });
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

/** Climb from an element to the first ancestor a test accepts. */
const CLIMB = `const climb = (e, ok) => { while (e && !ok(e)) e = e.parentElement; return e; };`;

/**
 * `lift` runs in the page and returns the piece of the screen to lift; `pad`
 * is the room kept round it, in the app's pixels.
 */
const SHOTS = [
  {
    n: "01",
    id: "today",
    design: "Totality",
    idea: "The phone turned to one side before one great disc with a bright rim.",
    caption: "The day's saint, fast and readings",
    alt: "Today: St Nicholas the Wonderworker, the Nativity Fast with fish allowed, and the day's verse.",
    route: "/",
    lifted: "the Nativity star card",
    async prepare(page) {
      const dismiss = page.locator('button[aria-label="Dismiss"]').first();
      await dismiss.waitFor({ state: "visible", timeout: 20000 });
      for (let tries = 0; tries < 4 && (await dismiss.isVisible()); tries++) {
        await wait(500);
        await tap(page, 'button[aria-label="Dismiss"]');
        await dismiss.waitFor({ state: "hidden", timeout: 2500 }).catch(() => {});
      }
      if (await dismiss.isVisible()) throw new Error("Today: the one-question card is still there");
      await page.evaluate(() => window.scrollTo(0, 0));
    },
    lift: `document.querySelector("[data-nativity-star]")`,
    pad: 0,
    layout: { cap: "top", align: "center", s: 1, cx: 0.486, cy: 0.553, turn: "rotateY(-25deg) rotateX(7deg) rotateZ(1.2deg)", lift: { dx: -0.13, dy: -0.02, dz: 0.15, k: 1 } },
  },
  {
    n: "02",
    id: "greek",
    design: "Crescent",
    idea: "The phone face-on and large, running off the foot, a crescent moon over its shoulder, the line set to the side.",
    caption: "The Greek beside the verse",
    alt: "The Gospel of John, chapter 1, in English with the Greek beside each verse.",
    route: "/bible/john/1",
    lifted: "the first verse, English and Greek",
    seed: { "purify:interlinear": "1" },
    async prepare(page) {
      await page.waitForSelector('button[aria-label^="Look up"]', { timeout: 30000 });
    },
    lift: `climb(document.querySelector('button[aria-label="Open commentary on verse 1"]'), (e) => e.querySelector('button[aria-label^="Look up"]'))`,
    pad: 10,
    layout: { cap: "top", align: "start", s: 1.17, cx: 0.5, cy: 0.71, turn: "rotateY(7deg) rotateX(3deg)", lift: { dx: 0.035, dy: -0.012, dz: 0.1, k: 1.07 } },
  },
  {
    n: "03",
    id: "fathers",
    design: "Orbits",
    idea: "The phone turned the other way, and rings round a small bright disc crossing the whole sky.",
    caption: "The Fathers on the verse you are reading",
    alt: "Patristic commentary on Genesis 1:1: St Basil the Great, Hexaemeron, Homily 1.",
    route: "/bible/genesis/1",
    lifted: "the Father's name and his work",
    seed: { "purify:interlinear": "1" },
    async prepare(page) {
      await tap(page, 'button[aria-label="Open commentary on verse 1"]');
      await page.getByText("It is right that any one beginning").first().waitFor({ state: "visible", timeout: 30000 });
    },
    lift: `climb(document.querySelector('[role="dialog"] img'), (e) => e.getBoundingClientRect().width > 220)`,
    pad: 10,
    layout: { cap: "top", align: "center", s: 1, cx: 0.52, cy: 0.553, turn: "rotateY(25deg) rotateX(7deg) rotateZ(-1.2deg)", lift: { dx: 0.15, dy: -0.02, dz: 0.15, k: 1 } },
  },
  {
    n: "04",
    id: "journal",
    design: "Moonrise",
    idea: "The phone lying on the floor, the day's page standing up off it, and the moon half risen at the horizon.",
    caption: "A journal kept by the Church's day",
    alt: "The journal's page for Sunday: the day's saint, the fast, and the Epistle and Gospel, each with a pen.",
    route: "/journal",
    lifted: "the day's page",
    async prepare(page) {
      await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    },
    lift: `climb(document.querySelector("[data-journal-today]"), (e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) > 8)`,
    pad: 0,
    layout: { cap: "top", align: "center", s: 1.04, cx: 0.5, cy: 0.7, turn: "rotateX(55deg) rotateZ(-18deg)", lift: { dx: 0, dy: 0, dz: 0.2, k: 1 } },
  },
  {
    n: "05",
    id: "prayers",
    design: "Northern Cross",
    idea: "The phone small and high to one side, the stars of the Northern Cross joined beside it, the line at the foot.",
    caption: "The daily prayers, morning and evening",
    alt: "Prayers: your rule, and the morning prayers, the evening prayers and the Hours.",
    route: "/prayers",
    lifted: "the row of prayers",
    lift: `climb([...document.querySelectorAll("a")].find((a) => a.textContent.includes("Morning prayers") && a.querySelector("img")), (e) => e.getBoundingClientRect().width > 380)`,
    pad: 8,
    layout: { cap: "bottom", align: "center", s: 0.9, cx: 0.36, cy: 0.435, turn: "rotateY(-15deg) rotateX(5deg)", lift: { dx: 0.3, dy: 0.02, dz: 0.16, k: 1 } },
  },
  {
    n: "06",
    id: "saint",
    design: "Limb",
    idea: "The phone close and large, and a great disc filling the head of the picture with the line set upon it.",
    caption: "The lives of the saints",
    alt: "St Basil the Great: his icon, his feast, and his life.",
    route: "/saints/basil-the-great",
    lifted: "Life, Writings and Web",
    lift: `[...document.querySelectorAll("button, a, [role=tab]")].find((e) => e.textContent.trim() === "Life")?.parentElement`,
    pad: 10,
    layout: { cap: "top", align: "center", s: 1.28, cx: 0.4, cy: 0.748, turn: "rotateY(-21deg) rotateX(6deg) rotateZ(2deg)", lift: { dx: 0.2, dy: 0, dz: 0.17, k: 1 } },
  },
  {
    n: "07",
    id: "calendar",
    design: "Phases",
    idea: "The phone face-on and small, crowned by the moon's phases in an arc.",
    caption: "Every feast and every fast",
    alt: "The Church calendar for December 2026, each day marked with its feast or its fast.",
    route: "/calendar",
    lifted: "the day's fast",
    lift: `climb([...document.querySelectorAll("p, div, span")].find((e) => e.childElementCount === 0 && e.textContent.trim() === "Nativity Fast, fish allowed" && e.getBoundingClientRect().top > 300), (e) => e.querySelector("svg") && e.getBoundingClientRect().width > 300)`,
    pad: 10,
    layout: { cap: "top", align: "center", s: 0.8, cx: 0.5, cy: 0.635, turn: "rotateY(-7deg) rotateX(3deg)", lift: { dx: 0.02, dy: 0.04, dz: 0.2, k: 1 } },
  },
  {
    n: "08",
    id: "reading",
    design: "Ring",
    idea: "The phone turned and set high, the book's cover drawn out large inside a ring of light, the line at the foot.",
    caption: "The Fathers, read in full",
    alt: "On the Incarnation of the Word, by St Athanasius the Great, opened at chapter 1.",
    route: "/saints/athanasius-the-great/on-the-incarnation",
    lifted: "the book's cover",
    lift: `climb([...document.querySelectorAll("img")].find((i) => /athanasius/.test(i.currentSrc || i.src) && i.getBoundingClientRect().width > 100), (e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) > 0)`,
    pad: 0,
    layout: { cap: "bottom", align: "center", s: 0.95, cx: 0.63, cy: 0.43, turn: "rotateY(23deg) rotateX(6deg) rotateZ(-1deg)", lift: { dx: -0.62, dy: 0.02, dz: 0.2, k: 1.45 } },
  },
];

// ── The page ─────────────────────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);

const ink = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, transparent)`;
const accent = (pct) => `color-mix(in srgb, var(--color-gold) ${pct}%, transparent)`;
const plane = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, var(--color-night))`;

const line = (d, stroke, width = EDGE) => `<path d="${d}" style="fill:none;stroke:${stroke};stroke-width:${width}"/>`;
/** Plain round dots, set by a fixed rule so the picture is the same every time. */
function dots(count, top, bottom, seed = 7) {
  let s = seed;
  const next = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = next() * W;
    const y = top + next() * (bottom - top);
    out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.2 + next() * 2).toFixed(1)}" style="fill:${ink(r(20 + next() * 36))}"/>`);
  }
  return out.join("");
}

// ── The eight skies ──────────────────────────────────────────────────────

const disc = (cx, cy, R, fill, stroke, width = EDGE) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(R)}" style="fill:${fill};stroke:${stroke};stroke-width:${width}"/>`;
const ring = (cx, cy, R, stroke, width = EDGE) => disc(cx, cy, R, "none", stroke, width);
const NIGHT = "var(--color-night)";

/** Each sky is given the drawing's area: `top` and `bottom`, clear of the words. */
const BACKS = {
  // Totality: one great disc, a bright rim, a ring outside and a fine one within.
  today(area) {
    const [cx, cy, R] = [W * 0.5, H * 0.565, W * 0.585];
    return { css: "", html: `${dots(30, area.top + 20, H * 0.33, 7)}${ring(cx, cy, R + W * 0.075, ink(13))}${disc(cx, cy, R, plane(10), accent(82), 3)}${ring(cx, cy, R - W * 0.07, ink(10))}` };
  },
  // Crescent: a lit disc over the phone's shoulder, then a dark one across it; what is left is the crescent.
  greek(area) {
    const [cx, cy, R] = [W * 0.75, H * 0.338, W * 0.285];
    return {
      css: `[data-back] { background-image: radial-gradient(circle ${r(W * 0.5)}px at ${r(cx - W * 0.1)}px ${r(cy)}px, ${ink(11)}, transparent 72%); }`,
      html: `${dots(38, area.top + 20, H * 0.62, 19)}${disc(cx, cy, R, plane(26), accent(88), 3)}${disc(cx + W * 0.115, cy - H * 0.02, R * 0.93, NIGHT, "none", 0)}${ring(cx, cy, R + W * 0.05, ink(11))}`,
    };
  },
  // Orbits: a small bright disc in the far corner and rings round it that cross the picture. One carries a small dot.
  fathers(area) {
    const [cx, cy] = [W * 0.1, H * 0.235];
    const radii = [0.19, 0.33, 0.5, 0.7, 0.93, 1.19, 1.48, 1.8];
    const a = 0.62; // where the small dot rides its ring
    return {
      css: `[data-back] { background-image: radial-gradient(circle ${r(W * 0.3)}px at ${r(cx)}px ${r(cy)}px, ${ink(15)}, transparent 72%); }`,
      html: `${dots(54, area.top + 20, H * 0.98, 31)}${radii.map((k, i) => ring(cx, cy, W * k, i === 4 ? accent(60) : ink(i % 2 ? 9 : 15))).join("")}${disc(cx + W * 0.93 * Math.cos(a), cy + W * 0.93 * Math.sin(a), 11, "var(--color-gold)", "none", 0)}${disc(cx, cy, W * 0.095, plane(22), accent(88), 3)}`,
    };
  },
  // Moonrise: the floor runs to a horizon; the moon is half over it. The floor is drawn after the moon, so only what has risen shows.
  journal(area) {
    const horizon = r(H * 0.47);
    const [cx, R] = [W * 0.5, W * 0.3];
    return {
      css: `[data-back] { background-image: radial-gradient(ellipse ${r(W * 0.95)}px ${r(H * 0.085)}px at 50% ${horizon}px, ${ink(22)}, transparent 72%); }`,
      html: `${dots(48, area.top + 20, horizon - 20, 43)}${ring(cx, horizon, R + W * 0.06, ink(12))}${disc(cx, horizon, R, plane(24), accent(88), 3)}<rect x="-10" y="${horizon}" width="${W + 20}" height="${H - horizon + 10}" style="fill:${plane(6)}"/>${line(`M -10 ${horizon} L ${W + 10} ${horizon}`, ink(30))}`,
    };
  },
  // Northern Cross: the stars of Cygnus, joined as the asterism is drawn, among fainter ones.
  prayers(area) {
    const stars = { deneb: [0.83, 0.075, 10], sadr: [0.8, 0.235, 8], albireo: [0.73, 0.585, 7], gienah: [0.965, 0.33, 6], delta: [0.615, 0.17, 6] };
    const at = (k) => `${r(W * stars[k][0])} ${r(H * stars[k][1])}`;
    return {
      css: `[data-back] { background-image: radial-gradient(circle ${r(W * 0.36)}px at ${r(W * 0.8)}px ${r(H * 0.235)}px, ${ink(11)}, transparent 72%); }`,
      html: `${dots(70, area.top + 20, area.bottom - 20, 57)}${line(`M ${at("deneb")} L ${at("sadr")} L ${at("albireo")}`, ink(30))}${line(`M ${at("gienah")} L ${at("sadr")} L ${at("delta")}`, ink(30))}${Object.values(stars).map(([x, y, size]) => disc(W * x, H * y, size, "var(--color-gold)", "none", 0)).join("")}`,
    };
  },
  // Limb: a disc far larger than the picture fills its head, behind the words; its edge sweeps over the phone. Drawn as a box, not across the words.
  saint() {
    const D = r(W * 2.5);
    return {
      css: `[data-limb] { position: absolute; width: ${D}px; height: ${D}px; inset-inline-start: ${r(W * 0.56 - D / 2)}px; top: ${r(H * 0.415 - D)}px; border-radius: 50%; background-color: ${plane(9)}; outline: 3px solid ${accent(84)}; }
  [data-limb="2"] { width: ${D + r(W * 0.16)}px; height: ${D + r(W * 0.16)}px; inset-inline-start: ${r(W * 0.56 - D / 2 - W * 0.08)}px; top: ${r(H * 0.415 - D - W * 0.08)}px; background-color: transparent; outline: ${EDGE}px solid ${ink(12)}; }`,
      before: `<div data-limb="2"></div><div data-limb="1"></div>`,
      html: dots(46, H * 0.44, H * 0.98, 71),
    };
  },
  // Phases: seven moons in an arc over the phone, new to full to new, each a lit disc with a dark one across it.
  calendar(area) {
    const [cx, cy, A] = [W * 0.5, H * 0.635, W * 0.585];
    const R = 41;
    const defs = [];
    const moons = [];
    for (let i = 0; i < 7; i++) {
      const t = ((222 + (i * 96) / 6) * Math.PI) / 180;
      const [x, y] = [cx + A * Math.cos(t), cy + A * Math.sin(t)];
      const shift = [0.3, 0.85, 1.4, null, -1.4, -0.85, -0.3][i]; // how far the dark disc stands off, in radii; none at the full
      moons.push(disc(x, y, R, plane(i === 3 ? 36 : 25), "none", 0));
      if (shift !== null) {
        defs.push(`<clipPath id="moon${i}"><circle cx="${r(x)}" cy="${r(y)}" r="${R}"/></clipPath>`);
        moons.push(`<g clip-path="url(#moon${i})">${disc(x + shift * R, y, R * 1.04, NIGHT, "none", 0)}</g>`);
      }
      moons.push(ring(x, y, R, i === 3 ? accent(88) : ink(30)));
    }
    return { css: "", html: `<defs>${defs.join("")}</defs>${dots(50, area.top + 20, H * 0.98, 83)}${ring(cx, cy, A, ink(9))}${moons.join("")}` };
  },
  // Ring: a broad ring of light where the book's cover is drawn out to, dark within, a fine ring outside.
  reading(area) {
    const [cx, cy, R] = [W * 0.245, H * 0.265, W * 0.26];
    return {
      css: `[data-back] { background-image: radial-gradient(circle ${r(W * 0.5)}px at ${r(cx)}px ${r(cy)}px, ${ink(10)}, transparent 72%); }`,
      html: `${dots(56, area.top + 20, area.bottom - 20, 97)}${ring(cx, cy, R + W * 0.07, ink(11))}${ring(cx, cy, R, plane(22), r(W * 0.038))}${ring(cx, cy, R + W * 0.019, accent(82), 3)}`,
    };
  },
};

function picture(shot, lift) {
  const L = shot.layout;
  // The words stand in a band at the head or the foot; the drawing has the rest and never crosses them.
  const area = L.cap === "top" ? { top: CAP, bottom: H } : { top: 0, bottom: H - CAP };
  const back = BACKS[shot.id](area);
  // The side: thin leaves behind the face, lit near the front and darker toward the back.
  const leaves = [];
  const count = Math.round(DEEP / STEP);
  for (let k = count; k >= 1; k--) {
    const t = k / count;
    const tone = k <= 2 ? 34 : 19 - 12 * t;
    leaves.push(`<div data-leaf style="transform:translateZ(${(-k * STEP).toFixed(1)}px);background-color:${plane(tone.toFixed(1))}"></div>`);
  }
  const flex = { center: "center", start: "flex-start", end: "flex-end" }[L.align];
  return `<!doctype html>
<html lang="en" dir="ltr" class="${HTML_CLASS}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, initial-scale=1">
${SHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night); }
  html { scrollbar-gutter: auto; }
  [data-store-picture] { position: relative; box-sizing: border-box; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night); color: var(--color-paper); }
  [data-back] { position: absolute; inset: 0; pointer-events: none; }
  [data-back] svg { position: absolute; top: ${area.top}px; inset-inline: 0; width: 100%; height: ${area.bottom - area.top}px; }
  :root[dir="rtl"] [data-back] svg { transform: scaleX(-1); }
  [data-store-caption] { position: absolute; ${L.cap === "top" ? "top: 0" : "bottom: 0"}; inset-inline: 0; box-sizing: border-box; height: ${CAP}px; margin: 0; padding: ${L.cap === "top" ? `${r(CAP * 0.1)}px ${r(W * 0.075)}px 0` : `0 ${r(W * 0.075)}px ${r(CAP * 0.12)}px`}; display: flex; align-items: center; justify-content: ${flex}; text-align: ${L.align}; text-wrap: balance; font-family: var(--font-heading); font-weight: 600; font-size: 66px; line-height: 1.16; letter-spacing: -0.01em; color: var(--color-paper); }
  [data-stage] { position: absolute; top: ${r(H * L.cy - BH / 2)}px; inset-inline-start: ${r(W * L.cx - BW / 2)}px; width: ${BW}px; height: ${BH}px; perspective: ${r(W * 3.2)}px; perspective-origin: 50% 42%; }
  [data-body] { position: absolute; inset: 0; transform: ${L.turn} scale3d(${L.s}, ${L.s}, ${L.s}); transform-style: preserve-3d; }
  /* In a right-to-left page the phone, its screen and its lifted piece turn over together, as one picture. */
  :root[dir="rtl"] [data-stage] { transform: scaleX(-1); }
  [data-leaf], [data-cast] { position: absolute; inset: 0; border-radius: ${RADIUS + RIM}px; }
  /* The shadow the body casts on what is behind it. */
  [data-cast] { transform: translateZ(${-DEEP - 2}px); box-shadow: ${r(W * 0.05)}px ${r(W * 0.07)}px ${r(W * 0.11)}px ${r(W * 0.01)}px color-mix(in srgb, var(--color-night-deep) 96%, transparent); }
  [data-store-screen] { position: absolute; inset: 0; box-sizing: border-box; margin: 0; padding: ${RIM}px; border-radius: ${RADIUS + RIM}px; background-color: var(--color-night-deep); outline: ${EDGE}px solid ${ink(34)}; outline-offset: -${EDGE}px; }
  [data-store-screen] img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: ${RADIUS}px; }
  /* The piece, in its own place on the screen, then drawn toward the eye. */
  [data-lift] { position: absolute; left: ${(RIM + lift.x * K).toFixed(1)}px; top: ${(RIM + lift.y * K).toFixed(1)}px; width: ${(lift.w * K).toFixed(1)}px; height: ${(lift.h * K).toFixed(1)}px; max-width: none; border-radius: ${(lift.radius * K).toFixed(1)}px; transform: translate3d(${r(BW * L.lift.dx)}px, ${r(BW * L.lift.dy)}px, ${r(W * L.lift.dz)}px) scale(${L.lift.k}); outline: ${EDGE}px solid ${ink(30)}; box-shadow: ${r(W * 0.03)}px ${r(W * 0.05)}px ${r(W * 0.07)}px color-mix(in srgb, var(--color-night-deep) 96%, transparent); }
  ${back.css}
</style>
</head>
<body>
<main data-store-picture>
  <div data-back aria-hidden="true">${back.before ?? ""}<svg viewBox="0 ${area.top} ${W} ${area.bottom - area.top}" preserveAspectRatio="none">${back.html}</svg></div>
  <h1 data-store-caption>${shot.caption}</h1>
  <div data-stage><div data-body><div data-cast aria-hidden="true"></div>${leaves.join("")}<figure data-store-screen><img alt="${shot.alt}" src="/__store/screen.png"></figure><img data-lift alt="" aria-hidden="true" src="/__store/card.png"></div></div>
</main>
</body>
</html>`;
}

// ── In the page (as ../../make.mjs) ──────────────────────────────────────

function picturesOnPage() {
  const vw = innerWidth;
  const vh = innerHeight;
  const seen = [];
  const add = (src, box, ok = true) => {
    if (!src || src === "none") return;
    seen.push({ src: src.startsWith("data:") ? `${src.slice(0, 32)}...` : src, ok, inView: box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < vh && box.right > 0 && box.left < vw });
  };
  const urls = (value) => [...String(value ?? "").matchAll(/url\((["']?)(.*?)\1\)/g)].map((m) => m[2]);
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const box = el.getBoundingClientRect();
    if (el.tagName === "IMG") add(el.currentSrc || el.src, box, el.complete && el.naturalWidth > 0);
    if (el.tagName === "image") add(el.href?.baseVal, box);
    for (const pseudo of [null, "::before", "::after"]) {
      const s = pseudo ? getComputedStyle(el, pseudo) : cs;
      for (const prop of ["backgroundImage", "maskImage", "webkitMaskImage", "borderImageSource", "content"]) for (const u of urls(s[prop])) add(u, box);
    }
  }
  return seen;
}

function android() {
  window.androidBridge = { postMessage() {} };
  window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
}

// ── The work ─────────────────────────────────────────────────────────────

const browserPath = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(browserPath) ? { executablePath: browserPath } : {});

/** One screen, taken as the set takes it, and the piece of it to lift, cut from the same picture. */
async function takeScreen(shot) {
  const scale = K * 1.25 * Math.max(1, shot.layout.lift.k);
  const ctx = await browser.newContext({ viewport: { width: VIEW[0], height: VIEW[1] }, deviceScaleFactor: scale, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: ZONE, reducedMotion: "reduce" });
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...(shot.seed ?? {}) });
  await ctx.addInitScript(android);
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(/^https:\/\/purifyapp\.net\/.*\.(avif|jpe?g|png|webp)(\?.*)?$/, (route) => route.continue());
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date(DAY) });
  await go(p, shot.route);
  await p.waitForLoadState("networkidle").catch(() => {});
  await wait(1500);
  if (shot.prepare) await shot.prepare(p);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForLoadState("networkidle").catch(() => {});
  await wait(1800);
  const inView = (await p.evaluate(picturesOnPage)).filter((x) => x.inView);
  const heritage = heritageNamedIn(inView.map((x) => x.src).join("\n"));
  if (Object.keys(heritage).length || inView.some((x) => !x.ok)) throw new Error(`${shot.id}: a heritage or an empty picture in view`);
  const png = await p.screenshot({ type: "png" });
  // The piece to lift: where it stands and how its corners are cut.
  const piece = await p.evaluate(`(() => { ${CLIMB} const el = ${shot.lift}; if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 }; })()`);
  await ctx.close();
  if (!piece) throw new Error(`${shot.id}: the piece to lift was not found`);
  const pad = shot.pad ?? 0;
  const x = Math.max(0, piece.x - pad);
  const y = Math.max(0, piece.y - pad);
  const w = Math.min(VIEW[0], piece.x + piece.w + pad) - x;
  const h = Math.min(VIEW[1], piece.y + piece.h + pad) - y;
  if (w < 60 || h < 30) throw new Error(`${shot.id}: the piece to lift is not on the screen (${JSON.stringify(piece)})`);
  const meta = await sharp(png).metadata();
  const left = Math.round(x * scale);
  const top = Math.round(y * scale);
  const cut = await sharp(png).extract({ left, top, width: Math.min(meta.width - left, Math.round(w * scale)), height: Math.min(meta.height - top, Math.round(h * scale)) }).png().toBuffer();
  return { png, card: { png: cut, x, y, w, h, radius: Math.max(piece.radius, pad ? 14 : 0) }, picturesInView: [...new Set(inView.map((v) => v.src.replace(ORIGIN, "")))] };
}

async function take(id, html, files) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US", reducedMotion: "reduce" });
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(`${ORIGIN}/__store/**`, (route) => {
    const name = new URL(route.request().url()).pathname.replace("/__store/", "");
    if (name === "page.html") return route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
    if (files[name]) return route.fulfill({ contentType: "image/png", body: files[name] });
    return route.fulfill({ status: 404, body: "not found" });
  });
  const p = await ctx.newPage();
  await p.goto(`${ORIGIN}/__store/page.html`, { waitUntil: "load" });
  await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((done) => { img.onload = img.onerror = done; }))));
  });
  await wait(400);
  const shot = await p.screenshot({ type: "png" });
  const gutter = await p.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter);
  const drawn = await p.evaluate(picturesOnPage);
  const listed = Object.keys(heritageNamedIn(drawn.map((x) => x.src).join("\n")));
  const empty = drawn.filter((x) => !x.ok).length;
  const result = await checkMock(p, "[data-store-picture]");
  await ctx.close();
  const file = `eclipse-play-phone-${id}.png`;
  const out = await sharp(shot).removeAlpha().png({ compressionLevel: 9, effort: 10 }).toBuffer();
  const meta = await sharp(out).metadata();
  if (meta.width !== W || meta.height !== H || meta.channels !== 3) throw new Error(`${file}: ${meta.width} by ${meta.height}`);
  fs.writeFileSync(path.join(HERE, file), out);
  const failures = [...new Set(result.failures.map((f) => `${f.check}${f.palette ? ` (${f.palette})` : ""}: ${f.what}: ${f.detail}`))];
  const problems = [...failures.map((f) => `checkMock: ${f}`), ...(gutter === "auto" ? [] : [`the scrollbar's room is ${gutter}`]), ...(listed.length ? [`heritage: ${listed.join(", ")}`] : []), ...(empty ? ["an empty picture"] : [])];
  console.log(`${problems.length ? "NO  " : "ok  "} ${file}  ${(out.length / 1024).toFixed(0)} KB${problems.length ? `\n      ${problems.join("\n      ")}` : ""}${result.unmeasured.length ? `\n      said for the eye: ${result.unmeasured.join(" | ")}` : ""}`);
  return { id, file, size: [W, H], bytes: out.length, problems, check: { pass: failures.length === 0, failures, notMeasured: result.unmeasured, allowed: result.allowed } };
}

const asked = process.argv.slice(2).filter((a) => SHOTS.some((s) => s.id === a));
const shots = asked.length ? SHOTS.filter((s) => asked.includes(s.id)) : SHOTS;
const resultsFile = path.join(HERE, "results.json");
const before = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")).pictures : [];
const made = [];
for (const shot of shots) {
  const screen = await takeScreen(shot);
  const html = picture(shot, screen.card);
  made.push({ ...(await take(`${shot.n}-${shot.id}`, html, { "screen.png": screen.png, "card.png": screen.card.png })), n: shot.n, shot: shot.id, design: shot.design, idea: shot.idea, caption: shot.caption, route: shot.route, lifted: shot.lifted, picturesInView: screen.picturesInView });
}
await browser.close();
const all = [...before.filter((b) => !made.some((m) => m.file === b.file)), ...made].sort((a, b) => a.file.localeCompare(b.file));
fs.writeFileSync(resultsFile, `${JSON.stringify({ made: new Date().toISOString().slice(0, 10), day: DAY, checks: CHECKS, pictures: all }, null, 2)}\n`);
const failed = all.filter((x) => x.problems.length);
console.log(`\n${all.length} pictures, ${failed.length} with a problem.`);
process.exitCode = failed.length ? 1 : 0;
