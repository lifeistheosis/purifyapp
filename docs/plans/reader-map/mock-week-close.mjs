#!/usr/bin/env node
// Mock-up 14: the week's close (2.0 onboarding, section 5.1 and 5.2). The plan is
// docs/plans/onboarding-2.0.md, "Section 5, after day seven: the plan"; the job is
// docs/handoffs/v2.0-week-close.md. His word, 2026-11-27: "organize everything and start
// working on v2 0".
//
//   node docs/plans/reader-map/mock-week-close.mjs <export>
//
// writes img/mock-close-before.jpg, img/mock-close.jpg, img/mock-close-motion.jpg and
// mock-week-close.html.
//
// Drawn from the app's own Today on the native export, never by hand. The reader is the
// Catholic road's (the walk of mock-day.mjs, with the account step skipped): their day 7 is
// Find a parish and their next step Your first Liturgy, as on the catechumen's road. The week
// is then set on the device as its seventh step kept today, with Testers mode on so the day's
// frame is on, and Today shows the card the frame shows now: "Day 7 of 7, kept", nothing
// under it. Only that card changes:
//
//   before   the card as it is.
//   close    the same card: its own line, one new sentence, "Your first week is kept.", and
//            tomorrow's step by name in the app's own words ("Tomorrow: Your first Liturgy").
//            No button: a kept day has none, and tomorrow the card offers the step.
//   motion   the finish, as three frames of one move: a soft pool of the palette's own light
//            comes down into the card from its top, brightens, and settles to half as a glow, and the two lines come
//            up at a steady pace on the house curve. Nothing pops, scales or settles back.
//
// Every still is held to checkMock (the five palettes and the two earned) before it is kept,
// and the close once more in Arabic for the mirror. The motion's frames are parts of one move
// and are not checked one by one: their words are on their way in.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const IMG = path.join(HERE, "img");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { NATIVE_UA, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { checkMock, printMockCheck } = await import(at("scripts/mock-check.mjs"));
const EN = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8"));

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);

/** The words. The first and the last are the app's own; the middle one is new, and his to pass. */
export const CLOSE = {
  kept: EN["onboard.week.kept"].replace("{n}", "7"),
  line: "Your first week is kept.",
  next: EN["onboard.week.tomorrow"].replace("{title}", EN["onboard.day1.firstLiturgy.title"]),
};

/** The finish, in ms, on the house curve (app/globals.css, --ease-house). */
const D = 1400;
/** Each moving part: when it starts and how long it runs, as shares of D. */
const PARTS = { "wkc-pool": [0, 1], "wkc-a": [0.2, 0.55], "wkc-b": [0.35, 0.55] };
const FRAMES = [0.14, 0.42, 1];

const CSS = `
@keyframes wkc-pool { 0% { opacity: 0; transform: translateY(-22%); } 45% { opacity: 1; transform: none; } 100% { opacity: .5; transform: none; } }
@keyframes wkc-line { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
[data-week-close] .wkc-pool { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; opacity: .5;
  background: radial-gradient(130% 85% at 50% 0%, color-mix(in oklab, var(--color-premium) 28%, transparent), transparent 72%); }
${Object.entries(PARTS)
  .map(([k, [s, l]]) => `[data-week-close] .${k} { animation: ${k === "wkc-pool" ? "wkc-pool" : "wkc-line"} ${Math.round(l * D)}ms var(--ease-house) ${Math.round(s * D)}ms both; }`)
  .join("\n")}
@media (prefers-reduced-motion: reduce) { [data-week-close] * { animation: none !important; } }
`;

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = true;

const keep = async (page, name, label) => {
  await page.waitForTimeout(900);
  ok = printMockCheck(await checkMock(page, "body"), label) && ok;
  const file = path.join(IMG, `${name}.jpg`);
  await sharp(await page.screenshot({ type: "png" })).jpeg({ quality: 84, mozjpeg: true }).toFile(file);
  console.log(`  still: ${path.relative(ROOT, file)} (${fs.statSync(file).size} bytes)\n`);
};

/** The card as the frame shows it on the seventh day, waited for and brought to the top. */
const keptCard = async (page) => {
  const card = page.locator("[data-first-step-kept]").first();
  await card.waitFor({ state: "visible", timeout: 30000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2500);
  return card;
};

/** The close, put into the card the app drew: the card, its line and its classes are the app's own. */
const intoClose = (page) =>
  page.evaluate(
    ({ words, css }) => {
      const card = document.querySelector("[data-first-step-kept]");
      const eyebrow = card?.querySelector("p");
      if (!card || !eyebrow || eyebrow.textContent.trim() !== words.kept || card.querySelectorAll("p").length !== 1) return "the seventh day's card is not the one expected";
      const style = document.createElement("style");
      style.textContent = css;
      document.head.append(style);
      card.setAttribute("data-week-close", "");
      const pool = document.createElement("div");
      pool.className = "wkc-pool";
      pool.setAttribute("aria-hidden", "true");
      card.prepend(pool);
      const line = (text, cls, part) => {
        const p = document.createElement("p");
        p.className = `${cls} ${part} relative`;
        p.textContent = text;
        card.append(p);
      };
      eyebrow.classList.add("relative");
      line(words.line, "mt-2 font-heading text-title-sm font-bold leading-tight text-paper", "wkc-a");
      line(words.next, "mt-1.5 font-sans text-detail leading-[1.55] text-paper/65", "wkc-b");
      return "ok";
    },
    { words: CLOSE, css: CSS },
  );

/** Every moving part held at t (a share of D): its delay moved back by t, and paused. */
const holdAt = (page, t) =>
  page.evaluate(
    ({ t, D, PARTS }) => {
      for (const [k, [s]] of Object.entries(PARTS)) {
        const el = document.querySelector(`[data-week-close] .${k}`);
        el.style.animationDelay = `${Math.round((s - t) * D)}ms`;
        el.style.animationPlayState = "paused";
      }
    },
    { t, D, PARTS },
  );

/** A reader on the export, through the questions to Today, then on the day they keep day 7. */
const seventhDay = async (ctx, language) => {
  const page = await ctx.newPage();
  await go(page, "/");
  const d = page.locator('[role="dialog"]').first();
  await d.waitFor({ state: "visible", timeout: 30000 });
  const tap = async (re, optional = false) => {
    const b = d.getByRole("button", { name: re }).first();
    try {
      await b.waitFor({ state: "visible", timeout: optional ? 4000 : 15000 });
    } catch (e) {
      if (optional) return;
      throw e;
    }
    await b.click();
    await page.waitForTimeout(1200);
  };
  await tap(/^Begin/);
  await tap(/^Continue without an account/, true);
  await tap(/^Catholic/);
  await tap(/^Continue/);
  await tap(/^Not yet/);
  await tap(/^Daily quiet/);
  await tap(/^Continue with/);
  await page.locator("[data-first-step]").first().waitFor({ state: "visible", timeout: 30000 });
  await page.evaluate((language) => {
    const p = (n) => String(n).padStart(2, "0");
    const now = new Date();
    const today = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
    localStorage.setItem("purify:testers", "1");
    localStorage.setItem("purify:week", JSON.stringify({ at: 7, day: today, passed: 0 }));
    // As the tap walk and the guardrail walk set a reader's language: the key the app keeps and its cookie (below).
    if (language) {
      localStorage.setItem("CapacitorStorage.purify_locale", language);
      localStorage.setItem("mock:device-language", language);
    }
  }, language);
  if (language) await ctx.addCookies([{ name: "purify_locale", value: language, url: "https://localhost" }]);
  // Opened again, as the reader opens Purify on the day (go() would only move the router).
  await page.reload({ waitUntil: "load", timeout: 120000 });
  return page;
};

const context = (reducedMotion) =>
  browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: "Europe/Athens", reducedMotion });

const shell = async (ctx, bridge = true) => {
  await ctx.addInitScript((bridge) => {
    localStorage.setItem("purify:whatsNewSeen", "99");
    // The phone's own language, which the app opens in (lib/i18n/launchLanguage.ts): set once the questions are answered.
    const own = localStorage.getItem("mock:device-language");
    if (own) {
      Object.defineProperty(navigator, "languages", { get: () => [own] });
      Object.defineProperty(navigator, "language", { get: () => own });
    }
    if (!bridge) return;
    window.androidBridge = { postMessage() {} };
    window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
  }, bridge);
  await serveLikeTheShell(ctx, OUT, {});
};

try {
  // Before, and the close at rest, with motion stilled as a reader who asks for less motion has it.
  const still = await context("reduce");
  await shell(still);
  const page = await seventhDay(still);
  await keptCard(page);
  await keep(page, "mock-close-before", "mock-up 14, before: the seventh day as the frame shows it now");
  const said = await intoClose(page);
  if (said !== "ok") throw new Error(said);
  await keep(page, "mock-close", "mock-up 14: the week's close, at rest");

  // The motion: the same close with motion on, held at three moments of one move.
  const moving = await context("no-preference");
  await shell(moving);
  const live = await seventhDay(moving);
  const card = await keptCard(live);
  const again = await intoClose(live);
  if (again !== "ok") throw new Error(again);
  const box = await card.boundingBox();
  const clip = { x: 0, y: Math.max(0, box.y - 16), width: 390, height: Math.min(844, box.height + 32) };
  const shots = [];
  for (const t of FRAMES) {
    await holdAt(live, t);
    await live.waitForTimeout(250);
    shots.push(await live.screenshot({ type: "png", clip }));
  }
  const [w, h] = [780, Math.round(clip.height * 2)];
  const gap = 24;
  const strip = path.join(IMG, "mock-close-motion.jpg");
  await sharp({ create: { width: w * 3 + gap * 2, height: h, channels: 3, background: { r: 10, g: 10, b: 12 } } })
    .composite(shots.map((input, i) => ({ input, left: i * (w + gap), top: 0 })))
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(strip);
  console.log(`  motion: ${path.relative(ROOT, strip)} (${fs.statSync(strip).size} bytes)\n`);

  // Arabic, for the mirror: the close as an Arabic reader's card would hold it. The new sentence
  // stands in English here; its Arabic comes with the build, with the other nineteen languages.
  const rtl = await context("reduce");
  await shell(rtl);
  const ar = await seventhDay(rtl, "ar");
  await ar.locator("[data-first-step-kept]").first().waitFor({ state: "visible", timeout: 30000 });
  await ar.waitForTimeout(2500);
  const dir = await ar.evaluate(() => document.documentElement.dir);
  const arCard = await ar.evaluate(() => document.querySelector("[data-first-step-kept] p")?.textContent.trim());
  console.log(`  Arabic: dir="${dir}", the card says "${arCard}"`);
  const arSaid = await ar.evaluate(
    ({ words, css }) => {
      const card = document.querySelector("[data-first-step-kept]");
      if (!card) return "no card";
      const style = document.createElement("style");
      style.textContent = css;
      document.head.append(style);
      card.setAttribute("data-week-close", "");
      for (const [text, cls] of [
        [words.line, "mt-2 font-heading text-title-sm font-bold leading-tight text-paper"],
        [words.next, "mt-1.5 font-sans text-detail leading-[1.55] text-paper/65"],
      ]) {
        const p = document.createElement("p");
        p.className = cls;
        p.textContent = text;
        card.append(p);
      }
      return "ok";
    },
    { words: CLOSE, css: CSS },
  );
  if (arSaid !== "ok") throw new Error(arSaid);
  ok = printMockCheck(await checkMock(ar, "body"), "mock-up 14 in Arabic: the mirror") && ok;
} finally {
  await browser.close();
}
if (!ok) {
  console.error("checkMock failed on a still above: nothing is sent until it passes.");
  process.exit(1);
}
console.log("every still passed checkMock");
