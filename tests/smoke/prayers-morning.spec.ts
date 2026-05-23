import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

test("morning prayer renders the rule", async ({ page }) => {
 await page.goto("/prayers/morning");
 // The morning rule opens with the sign of the cross or the Trisagion.
 await expect(page.locator("body")).toContainText(/God|Father|Lord/i);
 await expect(page.locator("text=/Application error/i")).toHaveCount(0);
 await expectNoA11yViolations(page);
});
