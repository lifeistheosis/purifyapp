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
// piece of the real screen lifted off the glass. What is new is that each of
// the eight screens has its own eclipse, its own stars and its own lifted
// piece, on Play's phone size (1080 by 1920):
//   01 today     Totality   one great disc, a bright rim, a ring
//   02 greek     Crescent   a lit disc, a dark one across it
//   03 fathers   Orbits     a small bright disc and the rings round it
//   04 journal   Moonrise   a disc half risen over a level floor
//   05 prayers   Two lights a great disc and a small one, a line between
//   06 saint     Limb       the edge of a disc far larger than the picture
//   07 calendar  Phases     the moon's phases in a row, a faint ring behind
//   08 reading   Ring       a ring of light, dark within
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
const BX = r((W - BW) / 2) - r(W * 0.012);
const BY = CAP + r(H * 0.022);
const RADIUS = r(SW * 0.075);
const DEEP = r(BW * 0.105); // how thick the body is, about a phone's own proportion
const STEP = 1.5;
const TURN = [-25, 7, 1.2]; // degrees about the upright, the level and the face
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
    idea: "One great disc behind the phone, a bright rim, a single ring.",
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
  },
  {
    n: "02",
    id: "greek",
    design: "Crescent",
    idea: "A lit disc with a dark one across it, so a crescent of light is left.",
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
  },
  {
    n: "03",
    id: "fathers",
    design: "Orbits",
    idea: "A small bright disc at the phone's shoulder and the rings round it, crossing the whole picture.",
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
  },
  {
    n: "04",
    id: "journal",
    design: "Moonrise",
    idea: "A disc half risen over a level floor, its rim bright.",
    caption: "A journal kept by the Church's day",
    alt: "The journal's page for Sunday: the day's saint, the fast, and the Epistle and Gospel, each with a pen.",
    route: "/journal",
    lifted: "the day's page",
    async prepare(page) {
      await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    },
    lift: `climb(document.querySelector("[data-journal-today]"), (e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) > 8)`,
    pad: 0,
  },
  {
    n: "05",
    id: "prayers",
    design: "Two lights",
    idea: "A great disc at one side and a small bright one at the other, one fine line between them.",
    caption: "The daily prayers, morning and evening",
    alt: "Prayers: your rule, and the morning prayers, the evening prayers and the Hours.",
    route: "/prayers",
    lifted: "the morning prayers",
    lift: `[...document.querySelectorAll("a")].find((a) => a.textContent.includes("Morning prayers") && a.querySelector("img"))`,
    pad: 8,
  },
  {
    n: "06",
    id: "saint",
    design: "Limb",
    idea: "The edge of a disc far larger than the picture, rising from one corner.",
    caption: "The lives of the saints",
    alt: "St Basil the Great: his icon, his feast, and his life.",
    route: "/saints/basil-the-great",
    lifted: "Life, Writings and Web",
    lift: `[...document.querySelectorAll("button, a, [role=tab]")].find((e) => e.textContent.trim() === "Life")?.parentElement`,
    pad: 10,
  },
  {
    n: "07",
    id: "calendar",
    design: "Phases",
    idea: "The moon's phases in a row along the foot, and one faint ring behind the phone.",
    caption: "Every feast and every fast",
    alt: "The Church calendar for December 2026, each day marked with its feast or its fast.",
    route: "/calendar",
    lifted: "the day's fast",
    lift: `climb([...document.querySelectorAll("p, div, span")].find((e) => e.childElementCount === 0 && e.textContent.trim() === "Nativity Fast, fish allowed" && e.getBoundingClientRect().top > 300), (e) => e.querySelector("svg") && e.getBoundingClientRect().width > 300)`,
    pad: 10,
  },
  {
    n: "08",
    id: "reading",
    design: "Ring",
    idea: "A ring of light, dark within, and a finer ring outside it.",
    caption: "The Fathers, read in full",
    alt: "On the Incarnation of the Word, by St Athanasius the Great, opened at chapter 1.",
    route: "/saints/athanasius-the-great/on-the-incarnation",
    lifted: "the book's cover",
    lift: `climb([...document.querySelectorAll("img")].find((i) => /athanasius/.test(i.currentSrc || i.src) && i.getBoundingClientRect().width > 100), (e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) > 0)`,
    pad: 0,
  },
];

// ── The page ─────────────────────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);

const ink = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, transparent)`;
const accent = (pct) => `color-mix(in srgb, var(--color-gold) ${pct}%, transparent)`;
const plane = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, var(--color-night))`;

/** The drawing's own box: from under the words to the foot of the picture. */
const svg = (inner) => `<svg viewBox="0 ${CAP} ${W} ${H - CAP}" preserveAspectRatio="none">${inner}</svg>`;
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

// ── The eight eclipses ───────────────────────────────────────────────────

const disc = (cx, cy, R, fill, stroke, width = EDGE) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(R)}" style="fill:${fill};stroke:${stroke};stroke-width:${width}"/>`;
const ring = (cx, cy, R, stroke, width = EDGE) => disc(cx, cy, R, "none", stroke, width);
const NIGHT = "var(--color-night)";

const BACKS = {
  // Totality: one great disc, a bright rim, a ring outside and a fine one within.
  today() {
    const [cx, cy, R] = [W * 0.5, H * 0.565, W * 0.585];
    return { css: "", html: svg(`${dots(30, CAP + 20, H * 0.33, 7)}${ring(cx, cy, R + W * 0.075, ink(13))}${disc(cx, cy, R, plane(10), accent(82), 3)}${ring(cx, cy, R - W * 0.07, ink(10))}`) };
  },
  // Crescent: the lit disc first, then a dark one across it; what is left is the crescent.
  greek() {
    const [cx, cy, R] = [W * 0.47, H * 0.57, W * 0.6];
    return { css: "", html: svg(`${dots(40, CAP + 20, H * 0.98, 19)}${disc(cx, cy, R, plane(15), accent(84), 3)}${disc(cx + W * 0.2, cy - H * 0.035, R * 0.94, NIGHT, ink(15))}`) };
  },
  // Orbits: a small bright disc by the phone's shoulder, and rings round it that cross the picture. One carries a small dot.
  fathers() {
    const [cx, cy] = [W * 0.9, H * 0.232];
    const radii = [0.19, 0.33, 0.5, 0.7, 0.93, 1.19, 1.48];
    const a = 2.35; // where the small dot rides its ring
    return {
      css: `[data-back] { background-image: radial-gradient(circle ${r(W * 0.3)}px at ${r(cx)}px ${r(cy)}px, ${ink(15)}, transparent 72%); }`,
      html: svg(`${dots(54, CAP + 20, H * 0.98, 31)}${radii.map((k, i) => ring(cx, cy, W * k, i === 3 ? accent(60) : ink(i % 2 ? 9 : 15))).join("")}${disc(cx + W * 0.7 * Math.cos(a), cy + W * 0.7 * Math.sin(a), 11, "var(--color-gold)", "none", 0)}${disc(cx, cy, W * 0.095, plane(22), accent(88), 3)}`),
    };
  },
  // Moonrise: a disc half over the floor; the floor is drawn after it, so only what has risen shows.
  journal() {
    const floor = r(H * 0.845);
    const [cx, R] = [W * 0.5, W * 0.63];
    return {
      css: `[data-back] { background-image: radial-gradient(ellipse ${r(W * 0.9)}px ${r(H * 0.1)}px at 50% ${floor}px, ${ink(15)}, transparent 72%); }`,
      html: svg(`${dots(46, CAP + 20, H * 0.62, 43)}${ring(cx, floor, R + W * 0.08, ink(11))}${disc(cx, floor, R, plane(13.5), accent(84), 3)}<rect x="-10" y="${floor}" width="${W + 20}" height="${H - floor + 10}" style="fill:${plane(5)}"/>${line(`M -10 ${floor} L ${W + 10} ${floor}`, ink(26))}`),
    };
  },
  // Two lights: a great disc at the start side, a small bright one at the other, and the arc of one wide circle between.
  prayers() {
    return {
      css: "",
      html: svg(`${dots(42, CAP + 20, H * 0.98, 57)}${ring(W * 0.5, H * 1.5, W * 1.42, ink(14))}${disc(W * 0.06, H * 0.42, W * 0.4, plane(11), accent(80), 3)}${ring(W * 0.06, H * 0.42, W * 0.47, ink(11))}${disc(W * 0.925, H * 0.79, W * 0.085, plane(24), accent(88), 3)}${ring(W * 0.925, H * 0.79, W * 0.14, ink(13))}`),
    };
  },
  // Limb: a disc far larger than the picture, seen at one corner.
  saint() {
    const [cx, cy] = [-W * 0.16, H * 1.13];
    return {
      css: `[data-back] { background-image: radial-gradient(ellipse ${r(W * 0.7)}px ${r(H * 0.22)}px at 22% ${r(H * 0.66)}px, ${ink(12)}, transparent 72%); }`,
      html: svg(`${dots(52, CAP + 20, H * 0.9, 71)}${ring(cx, cy, W * 1.3, ink(11))}${disc(cx, cy, W * 1.12, plane(11), accent(84), 3)}${ring(cx, cy, W * 0.98, ink(9))}`),
    };
  },
  // Phases: seven small moons along the foot, new to full to new, each a lit disc with a dark one across it; a ring behind the phone.
  calendar() {
    const y = H * 0.968;
    const R = 37;
    const gapX = W * 0.128;
    const defs = [];
    const moons = [];
    for (let i = 0; i < 7; i++) {
      const x = W * 0.5 + (i - 3) * gapX;
      const shift = [0.3, 0.85, 1.4, null, -1.4, -0.85, -0.3][i]; // how far the dark disc stands off, in radii; none at the full
      moons.push(disc(x, y, R, plane(i === 3 ? 34 : 24), "none", 0));
      if (shift !== null) {
        defs.push(`<clipPath id="moon${i}"><circle cx="${r(x)}" cy="${r(y)}" r="${R}"/></clipPath>`);
        moons.push(`<g clip-path="url(#moon${i})">${disc(x + shift * R, y, R * 1.04, NIGHT, "none", 0)}</g>`);
      }
      moons.push(ring(x, y, R, i === 3 ? accent(88) : ink(30)));
    }
    return {
      css: "",
      html: svg(`<defs>${defs.join("")}</defs>${dots(44, CAP + 20, H * 0.9, 83)}${disc(W * 0.5, H * 0.56, W * 0.6, plane(7), ink(24))}${ring(W * 0.5, H * 0.56, W * 0.675, ink(10))}${moons.join("")}`),
    };
  },
  // Ring: a broad ring of light with the dark inside it, and a fine ring outside.
  reading() {
    const [cx, cy, R] = [W * 0.5, H * 0.565, W * 0.575];
    return { css: "", html: svg(`${dots(40, CAP + 20, H * 0.98, 97)}${ring(cx, cy, R + W * 0.085, ink(11))}${ring(cx, cy, R, plane(21), r(W * 0.05))}${ring(cx, cy, R + W * 0.025, accent(80), 3)}`) };
  },
};

function picture(shot, back, add = {}) {
  // The side: thin leaves behind the face, lit near the front and darker toward the back.
  const leaves = [];
  const count = Math.round(DEEP / STEP);
  for (let k = count; k >= 1; k--) {
    const t = k / count;
    const tone = k <= 2 ? 34 : 19 - 12 * t;
    leaves.push(`<div data-leaf style="transform:translateZ(${(-k * STEP).toFixed(1)}px);background-color:${plane(tone.toFixed(1))}"></div>`);
  }
  const turn = (sign) => `rotateY(${sign * TURN[0]}deg) rotateX(${TURN[1]}deg) rotateZ(${sign * TURN[2]}deg)`;
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
  [data-back] svg { position: absolute; top: ${CAP}px; inset-inline: 0; width: 100%; height: ${H - CAP}px; }
  :root[dir="rtl"] [data-back] svg { transform: scaleX(-1); }
  [data-store-caption] { position: absolute; top: 0; inset-inline: 0; box-sizing: border-box; height: ${CAP}px; margin: 0; padding: ${r(CAP * 0.1)}px ${r(W * 0.07)}px 0; display: flex; align-items: center; justify-content: center; text-align: center; text-wrap: balance; font-family: var(--font-heading); font-weight: 600; font-size: 66px; line-height: 1.16; letter-spacing: -0.01em; color: var(--color-paper); }
  [data-stage] { position: absolute; top: ${BY}px; inset-inline-start: ${BX}px; width: ${BW}px; height: ${BH}px; perspective: ${r(W * 3.2)}px; perspective-origin: 50% 42%; }
  [data-body] { position: absolute; inset: 0; transform: ${turn(1)}; transform-style: preserve-3d; }
  /* In a right-to-left page the phone, its screen and its lifted piece turn over together, as one picture. */
  :root[dir="rtl"] [data-stage] { transform: scaleX(-1); }
  [data-leaf], [data-cast] { position: absolute; inset: 0; border-radius: ${RADIUS + RIM}px; }
  /* The shadow the body casts on the hills behind it. */
  [data-cast] { transform: translateZ(${-DEEP - 2}px); box-shadow: ${r(W * 0.05)}px ${r(W * 0.07)}px ${r(W * 0.11)}px ${r(W * 0.01)}px color-mix(in srgb, var(--color-night-deep) 96%, transparent); }
  [data-store-screen] { position: absolute; inset: 0; box-sizing: border-box; margin: 0; padding: ${RIM}px; border-radius: ${RADIUS + RIM}px; background-color: var(--color-night-deep); outline: ${EDGE}px solid ${ink(34)}; outline-offset: -${EDGE}px; }
  [data-store-screen] img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: ${RADIUS}px; }
  ${back.css}
  ${add.lift ? `[data-lift] { position: absolute; left: ${(RIM + add.lift.x * K).toFixed(1)}px; top: ${(RIM + add.lift.y * K).toFixed(1)}px; width: ${(add.lift.w * K).toFixed(1)}px; height: ${(add.lift.h * K).toFixed(1)}px; border-radius: ${(add.lift.radius * K).toFixed(1)}px; transform: translate3d(${-r(BW * 0.13)}px, ${-r(BW * 0.02)}px, ${r(W * 0.15)}px); outline: ${EDGE}px solid ${ink(30)}; box-shadow: ${r(W * 0.03)}px ${r(W * 0.05)}px ${r(W * 0.07)}px color-mix(in srgb, var(--color-night-deep) 96%, transparent); }` : ""}
</style>
</head>
<body>
<main data-store-picture>
  <div data-back aria-hidden="true">${back.html}</div>
  <h1 data-store-caption>${shot.caption}</h1>
  <div data-stage><div data-body><div data-cast aria-hidden="true"></div>${leaves.join("")}<figure data-store-screen><img alt="${shot.alt}" src="/__store/screen.png"></figure>${add.lift ? `<img data-lift alt="" aria-hidden="true" src="/__store/card.png">` : ""}</div></div>
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
  const scale = K * 1.25;
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
  const html = picture(shot, BACKS[shot.id](), { lift: screen.card });
  made.push({ ...(await take(`${shot.n}-${shot.id}`, html, { "screen.png": screen.png, "card.png": screen.card.png })), n: shot.n, shot: shot.id, design: shot.design, idea: shot.idea, caption: shot.caption, route: shot.route, lifted: shot.lifted, picturesInView: screen.picturesInView });
}
await browser.close();
const all = [...before.filter((b) => !made.some((m) => m.file === b.file)), ...made].sort((a, b) => a.file.localeCompare(b.file));
fs.writeFileSync(resultsFile, `${JSON.stringify({ made: new Date().toISOString().slice(0, 10), day: DAY, checks: CHECKS, pictures: all }, null, 2)}\n`);
const failed = all.filter((x) => x.problems.length);
console.log(`\n${all.length} pictures, ${failed.length} with a problem.`);
process.exitCode = failed.length ? 1 : 0;
