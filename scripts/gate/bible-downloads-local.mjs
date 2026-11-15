// Build 98 note 6 (his word of 2026-11-15, about 21:23 UTC: "its not letting me download any of the Bible
// version"): the whole path proved before the merge, since there is no test web. The export as the Android
// shell shows it, its requests to the website for the Bibles (and the icon the app asks whether the website
// answers) handed to the branch's own web build running here (next start), answered with that server's own
// status, headers and body, so its CORS and Cross-Origin-Resource-Policy are what the web view meets. Every
// version in the Translation sheet downloaded with a finger's tap; then the network taken away, each version
// chosen and John 1 read from the phone; then each removed. Run from the repository's root; writes nothing.
//   node scripts/gate/bible-downloads-local.mjs [export folder, default out/] [web, default http://localhost:3000]
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";

const OWN = "/opt/pw-browsers/chromium";
const ROOT = new URL("../..", import.meta.url).pathname;
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "out"));
const WEB = process.argv[3] ?? "http://localhost:3000";
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8"));
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
await pinMotion(ctx, "on");
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  } catch {}
});
await serveLikeTheShell(ctx, OUT, {});
let online = true;
const answered = [];
await ctx.route(/^https:\/\/purifyapp\.net\/(bibles\/|icon-192\.png)/, async (route) => {
  if (!online) return route.abort("internetdisconnected");
  const u = new URL(route.request().url());
  try {
    const response = await route.fetch({ url: `${WEB}${u.pathname}`, headers: { ...route.request().headers(), origin: "https://localhost" } });
    answered.push(`${response.status()} ${u.pathname}`);
    return route.fulfill({ response });
  } catch {
    return route.abort();
  }
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const tap = async (loc) => {
  const b = await loc.boundingBox();
  if (!b) return false;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
  await page.waitForTimeout(50);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  return true;
};
const notNow = async () => {
  for (let i = 0; i < 3; i++) {
    const b = page.locator("[role=dialog] button, [data-bible-language-offer] button", { hasText: en["onboard.reminders.notNow"] }).filter({ visible: true }).first();
    if (!(await b.count())) break;
    await tap(b);
    await page.waitForTimeout(700);
  }
};
// The versions as a phone reader reaches them: the line under the chapter's title (build 93 note 20), which
// opens the books sheet on its versions from build 98 note 7.
const openTranslations = async () => {
  await notNow();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await tap(page.locator("[data-title-translation]").filter({ visible: true }).first());
  await page.waitForTimeout(1100);
};
/** Brings the row into the sheet's view and taps it, once it has stopped moving (a list redrawn by a download). */
const tapRow = async (find) => {
  for (let i = 0; i < 6; i++) {
    try {
      const el = find();
      await el.scrollIntoViewIfNeeded({ timeout: 3000 });
      await page.waitForTimeout(350);
      if (await tap(find())) return true;
    } catch {
      await page.waitForTimeout(600);
    }
  }
  return false;
};
/** What the open sheet offers, for a fault's line. */
const offered = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("[role=dialog] button")]
      .map((b) => b.getAttribute("aria-label") || b.textContent.trim())
      .filter(Boolean)
      .join(" | "),
  );
const closeSheets = async () => {
  for (let i = 0; i < 3 && (await page.locator("[role=dialog]").filter({ visible: true }).count()); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
};

let faults = 0;
await go(page, "/bible/john/1/", { timeout: 60000 });
await page.waitForTimeout(2000);
await openTranslations();
const downloaded = [];
for (let n = 0; n < 12; n++) {
  // A row's tap downloads its Bible and then reads on in it, which closes the sheet as any choice does:
  // the versions opened afresh for each.
  if (n > 0) {
    await page.waitForTimeout(800);
    await notNow();
    await closeSheets();
    await openTranslations();
  }
  // WALK_ONLY=<part of a title> walks that one version alone.
  const button = page.locator(`[role=dialog] button[aria-label^="Download ${process.env.WALK_ONLY ?? ""}"]`).filter({ visible: true }).first();
  if (!(await button.count())) break;
  const label = await button.getAttribute("aria-label");
  // "Download {name}, {size}": the name is everything before the last comma (a title may hold one).
  const name = label.slice("Download ".length, label.lastIndexOf(", "));
  await tapRow(() => page.locator(`[role=dialog] button[aria-label="${label}"]`).filter({ visible: true }).first());
  const manage = page.locator(`[role=dialog] button[aria-label="${en["bible.downloads.manageAria"].replace("{name}", name)}"]`);
  const failed = page.locator("[role=dialog]", { hasText: /Could not download|Not available to download/ });
  const t0 = Date.now();
  while (Date.now() - t0 < 90000 && !(await manage.count()) && !(await failed.count())) await page.waitForTimeout(500);
  const ok = (await manage.count()) > 0;
  downloaded.push(name);
  if (!ok) faults += 1;
  console.log(`${ok ? "ok   " : "FAULT"} downloaded ${name}${ok ? ` in ${Math.round((Date.now() - t0) / 100) / 10} s` : ` (${(await failed.count()) ? "the sheet said it failed" : "not on the phone after 90 s"}; the sheet offers: ${await offered()})`}`);
}
if (downloaded.length < 7) {
  faults += 1;
  console.log(`FAULT only ${downloaded.length} versions offered to download (the sheet offers: ${await offered()})`);
}
const statuses = [...new Set(answered.map((a) => a.split(" ")[0]))];
console.log(`${statuses.every((s) => s === "200") ? "ok   " : "FAULT"} the local web answered ${answered.length} requests: ${statuses.join(", ")}`);
if (!statuses.every((s) => s === "200")) faults += 1;
await closeSheets();

// No network: each version chosen, John 1 read from the phone.
online = false;
await ctx.setOffline(true);
for (const name of downloaded) {
  await openTranslations();
  await tapRow(() => page.locator("[role=dialog] button", { hasText: name }).filter({ visible: true }).first());
  await page.waitForTimeout(1800);
  await closeSheets();
  const verses = await page.locator("[data-verse]").count();
  const words = await page.evaluate(() => (document.querySelector("main")?.innerText ?? "").length);
  const ok = verses >= 20 && words > 1500;
  if (!ok) faults += 1;
  console.log(`${ok ? "ok   " : "FAULT"} offline, ${name}: John 1 ${ok ? `read from the phone (${verses} verses)` : `NOT read (${verses} verses, ${words} characters)`}`);
}

// Each removed from the phone.
for (const name of downloaded) {
  await openTranslations();
  const manage = page.locator(`[role=dialog] button[aria-label="${en["bible.downloads.manageAria"].replace("{name}", name)}"]`).first();
  if (!(await manage.count())) {
    faults += 1;
    console.log(`FAULT no options for ${name} (the sheet offers: ${await offered()})`);
    await closeSheets();
    continue;
  }
  await tapRow(() => manage);
  await page.waitForTimeout(500);
  const id = await manage.getAttribute("aria-controls");
  await tap(page.locator(`[id="${id}"] button`).first());
  await page.waitForTimeout(1200);
  const again = await page.locator(`[role=dialog] button[aria-label^="Download ${name}, "]`).count();
  if (!again) faults += 1;
  console.log(`${again ? "ok   " : "FAULT"} removed ${name}${again ? ", offered to download again" : ", STILL on the phone"}`);
  await closeSheets();
}
await browser.close();
console.log(faults ? `${faults} FAULT(S)` : "no faults");
process.exit(faults ? 1 : 0);
