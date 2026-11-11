// The end of a rule as build 93 note 14 built it (it began as the plan's
// still, which laid the proposed lampada on the page; the arbiter's yes came
// at 04:05 UTC on 2026-11-11 and the end is the app's own now,
// components/prayers/service/RuleEnd.tsx). Evening Prayers carried to its end
// on the native export, where the rule completes and the end answers; held
// to checkMock on all five palettes, and one still (scale 2).
//
//   npm run build:android && node scripts/mock-rule-complete.mjs [out.png]
import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

// A still of its own name: never written over one in docs (the arbiter, 2026-11-10).
const shot = process.argv[2] ?? "rule-complete.png";

const { browser, page } = await openPhone({ scale: 2, set: { "purify.motion": "on" } });
let ok = false;
try {
  await go(page, "/");
  await go(page, "/prayers/evening/");
  await page.waitForSelector("[data-prayer-reader] [data-step]", { timeout: 20000 });
  // Down through the rule to its end, a screen at a time, as a reader goes.
  for (let k = 0; k < 60; k++) {
    await page.evaluate(() => window.scrollBy({ top: 420, behavior: "instant" }));
    await page.waitForTimeout(120);
  }
  await page.waitForSelector("[data-rule-end] [data-rule-complete-words]", { timeout: 10000 });
  // The moment's own time, then at rest.
  await page.waitForTimeout(2200);

  ok = printMockCheck(await checkMock(page, "[data-rule-end]"), "the end of a rule, at rest (build 93 note 14)");

  // The end in the middle of the screen, as a reader who has just finished sees it.
  await page.evaluate(() => {
    const box = document.querySelector("[data-rule-end]").getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + box.top + 120 - window.innerHeight * 0.45, behavior: "instant" });
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: shot });
  console.log(`\nStill: ${shot}`);
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
