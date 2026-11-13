// The one search arrives and leaves as a page does (build 95 note 5). His
// word, 2026-11-13, on build 96: "pressing the search created a weird visual
// bug and isn't smooth when transitioning to that acreen". Filmed on that
// build's export at 390 and 412 with touch and motion on, the frame after
// the tap on Discover's field was an empty dark screen with only the field at
// its foot (the screen drawn whole in the tap's frame, its words alone fading
// in), and the screen left by a cut. lib/search/__tests__/searchMotion.test.ts
// holds the source; this watches the built app do it, every frame.
//
//   npm run build:android                       (writes out/)
//   node scripts/search-motion-walk.mjs         the walk
//   node scripts/search-motion-walk.mjs --self-test
//                                                proves it: with the screen's
//                                                fades taken off, it must fail
//
// At 390 and 412 (his phone's widths), Purify's motion on as on his phone, a
// real touch each time:
//   - opened from Discover's "Search Purify": the first frame the screen is
//     drawn, the page still shows through it (it covers the page as a page
//     leaves, not by a cut); it is whole within 600ms; its words come after
//     its ground;
//   - closed by the round plate: it fades (drawn, part seen) before it goes,
//     is gone within 600ms, and the tab bar is on its way back while it fades;
//   - a row of the day chosen: it fades as the page it opens arrives, rather
//     than cutting back to Discover first;
//   - and in none of the three do two pages of words read through each other
//     (the house's rule for a page switch, app/globals.css, "Every page
//     switch moves"): no frame shows both the search's words or field and
//     the page under it at more than a quarter of their ink.
// And once with Purify's motion off: there at once, and gone at once.
//
// --self-test walks 390 twice with the stylesheet broken on purpose: the
// screen's fades taken off (it must fail the cut in and the cut out), and
// the screen faded whole, words and all (it must fail the read-through).
//
// Exit 1 when anything fails.

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const SELF_TEST = process.argv.includes("--self-test");
const OUT = path.resolve("out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error("no native export in out/: run npm run build:android first");
// The browser the session carries, as the walks launch it (scripts/tap-walk.mjs); else Playwright's own.
const OWN = "/opt/pw-browsers/chromium";

const SIZES = [
  { width: 390, height: 844 },
  { width: 412, height: 915 },
];
/** Whole: the screen at full ink within this long of its first frame. */
const WHOLE_MS = 600;
/** Gone: no screen this long after the tap that closed it. */
const GONE_MS = 600;
/** Seen through: the first frame the screen is drawn, it lets at least half the page show. */
const CUT = 0.5;
/** Read through: the search's words and the page under both seen at more than this share of their ink. */
const THROUGH = 0.25;
/** A cut, for the self-test: the screen's fades taken off. */
const NO_FADES = ".search-screen, .search-screen[data-leaving] { animation: none !important; }";
/** Faded whole, for the self-test: the words and the field with the ground, both ways. */
const WHOLE_FADE = ".search-in, .search-screen[data-leaving] .search-in { animation: none !important; }";

let failed = 0;
let passed = 0;
/** What failed, by its kind, for the self-test. */
const kinds = [];
const say = (ok, name, detail, kind = "other") => {
  if (ok) passed += 1;
  else {
    failed += 1;
    kinds.push(kind);
  }
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

async function open(browser, size, set = {}, broken = null) {
  const ctx = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
    userAgent: NATIVE_UA,
    reducedMotion: "no-preference",
  });
  await ctx.addInitScript(
    (values) => {
      for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    },
    // A phone the speed check found quick, as his is: motion on (lib/ui/motionPrepaint.ts).
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
  return { ctx, page };
}

/**
 * Every frame from now: the screen drawn or not, its ink, the ink its words and field are seen at (its own
 * times theirs), the tab bar's, the address.
 */
const watch = (page) =>
  page.evaluate(() => {
    const op = (el) => (el ? Number(getComputedStyle(el).opacity) : null);
    const frames = (window.__searchMotion = []);
    const run = (window.__searchMotionRun = (window.__searchMotionRun ?? 0) + 1);
    const tick = () => {
      if (window.__searchMotionRun !== run) return;
      const s = document.querySelector("[data-search-screen]");
      frames.push({
        t: performance.now(),
        drawn: !!s,
        op: op(s),
        words: s ? op(s) * Math.max(op(s.querySelector("[data-search-body]")) ?? 0, op(s.querySelector("[data-search-dock]")) ?? 0) : null,
        tab: op(document.querySelector("[data-tab-bar]")),
        at: location.pathname,
      });
      if (frames.length < 600) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return performance.now();
  });
const frames = (page) => page.evaluate(() => window.__searchMotion ?? []);
/** The frame where the search's words and the page under read through each other most, if any does. */
const throughOf = (list) => {
  let worst = null;
  for (const f of list) {
    if (!f.drawn) continue;
    const both = Math.min(f.words, 1 - f.op);
    if (both > THROUGH && (!worst || both > worst.both)) worst = { ...f, both };
  }
  return worst;
};
const throughWords = (worst, from) =>
  worst ? `at +${Math.round(worst.t - from)}ms its words seen at ${worst.words.toFixed(2)} over the page at ${(1 - worst.op).toFixed(2)}` : `never both past ${THROUGH}`;
const now = (page) => page.evaluate(() => performance.now());
const two = (n) => (n === null || n === undefined ? "none" : n.toFixed(2));

async function toDiscover(page) {
  await go(page, "/discover/");
  await page.waitForFunction(() => !!document.querySelector('[data-route-content] [data-search-door="all"]'), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
}
const door = (page) => page.locator('[data-route-content] [data-search-door="all"]').first();

/** Opened from Discover's field; returns the frames from the tap. */
async function opening(page) {
  await watch(page);
  const tapped = await now(page);
  await door(page).tap();
  await page.waitForTimeout(1100);
  return (await frames(page)).filter((f) => f.t >= tapped);
}

async function walkSize(browser, size, broken = null) {
  const w = `${size.width}px`;
  const { ctx, page } = await open(browser, size, {}, broken);
  try {
    await toDiscover(page);
    const motion = await page.evaluate(() => document.documentElement.dataset.motion);
    if (motion !== "full") {
      say(false, `${w}: Purify's motion is on`, `it was "${motion}", so nothing here was tested`);
      return;
    }

    // Opened from Discover's field.
    const opened = await opening(page);
    const first = opened.find((f) => f.drawn);
    say(Boolean(first) && first.op < CUT, `${w}: Discover's field opens the search over the page, the page still showing through its first frame`, first ? `the screen at ${two(first.op)} in its first frame` : "never drawn", "cut");
    const whole = first ? opened.find((f) => f.drawn && f.op >= 0.99) : null;
    say(Boolean(whole) && whole.t - first.t <= WHOLE_MS, `${w}: and it is whole within ${WHOLE_MS}ms`, whole ? `whole at +${Math.round(whole.t - first.t)}ms` : "never whole");
    const read = first ? opened.find((f) => f.drawn && f.words >= 0.99) : null;
    say(Boolean(first) && first.words <= 0.05 && Boolean(read), `${w}: its words and its field come after its ground, and arrive`, first ? `seen at ${two(first.words)} in the first frame, whole ${read ? `at +${Math.round(read.t - first.t)}ms` : "never"}` : "never drawn", "through");
    const inThrough = throughOf(opened);
    say(!inThrough, `${w}: and its words and field never read through the page or the tab bar as it comes`, throughWords(inThrough, first?.t ?? 0), "through");

    // Closed by the round plate.
    await watch(page);
    const tapped = await now(page);
    await page.locator("[data-search-dock] button").first().tap();
    await page.waitForTimeout(1000);
    const closed = (await frames(page)).filter((f) => f.t >= tapped);
    const fading = closed.filter((f) => f.drawn && f.op > 0.01 && f.op < 0.99);
    const goneAt = closed.find((f) => !f.drawn);
    say(fading.length > 0, `${w}: the round plate closes it by a fade, not a cut`, `${fading.length} frame${fading.length === 1 ? "" : "s"} part seen${fading.length ? `, from ${two(fading[0].op)}` : ""}`, "cut");
    const outThrough = throughOf(closed);
    say(!outThrough, `${w}: and its words never read through the page as it goes`, throughWords(outThrough, tapped), "through");
    say(Boolean(goneAt) && goneAt.t - tapped <= GONE_MS, `${w}: and it is gone within ${GONE_MS}ms`, goneAt ? `gone at +${Math.round(goneAt.t - tapped)}ms` : "still there");
    const back = closed.find((f) => (f.tab ?? 0) > 0.05);
    say(Boolean(back) && Boolean(goneAt) && back.t < goneAt.t, `${w}: the tab bar is on its way back while it fades`, back ? `the bar at ${two(back.tab)} at +${Math.round(back.t - tapped)}ms, the screen gone at ${goneAt ? `+${Math.round(goneAt.t - tapped)}ms` : "never"}` : "the bar never came back");

    // A row of the day chosen: it leaves as the page it opens arrives.
    await opening(page);
    await page.waitForFunction(() => !!document.querySelector("[data-search-day] [data-search-day-row]"), null, { timeout: 15000 }).catch(() => {});
    const from = await page.evaluate(() => location.pathname);
    await watch(page);
    const chose = await now(page);
    await page.locator("[data-search-day] [data-search-day-row]").first().tap();
    await page.waitForTimeout(1500);
    const chosen = (await frames(page)).filter((f) => f.t >= chose);
    const left = chosen.filter((f) => f.drawn && f.op > 0.01 && f.op < 0.99);
    const away = chosen.find((f) => f.at !== from);
    const over = chosen.find((f) => !f.drawn);
    say(left.length > 0 && Boolean(away) && Boolean(over) && over.t - chose <= GONE_MS + 200, `${w}: a row of the day chosen, the search fades as its page comes, and goes`, `${left.length} frame${left.length === 1 ? "" : "s"} part seen; at ${away ? away.at : "the same page"}; gone ${over ? `at +${Math.round(over.t - chose)}ms` : "never"}`, "cut");
    const rowThrough = throughOf(chosen);
    say(!rowThrough, `${w}: and its words never read through the page that comes`, throughWords(rowThrough, chose), "through");
  } finally {
    await ctx.close();
  }
}

/** Purify's motion off: there at once, gone at once. */
async function walkStill(browser) {
  const { ctx, page } = await open(browser, SIZES[0], { "purify.motion": "off" });
  try {
    await toDiscover(page);
    const motion = await page.evaluate(() => document.documentElement.dataset.motion);
    if (motion !== "reduce") {
      say(false, "with Purify's motion off", `it was "${motion}", so nothing here was tested`);
      return;
    }
    const opened = await opening(page);
    const first = opened.find((f) => f.drawn);
    say(Boolean(first) && first.op >= 0.99, "with Purify's motion off, the search is there at once", first ? `the screen at ${two(first.op)} in its first frame` : "never drawn");
    await watch(page);
    const tapped = await now(page);
    await page.locator("[data-search-dock] button").first().tap();
    await page.waitForTimeout(600);
    const closed = (await frames(page)).filter((f) => f.t >= tapped);
    const seen = closed.filter((f) => f.drawn && f.op < 0.99);
    const goneAt = closed.find((f) => !f.drawn);
    say(seen.length === 0 && Boolean(goneAt) && goneAt.t - tapped <= 120, "and gone at once", `${seen.length} frames part seen; gone ${goneAt ? `at +${Math.round(goneAt.t - tapped)}ms` : "never"}`);
  } finally {
    await ctx.close();
  }
}

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
try {
  if (SELF_TEST) {
    // Broken on purpose, each must be caught; what the broken walks say is the proof, and is not counted.
    const cases = [
      { css: NO_FADES, kind: "cut", least: 3, name: "with the screen's fades taken off (it cut in and out on build 96), the walk fails the cut in and the cut out" },
      { css: WHOLE_FADE, kind: "through", least: 2, name: "with the screen faded whole, words and all, the walk fails the read-through, coming and going" },
    ];
    const results = [];
    for (const c of cases) {
      const before = { failed, passed, at: kinds.length };
      console.log(`\n-- broken on purpose: ${c.css}`);
      await walkSize(browser, SIZES[0], c.css);
      const caught = kinds.slice(before.at).filter((k) => k === c.kind).length;
      kinds.length = before.at;
      failed = before.failed;
      passed = before.passed;
      results.push([caught >= c.least, `self-test: ${c.name}`, `${caught} ${c.kind} fails`]);
    }
    console.log("");
    for (const r of results) say(...r);
  } else {
    for (const size of SIZES) await walkSize(browser, size);
    await walkStill(browser);
  }
} finally {
  await browser.close();
}

console.log(`\n${passed} as they should be; ${failed} not`);
process.exit(failed ? 1 : 0);
