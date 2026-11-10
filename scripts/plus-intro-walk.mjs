// Plus, introduced once (1.9, his 111), pictured from the export for his OK
// before it is switched on for readers (lib/onboarding/flags.ts,
// PLUS_INTRO_LIVE). The rules are held by
// lib/onboarding/__tests__/plusIntro.test.ts; this reads what is drawn.
//
// The card is shut for readers, so it is reached the way an admin reaches
// it: Testers mode, with the test's "card" version picked. Four roads, each
// with its own feature, then the tap: the Plus sheet opens straight on that
// feature's Try it. And a reader not in Testers mode is drawn no card.
//
//   npm run build:android, then: node scripts/plus-intro-walk.mjs [--stills dir]

import fs from "node:fs";
import path from "node:path";

import { go } from "./lib/shell-server.mjs";
import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";

const argv = process.argv.slice(2);
const stillsAt = argv.indexOf("--stills");
const STILLS = stillsAt >= 0 ? path.resolve(argv[stillsAt + 1]) : null;
if (STILLS) fs.mkdirSync(STILLS, { recursive: true });

const TESTING = { "purify:testers": "{}", "purify:ab.pick": JSON.stringify({ "plus-introduced": "card" }) };
const ROADS = [
  ["catholic", { "purify:background": "catholic", "purify:level": "inquirer" }, "The story of the Church, in full"],
  ["practicing", { "purify:background": "orthodox", "purify:level": "practicing" }, null],
  ["protestant", { "purify:background": "protestant", "purify:level": "inquirer" }, null],
  ["catechumen", { "purify:background": "catholic", "purify:level": "learning" }, null],
];

const results = [];
const say = (ok, what) => {
  results.push(ok);
  console.log(`${ok ? "pass" : "FAIL"} ${what}`);
};
let browser;
async function phone(set) {
  const opened = await openPhone({ scale: STILLS ? 2 : 1, set, browser });
  browser = opened.browser;
  await opened.page.emulateMedia({ reducedMotion: "reduce" });
  return opened;
}
const launched = (page) =>
  page
    .waitForFunction(() => {
      const f = document.querySelector("[data-launch-frame]");
      return !f || getComputedStyle(f).display === "none" || Number(getComputedStyle(f).opacity) === 0;
    }, null, { timeout: 30000 })
    .catch(() => {});
const CARD = '[data-road-card="plus-intro"]';

for (const [road, answers] of ROADS) {
  // Past the first week's card: its seven steps are behind this reader.
  const { ctx, page } = await phone({ ...answers, ...TESTING, "purify:fasting-rule": "hidden" });
  await go(page, "/");
  const card = page.locator(CARD);
  const up = await card.waitFor({ timeout: 30000 }).then(() => true, () => false);
  await launched(page);
  say(up, `${road}: the card is drawn for a tester who picked it`);
  if (up) {
    const words = (await card.innerText()).replace(/\s+/g, " ");
    say(/Purify Plus/.test(words) && /Try it/.test(words), `${road}: it wears the Plus mark and offers Try it ("${words.slice(0, 70)}")`);
    if (STILLS) {
      // Clear of the Testers mark, which floats at the foot of the screen.
      await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(600);
      await card.screenshot({ path: path.join(STILLS, `card-${road}.png`) });
      say(printMockCheck(await checkMock(page, CARD), `card-${road}.png`), `the house's rules on card-${road}.png`);
      if (road === "catholic") await page.screenshot({ path: path.join(STILLS, "today-with-card.png") });
    }
    if (road === "catholic") {
      await card.getByRole("button", { name: "Try it", exact: true }).click();
      const sheet = page.locator('[role="dialog"]').first();
      const opened = await sheet.waitFor({ timeout: 20000 }).then(() => true, () => false);
      await page.waitForTimeout(1500);
      say(opened, "the tap opens the Plus sheet");
      // Testers mode's own mark steps aside while a sheet is open, so it never covers the sheet's buttons.
      say(!(await page.locator(".testers-mark").isVisible()), "the Testers mark steps aside while the sheet is open");
      say((await page.locator(CARD).count()) === 0, "tapped, the card is gone");
      if (STILLS && opened) await page.screenshot({ path: path.join(STILLS, "tried.png") });
      // The sheet closed, as a reader closes it.
      await page.keyboard.press("Escape");
      await sheet.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
      await go(page, "/");
      await page.waitForTimeout(2500);
      say((await page.locator(CARD).count()) === 0, "and it does not come back");
      say(await page.locator(".testers-mark").isVisible(), "the Testers mark is back once the sheet is closed");
    }
  }
  await ctx.close();
}

// On an iPhone: the same card. Plus is locked and sold there too, and the
// card follows the app's own gate, never the kind of phone.
{
  const { ctx, page } = await phone({ "purify:background": "catholic", "purify:level": "inquirer", ...TESTING });
  await ctx.addInitScript(() => {
    window.webkit = { messageHandlers: { bridge: { postMessage() {} } } };
    window.Capacitor = { getPlatform: () => "ios", isNativePlatform: () => true };
  });
  await go(page, "/");
  const up = await page.locator(CARD).waitFor({ timeout: 30000 }).then(() => true, () => false);
  say(up && (await page.evaluate(() => window.Capacitor?.getPlatform?.())) === "ios", "on an iPhone: the card is drawn there too");
  await ctx.close();
}

// A reader, not a tester: no card, since it is shut.
{
  const { ctx, page } = await phone({ "purify:background": "catholic", "purify:level": "inquirer", "purify:onboarded.day": "2026-01-01" });
  await go(page, "/");
  await page.waitForTimeout(4000);
  say((await page.locator(CARD).count()) === 0, "a reader, a year after the questions: no card while it is shut");
  await ctx.close();
}

await browser?.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
