// The gate's transitions check (the arbiter, 2026-11-13, after build 95 note 5:
// "pressing the search created a weird visual bug and isn't smooth when
// transitioning to that screen"). CLAUDE.md: every page switch is a transition,
// and reduced motion stays still.
//
// A page switch, a sheet's opening, anything a tap changes, is recorded frame by
// frame: the screen's own frames as Chromium draws them (the DevTools
// screencast, one picture for every frame that changed), and from inside the
// page every frame's running animations, the layout shifts the browser reports,
// and any new box drawn at one place and then another (scripts/gate/inpage.mjs,
// sample). It fails:
//
//   cut      outside reduced motion, half or more of the whole change in one
//            frame, by distance and along a fade through the ground both: the
//            screen went most of the way from where it stood to where it ends
//            between two frames. The house's page switch takes the page being
//            left nearly away in its first frame on purpose (a fifth of it still
//            shows); build 95's search took it away whole (note 5). A change
//            under 8% of the screen is not asked. A glide is not a cut (the
//            arbiter, 2026-11-13, on Community's "0 replies"): where what the
//            screen showed stands part of the way along, between where it stood
//            and where it ends, in three frames or more, the step is a glide,
//            listed and not failed, whatever share its first frame takes,
//            unless something else over 8% of the screen lands whole in that
//            frame without travelling there (glideAt, below).
//   blank    frames with nothing drawn where the screen changes, between a
//            screen that draws there and one that draws there again: under a
//            third of the two together by the fit, and almost nothing inked,
//            for more than a fifth of a second. The house's own switch is empty
//            for 50ms at the most (a dip, listed for the eye, not failed); Discover's
//            Saints door on build 95 left it empty for over a quarter of a
//            second. A page whose picture has come while its words follow is
//            not empty, and neither is a sheet in the middle of its rise.
//   flash    something drawn for one or two frames and gone, where the frames
//            either side of it agree; at the corner when it is in one.
//   misplaced  a new box drawn in its first frame far from where it stands two
//            frames later, with nothing animating it there (a box drawn at the
//            corner before it is placed). Read on the page, not the screen: a
//            box the page carries as it glides stands where it was drawn; one
//            moved against the glide, or left behind by it, does not.
//   jump     a layout shift of 24px or more in one frame: something on the
//            screen moved because something else changed size.
//   moves    with the app's motion reduced, anything that moves (an animation
//            of position or size, a View Transition that travels). A cut is
//            then allowed: reduced motion stays still.
//
// A step that carried half the change across a gap in the frames (the
// screencast fell behind) is "unsure", never a pass and never a fail: the walk
// records it again.
//
//   node scripts/gate/frames.mjs --self-test
//
// proves it on a page of planted changes: an instant cut, note 5's shape (the
// screen before gone whole in one frame, the words faded in later), blank
// frames, a box flashed at the corner, a jump, a thread's 28px landing in one
// frame, a block that appears with no travel (alone, and beside posts that
// glide to make room for it) and, with motion reduced, a slide all fail; a
// thread opened 28px with the posts below gliding on the house curve (listed
// as a glide), a crossfade and a sheet rising on the house curve, a cross-fade
// both ways (two pages at half in its middle), a fade out and in through the
// ground (listed as a dip), the house's page switch from a page heavy with
// words to a light one, a page whose picture comes before its words, an
// instant change with motion reduced, and no change at all pass.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { ensureGate } from "./inpage.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The frames' measures are taken on a picture a third of the screen's size. */
const SCALE = 3;
/** A pixel counts as changed past this difference in any channel (out of 255): above the JPEG's noise. */
const CHANGED = 24;
/** Two frames this close are one frame apart (a 60Hz screen draws one every 16.7ms). */
const NEXT_FRAME_MS = 25;
/** A cut carries this much of the whole change in one frame, by distance... */
const CUT_SHARE = 0.5;
/** ...and this much of the way along a fade through the ground (half less a margin for the fit). */
const CUT_PATH = 0.45;
/** A change smaller than this share of the screen is not asked whether it cut. */
const CUT_AREA = 0.08;
/** A frame is blank when it shows under this share of the screens either side of it, the two together. */
const BLANK_SHARE = 0.35;
/** ...and only between screens that each draw at least this much. */
const BLANK_FLOOR = 0.03;
/** A pixel inks the changing region past this difference from the ground in any channel. */
const INK_LEVEL = 28;
/** A frame is empty where it inks under this share of what the lighter screen inks there... */
const EMPTY_SHARE = 0.15;
/** ...and never more than this, when the lighter screen inks little. */
const EMPTY_FLOOR = 0.03;
/** Empty this long, a screen is blank (twelve frames): the house's own dip is 50ms at the most. */
const BLANK_MS = 200;
/** A layout shift this far in one frame is a jump. */
const JUMP_PX = 24;

/**
 * Record what `act` does to the screen, frame by frame, until the screen has stood still for
 * `stillMs` (at least `minMs`, at most `maxMs`). `moves` asks the page what moves in each frame
 * (the reduced-motion pass). The page must carry the gate's measures (installGate).
 */
export async function recordFrames(page, cdp, act, o = {}) {
  const { baselineMs = 300, minMs = 1000, stillMs = 450, maxMs = 3500, quality = 72, moves = false, width = 390, height = 844 } = o;
  const frames = [];
  const onFrame = (f) => {
    frames.push({ t: f.metadata.timestamp * 1000, data: f.data });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  };
  cdp.on("Page.screencastFrame", onFrame);
  let sampled = false;
  try {
    sampled = await page.evaluate((m) => window.__gate.sample({ moves: m }), moves);
    await cdp.send("Page.startScreencast", { format: "jpeg", quality, everyNthFrame: 1, maxWidth: width, maxHeight: height });
    // The screencast sends the screen as it stands, then each frame that changes it.
    for (let t = 0; t < 20 && !frames.length; t++) await sleep(25);
    await sleep(baselineMs);
    const before = frames.length;
    const tapped = Date.now();
    let error = null;
    try {
      await act();
    } catch (e) {
      error = String(e).split("\n")[0].slice(0, 160);
    }
    const start = Date.now();
    let count = frames.length;
    let changed = Date.now();
    while (Date.now() - start < maxMs) {
      await sleep(40);
      if (frames.length !== count) {
        count = frames.length;
        changed = Date.now();
      }
      if (Date.now() - start >= minMs && Date.now() - changed >= stillMs) break;
    }
    await cdp.send("Page.stopScreencast").catch(() => {});
    const inPage = sampled ? await page.evaluate(() => window.__gate && window.__gate.stop()).catch(() => null) : null;
    return { frames, tapped, before, inPage, error, still: Date.now() - changed >= stillMs, width, height };
  } finally {
    cdp.off("Page.screencastFrame", onFrame);
  }
}

/** A frame as raw RGB at a third of its size. */
async function pixels(frame, w, h) {
  return sharp(Buffer.from(frame.data, "base64")).resize(w, h, { fit: "fill" }).removeAlpha().raw().toBuffer();
}

/** A frame's ground: its commonest colour, at the middle of its sixteenth. */
function groundOf(px, mask) {
  const counts = new Map();
  for (let i = 0, p = 0; i < px.length; i += 3, p++) {
    if (mask && mask[p]) continue;
    const k = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best = -1;
  let key = 0;
  for (const [k, n] of counts) if (n > best) [best, key] = [n, k];
  return [((key >> 8) << 4) + 8, (((key >> 4) & 15) << 4) + 8, ((key & 15) << 4) + 8];
}

/**
 * How much a frame draws: the mean distance of its pixels from its ground (its commonest colour),
 * out of 1. Continuous, so a page half faded draws half, and two pages crossing at half each draw
 * together; only a screen with nothing on its ground comes near none.
 */
export function drawnOf(px, mask) {
  const counts = new Map();
  for (let i = 0, p = 0; i < px.length; i += 3, p++) {
    if (mask && mask[p]) continue;
    const k = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best = -1;
  let key = 0;
  for (const [k, n] of counts) if (n > best) [best, key] = [n, k];
  const g = [((key >> 8) << 4) + 8, (((key >> 4) & 15) << 4) + 8, ((key & 15) << 4) + 8];
  let sum = 0;
  let all = 0;
  for (let i = 0, p = 0; i < px.length; i += 3, p++) {
    if (mask && mask[p]) continue;
    all++;
    const d = Math.max(Math.abs(px[i] - g[0]), Math.abs(px[i + 1] - g[1]), Math.abs(px[i + 2] - g[2]));
    if (d > 8) sum += d;
  }
  return all ? sum / all / 255 : 0;
}

/** The share of a frame's pixels that stand apart from its ground (its commonest colour). */
export function inkOf(px, mask) {
  const counts = new Map();
  for (let i = 0, p = 0; i < px.length; i += 3, p++) {
    if (mask && mask[p]) continue;
    const k = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best = -1;
  let key = 0;
  for (const [k, n] of counts) if (n > best) [best, key] = [n, k];
  const g = [((key >> 8) << 4) + 8, (((key >> 4) & 15) << 4) + 8, ((key & 15) << 4) + 8];
  let n = 0;
  let all = 0;
  for (let i = 0, p = 0; i < px.length; i += 3, p++) {
    if (mask && mask[p]) continue;
    all++;
    if (Math.max(Math.abs(px[i] - g[0]), Math.abs(px[i + 1] - g[1]), Math.abs(px[i + 2] - g[2])) > 28) n++;
  }
  return all ? n / all : 0;
}

/** How far apart two frames are: the mean difference past the noise, out of 1. */
function distance(a, b, mask) {
  let s = 0;
  let n = 0;
  for (let i = 0, p = 0; i < a.length; i += 3, p++) {
    if (mask && mask[p]) continue;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(a[i + c] - b[i + c]);
      if (d > 6) s += d;
    }
    n += 3;
  }
  return n ? s / n / 255 : 0;
}

/** The share of pixels that changed between two frames. */
function changedShare(a, b, mask) {
  let c = 0;
  let n = 0;
  for (let i = 0, p = 0; i < a.length; i += 3, p++) {
    if (mask && mask[p]) continue;
    n++;
    if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > CHANGED) c++;
  }
  return n ? c / n : 0;
}

/** Each tile's mean difference between two frames (tiles of 10 by 10 of the small picture, 30px on the screen). */
function tileDiffs(a, b, w, h, T = 10) {
  const cols = Math.ceil(w / T);
  const rows = Math.ceil(h / T);
  const out = new Float32Array(cols * rows);
  const n = new Uint16Array(cols * rows);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const t = Math.floor(y / T) * cols + Math.floor(x / T);
      out[t] += (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
      n[t]++;
    }
  }
  for (let t = 0; t < out.length; t++) out[t] /= n[t] || 1;
  return { out, cols, rows, T };
}

// ── A glide is not a cut ───────────────────────────────────────────────
//
// The arbiter's rule (2026-11-13, on Community's "0 replies", where an empty thread opens 28px and
// the posts below glide 28px on the house curve): a change whose content passes through in-between
// places over several frames is a glide, whatever share its first frame takes; a change that lands
// in one frame is a cut. The distance share reads a short glide of words as half the change in its
// first frame, since a line of words moved 10px is far from where it stood and from where it ends.
//
// So where a step carries half the change, what the screen showed before the tap is followed through
// the frames at the screen's full size. Each part of it (a quarter of the screen wide, 32px high)
// that has something drawn in it and changes is looked for in the screen after, up or down (the
// glides inside a page travel up or down), then in each frame from the step on, to a quarter of a
// pixel, as the compositor draws a glide between whole pixels. A part glides when it stands part of
// the way along in the step's frame, at least 2px from where it stood and from where it ends; the
// step is a glide when the parts that glide stand part of the way along in at least three frames,
// and nothing else in the step's frame already stands as it ends, over 8% of the screen or more,
// without having come there from somewhere (a block that appears whole, with no travel, beside parts
// that glide is a cut). Never a pass on a step the recording cannot follow: where the frames fell
// behind before the parts were seen in between three times, the step is unsure, and the walk
// records it again.

/** How the screen is cut into parts to follow: four across, 32px high, one every 16px down. */
const GLIDE_COLS = 4;
const GLIDE_TILE_H = 32;
/** A part is followed only where something is drawn in it: its lightness varies this much (out of 255). */
const GLIDE_DRAWN = 10;
/** A part is found where it differs from itself by at most this much on average (the JPEG's noise allowed). */
const GLIDE_MATCH = 10;
/** A part that moves less than this has not travelled. */
const GLIDE_MIN_PX = 4;
/** In between: at least this far from where it stood and from where it ends. */
const GLIDE_EDGE_PX = 2;
/** Several frames: the parts that glide stand in between in at least this many. */
const GLIDE_FRAMES = 3;
/** How far up or down a part is looked for, as a share of the screen's height. */
const GLIDE_REACH = 0.45;
/** Parts followed through the frames, at the most (the most drawn first). */
const GLIDE_PARTS = 64;
/** Frames followed after the step, at the most. */
const GLIDE_SPAN = 24;

/** A frame's lightness at the screen's full size, one value a pixel. */
async function lumaOf(frame, W, H) {
  const { data, info } = await sharp(Buffer.from(frame.data, "base64")).resize(W, H, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (info.channels === 1) return data;
  const out = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) out[p] = data[p * info.channels];
  return out;
}

/**
 * Whether the step into frame `i` (from `prev`) is a glide: { glide, unsure, said }. `mask` (w by h,
 * the judge's small pictures) is what moved on its own before the tap; `startAt` and `end` are the
 * screens before and after.
 */
async function glideAt({ rec, mask, w, h, startAt, prev, i, end }) {
  const frames = rec.frames;
  const W = rec.width;
  const H = rec.height;
  const lumas = new Map();
  const luma = async (k) => {
    if (!lumas.has(k)) lumas.set(k, await lumaOf(frames[k], W, H));
    return lumas.get(k);
  };
  const [L0, LE, Lp, Li] = [await luma(startAt), await luma(end), await luma(prev), await luma(i)];
  const TW = Math.ceil(W / GLIDE_COLS);
  const masked = (x, y) => mask[Math.min(h - 1, Math.floor(y / SCALE)) * w + Math.min(w - 1, Math.floor(x / SCALE))];
  // The mean difference between a part of A and B moved by s (a quarter of a pixel at the finest,
  // B read between its rows), every other pixel of the part.
  const differ = (A, B, t, s) => {
    const s0 = Math.floor(s);
    const f = s - s0;
    let sum = 0;
    let n = 0;
    for (let y = t.y0; y < t.y0 + GLIDE_TILE_H; y += 2) {
      const yb = y + s0;
      if (yb < 0 || yb + (f ? 1 : 0) >= H) continue;
      const ra = y * W;
      const rb = yb * W;
      for (let x = t.x0; x < t.x1; x += 2) {
        const b = f ? B[rb + x] * (1 - f) + B[rb + W + x] * f : B[rb + x];
        sum += Math.abs(A[ra + x] - b);
        n++;
      }
    }
    return n * 2 >= t.n ? sum / n : Infinity;
  };
  // The parts of the screen, each with how much is drawn in it on the screen before.
  const parts = [];
  for (let y0 = 0; y0 + GLIDE_TILE_H <= H; y0 += GLIDE_TILE_H / 2) {
    for (let c = 0; c < GLIDE_COLS; c++) {
      const t = { x0: c * TW, x1: Math.min(W, (c + 1) * TW), y0, n: 0, hidden: false };
      let sum = 0;
      let sq = 0;
      for (let y = y0; y < y0 + GLIDE_TILE_H; y += 2) {
        for (let x = t.x0; x < t.x1; x += 2) {
          if (masked(x, y)) t.hidden = true;
          const v = L0[y * W + x];
          sum += v;
          sq += v * v;
          t.n++;
        }
      }
      t.drawn = t.n ? Math.sqrt(Math.max(0, sq / t.n - (sum / t.n) ** 2)) : 0;
      parts.push(t);
    }
  }
  // Where each part drawn in, that changes, ends: the move that finds it in the screen after.
  const reach = Math.round(H * GLIDE_REACH);
  const moved = [];
  for (const t of parts) {
    if (t.hidden || t.drawn < GLIDE_DRAWN) continue;
    const stays = differ(L0, LE, t, 0);
    if (stays <= GLIDE_MATCH) continue;
    const tried = [];
    let best = Infinity;
    let D = 0;
    for (let s = -reach; s <= reach; s += 2) {
      const v = differ(L0, LE, t, s);
      tried.push([s, v]);
      if (v < best) [best, D] = [v, s];
    }
    for (const s of [D - 1, D + 1]) {
      const v = differ(L0, LE, t, s);
      if (v < best) [best, D] = [v, s];
    }
    // Found in one place only: a part like many others (each post's own "0 replies", a row of
    // avatars) matches somewhere else as well as where it went, and is not followed.
    const elsewhere = tried.reduce((m, [s, v]) => (Math.abs(s - D) > GLIDE_MIN_PX ? Math.min(m, v) : m), Infinity);
    if (best <= GLIDE_MATCH && Math.abs(D) >= GLIDE_MIN_PX && stays >= best + GLIDE_MATCH && elsewhere >= best + GLIDE_MATCH) moved.push({ ...t, D });
  }
  if (!moved.length) return { glide: false, unsure: false, said: "nothing on the screen travelled to where it ends" };
  moved.sort((a, b) => b.drawn - a.drawn);
  const followed = moved.slice(0, GLIDE_PARTS);
  // Where a part stands in a frame: the move, between where it stood and where it ends, that finds it there.
  const placeIn = (L, t) => {
    let best = Infinity;
    let s = null;
    for (let m = Math.min(0, t.D) - 3; m <= Math.max(0, t.D) + 3; m += 0.25) {
      const v = differ(L0, L, t, m);
      if (v < best) [best, s] = [v, m];
    }
    return best <= GLIDE_MATCH ? s : null;
  };
  const between = (t, s) => s !== null && Math.sign(s) === Math.sign(t.D) && Math.abs(s) >= GLIDE_EDGE_PX && Math.abs(t.D - s) >= GLIDE_EDGE_PX;
  const placed = followed.map((t) => ({ t, s: placeIn(Li, t) }));
  const gliding = placed.filter(({ t, s }) => between(t, s));
  if (!gliding.length) return { glide: false, unsure: false, said: `${followed.length} part${followed.length === 1 ? "" : "s"} of the screen travelled, and none stood part of the way along in that frame: they landed in it` };
  // Several frames: the frames from the step on in which most of the gliding parts stand in between.
  let inBetween = 0;
  let fellBehind = false;
  for (let k = i; k <= end && k < i + GLIDE_SPAN && inBetween < GLIDE_FRAMES; k++) {
    if (k > i && frames[k].t - frames[k - 1].t > 2.5 * NEXT_FRAME_MS) fellBehind = true;
    const Lk = await luma(k);
    const n = k === i ? gliding.length : gliding.filter(({ t }) => between(t, placeIn(Lk, t))).length;
    if (n * 2 >= gliding.length) inBetween++;
    else break;
  }
  const travel = gliding.map(({ t }) => t.D).sort((a, b) => a - b)[Math.floor(gliding.length / 2)];
  const said = `${gliding.length} part${gliding.length === 1 ? "" : "s"} of the screen ${gliding.length === 1 ? "glides" : "glide"} ${Math.abs(travel)}px ${travel > 0 ? "down" : "up"}, part of the way along in ${inBetween} frame${inBetween === 1 ? "" : "s"}`;
  if (inBetween < GLIDE_FRAMES) return fellBehind ? { glide: false, unsure: true, said: `${said}, and the frames fell behind before a third: recorded again` } : { glide: false, unsure: false, said: `${said}, fewer than ${GLIDE_FRAMES}: it landed` };
  // Nothing else may land in that frame: each part of the step's frame that changed in it, that
  // already stands as it ends and is not what stood before moved there by the glide, has appeared.
  const moves = gliding.map(({ s }) => s);
  const lo = Math.min(...moves) - 2;
  const hi = Math.max(...moves) + 2;
  let appeared = 0;
  for (const t of parts) {
    if (t.hidden || differ(Lp, Li, t, 0) <= GLIDE_MATCH || differ(Li, LE, t, 0) > GLIDE_MATCH) continue;
    let carried = false;
    for (let m = lo; m <= hi && !carried; m += 0.25) if (differ(Li, L0, t, -m) <= GLIDE_MATCH) carried = true;
    if (!carried) appeared += (t.x1 - t.x0) * (GLIDE_TILE_H / 2);
  }
  const share = appeared / (W * H);
  if (share >= CUT_AREA) return { glide: false, unsure: false, said: `${said}, but ${Math.round(share * 100)}% of the screen stood as it ends in that frame without travelling there: it appeared, with no travel` };
  return { glide: true, unsure: false, said: `${said}${share ? `; ${Math.round(share * 100)}% of the screen landed in that frame without travelling` : ""}` };
}

/**
 * What the recording shows, as the gate judges it: each fail ({ kind, detail, frames: the indices
 * of the frames that show it }), what is unsure, and the change's own measures.
 */
export async function judgeFrames(rec, { motion = "on" } = {}) {
  const fails = [];
  const unsure = [];
  /** Steps that carried half the change in one frame as content glided: listed, not failed. */
  const glides = [];
  const w = Math.round(rec.width / SCALE);
  const h = Math.round(rec.height / SCALE);
  const frames = rec.frames;
  if (frames.length < 1) return { fails, unsure: ["no frame was recorded"], dips: [], glides, change: 0, frames: 0 };
  const px = [];
  for (const f of frames) px.push(await pixels(f, w, h));
  // What moved on its own before the tap (a light that breathes, a clock): left out of every measure.
  const mask = new Uint8Array(w * h);
  const base = frames.map((f, i) => i).filter((i) => frames[i].t <= rec.tapped);
  for (let k = 1; k < base.length; k++) {
    const a = px[base[k - 1]];
    const b = px[base[k]];
    for (let i = 0, p = 0; i < a.length; i += 3, p++) {
      if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > CHANGED) {
        // The tile round it, so its edges are left out too.
        const x0 = p % w;
        const y0 = Math.floor(p / w);
        for (let y = Math.max(0, y0 - 3); y <= Math.min(h - 1, y0 + 3); y++) for (let x = Math.max(0, x0 - 3); x <= Math.min(w - 1, x0 + 3); x++) mask[y * w + x] = 1;
      }
    }
  }
  const startAt = base.length ? base[base.length - 1] : 0;
  const end = frames.length - 1;
  const F0 = px[startAt];
  const FE = px[end];
  const change = changedShare(F0, FE, mask);
  const after = frames.map((f, i) => i).filter((i) => i > startAt);
  const at = (i) => Math.round(frames[i].t - rec.tapped);

  // Where the screen changes: the pixels that differ between the screen before and the screen
  // after, and the ground they change on. Each frame there is fitted as a share of the one plus a
  // share of the other (on that ground): a cross-fade's middle shows half of each (together, about
  // all), a fade through the ground shows a share of the one and then of the other, and a frame with
  // nothing on it shows none of either. Whether a frame draws anything at all there is its ink.
  const region = [];
  for (let i = 0, p = 0; i < F0.length; i += 3, p++) {
    if (mask[p]) continue;
    if (Math.max(Math.abs(F0[i] - FE[i]), Math.abs(F0[i + 1] - FE[i + 1]), Math.abs(F0[i + 2] - FE[i + 2])) > CHANGED) region.push(i);
  }
  const fitted = region.length >= 0.03 * w * h;
  const ground = groundOf(F0, mask);
  const fitOf = (px1) => {
    let a00 = 0;
    let a01 = 0;
    let a11 = 0;
    let b0 = 0;
    let b1 = 0;
    for (const i of region) {
      for (let c = 0; c < 3; c++) {
        const x0 = F0[i + c] - ground[c];
        const x1 = FE[i + c] - ground[c];
        const y = px1[i + c] - ground[c];
        a00 += x0 * x0;
        a01 += x0 * x1;
        a11 += x1 * x1;
        b0 += x0 * y;
        b1 += x1 * y;
      }
    }
    const det = a00 * a11 - a01 * a01;
    if (Math.abs(det) < 1e-6) return { before: 0, after: 0 };
    return { before: Math.max(0, (b0 * a11 - b1 * a01) / det), after: Math.max(0, (a00 * b1 - a01 * b0) / det) };
  };
  /** The share of the changing region a frame draws on: its pixels that stand apart from the ground. */
  const inkIn = (px1) => {
    let n = 0;
    for (const i of region) if (Math.max(Math.abs(px1[i] - ground[0]), Math.abs(px1[i + 1] - ground[1]), Math.abs(px1[i + 2] - ground[2])) > INK_LEVEL) n++;
    return region.length ? n / region.length : 0;
  };
  const fits = new Map();
  const fit = (i) => {
    if (!fits.has(i)) fits.set(i, fitOf(px[i]));
    return fits.get(i);
  };

  // Cut: half the change or more in one frame, by two measures that must agree. The first is the
  // share of the way from where the screen stood to where it ends (its distance from each). The
  // second is the share of the way along a fade through the ground: the screen before at whole,
  // the ground, the screen after at whole. The house's own page switch (app/globals.css, "Every
  // page switch moves") takes the page being left nearly away in its first frame on purpose, and
  // when that page draws much more than the next, the distance alone counts that first frame as
  // half the change; along the fade it is less than half, since a fifth of the old page still
  // shows. Build 95's search (note 5) took the screen before away whole in one frame: half along
  // the fade, and more than half by distance.
  if (motion === "on" && change >= CUT_AREA) {
    const whole = distance(F0, FE, mask);
    const p = (i) => {
      const a = distance(px[i], F0, mask);
      const b = distance(px[i], FE, mask);
      return a + b > 0 ? a / (a + b) : 0;
    };
    const along = (i) => {
      if (!fitted) return p(i);
      const f = fit(i);
      return Math.min(1, Math.max(0, 0.5 * (1 - Math.min(1, f.before)) + 0.5 * Math.min(1, f.after)));
    };
    let prev = startAt;
    let prevP = 0;
    let prevS = 0;
    let stillBefore = true;
    for (const i of after) {
      const pi = p(i);
      const si = along(i);
      const step = pi - prevP;
      const stepS = si - prevS;
      const gap = frames[i].t - frames[prev].t;
      if (step >= CUT_SHARE && stepS >= CUT_PATH && whole > 0) {
        if (stillBefore || gap <= NEXT_FRAME_MS) {
          const g = await glideAt({ rec, mask, w, h, startAt, prev, i, end });
          if (g.glide) glides.push(`${Math.round(step * 100)}% of the change in its first frame (${at(i)}ms after the tap), and a glide: ${g.said}`);
          else if (g.unsure) unsure.push(`${Math.round(step * 100)}% of the change in one frame (${at(i)}ms after the tap): ${g.said}`);
          else fails.push({ kind: "cut", detail: `${Math.round(step * 100)}% of the change in one frame (${at(i)}ms after the tap), outside reduced motion: an instant cut, not a transition${g.said ? ` (${g.said})` : ""}`, frames: [prev, i, end] });
        } else {
          unsure.push(`${Math.round(step * 100)}% of the change between two frames ${Math.round(gap)}ms apart (${at(prev)} to ${at(i)}ms): the frames fell behind`);
        }
      }
      if (changedShare(px[i], F0, mask) > 0.005) stillBefore = false;
      prev = i;
      prevP = pi;
      prevS = si;
    }
  }

  // Blank: frames with nothing drawn where the screen changes, between two screens that draw there:
  // under a third of the screens either side together, and almost none of the changing region
  // inked (under a seventh of what the lighter screen inks there, or under 3% when a seventh is
  // less). The house's page switch is empty there for 50ms at the most between the page leaving
  // and the page arriving (measured on build 95's export: a tab, a page, Back), which is a dip, listed
  // and not failed; empty past a fifth of a second is a blank screen. A page whose picture has come
  // and whose words follow is not empty, and neither is a sheet in the middle of its rise.
  const inkStart = inkOf(F0, mask);
  const inkEnd = inkOf(FE, mask);
  const least = Math.min(inkStart, inkEnd);
  const dips = [];
  if (least >= BLANK_FLOOR && fitted) {
    const emptyAt = Math.max(EMPTY_FLOOR, EMPTY_SHARE * Math.min(inkIn(F0), inkIn(FE)));
    const inks = new Map(after.map((i) => [i, inkIn(px[i])]));
    const blank = after.filter((i) => i !== end && fit(i).before + fit(i).after <= BLANK_SHARE && inks.get(i) <= emptyAt);
    const runs = [];
    for (const i of blank) {
      const run = runs[runs.length - 1];
      if (run && run[run.length - 1] === i - 1) run.push(i);
      else runs.push([i]);
    }
    for (const run of runs) {
      const first = run[0];
      const last = run[run.length - 1];
      const prev = first - 1;
      const lasted = frames[Math.min(last + 1, end)].t - frames[first].t;
      const most = run.reduce((m, i) => Math.max(m, fit(i).before + fit(i).after), 0);
      const inked = run.reduce((m, i) => Math.max(m, inks.get(i)), 0);
      const said = `${run.length} frame${run.length === 1 ? "" : "s"} with nothing drawn where the screen changes (at most ${Math.round(inked * 100)}% of it inked, ${Math.round(most * 100)}% of the screen before and after together) for ${Math.round(lasted)}ms, from ${at(first)}ms after the tap`;
      // The still shows the emptiest frame of the run (its middle, among equals), not its first,
      // which is often the last trace of the page leaving.
      const leastInk = Math.min(...run.map((i) => inks.get(i)));
      const emptiest = run.filter((i) => inks.get(i) === leastInk);
      const shown = emptiest[Math.floor(emptiest.length / 2)];
      if (lasted > BLANK_MS) fails.push({ kind: "blank", detail: said, frames: [prev, shown, Math.min(last + 1, end), end] });
      else dips.push(said);
    }
  }

  // Flash: drawn for one or two frames and gone, where the screen stood still before it and stands
  // still after it (a frame the screencast did not send is a frame that did not change). A slide
  // that carries one card where another like it stood is not a flash: that part of the screen
  // keeps changing on either side.
  // Only in frames where nothing travels: no animation of position or size, no View Transition,
  // no scroll (the page's own record of each frame). Something moving carries one row where
  // another like it stood, which reads as a flash and is not; a box drawn in the wrong place
  // while something moves is still caught, by the page, as "misplaced".
  const T = 20;
  const seenFlash = new Set();
  const calm = (i, j) => (i < startAt || j > end ? null : tileDiffs(px[i], px[j], w, h));
  const own = rec.inPage ? rec.inPage.frames : null;
  const busy = (t0, t1) => {
    if (!own) return true;
    let last = null;
    for (const f of own) {
      if (f.t < t0 - 20) {
        last = f;
        continue;
      }
      if (f.t > t1 + 20) break;
      if (f.move || f.vt || (last && (f.sy !== last.sy || f.sx !== last.sx))) return true;
      last = f;
    }
    return false;
  };
  for (let k = startAt + 1; k < end; k++) {
    for (const span of [1, 2]) {
      const a = k - 1;
      const c = k + span;
      if (c > end) continue;
      if (busy(frames[a].t, frames[c].t)) continue;
      // It lasted a frame or two (three at most, as the screencast sends a frame only when one changes).
      if (frames[c].t - frames[k].t > NEXT_FRAME_MS * (span + 1.5)) continue;
      // The frame before it is the screen just before it: the one before the change, or a frame away.
      if (a !== startAt && frames[k].t - frames[a].t > NEXT_FRAME_MS) continue;
      const ab = tileDiffs(px[a], px[k], w, h);
      const bc = tileDiffs(px[k + span - 1], px[c], w, h);
      const ac = tileDiffs(px[a], px[c], w, h);
      const before = a > startAt ? calm(a - 1, a) : null;
      const afterward = c < end ? calm(c, c + 1) : null;
      const hot = [];
      for (let t = 0; t < ab.out.length; t++) {
        const tx = t % ab.cols;
        const ty = Math.floor(t / ab.cols);
        let masked = 0;
        for (let y = ty * ab.T; y < Math.min(h, (ty + 1) * ab.T); y++) for (let x = tx * ab.T; x < Math.min(w, (tx + 1) * ab.T); x++) masked += mask[y * w + x];
        if (masked) continue;
        if (before && before.out[t] > T * 0.35) continue;
        if (afterward && afterward.out[t] > T * 0.35) continue;
        if (ab.out[t] > T && bc.out[t] > T && ac.out[t] < T * 0.35) hot.push(t);
      }
      const strong = hot.filter((t) => ab.out[t] > 60);
      if (hot.length >= 2 || strong.length) {
        const xs = hot.map((t) => (t % ab.cols) * ab.T * SCALE);
        const ys = hot.map((t) => Math.floor(t / ab.cols) * ab.T * SCALE);
        const box = { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs) + ab.T * SCALE, bottom: Math.max(...ys) + ab.T * SCALE };
        const key = `${box.left},${box.top}`;
        if (seenFlash.has(key)) continue;
        seenFlash.add(key);
        const corner = (box.left <= 30 || box.right >= rec.width - 30) && (box.top <= 30 || box.bottom >= rec.height - 30);
        fails.push({ kind: "flash", detail: `something drawn for ${span} frame${span === 1 ? "" : "s"} and gone, ${box.right - box.left} by ${box.bottom - box.top}px at ${box.left},${box.top}${corner ? ", at the corner" : ""}, ${at(k)}ms after the tap`, frames: [a, k, c] });
      }
    }
  }

  // From inside the page: a new box drawn first far from where it stands, the layout's jumps, and
  // with the app's motion reduced, what moves.
  const inPage = rec.inPage;
  if (inPage) {
    for (const m of inPage.misplaced) {
      if (m.t < rec.tapped - 50) continue;
      const held = m.held ? ` while ${m.held.name}, the sticky box that holds it, moved ${m.held.moved.join(",")} on the screen` : "";
      fails.push({ kind: "misplaced", detail: `${m.name} drawn first at ${m.from.join(",")}${m.corner ? ", the corner," : ""} then at ${m.to.join(",")}${m.glided && (m.glided[0] || m.glided[1]) ? ` on the screen as the page scrolled ${m.glided.join(",")}` : ""}${held} with nothing moving it there, ${Math.round(m.t - rec.tapped)}ms after the tap`, frames: nearest(frames, m.t) });
    }
    let worst = null;
    // A shift in a page switch's own swap, under the picture of the page being left, is the switch
    // itself and no reader sees it (scripts/gate/inpage.mjs, "A page switch's own swap"): the route's
    // box under the back bar the page being left had, five chants and the Bible (Gate 2.0's run,
    // 2026-11-13). A swap whose picture never came is counted for 600ms at the most.
    const swaps = inPage.swaps ?? [];
    const pictured = (t) => swaps.some((w) => t >= w.start - 1 && t <= (w.ready ?? w.start + 600) + 1);
    for (const s of inPage.shifts) {
      if (s.t < rec.tapped || pictured(s.t)) continue;
      for (const src of s.sources) {
        const far = Math.max(Math.abs(src.to[0] - src.from[0]), Math.abs(src.to[1] - src.from[1]));
        // A box that had no size before came into being: that is not a shift.
        if (far >= JUMP_PX && src.from[2] >= 8 && src.from[3] >= 8 && src.to[2] >= 8 && src.to[3] >= 8 && (!worst || far > worst.far)) worst = { far, src, t: s.t };
      }
    }
    if (worst) fails.push({ kind: "jump", detail: `${worst.src.node ?? "a box"} jumped ${worst.far}px in one frame (from ${worst.src.from.slice(0, 2).join(",")} to ${worst.src.to.slice(0, 2).join(",")}), ${Math.round(worst.t - rec.tapped)}ms after the tap: something above it changed size at once`, frames: nearest(frames, worst.t), node: { marks: worst.src.marks ?? [], trail: worst.src.trail ?? [], cls: worst.src.cls ?? "" } });
    if (motion === "reduce") {
      const moving = new Set();
      for (const f of inPage.frames) if (f.t >= rec.tapped) for (const m of f.moving) moving.add(m);
      if (moving.size) fails.push({ kind: "moves", detail: `with the app's motion reduced, ${[...moving].slice(0, 3).join("; ")}${moving.size > 3 ? `; and ${moving.size - 3} more` : ""}`, frames: [startAt, Math.min(startAt + 3, end), end] });
    }
  } else unsure.push("the page's own frames could not be read (it left the document)");
  // When the screen first answered the tap: the first frame that changed.
  const firstAt = after.find((i) => changedShare(px[i], F0, mask) > 0.005);
  return {
    fails,
    unsure,
    dips,
    glides,
    change: Math.round(change * 1000) / 1000,
    frames: frames.length,
    ink: [Math.round(inkStart * 1000) / 1000, Math.round(inkEnd * 1000) / 1000],
    answered: firstAt === undefined ? null : at(firstAt),
    vtNames: rec.inPage ? rec.inPage.vtNames : [],
  };
}

/** The frames nearest a moment: the one before, the one at or after, and the next. */
function nearest(frames, t) {
  let k = frames.findIndex((f) => f.t >= t);
  if (k < 0) k = frames.length - 1;
  return [Math.max(0, k - 1), k, Math.min(frames.length - 1, k + 1)];
}

/** A still of a fail: its frames side by side at half size, as recorded. Returns the file's name. */
export async function stripOf(rec, indices, file) {
  const pick = [...new Set(indices)].filter((i) => i >= 0 && i < rec.frames.length).sort((a, b) => a - b);
  if (!pick.length) return null;
  const w = Math.round(rec.width / 2);
  const h = Math.round(rec.height / 2);
  const gap = 8;
  const tiles = await Promise.all(pick.map((i) => sharp(Buffer.from(rec.frames[i].data, "base64")).resize(w, h, { fit: "fill" }).png().toBuffer()));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp({ create: { width: pick.length * w + (pick.length - 1) * gap, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite(tiles.map((input, n) => ({ input, left: n * (w + gap), top: 0 })))
    .png()
    .toFile(file);
  return path.basename(file);
}

/** The times of a strip's frames after the tap, for its caption. */
export function stripTimes(rec, indices) {
  return [...new Set(indices)]
    .filter((i) => i >= 0 && i < rec.frames.length)
    .sort((a, b) => a - b)
    .map((i) => `${Math.round(rec.frames[i].t - rec.tapped)}ms`);
}

// ── The self-test ──────────────────────────────────────────────────────

const PAGE = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;background:#101013;color:#eee;font:17px sans-serif;overflow-x:clip}
.screen{position:absolute;inset:0;padding:24px}
.card{height:110px;margin:14px 0;border-radius:18px;background:linear-gradient(135deg,#6b4a2b,#2b3c6b);display:flex;align-items:flex-end;padding:12px;font-weight:600}
#b .card{background:linear-gradient(135deg,#2b6b4a,#6b2b4a)}
h1{margin:8px 0 16px;font:700 30px serif}
.sheet{position:fixed;left:0;right:0;bottom:0;height:62%;border-radius:26px 26px 0 0;background:#2a2a30;padding:24px;transform:translateY(100%)}
.post{padding:14px 0 10px;border-bottom:1px solid #2c2c33}
.post b{display:block;margin-bottom:6px}
.post p{margin:0;line-height:24px;color:#d6d6da}
.post .thread{height:0;overflow:hidden;border-top:0 solid transparent}
.post button{margin-top:6px;background:none;border:0;color:#b8b8be;font:15px sans-serif;padding:6px 0}
:root[data-in-page]::view-transition-group(*),:root[data-in-page]::view-transition-old(*),:root[data-in-page]::view-transition-new(*){animation-duration:320ms;animation-timing-function:cubic-bezier(0.22,1,0.36,1)}
::view-transition-group(in-page-grows-1){overflow:clip}
</style></head><body>
<div id="a" class="screen"><h1>Discover</h1><div class="card">Saints</div><div class="card">Reading</div><div class="card">History</div><div class="card">Councils</div><div class="card">Theology</div></div>
<div id="b" class="screen" hidden style="background:#101013"><h1>Search</h1><div class="card">Everything</div><div class="card">Bible</div><div class="card">Saints</div><div class="card">Prayers</div></div>
<div id="sheet" class="sheet"><h1>A sheet</h1><div class="card">Copy</div><div class="card">Share</div></div>
<div id="feed" class="screen" hidden><h1>Community</h1><div class="post"><b>Anna</b><p>Up early for the market today. Bread for the week, a word with a neighbour, and home before the rain.</p><div class="thread"></div><button type="button">0 replies</button></div><div class="post"><b>Marcus</b><p>Finished the long book at last. Slow going in the middle, but the last chapters were worth every evening.</p><div class="thread"></div><button type="button">0 replies</button></div><div class="post"><b>Elena</b><p>The garden is ready for winter. Leaves raked, the beds covered, and the bench carried into the shed.</p><div class="thread"></div><button type="button">0 replies</button></div><div class="post"><b>Thomas</b><p>A quiet walk by the river after work. The light was low and gold, and the water almost still.</p><div class="thread"></div><button type="button">0 replies</button></div><div class="post"><b>Sofia</b><p>Baked for the first time in months. The loaf came out lopsided and it tasted wonderful all the same.</p><div class="thread"></div><button type="button">0 replies</button></div><div class="post"><b>Daniel</b><p>Fixed the old bicycle with my son this weekend. New chain, new brakes, and a bell that rings again.</p><div class="thread"></div><button type="button">0 replies</button></div><div class="post"><b>Irene</b><p>Wrote letters to three old friends tonight, by hand, the way we used to before the phones.</p><div class="thread"></div><button type="button">0 replies</button></div><div class="post"><b>Peter</b><p>The snow came early up here. Wood stacked by the door, soup on the stove, and nowhere to be.</p><div class="thread"></div><button type="button">0 replies</button></div></div>
<div id="spacer"></div>
</body></html>`;

/** Each planted change, run in the page. */
function plant(kind) {
  const A = document.getElementById("a");
  const B = document.getElementById("b");
  const S = document.getElementById("sheet");
  const curve = "cubic-bezier(0.22, 1, 0.36, 1)";
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  return (async () => {
    if (kind === "cut") {
      A.hidden = true;
      B.hidden = false;
    } else if (kind === "fade") {
      B.style.opacity = "0";
      B.hidden = false;
      await frame();
      B.style.transition = `opacity 320ms ${curve}`;
      B.style.opacity = "1";
    } else if (kind === "sheet") {
      S.style.transition = `transform 320ms ${curve}`;
      await frame();
      S.style.transform = "translateY(0)";
    } else if (kind === "note5") {
      // The ground and its foot at once, the words faded in after: build 95's search.
      B.hidden = false;
      for (const el of B.children) el.style.opacity = "0";
      await frame();
      await frame();
      await frame();
      await frame();
      for (const el of B.children) {
        el.style.transition = `opacity 320ms ${curve}`;
        el.style.opacity = "1";
      }
    } else if (kind === "blank") {
      // The old screen fades away on the house's time, nothing stands for fifteen frames (a quarter
      // of a second, Discover's Saints door on build 95), then the new one fades in: no frame
      // carries half the change, and the screen is empty for more than a fifth of a second.
      A.style.transition = "opacity 200ms linear";
      A.style.opacity = "0";
      await new Promise((r) => setTimeout(r, 230));
      A.hidden = true;
      for (let n = 0; n < 15; n++) await frame();
      B.style.opacity = "0";
      B.hidden = false;
      await frame();
      B.style.transition = `opacity 320ms ${curve}`;
      B.style.opacity = "1";
    } else if (kind === "both") {
      // A cross-fade both ways, the old page out as the new comes in: in its middle both are at half.
      B.style.opacity = "0";
      B.hidden = false;
      await frame();
      for (const [el, to] of [[A, "0"], [B, "1"]]) {
        el.style.transition = "opacity 320ms linear";
        el.style.opacity = to;
      }
    } else if (kind === "dip") {
      // The house's cross-fade between tabs: the old screen fades out, the new one fades in, and the
      // screen is empty only for the frame or two between.
      A.style.transition = "opacity 160ms linear";
      A.style.opacity = "0";
      await new Promise((r) => setTimeout(r, 170));
      A.hidden = true;
      B.style.opacity = "0";
      B.hidden = false;
      await frame();
      B.style.transition = `opacity 320ms ${curve}`;
      B.style.opacity = "1";
    } else if (kind === "house") {
      // The house's page switch (app/globals.css, "Every page switch moves"), from a page heavy with
      // words to a light one: the page being left goes on the house curve in 140ms, nearly away in
      // its first frame, and the next arrives from 40ms on, in 260ms.
      for (const el of [...B.children].slice(2)) el.hidden = true;
      B.style.opacity = "0";
      B.hidden = false;
      A.style.position = "absolute";
      A.style.inset = "0";
      await frame();
      A.style.transition = `opacity 140ms ${curve}`;
      A.style.opacity = "0";
      B.style.transition = `opacity 260ms ${curve} 40ms`;
      B.style.opacity = "1";
    } else if (kind === "staged") {
      // A page whose picture comes with it and whose words follow it (the house's page-open words
      // start after the switch): not empty, since the picture is drawn.
      const pic = document.createElement("div");
      pic.style.cssText = "height:300px;margin:0 -20px 16px;background:linear-gradient(160deg,#8a6a3a,#3a2a1a 60%,#1a1410)";
      B.prepend(pic);
      const words = [...B.children].slice(1);
      for (const el of words) el.style.opacity = "0";
      B.style.opacity = "0";
      A.style.position = "absolute";
      A.style.inset = "0";
      B.hidden = false;
      await frame();
      A.style.transition = `opacity 140ms ${curve}`;
      A.style.opacity = "0";
      B.style.transition = `opacity 260ms ${curve} 40ms`;
      B.style.opacity = "1";
      for (const el of words) {
        el.style.transition = `opacity 380ms ${curve} 500ms`;
        el.style.opacity = "1";
      }
    } else if (kind === "corner") {
      const box = document.createElement("div");
      box.textContent = "Search Purify";
      box.style.cssText = "position:fixed;left:0;top:0;width:150px;height:48px;border-radius:24px;background:#f0f0f0;color:#000;display:flex;align-items:center;justify-content:center";
      document.body.appendChild(box);
      await frame();
      await frame();
      box.style.left = "120px";
      box.style.top = "420px";
    } else if (kind.startsWith("glide")) {
      // A label drawn as the page glides 35px a frame (an in-page move's scroll): carried by the page
      // (glidewith), moved against it (glideagainst), held where the screen had it as the page moves
      // on (glidebehind), or in a layer fixed to the screen (glidefixed), which the page never carries.
      const label = document.createElement("p");
      label.textContent = "Kodiak";
      label.style.cssText = `position:${kind === "glidefixed" ? "fixed" : "absolute"};left:40px;top:420px;margin:0;padding:6px 10px;background:#f0f0f0;color:#000;border-radius:8px`;
      document.body.appendChild(label);
      for (let n = 1; n <= 10; n++) {
        await frame();
        window.scrollBy(0, 35);
        // By a transform, so no layout shift is reported: the misplaced rule alone must catch it.
        if (kind === "glideagainst") label.style.transform = `translateY(${70 * n}px)`;
        if (kind === "glidebehind") label.style.top = `${420 + 35 * n}px`;
      }
    } else if (kind.startsWith("sticky")) {
      // A label drawn in a sticky map as the page glides 90px a frame: the map rides the page 71px
      // and sticks (Alaska's People, EventThread's map). The label rides with its map (stickywith),
      // goes on with the page as though the map had not stuck (stickypage), or stays where the
      // screen had it while the map rode (stickyscreen). By a transform, so no shift is reported.
      const map = document.getElementById("map");
      const label = document.createElement("p");
      label.textContent = "Kodiak";
      label.style.cssText = "position:absolute;left:40px;top:40px;margin:0;padding:6px 10px;background:#f0f0f0;color:#000;border-radius:8px";
      map.appendChild(label);
      const first = label.getBoundingClientRect().top;
      const from = window.scrollY;
      for (let n = 1; n <= 10; n++) {
        await frame();
        window.scrollBy(0, n <= 3 ? 90 : 30);
        const natural = map.getBoundingClientRect().top + 40;
        if (kind === "stickypage") label.style.transform = `translateY(${first - (window.scrollY - from) - natural}px)`;
        if (kind === "stickyscreen") label.style.transform = `translateY(${first - natural}px)`;
      }
    } else if (kind.startsWith("feed")) {
      // Community's "0 replies" (Updates 24's walk, 2026-11-13): the second post's empty thread opens
      // 28px (a hairline and its padding) and the posts below make room. As the app moves it
      // (lib/ui/inPageMove.ts, in a View Transition on the house curve: the post grows, the posts
      // after it glide), landed in one frame, or with a block that appears whole.
      const F = document.getElementById("feed");
      const posts = [...F.querySelectorAll(".post")];
      const thread = posts[1].querySelector(".thread");
      const open = () => {
        thread.style.height = "27px";
        thread.style.borderTopWidth = "1px";
        thread.style.borderTopColor = "#3a3a42";
      };
      const block = () => {
        const b = document.createElement("div");
        b.textContent = "Replies come here. Be the first to answer, kindly and in your own words, and the thread opens for everyone.";
        b.style.cssText = `position:absolute;left:24px;right:24px;top:${posts[1].offsetTop + posts[1].offsetHeight}px;height:160px;box-sizing:border-box;padding:16px;border-radius:16px;background:#2a2a30;color:#eee;line-height:24px;z-index:2`;
        F.appendChild(b);
      };
      if (kind === "feedglide") {
        // Its first frame drawn a little way into the curve, as a page heavy with pictures draws it:
        // there the share by distance reads half the change in that frame (55% on Community's walk,
        // the posts 6px down of 28), and the measure before the glide rule failed it as a cut.
        document.head.insertAdjacentHTML("beforeend", "<style>:root[data-in-page]::view-transition-group(*),:root[data-in-page]::view-transition-old(*),:root[data-in-page]::view-transition-new(*){animation-delay:-30ms}</style>");
        document.documentElement.setAttribute("data-in-page", "");
        posts[1].style.viewTransitionName = "in-page-grows-1";
        posts.slice(2).forEach((el, n) => (el.style.viewTransitionName = `in-page-glides-${n + 1}`));
        const t = document.startViewTransition(open);
        await t.finished.catch(() => {});
      } else if (kind === "feedland") {
        open();
      } else if (kind === "feedappear") {
        block();
      } else if (kind === "feedappearglide") {
        // The block appears whole where the thread opens, as the posts below glide 160px to make room.
        block();
        for (const el of posts.slice(2)) {
          el.style.transition = `transform 320ms ${curve}`;
          el.style.transform = "translateY(160px)";
        }
      }
    } else if (kind === "jump") {
      const grow = document.createElement("div");
      grow.style.cssText = "height:0;background:#333";
      A.insertBefore(grow, A.children[1]);
      await frame();
      grow.style.height = "140px";
    } else if (kind === "slide") {
      S.style.transition = `transform 320ms ${curve}`;
      await frame();
      S.style.transform = "translateY(0)";
    } else if (kind === "swap" || kind === "swapjump") {
      // A page switch in a View Transition: the page being left has a bar over the route's box,
      // the page arriving has none, so what the route's box holds stands 51px higher in the new
      // page (Gate 2.0's chants: the shift reported in the swap, between its update and `ready`).
      const bar = document.getElementById("bar");
      const t = document.startViewTransition(() => {
        bar.remove();
        A.querySelector("h1").textContent = "Saints";
      });
      if (kind === "swapjump") {
        // Then, in the live picture of the new page, something above its rows grows at once.
        await t.ready.catch(() => {});
        await frame();
        const grow = document.createElement("div");
        grow.style.cssText = "height:140px;background:#333";
        A.insertBefore(grow, A.children[1]);
      }
      await t.finished.catch(() => {});
    }
  })();
}

/** What a planted change needs standing before the recording: the swap's bar and the route's box. */
function prepare(kind) {
  if (kind.startsWith("feed")) {
    document.getElementById("a").hidden = true;
    document.getElementById("feed").hidden = false;
    document.querySelector(".sheet").hidden = true;
  }
  // A page tall enough to glide.
  if (kind.startsWith("glide")) document.getElementById("spacer").style.height = "3000px";
  if (kind.startsWith("sticky")) {
    // A sticky map 131px down the page, sticking 60px from the top: it rides the page 71px.
    const track = document.createElement("div");
    track.style.cssText = "height:2600px;padding-top:131px";
    track.innerHTML = '<div id="map" style="position:sticky;top:60px;height:240px;background:#203040"></div>';
    document.getElementById("spacer").before(track);
  }
  if (kind !== "swap" && kind !== "swapjump") return;
  const A = document.getElementById("a");
  const B = document.getElementById("b");
  const bar = document.createElement("div");
  bar.id = "bar";
  bar.style.cssText = "height:51px;background:#1c1c20";
  const route = document.createElement("div");
  route.id = "route";
  // In the flow under the bar, as a page stands under the back bar.
  A.style.position = "relative";
  B.style.position = "relative";
  A.before(bar);
  bar.after(route);
  route.append(A, B);
}

const CASES = [
  // [name, kind, motion, the fails it must have (none for a pass)]
  ["an instant cut from one screen to another", "cut", "on", ["cut"]],
  ["build 95 note 5's shape: the screen before gone whole in one frame, the words faded in after", "note5", "on", ["cut"]],
  ["blank frames between two screens that fade", "blank", "on", ["blank"]],
  ["a box flashed at the corner before it is placed (and moved there at once)", "corner", "on", ["flash", "misplaced", "jump"]],
  ["a jump: something above grows 140px at once (an instant change, so a cut too)", "jump", "on", ["jump", "cut"]],
  ["with motion reduced, a sheet that slides up", "slide", "reduce", ["moves"]],
  ["a crossfade on the house curve, in a third of a second", "fade", "on", []],
  ["a fade out and a fade in through the ground (listed as a dip, not failed)", "dip", "on", [], { dip: true }],
  ["a cross-fade both ways, two pages at half in its middle (not blank)", "both", "on", []],
  ["a sheet that rises on the house curve", "sheet", "on", []],
  ["the house's page switch from a page heavy with words to a light one (the old page nearly gone in a frame)", "house", "on", []],
  ["a page whose picture comes with it and whose words follow half a second later (not empty)", "staged", "on", []],
  ["a page switch in a View Transition whose route box stands 51px higher in the page arriving (the switch itself, under its picture)", "swap", "on", []],
  ["the same switch, then something in the live picture of the new page grows 140px at once", "swapjump", "on", ["jump"]],
  ["a label drawn as the page glides, carried by the page (Alaska's map label in an in-page move)", "glidewith", "on", []],
  ["a label drawn as the page glides, moving against it", "glideagainst", "on", ["misplaced"]],
  ["a label drawn as the page glides, left behind where the screen had it", "glidebehind", "on", ["misplaced"]],
  ["a bar fixed to the screen, drawn as the page glides under it", "glidefixed", "on", []],
  ["a label drawn in a sticky map as the page glides, riding with its map until the map sticks (Alaska's People)", "stickywith", "on", []],
  ["a label drawn in a sticky map as the page glides, going on with the page after its map stuck", "stickypage", "on", ["misplaced"]],
  ["a label drawn in a sticky map as the page glides, held where the screen had it while its map rode", "stickyscreen", "on", ["misplaced"]],
  ["an empty thread opened 28px, the posts below gliding 28px on the house curve in a View Transition (Community's \"0 replies\")", "feedglide", "on", [], { glide: true }],
  ["the same 28px landing in one frame", "feedland", "on", ["cut", "jump"]],
  ["a block that appears whole with no travel", "feedappear", "on", ["cut"]],
  ["a block that appears whole where a thread opens, as the posts below glide 160px to make room", "feedappearglide", "on", ["cut"]],
  ["with motion reduced, an instant change", "cut", "reduce", []],
  ["no change at all", "none", "on", []],
];

async function selfTest() {
  const { chromium } = await import("playwright");
  const own = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
  let ok = true;
  try {
    for (const [name, kind, motion, want, also = {}] of CASES) {
      let right = false;
      let said = "";
      // A recording that fell behind is made again, as the walk does.
      for (let tries = 0; tries < 3 && !right; tries++) {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: motion === "reduce" ? "reduce" : "no-preference" });
        const page = await ctx.newPage();
        const cdp = await ctx.newCDPSession(page);
        await page.setContent(PAGE);
        await ensureGate(page);
        await page.evaluate(prepare, kind);
        await page.waitForTimeout(300);
        const rec = await recordFrames(page, cdp, () => page.evaluate(plant, kind), { moves: motion === "reduce", minMs: 700 });
        const v = await judgeFrames(rec, { motion });
        await ctx.close();
        const kinds = [...new Set(v.fails.map((f) => f.kind))];
        right = want.every((k) => kinds.includes(k)) && kinds.every((k) => want.includes(k)) && (want.length || !v.unsure.length) && (!also.dip || v.dips.length > 0) && (!also.glide || v.glides.length > 0);
        said = `${kinds.length ? v.fails.map((f) => `${f.kind}: ${f.detail}`).join("; ") : "passes"}${v.dips.length ? ` [dip: ${v.dips.join("; ")}]` : ""}${v.glides.length ? ` [glide: ${v.glides.join("; ")}]` : ""}${v.unsure.length ? ` [unsure: ${v.unsure.join("; ")}]` : ""} (${v.frames} frames)`;
      }
      ok &&= right;
      console.log(`  ${right ? "ok    " : "MISSED"} ${name}: ${said}`);
    }
  } finally {
    await browser.close();
  }
  console.log(ok ? "\nself-test: the transitions check fails cuts, blank frames, flashes, jumps and motion where it is reduced, and passes the house's transitions" : "\nself-test FAILED");
  return ok;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes("--self-test")) {
    console.log("node scripts/gate/frames.mjs --self-test   (the walk is scripts/motion-walk.mjs)");
    process.exit(2);
  }
  process.exit((await selfTest()) ? 0 : 1);
}
