#!/usr/bin/env node
// The Christ edit: a ten second promo cut one-to-one to a template the owner chose (a fan edit of a television
// character: a figure rising in a white dome, a flash, a window opening over the figure, then fast cuts with one
// word on each beat, a question, an answer, and the dome again with a glow). Here the figure is Christ, cut from
// the app's own icon of the Sinai Pantocrator, the window is the phone, and the cuts are details of the icon and
// real screens of the app. Every cut, flash and word is on the template's own time (TEMPLATE.md has the measure).
//
//   node docs/plans/v1.9/video/release/christ-edit/make.mjs --sheet [n] [--span a-b]   moments side by side
//   node docs/plans/v1.9/video/release/christ-edit/make.mjs --at 1.2                    one frame, full size
//   node docs/plans/v1.9/video/release/christ-edit/make.mjs --check                     checkMock at eight moments
//   node docs/plans/v1.9/video/release/christ-edit/make.mjs [--audio <file>]            every frame, then the silent
//        master; with --audio, also a private preview carrying that file's sound (never for posting)
//
// Needs assets.py and screens.mjs run first. Nothing of the icon is redrawn and nothing in it is made to move: the
// icon and the cut-out figure move only whole. The words are Scripture, word for word, from the app's own Bible.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { MADE, ORIGIN, OUT, ROOT, checkMock, dir, launch, serveLikeTheShell, sharp, wait } from "../../lib.mjs";

const [W, H] = [1080, 1920];
const FPS = 60;
const TOTAL = 9.9; // the template is 9.913 seconds
const FRAMES = Math.round(TOTAL * FPS);
const fail = (text) => {
  throw new Error(text);
};
const HOME = dir("christ");
for (const f of ["icon.jpg", "cut.png", "today.png", "journal.png", "saint.png", "bible.png"]) if (!fs.existsSync(path.join(HOME, f))) fail(`${f} is not made: run assets.py and screens.mjs first`);

// ── The words: Scripture, word for word, held to the app's own Bible ─────

const verse = (book, chapter, n) => JSON.parse(fs.readFileSync(path.join(ROOT, `data/bible/${book}/${chapter}.json`), "utf8")).verses.find((v) => v.n === n).text;
const within = (text, part) => (text.includes(part) ? part : fail(`the app's Bible does not say "${part}"`));
const JOHN = verse("john", 14, 6);
const WORDS = {
  beats: ["I am", "the way", "the truth", "and", "the life"],
  beatsFrom: "John 14:6",
  question: within(verse("matthew", 16, 15), "But whom say ye that I am?"),
  questionFrom: "Matthew 16:15",
  answer: within(verse("matthew", 16, 16), "Thou art the Christ"),
  answerFrom: "Matthew 16:16",
};
if (!JOHN.includes(`${WORDS.beats.slice(0, 2).join(" ")}, ${WORDS.beats[2]}, ${WORDS.beats[3]} ${WORDS.beats[4]}`)) fail("the beat words are not John 14:6 in order");

// ── The cut, on the template's own time ──────────────────────────────────
//
// The dome plays twice, as in the template: from 0 and again from DOME2, the second time with a glow. Within it:
// the figure sinks, the dome stands empty, the figure rises, a flash, and a window (the phone) opens and is flown
// through. Between the two, the clips: [from, to, picture, look-at x, y, nearness from, to, { blur, colour, slide }].
const DOME2 = 7.8;
const DOME = { sunk: 0.45, rise: 0.75, risen: 1.05, flash: 1.5, window: 1.62, through: 2.02 };
const FACE = [590, 640], EYES = [585, 622], HAND = [364, 1800], BOOK = [922, 1714], WHOLE = [629, 1150];
const SCREEN = [515, 915];
const CLIPS = [
  [2.0, 3.0, "today", ...SCREEN, 1.05, 1.1, {}],
  [3.0, 3.5, "icon", 590, 700, 1.45, 1.56, {}],
  [3.5, 4.0, "icon", ...HAND, 1.9, 2.5, { blur: [0, 0, 16] }],
  [4.0, 4.5, "bible", 515, 1075, 1.4, 1.05, { blur: [18, 0, 0] }],
  [4.5, 4.667, "icon", ...EYES, 2.9, 3.1, {}],
  [4.667, 4.833, "icon", ...BOOK, 1.9, 2.05, {}],
  [4.833, 5.0, "icon", ...FACE, 1.2, 1.75, { blur: [0, 4, 14] }],
  [5.0, 6.0, "icon", 610, 1130, 0.9, 0.97, { blur: [12, 0, 0], slide: [-14, 14] }],
  [6.0, 6.167, "icon", ...EYES, 2.4, 2.6, {}],
  [6.167, 6.333, "journal", ...SCREEN, 1.05, 1.1, {}],
  [6.333, 6.5, "icon", ...HAND, 2.0, 2.2, {}],
  [6.5, 6.667, "saint", ...SCREEN, 1.05, 1.1, {}],
  [6.667, 7.0, "today", ...SCREEN, 1.1, 1.3, { blur: [0, 10, 34], slide: [0, -760] }],
  [7.0, DOME2, "icon", 590, 790, 1.25, 1.38, { colour: [0, 0.4] }],
];
// The words land on the template's measured hits and clear at the next.
const CAPTIONS = [
  [2.18, 2.5, WORDS.beats[0], ""],
  [2.5, 2.74, WORDS.beats[1], ""],
  [2.74, 3.13, WORDS.beats[2], ""],
  [3.13, 3.46, WORDS.beats[3], ""],
  [3.46, 4.0, WORDS.beats[4], WORDS.beatsFrom],
  [5.05, 5.92, WORDS.question, WORDS.questionFrom],
  [7.43, DOME2 - 0.02, WORDS.answer, WORDS.answerFrom],
];
const CHECKS = [["the figure risen in the dome", 1.2], ["the window opening", 1.8], ["a word on the app's screen", 2.6], ["a word on the icon", 3.2], ["the verse on the app's own page", 4.4], ["the question", 5.5], ["the answer", 7.6], ["the dome again, with its glow", 9.1]];

// ── The page ─────────────────────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
const SIZES = { icon: [1258, 2400], today: [1030, 2115], journal: [1030, 2115], saint: [1030, 2115], bible: [1030, 2115] };
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
// The figure in the dome: 980 across, His halo's top just inside the dome's.
const FIG = { k: 980 / 1258, left: 73, top: 516 };
const DISC = { d: 1560, cx: 540, cy: 1330 };
// A few plain points of light in the dark, as in the template (round points, never a four-point star).
const POINTS = Array.from({ length: 26 }, (_, i) => [((i * 397) % 1040) + 20, ((i * 211) % 500) + 20, 2 + (i % 3)]);

function stagePage() {
  return `<!doctype html>
<html lang="en" dir="ltr" class="${HTML_CLASS}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, initial-scale=1">
${SHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night-deep); }
  html { scrollbar-gutter: auto; }
  [data-stage] { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night-deep); color: var(--color-paper); }
  /* In a right-to-left page the pictures turn over as one; the words do not. */
  [data-flip] { position: absolute; inset: 0; }
  :root[dir="rtl"] [data-flip] { transform: scaleX(-1); }
  [data-dome], [data-clips] { position: absolute; inset: 0; overflow: hidden; }
  [data-point] { position: absolute; border-radius: 50%; background-color: var(--color-paper); opacity: 0.5; }
  [data-glow] { position: absolute; inset: 0; opacity: 0; background-image: radial-gradient(circle ${DISC.d * 0.62}px at ${DISC.cx}px ${DISC.cy}px, #5df2ff 78%, #1f6bff 92%, transparent 118%); }
  [data-disc] { position: absolute; left: ${DISC.cx - DISC.d / 2}px; top: ${DISC.cy - DISC.d / 2}px; width: ${DISC.d}px; height: ${DISC.d}px; border-radius: 50%; background-image: radial-gradient(circle at 50% 38%, #ffffff 46%, #e9e9ee 64%, #b9b9c2 100%); }
  [data-figure] { position: absolute; left: 0; top: 0; width: 1258px; height: 2400px; max-width: none; transform-origin: 0 0; filter: grayscale(1) contrast(1.28) brightness(1.04); will-change: transform, filter; }
  /* The app's stylesheet keeps a picture inside its box; these are placed by the film, at their own size. */
  [data-clip] { position: absolute; left: 0; top: 0; max-width: none; transform-origin: 0 0; will-change: transform, filter; }
  [data-window] { position: absolute; left: 0; top: 0; width: 1030px; height: 2115px; transform-origin: 0 0; overflow: hidden; border-radius: 72px; outline: 5px solid var(--color-night-deep); box-shadow: 0 30px 80px rgb(0 0 0 / 0.6); will-change: transform; }
  [data-window] img { display: block; width: 1030px; height: 2115px; max-width: none; }
  [data-flash] { position: absolute; inset: 0; background-color: var(--color-paper); opacity: 0; pointer-events: none; }
  [data-words] { position: absolute; z-index: 5; inset-inline: 0; top: 1300px; text-align: center; padding: 0 70px; }
  /* A soft pool of dark behind the words, so a word is read over a busy screen. */
  [data-words]::before { content: ""; position: absolute; left: 50%; top: 50%; width: 1000px; height: 420px; transform: translate(-50%, -50%); background-image: radial-gradient(ellipse at center, rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.28) 45%, transparent 72%); }
  [data-words] p, [data-words] cite { position: relative; }
  [data-words] p { margin: 0; font-family: var(--font-sans); font-weight: 800; font-size: 76px; line-height: 1.06; letter-spacing: 0.01em; text-transform: uppercase; color: var(--color-paper); text-shadow: 0 2px 6px rgb(0 0 0 / 0.9), 0 0 34px rgb(0 0 0 / 0.75); transform-origin: 50% 50%; }
  [data-words] cite { display: block; margin-top: 16px; font-family: var(--font-sans); font-style: normal; font-weight: 600; font-size: 30px; letter-spacing: 0.08em; color: var(--color-paper); text-shadow: 0 2px 6px rgb(0 0 0 / 0.9), 0 0 24px rgb(0 0 0 / 0.8); }
  [data-name] { position: absolute; z-index: 6; inset-inline: 0; bottom: 96px; margin: 0; text-align: center; font-family: var(--font-sans); font-weight: 700; font-size: 26px; letter-spacing: 0.42em; text-indent: 0.42em; text-transform: uppercase; color: var(--color-paper); mix-blend-mode: difference; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main data-stage>
  <div data-flip>
    <div data-dome>
      <div data-glow></div>
      ${POINTS.map(([x, y, s]) => `<span data-point style="left:${x}px;top:${y}px;width:${s}px;height:${s}px"></span>`).join("")}
      <div data-disc></div>
      <img data-figure alt="Christ Pantocrator, from the icon kept at St Catherine's Monastery on Sinai" src="/__video/christ/cut.png">
    </div>
    <div data-clips hidden>${Object.keys(SIZES).map((n) => `<img data-clip="${n}" alt="" src="/__video/christ/${n}.${n === "icon" ? "jpg" : "png"}" style="width:${SIZES[n][0]}px;height:${SIZES[n][1]}px" hidden>`).join("")}</div>
    <div data-window hidden><img alt="" src="/__video/christ/today.png"></div>
    <div data-flash></div>
  </div>
  <div data-words hidden><p></p><cite></cite></div>
  <p data-name>Purify</p>
</main>
<script>
  const DOME2 = ${DOME2}, DOME = ${JSON.stringify(DOME)}, CLIPS = ${JSON.stringify(CLIPS)}, CAPTIONS = ${JSON.stringify(CAPTIONS)}, FIG = ${JSON.stringify(FIG)};
  const clamp = (u) => Math.max(0, Math.min(1, u));
  const span = (t, a, b) => clamp((t - a) / (b - a));
  const out3 = (u) => 1 - Math.pow(1 - u, 3); // quick to leave, long to settle
  const in3 = (u) => u * u * u;
  const lerp = (a, b, u) => a + (b - a) * u;
  const three = (v, u) => (u < 0.5 ? lerp(v[0], v[1], u * 2) : lerp(v[1], v[2], (u - 0.5) * 2));
  const q = (s) => document.querySelector(s);
  window.__wear = async (t) => {
    const second = t >= DOME2;
    const L = second ? t - DOME2 : t;
    const inDome = t < 2.0 || second;
    q("[data-dome]").hidden = !inDome;
    q("[data-clips]").hidden = inDome;
    let flash = 0;
    const win = q("[data-window]");
    win.hidden = true;
    if (inDome) {
      // The figure sinks, the dome stands empty, the figure rises and settles. It moves whole and nothing in it moves.
      let y = 0, blur = 0, k = 1;
      if (L < DOME.sunk) { const u = in3(span(L, 0, DOME.sunk)); y = 1750 * u; blur = 22 * u + (second ? 26 * (1 - span(L, 0, 0.12)) : 0); }
      else if (L < DOME.rise) { y = 1750; }
      else if (L < DOME.risen) { const u = out3(span(L, DOME.rise, DOME.risen)); y = 1750 * (1 - u); blur = 26 * (1 - u); }
      else { k = 1 + 0.03 * span(L, DOME.risen, DOME.through); }
      const fig = q("[data-figure]");
      const kk = FIG.k * k;
      fig.style.transform = "translate(" + (540 - (540 - FIG.left) * k).toFixed(2) + "px," + (FIG.top + y - 420 * (k - 1)).toFixed(2) + "px) scale(" + kk.toFixed(5) + ")";
      fig.style.filter = "grayscale(1) contrast(1.28) brightness(1.04)" + (blur > 0.3 ? " blur(" + blur.toFixed(1) + "px)" : "");
      q("[data-glow]").style.opacity = second ? "1" : "0";
      q("[data-disc]").style.boxShadow = second ? "0 0 90px 30px #7ff6ff, 0 0 260px 120px #2a7dff" : "none";
      flash = L < DOME.flash ? 0.9 * in3(span(L, DOME.flash - 0.05, DOME.flash)) : 0.9 * (1 - span(L, DOME.flash, DOME.flash + 0.16));
      // The window: the phone opens over the figure and is flown through, into the app.
      if (L >= DOME.window) {
        win.hidden = false;
        const u = in3(span(L, DOME.window, DOME.through));
        const pop = out3(span(L, DOME.window, DOME.window + 0.1));
        const s = lerp(0.36 * pop, 1.0485, u);
        const cy = lerp(1130, 960, u);
        win.style.transform = "translate(" + (540 - 515 * s).toFixed(2) + "px," + (cy - (915 + 142 * (1 - u)) * s).toFixed(2) + "px) scale(" + s.toFixed(5) + ")";
        win.style.borderRadius = (72 * (1 - u)).toFixed(1) + "px";
      }
    } else {
      const c = CLIPS.find((x) => t >= x[0] && t < x[1]) || CLIPS[CLIPS.length - 1];
      const [a, b, name, fx, fy, k0, k1, fx2] = c;
      const u = span(t, a, b);
      const k = Math.exp(lerp(Math.log(k0), Math.log(k1), u));
      const slide = fx2.slide ? lerp(fx2.slide[0], fx2.slide[1], fx2.blur ? in3(u) : u) : 0;
      const blur = fx2.blur ? three(fx2.blur, u) : 0;
      const colour = fx2.colour ? span(t, a + fx2.colour[0], a + fx2.colour[1]) : 1;
      document.querySelectorAll("[data-clip]").forEach((img) => {
        const on = img.dataset.clip === name;
        img.hidden = !on;
        if (!on) return;
        img.style.transform = "translate(" + (540 + slide - fx * k).toFixed(2) + "px," + (960 - fy * k).toFixed(2) + "px) scale(" + k.toFixed(5) + ")";
        img.style.filter = (blur > 0.3 ? "blur(" + blur.toFixed(1) + "px) " : "") + (colour < 1 ? "grayscale(" + (1 - colour).toFixed(3) + ") contrast(" + (1.2 - 0.2 * colour).toFixed(3) + ")" : "") || "none";
      });
      // A short flash on the hardest cuts, as the template has.
      for (const at of [4.5, 6.0]) flash = Math.max(flash, 0.55 * (1 - span(t, at, at + 0.1)) * (t >= at ? 1 : 0));
    }
    q("[data-flash]").style.opacity = flash.toFixed(4);
    const cap = CAPTIONS.find((x) => t >= x[0] && t < x[1]);
    const words = q("[data-words]");
    words.hidden = !cap;
    if (cap) {
      const p = words.querySelector("p");
      if (p.textContent !== cap[2]) p.textContent = cap[2];
      words.querySelector("cite").textContent = cap[3];
      // A long line is set smaller so it stays in two lines.
      p.style.fontSize = cap[2].length > 22 ? "62px" : cap[2].length > 12 ? "70px" : "92px";
      p.style.transform = "scale(" + lerp(1.18, 1, out3(span(t, cap[0], cap[0] + 0.1))).toFixed(4) + ")";
    }
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
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
    if (name.startsWith("christ/") && !name.includes("..") && fs.existsSync(file)) return route.fulfill({ contentType: name.endsWith(".png") ? "image/png" : "image/jpeg", path: file });
    return route.fulfill({ status: 404, body: "not found" });
  });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/__video/stage.html`, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
  });
  await wait(500);
  const face = await page.evaluate(() => getComputedStyle(document.querySelector("[data-words] p")).fontFamily.split(",")[0].trim());
  if (!/DM Sans/.test(face)) fail(`the words' face is not the app's sans (${face})`);
  const cdp = await ctx.newCDPSession(page);
  const wear = (t) => page.evaluate((x) => window.__wear(x), t);
  const shoot = async (type = "jpeg") => Buffer.from((await cdp.send("Page.captureScreenshot", type === "png" ? { format: "png" } : { format: "jpeg", quality: 96 })).data, "base64");
  return { page, wear, shoot };
}

// ── The work ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? null : args[i + 1] ?? true;
};
const FRAME_DIR = dir("christ", "frames");
const FILE = path.join(HOME, "purify-christ-edit.mp4");
const PREVIEW = path.join(HOME, "purify-christ-edit-PREVIEW-not-for-posting.mp4");
const frameFile = (n) => path.join(FRAME_DIR, `v${String(n).padStart(5, "0")}.jpg`);

function encode() {
  const common = ["-framerate", String(FPS), "-i", path.join(FRAME_DIR, "v%05d.jpg"), "-frames:v", String(FRAMES),
    "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "slower", "-crf", "17",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart"];
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...common, "-an", FILE], { stdio: "inherit" });
  const audio = flag("audio");
  if (audio && audio !== true) execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", FILE, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", PREVIEW], { stdio: "inherit" });
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,nb_frames:format=duration", "-of", "json", FILE]).toString());
  const v = info.streams[0];
  if (info.streams.length > 1) fail("the master has a sound stream");
  const record = { file: path.relative(ROOT, FILE), bytes: fs.statSync(FILE).size, seconds: Number(Number(info.format.duration).toFixed(2)), codec: `${v.codec_name} ${v.profile}`, size: [v.width, v.height], fps: v.r_frame_rate, frames: Number(v.nb_frames), sound: "none", preview: audio && audio !== true ? path.relative(ROOT, PREVIEW) : null, words: WORDS, clips: CLIPS.map((c) => [c[0], c[1], c[2]]), captions: CAPTIONS };
  fs.writeFileSync(path.join(HOME, "video.json"), JSON.stringify(record, null, 1));
  return record;
}

const browser = await launch();
const stage = await openStage(browser);
if (flag("at")) {
  const t = Number(flag("at"));
  await stage.wear(t);
  const file = path.join(dir("christ", "stills"), `at-${t.toFixed(2)}.png`);
  fs.writeFileSync(file, await stage.shoot("png"));
  console.log(file);
} else if (flag("sheet")) {
  const per = flag("sheet") === true ? 30 : Number(flag("sheet"));
  const [from, to] = flag("span") ? String(flag("span")).split("-").map(Number) : [0, TOTAL - 0.02];
  const stills = [];
  for (let n = 0; n < per; n++) {
    await stage.wear(from + ((to - from) * n) / (per - 1));
    stills.push(await sharp(await stage.shoot()).resize(160).toBuffer());
  }
  const cols = 10;
  const file = path.join(dir("christ", "stills"), "sheet.jpg");
  await sharp({ create: { width: cols * 164, height: Math.ceil(per / cols) * 288, channels: 3, background: "#666" } })
    .composite(stills.map((input, n) => ({ input, left: (n % cols) * 164, top: Math.floor(n / cols) * 288 })))
    .jpeg({ quality: 76 })
    .toFile(file);
  console.log(file);
} else if (flag("check")) {
  const results = [];
  for (const [name, t] of CHECKS) {
    await stage.wear(t);
    const result = await checkMock(stage.page, "[data-stage]");
    const failures = [...new Set(result.failures.map((f) => `${f.check}${f.palette ? ` (${f.palette})` : ""}: ${f.what}: ${f.detail}`))];
    results.push({ moment: name, at: t, pass: failures.length === 0, failures, allowed: result.allowed });
    console.log(`${failures.length ? "NO  " : "ok  "} ${name} (${t}s)${failures.length ? `\n      ${failures.slice(0, 10).join("\n      ")}` : ""}`);
  }
  fs.writeFileSync(path.join(HOME, "check.json"), JSON.stringify(results, null, 1));
} else {
  const started = Date.now();
  for (let n = 0; n < FRAMES; n++) {
    await stage.wear(n / FPS);
    fs.writeFileSync(frameFile(n), await stage.shoot());
  }
  console.log(`  ${FRAMES} frames, ${Math.round((Date.now() - started) / 1000)}s`);
  console.log(JSON.stringify(encode()).slice(0, 300));
}
await browser.close();
