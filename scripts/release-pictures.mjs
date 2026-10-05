// Real screenshots for a release, taken again whenever they are needed.
//
//   node scripts/release-pictures.mjs <version> [name ...]
//
// Reads docs/plans/v<version>/pictures.json and, for each shot, opens the live
// site as any signed-out visitor does, in the dark, and writes the picture
// where the shot says. Nothing is drawn or edited in: a picture shows what
// the page showed. So before a shot that pictures Community, look at what it
// caught. A reader's name, picture or words go into nothing we send or ship
// unless they are Purify's own account or that reader said yes.
//
// A shot:
//   out       where it is written, under public/. .jpg for an email (Outlook
//             draws no WebP), .webp for the site.
//   url       a path on purifyapp.net
//   viewport  [width, height] in CSS pixels; `phone` for a phone's browser
//   scale     device pixels per CSS pixel (default 2)
//   set       localStorage values to set before the page loads
//   tap       the exact text of something to press once the page is up
//   scroll    how far down to scroll before the picture
//   wait      milliseconds to let the page settle (default 3000)
//   crop      [left, top, width, height] in device pixels, of the screenshot
//   size      [width, height] of the file written

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const SITE = "https://purifyapp.net";
const [version, ...only] = process.argv.slice(2);
if (!version || !/^\d+\.\d+(\.\d+)?$/.test(version)) {
  console.error("Usage: node scripts/release-pictures.mjs <version> [name ...]");
  process.exit(1);
}
const listPath = `docs/plans/v${version}/pictures.json`;
if (!fs.existsSync(listPath)) {
  console.error(`No ${listPath}. Write the shots there first.`);
  process.exit(1);
}
const shots = JSON.parse(fs.readFileSync(listPath, "utf8")).filter((s) => !only.length || only.includes(s.name));
if (!shots.length) {
  console.error(only.length ? `No shot in ${listPath} is named ${only.join(" or ")}.` : `${listPath} lists no shots yet.`);
  process.exit(1);
}

const PHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const browser = await chromium.launch();
for (const shot of shots) {
  if (!shot.out.startsWith("public/")) throw new Error(`${shot.name}: pictures are written under public/`);
  const [width, height] = shot.viewport;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: shot.scale ?? 2,
    colorScheme: "dark",
    ...(shot.phone ? { isMobile: true, hasTouch: true, userAgent: PHONE_UA } : {}),
  });
  // A returning visitor: no first-run sheet over the page.
  await context.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) window.localStorage.setItem(k, v);
  }, { "purify:onboarded": "3", ...(shot.set ?? {}) });
  const page = await context.newPage();
  await page.goto(SITE + shot.url, { waitUntil: "networkidle", timeout: 90_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(shot.wait ?? 3000);
  if (shot.tap) {
    const target = page.locator("main").getByText(shot.tap, { exact: true }).first();
    await (shot.phone ? target.tap() : target.click());
    await page.waitForTimeout(shot.wait ?? 3000);
  }
  if (shot.scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), shot.scroll);
    await page.waitForTimeout(1200);
  }
  let image = sharp(await page.screenshot());
  if (shot.crop) {
    const [left, top, w, h] = shot.crop;
    image = image.extract({ left, top, width: w, height: h });
  }
  if (shot.size) image = image.resize(shot.size[0], shot.size[1]);
  fs.mkdirSync(path.dirname(shot.out), { recursive: true });
  if (shot.out.endsWith(".jpg")) await image.jpeg({ quality: 86, mozjpeg: true }).toFile(shot.out);
  else if (shot.out.endsWith(".webp")) await image.webp({ quality: 88 }).toFile(shot.out);
  else await image.png().toFile(shot.out);
  const meta = await sharp(shot.out).metadata();
  console.log(`${shot.name}: ${shot.out}  ${meta.width} x ${meta.height}  ${Math.round(fs.statSync(shot.out).size / 1024)} KB`);
  await context.close();
}
await browser.close();
console.log("Open every picture and look at it before it ships.");
