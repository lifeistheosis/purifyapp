#!/usr/bin/env node
// The 1.9 ad, stage 1, composed: the two takes (take.mjs) set on one phone
// that moves from scene 1 to scene 2, under each scene's words, on the first
// cut's own ground, frame by frame, then written as one H.264 file. Needs
// ffmpeg.
//
//   node docs/plans/v1.9/video/ad/compose.mjs            every frame, then the file
//   node docs/plans/v1.9/video/ad/compose.mjs --at 3.6   one frame, full size
//   node docs/plans/v1.9/video/ad/compose.mjs --sheet    twelve moments side by side (--span 3-4.8 for a part)
//   node docs/plans/v1.9/video/ad/compose.mjs --check    checkMock at the cut's moments, without rendering
//   node docs/plans/v1.9/video/ad/compose.mjs --encode   write the file from the frames already rendered
//   node docs/plans/v1.9/video/ad/compose.mjs --times    the film's clock, as JSON
//
// The page is the sample's (../sample/compose.mjs), which is the first cut's:
// the app's own stylesheet, the night ground with the store pictures' hill and
// one soft pool of light. The title is in the app's sans, by his word on the
// first render (the sample's was the display serif). What is new is
// the phone. It is the store pictures' plain slab (../../store/make.mjs): a
// screen with a thin dark rim and a body behind it, with no hardware drawn.
// Scene 1 stands it front, upright and whole. Between the scenes it travels,
// in one move on the house curve, to the store pictures' side stand, and
// scene 2 is built on it there. The side stand is the most it ever turns.
//
// Silent: there is no sound in the file.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { MADE, ORIGIN, OUT, PHONE, ROOT, checkMock, dir, launch, serveLikeTheShell, sharp, wait } from "../lib.mjs";
import { SCENES as FIRST_CUT } from "../scenes.mjs";
import { MOVE, SCENES, builtAt, leftAt } from "./cut.mjs";

const [W, H] = [1080, 1920];
const FPS = 60;
const fail = (text) => {
  throw new Error(text);
};
const frame = (t) => Math.round(t * FPS) / FPS;

// ── The words: the first cut's own, for each scene ───────────────────────

const WORDS = SCENES.map((s) => {
  const w = FIRST_CUT.find((x) => x.id === s.words) ?? fail(`the first cut has no scene "${s.words}"`);
  if (w.lines.join(" ") !== w.title) fail(`${s.id}: the lines do not join into the title`);
  if (/[–—]/.test(`${w.title} ${w.sub ?? ""}`)) fail(`${s.id}: a dash in place of words`);
  return { title: w.title, lines: w.lines, sub: w.sub ?? null, from: w.from_words };
});

// ── The takes, and the film's clock ──────────────────────────────────────

const TAKES = SCENES.map((s) => {
  const file = path.join(MADE, "takes", `ad-${s.id}`, "take.json");
  if (!fs.existsSync(file)) fail(`no take "ad-${s.id}": run take.mjs ${s.id} first`);
  const t = JSON.parse(fs.readFileSync(file, "utf8"));
  if (t.problems.length) fail(`the take "ad-${s.id}" has problems: ${t.problems.join("; ")}`);
  const mark = (name) => (t.marks.find((m) => m.name === name) ?? fail(`the take "ad-${s.id}" has no mark "${name}"`)).t;
  return { ...t, mark };
});
const [A, B] = SCENES;
const [TA, TB] = TAKES;

/** The film's clock. Scene 1 runs from the film's first frame; everything after is counted from its take's own marks. */
const CLOCK = (() => {
  const go1 = A.lead;
  const built1 = go1 + builtAt(A);
  const leave = frame(go1 + (TA.mark("leave") - TA.mark("go")));
  const bare = leave + leftAt(A);
  // The screen changes takes when both are bare: scene 1's last piece has left and scene 2's are still held.
  const change = frame(bare + 0.05);
  const go2 = change + B.lead;
  const built2 = go2 + builtAt(B);
  const moveFrom = leave + MOVE.starts;
  const moveTo = moveFrom + MOVE.for;
  // Scene 2 is left whole for most of a second, and the film ends on a whole frame.
  const end = Math.ceil((built2 + 0.85) * FPS) / FPS;
  return { go1, built1, leave, bare, change, go2, built2, moveFrom, moveTo, end };
})();
const TOTAL = CLOCK.end;
const FRAMES = Math.round(TOTAL * FPS);
if (Math.abs(TOTAL - 7) > 0.6) fail(`the film is ${TOTAL.toFixed(2)}s, not about seven`);

/** Each take's own time at a moment of the film. */
const timeA = (t) => TA.mark("go") - A.lead + t;
const timeB = (t) => TB.mark("go") - B.lead + (t - CLOCK.change);
const FADE = 0.12; // the two bare screens are joined over a few frames, since each page's ground has its own faint light
if (timeA(0) < 0) fail("the film begins before its first take does");
if (timeA(CLOCK.change + FADE) > TA.seconds + 0.05) fail("scene 1's take ends before the screen has changed");
if (timeB(CLOCK.change - FADE) < 0) fail("scene 2's take begins after the screen has changed");
if (timeB(TOTAL) > TB.seconds + 0.05) fail(`the film runs ${(timeB(TOTAL) - TB.seconds).toFixed(2)}s past the end of scene 2's take`);

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
/**
 * The house curve for a thing that sets off from rest, as the first cut moves its picture: the same curve, entered
 * gently. It rises all the way and never passes its end.
 */
const glide = (u) => house(u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, u) => a + (b - a) * u;
const span = (t, from, seconds) => (t - from) / seconds;

/**
 * The two ways the phone stands, the store pictures' own. `k` is the film's pixels to one of the app's; (x, y) is
 * where the middle of the phone is; the turn is in degrees; `cast` is the shadow behind it, in the app's pixels.
 *   front  upright and whole under the words, where the sample and the first cut set it
 *   side   the store pictures' side stand, turn for turn (rotateY -25, rotateX 7, rotateZ 1.2), a little smaller so
 *          the turned slab is whole in the picture, and a little toward the side it faces away from, so it sits
 *          in the middle to the eye
 */
const STANDS = {
  front: { k: 1.66, x: 540, y: 492 + (PHONE.height * 1.66) / 2, ry: 0, rx: 0, rz: 0, cast: [0, 22, 50, 0] },
  side: { k: 1.56, x: 566, y: 1206, ry: -25, rx: 7, rz: 1.2, cast: [34, 47, 74, 7] },
};
const SIDE_MOST = { ry: 25, rx: 7, rz: 1.2 };

function phoneAt(t) {
  const [a, b] = [STANDS[A.stand], STANDS[B.stand]];
  const u = glide(span(t, CLOCK.moveFrom, MOVE.for));
  const p = { u };
  for (const key of ["x", "y", "ry", "rx", "rz"]) p[key] = lerp(a[key], b[key], u);
  p.k = Math.exp(lerp(Math.log(a.k), Math.log(b.k), u));
  p.cast = a.cast.map((v, i) => lerp(v, b.cast[i], u));
  return p;
}
// The promise in the cut is held by the numbers: one move, one way, and never past the side stand.
{
  let last = -1;
  for (let n = 0; n <= FRAMES; n++) {
    const p = phoneAt(n / FPS);
    if (p.u < last - 1e-9) fail("the phone comes back on its way");
    if (p.u > 1 + 1e-9) fail("the phone goes past where it comes to rest");
    if (Math.abs(p.ry) > SIDE_MOST.ry + 1e-6 || Math.abs(p.rx) > SIDE_MOST.rx + 1e-6 || Math.abs(p.rz) > SIDE_MOST.rz + 1e-6) fail("the phone turns more than the store pictures' side stand");
    last = p.u;
  }
}

/** Everything on the picture at one moment, as plain numbers for the page to wear. */
function stateAt(t) {
  // The screen arrives as a page arrives in the app: it rises its last pixels as it clears. It is bare then.
  const here = house(span(t, 0.04, 0.4));
  const dy = 120 * (1 - house(span(t, 0, 0.45)));
  const mix = Math.min(1, Math.max(0, (t - (CLOCK.change - FADE / 2)) / FADE));
  const state = {
    t,
    // The ground moves all through (his word, 2026-11-20: "make the background move, so it's like more cinematic-y rather
    // than a static motion graphics"): `along` is how far through the film, for a slow, even move in; `turn` is the phone's
    // own move, which the ground answers by sliding the other way, the far lines less than the near hill.
    back: { along: t / TOTAL, turn: phoneAt(t).u },
    rise: { dy, opacity: here },
    phone: phoneAt(t),
    a: mix < 1 ? `/__video/takes/ad-${A.id}/${frameAt(TA, Math.min(timeA(t), TA.seconds))}` : null,
    b: mix > 0 ? `/__video/takes/ad-${B.id}/${frameAt(TB, Math.max(0, timeB(t)))}` : null,
    mix,
  };
  // The words change as the first cut changes them: the old lines lift a little and clear, the new rise line by line.
  const out = house(span(t, CLOCK.leave - 0.05, 0.4));
  const inAt = CLOCK.leave + 0.42;
  state.words = [
    { opacity: 1 - out, dy: -18 * out, lines: WORDS[0].lines.map((_, n) => house(span(t, 0.16 + n * 0.085, 0.62))), sub: 0 },
    { opacity: t >= inAt - 0.05 ? 1 : 0, dy: 0, lines: WORDS[1].lines.map((_, n) => house(span(t, inAt + n * 0.085, 0.62))), sub: house(span(t, inAt + WORDS[1].lines.length * 0.085 + 0.12, 0.6)) },
  ];
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
const [BW, BH] = [PHONE.width + 2 * RIM, PHONE.height + 2 * RIM];
// The body behind the screen, as the store pictures' slab has it: thin leaves, lit near the front and darker toward the back.
const DEEP = r(BW * 0.105);
const LEAVES = (() => {
  const step = 1;
  const count = Math.round(DEEP / step);
  const out = [];
  for (let k = count; k >= 1; k--) {
    const tone = k <= 2 ? 34 : 19 - 12 * (k / count);
    out.push(`<div data-leaf style="transform:translateZ(${(-k * step).toFixed(1)}px);background-color:${plane(tone.toFixed(1))}"></div>`);
  }
  return out.join("");
})();

function stagePage() {
  const back = hill();
  const words = (w, n) =>
    `<div data-words-of="${n}"><${n ? "h2" : "h1"} data-title>${w.lines.map((line) => `<span data-line-box><span data-word-line>${esc(line)}</span></span>`).join("")}</${n ? "h2" : "h1"}>${w.sub ? `<p data-sub>${esc(w.sub)}</p>` : ""}</div>`;
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
  [data-back] { position: absolute; inset: -40px 0; pointer-events: none; }
  /* The ground slides against the phone's turn, so in a right-to-left page it turns over with the phone. */
  :root[dir="rtl"] [data-back] { transform: scaleX(-1); }
  /* One soft pool of light over the crest. It is a pool and never beams. */
  [data-pool] { position: absolute; inset: 0 -200px; background-image: radial-gradient(ellipse ${r(W * 0.8)}px ${r(H * 0.2)}px at 50% ${back.crest + 40}px, ${ink(15)}, transparent 72%); will-change: transform, opacity; }
  [data-back] svg { position: absolute; top: 40px; inset-inline: 0; width: ${W}px; height: ${H}px; overflow: visible; transform-origin: ${W / 2}px ${back.crest}px; will-change: transform; }
  [data-hill] { fill: ${plane(6.5)}; stroke: none; }
  [data-line] { fill: none; stroke: ${ink(40)}; stroke-width: 2; }
  [data-line="1"] { stroke: ${ink(16)}; }
  [data-line="2"] { stroke: ${ink(11)}; }
  [data-line="3"] { stroke: ${ink(8)}; }
  [data-line="4"] { stroke: ${ink(5)}; }
  [data-film] { position: absolute; inset: 0; direction: ltr; }
  /* In a right-to-left page the phone and its screen turn over together, as one picture. */
  :root[dir="rtl"] [data-film] { transform: scaleX(-1); }
  [data-rise] { position: absolute; inset: 0; will-change: transform, opacity; }
  /* The eye that sees the phone turn stands where the store pictures' does: far off, a little above the middle of the phone. */
  [data-space] { position: absolute; inset: 0; perspective: ${r(W * 3.2)}px; perspective-origin: ${W / 2}px ${r(STANDS.front.y - BH * 1.66 * 0.08)}px; }
  [data-phone] { position: absolute; top: ${-BH / 2}px; left: ${-BW / 2}px; width: ${BW}px; height: ${BH}px; transform-style: preserve-3d; transform-origin: 50% 50%; will-change: transform; }
  [data-leaf], [data-cast] { position: absolute; inset: 0; border-radius: ${ROUND + RIM}px; }
  [data-cast] { transform: translateZ(${-DEEP - 2}px); }
  [data-screen] { position: absolute; inset: 0; box-sizing: border-box; margin: 0; padding: ${RIM}px; border-radius: ${ROUND + RIM}px; background-color: var(--color-night-deep); outline: 1px solid ${ink(22)}; }
  [data-screen] img { position: absolute; top: ${RIM}px; left: ${RIM}px; display: block; width: ${PHONE.width}px; height: ${PHONE.height}px; border-radius: ${ROUND}px; }
  [data-scrim] { position: absolute; z-index: 100; top: 0; inset-inline: 0; height: ${SCRIM[1]}px; background-image: linear-gradient(to bottom, var(--color-night) ${SCRIM[0]}px, color-mix(in srgb, var(--color-night) 0%, transparent) ${SCRIM[1]}px); }
  [data-words] { position: absolute; z-index: 101; top: 0; inset-inline: 0; }
  [data-words-of] { position: absolute; top: 0; inset-inline: 0; box-sizing: border-box; padding: 204px 108px 0; text-align: center; will-change: transform, opacity; }
  /* A scene with a smaller line under its title stands a little higher, as in the first cut, so both clear the phone. */
  [data-words-of]:has([data-sub]) { padding-top: 170px; }
  /* The title is in the app's sans (his word, 2026-11-20: "I don't like the font that you used for the title cards. Re-render with the minimalist, like, better font."). The first cut and the sample set it in the display serif. */
  [data-title] { margin: 0; font-family: var(--font-sans); font-weight: 600; font-size: 76px; line-height: 1.12; letter-spacing: -0.022em; color: var(--color-paper); }
  [data-sub] { margin: 22px 0 0; font-family: var(--font-sans); font-weight: 500; font-size: 38px; line-height: 1.3; color: var(--color-paper); }
  [data-line-box] { display: block; overflow: hidden; padding-bottom: 0.14em; margin-bottom: -0.14em; }
  [data-word-line] { display: block; will-change: transform; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main data-stage>
  <div data-back aria-hidden="true"><div data-pool></div><svg viewBox="0 0 ${W} ${H}">${back.svg}</svg></div>
  <div data-film>
    <div data-rise><div data-space>
      <div data-phone><div data-cast aria-hidden="true"></div>${LEAVES}<figure data-screen><img data-of="a" alt="" src=""><img data-of="b" alt="" src=""></figure></div>
    </div></div>
  </div>
  <div data-scrim aria-hidden="true"></div>
  <div data-words>${WORDS.map(words).join("")}</div>
</main>
<script>
  // Wear one moment of the film (stateAt). Resolves when the pictures it needs are drawn.
  window.__wear = async (state) => {
    const waits = [];
    // The ground: a slow move in toward the crest all through the film; the far lines lift a little faster than the
    // near ones, so the hill has depth; and as the phone turns the ground slides the other way, the far lines less.
    const g = state.back;
    document.querySelector("[data-back] svg").style.transform = "scale(" + (1 + 0.11 * g.along).toFixed(5) + ")";
    document.querySelectorAll("[data-back] [data-line], [data-back] [data-hill]").forEach((el) => {
      const far = Number(el.getAttribute("data-line") || 0);
      el.setAttribute("transform", "translate(" + (-120 * g.turn * (1 - 0.17 * far)).toFixed(2) + "," + (-(6 + 13 * far) * g.along + 10 * g.turn * (far ? 1 : 0)).toFixed(2) + ")");
    });
    const pool = document.querySelector("[data-pool]");
    pool.style.transform = "translate(" + (64 * g.turn).toFixed(2) + "px," + (-24 * g.along).toFixed(2) + "px)";
    pool.style.opacity = (0.86 + 0.14 * g.along).toFixed(4);
    const rise = document.querySelector("[data-rise]");
    rise.style.opacity = state.rise.opacity.toFixed(4);
    rise.style.transform = "translateY(" + state.rise.dy.toFixed(2) + "px)";
    const p = state.phone;
    document.querySelector("[data-phone]").style.transform =
      "translate3d(" + p.x.toFixed(2) + "px," + p.y.toFixed(2) + "px,0) rotateY(" + p.ry.toFixed(3) + "deg) rotateX(" + p.rx.toFixed(3) + "deg) rotateZ(" + p.rz.toFixed(3) + "deg) scale(" + p.k.toFixed(5) + ")";
    document.querySelector("[data-cast]").style.boxShadow =
      p.cast.map((v) => v.toFixed(1) + "px").join(" ") + " color-mix(in srgb, var(--color-night-deep) 95%, transparent)";
    for (const [of, src, opacity] of [["a", state.a, 1], ["b", state.b, state.mix]]) {
      const img = document.querySelector('[data-screen] img[data-of="' + of + '"]');
      img.hidden = !src;
      if (!src) continue;
      img.style.opacity = opacity.toFixed(4);
      if (img.dataset.src !== src) {
        img.dataset.src = src;
        img.src = src;
        waits.push(img.decode().catch(() => {}));
      }
    }
    document.querySelectorAll("[data-words-of]").forEach((box, i) => {
      const w = state.words[i];
      box.style.opacity = w.opacity.toFixed(4);
      box.style.transform = "translateY(" + w.dy.toFixed(2) + "px)";
      box.querySelectorAll("[data-word-line]").forEach((line, n) => {
        const u = w.lines[n];
        line.style.transform = "translateY(" + ((1 - u) * 108).toFixed(2) + "%)";
        line.style.opacity = Math.min(1, u * 1.6).toFixed(4);
      });
      const sub = box.querySelector("[data-sub]");
      if (sub) {
        sub.style.opacity = w.sub.toFixed(4);
        sub.style.transform = "translateY(" + ((1 - w.sub) * 16).toFixed(2) + "px)";
      }
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
    const first = (el) => getComputedStyle(el).fontFamily.split(",")[0].trim();
    const title = first(document.querySelector("[data-title]"));
    const sub = first(document.querySelector("[data-sub]"));
    return { title, sub, titleLoaded: document.fonts.check(`600 76px ${title}`), subLoaded: document.fonts.check(`500 38px ${sub}`) };
  });
  if (!/DM Sans/.test(face.title) || !face.titleLoaded) fail(`the title's face is not the app's sans, loaded (${JSON.stringify(face)})`);
  if (!/DM Sans/.test(face.sub) || !face.subLoaded) fail(`the small line's face is not the app's sans, loaded (${JSON.stringify(face)})`);
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
const HOME = dir("ad");
const FRAME_DIR = dir("ad", "frames");
const FILE = path.join(HOME, "purify-1.9-ad-stage-1.mp4");
const frameFile = (n) => path.join(FRAME_DIR, `v${String(n).padStart(5, "0")}.jpg`);

/** The moments checkMock reads, by the film's own clock. */
const CHECKS = [
  ["Today's pieces arriving", 1.1],
  ["Today whole", frame(CLOCK.leave - 0.08)],
  ["the phone moving, the screen emptying", frame(CLOCK.leave + 0.4)],
  ["the phone still moving, the journal's pieces arriving", frame(CLOCK.go2 + 0.3)],
  ["the journal arriving on the side stand", frame(CLOCK.go2 + 1.0)],
  ["the journal whole", frame(TOTAL - 0.1)],
];

function encode() {
  for (let n = 0; n < FRAMES; n++) if (!fs.existsSync(frameFile(n))) fail(`frame ${n} is not rendered`);
  const common = ["-framerate", String(FPS), "-i", path.join(FRAME_DIR, "v%05d.jpg"), "-frames:v", String(FRAMES),
    "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "slower", "-tune", "animation",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-an"];
  // Two passes, as the sample's.
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
  // The app in the film is the export in out/, cut from another checkout: its commit is given, never guessed.
  record.export = process.env.VIDEO_EXPORT ?? fail("say which commit the export in out/ was cut from: VIDEO_EXPORT=<commit>");
  record.clock = CLOCK;
  fs.writeFileSync(path.join(HOME, "video.json"), JSON.stringify(record, null, 1));
  return record;
}

if (flag("times")) {
  console.log(JSON.stringify({ total: TOTAL, frames: FRAMES, clock: CLOCK, stands: STANDS, checks: CHECKS, words: WORDS }, null, 1));
  process.exit(0);
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
  const file = path.join(dir("ad", "stills"), `at-${t.toFixed(2)}.png`);
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
  const file = path.join(dir("ad", "stills"), flag("span") ? `sheet-${flag("span")}.jpg` : "sheet.jpg");
  await sharp({ create: { width: cols * 276, height: Math.ceil(per / cols) * 486, channels: 3, background: "#666" } })
    .composite(stills.map((input, n) => ({ input, left: (n % cols) * 276, top: Math.floor(n / cols) * 486 })))
    .jpeg({ quality: 74 })
    .toFile(file);
  console.log(file);
} else if (flag("check")) {
  const results = [];
  for (const [name, t] of CHECKS) {
    await stage.wear(t);
    const result = await checkMock(stage.page, "[data-stage]");
    const failures = [...new Set(result.failures.map((f) => `${f.check}${f.palette ? ` (${f.palette})` : ""}: ${f.what}: ${f.detail}`))];
    results.push({ moment: name, at: t, pass: failures.length === 0, failures, allowed: result.allowed, notMeasured: result.unmeasured?.length ?? 0 });
    console.log(`${failures.length ? "NO  " : "ok  "} ${name} (${t.toFixed(2)}s)${failures.length ? `\n      ${failures.slice(0, 12).join("\n      ")}` : ""}`);
  }
  fs.writeFileSync(path.join(HOME, "check.json"), JSON.stringify(results, null, 1));
  process.exitCode = results.some((x) => !x.pass) ? 1 : 0;
} else {
  // A render that was stopped starts again where it stopped (--fresh renders every frame again).
  const started = Date.now();
  let made = 0;
  for (let n = 0; n < FRAMES; n++) {
    if (!flag("fresh") && fs.existsSync(frameFile(n))) continue;
    await stage.wear(n / FPS);
    fs.writeFileSync(frameFile(n), await stage.shoot());
    made++;
  }
  console.log(`  ${made} of ${FRAMES} frames, ${Math.round((Date.now() - started) / 1000)}s`);
  console.log(JSON.stringify(encode()));
}
await browser.close();
