import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

test("bible reader renders John 1 with chapter content", async ({ page }) => {
 await page.goto("/bible/john/1");
 // The opening of John 1 in any English translation contains "the Word".
 await expect(page.locator("body")).toContainText(/the Word/i, { timeout: 10_000 });
 // Look for a verse marker (1 or any digit at start of a verse).
 await expect(page.locator("body")).toContainText(/1/);
 await expectNoA11yViolations(page);
});
