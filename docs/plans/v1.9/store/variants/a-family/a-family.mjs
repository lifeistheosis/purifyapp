#!/usr/bin/env node
// Six designs in design A's family (Horizon), for the owner to settle the
// foundation the eight screens will share (his word of 2026-11-12, about
// 17:36 UTC: "I want each screen to be different but let's agree on a
// foundational design first", then "show a bunch of unique designs for the
// 1st design").
//
//   node docs/plans/v1.9/store/variants/a-family/a-family.mjs       all six
//   node docs/plans/v1.9/store/variants/a-family/a-family.mjs A3    one
//
// A's base is fixed in all six: the night ground, the screen upright, the
// line on top, the same screen (Play phone 01, Today, taken exactly as
// ../../make.mjs takes it). Only the back's language and its depth change:
//   A1  Dawn      three hills in layered planes, the nearest crest lit
//   A2  One line  a single sweeping curve and its faint echo
//   A3  Contours  the lines of a hill on a map
//   A4  Vesica    two wide circles crossing, the almond between them a plane
//   A5  Frame     a hairline frame whose head bends into an arch
//   A6  Low glow  one level line, a low light on it, plain dots above
// The accent is the house's own --color-gold token, used once in each. That
// token is a near-white grey: the app has no yellow gold (globals.css, 1.7.1,
// the owner's word), and checkMock's "gold" rule refuses one.
// Every drawing starts under the words, never across them; nothing fans out
// from a point; stars are plain dots; the scrollbar's room is off.

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

// ── The one picture: Play phone 01, Today ────────────────────────────────

const W = 1080;
const H = 1920;
const VIEW = [412, 846];
const CAPTION = "The day's saint, fast and readings";
const ALT = "Today: St Nicholas the Wonderworker, the Nativity Fast with fish allowed, and the day's verse.";
const CAP = r(H * 0.165); // the band the line stands in
const SW = r(W * 0.63); // the screen
const SH = Math.floor((SW * VIEW[1]) / VIEW[0]);
const SX = r((W - SW) / 2);
const SY = CAP;
const EDGE = 2;
const RIM = r(W * 0.011);
const RADIUS = r(SW * 0.07);

const DESIGNS = {
  A1: { name: "Dawn", idea: "Three hills in layered planes, each a step lighter as it comes nearer, the nearest crest lit and a low light behind it." },
  A2: { name: "One line", idea: "A single sweeping curve in a fine line, and its faint echo. Nothing else." },
  A3: { name: "Contours", idea: "The lines of a hill as a map draws them, every third a little stronger, the summit off to one side." },
  A4: { name: "Vesica", idea: "Two wide circles crossing. The almond between them is a plane the screen stands in, with their wider arcs outside it." },
  A5: { name: "Frame", idea: "A hairline frame round the whole picture whose head bends into an arch, a second line inside it." },
  A6: { name: "Low glow", idea: "One level line, a low light resting on it, and a few plain dots of stars above." },
};

// ── The page ─────────────────────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);

/** Ink at a strength: the palette's paper token, so it follows every palette. */
const ink = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, transparent)`;
/** The house's accent token at a strength. */
const accent = (pct) => `color-mix(in srgb, var(--color-gold) ${pct}%, transparent)`;
/** A plane a step off the ground. */
const plane = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, var(--color-night))`;

/** The drawing's own box: from under the words to the foot of the picture. */
const svg = (inner) => `<svg viewBox="0 ${CAP} ${W} ${H - CAP}" preserveAspectRatio="none">${inner}</svg>`;

const page = (css, back) => `<!doctype html>
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
  [data-store-screen] { position: absolute; box-sizing: border-box; margin: 0; top: ${SY - RIM}px; inset-inline-start: ${SX - RIM}px; width: ${SW + 2 * RIM}px; height: ${SH + 2 * RIM}px; padding: ${RIM}px; border-radius: ${RADIUS + RIM}px; background-color: var(--color-night-deep); outline: ${EDGE}px solid ${ink(22)}; box-shadow: 0 ${r(W * 0.04)}px ${r(W * 0.09)}px color-mix(in srgb, var(--color-night-deep) 94%, transparent); }
  [data-store-screen] img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: ${RADIUS}px; }
  [data-l] { fill: none; stroke-width: ${EDGE}; }
  ${css}
</style>
</head>
<body>
<main data-store-picture>
  <div data-back aria-hidden="true">${back}</div>
  <h1 data-store-caption>${CAPTION}</h1>
  <figure data-store-screen><img alt="${ALT}" src="/__store/screen.png"></figure>
</main>
</body>
</html>`;

// ── A1: Dawn ─────────────────────────────────────────────────────────────

function a1() {
  // Each hill is one wide circle, seen only at its crown. Farthest first.
  const hills = [
    { cx: W * 0.2, crest: H * 0.5, R: W * 1.55, fill: plane(4), stroke: ink(14) },
    { cx: W * 0.88, crest: H * 0.6, R: W * 1.3, fill: plane(6.5), stroke: ink(22) },
    { cx: W * 0.42, crest: H * 0.735, R: W * 2.0, fill: plane(9.5), stroke: accent(70) },
  ];
  const css = `[data-back] { background-image: radial-gradient(ellipse ${r(W * 0.7)}px ${r(H * 0.14)}px at 46% ${r(H * 0.725)}px, ${ink(16)}, transparent 72%); }`;
  return page(css, svg(hills.map((h) => `<circle cx="${r(h.cx)}" cy="${r(h.crest + h.R)}" r="${r(h.R)}" style="fill:${h.fill};stroke:${h.stroke};stroke-width:${EDGE}"/>`).join("")));
}

// ── A2: One line ─────────────────────────────────────────────────────────

function a2() {
  const curve = (dy) => `M ${-60} ${1560 + dy} C ${250} ${1640 + dy}, ${400} ${1130 + dy}, ${620} ${1010 + dy} S ${960} ${760 + dy}, ${1150} ${470 + dy}`;
  const css = `[data-l="1"] { stroke: ${accent(82)}; stroke-width: 3; stroke-linecap: round; } [data-l="2"] { stroke: ${ink(11)}; }`;
  return page(css, svg(`<path data-l="2" d="${curve(64)}"/><path data-l="1" d="${curve(0)}"/>`));
}

// ── A3: Contours ─────────────────────────────────────────────────────────

function a3() {
  // Closed lines round a summit, each a slow wobble of a circle, as a map draws a hill.
  const cx = W * 0.83;
  const cy = H * 0.8;
  const ring = (R, k) => {
    const pts = [];
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * Math.PI * 2;
      const rr = R * (1 + 0.085 * Math.sin(2 * t + 0.6 + k * 0.11) + 0.05 * Math.sin(3 * t + 1.9 - k * 0.07) + 0.022 * Math.sin(5 * t + k * 0.3));
      pts.push(`${(cx + rr * Math.cos(t) * 1.08).toFixed(1)},${(cy + rr * Math.sin(t) * 0.86).toFixed(1)}`);
    }
    return `M ${pts.join(" L ")} Z`;
  };
  const radii = [54, 128, 214, 312, 422, 544, 678, 824, 982, 1152, 1334];
  const css = `[data-l] { stroke: ${ink(9)}; } [data-l="strong"] { stroke: ${ink(20)}; } [data-l="summit"] { stroke: ${accent(75)}; fill: ${plane(7)}; }`;
  const lines = radii
    .map((R, k) => `<path data-l="${k === 0 ? "summit" : k % 3 === 0 ? "strong" : "fine"}" d="${ring(R, k)}"/>`)
    .reverse()
    .join("");
  return page(css, svg(lines));
}

// ── A4: Vesica ───────────────────────────────────────────────────────────

function a4() {
  // Two circles of one size, their centres apart: what both hold is the almond.
  const R = W * 1.15;
  const d = W * 0.76;
  const cy = H * 0.665;
  const top = cy - Math.sqrt(R * R - d * d);
  const bottom = cy + Math.sqrt(R * R - d * d);
  const almond = `M ${W / 2} ${top} A ${R} ${R} 0 0 1 ${W / 2} ${bottom} A ${R} ${R} 0 0 1 ${W / 2} ${top} Z`;
  const outer = [0.085, 0.19].map((g, i) => [-1, 1].map((side) => `<circle data-l="outer${i}" cx="${r(W / 2 + side * d)}" cy="${r(cy)}" r="${r(R + W * g)}"/>`).join("")).join("");
  const css = `[data-almond] { fill: ${plane(6.5)}; stroke: ${accent(60)}; stroke-width: ${EDGE}; } [data-l="outer0"] { stroke: ${ink(13)}; } [data-l="outer1"] { stroke: ${ink(7)}; }`;
  return page(css, svg(`${outer}<path data-almond d="${almond}"/>`));
}

// ── A5: Frame ────────────────────────────────────────────────────────────

function a5() {
  // Drawn as two boxes, not as a drawing across the words: the head of each is an arch, the foot square.
  const m = 30;
  const gap = 16;
  const crown = 250;
  const css = `
  [data-frame] { position: absolute; top: ${m}px; bottom: ${m}px; inset-inline: ${m}px; border-radius: ${(W - 2 * m) / 2}px ${(W - 2 * m) / 2}px 14px 14px / ${crown}px ${crown}px 14px 14px; background-color: ${plane(3.5)}; outline: ${EDGE}px solid ${accent(46)}; }
  [data-frame="2"] { top: ${m + gap}px; bottom: ${m + gap}px; inset-inline: ${m + gap}px; border-radius: ${(W - 2 * m - 2 * gap) / 2}px ${(W - 2 * m - 2 * gap) / 2}px 6px 6px / ${crown - gap}px ${crown - gap}px 6px 6px; background-color: transparent; outline-color: ${ink(13)}; }`;
  return page(css, `<div data-frame="1"></div><div data-frame="2"></div>`);
}

// ── A6: Low glow ─────────────────────────────────────────────────────────

function a6() {
  const y = r(H * 0.8);
  // A few plain dots, set by a fixed rule so the picture is the same every time.
  let seed = 7;
  const next = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const dots = [];
  while (dots.length < 46) {
    const x = next() * W;
    const dy = CAP + 30 + next() * (y - CAP - 190);
    const size = 1.4 + next() * 2.2;
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${dy.toFixed(1)}" r="${size.toFixed(1)}" style="fill:${ink(r(22 + next() * 38))}"/>`);
  }
  const css = `
  [data-back] { background-image: radial-gradient(ellipse ${r(W * 0.86)}px ${r(H * 0.13)}px at 50% ${y}px, ${ink(22)}, transparent 70%); }
  [data-ground] { fill: ${plane(5)}; }
  [data-l="1"] { stroke: ${accent(78)}; }`;
  return page(css, svg(`${dots.join("")}<rect data-ground x="${-10}" y="${y}" width="${W + 20}" height="${H - y + 10}"/><path data-l="1" d="M ${-10} ${y} L ${W + 10} ${y}"/>`));
}

const MAKE = { A1: a1, A2: a2, A3: a3, A4: a4, A5: a5, A6: a6 };

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

async function takeScreen() {
  const ctx = await browser.newContext({ viewport: { width: VIEW[0], height: VIEW[1] }, deviceScaleFactor: SW / VIEW[0], colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: ZONE, reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  });
  await ctx.addInitScript(android);
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(/^https:\/\/purifyapp\.net\/.*\.(avif|jpe?g|png|webp)(\?.*)?$/, (route) => route.continue());
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date(DAY) });
  await go(p, "/");
  await p.waitForLoadState("networkidle").catch(() => {});
  await wait(1500);
  const dismiss = p.locator('button[aria-label="Dismiss"]').first();
  await dismiss.waitFor({ state: "visible", timeout: 20000 });
  const box = await dismiss.boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await wait(600);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForLoadState("networkidle").catch(() => {});
  await wait(1800);
  const inView = (await p.evaluate(picturesOnPage)).filter((x) => x.inView);
  const png = await p.screenshot({ type: "png" });
  await ctx.close();
  const heritage = heritageNamedIn(inView.map((x) => x.src).join("\n"));
  if (Object.keys(heritage).length || inView.some((x) => !x.ok)) throw new Error("Today: a heritage or an empty picture in view");
  return { png, picturesInView: [...new Set(inView.map((x) => x.src.replace(ORIGIN, "")))] };
}

async function take(id, html, screen) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US", reducedMotion: "reduce" });
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(`${ORIGIN}/__store/**`, (route) => {
    const name = new URL(route.request().url()).pathname.replace("/__store/", "");
    if (name === "page.html") return route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
    if (name === "screen.png") return route.fulfill({ contentType: "image/png", body: screen });
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
  const result = await checkMock(p, "[data-store-picture]");
  await ctx.close();
  const file = `${id}-play-phone-01-today.png`;
  const out = await sharp(shot).removeAlpha().png({ compressionLevel: 9, effort: 10 }).toBuffer();
  const meta = await sharp(out).metadata();
  if (meta.width !== W || meta.height !== H || meta.channels !== 3) throw new Error(`${file}: ${meta.width} by ${meta.height}`);
  fs.writeFileSync(path.join(HERE, file), out);
  const failures = [...new Set(result.failures.map((f) => `${f.check}${f.palette ? ` (${f.palette})` : ""}: ${f.what}: ${f.detail}`))];
  const problems = [...failures.map((f) => `checkMock: ${f}`), ...(gutter === "auto" ? [] : [`the scrollbar's room is ${gutter}`])];
  console.log(`${problems.length ? "NO  " : "ok  "} ${file}  ${(out.length / 1024).toFixed(0)} KB${problems.length ? `\n      ${problems.join("\n      ")}` : ""}${result.unmeasured.length ? `\n      said for the eye: ${result.unmeasured.join(" | ")}` : ""}`);
  return { id, file, size: [W, H], bytes: out.length, problems, check: { pass: failures.length === 0, failures, notMeasured: result.unmeasured, allowed: result.allowed } };
}

const asked = process.argv.slice(2).filter((a) => DESIGNS[a]);
const ids = asked.length ? asked : Object.keys(DESIGNS);
const screen = await takeScreen();
const resultsFile = path.join(HERE, "results.json");
const before = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")).pictures : [];
const made = [];
for (const id of ids) made.push({ ...(await take(id, MAKE[id](), screen.png)), name: DESIGNS[id].name, idea: DESIGNS[id].idea, picturesInView: screen.picturesInView });
await browser.close();
const all = [...before.filter((b) => !made.some((m) => m.file === b.file)), ...made].sort((a, b) => a.file.localeCompare(b.file));
fs.writeFileSync(resultsFile, `${JSON.stringify({ made: new Date().toISOString().slice(0, 10), day: DAY, checks: CHECKS, pictures: all }, null, 2)}\n`);
const failed = all.filter((x) => x.problems.length);
console.log(`\n${all.length} pictures, ${failed.length} with a problem.`);
process.exitCode = failed.length ? 1 : 0;
