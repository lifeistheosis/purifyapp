import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

const paths = ["/about", "/whats-new", "/privacy", "/support"] as const;

for (const path of paths) {
 test(`${path} loads and is accessible`, async ({ page }) => {
 const resp = await page.goto(path);
 expect(resp?.status(), `${path} HTTP status`).toBeLessThan(400);
 await expect(page.locator("text=/Application error/i")).toHaveCount(0);
 // /support embeds the Buy Me a Coffee iframe — exclude third-party content.
 const exclude = path === "/support" ? ["iframe"] : [];
 await expectNoA11yViolations(page, { exclude });
 });
}

test("/support renders all three donate paths", async ({ page }) => {
  // Regression for the 2026-06-11 community report of an unresponsive
  // donation flow: every giving path must render as a real external
  // link. Destination liveness is checked manually, not here.
  await page.goto("/support");
  for (const host of ["cash.app", "paypal.com", "buymeacoffee.com"]) {
    const link = page.locator(`a[href*="${host}"]`).first();
    await expect(link, `${host} donate link`).toBeVisible();
    await expect(link).toHaveAttribute("target", "_blank");
  }
});

test("/privacy mentions the recorded fields", async ({ page }) => {
 await page.goto("/privacy");
 const text = await page.locator("body").innerText();
 // Must accurately describe what /api/track records.
 expect(text).toMatch(/session/i);
 expect(text).toMatch(/path/i);
 expect(text).toMatch(/user-agent/i);
 expect(text).toMatch(/Supabase/);
 expect(text).toMatch(/API\.Bible/);
 // And how long it is kept: no 90-day deletion runs, so the page may
 // not promise one (it did until 2026-10-29).
 expect(text).toMatch(/Nothing deletes them on a schedule/);
 expect(text).not.toMatch(/older than 90 days/);
});
