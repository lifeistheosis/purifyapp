#!/usr/bin/env node
// Purify 1.9's store pictures, made from the app and never drawn.
//
//   node docs/plans/v1.9/store/make.mjs            the whole set
//   node docs/plans/v1.9/store/make.mjs play-phone  one device (or "feature")
//   node docs/plans/v1.9/store/make.mjs fathers     one screen on every device
//
// What it does, for each device and each screen:
//   1. opens the native export (out/, after `npm run build:android`) the way
//      the phones' shells answer it (scripts/lib/shell-server.mjs), at the
//      device's own size, as a new reader with no Plus, on the night palette;
//   2. goes to the screen and does what a reader's finger would (nothing is
//      injected into the page), then looks at what is in view: every picture
//      is held against lib/marketing/heritagePictures.ts, no picture may be
//      empty, and the words in view may not name a campaign;
//   3. takes the screen, then runs checkMock on the app's own page;
//   4. sets the screen under its caption on a page that wears the app's own
//      stylesheet (its palette tokens and its type), runs checkMock on that
//      page, and writes the picture at the store's exact size.
// The feature graphic is the same kind of page: the app's cross, its
// wordmark as the app sets it, and the listing's own line.
//
// Nothing leaves this machine except pictures the app itself asks of
// purifyapp.net (some covers are not in the bundle), as on a phone with
// signal. It writes into this folder only: the pictures, results.json and
// README.md.
//
// The export this set was made from was cut as the store build is, with Plus
// locked, so every screen is the one a new reader meets:
//   NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android
// (the key is a stand-in, a word and not a key, as scripts/mock-journal.mjs
// explains; the page is told it is the Android shell, where Plus is sold).

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const OUT = path.join(ROOT, "out");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { checkMock, CHECKS, BY_EYE } = await import(at("scripts/mock-check.mjs"));
const { NATIVE_UA, ORIGIN, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { heritageNamedIn } = await import(at("lib/marketing/heritagePictures.ts"));

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first");

// ── What is shown ────────────────────────────────────────────────────────

/** The day every screen is taken on: the feast of St Nicholas, in the Nativity Fast. */
const DAY = "2026-12-06T09:30:00-05:00";
const ZONE = "America/New_York";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Tap the middle of what a selector finds, as a finger does. */
async function tap(page, selector) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 20000 });
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

/** The eight screens, in the order every device tells them. */
const SHOTS = [
  {
    n: "01",
    id: "today",
    caption: "The day's saint, fast and readings",
    route: "/",
    state: "Today on 6 December 2026, the new reader's one-question card dismissed with its own Dismiss button.",
    alt: "Today: St Nicholas the Wonderworker, the Nativity Fast with fish allowed, and the day's verse.",
    async prepare(page) {
      await tap(page, 'button[aria-label="Dismiss"]');
      await wait(600);
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  },
  {
    n: "02",
    id: "greek",
    caption: "The Greek beside the verse",
    route: "/bible/john/1",
    state: "John 1 with Interlinear Greek switched on (More actions, Interlinear Greek); free for every reader.",
    alt: "The Gospel of John, chapter 1, in English with the Greek beside each verse.",
    seed: { "purify:interlinear": "1" },
    async prepare(page) {
      await page.waitForSelector('button[aria-label^="Look up"]', { timeout: 30000 });
    },
  },
  {
    n: "03",
    id: "fathers",
    caption: "The Fathers on the verse you are reading",
    route: "/bible/genesis/1",
    state: "Genesis 1, the commentary opened on verse 1: St Basil the Great, Hexaemeron, Homily 1, his own words as NPNF prints them.",
    alt: "Patristic commentary on Genesis 1:1: St Basil the Great, Hexaemeron, Homily 1.",
    seed: { "purify:interlinear": "1" },
    async prepare(page) {
      await tap(page, 'button[aria-label="Open commentary on verse 1"]');
      await page.getByText("It is right that any one beginning").first().waitFor({ state: "visible", timeout: 30000 });
    },
  },
  {
    n: "04",
    id: "journal",
    caption: "A journal kept by the Church's day",
    route: "/journal",
    state: "The journal as a new reader opens it: the day's page, its saint, its fast and its readings, each with a pen.",
    alt: "The journal's page for Sunday: the day's saint, the fast, and the Epistle and Gospel, each with a pen.",
    async prepare(page) {
      await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    },
  },
  {
    n: "05",
    id: "prayers",
    caption: "The daily prayers, morning and evening",
    route: "/prayers",
    state: "Prayers as it opens.",
    alt: "Prayers: your rule, and the morning prayers, the evening prayers and the Hours.",
  },
  {
    n: "06",
    id: "saint",
    caption: "The lives of the saints",
    route: "/saints/basil-the-great",
    state: "St Basil the Great's page, on Life.",
    alt: "St Basil the Great: his icon, his feast, and his life.",
  },
  {
    n: "07",
    id: "calendar",
    caption: "Every feast and every fast",
    route: "/calendar",
    state: "The Church calendar on December 2026, the New reckoning, the day's fast under it.",
    alt: "The Church calendar for December 2026, each day marked with its feast or its fast.",
  },
  {
    n: "08",
    id: "reading",
    caption: "The Fathers, read in full",
    route: "/saints/athanasius-the-great/on-the-incarnation",
    state: "St Athanasius the Great, On the Incarnation, opened from the reading room.",
    alt: "On the Incarnation of the Word, by St Athanasius the Great, opened at chapter 1.",
  },
];

/**
 * The five devices. `canvas` is the store's size for the picture, `viewport`
 * the device's own screen in CSS pixels (for the Android phone, the part of
 * a 412 by 915 screen the app draws in, under the status bar and above the
 * gesture bar), `type` the caption's size and `round` the screen's corners.
 */
const DEVICES = [
  { id: "play-phone", store: "Google Play", name: "Phone", canvas: [1080, 1920], viewport: [412, 846], type: 66, round: 0.07 },
  { id: "play-tablet-7", store: "Google Play", name: "7-inch tablet", canvas: [1440, 2560], viewport: [600, 960], type: 80, round: 0.03 },
  { id: "play-tablet-10", store: "Google Play", name: "10-inch tablet", canvas: [1800, 3200], viewport: [800, 1280], type: 96, round: 0.025 },
  { id: "appstore-iphone-6.9", store: "App Store", name: "iPhone 6.9-inch", canvas: [1320, 2868], viewport: [440, 956], type: 82, round: 0.09 },
  { id: "appstore-ipad-13", store: "App Store", name: "iPad 13-inch", canvas: [2064, 2752], viewport: [1032, 1376], type: 100, round: 0.022 },
];

const FEATURE = {
  id: "play-feature-graphic",
  file: "play-feature-graphic.png",
  canvas: [1024, 500],
  line: "The Orthodox prayer book, Bible, saints, and calendar, in one quiet app.",
};

/** Where the screen sits on the canvas: the caption above (under a fifth of the picture), the whole screen under it. */
function layout({ canvas: [W, H], viewport: [vw, vh] }) {
  const captionH = Math.round(H * 0.165);
  const bottom = Math.round(H * 0.03);
  let cardH = H - captionH - bottom;
  let cardW = Math.round((cardH * vw) / vh);
  const widest = Math.round(W * 0.88);
  if (cardW > widest) cardW = widest;
  const scale = cardW / vw;
  cardH = Math.floor(vh * scale);
  return { W, H, captionH, bottom, cardW, cardH, scale };
}

// ── The app's own document, for the pages the pictures are set on ────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
if (!SHEETS.length) throw new Error("the front door names no stylesheet");

const head = (W, H, css) => `<!doctype html>
<html lang="en" dir="ltr" class="${HTML_CLASS}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, initial-scale=1">
${SHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night); }
  ${css}
</style>
</head>`;

/** A screen under its caption. Every colour is one of the app's palette tokens; the light is one soft pool from above. */
function picturePage(device, shot, L) {
  const { W, H, captionH, cardW, cardH } = L;
  const radius = Math.round(cardW * device.round);
  return `${head(
    W,
    H,
    `
  [data-store-picture] {
    box-sizing: border-box; width: ${W}px; height: ${H}px; display: flex; flex-direction: column; align-items: center;
    background-color: var(--color-night);
    background-image: radial-gradient(ellipse 90% ${Math.round(captionH * 1.9)}px at 50% 0%, color-mix(in srgb, var(--color-paper) 9%, transparent), transparent 72%);
  }
  [data-store-caption] {
    box-sizing: border-box; height: ${captionH}px; width: 100%; margin: 0; padding: ${Math.round(captionH * 0.1)}px ${Math.round(W * 0.07)}px 0;
    display: flex; align-items: center; justify-content: center; text-align: center; text-wrap: balance;
    font-family: var(--font-heading); font-weight: 600; font-size: ${device.type}px; line-height: 1.16; letter-spacing: -0.01em;
    color: var(--color-paper);
  }
  [data-store-screen] {
    box-sizing: content-box; display: block; margin: 0; width: ${cardW}px; height: ${cardH}px; overflow: hidden;
    border-radius: ${radius}px;
    outline: ${Math.max(2, Math.round(W / 540))}px solid color-mix(in srgb, var(--color-paper) 14%, transparent);
    background-color: var(--color-night-soft);
  }
  [data-store-screen] img { display: block; width: ${cardW}px; height: ${cardH}px; object-fit: cover; object-position: top; }
`,
  )}
<body>
<main data-store-picture>
  <h1 data-store-caption>${shot.caption}</h1>
  <figure data-store-screen><img alt="${shot.alt}" src="/__store/screen.png" width="${cardW}" height="${cardH}"></figure>
</main>
</body>
</html>`;
}

/** The feature graphic: the app's cross, its wordmark as the app sets it (the sans, bold), and the listing's line. */
function featurePage() {
  const [W, H] = FEATURE.canvas;
  return `${head(
    W,
    H,
    `
  [data-store-picture] {
    box-sizing: border-box; width: ${W}px; height: ${H}px; display: flex; flex-direction: column; align-items: center; justify-content: center;
    background-color: var(--color-night);
    background-image: radial-gradient(ellipse 62% 78% at 50% 34%, color-mix(in srgb, var(--color-paper) 11%, transparent), transparent 74%);
  }
  [data-store-mark] { display: block; height: 124px; width: auto; }
  [data-store-wordmark] { margin: 26px 0 0; font-family: var(--font-sans); font-weight: 700; font-size: 76px; line-height: 1; letter-spacing: -0.01em; color: var(--color-paper); }
  [data-store-line] { margin: 22px 0 0; max-width: 640px; text-align: center; text-wrap: balance; font-family: var(--font-serif); font-size: 25px; line-height: 1.36; color: color-mix(in srgb, var(--color-paper) 82%, transparent); }
`,
  )}
<body>
<main data-store-picture>
  <img data-store-mark alt="" src="/purify-cross-mark.png">
  <p data-store-wordmark>Purify</p>
  <p data-store-line>${FEATURE.line}</p>
</main>
</body>
</html>`;
}

// ── In the page ──────────────────────────────────────────────────────────

/** Every picture the page draws, and whether any of it is inside the screen. */
function picturesOnPage() {
  const vw = innerWidth;
  const vh = innerHeight;
  const seen = [];
  const add = (src, r, how, ok = true) => {
    if (!src || src === "none") return;
    seen.push({ src: src.startsWith("data:") ? `${src.slice(0, 32)}...` : src, how, ok, inView: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw });
  };
  const urls = (value) => [...String(value ?? "").matchAll(/url\((["']?)(.*?)\1\)/g)].map((m) => m[2]);
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (el.tagName === "IMG") add(el.currentSrc || el.src, r, "img", el.complete && el.naturalWidth > 0);
    if (el.tagName === "image") add(el.href?.baseVal, r, "svg image");
    if (el.tagName === "VIDEO") add(el.poster, r, "poster");
    for (const pseudo of [null, "::before", "::after"]) {
      const s = pseudo ? getComputedStyle(el, pseudo) : cs;
      for (const prop of ["backgroundImage", "maskImage", "webkitMaskImage", "borderImageSource", "content", "listStyleImage"]) {
        for (const u of urls(s[prop])) add(u, r, pseudo ? `${prop} ${pseudo}` : prop);
      }
    }
  }
  return seen;
}

/** The words a reader can see on the screen as it stands. */
function wordsInView() {
  const vh = innerHeight;
  const vw = innerWidth;
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || el.closest("script, style, noscript, .sr-only")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) out.push(text);
  }
  return out.join(" \n");
}

/** The Android shell, as far as the app's own check goes: Plus is sold there (scripts/mock-journal.mjs). */
function android() {
  window.androidBridge = { postMessage() {} };
  window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
}

// ── The work ─────────────────────────────────────────────────────────────

const browserPath = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(browserPath) ? { executablePath: browserPath } : {});

/** What checkMock found, kept short for the record. */
function verdict(result) {
  const failed = [...new Set(result.failures.map((f) => f.check))];
  return {
    pass: result.failures.length === 0,
    ok: CHECKS.filter((c) => !failed.includes(c)),
    failures: result.failures.map((f) => `${f.check}${f.palette ? ` (${f.palette})` : ""}: ${f.what}: ${f.detail}`),
    notMeasured: result.unmeasured,
    allowed: result.allowed,
  };
}

/** PNG, 24-bit, no alpha, at exactly the store's size. */
async function writePng(buffer, file, [W, H]) {
  const out = await sharp(buffer).removeAlpha().png({ compressionLevel: 9, effort: 10 }).toBuffer();
  const meta = await sharp(out).metadata();
  if (meta.width !== W || meta.height !== H || meta.channels !== 3 || meta.hasAlpha) throw new Error(`${file}: ${meta.width} by ${meta.height}, ${meta.channels} channels; wanted ${W} by ${H}, 3`);
  fs.writeFileSync(path.join(HERE, file), out);
  return out.length;
}

/** A page that wears the app's stylesheet, with `files` answered under /__store/. */
async function setPage([W, H], html, files = {}) {
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
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
  });
  await wait(300);
  return { ctx, page };
}

async function takeShot(device, shot) {
  const L = layout(device);
  const [vw, vh] = device.viewport;
  const ctx = await browser.newContext({
    viewport: { width: vw, height: vh },
    deviceScaleFactor: L.scale,
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
    userAgent: NATIVE_UA,
    locale: "en-US",
    timezoneId: ZONE,
    reducedMotion: "reduce",
  });
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...(shot.seed ?? {}) });
  await ctx.addInitScript(android);
  await serveLikeTheShell(ctx, OUT, {});
  // Pictures the app asks of the website (covers the bundle does not carry), as on a phone with signal. Nothing else leaves.
  const askedOfTheWebsite = [];
  await ctx.route(/^https:\/\/purifyapp\.net\/.*\.(avif|jpe?g|png|webp)(\?.*)?$/, (route) => {
    askedOfTheWebsite.push(new URL(route.request().url()).pathname);
    return route.continue();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => {
    // The stand-in shell has no plugins, and the app's own Back listener says so. A phone has them.
    if (/^"\w+" plugin is not implemented on android$/.test(e.message)) return;
    errors.push(e.message);
  });
  await page.clock.install({ time: new Date(DAY) });
  await go(page, shot.route);
  await page.waitForLoadState("networkidle").catch(() => {});
  await wait(1500);
  if (shot.prepare) await shot.prepare(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle").catch(() => {});
  await wait(1800);

  const reader = await page.evaluate(() => ({ plus: localStorage.getItem("purify:plusFeatures"), tier: localStorage.getItem("purify:premiumTier") }));
  const pictures = await page.evaluate(picturesOnPage);
  const inView = pictures.filter((p) => p.inView);
  const words = await page.evaluate(wordsInView);
  const names = (list) => [...new Set(list.map((p) => p.src.replace(ORIGIN, "").replace("https://purifyapp.net", "purifyapp.net")))];
  const record = {
    reader,
    errors,
    picturesInView: names(inView),
    heritageInView: heritageNamedIn(inView.map((p) => p.src).join("\n")),
    heritageElsewhereOnThePage: heritageNamedIn(pictures.filter((p) => !p.inView).map((p) => p.src).join("\n")),
    emptyPicturesInView: names(inView.filter((p) => !p.ok)),
    campaignNamed: /campaign/i.test(words),
    emDashInView: words.includes(String.fromCodePoint(0x2014)),
    askedOfTheWebsite: [...new Set(askedOfTheWebsite)],
  };

  const screen = await page.screenshot({ type: "png" });
  record.app = verdict(await checkMock(page, "body"));
  // What checkMock says of the app's own page is said in the README, for the arbiter, each kind once with its
  // count: the app is not this folder's to change, and a still has nothing to tap. It is the picture that has to pass.
  const kinds = new Map();
  for (const f of record.app.failures) {
    const kind = f.replace(/"([^"]*)"/g, (_, words) => (words.startsWith("Look up ") ? '"Look up ..."' : '"..."')).replace(/\d+(\.\d+)?/g, "n");
    const seen = kinds.get(kind) ?? { count: 0, first: f };
    seen.count += 1;
    kinds.set(kind, seen);
  }
  record.app.failures = [...kinds.values()].map(({ count, first }) => (count > 1 ? `${count} like: ${first}` : first));
  await ctx.close();

  const set = await setPage(device.canvas, picturePage(device, shot, L), { "screen.png": screen });
  const picture = await set.page.screenshot({ type: "png" });
  record.picture = verdict(await checkMock(set.page, "[data-store-picture]"));
  await set.ctx.close();

  const file = `${device.id}-${shot.n}-${shot.id}.png`;
  const bytes = await writePng(picture, file, device.canvas);
  const problems = [];
  if (reader.plus !== "0" || (reader.tier && reader.tier !== "free")) problems.push(`the reader is not a new reader with no Plus (${JSON.stringify(reader)})`);
  if (errors.length) problems.push(`page errors: ${errors.join("; ")}`);
  if (Object.keys(record.heritageInView).length) problems.push(`heritage pictures in view: ${Object.keys(record.heritageInView).join(", ")}`);
  if (record.emptyPicturesInView.length) problems.push(`empty pictures in view: ${record.emptyPicturesInView.join(", ")}`);
  if (record.campaignNamed) problems.push("a campaign is named in view");
  if (!record.picture.pass) problems.push(`checkMock on the picture: ${record.picture.failures.join(" | ")}`);
  console.log(`${problems.length ? "NO  " : "ok  "} ${file}  ${device.canvas.join(" by ")}  ${(bytes / 1024).toFixed(0)} KB${problems.length ? `\n      ${problems.join("\n      ")}` : ""}${record.app.failures.length ? `\n      said of the app's own screen: ${record.app.failures.join(" | ")}` : ""}`);
  return { file, device: device.id, shot: shot.id, caption: shot.caption, route: shot.route, state: shot.state, alt: shot.alt, size: device.canvas, screen: { viewport: device.viewport, scale: Number(L.scale.toFixed(4)) }, bytes, problems, ...record };
}

async function takeFeature() {
  const set = await setPage(FEATURE.canvas, featurePage());
  const picture = await set.page.screenshot({ type: "png" });
  const pictures = await set.page.evaluate(picturesOnPage);
  const check = verdict(await checkMock(set.page, "[data-store-picture]"));
  await set.ctx.close();
  const bytes = await writePng(picture, FEATURE.file, FEATURE.canvas);
  const problems = [];
  const heritage = heritageNamedIn(pictures.map((p) => p.src).join("\n"));
  if (Object.keys(heritage).length) problems.push(`heritage pictures: ${Object.keys(heritage).join(", ")}`);
  if (pictures.some((p) => !p.ok)) problems.push("an empty picture");
  if (!check.pass) problems.push(`checkMock: ${check.failures.join(" | ")}`);
  console.log(`${problems.length ? "NO  " : "ok  "} ${FEATURE.file}  ${FEATURE.canvas.join(" by ")}  ${(bytes / 1024).toFixed(0)} KB${problems.length ? `\n      ${problems.join("\n      ")}` : ""}`);
  return { file: FEATURE.file, device: FEATURE.id, shot: "feature", caption: FEATURE.line, route: null, state: "The app's cross (purify-cross-mark.png), its wordmark as the app sets it, and the Play listing's short description.", size: FEATURE.canvas, bytes, problems, picturesInView: [...new Set(pictures.map((p) => p.src.replace(ORIGIN, "")))], heritageInView: heritage, picture: check };
}

// Arguments name devices ("play-phone"), screens ("fathers"), "feature", or "readme" alone (write README.md
// again from results.json, taking nothing); none means everything.
const args = process.argv.slice(2);
const readmeOnly = args.length === 1 && args[0] === "readme";
const deviceArgs = args.filter((a) => DEVICES.some((d) => d.id === a));
const shotArgs = args.filter((a) => SHOTS.some((s) => s.id === a));
const wanted = (id) => !readmeOnly && (!args.length || (id === "feature" ? args.includes("feature") : deviceArgs.includes(id) || (!deviceArgs.length && shotArgs.length > 0)));
const shotWanted = (id) => !shotArgs.length || shotArgs.includes(id);
const resultsFile = path.join(HERE, "results.json");
const before = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")).pictures : [];
const made = [];
if (wanted("feature")) made.push(await takeFeature());
for (const device of DEVICES) {
  if (!wanted(device.id)) continue;
  for (const shot of SHOTS) if (shotWanted(shot.id)) made.push(await takeShot(device, shot));
}
await browser.close();

// Keep what an earlier run made for the devices this run did not make.
const order = [FEATURE.file, ...DEVICES.flatMap((d) => SHOTS.map((s) => `${d.id}-${s.n}-${s.id}.png`))];
const all = order.map((file) => made.find((m) => m.file === file) ?? before.find((m) => m.file === file)).filter(Boolean);
const commit = require("node:child_process").execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
fs.writeFileSync(resultsFile, `${JSON.stringify({ made: new Date().toISOString().slice(0, 10), day: DAY, export: commit, checks: CHECKS, byEye: BY_EYE, pictures: all }, null, 2)}\n`);

fs.writeFileSync(path.join(HERE, "README.md"), readme(all, commit));

const failed = all.filter((p) => p.problems.length);
console.log(`\n${all.length} pictures, ${failed.length} with a problem. results.json and README.md written.`);
process.exitCode = failed.length ? 1 : 0;

// ── The record ───────────────────────────────────────────────────────────

/** README.md, written from what was made and measured. */
function readme(pictures, exportCommit) {
  const of = (deviceId) => pictures.filter((p) => p.device === deviceId);
  const result = (p) => {
    if (p.problems.length) return `NO: ${p.problems.join("; ")}`;
    const said = [];
    if (p.picture.notMeasured?.length) said.push(`${p.picture.notMeasured.length} said for the eye`);
    return `pass, all ${CHECKS.length}${said.length ? ` (${said.join(", ")})` : ""}`;
  };
  const appResult = (p) => {
    if (!p.app) return "";
    const parts = [p.app.pass ? `pass, all ${CHECKS.length}` : `${p.app.failures.length} kind${p.app.failures.length > 1 ? "s" : ""} of note on the app, see "For the arbiter"`];
    if (p.app.notMeasured?.length) parts.push(`${p.app.notMeasured.length} said for the eye`);
    return parts.join("; ");
  };
  const stems = (p) => (p.picturesInView ?? []).filter((x) => !x.startsWith("data:")).map((x) => x.split("/").pop()).join(", ") || "none";
  const lines = [];
  const say = (...l) => lines.push(...l);

  say(
    "# Purify 1.9: the store pictures",
    "",
    `One finished set, made on ${new Date().toISOString().slice(0, 10)} from the 1.9 app itself. Nothing here is drawn by hand: every screen is the app's own, taken from the native export, and set under one short line.`,
    "",
    `**${pictures.length} pictures.** ${DEVICES.map((d) => `${d.store} ${d.name}: ${of(d.id).length}`).join(". ")}. Google Play feature graphic: ${of(FEATURE.id).length}.`,
    "",
    "## The story, in the order every device tells it",
    "",
    "| # | The line on the picture | The screen | Shot from | How it stands |",
    "|---|---|---|---|---|",
    ...SHOTS.map((s) => `| ${s.n} | ${s.caption} | ${s.id} | \`${s.route}\` | ${s.state} |`),
    "",
    `The feature graphic carries the app's cross, its wordmark as the app sets it, and one line, the Play listing's own short description: "${FEATURE.line}"`,
    "",
    "## The files",
    "",
    "Named by store, device and order. All are PNG, 24-bit, no alpha, at the store's exact size.",
    "",
  );
  say(`### Google Play, feature graphic (${FEATURE.canvas.join(" by ")})`, "", "| File | The line | checkMock on the picture |", "|---|---|---|", ...of(FEATURE.id).map((p) => `| \`${p.file}\` | ${p.caption} | ${result(p)} |`), "");
  for (const d of DEVICES) {
    say(
      `### ${d.store}, ${d.name} (${d.canvas.join(" by ")})`,
      "",
      `The screen is the app at ${d.viewport.join(" by ")} CSS pixels, shown whole.`,
      "",
      "| File | The line | Shot from | checkMock on the picture | checkMock on the app's own screen | Pictures in view |",
      "|---|---|---|---|---|---|",
      ...of(d.id).map((p) => `| \`${p.file}\` | ${p.caption} | \`${p.route}\` | ${result(p)} | ${appResult(p)} | ${stems(p)} |`),
      "",
    );
  }
  // What checkMock said of the app's own screens: for each screen and rule, where it was said, how many kinds, and two examples.
  const saidOn = new Map();
  for (const p of pictures) {
    const kindsHere = new Map();
    for (const line of p.app?.failures ?? []) {
      const one = line.replace(/^\d+ like: /, "");
      const rule = /^[a-z]+/.exec(one)?.[0] ?? "other";
      const key = `${p.shot} ${rule}`;
      const entry = saidOn.get(key) ?? { shot: p.shot, rule, devices: new Set(), kinds: 0, examples: [] };
      entry.devices.add(DEVICES.find((d) => d.id === p.device)?.name ?? p.device);
      kindsHere.set(key, (kindsHere.get(key) ?? 0) + 1);
      if (entry.examples.length < 2 && !entry.examples.includes(one)) entry.examples.push(one);
      saidOn.set(key, entry);
    }
    for (const [key, n] of kindsHere) saidOn.get(key).kinds = Math.max(saidOn.get(key).kinds, n);
  }
  const said = saidOn.size
    ? [...saidOn.values()]
        .map((e) => `- **${e.shot}, ${e.rule}** (${e.devices.size === DEVICES.length ? "every device" : [...e.devices].join(", ")}; ${e.kinds} kind${e.kinds > 1 ? "s" : ""}), for example: ${e.examples.map((x) => `\`${x}\``).join(" and ")}`)
        .join("\n")
    : "Nothing: every app screen passed every rule.";
  say(fs.readFileSync(path.join(HERE, "NOTES.md"), "utf8").replaceAll("{{export}}", exportCommit).replaceAll("{{said}}", said).replaceAll("{{size}}", `${(pictures.reduce((n, p) => n + p.bytes, 0) / 1e6).toFixed(1)} MB`).trimEnd(), "");
  say("## Words for the stores' alt text", "", "Google Play asks for alt text of 140 characters or fewer for each picture. One line for each screen, the same on every device:", "", ...SHOTS.map((s) => `- ${s.n} ${s.id}: ${s.alt}`), "");
  return `${lines.join("\n")}\n`;
}
