// The For the living sheet as build 89 note 11 redrew it, opened on the
// native export the way a reader opens it, held to checkMock on all five
// palettes, and one still for the owner (scale 2), with the nameday's choice
// open on the sixth of December and the relationship chosen.
//
//   npm run build:android && node scripts/mock-for-the-living.mjs [out.png]
import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const shot = process.argv[2] ?? "docs/1.9-build/notes/build-89/11-for-the-living-redesign.png";
const { browser, page } = await openPhone({ scale: 2 });
let ok = false;
try {
  await go(page, "/prayers/personal/#morning");
  await page.waitForSelector("[data-mine-ways]", { timeout: 20000 });
  // For the living's Add: the last medallion of the first list.
  await page.locator('[data-names="living"] [data-medallion-add]').click();
  const sheet = page.locator("[role=dialog]:has([data-name-form])");
  await sheet.waitFor({ timeout: 10000 });
  await sheet.locator("input").first().fill("Nicholas");
  await sheet.locator("[role=radiogroup] [role=radio]").nth(4).click();
  await sheet.locator("[data-nameday-row]").click();
  await sheet.locator("[data-nameday-choice] [role=radiogroup]").first().locator("[role=radio]").nth(11).click();
  await sheet.locator("[data-nameday-choice] [role=radiogroup]").nth(1).locator("[role=radio]").nth(5).click();
  await page.waitForTimeout(600);
  ok = printMockCheck(await checkMock(page, "[role=dialog]:has([data-name-form])"), "the For the living sheet");
  // The house's quiet focus on a tapped field, and typing with a space keeps it (note 11's standard).
  const name = sheet.locator("input").first();
  const edge = () => name.evaluate((el) => ({ input: document.documentElement.dataset.input, width: getComputedStyle(el).outlineWidth, color: getComputedStyle(el).outlineColor }));
  await page.locator("[data-name-form] p").first().tap();
  await name.tap();
  const first = await edge();
  await page.keyboard.type(" of Myra");
  await page.waitForTimeout(450);
  const settled = await edge();
  const alpha = (c) => Number((/\/\s*([\d.]+)\)\s*$/.exec(c) ?? [0, 1])[1]);
  console.log(`\nA tapped field: at once ${JSON.stringify(first)}; after typing with a space ${JSON.stringify(settled)}`);
  ok = ok && first.input === "pointer" && first.width === "1px" && alpha(first.color) <= 0.33 && settled.input === "pointer" && settled.width === "1px" && Math.abs(alpha(settled.color) - 0.32) < 0.02;
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  // The whole sheet in one picture: a phone as tall as the sheet.
  await page.setViewportSize({ width: 390, height: 1900 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot });
  console.log(`\nStill: ${shot}`);
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
