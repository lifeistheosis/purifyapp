#!/usr/bin/env node
// A third round: four bolder backgrounds, black and white, behind the phone
// in 3D with the lifted card (the owner's word to the store pictures chat,
// 2026-11-12: "keep the black and white design. 1 is cool widget
// implementation and visual hook but I need a better background design").
//
//   node docs/plans/v1.9/store/variants/round-3/round-3.mjs       all four
//   node docs/plans/v1.9/store/variants/round-3/round-3.mjs P2    one
//
// One picture each: Play phone 01 (Today). The phone and the lifted card are
// exactly as ../round-2/ N1 has them. The earlier backs were fine lines, and
// the phone hid most of them, so these are made of large shapes and stronger
// light, which read round a phone:
//   P1  Studio  a wall with one strong pool of light, a floor, a shadow
//   P2  Nimbus  one great disc behind the phone, a bright rim, a ring
//   P3  Sweep   two great arcs crossing the picture in two tones
//   P4  Mosaic  a field of tesserae in greys, rising from the floor
// Black and white only: every colour is the palette's paper over its night.

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
const ALT2 = "The journal's page for Sunday, behind.";
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

const DESIGNS = {
  P1: { name: "Studio", idea: "A wall with one strong pool of light behind the phone, a floor it stands over, and its shadow on the floor." },
  P2: { name: "Nimbus", idea: "One great disc behind the phone with a bright rim and a single ring round it, and a few plain dots of stars." },
  P3: { name: "Sweep", idea: "Two great arcs crossing the whole picture in two tones, the nearer one edged in light." },
  P4: { name: "Mosaic", idea: "A field of tesserae in greys rising from the floor and thinning into the dark, as on a church wall." },
};

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

function studio() {
  const floor = r(H * 0.865);
  return {
    css: `[data-back] { background-image: radial-gradient(ellipse ${r(W * 0.5)}px ${r(H * 0.035)}px at 47% ${r(H * 0.948)}px, color-mix(in srgb, var(--color-night-deep) 96%, transparent), transparent 100%), radial-gradient(ellipse ${r(W * 0.74)}px ${r(H * 0.4)}px at 50% ${r(H * 0.52)}px, ${ink(31)}, transparent 72%); }`,
    html: svg(`<rect x="-10" y="${floor}" width="${W + 20}" height="${H - floor + 10}" style="fill:${plane(9)}"/>${line(`M -10 ${floor} L ${W + 10} ${floor}`, accent(46))}`),
  };
}

function nimbus() {
  const cx = W * 0.5;
  const cy = H * 0.565;
  const R = W * 0.585;
  return {
    css: "",
    html: svg(`${dots(30, CAP + 20, H * 0.33)}<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(R + W * 0.075)}" style="fill:none;stroke:${ink(13)};stroke-width:${EDGE}"/><circle cx="${r(cx)}" cy="${r(cy)}" r="${r(R)}" style="fill:${plane(10)};stroke:${accent(82)};stroke-width:3"/><circle cx="${r(cx)}" cy="${r(cy)}" r="${r(R - W * 0.07)}" style="fill:none;stroke:${ink(10)};stroke-width:${EDGE}"/>`),
  };
}

function sweep() {
  // Two wide circles with one centre, off the picture's corner; each is seen as one great arc.
  const cx = -W * 0.25;
  const cy = H * 1.05;
  return {
    css: `[data-back] { background-image: radial-gradient(ellipse ${r(W * 0.7)}px ${r(H * 0.24)}px at 30% ${r(H * 0.62)}px, ${ink(13)}, transparent 72%); }`,
    html: svg(`<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(W * 1.56)}" style="fill:${plane(5.5)};stroke:${ink(16)};stroke-width:${EDGE}"/><circle cx="${r(cx)}" cy="${r(cy)}" r="${r(W * 1.25)}" style="fill:${plane(11.5)};stroke:${accent(80)};stroke-width:3"/>`),
  };
}

function mosaic() {
  // Tesserae: small squares a little unlike one another, set by a fixed rule so the picture is the same every time.
  let seed = 11;
  const next = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const size = 52;
  const gap = 7;
  const step = size + gap;
  const top = H * 0.4;
  const tiles = [];
  for (let y = H + 20; y > top; y -= step) {
    const depth = (y - top) / (H - top); // 0 at the top of the field, 1 at the floor
    for (let x = -20; x < W + 20; x += step) {
      const chance = next();
      if (chance > 0.18 + depth * 0.9) continue; // thinner toward the dark
      const tone = 2.5 + next() * 4 + depth * (4 + next() * 9);
      const jx = (next() - 0.5) * 5;
      const jy = (next() - 0.5) * 5;
      const s = size + (next() - 0.5) * 6;
      const bright = next() > 0.965 && depth > 0.35;
      tiles.push(`<rect x="${(x + jx).toFixed(1)}" y="${(y + jy).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" rx="5" style="fill:${bright ? accent(38) : plane(tone.toFixed(1))}"/>`);
    }
  }
  return {
    css: `[data-back] { background-image: radial-gradient(ellipse ${r(W * 0.8)}px ${r(H * 0.2)}px at 50% ${r(H * 0.5)}px, ${ink(12)}, transparent 72%); }`,
    html: svg(tiles.join("")),
  };
}

function picture(back, add = {}) {
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
  :root[dir="rtl"] [data-body] { transform: ${turn(-1)}; }
  [data-leaf], [data-cast] { position: absolute; inset: 0; border-radius: ${RADIUS + RIM}px; }
  /* The shadow the body casts on the hills behind it. */
  [data-cast] { transform: translateZ(${-DEEP - 2}px); box-shadow: ${r(W * 0.05)}px ${r(W * 0.07)}px ${r(W * 0.11)}px ${r(W * 0.01)}px color-mix(in srgb, var(--color-night-deep) 96%, transparent); }
  :root[dir="rtl"] [data-cast] { box-shadow: ${-r(W * 0.05)}px ${r(W * 0.07)}px ${r(W * 0.11)}px ${r(W * 0.01)}px color-mix(in srgb, var(--color-night-deep) 96%, transparent); }
  [data-store-screen] { position: absolute; inset: 0; box-sizing: border-box; margin: 0; padding: ${RIM}px; border-radius: ${RADIUS + RIM}px; background-color: var(--color-night-deep); outline: ${EDGE}px solid ${ink(34)}; outline-offset: -${EDGE}px; }
  [data-store-screen] img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: ${RADIUS}px; }
  ${back.css}
  ${add.sign ? `[data-store-sign] { position: absolute; top: ${r(CAP * 0.15)}px; inset-inline: 0; margin: 0; display: flex; align-items: center; justify-content: center; gap: 14px; font-family: var(--font-sans); font-weight: 700; font-size: 32px; line-height: 1; letter-spacing: -0.01em; color: var(--color-paper); }
  [data-cross] { display: block; width: 21px; height: 37px; background-color: var(--color-paper); -webkit-mask: url(/purify-cross-mark.png) center / contain no-repeat; mask: url(/purify-cross-mark.png) center / contain no-repeat; }
  [data-store-caption] { padding-top: ${r(CAP * 0.36)}px; font-size: 62px; }` : ""}
  ${add.lift ? `[data-lift] { position: absolute; left: ${(RIM + add.lift.x * K).toFixed(1)}px; top: ${(RIM + add.lift.y * K).toFixed(1)}px; width: ${(add.lift.w * K).toFixed(1)}px; height: ${(add.lift.h * K).toFixed(1)}px; border-radius: ${(add.lift.radius * K).toFixed(1)}px; transform: translate3d(${-r(BW * 0.13)}px, ${-r(BW * 0.02)}px, ${r(W * 0.15)}px); outline: ${EDGE}px solid ${ink(30)}; box-shadow: ${r(W * 0.03)}px ${r(W * 0.05)}px ${r(W * 0.07)}px color-mix(in srgb, var(--color-night-deep) 96%, transparent); }
  :root[dir="rtl"] [data-lift] { transform: translate3d(${r(BW * 0.13)}px, ${-r(BW * 0.02)}px, ${r(W * 0.15)}px); }` : ""}
  ${add.second ? `[data-stage="2"] { top: ${BY - r(H * 0.02)}px; inset-inline-start: ${BX + r(BW * 0.43)}px; transform: scale(0.88); }
  [data-store-screen="2"] img { opacity: 0.8; }` : ""}
</style>
</head>
<body>
<main data-store-picture>
  <div data-back aria-hidden="true">${back.html}</div>
  ${add.sign ? `<p data-store-sign><span data-cross aria-hidden="true"></span>Purify</p>` : ""}
  <h1 data-store-caption>${CAPTION}</h1>
  ${add.second ? `<div data-stage="2"><div data-body><div data-cast aria-hidden="true"></div>${leaves.join("")}<figure data-store-screen="2"><img alt="${ALT2}" src="/__store/second.png"></figure></div></div>` : ""}
  <div data-stage><div data-body><div data-cast aria-hidden="true"></div>${leaves.join("")}<figure data-store-screen><img alt="${ALT}" src="/__store/screen.png"></figure>${add.lift ? `<img data-lift alt="" aria-hidden="true" src="/__store/card.png">` : ""}</div></div>
</main>
</body>
</html>`;
}

const MAKE = { P1: (x) => picture(studio(), { lift: x.card }), P2: (x) => picture(nimbus(), { lift: x.card }), P3: (x) => picture(sweep(), { lift: x.card }), P4: (x) => picture(mosaic(), { lift: x.card }) };

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
  // The Nativity star card, as it stands on the screen: its place, its corners and its own pixels.
  const star = p.locator("[data-nativity-star]").first();
  const box = await star.boundingBox();
  const radius = await star.evaluate((el) => {
    for (let e = el; e; e = e.parentElement) {
      const v = parseFloat(getComputedStyle(e).borderTopLeftRadius);
      if (v > 0) return v;
    }
    return 0;
  });
  const card = { png: await star.screenshot({ type: "png" }), x: box.x, y: box.y, w: box.width, h: box.height, radius };
  // The journal, for the second screen.
  await go(p, "/journal");
  await p.waitForSelector("[data-journal-today]", { timeout: 30000 });
  await p.waitForLoadState("networkidle").catch(() => {});
  await wait(1500);
  const secondInView = (await p.evaluate(picturesOnPage)).filter((x) => x.inView);
  if (Object.keys(heritageNamedIn(secondInView.map((x) => x.src).join("\n"))).length) throw new Error("the journal: a heritage picture in view");
  const second = await p.screenshot({ type: "png" });
  await ctx.close();
  const heritage = heritageNamedIn(inView.map((x) => x.src).join("\n"));
  if (Object.keys(heritage).length || inView.some((x) => !x.ok)) throw new Error("Today: a heritage or an empty picture in view");
  return { png, card, second, picturesInView: [...new Set(inView.map((x) => x.src.replace(ORIGIN, "")))] };
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
  const file = `${id}-play-phone-01-today.png`;
  const out = await sharp(shot).removeAlpha().png({ compressionLevel: 9, effort: 10 }).toBuffer();
  const meta = await sharp(out).metadata();
  if (meta.width !== W || meta.height !== H || meta.channels !== 3) throw new Error(`${file}: ${meta.width} by ${meta.height}`);
  fs.writeFileSync(path.join(HERE, file), out);
  const failures = [...new Set(result.failures.map((f) => `${f.check}${f.palette ? ` (${f.palette})` : ""}: ${f.what}: ${f.detail}`))];
  const problems = [...failures.map((f) => `checkMock: ${f}`), ...(gutter === "auto" ? [] : [`the scrollbar's room is ${gutter}`]), ...(listed.length ? [`heritage: ${listed.join(", ")}`] : []), ...(empty ? ["an empty picture"] : [])];
  console.log(`${problems.length ? "NO  " : "ok  "} ${file}  ${(out.length / 1024).toFixed(0)} KB${problems.length ? `\n      ${problems.join("\n      ")}` : ""}${result.unmeasured.length ? `\n      said for the eye: ${result.unmeasured.join(" | ")}` : ""}`);
  return { id, file, size: [W, H], bytes: out.length, problems, check: { pass: failures.length === 0, failures, notMeasured: result.unmeasured, allowed: result.allowed } };
}

const asked = process.argv.slice(2).filter((a) => DESIGNS[a]);
const ids = asked.length ? asked : Object.keys(DESIGNS);
const screen = await takeScreen();
const resultsFile = path.join(HERE, "results.json");
const before = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")).pictures : [];
const made = [];
for (const id of ids) made.push({ ...(await take(id, MAKE[id](screen), { "screen.png": screen.png, "card.png": screen.card.png, "second.png": screen.second })), name: DESIGNS[id].name, idea: DESIGNS[id].idea, picturesInView: screen.picturesInView });
await browser.close();
const all = [...before.filter((b) => !made.some((m) => m.file === b.file)), ...made].sort((a, b) => a.file.localeCompare(b.file));
fs.writeFileSync(resultsFile, `${JSON.stringify({ made: new Date().toISOString().slice(0, 10), day: DAY, checks: CHECKS, pictures: all }, null, 2)}\n`);
const failed = all.filter((x) => x.problems.length);
console.log(`\n${all.length} pictures, ${failed.length} with a problem.`);
process.exitCode = failed.length ? 1 : 0;
