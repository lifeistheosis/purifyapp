#!/usr/bin/env node
// Build 98 note 2, walked as a reader: every text read aloud listens as the Bible does.
//
//   node scripts/gate/listen-walk.mjs <export> [--size 390x844] [--lang ar] [--check] [--shots dir] [--only life,work]
//
// His words (2026-11-15): "make the listen system the same as the Bible listening system (UI/ux)
// one so there isn't a floating button". On a life, an event, a study's part, a Father's work and
// a council's section, with a touch screen, as the phone's shell serves the export:
//
//  - at rest: Listen stands in the foot pill, none in the page, one bar at the foot;
//  - Listen tapped (the phone's voice, a stand-in here: headless Chromium has none): the dock, the
//    mini player stepped aside, one bar; Pause and Play from the dock;
//  - a scroll down: the dock draws in, and on a life and an event the tab bar steps away as on the
//    Bible; a scroll up brings both back;
//  - a work and a council: the dock's arrow turns the part (the name follows);
//  - the tap on Listen and the dock's turn are recorded frame by frame and judged as the motion
//    walk judges a tap (scripts/gate/frames.mjs: no cut, no blank, no box that jumps);
//  - --check: checkMock with pixels at rest and while playing, on every palette and look.
//
// A recording is the export's own bell, served for the recordings' host, so nothing asks the network.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

import { checkMock, EVERY, printMockCheck } from "../mock-check.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { firstTouch, tapAt } from "../lib/tap.mjs";
import { judgeFrames, recordFrames } from "./frames.mjs";
import { installGate } from "./inpage.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const has = (name) => {
  const at = argv.indexOf(name);
  if (at >= 0) argv.splice(at, 1);
  return at >= 0;
};
const [WIDTH, HEIGHT] = (flag("--size") ?? "390x844").split("x").map(Number);
const LANG = flag("--lang") ?? "en";
const SHOTS = flag("--shots");
const ONLY = flag("--only")?.split(",") ?? null;
const CHECK = has("--check");
const OUT = path.resolve(argv[0] ?? "out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

/** The five texts: where each is, and whether its parts turn from the dock. */
const TEXTS = [
  { key: "life", to: "/saints/athanasius-the-great/", screen: true },
  { key: "event", to: "/history/arian-controversy-begins/", screen: true },
  { key: "study", to: "/theology/essence-energies/read/", turns: true },
  { key: "work", to: "/saints/athanasius-the-great/on-the-incarnation/", turns: true },
  { key: "council", to: "/councils/nicaea-325/the-creed-of-nicaea/", turns: true, fallback: "/councils/nicaea-325/" },
].filter((t) => !ONLY || ONLY.includes(t.key));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RECORD = { width: WIDTH, height: HEIGHT, minMs: 900, stillMs: 450, maxMs: 2600 };

/**
 * A phone's voice for the walk: one local voice, and an utterance that starts at once, says a word
 * every 300ms and ends after a minute, so Listen plays as a phone's voice would.
 */
function fakeVoice() {
  const voice = { voiceURI: "walk-voice", name: "Walk", lang: navigator.language || "en-US", localService: true, default: true };
  let timers = [];
  class Utterance {
    constructor(text) {
      this.text = text;
      this.voice = null;
      this.lang = "";
      this.rate = 1;
      this.volume = 1;
    }
  }
  const synth = new EventTarget();
  Object.assign(synth, {
    speaking: false,
    paused: false,
    pending: false,
    getVoices: () => [voice],
    speak(u) {
      timers.push(setTimeout(() => u.onstart?.({}), 30));
      for (let i = 1; i < 200; i++) timers.push(setTimeout(() => u.onboundary?.({ name: "word", charIndex: Math.min(i * 6, Math.max(0, u.text.length - 1)), charLength: 5 }), 30 + i * 300));
      timers.push(setTimeout(() => u.onend?.({}), 60000));
      synth.speaking = true;
    },
    cancel() {
      for (const t of timers) clearTimeout(t);
      timers = [];
      synth.speaking = false;
    },
    pause() {
      synth.paused = true;
    },
    resume() {
      synth.paused = false;
    },
  });
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
}

/** What stands at the foot and in the page, as a reader sees it. */
const state = (page) =>
  page.evaluate(() => {
    const shown = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.05 && r.height > 0 && r.width > 0 && r.bottom > 0 && r.top < innerHeight;
    };
    const visible = (sel) => [...document.querySelectorAll(sel)].filter(shown);
    const dock = document.querySelector("[data-reader-dock] .reader-dock");
    const bar = document.querySelector("[data-tab-bar]");
    const barBox = bar?.getBoundingClientRect();
    const toggle = [...document.querySelectorAll("[data-reader-dock] .reader-dock-card button, [data-reader-dock] .reader-dock-pill button")].filter(shown).find((b) => /^(Pause|Play|إيقاف|تشغيل)/.test(b.getAttribute("aria-label") ?? "") || b.querySelector("svg"));
    const rowName = document.querySelector("[data-reader-dock] .reader-dock-card .font-semibold.text-paper span, [data-reader-dock] .reader-dock-card span.font-semibold");
    return {
      url: location.pathname,
      pill: visible("[data-reader-pill]").length,
      listenInPill: visible("[data-reader-pill] [data-listen-pill]").length,
      listenInPage: visible("[data-listen-here]").length,
      dock: visible("[data-reader-dock]").length && dock && shown(dock) ? 1 : 0,
      mini: visible("[data-mini-player] .mini-player").length,
      foot: [...visible("[data-reader-pill]").map(() => "pill"), ...visible("[data-mini-player] .mini-player").map(() => "mini player"), ...(dock && shown(dock) ? ["dock"] : [])],
      away: document.body.hasAttribute("data-reader-away"),
      screen: document.body.hasAttribute("data-reader-screen"),
      dockWidth: dock ? Math.round(dock.getBoundingClientRect().width) : null,
      tabBarShown: barBox ? Math.max(0, Math.round(Math.min(innerHeight, barBox.bottom) - Math.max(0, barBox.top))) : null,
      dockName: rowName?.textContent?.trim() ?? null,
      dockSlot: [...document.querySelectorAll("[data-reader-dock] .reader-dock-card .ms-auto button")].map((b) => b.textContent?.trim() || b.getAttribute("aria-label")),
      playing: [...document.querySelectorAll("[data-reader-dock] .reader-dock-card button")].some((b) => /Pause/i.test(b.getAttribute("aria-label") ?? "")),
      toggleLabel: toggle?.getAttribute("aria-label") ?? null,
      dir: document.documentElement.dir,
    };
  });

const centreOf = (page, find) => page.evaluate(find);
const box = (sel, pick = "first") =>
  `(() => { const all = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0 && getComputedStyle(e).visibility !== "hidden"; }); const el = ${pick === "last" ? "all[all.length - 1]" : "all[0]"}; const r = el?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`;

async function scrollBy(page, cdp, dy) {
  // A finger's drag, in steps, as a reader's scroll: the scroll watchers read the page's scroll.
  const x = WIDTH / 2;
  const y0 = dy > 0 ? HEIGHT * 0.7 : HEIGHT * 0.3;
  await cdp.send("Input.synthesizeScrollGesture", { x, y: y0, yDistance: -dy, speed: 1200, gestureSourceType: "touch", repeatCount: 1 });
  await sleep(900);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--autoplay-policy=no-user-gesture-required"] });
const results = [];
let failed = 0;
for (const text of TEXTS) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: WIDTH < 700, hasTouch: true, userAgent: NATIVE_UA, locale: LANG === "ar" ? "ar" : "en-US" });
  await ctx.addInitScript((lang) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      if (lang !== "en") localStorage.setItem("CapacitorStorage.purify_locale", lang);
    } catch {}
  }, LANG);
  await ctx.addInitScript(fakeVoice);
  await installGate(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  const bell = fs.readFileSync(path.join(OUT, "audio/ambience/bell.mp3"));
  await ctx.route("https://audio.purifyapp.net/**/*.mp3", (r) => r.fulfill({ status: 200, contentType: "audio/mpeg", body: bell }));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  const cdp = await ctx.newCDPSession(page);
  const r = { key: text.key, to: text.to, fails: [], steps: {} };
  const fail = (what) => {
    r.fails.push(what);
  };
  const shot = async (name) => {
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${text.key}-${name}-${WIDTH}${LANG === "en" ? "" : `-${LANG}`}.png`) });
  };
  const judge = async (name, act) => {
    const rec = await recordFrames(page, cdp, act, RECORD);
    const v = await judgeFrames(rec, { motion: "on" });
    r.steps[`${name}:motion`] = v.fails.length ? v.fails.map((f) => `${f.kind}: ${f.detail}`) : "ok";
    if (v.fails.length) fail(`${name}: ${v.fails.map((f) => f.kind).join(", ")}`);
  };
  try {
    await go(page, text.to, { timeout: 45000 });
    await sleep(2000);
    if (text.fallback && !(await page.evaluate(() => document.querySelector("[data-reader-pill], [data-reader-dock]")))) {
      r.to = text.fallback;
      await go(page, text.fallback, { timeout: 45000 });
      await sleep(2000);
    }
    await firstTouch(page, cdp);
    await sleep(300);
    const rest = await state(page);
    r.steps.rest = rest;
    if (rest.pill !== 1) fail(`at rest ${rest.pill} pills`);
    if (rest.listenInPill !== 1) fail("at rest no Listen in the pill");
    if (rest.listenInPage) fail(`at rest ${rest.listenInPage} Listen in the page`);
    if (rest.foot.length !== 1) fail(`at rest the foot shows ${rest.foot.join(" and ") || "nothing"}`);
    await shot("rest");
    if (CHECK) {
      const c = await checkMock(page, "body", { pixels: true, palettes: EVERY });
      r.steps.restCheck = printMockCheck(c, `${text.key} at rest ${WIDTH}${LANG === "en" ? "" : ` ${LANG}`}`) ? "ok" : "FAILED";
      if (r.steps.restCheck !== "ok") fail("checkMock at rest");
    }
    // Listen, from the pill.
    const listen = await centreOf(page, box("[data-reader-pill] [data-listen-pill]"));
    if (!listen) throw new Error("no Listen in the pill to tap");
    await judge("listen", () => tapAt(cdp, listen.x, listen.y));
    await sleep(1200);
    const playing = await state(page);
    r.steps.playing = playing;
    if (playing.dock !== 1) fail("playing: no dock");
    if (playing.mini) fail("playing: the mini player shows");
    if (playing.pill) fail("playing: the pill still shows");
    if (playing.foot.length !== 1) fail(`playing: the foot shows ${playing.foot.join(" and ") || "nothing"}`);
    if (playing.listenInPage) fail("playing: Listen in the page");
    if (!playing.playing) fail("playing: the dock offers Play, not Pause");
    await shot("playing");
    if (CHECK) {
      const c = await checkMock(page, "body", { pixels: true, palettes: EVERY });
      r.steps.playingCheck = printMockCheck(c, `${text.key} playing ${WIDTH}${LANG === "en" ? "" : ` ${LANG}`}`) ? "ok" : "FAILED";
      if (r.steps.playingCheck !== "ok") fail("checkMock playing");
    }
    // Pause and Play from the dock's card.
    const toggle = await centreOf(page, box("[data-reader-dock] .reader-dock-card button.bg-paper"));
    if (toggle) {
      await tapAt(cdp, toggle.x, toggle.y);
      await sleep(700);
      const paused = await state(page);
      await tapAt(cdp, toggle.x, toggle.y);
      await sleep(700);
      const again = await state(page);
      r.steps.pausePlay = { paused: !paused.playing, playsAgain: again.playing };
      if (paused.playing || !again.playing) fail("Pause and Play from the dock");
    } else fail("no Play or Pause on the dock");
    // A part turned from the dock.
    if (text.turns) {
      const before = await state(page);
      const nextArrow = await centreOf(page, box("[data-reader-dock] .reader-dock-card button[aria-label], [data-reader-dock] .reader-dock-card a[aria-label]", "first"));
      const arrows = await page.evaluate(() => [...document.querySelectorAll("[data-reader-dock] .reader-dock-card .hit-44.size-8")].map((e) => ({ tag: e.tagName, label: e.getAttribute("aria-label"), box: (() => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })() })));
      const next = arrows.filter((a) => a.tag === "BUTTON" || a.tag === "A").at(-1);
      if (next && nextArrow) {
        await judge("turn", () => tapAt(cdp, next.box.x, next.box.y));
        await sleep(900);
        const after = await state(page);
        r.steps.turn = { from: before.dockName, to: after.dockName, foot: after.foot };
        if (before.dockName === after.dockName) fail("the dock's arrow did not turn the part");
        if (after.foot.length !== 1) fail(`after the turn the foot shows ${after.foot.join(" and ") || "nothing"}`);
      } else fail("no arrow on the dock");
    }
    // Reading on: the dock draws in (and on a life and an event the tab bar steps away); back on a scroll up.
    const atRestWidth = (await state(page)).dockWidth;
    await scrollBy(page, cdp, 700);
    const down = await state(page);
    await shot("away");
    await scrollBy(page, cdp, -260);
    const up = await state(page);
    r.steps.scroll = { atRestWidth, away: down.away, awayWidth: down.dockWidth, tabBarAway: down.tabBarShown, back: !up.away, backWidth: up.dockWidth, tabBarBack: up.tabBarShown, screen: down.screen };
    if (!down.screen) fail("not a reader's screen");
    if (!down.away) fail("a scroll down did not draw the dock in");
    if (down.dockWidth !== null && atRestWidth !== null && down.dockWidth >= atRestWidth) fail("the dock did not draw in");
    if (down.tabBarShown) fail(`the tab bar stayed (${down.tabBarShown}px) on a scroll down`);
    if (up.away) fail("a scroll up did not bring the dock back");
    if (!up.tabBarShown) fail("the tab bar did not come back on a scroll up");
  } catch (e) {
    fail(`stopped: ${String(e).slice(0, 240)}`);
  }
  if (errors.length) r.errors = errors;
  if (r.fails.length) failed += 1;
  results.push(r);
  console.log(`${r.fails.length ? "FAIL" : "ok  "} ${text.key} ${r.to}${r.fails.length ? `: ${r.fails.join("; ")}` : ""}`);
  console.log(`     ${JSON.stringify({ rest: r.steps.rest && { foot: r.steps.rest.foot, listenInPill: r.steps.rest.listenInPill, listenInPage: r.steps.rest.listenInPage }, playing: r.steps.playing && { foot: r.steps.playing.foot, slot: r.steps.playing.dockSlot, name: r.steps.playing.dockName }, pausePlay: r.steps.pausePlay, turn: r.steps.turn, scroll: r.steps.scroll, listenMotion: r.steps["listen:motion"], turnMotion: r.steps["turn:motion"], errors: r.errors })}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${TEXTS.length - failed} of ${TEXTS.length} texts as the Bible listens, at ${WIDTH} by ${HEIGHT}${LANG === "en" ? "" : ` in ${LANG}`}${CHECK ? ", checkMock with pixels on every palette and look" : ""}`);
process.exit(failed ? 1 : 0);
