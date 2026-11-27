#!/usr/bin/env node
// Silver Night in the app, pictured from the native export as a reader in
// Testers mode sees it (his word, 2026-11-27: "implement everything and send
// screengrabs at the very end"). Every screen is held to checkMock first.
//
//   node docs/brand/art/shots.mjs <export>   writes docs/brand/art/shots/*.jpg

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const SHOTS = path.join(HERE, "shots");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
const { NATIVE_UA, serveLikeTheShell, go } = await import(at("scripts/lib/shell-server.mjs"));
const { checkMock, printMockCheck } = await import(at("scripts/mock-check.mjs"));
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);
fs.mkdirSync(SHOTS, { recursive: true });

const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = true;

async function reader({ onboarded }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: "Europe/Athens", reducedMotion: "reduce" });
  await ctx.addInitScript((onboarded) => {
    localStorage.setItem("purify:whatsNewSeen", "99");
    localStorage.setItem("purify:testers", "1");
    if (onboarded) localStorage.setItem("purify:onboarded", "99");
    window.androidBridge = { postMessage() {} };
    window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
  }, onboarded);
  await serveLikeTheShell(ctx, OUT, {});
  return ctx;
}

async function keep(page, name, label) {
  await page.waitForTimeout(1200);
  ok = printMockCheck(await checkMock(page, "body"), label) && ok;
  const file = path.join(SHOTS, `${name}.jpg`);
  await sharp(await page.screenshot({ type: "png" })).jpeg({ quality: 86, mozjpeg: true }).toFile(file);
  console.log(`  shot: ${path.relative(ROOT, file)}\n`);
}

try {
  const ctx = await reader({ onboarded: true });
  const page = await ctx.newPage();
  await go(page, "/discover");
  await page.locator("[data-art-tiles]").waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(2500);
  await keep(page, "1-discover-top", "Discover, the tiles");
  await page.evaluate(() => document.querySelectorAll("[data-art-tile]")[4]?.scrollIntoView({ block: "start" }));
  await page.evaluate(() => window.scrollBy(0, -90));
  await keep(page, "2-discover-more", "Discover, further down");

  await go(page, "/parishes");
  await page.locator('[data-art-head="parish"]').waitFor({ state: "visible", timeout: 30000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await keep(page, "3-parish-head", "Find a parish, its head");

  await go(page, "/start");
  await page.locator('[data-art-head="start"]').waitFor({ state: "visible", timeout: 30000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await keep(page, "4-start-head", "Start here, its head");

  // The pictures still waiting for their own, in black and white.
  await go(page, "/prayers");
  await page.locator(".masthead-picture, figure img").first().waitFor({ state: "visible", timeout: 30000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await keep(page, "6-prayers-head-bw", "Prayers, its head in black and white");
  await go(page, "/");
  const readings = page.locator(".today-readings-picture").first();
  await readings.waitFor({ state: "attached", timeout: 30000 });
  await page.evaluate(() => document.querySelector(".today-readings-picture")?.closest("section, article, div")?.scrollIntoView({ block: "center" }));
  await keep(page, "7-today-readings-bw", "Today, the readings in black and white");
  await ctx.close();

  // A new reader, at "What are you looking for?"
  const fresh = await reader({ onboarded: false });
  const p2 = await fresh.newPage();
  await go(p2, "/");
  const d = p2.locator('[role="dialog"]').first();
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
    await p2.waitForTimeout(1200);
  };
  await tap(/^Begin/);
  await tap(/^Continue without an account/, true);
  await tap(/^Catholic/);
  await tap(/^Continue/);
  await tap(/^Not yet/);
  await p2.locator('img[src^="/art/"]').first().waitFor({ state: "visible", timeout: 30000 });
  await p2.waitForTimeout(2500);
  await keep(p2, "5-onboarding-cards", "Onboarding, the answer cards");
} finally {
  await browser.close();
}
if (!ok) {
  console.error("checkMock failed on a screen above.");
  process.exit(1);
}
console.log("every screen passed checkMock");
