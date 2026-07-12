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

test("focus mode hides the app chrome and the exit pill actually exits", async ({
 page,
}) => {
 // Regression guard: the platform-split layout rewrite dropped the
 // data-app-chrome tags, so focus mode stopped hiding the sticky header —
 // which then covered the "Exit focus" pill and swallowed its clicks.
 // Playwright's click() does real hit-testing, so this test fails if ANY
 // chrome ever paints over the pill again.
 await page.goto("/bible/john/1");
 const header = page.locator("[data-app-chrome] header").first();
 await expect(header).toBeVisible();

 // Enter focus via the desktop toolbar pill (hydration-safe re-click, same
 // pattern as the history cards).
 await expect(async () => {
 await page.getByRole("button", { name: "Focus reading" }).first().click();
 await expect(page.locator("html.reader-focus")).toHaveCount(1, {
 timeout: 1_500,
 });
 }).toPass({ timeout: 20_000 });
 await expect(header).toBeHidden();

 // The exit pill must be reachable by a REAL pointer click.
 await page.locator("[data-reader-exit]").click();
 await expect(page.locator("html.reader-focus")).toHaveCount(0);
 await expect(header).toBeVisible();
});
