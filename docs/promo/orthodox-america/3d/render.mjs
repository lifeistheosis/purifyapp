// The 3D sample's maker: serves shot.html to headless Chromium (WebGL2 in
// software, through SwiftShader), asks it for one frame at a time, and has
// ffmpeg write the frames as H.264. Free: no paid generation, no GPU, no stock.
//
//   node docs/promo/orthodox-america/3d/render.mjs --check          the rules and the measures, no film
//   node docs/promo/orthodox-america/3d/render.mjs --stills 1.2,3.5 stills at those seconds, full size and at a phone's 390
//   node docs/promo/orthodox-america/3d/render.mjs --draft          a small quick film for the maker's own eye
//   node docs/promo/orthodox-america/3d/render.mjs --film           every frame, then the file
//   node docs/promo/orthodox-america/3d/render.mjs --film --resume  the same, keeping the frames a stopped run left
//
// Needs Playwright with its Chromium, ffmpeg, and the tools in
// .promo/orthodox-america-3d/tools (npm install three world-atlas us-atlas
// topojson-client d3-geo @fontsource/dm-serif-display @fontsource/dm-sans @fontsource/archivo-narrow there).
//
//   --stills also takes --strip: the stills side by side in one small picture, for reading a move.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { FACTS, DERIVED } from "../facts.mjs";
import { FPS, SECONDS, SCENE_ONE, NUMERALS, SIX, FIGURE, CAPTION, SOURCE_LINE, TITLE, ROLLS, SUNDAY, PEOPLE_A_POINT, SHARE, CAPTION_ROLLS, CAPTION_SUNDAY, SHARE_LINE, KEY } from "./words.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const OUT = path.join(ROOT, ".promo/orthodox-america-3d");
const TOOLS = path.join(OUT, "tools/node_modules");
const mode = process.argv[2] || "--check";
const has = (flag) => process.argv.includes(flag);

// ---- The rules, read from the code itself ----------------------------------
// lib/marketing/__tests__/promoLooks.test.ts refuses a conic gradient in a
// promo script (rays) and the sparkle's glyphs. The same measure here, with
// the 3D words for the same things, and the house's other rules.
const problems = [];
const CODE = ["shot.js", "shot.html", "words.mjs"];
for (const file of CODE) {
  const source = fs.readFileSync(path.join(HERE, file), "utf8");
  const no = (re, what) => { if (re.test(source)) problems.push(`${file}: ${what}`); };
  no(/conic-gradient/, "a conic gradient (rays): light is a soft pool or nothing");
  no(/god\s*rays|GodRays|Lensflare|lens\s*flare|anamorphic|sunburst|starburst|volumetric/i, "rays, a flare or a streak by name");
  no(/[–—]/, "a dash in place of words");
  no(/[✦✧✨]/u, "a sparkle");
  no(/sepia|#f1e8d4|parchment/i, "parchment or sepia");
  no(/<img|<video|TextureLoader|\.(jpe?g|png|webp|mp4)["'`]/, "a borrowed picture: this shot has none, so the heritage list is not touched");
  for (const [, hex] of source.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const h = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    // The world's mask is drawn in red, green and blue as three separate pieces of data; it is never shown.
    if (["ff0000", "00ff00", "0000ff"].includes(h.toLowerCase()) && file === "shot.js") continue;
    if (!(h.slice(0, 2) === h.slice(2, 4) && h.slice(2, 4) === h.slice(4, 6))) problems.push(`${file}: a colour that is not grey: #${hex}`);
  }
}
// Every figure on screen stands in facts.mjs, as the first film checked it.
const where = FACTS.filter((f) => f.scene === "where");
const shown = where.flatMap((f) => f.show), said = where.map((f) => f.says).join(" ");
if (!shown.includes(FIGURE)) problems.push(`facts.mjs does not show ${FIGURE}`);
for (const s of SIX) {
  if (!shown.includes(`${s.share.toFixed(1)}%`)) problems.push(`facts.mjs does not show ${s.share}% (${s.name})`);
  if (!said.includes(`${s.name} (${s.share.toFixed(1)}%)`)) problems.push(`the source's words do not give ${s.name} ${s.share}%`);
}
if (Math.abs(SIX.reduce((n, s) => n + s.share, 0) - Number(FIGURE)) > 0.051) problems.push("the six shares do not add up to the figure");
// Scene two: the two counts as the first film checked them, and the share as the two divided.
const gap = FACTS.filter((f) => f.scene === "gap"), gapShown = gap.flatMap((f) => f.show), gapSaid = gap.map((f) => f.says).join(" ");
for (const n of [ROLLS, SUNDAY]) {
  if (!gapShown.includes(String(n))) problems.push(`facts.mjs does not show ${n}`);
  if (!gapSaid.includes(n.toLocaleString("en-US"))) problems.push(`the source's words do not give ${n.toLocaleString("en-US")}`);
}
const derived = DERIVED.find((d) => d.show.includes(`${SHARE}%`));
if (!derived) problems.push(`facts.mjs (DERIVED) does not show ${SHARE}%`);
else if (Math.round((derived.of[0] / derived.of[1]) * 100) !== Number(SHARE) || derived.of[0] !== SUNDAY || derived.of[1] !== ROLLS) problems.push(`${SHARE}% is not ${SUNDAY} divided by ${ROLLS}`);
if (Number(KEY[1]) !== PEOPLE_A_POINT) problems.push("the key does not say what a point stands for");
if (!fs.readFileSync(path.join(TOOLS, NUMERALS.from, "package.json"), "utf8").includes('"OFL-1.1"')) problems.push(`${NUMERALS.family} is not under the Open Font Licence`);
for (const line of [CAPTION, SOURCE_LINE, ...TITLE, CAPTION_ROLLS, CAPTION_SUNDAY, SHARE_LINE, ...KEY]) if (/[–—]/.test(line)) problems.push(`a dash in "${line}"`);

// ---- The page, served from this folder and the tools -----------------------
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = url.startsWith("/nm/") ? path.join(TOOLS, url.slice(4)) : url === "/map.json" ? path.join(HERE, "../map.json") : path.join(HERE, url);
  if (!(file.startsWith(TOOLS) || file.startsWith(path.dirname(HERE))) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { if (!url.includes("favicon")) console.error("404:", url); res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }).end(fs.readFileSync(file));
});
await new Promise((go) => server.listen(0, "127.0.0.1", go));
const origin = `http://127.0.0.1:${server.address().port}`;

const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const open = async (size, query = "") => {
  const tab = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  tab.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.error("page:", m.text().slice(0, 600)); });
  tab.on("pageerror", (e) => { console.error("page error:", e.message); });
  await tab.goto(`${origin}/shot.html?size=${size}${query}`);
  await tab.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  return tab;
};
const save = (file, dataUrl) => fs.writeFileSync(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"));
const done = async (code = 0) => { await browser.close(); server.close(); process.exit(code); };
const extra = process.argv.find((a) => a.startsWith("--query="))?.slice(8) ?? "";

fs.mkdirSync(OUT, { recursive: true });

if (mode === "--stills") {
  const times = (process.argv[3] || "1.2,2.9,3.5,4.4,7.5").split(",").map(Number);
  const quality = Number(process.argv.find((a) => a.startsWith("--q="))?.slice(4) ?? 1);
  const dir = path.join(OUT, "stills"); fs.mkdirSync(dir, { recursive: true });
  const tab = await open(1080, extra);
  for (const t of times) {
    const started = Date.now();
    const name = `t${t.toFixed(2).replace(".", "_")}`;
    save(path.join(dir, `${name}.png`), await tab.evaluate(([t, q]) => window.__still(t, q), [t, quality]));
    // A phone shows the square about 390 px wide.
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(dir, `${name}.png`), "-vf", "scale=390:390:flags=area", path.join(dir, `${name}-phone.png`)]);
    console.log(`${name}: ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }
  if (has("--strip")) {
    const names = times.map((t) => path.join(dir, `t${t.toFixed(2).replace(".", "_")}.png`)), cols = Math.min(4, names.length);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...names.flatMap((n) => ["-i", n]), "-filter_complex", `${names.map((_, i) => `[${i}:v]scale=360:360:flags=area[s${i}]`).join(";")};${names.map((_, i) => `[s${i}]`).join("")}xstack=inputs=${names.length}:layout=${names.map((_, i) => `${(i % cols) * 360}_${Math.floor(i / cols) * 360}`).join("|")}`, path.join(dir, "strip.png")]);
  }
  console.log("stills in", path.relative(ROOT, dir));
  await done();
}

// ---- The measures: every word in the frame, large enough, on a dark enough ground
const tab = await open(1080, extra);
const info = await tab.evaluate(() => window.__info);
const lum = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const against = (ground, ink) => (lum(ink) + 0.05) / (lum(ground) + 0.05);
let least = 99, smallest = 999, pieces = 0;
const seen = new Set();
for (const t of [1.25, 2.3, info.landed + 0.6, 7.5, 9.9, info.stood + 0.6, info.thin - 0.1, info.thinned + 0.5, info.shareAt + 0.6, SECONDS - 0.05]) {
  for (const w of await tab.evaluate((t) => window.__words(t), t)) {
    pieces++; seen.add(w.name);
    const r = against(w.behind, w.name === "source" ? 0xd6 : 0xff);
    least = Math.min(least, r); smallest = Math.min(smallest, w.px);
    if (!w.inside) problems.push(`${w.name} at ${t} s leaves the frame: ${w.box}`);
    if (r < 4.5) problems.push(`${w.name} at ${t} s is ${r.toFixed(2)}:1 on the brightest ground behind it (${w.behind} of 255)`);
    if (w.px < 30) problems.push(`${w.name} at ${t.toFixed(2)} s has letters of ${w.px}px, under 30 (10.8 on a phone 390 wide)`);
  }
}
// The numerals: every digit one width, as the face draws them. The points: one for every hundred people. The count: it lands on the two figures.
if (Math.max(...info.digitWidths) - Math.min(...info.digitWidths) > 0.01) problems.push(`${NUMERALS.family}'s digits are not one width: ${info.digitWidths.map((w) => w.toFixed(1)).join(" ")}`);
if (info.points !== Math.round(ROLLS / PEOPLE_A_POINT) || info.stay !== Math.round(SUNDAY / PEOPLE_A_POINT)) problems.push(`the points are not one for every ${PEOPLE_A_POINT} people: ${info.points} and ${info.stay}`);
if (info.fromSix !== SIX.reduce((n, s) => n + Math.round((s.share / 100) * info.points), 0)) problems.push("the six states do not give their shares of the points");
if (String(info.count) !== String([0, info.count[1], ROLLS, ROLLS, info.count[4], SUNDAY, SUNDAY]) || info.count[1] > ROLLS || info.count[4] < SUNDAY) problems.push(`the count does not land on the figures: ${info.count}`);
if (info.go !== SCENE_ONE) problems.push("scene two does not begin where scene one's hold ends");
for (const name of ["title", "figure", "source", "count", "share", "key", ...SIX.map((s) => `label ${s.name}`)]) if (!seen.has(name)) problems.push(`${name} was never on screen when measured`);
const checked = `checked: ${pieces} readings of ${seen.size} pieces of words, least contrast ${least.toFixed(2)}:1, smallest letters ${smallest}px; ${SIX.length + 4} figures held to facts.mjs; the ten digits of ${NUMERALS.family} each ${info.digitWidths[0].toFixed(1)} wide at 100; ${info.points} points, ${info.stay} stay, ${info.fromSix} leave from the six states; ${info.renderer}`;
console.log(checked);
if (!problems.length) fs.writeFileSync(path.join(OUT, "check.txt"), checked + "\n");
if (problems.length) { console.error("refused:\n  " + problems.join("\n  ")); if (!has("--anyway")) await done(1); }
if (mode === "--check") await done();

// ---- Every frame, then the file ---------------------------------------------
const draft = mode === "--draft";
const cam = draft ? await open(540, extra) : tab;
const quality = draft ? 0.3 : 1;
const frames = path.join(OUT, draft ? "frames-draft" : "frames");
// Each frame is the same every time it is asked for, so --resume keeps what a stopped run left.
if (!has("--resume")) fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });
const count = FPS * SECONDS, started = Date.now();
let made = 0, drawings = 0;
const until = Date.now() + Number(process.argv.find((a) => a.startsWith("--minutes="))?.slice(10) ?? 1e6) * 60000;
for (let i = 0; i < count; i++) {
  const file = path.join(frames, `f${String(i).padStart(5, "0")}.png`);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) continue;
  if (Date.now() > until) { console.log(`stopped at frame ${i} for time; run again with --resume`); await done(3); }
  const { n, png } = await cam.evaluate(([i, q]) => window.__frame(i, q), [i, quality]);
  fs.writeFileSync(file + ".part", Buffer.from(png.slice(png.indexOf(",") + 1), "base64")); fs.renameSync(file + ".part", file);
  made++; drawings += n;
  if (made % 30 === 0) console.log(`frame ${i} of ${count}; ${((Date.now() - started) / 1000 / made).toFixed(2)} s a frame so far`);
}
const spent = (Date.now() - started) / 1000;
if (made) {
  const timing = { frames: made, seconds: Math.round(spent), secondsAFrame: Number((spent / made).toFixed(2)), drawingsAFrame: Number((drawings / made).toFixed(1)), size: draft ? 540 : 1080, renderer: info.renderer };
  console.log(JSON.stringify(timing));
  if (!draft && made === count) fs.writeFileSync(path.join(OUT, "timing.json"), JSON.stringify(timing, null, 2));
}
await browser.close(); server.close();

const file = path.join(OUT, draft ? "draft.mp4" : "orthodox-america-3d-sample-2.mp4");
// Fine grain, the same on every render (a fixed seed), over the whole picture
// as film has it; grey only; then H.264 for any editor or phone.
const look = draft ? "format=gray,format=yuv420p" : "format=gray,noise=c0s=6:c0f=t:all_seed=1113,format=yuv420p";
const enc = (extra) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%05d.png"), "-vf", look,
  "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-pix_fmt", "yuv420p", "-an", ...extra], { cwd: OUT, stdio: "inherit" });
if (draft) enc(["-crf", "24", "-movflags", "+faststart", file]);
else {
  // Grain is costly to keep, so the size is set, not the quality: two passes to about 18 MB for the twenty seconds
  // (the page's own store holds 20 MB a file), which a phone plays at once.
  const kbps = Math.floor((18 * 8192) / SECONDS);
  enc(["-b:v", `${kbps}k`, "-pass", "1", "-f", "null", "/dev/null"]);
  enc(["-b:v", `${kbps}k`, "-pass", "2", "-movflags", "+faststart", file]);
}
if (!draft) fs.copyFileSync(path.join(frames, `f${String(Math.round(18.6 * FPS)).padStart(5, "0")}.png`), path.join(OUT, "poster.png"));
console.log(path.relative(ROOT, file), fs.statSync(file).size, "bytes");
process.exit(0);
