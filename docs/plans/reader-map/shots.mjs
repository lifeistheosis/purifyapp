#!/usr/bin/env node
// The reader map's photos: each road, as its reader meets it, taken from the app and never drawn.
//
//   node docs/plans/reader-map/shots.mjs <export> <raw-dir> [road ...] [--say]
//
// <export> is the native export (out/, after `npm run build:android`) of the app as readers have
// it: main, cut as the store build with Plus locked (docs/plans/v1.9/email-revamp/README.md says
// how). Each road is walked from a first open, at 390 by 844 in the shell's own user agent, on
// 6 December 2026, by tapping the questions' own answers as a finger would: nothing is put into the
// page and no answer is written for the reader. A photo is taken of each question as it is first
// shown, of "Your space is ready", and of Today as that reader then finds it.
// --say prints what each screen said and offered, for when a screen changes and the walk stops.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const args = process.argv.slice(2);
const SAY = args.includes("--say");
const [outArg, rawArg, ...only] = args.filter((a) => a !== "--say");
const OUT = path.resolve(outArg ?? path.join(ROOT, "out"));
const RAW = path.resolve(rawArg ?? path.join(HERE, ".raw"));
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const { NATIVE_UA, serveLikeTheShell, go } = await import(pathToFileURL(path.join(ROOT, "scripts/lib/shell-server.mjs")).href);

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);
fs.mkdirSync(RAW, { recursive: true });

const DAY = "2026-12-06T09:30:00-05:00";
const ZONE = "America/New_York";

/** The answers that put a reader on each road (docs/plans/reader-map.txt, 3). No picks, but the seeker's one. */
export const ROADS = [
  { id: "practicing", background: /^Orthodox/, second: /^Practicing/, picks: [] },
  { id: "returning", background: /^Orthodox/, second: /^Coming back/, picks: [] },
  { id: "catechumen", background: /^Orthodox/, second: /^Preparing to be received/, picks: [] },
  { id: "catholic", background: /^Catholic/, second: /^Not yet/, picks: [] },
  { id: "protestant", background: /^Protestant/, second: /^Not yet/, picks: [] },
  { id: "christian", background: /^Another Christian tradition/, second: /^Not yet/, picks: [] },
  { id: "seeker", background: /^Prefer not to say/, second: /^Completely new/, picks: [/^The Fathers' writings/] },
  { id: "newcomer", background: /^Another faith/, second: /^Not yet/, picks: [] },
];

/** The screens of the questions, told by their own words. */
const SCREENS = [
  { id: "welcome", words: "A quiet place to pray, read, and keep the Church's year." },
  { id: "background", words: "Where are you coming from?" },
  { id: "second-orthodox", words: "Where are you now?", second: true },
  { id: "second-others", words: "Have you been to an Orthodox church?", second: true },
  { id: "second-as-it-was", words: "How familiar are you with Orthodox Christianity?", second: true },
  { id: "rule", words: "Your calendar and your fast" },
  { id: "looking-for", words: "What are you looking for?" },
  { id: "ready", words: "Your space is ready" },
];

function android() {
  window.androidBridge = { postMessage() {} };
  window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
}

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
const results = {};
for (const road of ROADS) {
  if (only.length && !only.includes(road.id)) continue;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: ZONE, reducedMotion: "reduce" });
  await ctx.addInitScript(() => localStorage.setItem("purify:whatsNewSeen", "99"));
  await ctx.addInitScript(android);
  await serveLikeTheShell(ctx, OUT, {});
  await ctx.route(/^https:\/\/purifyapp\.net\/.*\.(avif|jpe?g|png|webp)(\?.*)?$/, (route) => route.continue());
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(DAY) });
  await go(page, "/");
  const d = page.locator('[role="dialog"]').first();
  await d.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);

  const tap = async (re) => {
    const b = d.getByRole("button", { name: re }).first();
    if (!(await b.count()) || !(await b.isVisible()) || !(await b.isEnabled())) return false;
    await b.click();
    await page.waitForTimeout(1200);
    return true;
  };
  const photographed = [];
  const picks = [...road.picks];
  const answered = { background: false, second: false };
  let stuck = 0;
  let last = "";
  let ended = "the walk ran out of steps";
  for (let i = 0; i < 40; i++) {
    if (!(await d.count()) || !(await d.isVisible().catch(() => false))) {
      ended = "the questions closed";
      break;
    }
    const now = (await d.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    const screen = SCREENS.find((s) => now.includes(s.words));
    if (SAY) {
      const offered = await d.getByRole("button").evaluateAll((bs) => bs.filter((b) => b.getBoundingClientRect().height > 0).map((b) => (b.getAttribute("aria-label") || b.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40)));
      console.log(`  [${road.id}] ${screen?.id ?? "?"}: ${now.slice(0, 70)} | offers: ${offered.join(" / ")}`);
    }
    if (screen && !photographed.includes(screen.id)) {
      photographed.push(screen.id);
      await page.screenshot({ path: path.join(RAW, `${road.id}--${screen.id}.png`), type: "png" });
    }
    stuck = now === last ? stuck + 1 : 0;
    last = now;
    if (stuck > 4) {
      ended = `stopped on "${now.slice(0, 60)}"`;
      break;
    }
    if (screen?.id === "welcome" && (await tap(/^Begin/))) continue;
    if (screen?.id === "background") {
      if (!answered.background && (await tap(road.background))) {
        answered.background = true;
        continue;
      }
      if (await tap(/^Continue/)) continue;
    }
    if (screen?.second) {
      if (!answered.second && (await tap(road.second))) {
        answered.second = true;
        continue;
      }
      if (await tap(/^Continue/)) continue;
    }
    if (screen?.id === "looking-for") {
      if (picks.length && (await tap(picks[0]))) {
        picks.shift();
        continue;
      }
      if ((await tap(/^Continue/)) || (await tap(/^Skip/))) continue;
    }
    if (screen?.id === "ready") {
      if ((await tap(/^(Begin|Continue|Enter|Open|Start|Go)/)) || true) {
        await page.waitForTimeout(1500);
        continue;
      }
    }
    if (now.includes("A nudge to pray") && (await tap(/^Not now/))) continue;
    if (await tap(/^Continue without an account/)) continue;
    if (await tap(/^Continue/)) continue;
    await page.waitForTimeout(1200);
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(RAW, `${road.id}--today.png`), type: "png" });
  await page.screenshot({ path: path.join(RAW, `${road.id}--today-whole.png`), type: "png", fullPage: true });
  const kept = await page.evaluate(() => ({ level: localStorage.getItem("purify:level"), background: localStorage.getItem("purify:background"), returning: localStorage.getItem("purify:returning"), week: localStorage.getItem("purify:week"), at: location.pathname }));
  // The one card that differs by road: where it stands on the first screen, and then a photo of it whole,
  // drawn up clear of the tab bar as a finger would.
  const cardAt = () =>
    page.evaluate(() => {
      const eyebrow = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /Your first week · \d of 7/.test(e.textContent ?? ""));
      if (!eyebrow) return null;
      let box = eyebrow.parentElement;
      while (box && ![...box.querySelectorAll("a, button")].some((b) => /^Begin/.test((b.textContent ?? "").trim()))) box = box.parentElement;
      const r = (box ?? eyebrow).getBoundingClientRect();
      return { says: eyebrow.textContent.trim(), words: ((box ?? eyebrow).innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 220), top: Math.round(r.top), height: Math.round(r.height) };
    });
  const atTop = await cardAt();
  let card = null;
  if (atTop) {
    await page.evaluate((y) => window.scrollBy(0, y), atTop.top - 200);
    await page.waitForTimeout(800);
    card = await cardAt();
    await page.screenshot({ path: path.join(RAW, `${road.id}--card.png`), type: "png" });
  }
  results[road.id] = { ended, photographed, kept, atTop, card };
  console.log(`${road.id}: ${ended}; the week's card ${atTop ? `stands at ${atTop.top}px of 844 and is ${atTop.height}px tall: ${atTop.words}` : "was not found"}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(RAW, "walk.json"), `${JSON.stringify({ day: DAY, view: [390, 844], roads: results }, null, 2)}\n`);
