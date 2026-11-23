// The gate's probe for Find a parish (the owner's yes of 2026-11-23; docs/plans/onboarding-2.0.md,
// "Where the roads end"). Asked of the export in out/, as a reader on the Android shell at phone
// size, with real touch:
//
//   1. Coming to the page from inside Purify (Discover, then the page's own tile), is the reader's
//      own region first from the page's first frame? Told by the device's time zone: New York,
//      London, Paris, Sydney, and Tokyo, which has no region and keeps the page's own order.
//   2. Opened from outside (the document itself loads on the page), does a reader in London get the
//      page's own order, and does nothing move after it is drawn?
//   3. Is the guide's card over the directories, does a finger's tap on it open the guide to a
//      first Liturgy in the house's motion, and does Back bring the reader to where they were?
//   4. Does every directory still open outside Purify, over https?
//
// Run from the repository's root on the export in out/; writes nothing.
//   node scripts/gate/parish-door.mjs
import fs from "node:fs";

import { chromium } from "playwright";

import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, ORIGIN, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { asAndroidShell } from "../lib/sells-plus.mjs";

const OWN = "/opt/pw-browsers/chromium";
const OUT = new URL("../../out", import.meta.url).pathname;
if (!fs.existsSync(`${OUT}/index.html`)) {
  console.error(`no export in ${OUT}: cut one first (node scripts/gate/export.mjs)`);
  process.exit(1);
}

/** The regions' labels as the page says them, in the page's own order. */
const OWN_ORDER = ["North America", "United Kingdom and Ireland", "Western Europe", "Australia and New Zealand"];
const FIRST = {
  "America/New_York": "North America",
  "Europe/London": "United Kingdom and Ireland",
  "Europe/Paris": "Western Europe",
  "Australia/Sydney": "Australia and New Zealand",
  "Asia/Tokyo": "North America",
};
/** What a new reader's phone keeps once the questions are done, so no sheet stands over the page. */
const KEPT = { "purify:onboarded": "4", "purify:level": "inquirer", "purify:depth": "inquirer", "purify:background": "catholic", "purify:intent": "quiet", "purify:intents": '["quiet"]', "purify:whatsNewSeen": "99" };

const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
let faults = 0;
const fault = (why) => {
  faults++;
  console.log(`    NO   ${why}`);
};
const ok = (what) => console.log(`    ok   ${what}`);

async function reader(zone, motion = "on") {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, locale: "en-US", timezoneId: zone, ...motionOptions(motion) });
  await pinMotion(ctx, motion);
  await ctx.addInitScript((kept) => {
    try {
      for (const [k, v] of Object.entries(kept)) localStorage.setItem(k, v);
    } catch {}
    // What the page notes of itself from its first moment: every frame's order of regions, and every shift.
    window.__door = { orders: [], shifts: 0, transitions: 0 };
    const own = document.startViewTransition?.bind(document);
    if (own)
      document.startViewTransition = (update) => {
        window.__door.transitions++;
        return own(update);
      };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__door.shifts += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    const look = () => {
      const labels = [...document.querySelectorAll('[id^="parishes-"]')].map((x) => x.textContent.trim());
      if (labels.length) {
        const said = labels.join(" | ");
        if (window.__door.orders[window.__door.orders.length - 1] !== said) window.__door.orders.push(said);
      }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  }, KEPT);
  await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  return ctx;
}

console.log("Find a parish: as a reader on the Android shell at 390 by 844, with touch");

// 1. From inside Purify.
console.log("\n  1. Coming to the page from Discover");
for (const [zone, first] of Object.entries(FIRST)) {
  const ctx = await reader(zone);
  const page = await ctx.newPage();
  await go(page, "/discover/", { timeout: 30000 });
  const tile = page.locator('a[href="/parishes/"], a[href="/parishes"]').first();
  await tile.waitFor({ state: "attached", timeout: 30000 });
  await tile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await tile.tap();
  await page.locator('[id^="parishes-"]').first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(2500);
  const seen = await page.evaluate(() => ({ orders: window.__door.orders, path: location.pathname }));
  const want = [first, ...OWN_ORDER.filter((x) => x !== first)].join(" | ");
  if (seen.orders.length === 1 && seen.orders[0] === want) ok(`${zone}: ${first} first, from the page's first frame`);
  else fault(`${zone}: the regions were drawn as ${JSON.stringify(seen.orders)}, not once as "${want}"`);
  await ctx.close();
}

// 2. Opened from outside. The shell's own way in (go) loads the document on the app's first page and
// moves to the page asked for from inside, as the apps do, so the document is loaded on the page itself here.
console.log("\n  2. Opened from outside (the document loads on the page)");
{
  const ctx = await reader("Europe/London");
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/parishes/`, { waitUntil: "load", timeout: 120000 });
  await page.locator('[id^="parishes-"]').first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(4000);
  const seen = await page.evaluate(() => window.__door);
  if (seen.orders.length === 1 && seen.orders[0] === OWN_ORDER.join(" | ")) ok("a reader in London keeps the page's own order, drawn once");
  else fault(`the regions were drawn as ${JSON.stringify(seen.orders)}`);
  if (seen.shifts < 0.001) ok("nothing moved after the page was drawn");
  else fault(`the page moved after it was drawn (layout shift ${seen.shifts.toFixed(4)})`);
  await ctx.close();
}

// 3. The guide's card, and 4. the directories.
console.log("\n  3. The guide's card");
{
  const ctx = await reader("America/New_York");
  const page = await ctx.newPage();
  await go(page, "/discover/", { timeout: 30000 });
  const tile = page.locator('a[href="/parishes/"], a[href="/parishes"]').first();
  await tile.waitFor({ state: "attached", timeout: 30000 });
  await tile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await tile.tap();
  const card = page.locator("[data-parish-guide]");
  await card.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(2000);
  const g = await page.evaluate(() => {
    const c = document.querySelector("[data-parish-guide]").getBoundingClientRect();
    const first = document.querySelector('[id^="parishes-"]').getBoundingClientRect();
    const leaving = [...document.querySelectorAll("p")].find((p) => /leave Purify/.test(p.textContent))?.getBoundingClientRect();
    const floor = Math.min(innerHeight, ...[...document.querySelectorAll('[data-screen-edge="bottom"]')].map((x) => x.getBoundingClientRect().top));
    return { top: Math.round(c.top), bottom: Math.round(c.bottom), height: Math.round(c.height), firstRegion: Math.round(first.top), leaving: leaving ? Math.round(leaving.top) : null, floor: Math.round(floor), words: document.querySelector("[data-parish-guide]").innerText.replace(/\s+/g, " ").trim(), x: c.left + c.width / 2, y: c.top + c.height / 2 };
  });
  console.log(`    the card from ${g.top} to ${g.bottom} (${g.height} high), the line about leaving at ${g.leaving}, the first region at ${g.firstRegion}, the tab bar's top at ${g.floor}`);
  if (g.words === "Your first Liturgy What to know before you go, and what you will see, one card at a time.") ok("it says the week's own words for the guide");
  else fault(`it says "${g.words}"`);
  if (g.bottom <= g.floor && g.leaving !== null && g.bottom < g.leaving && g.leaving < g.firstRegion) ok("it stands whole on the first screen, over the line about leaving and the directories");
  else fault("the card is not whole over the line about leaving and the directories on the first screen");
  if (g.height >= 44) ok(`a target ${g.height} high`);
  else fault(`a target only ${g.height} high`);
  await page.evaluate(() => (window.__door.transitions = 0));
  await page.touchscreen.tap(g.x, g.y);
  await page.waitForTimeout(2500);
  const there = await page.evaluate(() => ({ path: location.pathname, h1: document.querySelector("h1, h2")?.textContent ?? "", transitions: window.__door.transitions }));
  if (there.path.replace(/\/$/, "") === "/start/first-liturgy") ok(`a tap opens the guide (${there.path})`);
  else fault(`a tap went to ${there.path}`);
  if (there.transitions > 0) ok("the page changed in the house's motion");
  else fault("the page changed with a cut: no transition began");
  await page.goBack();
  await page.waitForTimeout(2500);
  const back = await page.evaluate(() => ({ path: location.pathname, card: !!document.querySelector("[data-parish-guide]"), y: Math.round(scrollY) }));
  if (back.path.replace(/\/$/, "") === "/parishes" && back.card && back.y === 0) ok("Back returns to Find a parish, where the reader was");
  else fault(`Back went to ${back.path} at ${back.y}, the card ${back.card ? "there" : "gone"}`);

  console.log("\n  4. The directories");
  const links = await page.evaluate(() => [...document.querySelectorAll('section[aria-labelledby^="parishes-"] a')].map((a) => ({ href: a.getAttribute("href"), target: a.getAttribute("target"), rel: a.getAttribute("rel") })));
  const bad = links.filter((l) => !/^https:\/\//.test(l.href ?? "") || l.target !== "_blank" || !/noopener/.test(l.rel ?? ""));
  if (links.length >= 20 && !bad.length) ok(`${links.length} directories, each over https and each opening outside Purify`);
  else fault(`${bad.length} of ${links.length} directories do not open outside Purify over https`);
  await ctx.close();
}

await browser.close();
console.log(faults ? `\nFind a parish: ${faults} fault${faults === 1 ? "" : "s"}` : "\nFind a parish: the reader's region first with nothing moved, and the way on to the guide");
process.exit(faults ? 1 : 0);
