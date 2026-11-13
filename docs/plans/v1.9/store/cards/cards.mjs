// The 1.9 social cards: one set for the drop, in the look he kept for the
// store pictures (../make.mjs, "The design": the hill, the field, a screen
// facing the front and a screen turned to the side).
//
//   node docs/plans/v1.9/store/cards/cards.mjs            every card
//   node docs/plans/v1.9/store/cards/cards.mjs verse      one card, by its id
//   node scripts/drop.mjs cards docs/plans/v1.9/store/cards/stills
//       the small copies in docs/plans/v1.9/cards/ and the Drop tab's list
//
// His word, by the arbiter, 2026-11-13: one set of social cards for the 1.9
// drop, in the store pictures' look; a cover, one card for each headline
// point, and a closing card with the store names. One version, no variants.
//
// Every word on a card is read from ../../drop.json when the card is made:
// the release's line, each point's own name and text, the closing, and from
// the caption written for these cards its first sentence and its last. No
// word is written here. The headline points are the four the caption names.
//
// Every screen is the 1.9 app itself, taken from the native export as a new
// reader with no Plus meets it (../make.mjs says how the export is cut). So
// the card for Purify Plus shows Plus as that reader sees it: by its mark.
// No interface is drawn. The stills are 1080 by 1920, 24-bit, no alpha.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../../..");
const OUT = path.join(ROOT, "out");
const STILLS = path.join(HERE, "stills");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { checkMock, CHECKS } = await import(at("scripts/mock-check.mjs"));
const { NATIVE_UA, ORIGIN, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { heritageNamedIn } = await import(at("lib/marketing/heritagePictures.ts"));

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first (../make.mjs says how it is cut)");

// ── The words, all from the drop ─────────────────────────────────────────

const DROP = JSON.parse(fs.readFileSync(path.join(HERE, "../../drop.json"), "utf8"));
const point = (id) => DROP.points.find((p) => p.id === id) ?? fail(`the drop has no point "${id}"`);
const caption = DROP.pieces.find((p) => p.id === "instagram-caption")?.text ?? fail("the drop has no caption for the cards");
function fail(text) {
  throw new Error(text);
}
/** A sentence of the caption, by how it begins; it must be there, word for word. */
const sentence = (start) => caption.match(new RegExp(`${start}[^.]*\\.`))?.[0] ?? fail(`the caption has no sentence that begins "${start}"`);
const HERE_IT_IS = sentence(`Purify ${DROP.release} is here`);
const FIND_IT = sentence("Find Purify");
/** The headline points: the ones the caption for these cards names, in its order. */
const HEADLINES = DROP.points.filter((p) => caption.includes(`${p.name}.`));
if (HEADLINES.map((p) => p.id).join() !== "journal,verse,bibles,study") fail(`the caption's points are now ${HEADLINES.map((p) => p.id).join()}: give each a screen in CARDS`);

// ── The screens ──────────────────────────────────────────────────────────

/** The day every screen is taken on, as in the store pictures: the feast of St Nicholas, in the Nativity Fast. */
const DAY = "2026-12-06T09:30:00-05:00";
const ZONE = "America/New_York";
const VIEW = [412, 846]; // the Play phone of the store pictures
const [W, H] = [1080, 1920];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function tap(page, selector) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 20000 });
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

/** Rest a finger on John 1:1 until its tools open, as a reader holds a verse. */
async function holdTheVerse(page) {
  await page.waitForSelector('button[aria-label="Open commentary on verse 1"]', { timeout: 30000 });
  const spot = await page.evaluate(() => {
    let el = document.querySelector('button[aria-label="Open commentary on verse 1"]');
    for (let i = 0; i < 6 && el; i++) {
      el = el.parentElement;
      if (el?.textContent.includes("In the beginning was the Word")) {
        const r = el.getBoundingClientRect();
        return { x: r.left + Math.min(r.width / 2, 120), y: r.top + Math.min(r.height / 2, 14) };
      }
    }
    return null;
  });
  if (!spot) throw new Error("John 1:1 was not found on the page");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...spot, id: 1 }] });
  await page.clock.runFor(900).catch(() => {});
  await wait(900);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.getByRole("dialog", { name: /Verse actions/ }).waitFor({ state: "visible", timeout: 5000 });
  await wait(600);
}

/**
 * The six cards. `stand` is the store pictures' own word (front before the
 * hill, side before the field). `words` says where the words stand: at the
 * head, the screen under them and running off the foot; or at the foot, the
 * screen over them and running off the head, for a screen whose matter is a
 * sheet at its foot. `w` is the screen's width on the card.
 */
const CARDS = [
  {
    n: "01",
    id: "cover",
    stand: "front",
    words: "head",
    w: 690,
    title: HERE_IT_IS,
    text: DROP.line,
    from: "the caption's first sentence, and the drop's line",
    route: "/",
    state: "Today on 6 December 2026, the new reader's one-question card dismissed with its own Dismiss button.",
    alt: "Today: St Nicholas the Wonderworker, the Nativity Fast with fish allowed, and the day's verse.",
    async prepare(page) {
      const dismiss = page.locator('button[aria-label="Dismiss"]').first();
      for (let tries = 0; tries < 4 && (await dismiss.isVisible()); tries++) {
        await wait(500);
        await tap(page, 'button[aria-label="Dismiss"]');
        await dismiss.waitFor({ state: "hidden", timeout: 2500 }).catch(() => {});
      }
      if (await dismiss.isVisible()) throw new Error("Today: the one-question card is still there");
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  },
  {
    n: "02",
    id: "journal",
    stand: "side",
    words: "head",
    w: 640,
    point: "journal",
    route: "/journal",
    state: "The journal as a new reader opens it: the day's page, its saint, its fast and its readings, each with a pen.",
    alt: "The journal's page for Sunday: the day's saint, the fast, and the Epistle and Gospel, each with a pen.",
    async prepare(page) {
      await page.waitForSelector("[data-journal-today]", { timeout: 30000 });
    },
  },
  {
    n: "03",
    id: "verse",
    stand: "front",
    words: "head",
    w: 640,
    point: "verse",
    route: "/bible/john/1",
    state: "John 1 with a finger held on verse 1: its own tools, open.",
    alt: "John 1:1 held open: the highlight colours, and Copy, Share, Image, Note and Study.",
    prepare: holdTheVerse,
  },
  {
    n: "04",
    id: "bibles",
    stand: "side",
    words: "foot",
    w: 700,
    point: "bibles",
    route: "/bible/john/1",
    state: "John 1 with the translations list open (the KJV button under the chapter), drawn up to the Bibles to download.",
    alt: "The translations list: the Russian Synodal, the Greek Septuagint and the Serbian Bible, each to download.",
    async prepare(page) {
      await page.getByRole("button", { name: /KJV/ }).first().click();
      const sheet = page.getByRole("dialog", { name: "Translation" });
      await sheet.waitFor({ state: "visible", timeout: 10000 });
      await wait(700);
      // Draw the list up, as a finger would, until the first Bible to download leads it.
      await page.evaluate(() => {
        const sheet = document.querySelector('[role="dialog"][aria-label="Translation"]');
        const head = [...sheet.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === "Russian");
        let box = head?.parentElement;
        while (box && box !== sheet && box.scrollHeight <= box.clientHeight + 4) box = box.parentElement;
        const first = [...sheet.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === "English");
        if (box && head && first) box.scrollTop += head.getBoundingClientRect().top - first.getBoundingClientRect().top;
      });
      await wait(700);
    },
  },
  {
    n: "05",
    id: "study",
    stand: "front",
    words: "foot",
    w: 760,
    point: "study",
    route: "/bible/john/1",
    state: "John 1:1 held, then Study: the verse's study sheet as a reader with no Plus meets it, each Plus part under its mark.",
    alt: "The study sheet for John 1:1: the Greek, and Cross-references and Compare marked Purify Plus.",
    async prepare(page) {
      await holdTheVerse(page);
      await page.getByRole("dialog", { name: /Verse actions/ }).getByText("Study", { exact: true }).first().click();
      await page.getByText("Cross-references", { exact: true }).first().waitFor({ state: "visible", timeout: 10000 });
      await wait(900);
    },
  },
  {
    n: "06",
    id: "close",
    stand: "words",
    title: DROP.closing,
    text: FIND_IT,
    from: "the drop's closing, and the caption's last sentence",
  },
];
for (const card of CARDS) {
  if (!card.point) continue;
  const p = point(card.point);
  card.title = p.name;
  card.text = p.text;
  card.from = `the drop's point "${p.id}": its name and its text`;
}

// ── The app's own document ───────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
if (!SHEETS.length) throw new Error("the front door names no stylesheet");

// ── The design: the store pictures', set for a card ──────────────────────
//
// The same two backs and the same two stands as ../make.mjs, with the same
// numbers where a number is shared (the hill's arc and lifts, the field's
// rows, the slab's turn and thickness, the rim, the pool of light). What a
// card adds is a second line of words under the first, and the release's
// mark over them. Every colour is a palette token. A drawing never runs
// under the words: it keeps to the part of the card the words leave, and
// fades toward them.

const r = Math.round;
const ink = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, transparent)`;
const accent = (pct) => `color-mix(in srgb, var(--color-gold) ${pct}%, transparent)`;
const plane = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, var(--color-night))`;
const EDGE = 2;
const ROUND = 0.07; // the phone's corners, as the store pictures'
// Kept clear of words at the head and the foot of a card, where Instagram and TikTok lay their own buttons over a story or a reel.
const SAFE = { head: 240, foot: 340 };
const GAP = 70; // between the words and the screen

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** The hill: one wide circle's arc for the crest, the same arc higher for the fainter lines. */
function hill(crest) {
  const rise = W * 0.13;
  const half = W / 2;
  const R = (half * half + rise * rise) / (2 * rise);
  const fall = R - Math.sqrt(R * R - (half * 1.2) ** 2);
  const arc = (lift) => `M ${-W * 0.1} ${crest + lift + fall} A ${R} ${R} 0 0 1 ${W * 1.1} ${crest + lift + fall}`;
  return {
    css: `[data-back] { background-image: radial-gradient(ellipse ${r(W * 0.78)}px ${r(H * 0.2)}px at 50% ${crest}px, ${ink(17)}, transparent 72%); }
  [data-hill] { fill: ${plane(6.5)}; stroke: none; }
  [data-line] { fill: none; stroke: ${ink(40)}; stroke-width: ${EDGE}; }
  [data-line="1"] { stroke: ${ink(16)}; }
  [data-line="2"] { stroke: ${ink(11)}; }
  [data-line="3"] { stroke: ${ink(8)}; }
  [data-line="4"] { stroke: ${ink(5)}; }`,
    svg: `${[0.2, 0.135, 0.08, 0.035].map((lift, i) => `<path data-line="${4 - i}" d="${arc(-H * lift)}"/>`).join("")}<path data-hill d="${arc(0)} L ${W * 1.1} ${H * 1.1} L ${-W * 0.1} ${H * 1.1} Z"/><path data-line="0" d="${arc(0)}"/>`,
  };
}

/** The field: rolling lines that draw closer toward a horizon. Lines run across; none fans out. */
function field(horizon) {
  const rows = [];
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    const y = horizon + (H - horizon + 90) * Math.pow(t, 1.85);
    const amp = 9 + 78 * Math.pow(t, 1.25);
    const pts = [];
    for (let i = 0; i <= 90; i++) {
      const x = -20 + ((W + 40) * i) / 90;
      pts.push(`${x.toFixed(1)},${(y + amp * Math.sin((x / W) * Math.PI * (2.6 - 1.2 * t) + 0.4 + t * 3.1)).toFixed(1)}`);
    }
    rows.push(`<path d="M ${pts.join(" L ")}" style="fill:none;stroke:${k === 0 ? accent(70) : ink((6 + 16 * t).toFixed(1))};stroke-width:${EDGE}"/>`);
  }
  return {
    css: `[data-back] { background-image: radial-gradient(ellipse ${r(W * 0.9)}px ${r(H * 0.11)}px at 50% ${r(horizon)}px, ${ink(20)}, transparent 72%); }`,
    svg: `<rect x="-10" y="${r(horizon)}" width="${W + 20}" height="${r(H - horizon + 10)}" style="fill:${plane(4)}"/>${rows.join("")}`,
  };
}

/** Where a card's words and its screen stand, once the words' own height is known. */
function layout(card, wordsH) {
  if (card.stand === "words") return { stand: "words", scale: 1 };
  const [vw, vh] = VIEW;
  const w = card.w;
  const h = Math.floor((w * vh) / vw);
  // The words begin under the head's safe part, or end over the foot's; the band is theirs, and the rest is the screen's and the drawing's.
  const wordsTop = card.words === "head" ? SAFE.head : H - SAFE.foot - wordsH;
  const band = card.words === "head" ? wordsTop + wordsH + GAP : H - wordsTop + GAP;
  // Under the words the screen runs off the foot; over them it runs off the head, its foot resting above the band.
  const top = card.words === "head" ? band : H - band - h;
  const draw = card.words === "head" ? [band, H] : [0, H - band];
  return { stand: card.stand, words: card.words, w, h, top, band, wordsTop, draw, scale: card.stand === "side" ? (w / vw) * 1.25 : w / vw };
}

const head = (css) => `<!doctype html>
<html lang="en" dir="ltr" class="${HTML_CLASS}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, initial-scale=1">
${SHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night); }
  html { scrollbar-gutter: auto; }
  [data-card] { position: relative; box-sizing: border-box; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night); color: var(--color-paper); }
  [data-back] { position: absolute; inset: 0; pointer-events: none; }
  :root[dir="rtl"] [data-back] svg { transform: scaleX(-1); }
  [data-words] { position: absolute; inset-inline: 0; box-sizing: border-box; padding: 0 ${r(W * 0.085)}px; display: flex; flex-direction: column; align-items: center; text-align: center; }
  [data-mark] { display: flex; align-items: center; gap: 16px; margin: 0; font-family: var(--font-sans); font-weight: 700; font-size: 34px; line-height: 1; letter-spacing: -0.01em; color: var(--color-paper); }
  [data-cross] { display: block; height: 58px; width: 33px; background-color: var(--color-paper); -webkit-mask: url(/purify-cross-mark.png) center / contain no-repeat; mask: url(/purify-cross-mark.png) center / contain no-repeat; }
  [data-title] { margin: 34px 0 0; text-wrap: balance; font-family: var(--font-heading); font-weight: 600; font-size: 80px; line-height: 1.12; letter-spacing: -0.01em; color: var(--color-paper); }
  [data-text] { margin: 30px 0 0; max-width: 880px; text-wrap: pretty; font-family: var(--font-sans); font-size: 37px; line-height: 1.38; color: ${ink(84)}; }
  ${css}
</style>
</head>`;

/** The mark over the words: the release's name, or the app's alone where the title already says the release. */
const words = (card) => `<p data-mark><span data-cross aria-hidden="true"></span>${card.title.includes(DROP.release) ? "Purify" : `Purify ${esc(DROP.release)}`}</p><h1 data-title>${esc(card.title)}</h1><p data-text>${esc(card.text)}</p>`;

/** A card with a screen: the words in their band, the screen and its back in the rest. */
function screenCard(card, L) {
  const { w, h, top, band, wordsTop, draw } = L;
  const side = L.stand === "side";
  const rim = side ? r(w * 0.022) : r(W * 0.011);
  const radius = r(w * ROUND * (side ? 1.07 : 1));
  const [bw, bh] = [w + 2 * rim, h + 2 * rim];
  // The line of the land stands behind the screen: the hill's crest, or the field's horizon.
  const land = L.words === "head" ? top + h * (side ? 0.3 : 0.6) : H - band - h * (side ? 0.52 : 0.4);
  const back = side ? field(r(land)) : hill(r(land));
  const fade = L.words === "head" ? "" : `[data-back] svg { -webkit-mask-image: linear-gradient(to bottom, #000 78%, transparent 99%); mask-image: linear-gradient(to bottom, #000 78%, transparent 99%); }`;
  const wordsAt = `top: ${wordsTop}px;`;
  let screen;
  let screenCss;
  if (side) {
    const deep = r(bw * 0.105);
    const step = 1.5;
    const leaves = [];
    const count = Math.round(deep / step);
    for (let k = count; k >= 1; k--) {
      const t = k / count;
      const tone = k <= 2 ? 34 : 19 - 12 * t;
      leaves.push(`<div data-leaf style="transform:translateZ(${(-k * step).toFixed(1)}px);background-color:${plane(tone.toFixed(1))}"></div>`);
    }
    screenCss = `[data-stage] { position: absolute; top: ${top + (L.words === "head" ? 40 : -50)}px; inset-inline-start: ${r((W - bw) / 2 - W * 0.012)}px; width: ${bw}px; height: ${bh}px; perspective: ${r(W * 3.2)}px; perspective-origin: 50% 42%; }
  [data-body] { position: absolute; inset: 0; transform: rotateY(-25deg) rotateX(7deg) rotateZ(1.2deg); transform-style: preserve-3d; }
  :root[dir="rtl"] [data-stage] { transform: scaleX(-1); }
  [data-leaf], [data-cast] { position: absolute; inset: 0; border-radius: ${radius + rim}px; }
  [data-cast] { transform: translateZ(${-deep - 2}px); box-shadow: ${r(W * 0.05)}px ${r(W * 0.07)}px ${r(W * 0.11)}px ${r(W * 0.01)}px color-mix(in srgb, var(--color-night-deep) 96%, transparent); }
  [data-screen] { position: absolute; inset: 0; box-sizing: border-box; margin: 0; padding: ${rim}px; border-radius: ${radius + rim}px; background-color: var(--color-night-deep); outline: ${EDGE}px solid ${ink(34)}; outline-offset: -${EDGE}px; }
  [data-screen] img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: ${radius}px; }`;
    screen = `<div data-stage><div data-body><div data-cast aria-hidden="true"></div>${leaves.join("")}<figure data-screen><img alt="${esc(card.alt)}" src="/__store/screen.png"></figure></div></div>`;
  } else {
    screenCss = `[data-screen] { position: absolute; box-sizing: border-box; margin: 0; top: ${top - rim}px; inset-inline-start: ${r((W - w) / 2) - rim}px; width: ${bw}px; height: ${bh}px; padding: ${rim}px; border-radius: ${radius + rim}px; background-color: var(--color-night-deep); outline: ${EDGE}px solid ${ink(22)}; box-shadow: 0 ${r(W * 0.04)}px ${r(W * 0.09)}px color-mix(in srgb, var(--color-night-deep) 94%, transparent); }
  [data-screen] img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: ${radius}px; }`;
    screen = `<figure data-screen><img alt="${esc(card.alt)}" src="/__store/screen.png"></figure>`;
  }
  return `${head(`
  [data-back] svg { position: absolute; top: ${draw[0]}px; inset-inline: 0; width: 100%; height: ${draw[1] - draw[0]}px; }
  ${fade}
  ${back.css}
  [data-words] { ${wordsAt} }
  ${screenCss}
`)}
<body>
<main data-card>
  <div data-back aria-hidden="true"><svg viewBox="0 ${draw[0]} ${W} ${draw[1] - draw[0]}" preserveAspectRatio="none">${back.svg}</svg></div>
  ${screen}
  <div data-words>${words(card)}</div>
</main>
</body>
</html>`;
}

/** The closing card: words alone, over the hill. */
function wordsCard(card) {
  const from = 1160; // the drawing starts under the words
  const back = hill(1440);
  return `${head(`
  [data-back] svg { position: absolute; top: ${from}px; inset-inline: 0; width: 100%; height: ${H - from}px; }
  ${back.css}
  [data-words] { top: 430px; }
  [data-mark] { font-size: 44px; gap: 20px; }
  [data-cross] { height: 84px; width: 48px; }
  [data-title] { margin-top: 70px; font-size: 84px; }
  [data-text] { margin-top: 50px; font-size: 40px; max-width: 800px; }
`)}
<body>
<main data-card>
  <div data-back aria-hidden="true"><svg viewBox="0 ${from} ${W} ${H - from}" preserveAspectRatio="none">${back.svg}</svg></div>
  <div data-words>${words(card)}</div>
</main>
</body>
</html>`;
}

// ── In the page (as ../make.mjs) ─────────────────────────────────────────

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
    for (const pseudo of [null, "::before", "::after"]) {
      const s = pseudo ? getComputedStyle(el, pseudo) : cs;
      for (const prop of ["backgroundImage", "maskImage", "webkitMaskImage", "borderImageSource", "content", "listStyleImage"]) {
        for (const u of urls(s[prop])) add(u, r, pseudo ? `${prop} ${pseudo}` : prop);
      }
    }
  }
  return seen;
}

function wordsInView() {
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
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) out.push(text);
  }
  return out.join(" \n");
}

function android() {
  window.androidBridge = { postMessage() {} };
  window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
}

// ── The work ─────────────────────────────────────────────────────────────

const browserPath = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(browserPath) ? { executablePath: browserPath } : {});

function verdict(result) {
  return { pass: result.failures.length === 0, failures: result.failures.map((f) => `${f.check}${f.palette ? ` (${f.palette})` : ""}: ${f.what}: ${f.detail}`), notMeasured: result.unmeasured };
}

/** The app's own screen for a card, as a new reader with no Plus meets it. */
async function takeScreen(card, L) {
  const ctx = await browser.newContext({ viewport: { width: VIEW[0], height: VIEW[1] }, deviceScaleFactor: L.scale, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: ZONE, reducedMotion: "reduce" });
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99" });
  await ctx.addInitScript(android);
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(/^https:\/\/purifyapp\.net\/.*\.(avif|jpe?g|png|webp)(\?.*)?$/, (route) => route.continue());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => {
    if (/^"\w+" plugin is not implemented on android$/.test(e.message)) return;
    errors.push(e.message);
  });
  await page.clock.install({ time: new Date(DAY) });
  await go(page, card.route);
  await page.waitForLoadState("networkidle").catch(() => {});
  await wait(1500);
  if (card.prepare) await card.prepare(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle").catch(() => {});
  await wait(1500);
  const reader = await page.evaluate(() => ({ plus: localStorage.getItem("purify:plusFeatures"), tier: localStorage.getItem("purify:premiumTier") }));
  const pictures = (await page.evaluate(picturesOnPage)).filter((p) => p.inView);
  const said = await page.evaluate(wordsInView);
  const png = await page.screenshot({ type: "png" });
  await ctx.close();
  const problems = [];
  if (reader.plus !== "0" || (reader.tier && reader.tier !== "free")) problems.push(`the reader is not a new reader with no Plus (${JSON.stringify(reader)})`);
  if (errors.length) problems.push(`page errors: ${errors.join("; ")}`);
  const heritage = Object.keys(heritageNamedIn(pictures.map((p) => p.src).join("\n")));
  if (heritage.length) problems.push(`heritage pictures in view: ${heritage.join(", ")}`);
  if (pictures.some((p) => !p.ok)) problems.push("an empty picture in view");
  for (const { word } of DROP.never) if (said.toLowerCase().includes(word.toLowerCase())) problems.push(`the screen says "${word}", which the drop may never say`);
  if (said.includes(String.fromCodePoint(0x2014))) problems.push("an em dash on the screen");
  return { png, problems, pictures: [...new Set(pictures.map((p) => p.src.replace(ORIGIN, "").replace("https://purifyapp.net", "purifyapp.net")))] };
}

/** How tall a card's words stand, set as they will be. */
async function wordsHeight(card) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US", reducedMotion: "reduce" });
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(`${ORIGIN}/__store/**`, (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: `${head("[data-words] { top: 0; }")}<body><main data-card><div data-words>${words(card)}</div></main></body></html>` }));
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/__store/page.html`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await wait(200);
  const height = await page.evaluate(() => document.querySelector("[data-text]").getBoundingClientRect().bottom);
  await ctx.close();
  return Math.ceil(height);
}

async function makeCard(card) {
  const L = layout(card, card.route ? await wordsHeight(card) : 0);
  const problems = [];
  for (const { word } of DROP.never) if (`${card.title} ${card.text}`.toLowerCase().includes(word.toLowerCase())) problems.push(`the card says "${word}", which the drop may never say`);
  let screen = null;
  if (card.route) {
    screen = await takeScreen(card, L);
    problems.push(...screen.problems);
  }
  const html = card.route ? screenCard(card, L) : wordsCard(card);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US", reducedMotion: "reduce" });
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(`${ORIGIN}/__store/**`, (route) => {
    const name = new URL(route.request().url()).pathname.replace("/__store/", "");
    if (name === "page.html") return route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
    if (name === "screen.png" && screen) return route.fulfill({ contentType: "image/png", body: screen.png });
    return route.fulfill({ status: 404, body: "not found" });
  });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/__store/page.html`, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
  });
  await wait(300);
  // The words must stand clear of the screen and inside the card's safe part.
  const fit = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel)?.getBoundingClientRect();
    const [words, last, screen] = [box("[data-words]"), box("[data-text]"), box("[data-stage]") ?? box("[data-screen]")];
    return { top: words.top, bottom: last.bottom, screenTop: screen?.top ?? null, screenBottom: screen?.bottom ?? null };
  });
  if (fit.top < SAFE.head - 1) problems.push(`the words begin at ${r(fit.top)}, inside the head's safe part`);
  if (fit.bottom > H - SAFE.foot + 1) problems.push(`the words end at ${r(fit.bottom)}, inside the foot's safe part`);
  if (L.words === "head" && fit.screenTop !== null && fit.bottom > fit.screenTop - 20) problems.push(`the words end at ${r(fit.bottom)} and the screen begins at ${r(fit.screenTop)}`);
  if (L.words === "foot" && fit.screenBottom !== null && fit.top < fit.screenBottom + 20) problems.push(`the words begin at ${r(fit.top)} and the screen ends at ${r(fit.screenBottom)}`);
  const picture = await page.screenshot({ type: "png" });
  const check = verdict(await checkMock(page, "[data-card]"));
  await ctx.close();
  if (!check.pass) problems.push(`checkMock: ${check.failures.join(" | ")}`);
  const out = await sharp(picture).removeAlpha().png({ compressionLevel: 9, effort: 10 }).toBuffer();
  const meta = await sharp(out).metadata();
  if (meta.width !== W || meta.height !== H || meta.channels !== 3 || meta.hasAlpha) throw new Error(`${card.id}: ${meta.width} by ${meta.height}, ${meta.channels} channels`);
  const file = `${card.n}-${card.id}.png`;
  fs.mkdirSync(STILLS, { recursive: true });
  fs.writeFileSync(path.join(STILLS, file), out);
  console.log(`${problems.length ? "NO  " : "ok  "} ${file}  ${W} by ${H}  ${(out.length / 1024).toFixed(0)} KB${problems.length ? `\n      ${problems.join("\n      ")}` : ""}`);
  return { file, id: card.id, stand: card.stand, words: card.words ?? "alone", title: card.title, text: card.text, from: card.from, route: card.route ?? null, state: card.state ?? "Words alone, over the hill.", alt: card.alt ?? null, picturesInView: screen?.pictures ?? [], problems, checkMock: check };
}

const selfTest = await import("node:child_process").then(({ spawnSync }) => spawnSync(process.execPath, [path.join(ROOT, "scripts/mock-check.mjs"), "--self-test"], { cwd: ROOT, encoding: "utf8" }));
if (selfTest.status !== 0) throw new Error(`checkMock's self-test failed:\n${selfTest.stdout}${selfTest.stderr}`);

const args = process.argv.slice(2);
const resultsFile = path.join(HERE, "results.json");
const before = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")) : null;
const made = [];
for (const card of CARDS) if (!args.length || args.includes(card.id)) made.push(await makeCard(card));
await browser.close();

const all = CARDS.map((card) => made.find((m) => m.id === card.id) ?? before?.cards.find((m) => m.id === card.id)).filter(Boolean);
const exportCommit = process.env.STORE_EXPORT || require("node:child_process").execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
fs.writeFileSync(resultsFile, `${JSON.stringify({ made: new Date().toISOString().slice(0, 10), export: exportCommit, release: DROP.release, checks: CHECKS, cards: all }, null, 2)}\n`);
fs.writeFileSync(
  path.join(HERE, "README.md"),
  [
    `# Purify ${DROP.release}: the social cards`,
    "",
    `One set for the drop, made on ${new Date().toISOString().slice(0, 10)} by \`cards.mjs\` in this folder, in the look he kept for the store pictures (\`../README.md\`, "The design"). His word, by the arbiter, 2026-11-13: one set, a cover, one card for each headline point, and a closing card with the store names. One version, no variants.`,
    "",
    `- **The stills** are in \`stills/\`: ${W} by ${H}, 24-bit PNG, no alpha, for Instagram and TikTok. The small copies the admin panel's Drop tab shows are in \`docs/plans/v${DROP.release}/cards/\`, written by \`node scripts/drop.mjs cards docs/plans/v${DROP.release}/store/cards/stills\`.`,
    `- **The words** are all read from \`docs/plans/v${DROP.release}/drop.json\` when a card is made; none is written in \`cards.mjs\`. The headline points are the four the caption for the cards names.`,
    `- **The screens** are the ${DROP.release} app itself, from the native export at \`${exportCommit}\`, cut as the store build with Plus locked, as a new reader meets it on 6 December 2026. No interface is drawn. The card for Purify Plus shows the study sheet as a reader with no Plus sees it: each Plus part under its mark.`,
    "- **Held to:** checkMock on every card, after its self-test (contrast on five palettes, palette tokens, rays, side stripes, sparkle, em dashes, mirroring and the rest); no picture on the heritage list in view; no word the drop may never say, on a card or on a screen; the words clear of the screen and of the head and foot of a story, where an app's own buttons lie.",
    "",
    "| File | Words on the card | Where the words are from | Stands | Screen | checkMock |",
    "|---|---|---|---|---|---|",
    ...all.map((c) => `| \`stills/${c.file}\` | **${c.title}** ${c.text} | ${c.from} | ${c.stand}${c.words !== "alone" ? `, words at the ${c.words}` : ""} | ${c.route ? `\`${c.route}\`: ${c.state}` : c.state} | ${c.checkMock.pass && !c.problems.length ? "passes" : `**fails**: ${c.problems.join("; ")}`} |`),
    "",
    "To make a card again after a change in the app or in the drop's words: cut the export as `../README.md` says, then `node docs/plans/v" + DROP.release + "/store/cards/cards.mjs <id>` and the `drop.mjs cards` line above. No design work is needed.",
    "",
  ].join("\n"),
);
const bad = all.filter((c) => c.problems.length).length;
console.log(`\n${all.length} cards, ${bad} with a problem. results.json and README.md written.`);
if (bad) process.exitCode = 1;
