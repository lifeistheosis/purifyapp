// What floats at the foot steps aside for a toast (build 95 note 7). His word,
// 2026-11-13, on build 96, with a screenshot of John 1:5 just after a verse
// was highlighted: "ui overlalping". On that build's export at 390, a double
// tap on the verse put the Highlighted toast over the chapter pill, the
// pill's rounded top and its Listen button showing above it.
// lib/ui/__tests__/toastBand.test.ts holds the source; this watches the
// built app, every frame, with real touch and Purify's motion on.
//
//   npm run build:android                 (writes out/; cut it as the releases
//                                          do, with the shop and community on)
//   node scripts/toast-walk.mjs           the walk
//   node scripts/toast-walk.mjs --self-test
//                                          proves it: with the step aside taken
//                                          off, it must fail the overlap
//
// At 390 and 412, each with a double tap the way a finger gives one:
//   - John 1, verse 5: no frame shows the toast and anything else at the
//     foot but the tab bar and the mini player (the chapter pill) over each
//     other, both seen at more than a quarter of their ink; and when the
//     toast goes, the pill is back within 600ms;
//   - John 1, verse 6, then Undo: the verse as it was, the toast gone, the
//     pill back;
//   - a work of St John Chrysostom, a paragraph: the same, with the work's
//     pill;
//   - the day's first reading, opened from the search's day, a verse: the
//     same, with the day's readings bar.
// And once with Purify's motion off: nothing over anything, at once.
//
// Exit 1 when anything fails.

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const SELF_TEST = process.argv.includes("--self-test");
const OUT = path.resolve("out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first");
const OWN = "/opt/pw-browsers/chromium";
const SIZES = [
  { width: 390, height: 844 },
  { width: 412, height: 915 },
];
/** Seen: at more than this share of its ink. */
const SEEN = 0.25;
/** Back: what stepped aside is whole again this long after the toast goes. */
const BACK_MS = 600;
/** The step aside taken off, for the self-test. */
const NO_STEP = 'html body[data-toast-up] [data-screen-edge="bottom"]:not([data-tab-bar]):not([data-mini-player]) { opacity: 1 !important; visibility: visible !important; }';

let failed = 0;
let passed = 0;
const say = (ok, name, detail) => {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

async function open(browser, size, set = {}, broken = null) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, reducedMotion: "no-preference" });
  await ctx.addInitScript(
    (values) => {
      for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    },
    { "purify:onboarded": "99", "purify:whatsNewSeen": "99", "purify.motion.device": "ok", ...set },
  );
  if (broken) await ctx.addInitScript((css) => {
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.appendChild(s);
    });
  }, broken);
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const tapAt = async ({ x, y }) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await page.waitForTimeout(60);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const doubleTap = async (at) => {
    await tapAt(at);
    await page.waitForTimeout(110);
    await tapAt(at);
  };
  return { ctx, page, tapAt, doubleTap };
}

/** Every frame from now: the toast's box and ink, and each other thing at the foot that it meets. */
const watch = (page) =>
  page.evaluate(() => {
    const frames = (window.__toastFrames = []);
    const run = (window.__toastRun = (window.__toastRun ?? 0) + 1);
    // The ink a thing is seen at: its own and its ancestors', nothing if hidden.
    const ink = (el) => {
      let o = 1;
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.visibility === "hidden" || cs.display === "none") return 0;
        o *= Number(cs.opacity);
      }
      return o;
    };
    const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const tick = () => {
      if (window.__toastRun !== run) return;
      const toast = document.querySelector("[data-undo-bar]");
      const others = [...document.querySelectorAll('[data-screen-edge="bottom"]:not([data-tab-bar]):not([data-mini-player])')]
        .map((el) => ({ name: [...el.attributes].map((a) => a.name).filter((n) => n.startsWith("data-") && n !== "data-screen-edge").join(" ") || "a bar at the foot", ink: ink(el), ...box(el) }))
        .filter((o) => o.b - o.t > 0);
      frames.push({ t: performance.now(), toast: toast ? { ink: ink(toast), ...box(toast) } : null, others });
      if (frames.length < 900) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
const frames = (page) => page.evaluate(() => window.__toastFrames ?? []);

/** The worst frame where the toast and another thing at the foot are both seen, over each other. */
function overOf(list) {
  let worst = null;
  for (const f of list) {
    if (!f.toast || f.toast.ink <= SEEN) continue;
    for (const o of f.others) {
      if (o.ink <= SEEN) continue;
      const x = Math.min(f.toast.r, o.r) - Math.max(f.toast.l, o.l);
      const y = Math.min(f.toast.b, o.b) - Math.max(f.toast.t, o.t);
      if (x > 2 && y > 2 && (!worst || Math.min(f.toast.ink, o.ink) > worst.both)) worst = { both: Math.min(f.toast.ink, o.ink), name: o.name, toast: f.toast, o, t: f.t };
    }
  }
  return worst;
}
const overWords = (w, from) =>
  w ? `at +${Math.round(w.t - from)}ms the toast (${Math.round(w.toast.t)} to ${Math.round(w.toast.b)}, ink ${w.toast.ink.toFixed(2)}) over ${w.name} (${Math.round(w.o.t)} to ${Math.round(w.o.b)}, ink ${w.o.ink.toFixed(2)})` : "never both seen over each other";

/** A place to double tap: the first line of the words of `sel`, set in the middle of the screen. */
const spot = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + Math.min(140, r.width / 2)), y: Math.round(r.top + Math.min(16, r.height / 2)) };
  }, sel);

/** One place: double tap, watch it come, and, unless `undo`, wait for it to go and the bar to come back. */
async function place(o, label, sel, { undo = false, still = false } = {}) {
  const { page, doubleTap } = o;
  const at = await spot(page, sel);
  if (!at) {
    say(false, label, `nothing to tap at ${sel}`);
    return;
  }
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => [...document.querySelectorAll('[data-screen-edge="bottom"]:not([data-tab-bar]):not([data-mini-player])')].filter((el) => el.getBoundingClientRect().height > 0).length);
  await watch(page);
  const from = await page.evaluate(() => performance.now());
  await doubleTap(at);
  await page.waitForFunction(() => !!document.querySelector("[data-undo-bar]"), null, { timeout: 3000 }).catch(() => {});
  if (undo) {
    await page.waitForTimeout(900);
    await page.locator("[data-undo-bar] button").first().tap();
  }
  // The toast stays five seconds (lib/ui/useUndo.ts); then what stepped aside comes back.
  await page.waitForFunction(() => !document.querySelector("[data-undo-bar]"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(BACK_MS + 200);
  const list = await frames(page);
  const shown = list.some((f) => f.toast);
  const over = overOf(list);
  say(shown && before > 0, `${label}: the toast came, with something at the foot to meet`, `${shown ? "toast shown" : "no toast"}; ${before} thing${before === 1 ? "" : "s"} at the foot`);
  say(shown && !over, `${label}: and nothing at the foot stands under it`, overWords(over, from));
  const goneAt = list.findIndex((f, i) => i > 0 && !f.toast && list[i - 1].toast);
  const back = goneAt < 0 ? null : list.slice(goneAt).find((f) => f.others.length > 0 && f.others.every((x) => x.ink >= 0.99));
  const backMs = back ? back.t - list[goneAt].t : null;
  say(goneAt >= 0 && back !== undefined && back !== null && backMs <= (still ? 120 : BACK_MS), `${label}: as it goes, what stepped aside is back${still ? " at once" : ` within ${BACK_MS}ms`}`, goneAt < 0 ? "the toast never went" : back ? `back at +${Math.round(backMs)}ms` : "not back");
  if (undo) {
    const hl = await page.evaluate((s) => document.querySelector(s)?.closest("[id^='v']")?.getAttribute("data-hl") ?? null, sel);
    say(hl !== "true", `${label}: Undo puts the verse as it was`, `data-hl ${hl}`);
  }
}

async function walkSize(browser, size, broken = null) {
  const w = `${size.width}px`;
  const o = await open(browser, size, {}, broken);
  try {
    await go(o.page, "/bible/john/1/");
    await o.page.waitForTimeout(3500);
    const motion = await o.page.evaluate(() => document.documentElement.dataset.motion);
    if (motion !== "full") {
      say(false, `${w}: Purify's motion is on`, `it was "${motion}"`);
      return;
    }
    await place(o, `${w}, John 1:5`, "#v5 [data-own-press]");
    if (broken) return;
    await place(o, `${w}, John 1:6, then Undo`, "#v6 [data-own-press]", { undo: true });

    await go(o.page, "/saints/john-chrysostom/homilies-on-1-thessalonians/");
    await o.page.waitForTimeout(3500);
    await place(o, `${w}, a work of St John Chrysostom`, "[data-own-press]");

    // The day's first reading, opened from the search's day: the day's readings bar at the foot.
    await go(o.page, "/discover/");
    await o.page.waitForTimeout(2000);
    await o.page.locator('[data-route-content] [data-search-door="all"]').first().tap();
    await o.page.waitForFunction(() => !!document.querySelector("[data-search-day] [data-search-day-row]"), null, { timeout: 15000 }).catch(() => {});
    await o.page.waitForTimeout(800);
    await o.page.locator("[data-search-day] [data-search-day-row]").first().tap();
    await o.page.waitForFunction(() => location.hash.startsWith("#v"), null, { timeout: 15000 }).catch(() => {});
    await o.page.waitForTimeout(3000);
    const verse = await o.page.evaluate(() => location.hash);
    await place(o, `${w}, the day's first reading (${verse})`, `${verse} [data-own-press]`);
  } finally {
    await o.ctx.close();
  }
}

async function walkStill(browser) {
  const o = await open(browser, SIZES[0], { "purify.motion": "off" });
  try {
    await go(o.page, "/bible/john/1/");
    await o.page.waitForTimeout(3500);
    const motion = await o.page.evaluate(() => document.documentElement.dataset.motion);
    if (motion !== "reduce") {
      say(false, "with Purify's motion off", `it was "${motion}"`);
      return;
    }
    await place(o, "with Purify's motion off, John 1:5", "#v5 [data-own-press]", { still: true });
  } finally {
    await o.ctx.close();
  }
}

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
try {
  if (SELF_TEST) {
    const before = { failed, passed };
    console.log(`-- broken on purpose: ${NO_STEP}`);
    await walkSize(browser, SIZES[0], NO_STEP);
    const caught = failed - before.failed;
    failed = before.failed;
    passed = before.passed;
    console.log("");
    say(caught >= 1, "self-test: with the step aside taken off (the toast over the pill, as on build 96), the walk fails it", `${caught} fail${caught === 1 ? "" : "s"}`);
  } else {
    for (const size of SIZES) await walkSize(browser, size);
    await walkStill(browser);
  }
} finally {
  await browser.close();
}

console.log(`\n${passed} as they should be; ${failed} not`);
process.exit(failed ? 1 : 0);
