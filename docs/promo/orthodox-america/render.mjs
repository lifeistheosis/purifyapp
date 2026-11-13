// The film's maker: opens film.html at 1920 by 1080, steps it one thirtieth
// of a second at a time, and has ffmpeg write the frames as H.264.
//
//   node docs/promo/orthodox-america/render.mjs --check    the rules, no pictures
//   node docs/promo/orthodox-america/render.mjs --sheet    stills of each scene, full size and at a phone's 844 by 390
//   node docs/promo/orthodox-america/render.mjs --draft    a small, quick film for the maker's own eye
//   node docs/promo/orthodox-america/render.mjs            every frame, then the file (once)
//   node docs/promo/orthodox-america/render.mjs --film --resume   the same, keeping the frames a stopped run left
//
// Needs Playwright with its Chromium, ffmpeg, and the faces and map tools in
// .promo/orthodox-america/tools (npm install @fontsource/dm-serif-display
// @fontsource/dm-sans us-atlas topojson-client there). Nothing is paid for.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { FACTS } from "./facts.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.join(ROOT, ".promo/orthodox-america");
const TOOLS = path.join(OUT, "tools");
const FPS = 30;
const mode = process.argv[2] || "--film";

// ---- The page, with the house's own faces and the map inside it ------------
const face = (pkg, file, family, weight) => {
  const b64 = fs.readFileSync(path.join(TOOLS, "node_modules/@fontsource", pkg, "files", file)).toString("base64");
  return `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
};
const FACES = [
  face("dm-serif-display", "dm-serif-display-latin-400-normal.woff2", "DM Serif Display", 400),
  face("dm-sans", "dm-sans-latin-400-normal.woff2", "DM Sans", 400),
].join("\n");
const source = fs.readFileSync(path.join(HERE, "film.html"), "utf8");
const map = fs.readFileSync(path.join(HERE, "map.json"), "utf8");
const html = source.replace("<style>", `<script>window.MAP=${map}</script>\n<style>\n${FACES}`);

// ---- The rules a promo is held to, read from the scene code itself ---------
// lib/marketing/__tests__/promoLooks.test.ts refuses a conic-gradient in a
// promo script (rays). The same measure here, with the house's other words.
const problems = [];
if (/conic-gradient/.test(source)) problems.push("a conic gradient (rays): light is a soft pool or nothing");
if (/[—–]/.test(source)) problems.push("a dash in place of words");
if (/[✦✧✨]/.test(source)) problems.push("a sparkle");
if (/border-(left|right|inline-start|inline-end)\s*:/.test(source)) problems.push("a one-sided border (a side stripe)");
if (/border-radius:\s*(999|9999|100)px/.test(source)) problems.push("a pill");
if (/<img|background-image:\s*url|<video|<image/.test(source)) problems.push("a picture: this film has none, so the heritage list is not touched");
if (/sepia|#f1e8d4|parchment/i.test(source)) problems.push("parchment or sepia");
for (const f of FACTS) for (const s of f.show) if (!source.includes(s)) problems.push(`facts.mjs shows "${s}" (${f.scene}) but film.html does not`);
// Colour: every colour typed in must be a grey (r = g = b).
for (const [, hex] of source.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
  const h = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!(h.slice(0, 2) === h.slice(2, 4) && h.slice(2, 4) === h.slice(4, 6))) problems.push(`a colour that is not grey: #${hex}`);
}
for (const [, r, g, b] of source.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)) if (!(r === g && g === b)) problems.push(`a colour that is not grey: rgb(${r},${g},${b})`);

const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
const open = async (width, height, scale) => {
  const tab = await (await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale })).newPage();
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  for (const f of ["DM Serif Display", "DM Sans"]) if (!(await tab.evaluate((n) => document.fonts.check(`20px "${n}"`), f))) throw new Error(`the face ${f} did not load`);
  return tab;
};

// Contrast: every word against the lightest the ground gets under it (the
// pool's centre, #161616), at the moment each scene is fullest. 4.5:1 or more.
const tab = await open(1920, 1080, 1);
const scenes = await tab.evaluate(() => window.__scenes);
const total = await tab.evaluate(() => window.__total);
const lum = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const ratio = (c) => (lum(c) + 0.05) / (lum(0x16) + 0.05);
let words = 0, least = 99;
for (const s of scenes) {
  const found = await tab.evaluate((id) => {
    const out = [];
    const root = document.querySelector(`#txt section[data-s="${id}"]`), pics = document.querySelector(`#gfx section[data-s="${id}"]`);
    for (const el of [...root.querySelectorAll("*"), ...pics.querySelectorAll("text")]) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const cs = getComputedStyle(el), col = (el instanceof SVGElement ? cs.fill : cs.color).match(/\d+/g).map(Number);
      out.push({ text: el.textContent.trim().slice(0, 40), col, size: parseFloat(cs.fontSize) });
    }
    return out;
  }, s.id);
  for (const w of found) {
    words++;
    if (!(w.col[0] === w.col[1] && w.col[1] === w.col[2])) problems.push(`${s.id}: "${w.text}" is not grey`);
    const r = ratio(w.col[0]); least = Math.min(least, r);
    if (r < 4.5) problems.push(`${s.id}: "${w.text}" is ${r.toFixed(2)}:1 on the pool`);
    if (w.size < 26) problems.push(`${s.id}: "${w.text}" is ${w.size}px, under 26 (11.4 on a phone held sideways)`);
  }
}
console.log(`checked: ${words} pieces of words, least contrast ${least.toFixed(2)}:1, ${FACTS.reduce((n, f) => n + f.show.length, 0)} figures found on screen, ${(total / 1000).toFixed(1)} s`);
if (problems.length) { console.error("refused:\n  " + problems.join("\n  ")); await browser.close(); process.exit(1); }
if (mode === "--check") { await browser.close(); process.exit(0); }

if (mode === "--sheet") {
  // A still near the end of each part of each scene, full size, and the same at a phone's size.
  const MOMENTS = { title: [4], one: [4.5, 11], gap: [5.8, 11.4, 17, 23.6], six: [6, 13.6], who: [8.6, 21], where: [6.6, 13.8, 21], change: [8, 16.6, 22], sources: [8] };
  const dir = path.join(OUT, "sheet"); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const phone = await open(1920, 1080, 844 / 1920);
  for (const s of scenes) for (const [k, m] of MOMENTS[s.id].entries()) {
    const ms = (s.start + m) * 1000;
    await tab.evaluate((t) => window.__seek(t), ms); await tab.screenshot({ path: path.join(dir, `${s.id}-${k + 1}.jpg`), type: "jpeg", quality: 90 });
    await phone.evaluate((t) => window.__seek(t), ms); await phone.screenshot({ path: path.join(dir, `${s.id}-${k + 1}-phone.png`) });
  }
  console.log("stills in", path.relative(ROOT, dir));
  await browser.close(); process.exit(0);
}

// ---- Every frame, then the file --------------------------------------------
const draft = mode === "--draft";
const cam = draft ? await open(1920, 1080, 0.5) : tab;
const fps = draft ? 10 : FPS;
const frames = path.join(OUT, draft ? "frames-draft" : "frames");
// --resume keeps the frames a stopped run left (each frame is the same every time) and takes the rest.
const resume = process.argv.includes("--resume");
if (!resume) fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });
const have = fs.readdirSync(frames).filter((f) => f.endsWith(".png")).length;
const count = Math.round((total / 1000) * fps);
const started = Date.now();
for (let i = Math.max(0, have - 2); i < count; i++) {
  await cam.evaluate((t) => window.__seek(t), (i * 1000) / fps);
  await cam.screenshot({ path: path.join(frames, `f${String(i).padStart(5, "0")}.png`) });
  if (i % 300 === 0) console.log(`frame ${i} of ${count}`);
}
await browser.close();
console.log(`${count} frames in ${Math.round((Date.now() - started) / 1000)} s`);

const file = path.join(OUT, draft ? "draft.mp4" : "orthodox-america.mp4");
// Fine grain, the same on every render (a fixed seed), laid over the whole
// picture as film has it; grey only, then H.264 for any editor or phone.
const look = draft ? "format=gray,format=yuv420p" : "format=gray,noise=c0s=7:c0f=t:all_seed=1113,format=yuv420p";
const enc = (extra) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(frames, "f%05d.png"),
  "-vf", look, "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-pix_fmt", "yuv420p", "-an", ...extra], { cwd: OUT, stdio: "inherit" });
if (draft) enc(["-crf", "26", file]);
else {
  // Two passes to a size the page's own store can hold (under 15 MB).
  const kbps = Math.floor((14.2 * 8192) / (total / 1000));
  enc(["-b:v", `${kbps}k`, "-pass", "1", "-f", "null", "/dev/null"]);
  enc(["-b:v", `${kbps}k`, "-pass", "2", "-movflags", "+faststart", file]);
  // The poster: the gap, at its last step.
  const gap = scenes.find((s) => s.id === "gap");
  fs.copyFileSync(path.join(frames, `f${String(Math.round((gap.start + 23.4) * FPS)).padStart(5, "0")}.png`), path.join(OUT, "poster.png"));
}
console.log(path.relative(ROOT, file), fs.statSync(file).size, "bytes");
