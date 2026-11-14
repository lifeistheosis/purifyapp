// Updates 69: one page switch on the export, frame by frame, with what the page and the
// browser were doing in each frame. Written to find what the motion walk's blank frames on
// the Bible's chapter switch are (round 4, 2026-11-14).
//
//   node docs/handoffs/updates-69-runners/switch69.mjs <out> [--from /bible/john/1/]
//     [--link "Next: John 2"] [--mode on|reduce] [--cpu 1] [--runs 1] [--shots dir]
//
// Set up as the motion walk sets its phone (390x844, touch, the shell's agent, motion pinned,
// the shell server), the page reached as the walk reaches it (scripts/lib/tap.mjs fresh), the
// link tapped by touch. Prints, from the tap: every view transition the page started (asked,
// updated, ready, finished, and the class it ran under); each animation frame where what the
// page holds changed (address, the first verse's words, verses, outline bars, animations);
// every long animation frame on the main thread; and the screencast's frames with how much of
// the reading area each one inks (pixels brighter than the ground by INK, between the bars).

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";
import sharp from "sharp";

import { motionOptions, pinMotion } from "../../../scripts/lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../../../scripts/lib/shell-server.mjs";
import { fresh, tapAt } from "../../../scripts/lib/tap.mjs";

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv.splice(i, 2)[1] : d;
};
const FROM = flag("--from", "/bible/john/1/");
const LINK = flag("--link", "Next: John 2");
const MODE = flag("--mode", "on");
const CPU = Number(flag("--cpu", "1"));
const RUNS = Number(flag("--runs", "1"));
const SHOTS = flag("--shots", null);
const OUT = path.resolve(argv[0] ?? "out");
const INK = 28;
const TOP = 64; // under the top bar's buttons
const BOTTOM = 730; // over the pill and the tab bar

const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(MODE) });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  } catch {}
  const s = (window.__s69 = { t0: null, vt: [], rows: [], loaf: [] });
  addEventListener("pointerdown", () => { if (s.t0 === null) s.t0 = performance.now(); }, true);
  const orig = Document.prototype.startViewTransition;
  if (orig) {
    Document.prototype.startViewTransition = function (arg) {
      const rec = { asked: performance.now(), types: arg && arg.types ? [...arg.types] : null };
      s.vt.push(rec);
      const vt = orig.call(this, arg);
      vt.updateCallbackDone.then(() => (rec.updated = performance.now()), () => (rec.updated = -1));
      vt.ready.then(() => {
        rec.ready = performance.now();
        rec.cls = getComputedStyle(document.documentElement).viewTransitionClass;
        // The page as it is pictured: each route wrapper's word on how it arrived, and when the chapter's entrance starts.
        rec.wrappers = [...document.querySelectorAll(".route-fade")].map((e) => `${e.dataset.carried ?? "unmarked"}:${getComputedStyle(e).animationName}`).join(", ");
        const title = document.querySelector(".page-open-title");
        const line = document.querySelector(".page-open-words > :first-child");
        rec.entrance = title ? `title delay ${getComputedStyle(title).animationDelay}, first line delay ${line ? getComputedStyle(line).animationDelay : "-"}` : "no entrance";
      }, () => (rec.ready = -1));
      vt.finished.then(() => (rec.finished = performance.now()));
      return vt;
    };
  }
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) s.loaf.push({ start: e.startTime, dur: e.duration, render: e.renderStart, layout: e.styleAndLayoutStart, block: e.blockingDuration, scripts: (e.scripts || []).map((x) => `${x.invokerType}:${x.invoker} ${Math.round(x.duration)}ms`).slice(0, 3) }); }).observe({ type: "long-animation-frame", buffered: false });
  } catch {}
  let last = "";
  const tick = () => {
    if (s.t0 !== null && performance.now() - s.t0 < 2000) {
      const verses = document.querySelectorAll("[data-verse]");
      const first = verses[0] ? verses[0].textContent.replace(/\s+/g, " ").trim().slice(0, 22) : "";
      let sk = 0;
      for (const el of document.querySelectorAll(".sk")) { const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight && r.width > 0) sk++; }
      const anims = document.getAnimations().map((a) => `${a.effect && a.effect.pseudoElement ? a.effect.pseudoElement : (a.effect && a.effect.target && (a.effect.target.className || a.effect.target.tagName) || "?").toString().slice(0, 18)}${a.animationName ? "/" + a.animationName : ""}`).slice(0, 5).join(" ");
      const key = `${location.pathname}|${first}|${verses.length}|${sk}|${anims}`;
      if (key !== last) { s.rows.push({ t: performance.now() - s.t0, path: location.pathname, first, verses: verses.length, sk, anims }); last = key; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await pinMotion(ctx, MODE);
await serveLikeTheShell(ctx, OUT, {});
const first = await ctx.newPage();
await go(first, "/", { timeout: 60000 });
await first.waitForTimeout(1500);
const kept = await first.evaluate(() => Object.entries({ ...localStorage }));
await first.close();

async function inkOf(buf) {
  const { data, info } = await sharp(buf).extract({ left: 0, top: TOP, width: 390, height: BOTTOM - TOP }).raw().toBuffer({ resolveWithObject: true });
  const c = info.channels;
  // The ground: the darkest common pixel, read off the region's left column.
  let g = [255, 255, 255];
  for (let y = 0; y < info.height; y += 7) { const i = (y * info.width + 2) * c; if (data[i] + data[i + 1] + data[i + 2] < g[0] + g[1] + g[2]) g = [data[i], data[i + 1], data[i + 2]]; }
  let n = 0;
  for (let i = 0; i < data.length; i += c) if (Math.max(Math.abs(data[i] - g[0]), Math.abs(data[i + 1] - g[1]), Math.abs(data[i + 2] - g[2])) > INK) n++;
  return n / (info.width * info.height);
}

for (let run = 1; run <= RUNS; run++) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (CPU > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  await fresh(page, FROM, kept);
  const link = page.getByRole("link", { name: LINK, exact: true }).first();
  const box = await link.boundingBox();
  if (!box) throw new Error(`no link named ${LINK} on ${FROM}`);
  const frames = [];
  cdp.on("Page.screencastFrame", (f) => { frames.push({ wall: f.metadata.timestamp * 1000, data: f.data }); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
  await page.waitForTimeout(400);
  await tapAt(cdp, box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1800);
  await cdp.send("Page.stopScreencast");
  const s = await page.evaluate(() => ({ ...window.__s69, origin: performance.timeOrigin }));
  const tapWall = s.origin + s.t0;
  const rel = (x) => (x === undefined ? "-" : x < 0 ? "rejected" : `${Math.round(x - s.t0)}`);
  console.log(`\nrun ${run}: ${FROM} tap "${LINK}", motion ${MODE}, CPU x${CPU}`);
  for (const v of s.vt) console.log(`  view transition: asked ${rel(v.asked)}, updated ${rel(v.updated)}, ready ${rel(v.ready)}, finished ${rel(v.finished)} (class ${v.cls ?? "?"}, types ${JSON.stringify(v.types)}); wrappers [${v.wrappers ?? "?"}]; ${v.entrance ?? ""}`);
  for (const r of s.rows) console.log(`  page ${Math.round(r.t)}ms: ${r.path} verses ${r.verses} first "${r.first}" outline bars ${r.sk} anims [${r.anims}]`);
  for (const l of s.loaf.filter((l) => l.start + l.dur > s.t0 && l.start < s.t0 + 1500)) console.log(`  long frame ${Math.round(l.start - s.t0)}ms for ${Math.round(l.dur)}ms (render at ${Math.round(l.render - s.t0)}, style+layout at ${Math.round(l.layout - s.t0)}, blocking ${Math.round(l.block)}) ${l.scripts.join("; ")}`);
  const inks = [];
  for (const f of frames) inks.push({ t: Math.round(f.wall - tapWall), ink: await inkOf(Buffer.from(f.data, "base64")), data: f.data });
  console.log(`  frames (ms after the tap: share of the reading area inked): ${inks.filter((f) => f.t > -50 && f.t < 1400).map((f) => `${f.t}:${(f.ink * 100).toFixed(1)}%`).join(" ")}`);
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const f of inks.filter((f) => f.t > 250 && f.t < 800)) fs.writeFileSync(path.join(SHOTS, `run${run}-${String(f.t).padStart(4, "0")}.png`), Buffer.from(f.data, "base64"));
  }
  await page.close();
}
await browser.close();
