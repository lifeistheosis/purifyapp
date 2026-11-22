#!/usr/bin/env node
// Mock-up 8 of the mock-up phase: one lead on Today, with one Begin (the owner, 2026-11-22, on a
// still of a new reader's Today: "to be honest it looks a little stacked and 2 click here is kinda
// immersion ruining").
//
//   node docs/plans/reader-map/mock-today-lead.mjs <export> [still.jpg]
//
// Today shows a new reader two cards, each with its own Begin: the lead (the greeting, with the
// hour's prayer) and the week's card. Here there is one. While a step of the first week is up, it
// stands in the lead's own place for the hour's prayer, and the week's card is not drawn.
//
// Drawn from the app's own Today on the native export, as a reader in their first week has it
// (what that reader's phone keeps is set before the page opens), never by hand. Only what is
// proposed is changed: the lead's small line and name become the step's, as the week's card says
// them; the lead's Begin opens the step; the card's own close button stands beside the words, so a
// step can still be passed; and the card below is taken away. No word is new.
// Held to checkMock before the still is kept.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const STILL = path.resolve(process.argv[3] ?? path.join(HERE, "img/mock-today-lead.jpg"));
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { NATIVE_UA, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { checkMock, printMockCheck } = await import(at("scripts/mock-check.mjs"));

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);

/** What the phone of a reader in their first week keeps: a Catholic who has not yet been to a church, and came for Daily quiet. */
const KEPT = {
  "purify:onboarded": "4",
  "purify:level": "inquirer",
  "purify:depth": "inquirer",
  "purify:background": "catholic",
  "purify:intent": "quiet",
  "purify:intents": '["quiet"]',
  "purify:firststeps.eligible": "1",
  "purify:onboarded.day": "2026-12-06",
  "purify:fasting-rule": "hidden",
  "purify:calendar.style": "new",
};

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = false;
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: "Europe/Athens", reducedMotion: "reduce" });
  await ctx.addInitScript((kept) => {
    localStorage.setItem("purify:whatsNewSeen", "99");
    for (const [k, v] of Object.entries(kept)) localStorage.setItem(k, v);
    window.androidBridge = { postMessage() {} };
    window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
  }, KEPT);
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date("2026-12-06T09:30:00+02:00") });
  await go(page, "/");
  await page.locator("[data-first-step]").first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(3500);

  const drawn = await page.evaluate(() => {
    const card = document.querySelector("[data-first-step]");
    const begin = document.querySelector("a[data-pray-hour]");
    const slot = begin?.previousElementSibling;
    const close = card?.querySelector("button[aria-label]");
    const [eyebrow, title] = card ? card.querySelectorAll("p") : [];
    const [small, name] = slot ? slot.querySelectorAll("p") : [];
    if (!card || !begin || !close || !eyebrow || !title || !small?.querySelector("span") || !name) return "Today is not the screen expected";
    // The lead's own two lines say the step, in the card's own words.
    small.querySelector("span").textContent = eyebrow.textContent;
    name.textContent = title.textContent;
    begin.setAttribute("href", card.querySelector("a").getAttribute("href"));
    // The card's own close button beside them, laid out as the card lays out its head.
    const words = document.createElement("div");
    words.className = "min-w-0 flex-1";
    words.append(small, name);
    slot.className = "flex items-start gap-3";
    slot.append(words, close);
    card.remove();
    window.scrollTo(0, 0);
    return "ok";
  });
  if (drawn !== "ok") throw new Error(drawn);
  await page.waitForTimeout(900);

  ok = printMockCheck(await checkMock(page, "body"), "mock-up 8: one lead on Today, one Begin");
  await sharp(await page.screenshot({ type: "png" })).jpeg({ quality: 84, mozjpeg: true }).toFile(STILL);
  console.log(`\nStill: ${STILL}`);
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
