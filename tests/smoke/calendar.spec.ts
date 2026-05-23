import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

test("calendar renders the month grid", async ({ page }) => {
 await page.goto("/calendar");
 await expect(page.locator("body")).toContainText(/Pascha|fast|feast/i);
 await expect(page.locator("text=/Application error/i")).toHaveCount(0);
 await expectNoA11yViolations(page);
});

test("calendar deep link selects the right day", async ({ page }) => {
 await page.goto("/calendar?d=2026-04-12");
 await expect(page.locator("body")).toContainText(/April|Apr/);
 await expectNoA11yViolations(page);
});
