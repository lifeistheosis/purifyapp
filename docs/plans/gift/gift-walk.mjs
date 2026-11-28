#!/usr/bin/env node
// The Christmas gift as built (2.0), walked on the website's own production build at phone
// width, for his look before it goes anywhere. His word, 2026-11-28: "yes build the gift
// page at 59.99".
//
//   npm run build && npx next start -p 3123 &
//   node docs/plans/gift/gift-walk.mjs http://localhost:3123     writes docs/plans/gift/img/built-*.jpg
//
// The card's page reads its card from the website (/api/gifts/card); here that one answer
// is given by the script, a sample card, so nothing touches a database. Sample names only.
// Every still is held to checkMock.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const BASE = (process.argv[2] ?? "http://localhost:3123").replace(/\/$/, "");
const IMG = path.join(HERE, "img");
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium, devices } = require("playwright");
const sharp = require("sharp");
const { checkMock, printMockCheck } = await import(pathToFileURL(path.join(ROOT, "scripts/mock-check.mjs")).href);
fs.mkdirSync(IMG, { recursive: true });

const CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = true;

async function keep(page, name, label) {
  await page.waitForTimeout(1200);
  ok = printMockCheck(await checkMock(page, "body"), label) && ok;
  const file = path.join(IMG, `${name}.jpg`);
  await sharp(await page.screenshot({ type: "png" })).jpeg({ quality: 86, mozjpeg: true }).toFile(file);
  console.log(`  still: ${path.relative(ROOT, file)}\n`);
}

try {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], colorScheme: "dark", reducedMotion: "reduce", locale: "en-US" });
  await ctx.addInitScript(() => {
    localStorage.setItem("purify:whatsNewSeen", "99");
    localStorage.setItem("purify:onboarded", "99");
  });
  await ctx.route(/\/api\/gifts\/card\?code=/, (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ card: { fromName: "Anna", toName: "Maria", message: "Christ is born! Read with me this year.", days: 365, opened: false } }) }),
  );
  const page = await ctx.newPage();

  await page.goto(`${BASE}/give`, { waitUntil: "networkidle" });
  await page.locator("#give-from").fill("Anna");
  await page.locator("#give-to").fill("Maria");
  await page.locator("#give-email").fill("maria@example.com");
  await page.locator("#give-line").fill("Christ is born! Read with me this year.");
  await page.evaluate(() => window.scrollTo(0, 0));
  await keep(page, "built-give", "The giver's page, as built");

  await page.goto(`${BASE}/give/thanks?on=2026-12-25`, { waitUntil: "networkidle" });
  await keep(page, "built-thanks", "After giving, as built");

  await page.goto(`${BASE}/gift/card?code=${CODE}`, { waitUntil: "networkidle" });
  await page.getByText("A gift from Anna").first().waitFor({ state: "visible", timeout: 30000 });
  await keep(page, "built-card", "The gift card's page, signed out, as built");
  await ctx.close();
} finally {
  await browser.close();
}
if (!ok) {
  console.error("checkMock failed on a still above.");
  process.exit(1);
}
console.log("every still passed checkMock");
