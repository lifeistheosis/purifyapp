#!/usr/bin/env node
// The release email's pictures, taken from the app and never drawn.
//
//   node docs/plans/v1.9/email-revamp/shots.mjs <export> [raw-dir]
//
// <export> is a native export (out/, after `npm run build:android`) of the
// release the email is about. For 1.9 that is main at 6700c2e65, cut as the
// store build is, with Plus locked:
//   git worktree add --detach <dir> 6700c2e65 && cd <dir> && npm ci
//   NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android
// (with the main web's public address and anon key in that one command's
// environment, as CLAUDE.md says: "The public key for an export, always").
//
// Each screen is opened the way the store pictures and the social cards open
// it (docs/plans/v1.9/store/cards/cards.mjs): the phone's shell, 412 by 846,
// a new reader with no Plus, Dark, on 6 December 2026, and what a reader's
// finger would do. The whole screen is kept in [raw-dir]; the email's picture
// is a part of it, cut by CUTS below and written to img/ as a JPEG under
// 100 KB. Nothing is drawn over a screen, and nothing is injected into a page.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const RAW = path.resolve(process.argv[3] ?? path.join(HERE, ".raw"));
const IMG = path.join(HERE, "img");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");
const { NATIVE_UA, serveLikeTheShell, go } = await import(pathToFileURL(path.join(ROOT, "scripts/lib/shell-server.mjs")).href);

if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}`);
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(IMG, { recursive: true });

const DAY = "2026-12-06T09:30:00-05:00";
const ZONE = "America/New_York";
const VIEW = [412, 846];
const SCALE = 2;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function tap(page, selector) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 20000 });
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

/** Rest a finger on John 1:1 until its tools open, as a reader holds a verse (the cards' own way). */
async function holdTheVerse(page) {
  await page.waitForSelector('button[aria-label="Open commentary on verse 1"]', { timeout: 30000 });
  const spot = await page.evaluate(() => {
    let el = document.querySelector('button[aria-label="Open commentary on verse 1"]');
    for (let i = 0; i < 6 && el; i++) {
      el = el.parentElement;
      if (el?.textContent.includes("In the beginning was the Word")) {
        const r = el.getBoundingClientRect();
        return { x: r.left + Math.min(r.width / 2, 120), y: r.top + Math.min(r.height / 2, 14) };
      }
    }
    return null;
  });
  if (!spot) throw new Error("John 1:1 was not found on the page");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...spot, id: 1 }] });
  await page.clock.runFor(900).catch(() => {});
  await wait(900);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.getByRole("dialog", { name: /Verse actions/ }).waitFor({ state: "visible", timeout: 5000 });
  await wait(600);
}

/** The screens: where each is, and what a finger does there. */
const SCREENS = [
  {
    id: "today",
    route: "/",
    async prepare(page) {
      const dismiss = page.locator('button[aria-label="Dismiss"]').first();
      for (let tries = 0; tries < 4 && (await dismiss.isVisible()); tries++) {
        await wait(500);
        await tap(page, 'button[aria-label="Dismiss"]');
        await dismiss.waitFor({ state: "hidden", timeout: 2500 }).catch(() => {});
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  },
  { id: "journal", route: "/journal", prepare: (page) => page.waitForSelector("[data-journal-today]", { timeout: 30000 }) },
  { id: "verse", route: "/bible/john/1", prepare: holdTheVerse },
  {
    id: "bibles",
    route: "/bible/john/1",
    async prepare(page) {
      // A finger's tap on the button a reader sees (the page holds a second, hidden one). The list is taken as it opens.
      await tap(page, 'button[aria-label^="Switch translation"]:visible');
      await page.locator('[role="dialog"]').filter({ hasText: "Russian" }).first().waitFor({ state: "visible", timeout: 10000 });
      await wait(900);
    },
  },
  {
    id: "study",
    route: "/bible/john/1",
    async prepare(page) {
      await holdTheVerse(page);
      await page.getByRole("dialog", { name: /Verse actions/ }).getByText("Study", { exact: true }).first().click();
      await page.getByText("Cross-references", { exact: true }).first().waitFor({ state: "visible", timeout: 10000 });
      await wait(900);
    },
  },
  { id: "plans", route: "/plans" },
  { id: "creed", route: "/theology/creed" },
];

/**
 * The part of each screen the email shows, in the screen's own CSS pixels
 * (412 wide): [top, height]. The width is always the whole screen.
 */
const CUTS = JSON.parse(fs.readFileSync(path.join(HERE, "cuts.json"), "utf8"));

function android() {
  window.androidBridge = { postMessage() {} };
  window.Capacitor = { getPlatform: () => "android", isNativePlatform: () => true };
}

const only = process.argv.slice(4);
const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
const results = {};
for (const s of SCREENS) {
  const rawFile = path.join(RAW, `${s.id}.png`);
  if (!fs.existsSync(rawFile) || only.includes(s.id)) {
    const ctx = await browser.newContext({ viewport: { width: VIEW[0], height: VIEW[1] }, deviceScaleFactor: SCALE, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: ZONE, reducedMotion: "reduce" });
    await ctx.addInitScript((values) => {
      for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    }, { "purify:onboarded": "99", "purify:whatsNewSeen": "99" });
    await ctx.addInitScript(android);
    await serveLikeTheShell(ctx, OUT, {});
    await ctx.route(/^https:\/\/purifyapp\.net\/.*\.(avif|jpe?g|png|webp)(\?.*)?$/, (route) => route.continue());
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date(DAY) });
    await go(page, s.route);
    await page.waitForLoadState("networkidle").catch(() => {});
    await wait(1500);
    if (s.prepare) await s.prepare(page);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle").catch(() => {});
    await wait(1500);
    await page.screenshot({ path: rawFile, type: "png" });
    await ctx.close();
  }
  const cut = CUTS[s.id];
  if (!cut) continue;
  const [top, height] = cut;
  const file = path.join(IMG, `${s.id}.jpg`);
  // 720 wide: two pixels to the point at the email's 360, and sharp at 600.
  await sharp(rawFile)
    .extract({ left: 0, top: top * SCALE, width: VIEW[0] * SCALE, height: height * SCALE })
    .resize({ width: 720 })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(file);
  results[s.id] = { route: s.route, cut: { top, height }, width: 720, height: Math.round((height * 720) / VIEW[0]), bytes: fs.statSync(file).size };
  console.log(`${s.id}: ${results[s.id].bytes} bytes`);
}
await browser.close();
fs.writeFileSync(path.join(HERE, "shots.json"), `${JSON.stringify({ export: "main 6700c2e65, cut as the store build with Plus locked", day: DAY, view: VIEW, screens: results }, null, 2)}\n`);
