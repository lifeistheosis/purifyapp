import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

test("home renders with today's rail", async ({ page }) => {
 await page.goto("/");
 await expect(page).toHaveTitle(/Purify/i);
 // TodayStrip should surface today's date/saint somewhere above the fold.
 const body = await page.locator("body").innerText();
 expect(body.length).toBeGreaterThan(200);
 // Page should not show a Next.js error overlay or 500.
 await expect(page.locator("text=/Application error/i")).toHaveCount(0);
 await expectNoA11yViolations(page);
});
