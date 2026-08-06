import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

// The web's only Today surface had no automated coverage at all, which is
// how it kept text-paper/40 (3.82:1) as its entire labelling system and
// shipped eight unheaded sections.
test("today's prayer renders the day and is clean", async ({ page }) => {
  await page.goto("/prayers/today");
  await expect(page.locator("text=/Application error/i")).toHaveCount(0);

  // The <h1> holds a non-breaking space until useToday() resolves on the
  // client, so wait for the real dateline rather than for the element.
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
    /^[\s ]*$/,
  );

  // The verse of the day is server-rendered; it is the one block that was
  // missing from this page entirely.
  await expect(page.getByRole("heading", { name: /verse of the day/i })).toBeVisible();

  await expectNoA11yViolations(page);
});
