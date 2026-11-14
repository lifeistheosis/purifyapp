// The ambience sheet, opened while a reading plays (build 97 note 10, Updates 63).
//
// His words (2026-11-14, about 16:20 UTC): "the ambience window opening up while
// playing someone is playing is a little buggy overrall the ambience system needs
// optimizing", and asked what looked buggy, "not the sound but the ui". This walk
// plays John 1 (a stretch of silence stands in for the recording; the words are
// lit by its timings as they are on a phone) on the native export at 390x844 with
// the CPU slowed four times, and opens and closes the ambience sheet over the
// player's Words view and its Cover view (from its ••• sheet, as a reader does),
// over the reader (the sound button by the chapter pager) and over Prayers (the
// bar's sound button). Every frame from the tap to 1.5s after is read once it is
// painted (a task posted from its requestAnimationFrame runs after the paint; a
// box read inside the callback forces a layout the screen never shows, Updates
// 61): its time, the sheet's top, the scrim, the sheets under it, each part's box
// against the panel and each photograph's state. What each frame waits on comes
// from Chromium's own trace of the same window (main thread: script, style,
// layout, paint; raster and image decoding; the compositor's frames, dropped or
// presented) and from the long animation frames the page reports.
//
// Then the controls, over the player's Words view: a tile tapped (when "Loading"
// shows, when "Playing"), a second tile, the one playing stopped, the volume, the
// sleep timer: each read frame by frame, each part's box, so an answer late or a
// part moving is a number.
//
//   node scripts/ambience-open-walk.mjs [--out <export>] [--motion on|reduce]
//     [--no-blur] [--json <file>] [--check]
//
// --no-blur takes the scrim's blur away (a diagnosis: what the blur costs).
// --check fails (exit 1) on what note 10 forbids, below (CHECKS).

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";
import { motionOptions, pinMotion } from "./lib/motion.mjs";

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.resolve(opt("--out", path.join(ROOT, "out")));
const MOTION = opt("--motion", "on");
const CHECK = argv.includes("--check");
const NO_BLUR = argv.includes("--no-blur");
const JSON_FILE = opt("--json");
const WINDOW = 1500;
const OWN = "/opt/pw-browsers/chromium";
const EN = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8"));
const t = (key) => EN[key] ?? key;
const SHEET = `[role="dialog"][aria-label="${t("ambience.title")}"]`;
const NOW_PLAYING = `[role="dialog"][aria-label="${t("prayers.nowPlaying")}"]`;

// ---- what the main web serves, answered from this checkout (scripts/gate/voices.mjs's stand-ins)

function silence(seconds) {
  const n = Math.ceil(seconds * 8000);
  const b = Buffer.alloc(44 + n, 128);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(8000, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write("data", 36);
  b.writeUInt32LE(n, 40);
  return b;
}
const QUIET = silence(240);

function fulfilBytes(route, body, contentType) {
  const headers = { "access-control-allow-origin": "*", "accept-ranges": "bytes", "content-type": contentType };
  const range = /^bytes=(\d*)-(\d*)$/.exec(route.request().headers()["range"] ?? "");
  if (range && (range[1] || range[2])) {
    const size = body.length;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return route.fulfill({ status: 416, headers: { ...headers, "content-range": `bytes */${size}` }, body: "" });
    return route.fulfill({ status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}` }, body: body.subarray(start, end + 1) });
  }
  return route.fulfill({ status: 200, headers, body });
}

async function standIns(ctx) {
  const cors = { "access-control-allow-origin": "*" };
  await ctx.route(/^https:\/\/purifyapp\.net\/(?!api\/)/, (route) => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join(ROOT, "public", p);
    if (p.includes("..") || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
    const type = { ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml" }[path.extname(file)] ?? "application/octet-stream";
    return route.fulfill({ status: 200, contentType: type, headers: cors, body: fs.readFileSync(file) });
  });
  await ctx.route(/^https:\/\/audio\.purifyapp\.net\/read\//, (route) => {
    if (route.request().resourceType() !== "media") return route.abort();
    return fulfilBytes(route, QUIET, "audio/wav");
  });
}

// ---- the frames, read in the page once each is painted

function sampler({ windowMs, sheetSel }) {
  window.__frames = [];
  window.__loaf = [];
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        window.__loaf.push({
          at: Math.round(e.startTime - window.__t0),
          ms: Math.round(e.duration),
          script: Math.round((e.scripts ?? []).reduce((s, x) => s + x.duration, 0)),
          render: e.renderStart ? Math.round((e.styleAndLayoutStart || e.startTime + e.duration) - e.renderStart) : 0,
          layout: e.styleAndLayoutStart ? Math.round(e.startTime + e.duration - e.styleAndLayoutStart) : 0,
          by: [...(e.scripts ?? [])].sort((a, b) => b.duration - a.duration).slice(0, 2).map((x) => `${x.invokerType}:${(x.invoker || "").slice(0, 40)} ${Math.round(x.duration)}ms`),
        });
    }).observe({ type: "long-animation-frame", buffered: false });
  } catch {}
  const t0 = performance.now();
  window.__t0 = t0;
  window.__tap = {};
  // When the player's words wake (Updates 67): the first restyle of a word or row of the lit
  // words after the tap (the clock's glow, a line's move), none while they rest.
  window.__wake = null;
  const words = document.querySelector('[data-sung-look="player"]');
  if (words) {
    const mo = new MutationObserver((list) => {
      if (list.some((m) => m.target.closest?.("li[data-sung]"))) {
        window.__wake ??= Math.round(performance.now() - t0);
        mo.disconnect();
      }
    });
    mo.observe(words, { attributes: true, attributeFilter: ["style"], subtree: true });
    setTimeout(() => mo.disconnect(), windowMs + 200);
  }
  // The finger's own times: when it touched (the event's time), and when the click's handler ran.
  addEventListener("pointerdown", (e) => (window.__tap.down ??= Math.round(e.timeStamp - t0)), { capture: true, once: true });
  addEventListener("click", () => (window.__tap.click ??= Math.round(performance.now() - t0)), { capture: true, once: true });
  const r = (el, base) => {
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.left - (base?.left ?? 0)), y: Math.round(b.top - (base?.top ?? 0)), w: Math.round(b.width), h: Math.round(b.height) };
  };
  const panelOf = (d) => (d ? d.querySelector(".will-change-transform") : null);
  const channel = new MessageChannel();
  let frameAt = 0;
  channel.port1.onmessage = () => read(frameAt);
  const step = (now) => {
    frameAt = now;
    channel.port2.postMessage(null);
    if (now - t0 < windowMs) requestAnimationFrame(step);
  };
  const read = (now) => {
    const f = { t: Math.round(now - t0) };
    const d = [...document.querySelectorAll(sheetSel)].at(-1);
    const panel = panelOf(d);
    if (panel) {
      const p = panel.getBoundingClientRect();
      f.top = Math.round(p.top);
      f.h = Math.round(p.height);
      const scrim = d.querySelector(":scope > button");
      if (scrim) f.scrim = { o: Math.round(Number(getComputedStyle(scrim).opacity) * 100) / 100, h: Math.round(scrim.getBoundingClientRect().height) };
      const parts = {};
      panel.querySelectorAll("[data-ambience-tile]").forEach((el) => (parts[`tile:${el.dataset.ambienceTile}`] = { ...r(el, p), on: el.getAttribute("aria-pressed"), state: el.lastElementChild?.textContent?.trim() || "" }));
      const head = panel.firstElementChild;
      if (head) parts.head = r(head, p);
      panel.querySelectorAll('[role="slider"]').forEach((el, i) => (parts[`slider${i}`] = { ...r(el, p), v: el.getAttribute("aria-valuenow") }));
      panel.querySelectorAll('[role="group"] button').forEach((el, i) => (parts[`sleep${i}`] = { ...r(el, p), on: el.getAttribute("aria-pressed") }));
      f.parts = parts;
      f.photos = [...panel.querySelectorAll(".ambience-tile-picture img")].map((im) => (im.dataset.arrived !== undefined ? 2 : im.complete && im.naturalWidth > 0 ? 1 : 0)).join("");
    }
    // The sheets under it (the player, its ••• sheet): their panels' tops and scrims.
    f.under = [...document.querySelectorAll('[role="dialog"]')]
      .filter((x) => x !== d && x.getClientRects().length)
      .map((x) => {
        const pp = panelOf(x) ?? x;
        const s = x.querySelector(":scope > button");
        return `${(x.getAttribute("aria-label") || "?").slice(0, 12)}@${Math.round(pp.getBoundingClientRect().top)}${s ? `/${Math.round(Number(getComputedStyle(s).opacity) * 100) / 100}` : ""}`;
      })
      .join(" ");
    window.__frames.push(f);
  };
  requestAnimationFrame(step);
}

// ---- Chromium's trace of a window: what the frames wait on

const CATEGORIES = [
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "blink",
  "cc",
  "viz",
  "gpu",
].join(",");

async function traced(cdp, run) {
  const events = [];
  const done = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
  const onData = (e) => events.push(...e.value);
  cdp.on("Tracing.dataCollected", onData);
  await cdp.send("Tracing.start", { categories: CATEGORIES, transferMode: "ReportEvents" });
  const result = await run();
  await cdp.send("Tracing.end");
  await done;
  cdp.off("Tracing.dataCollected", onData);
  return { result, events };
}

const MAIN_WORK = {
  script: ["FunctionCall", "EvaluateScript", "v8.compile", "TimerFire", "FireAnimationFrame", "EventDispatch", "RunMicrotasks", "V8.GCScavenger", "MajorGC", "MinorGC"],
  style: ["UpdateLayoutTree", "RecalculateStyles", "ScheduleStyleRecalculation"],
  layout: ["Layout"],
  paint: ["Paint", "PrePaint", "Layerize", "UpdateLayer", "Commit", "PaintImage"],
  decode: ["Decode Image", "Decode LazyPixelRef", "ImageDecodeTask", "Decode Image"],
};

function summarise(events, markName, windowMs) {
  const threads = new Map();
  for (const e of events) if (e.ph === "M" && e.name === "thread_name") threads.set(`${e.pid}:${e.tid}`, e.args?.name ?? "");
  const mark = events.find((e) => e.name === "TimeStamp" && e.args?.data?.message === markName);
  if (!mark) return null;
  const from = mark.ts;
  const to = from + windowMs * 1000;
  const inWin = (e) => e.ts >= from && e.ts <= to;
  const thread = (e) => threads.get(`${e.pid}:${e.tid}`) ?? "";
  const sums = { main: {}, raster: {}, viz: {}, decode: 0 };
  const bucket = (name) => Object.entries(MAIN_WORK).find(([, names]) => names.includes(name))?.[0] ?? null;
  const open = new Map();
  for (const e of events) {
    if (!inWin(e)) continue;
    let dur = null;
    if (e.ph === "X") dur = (e.dur ?? 0) / 1000;
    else if (e.ph === "B") {
      open.set(`${e.pid}:${e.tid}:${e.name}`, e.ts);
      continue;
    } else if (e.ph === "E") {
      const k = `${e.pid}:${e.tid}:${e.name}`;
      if (open.has(k)) dur = (e.ts - open.get(k)) / 1000;
      open.delete(k);
    }
    if (dur === null) continue;
    const th = thread(e);
    if (/decode/i.test(e.name)) sums.decode += dur;
    if (th === "CrRendererMain") {
      const b = bucket(e.name);
      if (b) sums.main[b] = (sums.main[b] ?? 0) + dur;
    } else if (/CompositorTileWorker|Raster/i.test(th)) {
      if (/RasterTask|ImageDecodeTask|TileManager|Raster/i.test(e.name)) sums.raster[e.name] = (sums.raster[e.name] ?? 0) + dur;
    } else if (/Viz|GpuMain|Compositor/i.test(th)) {
      if (/Draw|Swap|Render|Display::|SkiaRenderer|Aggregate/i.test(e.name)) sums.viz[e.name] = (sums.viz[e.name] ?? 0) + dur;
    }
  }
  // The compositor's own word on each frame: presented, or dropped.
  const states = {};
  for (const e of events) {
    if (e.name !== "PipelineReporter" || e.ph !== "b" || !inWin(e)) continue;
    const fr = e.args?.frame_reporter ?? e.args?.chrome_frame_reporter ?? {};
    const s = String(fr.state ?? "?").replace("STATE_", "").toLowerCase() + (fr.affects_smoothness ? " (smoothness)" : "");
    states[s] = (states[s] ?? 0) + 1;
  }
  const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1]).slice(0, 6));
  return { main: round(sums.main), raster: round(sums.raster), viz: round(sums.viz), decode: Math.round(sums.decode), frames: states };
}

// ---- reading the frames

function readFrames(frames) {
  const gaps = [];
  for (let i = 1; i < frames.length; i++) gaps.push(frames[i].t - frames[i - 1].t);
  const dropped = gaps.reduce((s, g) => s + Math.max(0, Math.round(g / 16.7) - 1), 0);
  const longest = gaps.length ? Math.max(...gaps) : 0;
  // Each part against the panel: how far it moved in one frame, once drawn.
  const jumps = [];
  let prev = null;
  for (const f of frames) {
    if (!f.parts) {
      prev = null;
      continue;
    }
    if (prev)
      for (const [k, b] of Object.entries(f.parts)) {
        const a = prev.parts[k];
        if (!a || !a.w || !b.w) continue;
        const moved = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), Math.abs(b.w - a.w), Math.abs(b.h - a.h));
        if (moved > 2) jumps.push({ t: f.t, part: k, moved, from: `${a.x},${a.y} ${a.w}x${a.h}`, to: `${b.x},${b.y} ${b.w}x${b.h}` });
      }
    prev = f;
  }
  // The panel's own travel: a step against the way it goes, or one that stalls mid-way.
  const tops = frames.filter((f) => typeof f.top === "number").map((f) => ({ t: f.t, top: f.top }));
  const steps = [];
  for (let i = 1; i < tops.length; i++) steps.push({ t: tops[i].t, d: tops[i].top - tops[i - 1].top, gap: tops[i].t - tops[i - 1].t });
  const way = tops.length > 1 ? Math.sign(tops.at(-1).top - tops[0].top) : 0;
  const against = way ? steps.filter((s) => Math.sign(s.d) === -way && Math.abs(s.d) > 2) : [];
  const biggest = steps.reduce((m, s) => (Math.abs(s.d) > Math.abs(m.d) ? s : m), { d: 0, t: 0, gap: 0 });
  const photosAtRise = frames.find((f) => f.photos !== undefined)?.photos ?? null;
  const photosWhole = frames.find((f) => f.photos && /^2+$/.test(f.photos))?.t ?? null;
  const lastDrawn = frames.findLastIndex((f) => typeof f.top === "number");
  const gone = lastDrawn >= 0 && lastDrawn < frames.length - 1 ? frames[lastDrawn + 1].t : null;
  const moving = tops.length > 1 ? { first: tops[0].t, settled: tops.find((x, i) => i > 0 && tops.slice(i).every((y) => Math.abs(y.top - tops.at(-1).top) <= 1))?.t ?? null } : null;
  return { n: frames.length, dropped, longest, jumps, against, biggest, photosAtRise, photosWhole, moving, gone, first: tops[0] ?? null, last: tops.at(-1) ?? null };
}

// ---- the walk

const results = { export: OUT, motion: MOTION, noBlur: NO_BLUR, scenes: {}, controls: {} };
const failures = [];

const browser = await chromium.launch({ executablePath: OWN });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  isMobile: true,
  hasTouch: true,
  userAgent: NATIVE_UA,
  ...motionOptions(MOTION),
});
await pinMotion(ctx, MOTION);
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  } catch {}
});
// The app's one player is an Audio() kept off the page: every media element that plays is kept.
await ctx.addInitScript(() => {
  const kept = (window.__media = new Set());
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...a) {
    kept.add(this);
    return play.apply(this, a);
  };
});
if (NO_BLUR) await ctx.addInitScript(() => {
  const s = document.createElement("style");
  s.textContent = '[role="dialog"] > button { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }';
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(s));
});
await serveLikeTheShell(ctx, OUT, {});
await standIns(ctx);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
const cdp = await ctx.newCDPSession(page);

const visible = (sel) => page.locator(sel).filter({ visible: true });
async function tap(locator, { dry = false } = {}) {
  // A row below a sheet's fold is scrolled to first, as a reader's thumb scrolls to it.
  if (locator.scrollIntoViewIfNeeded) {
    const inView = await locator.evaluate((el) => { const b = el.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; });
    if (!inView) {
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    }
  }
  if (dry) return;
  const box = await locator.boundingBox();
  if (!box) throw new Error("nothing to tap");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}
async function waitFor(fn, arg, ms = 15000) {
  for (let waited = 0; waited < ms; waited += 200) {
    if (await page.evaluate(fn, arg).catch(() => false)) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

/** Tap, and read every frame from the tap to WINDOW after, with the trace of the same window. */
let marks = 0;
async function measure(label, locator) {
  const mark = `ambience-${++marks}`;
  // Scrolled to and measured before the clock starts: the walk's own questions to a slowed page
  // took up to 0.7s, and counted as the app's (the first run of this walk).
  // No locator: the window is read with nothing tapped, from its start.
  if (locator?.scrollIntoViewIfNeeded) await tap(locator, { dry: true });
  const box = locator ? await locator.boundingBox() : null;
  if (locator && !box) throw new Error(`${label}: nothing to tap`);
  const { result: frames, events } = await traced(cdp, async () => {
    await page.evaluate(sampler, { windowMs: WINDOW, sheetSel: SHEET });
    await page.evaluate((m) => console.timeStamp(m), mark);
    if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(WINDOW + 250);
    return page.evaluate(() => ({ frames: window.__frames, loaf: window.__loaf, tap: window.__tap, wake: window.__wake }));
  });
  // Every time from the touch itself.
  const down = frames.tap.down ?? 0;
  for (const f of frames.frames) f.t -= down;
  for (const l of frames.loaf) l.at -= down;
  const read = readFrames(frames.frames.filter((f) => f.t >= 0));
  const trace = summarise(events, mark, WINDOW);
  const wake = typeof frames.wake === "number" ? frames.wake - down : null;
  return { label, ...read, wake, click: frames.tap.click === undefined ? null : frames.tap.click - down, trace, loaf: frames.loaf.filter((l) => l.at >= -50).slice(0, 8), frames: frames.frames.filter((f) => f.t >= 0) };
}

function line(m) {
  const tr = m.trace;
  const fr = tr ? Object.entries(tr.frames).map(([k, v]) => `${k} ${v}`).join(", ") : "no trace";
  console.log(
    `  ${m.label}: click ran ${m.click ?? "?"}ms after the touch; ${m.n} frames, longest ${m.longest}ms, ${m.dropped} dropped by the gaps; compositor: ${fr}` +
      (m.moving ? `; moved ${m.moving.first} to ${m.moving.settled ?? "not settled"}ms, top ${m.first?.top} to ${m.last?.top}, biggest step ${m.biggest.d}px in ${m.biggest.gap}ms` : "") +
      (m.photosAtRise !== null ? `; photos at first frame ${m.photosAtRise}, all shown at ${m.photosWhole ?? "never"}ms` : "") +
      (m.gone !== null ? `; the sheet gone at ${m.gone}ms` : "") +
      (m.wake !== null ? `; the player's words woke at ${m.wake}ms` : ""),
  );
  if (tr) console.log(`    main ${JSON.stringify(tr.main)} decode ${tr.decode}ms raster ${JSON.stringify(tr.raster)} viz ${JSON.stringify(tr.viz)}`);
  for (const l of m.loaf.slice(0, 4)) console.log(`    long frame at ${l.at}ms: ${l.ms}ms (script ${l.script}, rAF/observers ${l.render}, style+layout+paint ${l.layout}) ${l.by.join("; ")}`);
  for (const j of m.jumps.slice(0, 6)) console.log(`    jump at ${j.t}ms: ${j.part} ${j.moved}px (${j.from} to ${j.to})`);
  for (const a of m.against.slice(0, 3)) console.log(`    against its way at ${a.t}ms: ${a.d}px`);
}

async function openAndClose(name, opener) {
  const open = await measure(`${name}, opened`, await opener());
  line(open);
  await page.waitForTimeout(400);
  const close = await measure(`${name}, closed`, visible(`${SHEET} button[aria-label="${t("common.close")}"]`).last());
  line(close);
  results.scenes[name] = { open, close };
  await page.waitForTimeout(700);
}

console.log(`The ambience sheet while a reading plays, on ${path.relative(ROOT, OUT) || OUT}: 390x844, CPU 4x, motion ${MOTION}${NO_BLUR ? ", the scrim's blur taken away" : ""}.`);
await go(page, "/bible/john/1/", { timeout: 60000 });
await page.waitForTimeout(2500);
await tap(visible(`[data-reader-pill] button, [data-reader-dock] button`).filter({ hasText: t("readAloud.listen") }).first());
if (!(await waitFor(() => [...(window.__media ?? [])].some((a) => !a.paused && a.currentTime > 0), null, 20000))) throw new Error("John 1 never began to play");
await page.waitForTimeout(1500);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

// Over the reader: while a reading plays the pager's sound button gives way to the dock, so the
// sheet opens from the reader's settings (its ••• sheet, then Reader settings), as a reader opens it.
await openAndClose("over the reader", async () => {
  await tap(visible(`button[aria-label="${t("bible.moreActions")}"]`).first());
  await page.waitForTimeout(1200);
  await tap(visible(`[role="dialog"] button`).filter({ hasText: t("bible.readerSettings") }).last());
  await page.waitForTimeout(1200);
  return visible(`[role="dialog"] button[aria-haspopup="dialog"]`).filter({ hasText: t("ambience.title") }).last();
});

// Over the player: its Words view, then its Cover view, each from the ••• sheet.
const opener = visible("[data-reader-dock] .reader-dock-card button[aria-label], [data-reader-dock] .reader-dock-pill button[aria-label], [data-now-playing-bar] button[aria-label], [data-mini-player] button[aria-label]");
await tap(opener.first());
await page.locator(NOW_PLAYING).first().waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);
for (const view of ["words", "cover"]) {
  await tap(visible(`#player-view-tab-${view}`).first());
  await page.waitForTimeout(1200);
  await openAndClose(`over the player's ${view === "words" ? "Words" : "Cover"} view`, async () => {
    await tap(visible(`${NOW_PLAYING} button[aria-label="${t("bible.moreActions")}"]`).first());
    await page.waitForTimeout(1200);
    return visible(`[role="dialog"] button`).filter({ hasText: t("ambience.title") }).last();
  });
}

// The controls, over the Words view: each read frame by frame from its tap.
await tap(visible(`#player-view-tab-words`).first());
await page.waitForTimeout(1000);
// First the Words view with nothing over it: what the words cost on their own (Updates 67), so a
// window after the sheet has gone can be read against it.
results.rest = await measure("the player's Words view, nothing over it, nothing tapped", null);
line(results.rest);
await page.waitForTimeout(400);
await tap(visible(`${NOW_PLAYING} button[aria-label="${t("bible.moreActions")}"]`).first());
await page.waitForTimeout(1200);
await tap(visible(`[role="dialog"] button`).filter({ hasText: t("ambience.title") }).last());
await page.waitForTimeout(1500);
const tile = (id) => visible(`${SHEET} [data-ambience-tile="${id}"]`).first();
async function control(name, locator, { at = null } = {}) {
  let target = locator;
  if (at !== null) {
    const box = await locator.boundingBox();
    target = { boundingBox: async () => ({ x: box.x + box.width * at - 1, y: box.y, width: 2, height: box.height }) };
  }
  const m = await measure(name, target);
  // When the tapped part's state changed, frame by frame.
  const states = [];
  for (const f of m.frames) {
    const s = JSON.stringify(Object.fromEntries(Object.entries(f.parts ?? {}).filter(([k]) => /^tile|^slider|^sleep/.test(k)).map(([k, v]) => [k, v.state ?? v.v ?? v.on])));
    if (states.at(-1)?.s !== s) states.push({ t: f.t, s });
  }
  m.changes = states.slice(1).map((x) => ({ t: x.t, s: x.s }));
  console.log(`  ${name}: changes at ${m.changes.map((c) => `${c.t}ms`).join(", ") || "none"}`);
  for (const c of m.changes.slice(0, 4)) console.log(`    ${c.t}ms ${c.s.replace(/"/g, "").slice(0, 160)}`);
  line(m);
  results.controls[name] = m;
  await page.waitForTimeout(600);
}
await control("Rain tapped", tile("rain"));
await page.waitForTimeout(1500);
await control("Birds tapped (a second sound)", tile("birds"));
await page.waitForTimeout(1500);
await control("Rain tapped again (stops)", tile("rain"));
await page.waitForTimeout(800);
await control("the volume at 30%", visible(`${SHEET} [role="slider"]`).first(), { at: 0.3 });
await control("the sleep timer, 15 minutes", visible(`${SHEET} [role="group"] button`).nth(1));
await control("the sleep timer, off", visible(`${SHEET} [role="group"] button`).nth(0));
await control("Birds tapped again (stops)", tile("birds"));

// Over Prayers: the sheet and the player closed, the reading still playing, the bar's sound button.
// The bar draws that button only while a sound plays (components/prayers/NowPlayingBar.tsx), and
// names it with the sound ("Ambience, Rain playing"): so a sound is started first, unmeasured, and
// the button is found by its name's start (Updates 65's find; both its runs stopped here).
await tap(tile("rain"));
if (!(await waitFor(({ sel, want }) => document.querySelector(sel)?.lastElementChild?.textContent?.trim() === want, { sel: `${SHEET} [data-ambience-tile="rain"]`, want: t("ambience.playing") }, 20000)))
  throw new Error("Rain never began to play before Prayers");
await page.waitForTimeout(600);
await tap(visible(`${SHEET} button[aria-label="${t("common.close")}"]`).last());
await page.waitForTimeout(900);
await tap(visible(`${NOW_PLAYING} button[aria-label="${t("common.close")}"]`).last());
await page.waitForTimeout(900);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await go(page, "/prayers/", { timeout: 60000 });
await page.waitForTimeout(2500);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await openAndClose("over Prayers", async () =>
  visible(`[data-now-playing-bar] button[aria-haspopup="dialog"][aria-label^="${t("ambience.title")}"], [data-mini-player] button[aria-haspopup="dialog"][aria-label^="${t("ambience.title")}"]`).first(),
);

await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(" | ")}`);
await browser.close();

if (JSON_FILE) {
  for (const group of [results.scenes, results.controls, { rest: results.rest }])
    for (const v of Object.values(group).filter(Boolean)) for (const m of v.open ? [v.open, v.close] : [v]) m.frames = m.frames.map((f) => ({ t: f.t, top: f.top, scrim: f.scrim, photos: f.photos, under: f.under }));
  fs.writeFileSync(JSON_FILE, JSON.stringify(results, null, 1));
}

// ---- the check, from the before side (the export cut from 515ff5b5): over the player's Words view
// the sheet rose in 36 frames and fell in 32 (53 and 58 dropped; 82 and 88 over the Cover view, and
// the same 36 with the scrim's blur taken away), and on the first opening the six photographs had
// their bytes but none was shown at the sheet's first frame (all shown at 258ms; at 455ms over Words).
const MIN_FRAMES = 60;
const CHECKS = [
  (r, fail) => {
    for (const [name, { open }] of Object.entries(r.scenes))
      if (open.photosAtRise !== null && !/^2+$/.test(open.photosAtRise)) fail(`${name}: the photographs at the sheet's first frame were ${open.photosAtRise} (2 is shown), all shown at ${open.photosWhole ?? "never"}ms`);
  },
  (r, fail) => {
    for (const [name, pair] of Object.entries(r.scenes)) {
      if (!/Words/.test(name)) continue;
      for (const m of [pair.open, pair.close]) if (m.n < MIN_FRAMES) fail(`${m.label}: ${m.n} frames in ${WINDOW}ms (at least ${MIN_FRAMES}), ${m.dropped} dropped, longest ${m.longest}ms`);
    }
  },
];
if (CHECK) {
  for (const c of CHECKS) c(results, failures);
  if (failures.length) {
    console.log(`FAIL: ${failures.length}`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("PASS");
}
