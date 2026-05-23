import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

test("saint profile renders for John Chrysostom", async ({ page }) => {
 await page.goto("/saints/john-chrysostom");
 await expect(page.locator("body")).toContainText(/Chrysostom/i);
 await expect(page.locator("text=/Application error/i")).toHaveCount(0);
 await expectNoA11yViolations(page);
});
