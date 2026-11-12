#!/usr/bin/env node
// Three designs for the back of the store pictures and for how the screen is
// presented, for the owner to choose one (his word of 2026-11-12, about
// 17:07 UTC: "make a nice new design, minimalistic design. Maybe add like,
// you know, depth ... Maybe you can make 3 variant designs").
//
//   node docs/plans/v1.9/store/variants/variants.mjs        all twelve
//   node docs/plans/v1.9/store/variants/variants.mjs B      one variant
//
// The screens are the app's own, taken exactly as ../make.mjs takes them
// (the same export, the same reader, the same day). Only what is behind and
// around a screen is new, and it is drawn on a page that wears the app's own
// stylesheet, in its palette tokens and its type:
//   A  Horizon   night; a low hill and its line, the screen upright before it
//   B  Planes    night; a disc and a ring, the screen turned a little with
//                two leaves behind it
//   C  Arch      parchment (the app's Light palette); the screen standing in
//                an arch
// No device is drawn in any of them: a screen has rounded corners, an edge,
// a shadow and depth, and no hardware (README.md says why, store by store).
// Each is shown on four pictures: Play phone 01 and 04, iPad 02, and the
// feature graphic. Every picture is held to checkMock and to the heritage
// list, as the set is.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../../..");
const OUT = path.join(ROOT, "out");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { checkMock, CHECKS } = await import(at("scripts/mock-check.mjs"));
const { NATIVE_UA, ORIGIN, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { heritageNamedIn } = await import(at("lib/marketing/heritagePictures.ts"));

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first (see ../make.mjs)");

const DAY = "2026-12-06T09:30:00-05:00";
const ZONE = "America/New_York";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function tap(page, selector) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 20000 });
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

// ── The four pictures each variant is shown on ───────────────────────────

const PHONE = { id: "play-phone", canvas: [1080, 1920], viewport: [412, 846], type: 66, round: 0.07 };
const IPAD = { id: "appstore-ipad-13", canvas: [2064, 2752], viewport: [1032, 1376], type: 100, round: 0.022 };

const PICTURES = [
  {
    device: PHONE,
    n: "01",
    id: "today",
    caption: "The day's saint, fast and readings",
    alt: "Today: St Nicholas the Wonderworker, the Nativity Fast with fish allowed, and the day's verse.",
    route: "/",
    async prepare(page) {
      await tap(page, 'button[aria-label="Dismiss"]');
      await wait(600);
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  },
  {
    device: PHONE,
    n: "04",
    id: "journal",
    caption: "A journal kept by the Church's day",
    alt: "The journal's page for Sunday: the day's saint, the fast, and the Epistle and Gospel, each with a pen.",
    route: "/journal",
    async prepare(page) {
      await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    },
  },
  {
    device: IPAD,
    n: "02",
    id: "greek",
    caption: "The Greek beside the verse",
    alt: "The Gospel of John, chapter 1, in English with the Greek beside each verse.",
    route: "/bible/john/1",
    seed: { "purify:interlinear": "1" },
    async prepare(page) {
      await page.waitForSelector('button[aria-label^="Look up"]', { timeout: 30000 });
    },
  },
];

const FEATURE = { canvas: [1024, 500], line: "The Orthodox prayer book, Bible, saints, and calendar, in one quiet app." };

const VARIANTS = {
  A: { name: "Horizon", idea: "Night. A low hill and the line of its crest, as on Today's own star card; the screen stands upright before it with a soft light rising behind.", mode: null },
  B: { name: "Planes", idea: "Night. A disc and a ring behind, and the screen turned a little with two leaves under it, so the depth is in the layers.", mode: null },
  C: { name: "Arch", idea: "Parchment, the app's own Light palette. The screen stands in an arch, the shape of a church door and of a Gospel book's canon table.", mode: "parchment" },
};

// ── The app's own document ───────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);

/** Ink at a strength: the palette's own paper token over nothing, so it follows every palette. */
const ink = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, transparent)`;
/** A plane a step off the ground, in the palette's own tones. */
const plane = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, var(--color-night))`;

const doc = (W, H, mode, css, body) => `<!doctype html>
<html lang="en" dir="ltr" class="${HTML_CLASS}"${mode ? ` data-reading-mode="${mode}"` : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, initial-scale=1">
${SHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night); }
  html { scrollbar-gutter: auto; }
  [data-store-picture] { position: relative; box-sizing: border-box; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night); color: var(--color-paper); }
  [data-back] { position: absolute; inset: 0; pointer-events: none; }
  /* A drawing starts under the words, never across them, so checkMock can measure the words on their ground. */
  [data-back] svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  :root[dir="rtl"] [data-back] svg { transform: scaleX(-1); }
  [data-store-caption] { position: absolute; box-sizing: border-box; margin: 0; display: flex; text-wrap: balance; font-family: var(--font-heading); font-weight: 600; line-height: 1.16; letter-spacing: -0.01em; color: var(--color-paper); }
  [data-store-screen] { position: absolute; box-sizing: border-box; margin: 0; }
  [data-store-screen] img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }
  ${css}
</style>
</head>
<body>
<main data-store-picture>
${body}
</main>
</body>
</html>`;

const r = Math.round;

/** The screen whole, as large as the room under the caption allows. */
function fit(W, H, [vw, vh], top, bottom, widest) {
  let h = H - top - bottom;
  let w = r((h * vw) / vh);
  if (w > widest) w = r(widest);
  h = Math.floor((w * vh) / vw);
  return { w, h };
}

// ── A: Horizon ───────────────────────────────────────────────────────────

function horizon(W, H, crest, rise) {
  // One circle's arc, wide and low: its crest at `crest`, falling `rise` by the picture's edges.
  const half = W / 2;
  const R = (half * half + rise * rise) / (2 * rise);
  const arc = (lift) => `M ${-W * 0.1} ${crest + lift + (R - Math.sqrt(R * R - (half * 1.2) ** 2))} A ${R} ${R} 0 0 1 ${W * 1.1} ${crest + lift + (R - Math.sqrt(R * R - (half * 1.2) ** 2))}`;
  return { R, arc };
}

function pictureA(device, shot) {
  const [W, H] = device.canvas;
  const tablet = device.viewport[0] > 700;
  const capH = r(H * 0.165);
  const { w, h } = fit(W, H, device.viewport, capH, r(H * (tablet ? 0.075 : 0.1)), W * (tablet ? 0.72 : 0.63));
  const left = r((W - w) / 2);
  const crest = r(capH + h * 0.6);
  const { arc } = horizon(W, H, crest, W * 0.13);
  const edge = Math.max(2, r(W / 540));
  const rim = r(W * 0.011);
  const radius = r(w * device.round);
  const lifts = [0.2, 0.135, 0.08, 0.035];
  const css = `
  [data-back] { background-image: radial-gradient(ellipse ${r(W * 0.78)}px ${r(H * 0.2)}px at 50% ${crest}px, ${ink(17)}, transparent 72%); }
  [data-hill] { fill: ${plane(6.5)}; stroke: none; }
  [data-line] { fill: none; stroke: ${ink(40)}; stroke-width: ${edge}; }
  [data-line="1"] { stroke: ${ink(16)}; }
  [data-line="2"] { stroke: ${ink(11)}; }
  [data-line="3"] { stroke: ${ink(8)}; }
  [data-line="4"] { stroke: ${ink(5)}; }
  [data-store-caption] { top: 0; inset-inline: 0; height: ${capH}px; padding: ${r(capH * 0.1)}px ${r(W * 0.07)}px 0; align-items: center; justify-content: center; text-align: center; font-size: ${device.type}px; }
  [data-store-screen] { top: ${capH - rim}px; inset-inline-start: ${left - rim}px; width: ${w + 2 * rim}px; height: ${h + 2 * rim}px; padding: ${rim}px; border-radius: ${radius + rim}px; background-color: var(--color-night-deep); outline: ${edge}px solid ${ink(22)}; box-shadow: 0 ${r(W * 0.04)}px ${r(W * 0.09)}px color-mix(in srgb, var(--color-night-deep) 94%, transparent); }
  [data-store-screen] img { border-radius: ${radius}px; }`;
  const hillPath = `${arc(0)} L ${W * 1.1} ${H * 1.1} L ${-W * 0.1} ${H * 1.1} Z`;
  return doc(
    W,
    H,
    null,
    css,
    `  <div data-back aria-hidden="true"><svg style="top:${capH}px;height:${H - capH}px" viewBox="0 ${capH} ${W} ${H - capH}" preserveAspectRatio="none">${lifts.map((lift, i) => `<path data-line="${4 - i}" d="${arc(-H * lift)}"/>`).join("")}<path data-hill d="${hillPath}"/><path data-line="0" d="${arc(0)}"/></svg></div>
  <h1 data-store-caption>${shot.caption}</h1>
  <figure data-store-screen><img alt="${shot.alt}" src="/__store/screen.png"></figure>`,
  );
}

function featureA() {
  const [W, H] = FEATURE.canvas;
  const crest = 392;
  const { arc } = horizon(W, H, crest, 58);
  const css = `
  [data-back] { background-image: radial-gradient(ellipse 460px 200px at 50% ${crest}px, ${ink(17)}, transparent 72%); }
  [data-hill] { fill: ${plane(6.5)}; }
  [data-line] { fill: none; stroke: ${ink(40)}; stroke-width: 2; }
  [data-line="1"] { stroke: ${ink(16)}; }
  [data-line="2"] { stroke: ${ink(11)}; }
  [data-line="3"] { stroke: ${ink(8)}; }
  [data-line="4"] { stroke: ${ink(5)}; }
  [data-words] { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; padding-top: 34px; }
  ${wordmarkCss(84, 58, 21, "center")}`;
  return doc(W, H, null, css, `  <div data-back aria-hidden="true"><svg style="top:272px;height:${H - 272}px" viewBox="0 272 ${W} ${H - 272}" preserveAspectRatio="none">${[0.2, 0.135, 0.08, 0.035].map((lift, i) => `<path data-line="${4 - i}" d="${arc(-H * lift)}"/>`).join("")}<path data-hill d="${arc(0)} L ${W * 1.1} ${H * 1.2} L ${-W * 0.1} ${H * 1.2} Z"/><path data-line="0" d="${arc(0)}"/></svg></div>
  <div data-words>${wordmark()}</div>`);
}

// ── B: Planes ────────────────────────────────────────────────────────────

function pictureB(device, shot) {
  const [W, H] = device.canvas;
  const tablet = device.viewport[0] > 700;
  const capH = r(H * 0.165);
  const { w, h } = fit(W, H, device.viewport, r(capH * 1.12), r(H * 0.07), W * (tablet ? 0.74 : 0.66));
  const left = r((W - w) * (tablet ? 0.5 : 0.46));
  const top = r(capH * 1.1);
  const edge = Math.max(2, r(W / 540));
  const radius = r(w * device.round);
  const disc = r(W * (tablet ? 0.8 : 0.98));
  const discEnd = -r(disc * 0.3);
  const discTop = r(capH * (tablet ? 0.42 : 0.5));
  const gapRing = r(disc * 0.075);
  const y = tablet ? 11 : 15;
  const x = tablet ? 4 : 5;
  const css = `
  [data-disc] { position: absolute; inset-inline-end: ${discEnd}px; top: ${discTop}px; width: ${disc}px; height: ${disc}px; border-radius: 50%; background-color: ${plane(7)}; outline: ${edge}px solid ${ink(18)}; }
  [data-ring] { position: absolute; inset-inline-end: ${discEnd - gapRing}px; top: ${discTop - gapRing}px; width: ${disc + 2 * gapRing}px; height: ${disc + 2 * gapRing}px; border-radius: 50%; outline: ${edge}px solid ${ink(9)}; }
  [data-store-caption] { top: 0; inset-inline: 0; height: ${capH}px; padding: ${r(capH * 0.16)}px ${r(W * 0.075)}px 0; align-items: center; justify-content: flex-start; text-align: start; font-size: ${device.type}px; }
  [data-stage] { position: absolute; top: ${top}px; inset-inline-start: ${left}px; width: ${w}px; height: ${h}px; perspective: ${r(W * 3.1)}px; perspective-origin: 30% 40%; }
  [data-turn] { position: absolute; inset: 0; transform: rotateY(-${y}deg) rotateX(${x}deg); transform-style: preserve-3d; }
  [data-leaf] { position: absolute; inset: 0; border-radius: ${radius}px; background-color: ${plane(6)}; outline: ${edge}px solid ${ink(14)}; }
  [data-leaf="1"] { transform: translate3d(${r(w * 0.06)}px, ${r(w * 0.035)}px, ${-r(W * 0.09)}px); }
  [data-leaf="2"] { transform: translate3d(${r(w * 0.12)}px, ${r(w * 0.07)}px, ${-r(W * 0.18)}px); background-color: ${plane(3.5)}; outline-color: ${ink(9)}; }
  :root[dir="rtl"] [data-stage] { perspective-origin: 70% 40%; }
  :root[dir="rtl"] [data-turn] { transform: rotateY(${y}deg) rotateX(${x}deg); }
  :root[dir="rtl"] [data-leaf="1"] { transform: translate3d(${-r(w * 0.06)}px, ${r(w * 0.035)}px, ${-r(W * 0.09)}px); }
  :root[dir="rtl"] [data-leaf="2"] { transform: translate3d(${-r(w * 0.12)}px, ${r(w * 0.07)}px, ${-r(W * 0.18)}px); }
  [data-store-screen] { inset: 0; border-radius: ${radius}px; overflow: hidden; background-color: var(--color-night-deep); outline: ${edge}px solid ${ink(26)}; box-shadow: ${r(W * 0.03)}px ${r(W * 0.045)}px ${r(W * 0.08)}px color-mix(in srgb, var(--color-night-deep) 94%, transparent); }`;
  return doc(
    W,
    H,
    null,
    css,
    `  <div data-back aria-hidden="true"><div data-ring></div><div data-disc></div></div>
  <h1 data-store-caption>${shot.caption}</h1>
  <div data-stage><div data-turn><div data-leaf="2" aria-hidden="true"></div><div data-leaf="1" aria-hidden="true"></div><figure data-store-screen><img alt="${shot.alt}" src="/__store/screen.png"></figure></div></div>`,
  );
}

function featureB() {
  const [W, H] = FEATURE.canvas;
  const disc = 560;
  const css = `
  [data-disc] { position: absolute; inset-inline-end: -40px; top: ${r(H / 2 - disc / 2)}px; width: ${disc}px; height: ${disc}px; border-radius: 50%; background-color: ${plane(7)}; outline: 2px solid ${ink(18)}; display: flex; align-items: center; justify-content: center; }
  [data-ring] { position: absolute; inset-inline-end: -82px; top: ${r(H / 2 - disc / 2) - 42}px; width: ${disc + 84}px; height: ${disc + 84}px; border-radius: 50%; outline: 2px solid ${ink(9)}; }
  [data-words] { position: absolute; inset-block: 0; inset-inline-start: 84px; width: 440px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
  ${wordmarkCss(0, 74, 23, "start")}
  [data-cross] { width: 108px; height: 190px; margin-inline-end: 56px; }`;
  return doc(W, H, null, css, `  <div data-back aria-hidden="true"><div data-ring></div></div>
  <div data-disc aria-hidden="true"><span data-cross></span></div>
  <div data-words>${wordmark(false)}</div>`);
}

// ── C: Arch ──────────────────────────────────────────────────────────────

function pictureC(device, shot) {
  const [W, H] = device.canvas;
  const tablet = device.viewport[0] > 700;
  const capH = r(H * (tablet ? 0.125 : 0.132));
  const side = r(W * (tablet ? 0.05 : 0.1));
  const crown = r(W * (tablet ? 0.15 : 0.3));
  const gap = r(W * 0.03);
  // The screen's top corners must clear the arch's curve: how far the curve has fallen at the screen's half-width.
  const widest = W * (tablet ? 0.8 : 0.66);
  const archW = (w) => w + 2 * side;
  const fall = (w) => crown * (1 - Math.sqrt(Math.max(0, 1 - (w / archW(w)) ** 2)));
  let { w, h } = fit(W, H, device.viewport, capH + fall(widest) + gap, r(H * 0.035), widest);
  const top = r(capH + fall(w) + gap);
  ({ w, h } = fit(W, H, device.viewport, top, r(H * 0.035), w));
  const left = r((W - w) / 2);
  const edge = Math.max(2, r(W / 540));
  const radius = r(w * device.round);
  const aw = archW(w);
  const inset = r(W * 0.016);
  const css = `
  [data-arch] { position: absolute; top: ${capH}px; inset-inline-start: ${r((W - aw) / 2)}px; width: ${aw}px; height: ${H}px; border-radius: ${r(aw / 2)}px ${r(aw / 2)}px 0 0 / ${crown}px ${crown}px 0 0; background-color: ${plane(6)}; outline: ${edge}px solid ${ink(30)}; }
  [data-arch="2"] { top: ${capH + inset}px; inset-inline-start: ${r((W - aw) / 2) + inset}px; width: ${aw - 2 * inset}px; border-radius: ${r(aw / 2 - inset)}px ${r(aw / 2 - inset)}px 0 0 / ${crown - inset}px ${crown - inset}px 0 0; background-color: transparent; outline-color: ${ink(14)}; }
  [data-floor] { position: absolute; inset-inline: 0; top: ${top + h + r(H * 0.012)}px; height: ${edge}px; background-color: ${ink(22)}; }
  [data-store-caption] { top: 0; inset-inline: 0; height: ${capH}px; padding: ${r(capH * 0.08)}px ${r(W * 0.07)}px 0; align-items: center; justify-content: center; text-align: center; font-size: ${r(device.type * (tablet ? 0.94 : 0.92))}px; }
  [data-store-screen] { top: ${top}px; inset-inline-start: ${left}px; width: ${w}px; height: ${h}px; border-radius: ${radius}px; overflow: hidden; background-color: var(--color-night-deep); outline: ${edge}px solid ${ink(30)}; box-shadow: 0 ${r(W * 0.03)}px ${r(W * 0.07)}px ${ink(34)}, 0 ${r(W * 0.006)}px ${r(W * 0.014)}px ${ink(26)}; }`;
  return doc(
    W,
    H,
    "parchment",
    css,
    `  <div data-back aria-hidden="true"><div data-arch="1"></div><div data-arch="2"></div><div data-floor></div></div>
  <h1 data-store-caption>${shot.caption}</h1>
  <figure data-store-screen><img alt="${shot.alt}" src="/__store/screen.png"></figure>`,
  );
}

function featureC() {
  // A wide arch that holds the words, as an apse holds what stands in it. (A narrow arch with the cross alone read as a headstone.)
  const [W, H] = FEATURE.canvas;
  const aw = 660;
  const crown = 250;
  const top = 34;
  const inset = 14;
  const css = `
  [data-arch] { position: absolute; top: ${top}px; inset-inline-start: ${(W - aw) / 2}px; width: ${aw}px; height: ${H}px; border-radius: ${aw / 2}px ${aw / 2}px 0 0 / ${crown}px ${crown}px 0 0; background-color: ${plane(6)}; outline: 2px solid ${ink(30)}; }
  [data-arch="2"] { top: ${top + inset}px; inset-inline-start: ${(W - aw) / 2 + inset}px; width: ${aw - 2 * inset}px; border-radius: ${aw / 2 - inset}px ${aw / 2 - inset}px 0 0 / ${crown - inset}px ${crown - inset}px 0 0; background-color: transparent; outline-color: ${ink(14)}; }
  [data-words] { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; padding-top: 104px; }
  ${wordmarkCss(88, 60, 21, "center")}
  [data-store-line] { max-width: 470px; }`;
  return doc(W, H, "parchment", css, `  <div data-back aria-hidden="true"><div data-arch="1"></div><div data-arch="2"></div></div>
  <div data-words>${wordmark()}</div>`);
}

// ── The wordmark, as the app sets it, and the app's own cross as a mask so it takes the palette's ink ──

function wordmarkCss(cross, name, line, align) {
  return `[data-cross] { display: block; background-color: var(--color-paper); -webkit-mask: url(/purify-cross-mark.png) center / contain no-repeat; mask: url(/purify-cross-mark.png) center / contain no-repeat; ${cross ? `height: ${cross}px; width: ${r(cross * 0.569)}px;` : ""} }
  [data-store-wordmark] { margin: ${cross ? 20 : 0}px 0 0; font-family: var(--font-sans); font-weight: 700; font-size: ${name}px; line-height: 1; letter-spacing: -0.01em; color: var(--color-paper); }
  [data-store-line] { margin: 16px 0 0; max-width: 600px; text-align: ${align}; text-wrap: balance; font-family: var(--font-serif); font-size: ${line}px; line-height: 1.36; color: ${ink(84)}; }`;
}
const wordmark = (cross = true) => `${cross ? '<span data-cross aria-hidden="true"></span>' : ""}<p data-store-wordmark>Purify</p><p data-store-line>${FEATURE.line}</p>`;

const DESIGN = { A: [pictureA, featureA], B: [pictureB, featureB], C: [pictureC, featureC] };

// ── In the page (as ../make.mjs) ─────────────────────────────────────────

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

const verdict = (result) => ({
  pass: result.failures.length === 0,
  failures: [...new Set(result.failures.map((f) => `${f.check}${f.palette ? ` (${f.palette})` : ""}: ${f.what}: ${f.detail}`))],
  notMeasured: result.unmeasured,
  allowed: result.allowed,
});

async function writePng(buffer, file, [W, H]) {
  const out = await sharp(buffer).removeAlpha().png({ compressionLevel: 9, effort: 10 }).toBuffer();
  const meta = await sharp(out).metadata();
  if (meta.width !== W || meta.height !== H || meta.channels !== 3) throw new Error(`${file}: ${meta.width} by ${meta.height}, wanted ${W} by ${H}`);
  fs.writeFileSync(path.join(HERE, file), out);
  return out.length;
}

/** The app's screen, taken once for all three variants, sharp enough for the largest it is shown. */
async function takeScreen(shot) {
  const [vw, vh] = shot.device.viewport;
  const scale = (shot.device.canvas[0] * 0.92) / vw;
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: scale, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: ZONE, reducedMotion: "reduce" });
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...(shot.seed ?? {}) });
  await ctx.addInitScript(android);
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(/^https:\/\/purifyapp\.net\/.*\.(avif|jpe?g|png|webp)(\?.*)?$/, (route) => route.continue());
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(DAY) });
  await go(page, shot.route);
  await page.waitForLoadState("networkidle").catch(() => {});
  await wait(1500);
  if (shot.prepare) await shot.prepare(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle").catch(() => {});
  await wait(1800);
  const inView = (await page.evaluate(picturesOnPage)).filter((p) => p.inView);
  const png = await page.screenshot({ type: "png" });
  await ctx.close();
  return { png, picturesInView: [...new Set(inView.map((p) => p.src.replace(ORIGIN, "")))], heritage: heritageNamedIn(inView.map((p) => p.src).join("\n")), empty: inView.filter((p) => !p.ok).length };
}

async function setAndTake(canvas, html, files, file) {
  const [W, H] = canvas;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US", reducedMotion: "reduce" });
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(`${ORIGIN}/__store/**`, (route) => {
    const name = new URL(route.request().url()).pathname.replace("/__store/", "");
    if (name === "page.html") return route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
    if (files[name]) return route.fulfill({ contentType: "image/png", body: files[name] });
    return route.fulfill({ status: 404, body: "not found" });
  });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/__store/page.html`, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((done) => { img.onload = img.onerror = done; }))));
  });
  await wait(400);
  const png = await page.screenshot({ type: "png" });
  const pictures = await page.evaluate(picturesOnPage);
  const check = verdict(await checkMock(page, "[data-store-picture]"));
  await ctx.close();
  const bytes = await writePng(png, file, canvas);
  const heritage = heritageNamedIn(pictures.map((p) => p.src).join("\n"));
  const problems = [];
  if (Object.keys(heritage).length) problems.push(`heritage: ${Object.keys(heritage).join(", ")}`);
  if (pictures.some((p) => !p.ok)) problems.push("an empty picture");
  if (!check.pass) problems.push(`checkMock: ${check.failures.join(" | ")}`);
  console.log(`${problems.length ? "NO  " : "ok  "} ${file}  ${W} by ${H}  ${(bytes / 1024).toFixed(0)} KB${problems.length ? `\n      ${problems.join("\n      ")}` : ""}${check.notMeasured.length ? `\n      said for the eye: ${check.notMeasured.join(" | ")}` : ""}`);
  return { file, size: canvas, bytes, problems, check };
}

const asked = process.argv.slice(2).filter((a) => VARIANTS[a]);
const letters = asked.length ? asked : Object.keys(VARIANTS);
const screens = [];
for (const shot of PICTURES) {
  const s = await takeScreen(shot);
  if (Object.keys(s.heritage).length || s.empty) throw new Error(`${shot.id}: a heritage or an empty picture in view`);
  screens.push({ shot, ...s });
}
const resultsFile = path.join(HERE, "results.json");
const before = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")).pictures : [];
const made = [];
for (const letter of letters) {
  const [picture, feature] = DESIGN[letter];
  for (const { shot, png, picturesInView } of screens) {
    const file = `${letter}-${shot.device.id}-${shot.n}-${shot.id}.png`;
    made.push({ variant: letter, caption: shot.caption, route: shot.route, picturesInView, ...(await setAndTake(shot.device.canvas, picture(shot.device, shot), { "screen.png": png }, file)) });
  }
  made.push({ variant: letter, caption: FEATURE.line, route: null, ...(await setAndTake(FEATURE.canvas, feature(), {}, `${letter}-play-feature-graphic.png`)) });
}
await browser.close();

const all = [...before.filter((b) => !made.some((m) => m.file === b.file)), ...made].sort((a, b) => a.file.localeCompare(b.file));
fs.writeFileSync(resultsFile, `${JSON.stringify({ made: new Date().toISOString().slice(0, 10), day: DAY, checks: CHECKS, variants: VARIANTS, pictures: all }, null, 2)}\n`);
const failed = all.filter((p) => p.problems.length);
console.log(`\n${all.length} pictures, ${failed.length} with a problem.`);
process.exitCode = failed.length ? 1 : 0;
