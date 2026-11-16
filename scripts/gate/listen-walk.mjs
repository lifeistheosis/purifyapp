#!/usr/bin/env node
// Build 98 note 2, walked as a reader: every text read aloud listens as the Bible does.
//
//   node scripts/gate/listen-walk.mjs <export> [--size 390x844] [--lang ar] [--check] [--shots dir] [--only life,work]
//   node scripts/gate/listen-walk.mjs <export> --computer    (the computer as it was: Listen in the page, the mini player)
//   node scripts/gate/listen-walk.mjs <export> --carry [--reduce]   (the dock's cover tapped: Now Playing carries it up; never with motion reduced)
//   node scripts/gate/listen-walk.mjs <export> --only work --words [--cpu 4] [--trace dir]   (Now Playing on a long text: opened
//   on Cover from the dock, then Words, then put away and opened again, each judged and counted; Updates 98n, build 98 note 2)
//   node scripts/gate/listen-walk.mjs <export> --only bible --transport [--lang ar]   (Now Playing's transport row tapped as a
//   reader taps it, each button said to do what it names, read from the player's own recording; Updates 98n)
//   --trace <dir>: a Chrome trace of the Listen tap and of the dock's turn, each from the tap, for
//   scripts/gate/trace-frames.mjs (Updates 98k: the work's 117ms task while its page glides to the reading)
//   (--why adds what made each restyle: scripts/gate/trace-restyles.mjs reads it; --roots prints every write on
//   <html> and <body>; --block-class a,b never adds those classes to <html>, to bisect a restyle; Updates 98l)
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
import { fakeVoice } from "../lib/fake-voice.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { firstTouch, tapAt } from "../lib/tap.mjs";
import { judgeFrames, recordFrames, stripOf } from "./frames.mjs";
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
const [WIDTH, HEIGHT] = (flag("--size") ?? (argv.includes("--computer") ? "1280x900" : "390x844")).split("x").map(Number);
const LANG = flag("--lang") ?? "en";
const SHOTS = flag("--shots");
const TRACE = flag("--trace");
// --why: with --trace, what made each restyle (the invalidation tracking DevTools draws), at a cost to the times.
const WHY = has("--why");
// --roots: every class and inline style written on <html> and <body> in each judged moment, in order, from the tap
// (what every element inherits changes there; a MutationObserver, which forces no style).
const ROOTS = has("--roots");
// --block-class a,b: a diagnosis: these classes are never added to <html>, to find which one restyles every element.
const BLOCK = flag("--block-class")?.split(",") ?? null;
const ONLY = flag("--only")?.split(",") ?? null;
const CHECK = has("--check");
const COMPUTER = has("--computer");
const CARRY = has("--carry");
const REDUCE = has("--reduce");
// --words: Now Playing's views on a long text (Updates 98n): how many elements its words are, and when they are built.
const WORDS = has("--words");
const CPU = Number(flag("--cpu") ?? 1);
// --slow <rate>: every animation at this rate (DevTools' own playback rate), a diagnosis: a transition the container's
// software compositor draws too few frames of at a large size is caught at more of its steps (Updates 98n).
const SLOW = Number(flag("--slow") ?? 1);
// --transport: Now Playing's row tapped, button by button (Updates 98n; 98l set its order in Arabic and did not tap it).
const TRANSPORT = has("--transport");
const DESKTOP_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const OUT = path.resolve(argv[0] ?? "out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

/** The five texts: where each is, and whether its parts turn from the dock. */
const TEXTS = [
  { key: "life", to: "/saints/athanasius-the-great/", screen: true },
  { key: "event", to: "/history/arian-controversy-begins/", screen: true },
  { key: "study", to: "/theology/essence-energies/read/", turns: true },
  { key: "work", to: "/saints/athanasius-the-great/four-discourses-against-the-arians/", turns: true },
  { key: "council", to: "/councils/first-nicaea/the-twenty-canons/", turns: true, fallback: "/councils/first-nicaea/the-symbol-of-the-faith/" },
  // A chapter, for --carry: the texts above have no cover picture (the plate is drawn), so nothing can fly from them.
  ...(CARRY || TRANSPORT ? [{ key: "bible", to: "/bible/john/10/" }] : []),
].filter((t) => !ONLY || ONLY.includes(t.key));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RECORD = { width: WIDTH, height: HEIGHT, minMs: 900, stillMs: 450, maxMs: 2600 };

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
      tabBarShown: bar && shown(bar) && barBox ? Math.max(0, Math.round(Math.min(innerHeight, barBox.bottom) - Math.max(0, barBox.top))) : 0,
      dockName: rowName?.textContent?.trim() ?? null,
      dockSlot: [...document.querySelectorAll("[data-reader-dock] .reader-dock-card .ms-auto button")].map((b) => b.textContent?.trim() || b.getAttribute("aria-label")),
      // The dock's word for it in English; in another language, whether the voice or the recording plays.
      playing: /^en/.test(document.documentElement.lang || "en")
        ? [...document.querySelectorAll("[data-reader-dock] .reader-dock-card button")].some((b) => /Pause/i.test(b.getAttribute("aria-label") ?? ""))
        : !!(window.speechSynthesis?.speaking && !window.speechSynthesis.paused) || [...document.querySelectorAll("audio")].some((a) => !a.paused),
      toggleLabel: toggle?.getAttribute("aria-label") ?? null,
      dir: document.documentElement.dir,
    };
  });

const centreOf = (page, find) => page.evaluate(find);
const box = (sel, pick = "first") =>
  `(() => { const all = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0 && getComputedStyle(e).visibility !== "hidden"; }); const el = ${pick === "last" ? "all[all.length - 1]" : "all[0]"}; const r = el?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`;

async function scrollBy(page, cdp, dy) {
  // A finger's drag, as a reader's: touch events the scroll watchers hear (lib/ui/scrollAway.ts counts
  // a scroll as the reader's only after a hand on the glass), in steps, so the page scrolls with it.
  const x = Math.round(WIDTH / 2);
  let y = Math.round(dy > 0 ? HEIGHT * 0.75 : HEIGHT * 0.3);
  const steps = 12;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 0; i < steps; i++) {
    y -= dy / steps / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: Math.round(y) }] });
    await sleep(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  // And the rest of the way, as the page's fling would carry it, while the hand is still counted.
  await page.evaluate((d) => window.scrollBy(0, d / 2), dy);
  await sleep(900);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--autoplay-policy=no-user-gesture-required"] });
const results = [];
let failed = 0;
for (const text of TEXTS) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: !COMPUTER && WIDTH < 700, hasTouch: !COMPUTER, userAgent: COMPUTER ? DESKTOP_UA : NATIVE_UA, locale: LANG === "ar" ? "ar" : "en-US", reducedMotion: REDUCE ? "reduce" : "no-preference" });
  await ctx.addInitScript(([lang, reduce]) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      if (lang !== "en") localStorage.setItem("CapacitorStorage.purify_locale", lang);
      // In the apps the OS setting is not Purify's (lib/ui/motionPreference.ts): motion off is its own switch.
      if (reduce) localStorage.setItem("purify.motion", "off");
    } catch {}
  }, [LANG, REDUCE]);
  await ctx.addInitScript(fakeVoice);
  if (BLOCK)
    await ctx.addInitScript((names) => {
      const add = DOMTokenList.prototype.add;
      DOMTokenList.prototype.add = function (...tokens) {
        const root = document.documentElement;
        return add.apply(this, root && this === root.classList ? tokens.filter((t) => !names.includes(t)) : tokens);
      };
    }, BLOCK);
  if (ROOTS)
    await ctx.addInitScript(() => {
      window.__roots = [];
      // The document is empty when this runs: both roots are watched once the page is parsed.
      document.addEventListener("DOMContentLoaded", () => {
        for (const el of [document.documentElement, document.body])
          new MutationObserver((list) => {
            for (const m of list) window.__roots.push([performance.now(), el.nodeName, m.attributeName, m.oldValue ?? "", el.getAttribute(m.attributeName) ?? ""]);
          }).observe(el, { attributes: true, attributeOldValue: true });
      });
    });
  await installGate(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  const bell = fs.readFileSync(path.join(OUT, "audio/ambience/bell.mp3"));
  await ctx.route("https://audio.purifyapp.net/**/*.mp3", (r) => r.fulfill({ status: 200, contentType: "audio/mpeg", body: bell }));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  const cdp = await ctx.newCDPSession(page);
  if (CPU > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  if (SLOW !== 1) {
    await cdp.send("Animation.enable");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: SLOW });
  }
  const r = { key: text.key, to: text.to, fails: [], steps: {} };
  const fail = (what) => {
    r.fails.push(what);
  };
  const shot = async (name) => {
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${text.key}-${name}-${WIDTH}${LANG === "en" ? "" : `-${LANG}`}.png`) });
  };
  const judge = async (name, act) => {
    // --trace: the moment in a Chrome trace of its own, from the tap (marked "tap").
    const traced = TRACE
      ? async () => {
          fs.mkdirSync(TRACE, { recursive: true });
          await browser.startTracing(page, { path: path.join(TRACE, `${text.key}-${name}-${WIDTH}${LANG === "en" ? "" : `-${LANG}`}.json`), categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame", "blink", "cc", "gpu", "viz", "v8.execute", "blink.user_timing", "latencyInfo", ...(WHY ? ["disabled-by-default-devtools.timeline.invalidationTracking"] : [])] });
          await page.evaluate(() => performance.mark("tap"));
          return act();
        }
      : act;
    const since = ROOTS ? await page.evaluate(() => performance.now()) : 0;
    const rec = await recordFrames(page, cdp, traced, RECORD).finally(() => (TRACE ? browser.stopTracing() : null));
    if (ROOTS) {
      const writes = await page.evaluate((t) => window.__roots.filter((w) => w[0] >= t), since);
      const now = await page.evaluate(() => ({ classes: document.documentElement.className, room: getComputedStyle(document.documentElement).getPropertyValue("--now-playing-h") }));
      console.log(`  ${text.key} ${name}: ${writes.length} writes on <html> and <body>; after: ${now.classes.split(" ").filter((c) => !c.includes("_")).join(" ")}, --now-playing-h ${now.room}`);
      for (const [at, node, attr, was, now] of writes) {
        if (attr === "class") {
          const a = new Set(was.split(/\s+/).filter(Boolean));
          const b = new Set(now.split(/\s+/).filter(Boolean));
          console.log(`    ${Math.round(at - since)}ms ${node} class ${[...b].filter((c) => !a.has(c)).map((c) => `+${c}`).concat([...a].filter((c) => !b.has(c)).map((c) => `-${c}`)).join(" ")}`);
        } else console.log(`    ${Math.round(at - since)}ms ${node} ${attr}: ${was.slice(-160)} -> ${now.slice(-160)}`);
      }
    }
    const v = await judgeFrames(rec, { motion: "on" });
    // With --shots, each fail's frames side by side, to see what was drawn.
    if (SHOTS) for (const [n, f] of v.fails.entries()) if (f.frames) await stripOf(rec, f.frames, path.join(SHOTS, `${text.key}-${name}-${f.kind}-${n}-${WIDTH}.png`));
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
    if (COMPUTER) {
      // The computer as it was: Listen in the page under the title, no pill, and while it plays the mini player.
      // On an event it stands under the picture, below the first screen: brought into view as a reader scrolls to it.
      await page.evaluate(() => document.querySelector("[data-listen-here]")?.scrollIntoView({ block: "center" }));
      await sleep(900);
      const before = await state(page);
      r.steps.rest = before;
      if (before.listenInPage !== 1) fail(`the computer shows ${before.listenInPage} Listen in the page`);
      if (before.pill || before.dock) fail("the computer shows the pill or the dock");
      const here = await centreOf(page, box("[data-listen-here]"));
      if (here) await page.mouse.click(here.x, here.y);
      await sleep(1800);
      const after = await state(page);
      r.steps.playing = after;
      if (after.dock || after.pill) fail("playing on the computer: the pill or the dock");
      if (after.mini !== 1) fail(`playing on the computer: ${after.mini} mini players`);
      throw Object.assign(new Error("done"), { done: true });
    }
    await firstTouch(page, cdp);
    await sleep(300);
    const rest = await state(page);
    r.steps.rest = rest;
    if (rest.pill !== 1) fail(`at rest ${rest.pill} pills`);
    if (rest.listenInPill !== 1 && !CARRY && !TRANSPORT) fail("at rest no Listen in the pill");
    if (rest.listenInPage) fail(`at rest ${rest.listenInPage} Listen in the page`);
    if (rest.foot.length !== 1) fail(`at rest the foot shows ${rest.foot.join(" and ") || "nothing"}`);
    await shot("rest");
    if (CARRY) {
      // The dock's cover tapped, as a reader taps: Now Playing carries it up into its own cover
      // (lib/player/carry.ts), as from the mini player; with motion reduced it rises with nothing flying.
      const at =
        (await centreOf(page, box("[data-reader-pill] [data-listen-pill]"))) ??
        (await page.evaluate(() => {
          const b = [...document.querySelectorAll("[data-reader-pill] button")].find((e) => /^Listen/.test(e.textContent?.trim() ?? ""))?.getBoundingClientRect();
          return b ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null;
        }));
      if (!at) throw new Error("no Listen in the pill to tap");
      await tapAt(cdp, at.x, at.y);
      await sleep(2500);
      const cover = await page.evaluate(() => {
        const b = document.querySelector("[data-reader-dock] .reader-dock-card button")?.querySelector("img")?.getBoundingClientRect();
        return b ? { width: Math.round(b.width), left: Math.round(b.left), top: Math.round(b.top) } : null;
      });
      const open = await centreOf(page, box("[data-reader-dock] .reader-dock-card button"));
      if (!cover || !open) throw new Error("no cover on the dock to tap");
      await tapAt(cdp, open.x, open.y);
      const seen = [];
      for (const wait of [40, 120, 400, 900]) {
        await sleep(wait - (seen.at(-1)?.t ?? 0));
        seen.push({
          t: wait,
          ...(await page.evaluate(() => {
            const root = document.querySelector("[data-now-playing]");
            const flight = root?.querySelector(":scope div.fixed.origin-top-left[aria-hidden]");
            const first = flight?.getAnimations()[0]?.effect?.getKeyframes()[0]?.transform ?? null;
            return { carrying: !!root?.hasAttribute("data-carrying"), flying: !!flight && flight.style.display === "block", first, up: root?.getAttribute("aria-modal") === "true" };
          })),
        });
      }
      r.steps.carry = { reduce: REDUCE, cover, seen };
      const carried = seen.some((v) => v.carrying || v.flying);
      if (!seen.at(-1).up) fail("Now Playing did not open from the dock's cover");
      if (REDUCE && carried) fail("the cover flew with motion reduced");
      if (!REDUCE && !carried) fail("Now Playing did not carry the dock's cover");
      const scale = /scale\(([\d.]+)/.exec(seen.find((v) => v.first)?.first ?? "")?.[1];
      if (!REDUCE && scale) r.steps.carry.scale = Number(scale);
      throw Object.assign(new Error("done"), { done: true });
    }
    if (WORDS) {
      // Now Playing on a long text (build 98 note 2, Updates 98n): its words are built only when the Words
      // view is shown, and a line's words are spans only near the line being read, so neither the opening
      // on Cover nor the switch to Words carries a long task. Each moment judged frame by frame (and traced
      // with --trace); the sheet's elements counted after each.
      const listenAt = await centreOf(page, box("[data-reader-pill] [data-listen-pill]"));
      if (!listenAt) throw new Error("no Listen in the pill to tap");
      await tapAt(cdp, listenAt.x, listenAt.y);
      await sleep(2500);
      const count = () =>
        page.evaluate(() => {
          const root = document.querySelector("[data-now-playing]");
          const words = document.getElementById("player-view-panel-words");
          return {
            sheet: root?.querySelectorAll("*").length ?? 0,
            words: words?.querySelectorAll("*").length ?? 0,
            lines: words?.querySelectorAll("li[data-sung]").length ?? 0,
            up: root?.getAttribute("aria-modal") === "true",
            view: document.querySelector('#player-view-tab-words[aria-selected="true"]') ? "words" : "cover",
          };
        });
      const tapSel = async (sel, what) => {
        const at = await centreOf(page, box(sel));
        if (!at) throw new Error(`no ${what} to tap`);
        return tapAt(cdp, at.x, at.y);
      };
      r.steps.words = { closed: await count() };
      const moment = async (name, sel, what) => {
        await judge(name, () => tapSel(sel, what));
        await sleep(1500);
        const after = await count();
        r.steps.words[name] = after;
        return after;
      };
      const opened = await moment("open", "[data-reader-dock] .reader-dock-card button", "cover on the dock");
      if (!opened.up) fail("Now Playing did not open from the dock");
      if (opened.view !== "cover") fail(`Now Playing opened on ${opened.view}, not Cover`);
      if (opened.lines) fail(`a long text's words were built on Cover (${opened.words} elements)`);
      const shown = await moment("words", "#player-view-tab-words", "Words in the switch");
      if (shown.view !== "words") fail("Words did not show");
      if (!shown.lines) fail("Words shows no lines");
      await moment("close", '[data-now-playing] button[aria-label="Close"]', "Close");
      await moment("reopen", "[data-reader-dock] .reader-dock-card button", "cover on the dock");
      throw Object.assign(new Error("done"), { done: true });
    }
    if (TRANSPORT) {
      // Listen, then Now Playing from the dock's cover, then each button of its transport row tapped as a
      // reader taps it, read from the recording itself: where it stands, whether it plays, which it is.
      // The Bible's pill draws its Listen with the word alone: found by the app's own word for it.
      const word = JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${LANG}.json`), "utf8"))["readAloud.listen"];
      const listenAt =
        (await centreOf(page, box("[data-reader-pill] [data-listen-pill]"))) ??
        (await page.evaluate((w) => {
          const b = [...document.querySelectorAll("[data-reader-pill] button")].find((e) => e.textContent?.trim() === w)?.getBoundingClientRect();
          return b ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null;
        }, word));
      if (!listenAt) throw new Error("no Listen in the pill to tap");
      await tapAt(cdp, listenAt.x, listenAt.y);
      await sleep(2500);
      const openAt = await centreOf(page, box("[data-reader-dock] .reader-dock-card button"));
      if (!openAt) throw new Error("no cover on the dock to tap");
      await tapAt(cdp, openAt.x, openAt.y);
      await sleep(1500);
      // The player as it stands, a recording or the voice alike: its own position slider, what its toggle offers
      // (Play while paused), and whether a recording or the voice sounds.
      const playWord = JSON.parse(fs.readFileSync(path.resolve(`lib/i18n/messages/${LANG}.json`), "utf8"))["prayers.play"];
      const heard = () =>
        page.evaluate((playWord) => {
          const root = document.querySelector("[data-now-playing]");
          const slider = root?.querySelector("[role='slider']");
          const offers = [...(root?.querySelectorAll("div[dir='ltr'] > button") ?? [])].map((b) => b.getAttribute("aria-label")).find((l) => l === playWord) ? "play" : "pause";
          const a = [...document.querySelectorAll("audio")].find((e) => !e.paused);
          const voice = !!(window.speechSynthesis?.speaking && !window.speechSynthesis.paused);
          return { t: Math.round(Number(slider?.getAttribute("aria-valuenow") ?? NaN) * 10) / 10, paused: offers === "play", sounding: !!a || voice, src: root?.querySelector("h2")?.textContent?.trim() ?? null, title: root?.querySelector("h2")?.textContent?.trim() ?? null };
        }, playWord);
      const row = () =>
        page.evaluate(() => {
          const rows = [...document.querySelectorAll("[data-now-playing] div[dir='ltr']")].filter((d) => d.querySelectorAll(":scope > button").length >= 3);
          const el = rows[0];
          return el
            ? { dir: getComputedStyle(el).direction, buttons: [...el.querySelectorAll(":scope > button")].map((b) => { const r = b.getBoundingClientRect(); return { label: b.getAttribute("aria-label"), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }).sort((a, b) => a.x - b.x) }
            : null;
        });
      const first = await row();
      if (!first || first.buttons.length < 3) throw new Error("no transport row in Now Playing");
      r.steps.transport = { lang: LANG, page: await page.evaluate(() => document.documentElement.dir), order: first.buttons.map((b) => b.label), taps: [] };
      const at = (i) => first.buttons[i];
      const n = first.buttons.length;
      // previous? back 15, play or pause, forward 15, next?: by place, the toggle the middle one.
      const mid = first.buttons.findIndex((b, i) => i > 0 && i < n - 1 && first.buttons[i - 1] && first.buttons[i + 1] && Math.abs(b.x - (first.buttons[0].x + first.buttons[n - 1].x) / 2) < 30);
      if (mid < 1) throw new Error(`no middle button in the row (${first.buttons.map((b) => b.label).join(", ")})`);
      const tap = async (i, name, check) => {
        const was = await heard();
        await tapAt(cdp, at(i).x, at(i).y);
        await sleep(900);
        const now = await heard();
        await sleep(700);
        const later = await heard();
        const ok = check(was, now, later);
        r.steps.transport.taps.push({ name, label: at(i).label, was, now, later, ok });
        if (!ok) fail(`transport: ${name} (${at(i).label}) did not do what it names`);
      };
      // Forward first, so back 15 has 15 seconds to go back.
      // A recording moves by 15 seconds; the voice by whole verses or paragraphs, to the start of the one the
      // moment falls in (lib/listen/speech/session.ts), so each is held only to its way and the same text.
      await tap(mid + 1, "forward 15", (a, b) => !b.paused && b.src === a.src && b.t > a.t + 1 && b.t - a.t <= 17 + 60);
      await tap(mid - 1, "back 15", (a, b) => !b.paused && b.src === a.src && b.t < a.t - 1);
      // Paused, where it stands holds; playing, it goes on.
      await tap(mid, "pause", (a, b, c) => !a.paused && b.paused && c.t === b.t);
      await tap(mid, "play", (a, b, c) => a.paused && !b.paused && c.t > b.t);
      if (mid + 2 < n) await tap(mid + 2, "next", (a, b) => b.src !== a.src && b.title !== a.title);
      else fail("transport: no next");
      if (mid - 2 >= 0) await tap(mid - 2, "previous", (a, b) => b.src !== a.src || b.t < 3);
      throw Object.assign(new Error("done"), { done: true });
    }
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
    r.steps.afterListen = { away: playing.away, scrollY: await page.evaluate(() => Math.round(scrollY)) };
    // The page's own move to the paragraph being read is not the reader reading on (lib/ui/scrollAway.ts,
    // notePageMoved): the dock stays at rest after Listen until the reader scrolls.
    if (playing.away) fail(`Listen drew the dock in before the reader read on (the page moved itself to ${r.steps.afterListen.scrollY})`);
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
    const toggle = (await centreOf(page, box("[data-reader-dock] .reader-dock-card button.bg-paper"))) ?? (await centreOf(page, box("[data-reader-dock] .reader-dock-pill button.bg-paper")));
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
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(900);
      const partOf = () => page.evaluate(() => ({ name: document.querySelector("[data-reader-dock] .reader-dock-card span.font-semibold, [data-reader-dock] .reader-dock-card [aria-haspopup='dialog'] span")?.textContent?.trim() ?? null, y: Math.round(scrollY), hash: location.hash, first: [...document.querySelectorAll("main h2, main h3")].find((h) => { const b = h.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; })?.textContent?.trim().slice(0, 60) ?? null }));
      const before = { ...(await state(page)), part: await partOf() };
      const nextArrow = await centreOf(page, box("[data-reader-dock] .reader-dock-card button[aria-label], [data-reader-dock] .reader-dock-card a[aria-label]", "first"));
      const arrows = await page.evaluate(() => [...document.querySelectorAll("[data-reader-dock] .reader-dock-card .hit-44.size-8")].map((e) => ({ tag: e.tagName, label: e.getAttribute("aria-label"), box: (() => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })() })));
      const next = arrows.filter((a) => a.tag === "BUTTON" || a.tag === "A").at(-1);
      if (next && nextArrow) {
        await judge("turn", () => tapAt(cdp, next.box.x, next.box.y));
        await sleep(900);
        const after = { ...(await state(page)), part: await partOf() };
        r.steps.turn = { from: before.part, to: after.part, foot: after.foot };
        if (JSON.stringify(before.part) === JSON.stringify(after.part)) fail("the dock's arrow did not turn the part");
        if (after.foot.length !== 1) fail(`after the turn the foot shows ${after.foot.join(" and ") || "nothing"}`);
      } else fail("no arrow on the dock");
    }
    // Reading on: the dock draws in (and on a life and an event the tab bar steps away); back on a scroll up.
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(900);
    const atRestWidth = (await state(page)).dockWidth;
    // Read on, short of the part's very end: there, held a moment, the next part opens at its top, where the
    // controls always show (components/saints/KeepReading.tsx, lib/ui/scrollAway.ts TOP_PX). After the turn a
    // council at 1032 stands on Canon I, a short canon whose room under the screen is about 700px, so a drag of
    // 700 reached its end in some runs and opened Canon II: the "intermittent" dock that did not draw in
    // (Updates 98m's runs; seen with --slow, Updates 98n). Every other text keeps its 700.
    const room = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const reach = Math.min(700, room - 160);
    const where = () => page.evaluate(() => ({ hash: location.hash, y: Math.round(scrollY) }));
    const from = await where();
    if (reach < 200) fail(`too short to read on (${room}px under the screen)`);
    await scrollBy(page, cdp, reach);
    const down = await state(page);
    const downAt = await where();
    await shot("away");
    await scrollBy(page, cdp, -260);
    const up = await state(page);
    r.steps.scroll = { atRestWidth, room, reach, from, down: downAt, away: down.away, awayWidth: down.dockWidth, tabBarAway: down.tabBarShown, back: !up.away, backWidth: up.dockWidth, tabBarBack: up.tabBarShown, screen: down.screen };
    if (downAt.hash !== from.hash) fail(`reading on opened another part (${from.hash || "the first"} to ${downAt.hash})`);
    if (!down.screen) fail("not a reader's screen");
    if (!down.away) fail("a scroll down did not draw the dock in");
    if (down.dockWidth !== null && atRestWidth !== null && down.dockWidth >= atRestWidth) fail("the dock did not draw in");
    if (down.tabBarShown) fail(`the tab bar stayed (${down.tabBarShown}px) on a scroll down`);
    if (up.away) fail("a scroll up did not bring the dock back");
    if (!up.tabBarShown) fail("the tab bar did not come back on a scroll up");
  } catch (e) {
    if (!e.done) fail(`stopped: ${String(e).slice(0, 240)}`);
  }
  if (errors.length) r.errors = errors;
  if (r.fails.length) failed += 1;
  results.push(r);
  console.log(`${r.fails.length ? "FAIL" : "ok  "} ${text.key} ${r.to}${r.fails.length ? `: ${r.fails.join("; ")}` : ""}`);
  console.log(`     ${JSON.stringify({ rest: r.steps.rest && { foot: r.steps.rest.foot, listenInPill: r.steps.rest.listenInPill, listenInPage: r.steps.rest.listenInPage }, playing: r.steps.playing && { foot: r.steps.playing.foot, slot: r.steps.playing.dockSlot, name: r.steps.playing.dockName }, afterListen: r.steps.afterListen, carry: r.steps.carry, pausePlay: r.steps.pausePlay, turn: r.steps.turn, scroll: r.steps.scroll, listenMotion: r.steps["listen:motion"], turnMotion: r.steps["turn:motion"], transport: r.steps.transport, words: r.steps.words && { ...r.steps.words, motion: Object.fromEntries(["open", "words", "close", "reopen"].map((m) => [m, r.steps[`${m}:motion`]])) }, errors: r.errors })}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${TEXTS.length - failed} of ${TEXTS.length} texts as the Bible listens, at ${WIDTH} by ${HEIGHT}${LANG === "en" ? "" : ` in ${LANG}`}${CHECK ? ", checkMock with pixels on every palette and look" : ""}`);
process.exit(failed ? 1 : 0);
