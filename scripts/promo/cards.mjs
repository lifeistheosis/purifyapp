// A release's cards (scripts/promo/README.md, "Cards"): one set of 9:16
// stills for Instagram and TikTok, made from the release's drop and the app's
// own screens. The owner's word (2026-11-09): every release gets "like a
// generic card", with "a unique design for every single version". This file
// is the generic card: the order of the set, the type, the safe box, the mark
// and the closing. The release's own look is in card-looks.mjs.
//
// Every word is the drop's (docs/plans/v<release>/drop.json), which its own
// rules already hold to the notes: the name, the points, the closing. A look
// adds only the eyebrows. Screens are real (edit-capture.mjs takes them), the
// light is a soft pool, never rays, and there is no phone.
//
//   node scripts/promo/cards.mjs 1.8 [--only cover,maps]
//
// Out: PROMO/cards/<release>/NN-name.png at 2x, send/NN-name.jpg at 1080x1920,
// and send/all.jpg, a sheet. Then `node scripts/drop.mjs cards <that folder>`
// makes the small copies the admin panel's Drop tab shows.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { LOOKS } from "./card-looks.mjs";
import { PROMO, REPO, dir, launch } from "./lib.mjs";

const argv = process.argv.slice(2);
const onlyAt = argv.indexOf("--only");
const only = onlyAt >= 0 ? argv.splice(onlyAt, 2)[1].split(",") : null;
const release = argv[0];
if (!release) throw new Error("Which release? node scripts/promo/cards.mjs 1.8");
const look = LOOKS[release];
if (!look) throw new Error(`no look for ${release} in card-looks.mjs: every release has its own`);
const drop = JSON.parse(fs.readFileSync(path.join(REPO, "docs", "plans", `v${release}`, "drop.json"), "utf8"));
const point = (id) => {
  const p = drop.points.find((x) => x.id === id);
  if (!p) throw new Error(`the ${release} drop has no point "${id}"`);
  return p;
};

const url = (p) => `file://${p}`;
const FONTS = path.join(PROMO, "fonts");
for (const f of ["lora.woff2", "dmsans.woff2"]) {
  if (!fs.existsSync(path.join(FONTS, f))) throw new Error(`no ${f} in ${FONTS}: run edit-capture.mjs first`);
}
const MARK = path.join(REPO, "public", "purify-cross-mark.png");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The title, leaning on one of its own words: that word is set heavier. */
const lean = (text, word) => {
  const t = esc(text);
  if (!word) return t;
  const at = t.toLowerCase().indexOf(word.toLowerCase());
  return at < 0 ? t : `${t.slice(0, at)}<b>${t.slice(at, at + word.length)}</b>${t.slice(at + word.length)}`;
};

// The safe box every word keeps to (the board's PLATFORMS.md): 90 px from
// each side, 250 from the top, 330 from the foot of 1080 by 1920.
const SAFE = { side: 90, top: 250, bottom: 1920 - 330 };

const BASE_CSS = `
@font-face { font-family: "Lora"; src: url(${url(path.join(FONTS, "lora.woff2"))}) format("woff2"); font-weight: 400 700; }
@font-face { font-family: "DM Sans"; src: url(${url(path.join(FONTS, "dmsans.woff2"))}) format("woff2"); font-weight: 100 1000; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }
.card { position: relative; width: 1080px; height: 1920px; overflow: hidden; color: var(--paper); -webkit-font-smoothing: antialiased; }
.abs { position: absolute; }
.mark { position: absolute; left: ${SAFE.side}px; top: ${SAFE.top}px; display: flex; align-items: center; gap: 16px; font: 600 34px/1 "DM Sans"; letter-spacing: .01em; }
.mark img { height: 44px; width: auto; }
/* The words and the screen sit in the middle of the ground, between the horizon and the foot. */
.body { position: absolute; left: ${SAFE.side}px; right: ${SAFE.side}px; bottom: ${1920 - SAFE.bottom + 80}px; display: flex; flex-direction: column; justify-content: safe center; gap: 24px; }
.eyebrow { margin: 0; font: 600 25px/1.2 "DM Sans"; letter-spacing: .28em; text-transform: uppercase; color: var(--quiet); }
.title { margin: 0; font: 500 92px/1.04 "Lora"; letter-spacing: -.012em; text-wrap: balance; }
.title b { font-weight: 700; }
.title.big { font-size: 128px; line-height: 1; }
.line { margin: 0; font: 400 36px/1.42 "DM Sans"; color: var(--quiet); max-width: 880px; }
.window { position: relative; flex: none; width: 900px; height: 460px; border-radius: 30px; overflow: hidden; box-shadow: 0 0 0 1.5px rgba(244,241,234,.14), 0 40px 120px rgba(0,0,0,.6); }
.window img { position: absolute; }
.window.fade::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 80px; background: linear-gradient(rgba(10,10,12,0), rgba(10,10,12,.94)); }
.list { margin: 0; padding: 0; list-style: none; display: grid; gap: 16px; }
.list li { display: grid; grid-template-columns: 22px 1fr; gap: 20px; align-items: baseline; font: 500 36px/1.25 "DM Sans"; }
.list li::before { content: ""; width: 12px; height: 12px; border-radius: 50%; background: var(--paper); transform: translateY(-6px); }
.foot { position: absolute; left: ${SAFE.side}px; right: ${SAFE.side}px; top: ${SAFE.bottom - 46}px; font: 600 24px/1.3 "DM Sans"; letter-spacing: .22em; text-transform: uppercase; color: var(--dim); }
.grain { position: absolute; inset: 0; pointer-events: none; opacity: .07; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}"); background-size: 300px; }
`;

const mark = `<div class="mark"><img src="${url(MARK)}" alt="">Purify</div>`;

/** A real screen in a window: the capture's CSS box (x, y, w) fills the window's width. */
const windowOf = (s) => {
  const file = path.join(PROMO, s.file);
  if (!fs.existsSync(file)) throw new Error(`no screen ${s.file}: run its capture first`);
  const scale = 900 / s.w;
  // A screen that runs on past the window fades into it; one shown whole (fade: false) does not.
  return `<div class="window${s.fade === false ? "" : " fade"}"><img src="${url(file)}" alt="" style="width:${390 * scale}px;left:${-s.x * scale}px;top:${-s.y * scale}px"></div>`;
};

// The set, in order. Card k of n carries its own place, for a look that moves with the set.
const plan = [
  { name: "cover", make: () => `
    <div class="body" style="top:${look.below}px">
      <p class="eyebrow">New in Purify</p>
      <h1 class="title big">Purify ${esc(drop.version)}<br>is here.</h1>
      <p class="line">${esc(drop.name)}.</p>
    </div>
    <div class="foot">purifyapp.net</div>` },
  { name: "whats-new", make: () => `
    <div class="body" style="top:${look.below}px">
      <p class="eyebrow">New in Purify ${esc(drop.version)}</p>
      <h1 class="title">What is new.</h1>
      <ul class="list">${drop.points.map((p) => `<li>${esc(p.short)}</li>`).join("")}</ul>
    </div>` },
  ...look.features.filter((f) => f.screen).map((f) => ({ name: f.point, make: () => {
    const p = point(f.point);
    return `
    <div class="body" style="top:${look.below}px">
      ${windowOf(f.screen)}
      <p class="eyebrow" style="margin-top:22px">${esc(f.eyebrow)}</p>
      <h1 class="title">${lean(p.name, f.lean)}.</h1>
      <p class="line">${esc(p.text)}</p>
    </div>`;
  } })),
  ...["the App Store", "Google Play"].map((store) => ({ name: `close-${store.replace(/^the /, "").toLowerCase().replace(/ /g, "-")}`, last: true, make: () => `
    <div class="body" style="top:${look.below}px">
      <p class="eyebrow">Free to read</p>
      <h1 class="title big">The library<br>stays <b>free</b>.</h1>
      <p class="line">${esc(drop.closing)}</p>
    </div>
    <div class="foot">Find Purify: Orthodox Hub on ${store}</div>` })),
];
const n = plan.filter((c) => !c.last).length + 1;

const OUT = dir("cards", release);
const HTML = dir("cards", release, "html");
const SEND = dir("cards", release, "send");
const browser = await launch();
const tab = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 })).newPage();
const made = [];
for (const [i, c] of plan.entries()) {
  const k = c.last ? n : i + 1;
  const name = `${String(c.last ? n : i + 1).padStart(2, "0")}-${c.name}`;
  if (only && !only.includes(c.name)) continue;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}${look.css}</style></head><body>
<div class="card">${look.crown(k, n)}${mark}${c.make()}<div class="grain"></div></div></body></html>`;
  const file = path.join(HTML, `${name}.html`);
  fs.writeFileSync(file, html);
  await tab.goto(url(file));
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForFunction(() => [...document.images].every((im) => im.complete && im.naturalWidth > 0), null, { timeout: 15000 });
  const png = path.join(OUT, `${name}.png`);
  await tab.screenshot({ path: png });
  await sharp(png).resize(1080, 1920, { kernel: "lanczos3" }).jpeg({ quality: 92 }).toFile(path.join(SEND, `${name}.jpg`));
  made.push(png);
  console.log("card", name);
}
await browser.close();

if (made.length) {
  const [w, h, gap] = [360, 640, 12];
  const tiles = await Promise.all(made.map((f) => sharp(f).resize(w, h, { kernel: "lanczos3" }).toBuffer()));
  await sharp({ create: { width: made.length * (w + gap) + gap, height: h + 2 * gap, channels: 3, background: "#18181a" } })
    .composite(tiles.map((input, i) => ({ input, left: gap + i * (w + gap), top: gap })))
    .jpeg({ quality: 88 })
    .toFile(path.join(SEND, "all.jpg"));
  console.log("sheet", path.join(SEND, "all.jpg"));
}
