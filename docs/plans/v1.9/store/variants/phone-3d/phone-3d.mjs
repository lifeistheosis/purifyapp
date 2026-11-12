#!/usr/bin/env node
// The phone in three dimensions, one sample for the owner (his word to this
// chat, 2026-11-12: "can you make the phone 3d?").
//
//   node docs/plans/v1.9/store/variants/phone-3d/phone-3d.mjs
//
// One picture: Play phone 01 (Today) on design A1's back (Dawn), the screen
// the set's own, taken exactly as ../../make.mjs takes it. What is new is the
// body: a solid slab with real thickness, turned in perspective, with a lit
// front edge, a shaded side and a shadow on the hill behind it.
//
// It is a plain slab and not a model of any phone: no camera, no speaker, no
// button, no maker's shape. Apple's marketing guidelines forbid "rendering in
// 3D or creating any simulation of an Apple product" and allow a generic
// device only without details unique to Apple's; Play recommends against
// device imagery (advice, not a requirement). ../README.md has both in full.
//
// Built from boxes the browser turns in space: the face, and behind it a
// stack of thin leaves that make the side. Every colour is a palette token.

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

const DESIGNS = { "3D": { name: "The phone in 3D", idea: "A solid slab with real thickness, turned in perspective, on A1's hills. No hardware is drawn." } };

// ── The page ─────────────────────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);

const ink = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, transparent)`;
const accent = (pct) => `color-mix(in srgb, var(--color-gold) ${pct}%, transparent)`;
const plane = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, var(--color-night))`;

function picture() {
  // A1's hills: each one wide circle, seen only at its crown. Farthest first.
  const hills = [
    { cx: W * 0.2, crest: H * 0.5, R: W * 1.55, fill: plane(4), stroke: ink(14) },
    { cx: W * 0.88, crest: H * 0.6, R: W * 1.3, fill: plane(6.5), stroke: ink(22) },
    { cx: W * 0.42, crest: H * 0.735, R: W * 2.0, fill: plane(9.5), stroke: accent(70) },
  ];
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
  [data-back] { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(ellipse ${r(W * 0.7)}px ${r(H * 0.14)}px at 46% ${r(H * 0.725)}px, ${ink(16)}, transparent 72%); }
  [data-back] svg { position: absolute; top: ${CAP}px; inset-inline: 0; width: 100%; height: ${H - CAP}px; }
  :root[dir="rtl"] [data-back] svg { transform: scaleX(-1); }
  [data-store-caption] { position: absolute; top: 0; inset-inline: 0; box-sizing: border-box; height: ${CAP}px; margin: 0; padding: ${r(CAP * 0.1)}px ${r(W * 0.07)}px 0; display: flex; align-items: center; justify-content: center; text-align: center; text-wrap: balance; font-family: var(--font-heading); font-weight: 600; font-size: 66px; line-height: 1.16; letter-spacing: -0.01em; color: var(--color-paper); }
  [data-stage] { position: absolute; top: ${BY}px; inset-inline-start: ${BX}px; width: ${BW}px; height: ${BH}px; perspective: ${r(W * 3.2)}px; perspective-origin: 50% 42%; }
  [data-body] { position: absolute; inset: 0; transform: ${turn(1)}; transform-style: preserve-3d; }
  :root[dir="rtl"] [data-body] { transform: ${turn(-1)}; }
  [data-leaf], [data-cast] { position: absolute; inset: 0; border-radius: ${RADIUS + RIM}px; }
  /* The shadow the body casts on the hills behind it. */
  [data-cast] { transform: translateZ(${-DEEP - 2}px); box-shadow: ${r(W * 0.05)}px ${r(W * 0.07)}px ${r(W * 0.11)}px ${r(W * 0.01)}px color-mix(in srgb, var(--color-night-deep) 96%, transparent); }
  :root[dir="rtl"] [data-cast] { box-shadow: ${-r(W * 0.05)}px ${r(W * 0.07)}px ${r(W * 0.11)}px ${r(W * 0.01)}px color-mix(in srgb, var(--color-night-deep) 96%, transparent); }
  [data-store-screen] { position: absolute; inset: 0; box-sizing: border-box; margin: 0; padding: ${RIM}px; border-radius: ${RADIUS + RIM}px; background-color: var(--color-night-deep); outline: ${EDGE}px solid ${ink(34)}; outline-offset: -${EDGE}px; }
  [data-store-screen] img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: ${RADIUS}px; }
</style>
</head>
<body>
<main data-store-picture>
  <div data-back aria-hidden="true"><svg viewBox="0 ${CAP} ${W} ${H - CAP}" preserveAspectRatio="none">${hills.map((h) => `<circle cx="${r(h.cx)}" cy="${r(h.crest + h.R)}" r="${r(h.R)}" style="fill:${h.fill};stroke:${h.stroke};stroke-width:${EDGE}"/>`).join("")}</svg></div>
  <h1 data-store-caption>${CAPTION}</h1>
  <div data-stage><div data-body><div data-cast aria-hidden="true"></div>${leaves.join("")}<figure data-store-screen><img alt="${ALT}" src="/__store/screen.png"></figure></div></div>
</main>
</body>
</html>`;
}

const MAKE = { "3D": picture };

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
  const ctx = await browser.newContext({ viewport: { width: VIEW[0], height: VIEW[1] }, deviceScaleFactor: (SW / VIEW[0]) * 1.25, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: ZONE, reducedMotion: "reduce" });
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
  // The new reader's one-question card, dismissed with its own button; tapped again if the page moved under the finger.
  const dismiss = p.locator('button[aria-label="Dismiss"]').first();
  await dismiss.waitFor({ state: "visible", timeout: 20000 });
  for (let tries = 0; tries < 4 && (await dismiss.isVisible()); tries++) {
    await wait(500);
    const box = await dismiss.boundingBox();
    if (box) await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await dismiss.waitFor({ state: "hidden", timeout: 2500 }).catch(() => {});
  }
  if (await dismiss.isVisible()) throw new Error("Today: the one-question card is still there");
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
  const file = "phone-3d-play-phone-01-today.png";
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
