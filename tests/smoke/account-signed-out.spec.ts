import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

test("/account renders or redirects cleanly when signed out", async ({ page }) => {
 const resp = await page.goto("/account");
 // Either a normal render of the signed-out state or a redirect — both are
 // fine. What we're guarding against is a 500.
 expect(resp?.status(), "/account HTTP status").toBeLessThan(500);
 await expect(page.locator("text=/Application error/i")).toHaveCount(0);
 await expectNoA11yViolations(page);
});
