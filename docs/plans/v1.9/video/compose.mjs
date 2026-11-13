#!/usr/bin/env node
// The 1.9 video, composed: the takes (record.mjs) set under their words and
// moved, frame by frame, then written as one H.264 file. Needs ffmpeg.
//
//   node docs/plans/v1.9/video/compose.mjs               the whole video
//   node docs/plans/v1.9/video/compose.mjs --sheet       one still of each scene, side by side, for looking at
//   node docs/plans/v1.9/video/compose.mjs --at 12.4     one frame, full size
//   node docs/plans/v1.9/video/compose.mjs --check       checkMock on each scene's words, and the rules, without rendering
//   node docs/plans/v1.9/video/compose.mjs --frames a-b  only those frames (for rendering in parts side by side)
//   node docs/plans/v1.9/video/compose.mjs --encode      write the file from the frames already rendered
//
// The page the video is drawn on wears the app's own stylesheet: the night
// ground and the ink are its palette tokens, the title is its display serif
// (DM Serif Display) and the small line its sans (DM Sans), and every move is
// on the house curve (--ease-house). The ground is the store pictures' front
// look, which he chose for 1.9: a low hill, the line of its crest, fainter
// lines over it, one soft pool of light. No hardware is drawn; a screen is a
// plain rounded picture of the app with a thin dark rim, as the cards have it.
// The only thing added over a screen is where the finger is.
//
// Silent: there is no sound in the file. He sets his own.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { MADE, ORIGIN, OUT, PHONE, ROOT, checkMock, dir, launch, serveLikeTheShell, sharp, wait } from "./lib.mjs";
import { DROP, OVER, SCENES } from "./scenes.mjs";

const [W, H] = [1080, 1920];
const FPS = 60;
const fail = (text) => {
  throw new Error(text);
};

// ── The words, held to the rules ─────────────────────────────────────────

const EM_DASH = String.fromCodePoint(0x2014);
for (const s of SCENES) {
  const words = [s.title, s.sub ?? ""].join(" ");
  if (s.lines.join(" ") !== s.title) fail(`${s.id}: its lines do not join into its title ("${s.lines.join(" ")}" against "${s.title}")`);
  if (words.includes(EM_DASH) || words.includes(String.fromCodePoint(0x2013))) fail(`${s.id}: a dash in place of words`);
  for (const never of DROP.never) if (words.toLowerCase().includes(never.word.toLowerCase())) fail(`${s.id}: says "${never.word}", which the drop may never say (${never.why})`);
  if (/\bfree\b/i.test(words) && !/stay free|Free for everyone/.test(words)) fail(`${s.id}: "free" outside the drop's own two sentences`);
}

// ── The timeline ─────────────────────────────────────────────────────────

const TAKES = {};
function takeOf(id) {
  if (!TAKES[id]) {
    const file = path.join(MADE, "takes", id, "take.json");
    if (!fs.existsSync(file)) fail(`no take "${id}": run record.mjs first`);
    const t = JSON.parse(fs.readFileSync(file, "utf8"));
    if (t.problems.length) fail(`the take "${id}" has problems: ${t.problems.join("; ")}`);
    TAKES[id] = t;
  }
  return TAKES[id];
}
/** A moment of a take: [mark, seconds after it]. */
function moment(take, [name, offset]) {
  const m = take.marks.find((x) => x.name === name) ?? fail(`the take "${take.id}" has no mark "${name}"`);
  return m.t + offset;
}

let clock = 0;
for (const s of SCENES) {
  s.start = clock;
  s.end = clock + s.seconds;
  clock = s.end - OVER;
  if (!s.words) {
    const take = takeOf(s.take);
    // The film's own time for each stretch of the scene: [seconds into the scene, the take's time there].
    // A scene that joins the one before it goes on from the very moment that one had reached.
    const prev = s.join ? SCENES[SCENES.indexOf(s) - 1] : null;
    s.track = [[0, prev ? takeTime(prev, s.start - prev.start) : moment(take, s.from)], ...(s.cuts ?? []).map(([at, to]) => [at, moment(take, to)])];
    const last = s.track.at(-1);
    const ends = last[1] + (s.seconds - last[0]);
    // A scene may rest on its take's last picture only when it says so (`hold`): the screen is still by then.
    if (ends > take.seconds + 0.05 && !s.hold) fail(`${s.id}: runs ${(ends - take.seconds).toFixed(2)}s past the end of its take`);
    if (s.track[0][1] < 0) fail(`${s.id}: begins before its take does`);
  }
}
const TOTAL = SCENES.at(-1).end;
const FRAMES = Math.round(TOTAL * FPS);

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
/** A slower start for the picture's own moves, so it leaves gently and still arrives on the house curve. */
const glide = (u) => house(u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, u) => a + (b - a) * u;
const span = (t, from, seconds) => (t - from) / seconds;

/** Where the screen's picture stands at a moment of its scene: the film's pixels to one of the app's, and the app's y put at the film's Y. */
function pose(s, local) {
  let p = s.cam[0][1];
  for (let i = 1; i < s.cam.length; i++) {
    const [at, to, seconds] = s.cam[i];
    const u = glide(span(local, at - seconds, seconds));
    if (u <= 0) break;
    p = { k: Math.exp(lerp(Math.log(p.k), Math.log(to.k), u)), fy: lerp(p.fy, to.fy, u), Y: lerp(p.Y, to.Y, u) };
  }
  return p;
}
function camera(s, local) {
  const p = pose(s, local);
  return { k: p.k, x: W / 2 - (PHONE.width / 2) * p.k, y: p.Y - p.fy * p.k };
}

// A scene that joins the one before it is the same screen going on: no change of picture, and it stands where that one stood.
for (const [i, s] of SCENES.entries()) {
  if (!s.join) continue;
  const prev = SCENES[i - 1];
  if (prev.take !== s.take) fail(`${s.id}: joins a scene of another take`);
  s.cam = [[0, pose(prev, s.start - prev.start)], ...s.cam.slice(1)];
  prev.joined = s;
}

/** The frame of a take that was on the screen at one of its moments. */
function frameAt(take, t) {
  const f = take.frames;
  let lo = 0;
  let hi = f.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (f[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return f[lo].file;
}

/** The take's own time at a moment of its scene. */
function takeTime(s, local) {
  let seg = s.track[0];
  for (const next of s.track) if (local >= next[0]) seg = next;
  return seg[1] + (local - seg[0]);
}

const easeDrag = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2); // the finger's own ease, as lib.mjs draws it

/** Everything on the picture at one moment, as plain numbers for the page to wear. */
function stateAt(t) {
  const state = { t, screens: [], touches: [], words: [], cross: null, back: 0 };
  // The ground drifts up a little through the whole video, slowly enough to be felt and not watched.
  state.back = -28 * (t / TOTAL);

  for (const [i, s] of SCENES.entries()) {
    if (t < s.start || t >= s.end) continue;
    const local = t - s.start;
    const arriving = i === 0 || s.join ? 1 : house(span(local, 0, OVER));
    const leaving = i === SCENES.length - 1 || s.joined ? 0 : house(span(t, s.end - OVER, OVER));
    if (!s.words && !(s.joined && t >= s.joined.start)) {
      const take = takeOf(s.take);
      const cam = camera(s, local);
      const tt = takeTime(s, local);
      // A screen arrives the way a page does in the app, larger: it rises its last pixels as it clears. It leaves upward.
      // The one leaving is gone early in the change and the one arriving comes clear a moment later, so two screens are
      // never read through each other for long (the app's own route change does the same: 140 ms out, 260 ms in).
      const gone = i === SCENES.length - 1 || s.joined ? 0 : house(span(t, s.end - OVER, OVER * 0.6));
      const here = i === 0 || s.join ? 1 : house(span(local, OVER * 0.2, OVER * 0.8));
      const opacity = here * (1 - gone);
      const dy = 120 * (1 - arriving) - 90 * leaving;
      state.screens.push({ slot: i % 2, z: i, src: `/__video/takes/${s.take}/${frameAt(take, tt)}`, x: cam.x, y: cam.y + dy, k: cam.k, opacity });
      for (const m of take.marks) {
        if (m.kind === "mark") continue;
        const since = tt - m.t;
        if (since < -0.05 || since > m.for + 0.3) continue;
        const down = Math.min(1, (since + 0.05) / 0.09);
        const up = since > m.for ? Math.min(1, (since - m.for) / 0.3) : 0;
        const fy = m.kind === "drag" ? m.y - m.dy * easeDrag(Math.min(1, Math.max(0, since / m.for))) : m.y;
        state.touches.push({ x: cam.x + m.x * cam.k, y: cam.y + dy + fy * cam.k, r: 21 * cam.k * (1.35 - 0.35 * down + 0.3 * up), opacity: (m.kind === "drag" ? 0.2 : 0.3) * down * (1 - up) * opacity });
      }
    }
    // The words. A scene that keeps the words before it draws none of its own.
    if (!s.keep) {
      const next = SCENES[i + 1];
      const until = next?.keep ? next.end : s.end; // kept through the scene after
      // The words leave before the next ones rise, so two titles are never set over each other.
      const out = i === SCENES.length - 1 ? 0 : house(span(t, until - OVER - 0.26, 0.34));
      const startAt = i === 0 ? 0.25 : 0.16;
      state.words.push({
        id: s.id,
        opacity: 1 - out,
        dy: -18 * out,
        lines: s.lines.map((_, n) => house(span(local, startAt + n * 0.085, 0.62))),
        sub: s.sub ? house(span(local, startAt + s.lines.length * 0.085 + 0.12, 0.6)) : 0,
      });
    } else if (t < s.end) {
      const prev = SCENES[i - 1];
      const out = house(span(t, s.end - OVER - 0.26, 0.34));
      if (t >= prev.end) state.words.push({ id: prev.id, opacity: 1 - out, dy: -18 * out, lines: prev.lines.map(() => 1), sub: prev.sub ? 1 : 0 });
    }
    if (s.words) {
      const inn = house(span(local, i === 0 ? 0.05 : 0.2, 0.7));
      const out = i === SCENES.length - 1 ? 0 : house(span(t, s.end - OVER - 0.26, 0.34)); // it leaves with its words
      state.cross = { id: s.id, opacity: inn * (1 - out), dy: 26 * (1 - inn) - 18 * out };
    }
  }
  // Words kept through the next scene are still the first scene's while both overlap; keep one copy.
  const seen = new Set();
  state.words = state.words.filter((w) => (seen.has(w.id) ? false : seen.add(w.id)));
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

/** The store pictures' front look (../store/make.mjs, frontPage): the hill is one wide circle's arc, the fainter lines the same arc, higher. */
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

const RIM = 5; // the dark rim round a screen, in the app's own pixels
const ROUND = 29; // the screen's corners, as the Play pictures round them (0.07 of its width)
const SCRIM = [436, 500]; // the ground is whole behind the words down to the first, and clear by the second

function stagePage() {
  const back = hill();
  const wordsOf = (s) => `<div data-words="${s.id}" data-size="${s.words ? (s.lines.length > 2 ? "close" : "open") : "scene"}" hidden>
    <h1>${s.lines.map((line) => `<span data-line-box><span data-line>${esc(line)}</span></span>`).join("")}</h1>
    ${s.sub ? `<p data-sub>${esc(s.sub)}</p>` : ""}
  </div>`;
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
  /* The film: the screens and the finger, placed in the film's own pixels from its left. In a right-to-left page
     the film turns over whole, as one picture, as the store pictures' turned phone does. */
  [data-film] { position: absolute; inset: 0; direction: ltr; }
  :root[dir="rtl"] [data-film] { transform: scaleX(-1); }
  /* A screen: a plain rounded picture of the app with a thin dark rim. No hardware. */
  [data-screen] { position: absolute; top: 0; left: 0; box-sizing: content-box; margin: 0; width: ${PHONE.width}px; height: ${PHONE.height}px; padding: ${RIM}px; border-radius: ${ROUND + RIM}px; background-color: var(--color-night-deep); outline: 1px solid ${ink(22)}; box-shadow: 0 22px 50px color-mix(in srgb, var(--color-night-deep) 94%, transparent); transform-origin: 0 0; will-change: transform, opacity; }
  [data-screen] img { display: block; width: ${PHONE.width}px; height: ${PHONE.height}px; border-radius: ${ROUND}px; }
  /* Where the finger is: a soft round of the ink, and nothing else is added over a screen. */
  [data-touch] { position: absolute; z-index: 90; top: 0; left: 0; width: 100px; height: 100px; margin: -50px 0 0 -50px; border-radius: 50%; background-color: var(--color-paper); transform-origin: 50% 50%; }
  /* The ground behind the words, so they are always read on the night. */
  [data-scrim] { position: absolute; z-index: 100; top: 0; inset-inline: 0; height: ${SCRIM[1]}px; background-image: linear-gradient(to bottom, var(--color-night) ${SCRIM[0]}px, color-mix(in srgb, var(--color-night) 0%, transparent) ${SCRIM[1]}px); }
  [data-words] { position: absolute; z-index: 101; top: 0; inset-inline: 0; box-sizing: border-box; padding: 204px 108px 0; text-align: center; }
  [data-words] h1 { margin: 0; font-family: var(--font-display-serif); font-weight: 400; font-size: 84px; line-height: 1.1; letter-spacing: -0.005em; color: var(--color-paper); }
  [data-line-box] { display: block; overflow: hidden; padding-bottom: 0.14em; margin-bottom: -0.14em; }
  [data-line] { display: block; will-change: transform; }
  [data-sub] { margin: 22px 0 0; font-family: var(--font-sans); font-weight: 500; font-size: 38px; line-height: 1.3; color: var(--color-paper); }
  /* The opening and the closing stand lower, over the hill, with the app's cross. */
  [data-words][data-size="open"] { padding-top: 700px; }
  [data-words][data-size="open"] h1 { font-size: 132px; line-height: 1.04; }
  [data-words][data-size="close"] { padding-top: 620px; }
  [data-words][data-size="close"] h1 { font-size: 68px; line-height: 1.16; }
  [data-words][data-size="close"] [data-sub] { margin-top: 44px; font-size: 36px; padding: 0 30px; text-wrap: balance; }
  [data-cross] { position: absolute; inset-inline-start: ${W / 2 - 40}px; width: 80px; height: 140px; background-color: var(--color-paper); -webkit-mask: url(/purify-cross-mark.png) center / contain no-repeat; mask: url(/purify-cross-mark.png) center / contain no-repeat; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main data-stage>
  <div data-back aria-hidden="true"><svg viewBox="0 0 ${W} ${H}">${back.svg}</svg></div>
  <div data-film>
    <figure data-screen="0" hidden><img alt="" src=""></figure>
    <figure data-screen="1" hidden><img alt="" src=""></figure>
    <div data-touches aria-hidden="true"></div>
  </div>
  <div data-scrim aria-hidden="true"></div>
  ${SCENES.filter((s) => !s.keep).map(wordsOf).join("\n  ")}
  <span data-cross aria-hidden="true" hidden></span>
</main>
<script>
  // Wear one moment of the video (compose.mjs, stateAt). Resolves when every picture it needs is drawn.
  window.__wear = async (state) => {
    const waits = [];
    document.querySelector("[data-back]").style.transform = "translateY(" + state.back.toFixed(2) + "px)";
    for (const fig of document.querySelectorAll("[data-screen]")) {
      const s = state.screens.find((x) => String(x.slot) === fig.dataset.screen);
      fig.hidden = !s;
      if (!s) continue;
      const img = fig.querySelector("img");
      if (img.dataset.src !== s.src) {
        img.dataset.src = s.src;
        img.src = s.src;
        waits.push(img.decode().catch(() => {}));
      }
      fig.style.opacity = s.opacity.toFixed(4);
      fig.style.transform = "translate(" + (s.x - ${RIM} * s.k).toFixed(2) + "px," + (s.y - ${RIM} * s.k).toFixed(2) + "px) scale(" + s.k.toFixed(5) + ")";
      fig.style.zIndex = s.z;
    }
    const touches = document.querySelector("[data-touches]");
    while (touches.children.length < state.touches.length) touches.appendChild(Object.assign(document.createElement("span"), { }));
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
    for (const box of document.querySelectorAll("[data-words]")) {
      const w = state.words.find((x) => x.id === box.dataset.words);
      box.hidden = !w || w.opacity <= 0.001;
      if (box.hidden) continue;
      box.style.opacity = w.opacity.toFixed(4);
      box.style.transform = "translateY(" + w.dy.toFixed(2) + "px)";
      box.querySelectorAll("[data-line]").forEach((line, n) => {
        const u = w.lines[n];
        line.style.transform = "translateY(" + ((1 - u) * 108).toFixed(2) + "%)";
        line.style.opacity = Math.min(1, u * 1.6).toFixed(4);
      });
      const sub = box.querySelector("[data-sub]");
      if (sub) {
        sub.style.opacity = w.sub.toFixed(4);
        sub.style.transform = "translateY(" + ((1 - w.sub) * 16).toFixed(2) + "px)";
      }
    }
    const cross = document.querySelector("[data-cross]");
    cross.hidden = !state.cross || state.cross.opacity <= 0.001;
    if (state.cross) {
      const box = document.querySelector('[data-words="' + state.cross.id + '"]');
      const top = parseFloat(getComputedStyle(box).paddingTop) - 190;
      cross.style.top = top + "px";
      cross.style.opacity = state.cross.opacity.toFixed(4);
      cross.style.transform = "translateY(" + state.cross.dy.toFixed(2) + "px)";
    }
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
  // Every face the words use is asked for before the first frame, so no frame is drawn in a stand-in.
  await page.evaluate(async () => {
    for (const box of document.querySelectorAll("[data-words]")) box.hidden = false;
    await document.fonts.ready;
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
    for (const box of document.querySelectorAll("[data-words]")) box.hidden = true;
  });
  await wait(400);
  // The title is in the app's display serif and the small line in its sans, each the first face its token names.
  const faces = await page.evaluate(() => {
    const first = (el) => getComputedStyle(el).fontFamily.split(",")[0].trim();
    const title = first(document.querySelector("[data-words] h1"));
    const sub = first(document.querySelector("[data-sub]"));
    return { title, sub, titleLoaded: document.fonts.check(`84px ${title}`), subLoaded: document.fonts.check(`500 38px ${sub}`) };
  });
  if (!/DM Serif Display/.test(faces.title) || !faces.titleLoaded) fail(`the title's face is not the app's display serif, loaded (${JSON.stringify(faces)})`);
  if (!/DM Sans/.test(faces.sub) || !faces.subLoaded) fail(`the small line's face is not the app's sans, loaded (${JSON.stringify(faces)})`);
  const cdp = await ctx.newCDPSession(page);
  const wear = (t) => page.evaluate((s) => window.__wear(s), stateAt(t));
  const shoot = async (type = "jpeg") => Buffer.from((await cdp.send("Page.captureScreenshot", type === "png" ? { format: "png" } : { format: "jpeg", quality: 96 })).data, "base64");
  return { ctx, page, wear, shoot };
}

// ── The work ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? null : args[i + 1] ?? true;
};
const FRAME_DIR = dir("frames");
const FILE = path.join(MADE, "purify-1.9.mp4");
const frameFile = (n) => path.join(FRAME_DIR, `v${String(n).padStart(5, "0")}.jpg`);

/** A moment of each scene when its words are whole and its picture is at rest. */
const settled = (s) => s.start + (s.words ? Math.min(s.seconds - OVER - 0.1, 1.6) : Math.min(s.seconds - OVER - 0.15, 2.4));

function encode() {
  for (let n = 0; n < FRAMES; n++) if (!fs.existsSync(frameFile(n))) fail(`frame ${n} is not rendered`);
  const common = ["-framerate", String(FPS), "-i", path.join(FRAME_DIR, "v%05d.jpg"), "-frames:v", String(FRAMES),
    "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "slower", "-tune", "animation",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-an"];
  // Two passes to a size: under 15 MB whatever the length, with room to spare.
  const kbps = Math.min(3200, Math.floor((13.6 * 8 * 1024) / TOTAL));
  const log = path.join(MADE, "x264-pass");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...common, "-b:v", `${kbps}k`, "-pass", "1", "-passlogfile", log, "-f", "null", "/dev/null"], { stdio: "inherit" });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...common, "-b:v", `${kbps}k`, "-pass", "2", "-passlogfile", log, "-movflags", "+faststart", FILE], { stdio: "inherit" });
  const bytes = fs.statSync(FILE).size;
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,nb_frames:format=duration", "-of", "json", FILE]).toString();
  const info = JSON.parse(probe);
  const v = info.streams[0];
  const record = { file: path.relative(ROOT, FILE), bytes, megabytes: Number((bytes / 1048576).toFixed(2)), seconds: Number(Number(info.format.duration).toFixed(2)), codec: `${v.codec_name} ${v.profile}`, size: [v.width, v.height], fps: v.r_frame_rate, pixels: v.pix_fmt, frames: Number(v.nb_frames), sound: info.streams.length > 1 ? "has a sound stream" : "none" };
  if (bytes > 15 * 1048576) fail(`the file is ${record.megabytes} MB, over 15`);
  if (record.sound !== "none") fail("the file has a sound stream");
  fs.writeFileSync(path.join(MADE, "video.json"), JSON.stringify(record, null, 1));
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
  const file = path.join(dir("stills"), `at-${t.toFixed(2)}.png`);
  fs.writeFileSync(file, await stage.shoot("png"));
  console.log(file);
} else if (flag("sheet")) {
  // By default one settled still a scene; --sheet 6 gives six moments across each scene instead.
  const per = flag("sheet") === true ? 1 : Number(flag("sheet"));
  const only = flag("scene");
  const scenes = SCENES.filter((s) => !only || only === true || s.id === only);
  const stills = [];
  for (const s of scenes) {
    const times = per === 1 ? [settled(s)] : Array.from({ length: per }, (_, n) => s.start + 0.05 + ((s.seconds - 0.1) * n) / (per - 1));
    for (const t of times) {
      await stage.wear(t);
      stills.push(await sharp(await stage.shoot()).resize(per === 1 ? 300 : 270).toBuffer());
    }
  }
  const [w, h] = per === 1 ? [300, 534] : [270, 480];
  const cols = per === 1 ? 7 : per;
  const rows = Math.ceil(stills.length / cols);
  const file = path.join(dir("stills"), only && only !== true ? `sheet-${only}.jpg` : per === 1 ? "sheet.jpg" : `sheet-${per}.jpg`);
  await sharp({ create: { width: cols * (w + 6), height: rows * (h + 6), channels: 3, background: "#666" } })
    .composite(stills.map((input, n) => ({ input, left: (n % cols) * (w + 6), top: Math.floor(n / cols) * (h + 6) })))
    .jpeg({ quality: 72 })
    .toFile(file);
  console.log(file, `${TOTAL.toFixed(2)}s, ${FRAMES} frames`);
} else if (flag("check")) {
  // checkMock on the page at each scene's settled moment: the words on all five palettes, tokens, rays, stripes, sparkle, dashes, mirroring.
  const results = [];
  for (const s of SCENES) {
    await stage.wear(settled(s));
    const result = await checkMock(stage.page, "[data-stage]");
    const failures = result.failures.map((f) => `${f.check}${f.palette ? ` (${f.palette})` : ""}: ${f.what}: ${f.detail}`);
    results.push({ scene: s.id, at: Number(settled(s).toFixed(2)), pass: failures.length === 0, failures, allowed: result.allowed, notMeasured: result.unmeasured?.length ?? 0 });
    console.log(`${failures.length ? "NO  " : "ok  "} ${s.id}${failures.length ? `\n      ${[...new Set(failures)].slice(0, 12).join("\n      ")}` : ""}`);
  }
  fs.writeFileSync(path.join(MADE, "check.json"), JSON.stringify(results, null, 1));
  process.exitCode = results.some((x) => !x.pass) ? 1 : 0;
} else {
  const [a, b] = flag("frames") ? String(flag("frames")).split("-").map(Number) : [0, FRAMES - 1];
  const started = Date.now();
  for (let n = a; n <= Math.min(b, FRAMES - 1); n++) {
    await stage.wear(n / FPS);
    fs.writeFileSync(frameFile(n), await stage.shoot());
    if ((n - a) % 300 === 299) console.log(`  ${n + 1 - a} of ${Math.min(b, FRAMES - 1) - a + 1} frames, ${Math.round((Date.now() - started) / 1000)}s`);
  }
  if (!flag("frames")) console.log(JSON.stringify(encode()));
}
await browser.close();

