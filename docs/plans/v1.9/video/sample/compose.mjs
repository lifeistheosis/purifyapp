#!/usr/bin/env node
// The 1.9 film's five second sample, composed: the take (take.mjs) set under
// its words on the first cut's own ground, frame by frame, then written as one
// H.264 file. Needs ffmpeg.
//
//   node docs/plans/v1.9/video/sample/compose.mjs            every frame, then the file
//   node docs/plans/v1.9/video/sample/compose.mjs --at 2.4   one frame, full size
//   node docs/plans/v1.9/video/sample/compose.mjs --sheet    twelve moments side by side, for looking at
//   node docs/plans/v1.9/video/sample/compose.mjs --check    checkMock at four moments, without rendering
//   node docs/plans/v1.9/video/sample/compose.mjs --encode   write the file from the frames already rendered
//
// The page it is drawn on is the first cut's (../compose.mjs), measure for
// measure: the app's own stylesheet, the night ground with the store pictures'
// hill and one soft pool of light, a screen as a plain rounded picture with a
// thin dark rim, the title in the app's display serif, every move on the house
// curve, and a soft round where the finger is. That script runs when it is
// imported, so its page is written out again here, kept to one scene.
//
// Silent: there is no sound in the file.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { MADE, ORIGIN, OUT, PHONE, ROOT, checkMock, dir, launch, serveLikeTheShell, sharp, wait } from "../lib.mjs";
import { SCENES, set } from "../scenes.mjs";
import { CUT } from "./cut.mjs";

const [W, H] = [1080, 1920];
const FPS = 60;
const TOTAL = CUT.seconds;
const FRAMES = Math.round(TOTAL * FPS);
const fail = (text) => {
  throw new Error(text);
};

// The words are the first cut's own for Today: the store pictures' first line, broken where that cut breaks it.
const TODAY = SCENES.find((s) => s.id === "today") ?? fail("the first cut has no scene for Today");
const WORDS = { title: TODAY.title, lines: TODAY.lines };
if (WORDS.lines.join(" ") !== WORDS.title) fail("the lines do not join into the title");
if (/[–—]/.test(WORDS.title)) fail("a dash in place of words");

// ── The take ─────────────────────────────────────────────────────────────

const TAKE = (() => {
  const file = path.join(MADE, "takes", "sample", "take.json");
  if (!fs.existsSync(file)) fail('no take "sample": run take.mjs first');
  const t = JSON.parse(fs.readFileSync(file, "utf8"));
  if (t.problems.length) fail(`the take has problems: ${t.problems.join("; ")}`);
  return t;
})();
const markAt = (name) => (TAKE.marks.find((m) => m.name === name) ?? fail(`the take has no mark "${name}"`)).t;
/** The take's own time at a moment of the film: one unbroken run, beginning CUT.lead before the pieces are let go. */
const T0 = markAt("go") - CUT.lead;
const takeTime = (t) => T0 + t;
if (takeTime(TOTAL) > TAKE.seconds + 0.05) fail(`the film runs ${(takeTime(TOTAL) - TAKE.seconds).toFixed(2)}s past the end of its take`);
if (T0 < 0) fail("the film begins before its take does");

function frameAt(t) {
  const f = TAKE.frames;
  let lo = 0;
  let hi = f.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (f[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return f[lo].file;
}

// ── Motion ───────────────────────────────────────────────────────────────

/** The house curve, cubic-bezier(0.22, 1, 0.36, 1): app/globals.css, --ease-house. */
function house(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1];
  const bez = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, x1, x2) < u) lo = mid;
    else hi = mid;
  }
  return bez((lo + hi) / 2, y1, y2);
}
const glide = (u) => house(u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, u) => a + (b - a) * u;
const span = (t, from, seconds) => (t - from) / seconds;

/** Where the screen's picture stands: `k` film pixels to one of the app's, the app's (206, fy) put at the film's (540, Y). */
const CAM = [[0, set()], ...(CUT.cam ?? [])];
function camera(t) {
  let p = CAM[0][1];
  for (let i = 1; i < CAM.length; i++) {
    const [at, to, seconds] = CAM[i];
    const u = glide(span(t, at - seconds, seconds));
    if (u <= 0) break;
    p = { k: Math.exp(lerp(Math.log(p.k), Math.log(to.k), u)), fy: lerp(p.fy, to.fy, u), Y: lerp(p.Y, to.Y, u) };
  }
  return { k: p.k, x: W / 2 - (PHONE.width / 2) * p.k, y: p.Y - p.fy * p.k };
}

/** Everything on the picture at one moment, as plain numbers for the page to wear. */
function stateAt(t) {
  const cam = camera(t);
  const tt = takeTime(t);
  // The screen arrives as a page arrives in the app: it rises its last pixels as it clears. It is the app's own
  // ground then, with nothing on it yet.
  const here = house(span(t, 0.04, 0.4));
  const dy = 120 * (1 - house(span(t, 0, 0.45)));
  const state = { t, back: -28 * (t / 45), touches: [], screen: { src: `/__video/takes/sample/${frameAt(tt)}`, x: cam.x, y: cam.y + dy, k: cam.k, opacity: here } };
  for (const m of TAKE.marks) {
    if (m.kind !== "tap") continue;
    const since = tt - m.t;
    if (since < -0.05 || since > m.for + 0.3) continue;
    const down = Math.min(1, (since + 0.05) / 0.09);
    const up = since > m.for ? Math.min(1, (since - m.for) / 0.3) : 0;
    state.touches.push({ x: cam.x + m.x * cam.k, y: cam.y + dy + m.y * cam.k, r: 21 * cam.k * (1.35 - 0.35 * down + 0.3 * up), opacity: 0.3 * down * (1 - up) * here });
  }
  state.words = { lines: WORDS.lines.map((_, n) => house(span(t, 0.16 + n * 0.085, 0.62))) };
  return state;
}

// ── The page ─────────────────────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
if (!SHEETS.length) fail("the front door names no stylesheet");

const r = Math.round;
const ink = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, transparent)`;
const plane = (pct) => `color-mix(in srgb, var(--color-paper) ${pct}%, var(--color-night))`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** The store pictures' front look, as the first cut draws it: the hill is one wide circle's arc, the fainter lines the same arc, higher. */
function hill() {
  const crest = 1330;
  const rise = W * 0.13;
  const half = W / 2;
  const R = (half * half + rise * rise) / (2 * rise);
  const fall = R - Math.sqrt(R * R - (half * 1.2) ** 2);
  const arc = (lift) => `M ${-W * 0.1} ${crest + lift + fall} A ${R} ${R} 0 0 1 ${W * 1.1} ${crest + lift + fall}`;
  const lifts = [0.2, 0.135, 0.08, 0.035];
  return {
    crest,
    svg: `${lifts.map((lift, i) => `<path data-line="${4 - i}" d="${arc(-H * lift)}"/>`).join("")}<path data-hill d="${arc(0)} L ${W * 1.1} ${H * 1.2} L ${-W * 0.1} ${H * 1.2} Z"/><path data-line="0" d="${arc(0)}"/>`,
  };
}

const RIM = 5;
const ROUND = 29;
const SCRIM = [436, 500];

function stagePage() {
  const back = hill();
  return `<!doctype html>
<html lang="en" dir="ltr" class="${HTML_CLASS}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, initial-scale=1">
${SHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night); }
  html { scrollbar-gutter: auto; }
  [data-stage] { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night); color: var(--color-paper); }
  [data-back] { position: absolute; inset: -40px 0; pointer-events: none; background-image: radial-gradient(ellipse ${r(W * 0.8)}px ${r(H * 0.2)}px at 50% ${back.crest + 40}px, ${ink(15)}, transparent 72%); }
  [data-back] svg { position: absolute; top: 40px; inset-inline: 0; width: ${W}px; height: ${H}px; overflow: visible; }
  [data-hill] { fill: ${plane(6.5)}; stroke: none; }
  [data-line] { fill: none; stroke: ${ink(40)}; stroke-width: 2; }
  [data-line="1"] { stroke: ${ink(16)}; }
  [data-line="2"] { stroke: ${ink(11)}; }
  [data-line="3"] { stroke: ${ink(8)}; }
  [data-line="4"] { stroke: ${ink(5)}; }
  [data-film] { position: absolute; inset: 0; direction: ltr; }
  :root[dir="rtl"] [data-film] { transform: scaleX(-1); }
  [data-screen] { position: absolute; top: 0; left: 0; box-sizing: content-box; margin: 0; width: ${PHONE.width}px; height: ${PHONE.height}px; padding: ${RIM}px; border-radius: ${ROUND + RIM}px; background-color: var(--color-night-deep); outline: 1px solid ${ink(22)}; box-shadow: 0 22px 50px color-mix(in srgb, var(--color-night-deep) 94%, transparent); transform-origin: 0 0; will-change: transform, opacity; }
  [data-screen] img { display: block; width: ${PHONE.width}px; height: ${PHONE.height}px; border-radius: ${ROUND}px; }
  [data-touch] { position: absolute; z-index: 90; top: 0; left: 0; width: 100px; height: 100px; margin: -50px 0 0 -50px; border-radius: 50%; background-color: var(--color-paper); transform-origin: 50% 50%; }
  [data-scrim] { position: absolute; z-index: 100; top: 0; inset-inline: 0; height: ${SCRIM[1]}px; background-image: linear-gradient(to bottom, var(--color-night) ${SCRIM[0]}px, color-mix(in srgb, var(--color-night) 0%, transparent) ${SCRIM[1]}px); }
  [data-words] { position: absolute; z-index: 101; top: 0; inset-inline: 0; box-sizing: border-box; padding: 204px 108px 0; text-align: center; }
  [data-words] h1 { margin: 0; font-family: var(--font-display-serif); font-weight: 400; font-size: 84px; line-height: 1.1; letter-spacing: -0.005em; color: var(--color-paper); }
  [data-line-box] { display: block; overflow: hidden; padding-bottom: 0.14em; margin-bottom: -0.14em; }
  [data-word-line] { display: block; will-change: transform; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main data-stage>
  <div data-back aria-hidden="true"><svg viewBox="0 0 ${W} ${H}">${back.svg}</svg></div>
  <div data-film>
    <figure data-screen><img alt="" src=""></figure>
    <div data-touches aria-hidden="true"></div>
  </div>
  <div data-scrim aria-hidden="true"></div>
  <div data-words><h1>${WORDS.lines.map((line) => `<span data-line-box><span data-word-line>${esc(line)}</span></span>`).join("")}</h1></div>
</main>
<script>
  // Wear one moment of the film (stateAt). Resolves when the picture it needs is drawn.
  window.__wear = async (state) => {
    const waits = [];
    document.querySelector("[data-back]").style.transform = "translateY(" + state.back.toFixed(2) + "px)";
    const fig = document.querySelector("[data-screen]");
    const s = state.screen;
    const img = fig.querySelector("img");
    if (img.dataset.src !== s.src) {
      img.dataset.src = s.src;
      img.src = s.src;
      waits.push(img.decode().catch(() => {}));
    }
    fig.style.opacity = s.opacity.toFixed(4);
    fig.style.transform = "translate(" + (s.x - ${RIM} * s.k).toFixed(2) + "px," + (s.y - ${RIM} * s.k).toFixed(2) + "px) scale(" + s.k.toFixed(5) + ")";
    const touches = document.querySelector("[data-touches]");
    while (touches.children.length < state.touches.length) touches.appendChild(document.createElement("span"));
    [...touches.children].forEach((el, i) => {
      const m = state.touches[i];
      el.hidden = !m;
      if (!m) return;
      el.setAttribute("data-touch", "");
      // checkMock reads a bare round as a picture's frame with no picture in it; this one is the finger, and says so.
      el.setAttribute("data-mock-allow", "picture");
      el.setAttribute("data-mock-why", "where the finger is on the screen: a soft round of the ink, not a frame for a picture");
      el.style.opacity = m.opacity.toFixed(4);
      el.style.transform = "translate(" + m.x.toFixed(2) + "px," + m.y.toFixed(2) + "px) scale(" + (m.r / 50).toFixed(4) + ")";
    });
    document.querySelectorAll("[data-word-line]").forEach((line, n) => {
      const u = state.words.lines[n];
      line.style.transform = "translateY(" + ((1 - u) * 108).toFixed(2) + "%)";
      line.style.opacity = Math.min(1, u * 1.6).toFixed(4);
    });
    await Promise.all(waits);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
</script>
</body>
</html>`;
}

async function openStage(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US" });
  await serveLikeTheShell(ctx, OUT, {});
  const html = stagePage();
  await ctx.route(`${ORIGIN}/__video/**`, (route) => {
    const name = decodeURIComponent(new URL(route.request().url()).pathname.replace("/__video/", ""));
    if (name === "stage.html") return route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
    const file = path.join(MADE, name);
    if (name.startsWith("takes/") && !name.includes("..") && fs.existsSync(file)) return route.fulfill({ contentType: "image/jpeg", path: file });
    return route.fulfill({ status: 404, body: "not found" });
  });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/__video/stage.html`, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
  });
  await wait(400);
  const face = await page.evaluate(() => {
    const title = getComputedStyle(document.querySelector("[data-words] h1")).fontFamily.split(",")[0].trim();
    return { title, loaded: document.fonts.check(`84px ${title}`) };
  });
  if (!/DM Serif Display/.test(face.title) || !face.loaded) fail(`the title's face is not the app's display serif, loaded (${JSON.stringify(face)})`);
  const cdp = await ctx.newCDPSession(page);
  const wear = (t) => page.evaluate((s) => window.__wear(s), stateAt(t));
  const shoot = async (type = "jpeg") => Buffer.from((await cdp.send("Page.captureScreenshot", type === "png" ? { format: "png" } : { format: "jpeg", quality: 97 })).data, "base64");
  return { ctx, page, wear, shoot };
}

// ── The work ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? null : args[i + 1] ?? true;
};
const HOME = dir("sample");
const FRAME_DIR = dir("sample", "frames");
const FILE = path.join(HOME, "purify-1.9-sample.mp4");
const frameFile = (n) => path.join(FRAME_DIR, `v${String(n).padStart(5, "0")}.jpg`);

function encode() {
  for (let n = 0; n < FRAMES; n++) if (!fs.existsSync(frameFile(n))) fail(`frame ${n} is not rendered`);
  const common = ["-framerate", String(FPS), "-i", path.join(FRAME_DIR, "v%05d.jpg"), "-frames:v", String(FRAMES),
    "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "slower", "-tune", "animation",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-an"];
  // Two passes, as the first cut's. Five seconds can carry more a second than forty-five and still be a small file.
  const kbps = 6000;
  const log = path.join(HOME, "x264-pass");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...common, "-b:v", `${kbps}k`, "-pass", "1", "-passlogfile", log, "-f", "null", "/dev/null"], { stdio: "inherit" });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...common, "-b:v", `${kbps}k`, "-pass", "2", "-passlogfile", log, "-movflags", "+faststart", FILE], { stdio: "inherit" });
  const bytes = fs.statSync(FILE).size;
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,nb_frames:format=duration", "-of", "json", FILE]).toString());
  const v = info.streams[0];
  const record = { file: path.relative(ROOT, FILE), bytes, megabytes: Number((bytes / 1048576).toFixed(2)), seconds: Number(Number(info.format.duration).toFixed(2)), codec: `${v.codec_name} ${v.profile}`, size: [v.width, v.height], fps: v.r_frame_rate, pixels: v.pix_fmt, frames: Number(v.nb_frames), sound: info.streams.length > 1 ? "has a sound stream" : "none" };
  if (record.sound !== "none") fail("the file has a sound stream");
  if (Math.abs(record.seconds - TOTAL) > 0.02) fail(`the file is ${record.seconds}s, not ${TOTAL}`);
  record.export = process.env.VIDEO_EXPORT || execFileSync("git", ["rev-parse", "--short=9", "HEAD"], { cwd: ROOT }).toString().trim();
  fs.writeFileSync(path.join(HOME, "video.json"), JSON.stringify(record, null, 1));
  return record;
}

if (flag("encode")) {
  console.log(JSON.stringify(encode()));
  process.exit(0);
}

const browser = await launch();
const stage = await openStage(browser);

if (flag("at")) {
  const t = Number(flag("at"));
  await stage.wear(t);
  const file = path.join(dir("sample", "stills"), `at-${t.toFixed(2)}.png`);
  fs.writeFileSync(file, await stage.shoot("png"));
  console.log(file);
} else if (flag("sheet")) {
  const per = flag("sheet") === true ? 12 : Number(flag("sheet"));
  const [from, to] = flag("span") ? String(flag("span")).split("-").map(Number) : [0.05, TOTAL - 0.05];
  const stills = [];
  for (let n = 0; n < per; n++) {
    await stage.wear(from + ((to - from) * n) / (per - 1));
    stills.push(await sharp(await stage.shoot()).resize(270).toBuffer());
  }
  const cols = Math.min(per, 6);
  const file = path.join(dir("sample", "stills"), "sheet.jpg");
  await sharp({ create: { width: cols * 276, height: Math.ceil(per / cols) * 486, channels: 3, background: "#666" } })
    .composite(stills.map((input, n) => ({ input, left: (n % cols) * 276, top: Math.floor(n / cols) * 486 })))
    .jpeg({ quality: 74 })
    .toFile(file);
  console.log(file);
} else if (flag("check")) {
  // checkMock on the film's page at four moments: the pieces arriving, Today whole, the change of screen, the next screen at rest.
  const results = [];
  for (const [name, t] of CUT.checks) {
    await stage.wear(t);
    const result = await checkMock(stage.page, "[data-stage]");
    const failures = [...new Set(result.failures.map((f) => `${f.check}${f.palette ? ` (${f.palette})` : ""}: ${f.what}: ${f.detail}`))];
    results.push({ moment: name, at: t, pass: failures.length === 0, failures, allowed: result.allowed, notMeasured: result.unmeasured?.length ?? 0 });
    console.log(`${failures.length ? "NO  " : "ok  "} ${name} (${t}s)${failures.length ? `\n      ${failures.slice(0, 12).join("\n      ")}` : ""}`);
  }
  fs.writeFileSync(path.join(HOME, "check.json"), JSON.stringify(results, null, 1));
  process.exitCode = results.some((x) => !x.pass) ? 1 : 0;
} else {
  const started = Date.now();
  for (let n = 0; n < FRAMES; n++) {
    await stage.wear(n / FPS);
    fs.writeFileSync(frameFile(n), await stage.shoot());
  }
  console.log(`  ${FRAMES} frames, ${Math.round((Date.now() - started) / 1000)}s`);
  console.log(JSON.stringify(encode()));
}
await browser.close();
