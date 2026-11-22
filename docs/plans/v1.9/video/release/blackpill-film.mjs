#!/usr/bin/env node
// The edit, as a film: the storyboard (blackpill-board.mjs) in motion, at his words of 2026-11-21: "this is good,
// but just make the effects grittier", and, to the seven effects put to him, "let's do it".
//
//   node docs/plans/v1.9/video/release/blackpill-film.mjs --sheet     a still from every shot, to look at
//   node docs/plans/v1.9/video/release/blackpill-film.mjs --check     checkMock in the middle of every shot
//   node docs/plans/v1.9/video/release/blackpill-film.mjs --render    every frame, then the file (silent)
//   ... --from 3.7 --to 7.7   only part of the film (for a look, or to make a part again)
//
// 35.2 seconds, 1080 by 1920, 60 frames a second, H.264, no sound stream. Every cut and every line lands on a hit
// measured from his track (forever-edit-prompt.md). The words are the storyboard's own, each checked there against
// the app's text. The pictures are old icons, none on the heritage list.
//
// The seven effects, all on the picture and never on the words: moving grain with dust and scratches; crushed
// blacks; a colour split on the hits; a shake and a punch in on the hits; one bright frame on a cut (never more than
// three in a second); a short blur on the fast moves; a flicker like a projector's. No glow, no rays, no flare.
// Every frame is worked out from its own number, so the film renders the same every time.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ORIGIN, OUT, ROOT, checkMock, dir, heritageNamedIn, launch, serveLikeTheShell, sharp, wait } from "../lib.mjs";
import { HOOK, LINES } from "./blackpill-board.mjs";

const [W, H, FPS] = [1080, 1920, 60];
export const SECONDS = 35.2;
const fail = (text) => {
  throw new Error(text);
};
const HOME = dir("release", "blackpill-film");

// ── The pictures ─────────────────────────────────────────────────────────
// The largest copy of each icon the app's repository holds; the Sinai icon of Christ is a larger copy of the app's
// own picture, from Wikimedia Commons (a sixth century work, in the public domain), kept out of git.
const PICS = {
  christ: [".promo/v1.9-video/release/blackpill-pics/pantocrator-sinai.jpg", "Christ Pantocrator, Sinai, sixth century"],
  michael: ["public/covers/saints/archangel-michael.v1.jpg", "The Archangel Michael"],
  paul: ["public/covers/saints/apostle-paul.v1.jpg", "The Apostle Paul"],
  athanasius: ["public/covers/authors/athanasius-the-great.v1.jpg", "St Athanasius the Great"],
  cross: ["public/icons/prayer/crucifixion.v2.jpg", "The Crucifixion"],
  pentecost: ["public/history/media/pentecost.v1.jpg", "Pentecost"],
  hierarchs: ["public/icons/prayer/three-hierarchs.v2.jpg", "The Three Hierarchs"],
  anastasis: ["public/icons/prayer/anastasis.jpg", "The Resurrection"],
};
for (const [file] of Object.values(PICS)) {
  if (!fs.existsSync(path.join(ROOT, file))) fail(`no picture ${file} (the Sinai icon: see docs/handoffs/forever-edit.md)`);
  if (Object.keys(heritageNamedIn(`/${file.replace(/^public\//, "")}`)).length) fail(`${file} is on the heritage list`);
}

// ── The cut ──────────────────────────────────────────────────────────────
//
// A shot:
//   at      [from, to] in seconds; a shot begins on a measured hit
//   pic     the picture; x, y what the frame holds (parts in a hundred); z the zoom, from its first frame to its last
//   grade   "bw" or "colour"; lit how bright
//   hits    the measured hits inside it that the picture answers (a shake, a punch in, a colour split)
//   fast    true: the answer is stronger and blurs
//   flash   true: one bright frame as it cuts in
//   words   lines, when each lands (seconds), size, y, cite
//   mark    Purify's mark alone, still

const W_ = (line, at, size, y) => {
  if (at.length !== line.lines.length) fail(`"${line.text}": a time for each line`);
  return { lines: line.lines, at, cite: line.cite, size, y };
};
export const SHOTS = [
  { name: "The hook", at: [0, 2.07], pic: "christ", x: 47, y: 24.5, z: [3.3, 3.45], grade: "bw", lit: 0.2, hits: [0.07], words: W_(HOOK, [0, 0, 0, 0], 166, 540) },
  { name: "The stare", at: [2.07, 3.72], pic: "christ", x: 47, y: 24.5, z: [2.55, 2.75], grade: "bw", lit: 0.66, hits: [2.07], flash: true },
  { name: "The gods of the nations", at: [3.72, 7.64], pic: "michael", x: 68, y: 24, z: [1.25, 1.42], grade: "bw", lit: 0.5, hits: [3.72, 4.37, 5.02, 5.67, 6.66], flash: true, words: W_(LINES.psalm, [3.72, 4.37, 5.02, 5.67, 6.66], 104, 640) },
  { name: "The Apostle", at: [7.64, 11.61], pic: "paul", x: 24, y: 20, z: [1.3, 1.5], grade: "bw", lit: 0.46, hits: [7.64, 8.31, 8.99, 9.64, 10.31, 10.96], flash: true, words: W_(LINES.paul, [7.64, 8.31, 8.99, 9.64, 10.31, 10.96], 104, 640) },
  { name: "The witnesses: the Archangel", at: [11.61, 12.28], pic: "michael", x: 74, y: 19, z: [1.9, 2.0], grade: "bw", lit: 0.74, hits: [11.61], fast: true, flash: true },
  { name: "The witnesses: St Paul", at: [12.28, 13.61], pic: "paul", x: 24, y: 19, z: [2.5, 2.7], grade: "bw", lit: 0.74, hits: [12.28, 12.93], fast: true, flash: true },
  { name: "The witnesses: St Athanasius", at: [13.61, 14.28], pic: "athanasius", x: 49, y: 31, z: [1.9, 2.0], grade: "bw", lit: 0.72, hits: [13.61], fast: true, flash: true },
  { name: "The witnesses: the Three Hierarchs", at: [14.28, 15.91], pic: "hierarchs", x: 50, y: 22, z: [1.7, 1.95], grade: "bw", lit: 0.7, hits: [14.28, 14.93], fast: true, flash: true },
  { name: "One", at: [15.91, 19.25], pic: "cross", x: 50, y: 42, z: [1.6, 1.85], grade: "bw", lit: 0.56, hits: [15.91, 17.25, 17.9, 18.55], flash: true, words: W_(LINES.one, [17.25, 17.9, 18.55], 168, 660) },
  { name: "The Church for his mother", at: [19.25, 23.55], pic: "pentecost", x: 50, y: 52, z: [1.35, 1.55], grade: "bw", lit: 0.46, hits: [19.25, 20.25, 21.25, 21.87], flash: true, words: W_(LINES.cyprian, [20.25, 20.25, 20.25, 21.25, 21.25, 21.87], 104, 560) },
  { name: "The Creed", at: [23.55, 27.49], pic: "hierarchs", x: 50, y: 30, z: [1.4, 1.6], grade: "bw", lit: 0.38, hits: [23.55, 24.54, 25.19, 25.84], flash: true, words: W_(LINES.creed, [23.55, 24.54, 25.19, 25.84], 116, 700) },
  { name: "The Resurrection", at: [27.49, 30.49], pic: "anastasis", x: 52, y: 40, z: [1.5, 2.0], steps: [28.19, 28.84, 29.49], grade: "bw", lit: 0.8, hits: [27.49, 28.19, 28.84, 29.49], fast: true, flash: true },
  { name: "The breath", at: [30.49, 31.16] },
  { name: "The way", at: [31.16, 34.48], pic: "christ", x: 47, y: 30, z: [1.22, 1.36], grade: "colour", lit: 0.56, hits: [31.16, 32.16, 33.81], flash: true, words: W_(LINES.way, [31.16, 31.66, 32.16, 32.71, 33.26, 33.81], 104, 760) },
  { name: "The end", at: [34.48, SECONDS], mark: true },
];
// The cut is whole, in order, and never flashes more than three times in a second.
SHOTS.forEach((s, i) => {
  if (s.at[0] !== (i ? SHOTS[i - 1].at[1] : 0)) fail(`"${s.name}" does not begin where the shot before it ends`);
  if (s.pic && !PICS[s.pic]) fail(`"${s.name}": no such picture`);
  for (const h of s.hits ?? []) if (h < s.at[0] - 0.08 || h >= s.at[1]) fail(`"${s.name}": the hit ${h} is not inside it`);
  for (const t of s.words?.at ?? []) if (t < s.at[0] || t >= s.at[1]) fail(`"${s.name}": a line lands outside it`);
});
if (SHOTS.at(-1).at[1] !== SECONDS) fail("the cut does not end where the film does");
const FLASHES = SHOTS.filter((s) => s.flash).map((s) => s.at[0]);
for (const t of FLASHES) if (FLASHES.filter((u) => u >= t && u < t + 1).length > 3) fail(`more than three bright frames in the second from ${t}`);

// ── The stage ────────────────────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
if (!SHEETS.length) fail("the front door names no stylesheet");

const stagePage = () => `<!doctype html>
<html lang="en" dir="ltr" class="${HTML_CLASS}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, initial-scale=1">
${SHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night-deep); }
  html { scrollbar-gutter: auto; }
  [data-stage] { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night-deep); color: var(--color-paper); }
  [data-flip], [data-split], [data-under], [data-edge], [data-flash], [data-dust] { position: absolute; inset: 0; }
  :root[dir="rtl"] [data-flip] { transform: scaleX(-1); }
  [data-pic] { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; will-change: transform; }
  [data-under], [data-edge], [data-flash], [data-dust], [data-grain] { pointer-events: none; }
  [data-grain] { position: absolute; left: 0; top: 0; width: ${W / 2}px; height: ${H / 2}px; transform: scale(2); transform-origin: 0 0; mix-blend-mode: overlay; opacity: 0.62; }
  [data-edge] { background-image: radial-gradient(ellipse 92% 80% at 50% 48%, transparent 36%, color-mix(in srgb, var(--color-night-deep) 90%, transparent) 100%); }
  [data-flash] { background-color: var(--color-paper); opacity: 0; }
  [data-mark] { position: absolute; left: 0; top: 820px; width: ${W}px; height: 280px; background-color: var(--color-paper); -webkit-mask: url(/purify-cross-mark.png) center / contain no-repeat; mask: url(/purify-cross-mark.png) center / contain no-repeat; }
  [data-words] { position: absolute; inset-inline: 0; box-sizing: border-box; margin: 0; padding: 0 56px; text-align: center; font-family: var(--font-sans); font-weight: 700; line-height: 1.04; letter-spacing: -0.035em; color: var(--color-paper); }
  [data-words] span { display: block; }
  [data-cite] { position: absolute; inset-inline: 0; margin: 0; text-align: center; font-family: var(--font-sans); font-weight: 600; font-size: 44px; letter-spacing: 0.01em; color: var(--color-paper); }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="split" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="0 0" result="b"/>
    <feOffset in="b" dx="0" result="r"/><feColorMatrix in="r" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rr"/>
    <feOffset in="b" dx="0" result="l"/><feColorMatrix in="l" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="ll"/>
    <feBlend in="rr" in2="ll" mode="screen"/>
  </filter>
</svg>
<main data-stage>
  <div data-flip>
    <div data-split>${Object.keys(PICS).map((k) => `<img data-pic data-name="${k}" alt="" src="/__pic/${k}" hidden>`).join("")}</div>
    <div data-under aria-hidden="true"></div>
    <svg data-grain aria-hidden="true" viewBox="0 0 ${W / 2} ${H / 2}"><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="2" seed="1"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.5 0 0 0 -0.34"/></filter><rect width="100%" height="100%" filter="url(#grain)"/></svg>
    <canvas data-dust width="${W}" height="${H}" aria-hidden="true"></canvas>
    <div data-edge aria-hidden="true"></div>
    <div data-flash aria-hidden="true"></div>
  </div>
  <span data-mark aria-hidden="true" hidden></span>
  <h1 data-words hidden></h1><p data-cite hidden></p>
</main>
<script>
  const SHOTS = ${JSON.stringify(SHOTS)};
  const FPS = ${FPS};
  const ANSWER = 0; // how much the picture answers a hit (1 in the first render)
  const BRIGHT = 0; // the bright frame on a cut (1 in the first render): a cut is a cut and nothing else
  const LAND = 0; // how much larger a line lands than it rests (0.16 in the first render): a line is simply there
  const one = (q) => document.querySelector(q);
  // A number from a frame's own number: the same film every time.
  const rand = (n, k) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const dust = one("[data-dust]").getContext("2d");
  let worn = null;
  window.__ready = () => Promise.all([...document.querySelectorAll("[data-pic]")].map((i) => i.decode()).concat(Object.assign(new Image(), { src: "/purify-cross-mark.png" }).decode()));
  window.__frame = async (n) => {
    const t = n / FPS;
    const s = SHOTS.find((x) => t >= x.at[0] && t < x.at[1]) ?? SHOTS[SHOTS.length - 1];
    const u = (t - s.at[0]) / (s.at[1] - s.at[0]);
    // What the last hit still does to the picture: all of it on the hit, gone a fifth of a second later.
    const hit = (s.hits ?? []).filter((h) => h <= t + 1e-6).pop();
    // His word on the first render (2026-11-22): "the effect that matches the beat is too vibe coded ... I want clean
    // transitions". So nothing answers a hit any more: no shake, no punch in, no colour split, no blur. ANSWER is 0.
    const d = ANSWER * (hit == null ? 0 : Math.exp(-(t - hit) / (s.fast ? 0.085 : 0.07)));
    const strong = s.fast ? 1.5 : 1;
    document.querySelectorAll("[data-pic]").forEach((img) => (img.hidden = img.dataset.name !== s.pic));
    if (s.pic) {
      const img = one('[data-pic][data-name="' + s.pic + '"]');
      let zoom = s.z[0] + (s.z[1] - s.z[0]) * u;
      // The Resurrection comes nearer by steps, one on each beat.
      if (s.steps && ANSWER) { const k = s.steps.filter((x) => x <= t + 1e-6).length; zoom = s.z[0] + ((s.z[1] - s.z[0]) * k) / s.steps.length + 0.04 * u; }
      zoom *= 1 + 0.055 * strong * d;
      const dx = (rand(n, 1) * 2 - 1) * (0.5 + 24 * strong * d);
      const dy = (rand(n, 2) * 2 - 1) * (0.5 + 18 * strong * d);
      const flicker = 1 + (rand(n, 3) - 0.5) * 0.09;
      img.style.objectPosition = s.x + "% " + s.y + "%";
      img.style.transformOrigin = s.x + "% " + s.y + "%";
      img.style.transform = "translate(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px) scale(" + zoom.toFixed(4) + ")";
      img.style.filter = (s.grade === "bw" ? "grayscale(1) contrast(1.75) " : "contrast(1.18) saturate(1.08) ") + "brightness(" + (s.lit * flicker).toFixed(3) + ")";
      const split = 11 * strong * d;
      const blur = s.fast ? 16 * d : 0;
      const f = one("#split");
      if (split < 0.4 && blur < 0.4) one("[data-split]").style.filter = "none";
      else {
        f.children[0].setAttribute("stdDeviation", blur.toFixed(2) + " 0");
        f.children[1].setAttribute("dx", split.toFixed(2));
        f.children[3].setAttribute("dx", (-split).toFixed(2));
        one("[data-split]").style.filter = "url(#split)";
      }
    }
    one("[data-under]").style.backgroundColor = s.words && s.pic ? "color-mix(in srgb, var(--color-night-deep) 34%, transparent)" : "transparent";
    // Grain: new on every frame. Dust and scratches: a few specks on most frames, a hairline now and then.
    one("#grain feTurbulence").setAttribute("seed", String(1 + (n % 997)));
    one("[data-grain]").style.opacity = s.mark ? 0.3 : 0.62;
    dust.clearRect(0, 0, ${W}, ${H});
    if (!s.mark) {
      const paper = getComputedStyle(document.documentElement).getPropertyValue("--color-paper").trim();
      dust.fillStyle = paper; dust.strokeStyle = paper;
      const specks = Math.floor(rand(n, 4) * 7);
      for (let i = 0; i < specks; i++) { dust.globalAlpha = 0.16 + rand(n, 10 + i) * 0.3; dust.beginPath(); dust.arc(rand(n, 20 + i) * ${W}, rand(n, 30 + i) * ${H}, 0.8 + rand(n, 40 + i) * 2.6, 0, 7); dust.fill(); }
      if (rand(n, 5) < 0.3) { const x = rand(Math.floor(n / 3), 6) * ${W}; dust.globalAlpha = 0.1 + rand(n, 7) * 0.12; dust.lineWidth = 1.2; dust.beginPath(); dust.moveTo(x, rand(n, 8) * 300); dust.lineTo(x + (rand(n, 9) - 0.5) * 8, ${H} - rand(n, 11) * 400); dust.stroke(); }
      if (rand(n, 12) < 0.07) { const x = rand(n, 13) * ${W}, y = rand(n, 14) * ${H}; dust.globalAlpha = 0.32; dust.lineWidth = 1.6; dust.beginPath(); dust.moveTo(x, y); dust.quadraticCurveTo(x + 30, y + 18, x + 12, y + 58); dust.stroke(); }
    }
    // One bright frame as a shot cuts in, and its tail on the next.
    const since = Math.round((t - s.at[0]) * FPS);
    one("[data-flash]").style.opacity = BRIGHT && s.flash ? (since === 0 ? 0.62 : since === 1 ? 0.2 : 0) : 0;
    one("[data-mark]").hidden = !s.mark;
    const words = one("[data-words]");
    const cite = one("[data-cite]");
    words.hidden = !s.words;
    if (s.words) {
      if (worn !== s.name) { worn = s.name; words.replaceChildren(...s.words.lines.map((text) => Object.assign(document.createElement("span"), { textContent: text }))); }
      words.style.top = s.words.y + "px";
      words.style.fontSize = s.words.size + "px";
      [...words.children].forEach((span, i) => {
        const since = t - s.words.at[i];
        span.style.visibility = since >= -1e-6 ? "visible" : "hidden";
        // A line lands a little large and is its own size a tenth of a second later. It does not shake.
        span.style.transform = "scale(" + (1 + LAND * Math.exp(-Math.max(0, since) / 0.045)).toFixed(4) + ")";
      });
      const last = Math.max(...s.words.at);
      cite.hidden = !(s.words.cite && t >= last - 1e-6);
      cite.textContent = s.words.cite ?? "";
      cite.style.top = s.words.y + s.words.lines.length * s.words.size * 1.04 + 48 + "px";
    } else cite.hidden = true;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
</script>
</body>
</html>`;

async function openStage(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US" });
  await serveLikeTheShell(ctx, OUT, {});
  const html = stagePage();
  await ctx.route(`${ORIGIN}/__video/**`, (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: html }));
  await ctx.route(`${ORIGIN}/__pic/**`, (route) => {
    const pic = PICS[new URL(route.request().url()).pathname.replace("/__pic/", "")];
    return pic ? route.fulfill({ contentType: "image/jpeg", path: path.join(ROOT, pic[0]) }) : route.fulfill({ status: 404, body: "" });
  });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/__video/stage.html`, { waitUntil: "load" });
  await page.evaluate(() => window.__ready());
  const frame = (n) => page.evaluate((k) => window.__frame(k), n);
  await frame(30);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
  });
  await wait(400);
  const face = await page.evaluate(() => {
    const first = getComputedStyle(document.querySelector("[data-words]")).fontFamily.split(",")[0].trim();
    return { first, loaded: document.fonts.check(`700 100px ${first}`) };
  });
  if (!/DM Sans/.test(face.first) || !face.loaded) fail(`the type is not the app's sans, loaded (${JSON.stringify(face)})`);
  const cdp = await ctx.newCDPSession(page);
  const shoot = async (format = "png") => Buffer.from((await cdp.send("Page.captureScreenshot", format === "png" ? { format } : { format: "jpeg", quality: 96 })).data, "base64");
  return { page, frame, shoot };
}

// ── The work ─────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i < 0 ? null : args[i + 1] ?? true;
  };
  const browser = await launch();
  const stage = await openStage(browser);
  if (flag("sheet")) {
    // Each shot a little after a hit, so the effects are in the picture; or the times given.
    const times = typeof flag("sheet") === "string" ? flag("sheet").split(",").map(Number) : SHOTS.map((s) => (s.words ? Math.max(...s.words.at) + 0.03 : s.at[0] + 0.05));
    const small = [];
    for (const t of times) {
      await stage.frame(Math.round(t * FPS));
      small.push(await sharp(await stage.shoot()).resize(270).toBuffer());
    }
    const cols = Math.min(small.length, 8);
    const file = path.join(HOME, "sheet.jpg");
    await sharp({ create: { width: cols * 276, height: Math.ceil(small.length / cols) * 486, channels: 3, background: "#666" } })
      .composite(small.map((input, i) => ({ input, left: (i % cols) * 276 + 3, top: Math.floor(i / cols) * 486 + 3 })))
      .jpeg({ quality: 84 })
      .toFile(file);
    console.log(file, times.map((t) => t.toFixed(2)).join(" "));
  } else if (flag("check")) {
    let bad = 0;
    for (const s of SHOTS) {
      await stage.frame(Math.round(((s.at[0] + s.at[1]) / 2) * FPS));
      const result = await checkMock(stage.page, "[data-stage]");
      const failures = [...new Set(result.failures.map((x) => `${x.check}${x.palette ? ` (${x.palette})` : ""}: ${x.what}: ${x.detail}`))];
      if (failures.length) bad++;
      console.log(`${failures.length ? "NO  " : "ok  "} ${s.name}${failures.length ? `\n      ${failures.slice(0, 8).join("\n      ")}` : ""}`);
    }
    process.exitCode = bad ? 1 : 0;
  } else if (flag("render")) {
    const from = Math.round(Number(flag("from") ?? 0) * FPS);
    const to = Math.round(Number(flag("to") ?? SECONDS) * FPS);
    const file = path.join(HOME, flag("from") || flag("to") ? `part-${from}-${to}.mp4` : "purify-edit-forever.mp4");
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", "-r", String(FPS), file], { stdio: ["pipe", "inherit", "inherit"] });
    const done = new Promise((resolve, reject) => ff.on("close", (code) => (code ? reject(new Error(`ffmpeg ${code}`)) : resolve())));
    const began = Date.now();
    for (let n = from; n < to; n++) {
      await stage.frame(n);
      const jpg = await stage.shoot("jpeg");
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
      if ((n - from) % 300 === 299) console.log(`${n + 1 - from} of ${to - from} frames, ${((Date.now() - began) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await done;
    console.log(file);
  }
  await browser.close();
}
