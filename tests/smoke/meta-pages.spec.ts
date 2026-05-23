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

test("/privacy mentions the recorded fields", async ({ page }) => {
 await page.goto("/privacy");
 const text = await page.locator("body").innerText();
 // Must accurately describe what /api/track records.
 expect(text).toMatch(/session/i);
 expect(text).toMatch(/path/i);
 expect(text).toMatch(/user-agent/i);
 expect(text).toMatch(/Supabase/);
 expect(text).toMatch(/API\.Bible/);
 expect(text).toMatch(/90 days/);
});
