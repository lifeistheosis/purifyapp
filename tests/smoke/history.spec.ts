import { test, expect, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

/**
 * Tap a row of the timeline until what it opens is open (1.7). A tap that
 * lands before React hydrates is a plain link and navigates instead, or is
 * swallowed; retrying until the state sticks makes the intent the assertion
 * instead of the single tap: the exact 60s flake on CI #318 that the old
 * card's expandCard answered the same way.
 *
 * On a phone a row opens the event's peek sheet; on a computer it chooses
 * the event for the rail beside the line.
 */
async function openRow(page: Page, slug: string, opened: () => Promise<void>) {
  const row = page.locator(`#event-${slug} a[href='/history/${slug}']`);
  await expect(async () => {
    if (!new URL(page.url()).pathname.startsWith("/history/")) {
      await row.click();
    } else {
      await page.goBack();
    }
    await opened();
  }).toPass({ timeout: 20_000 });
}

test("the timeline: its eras pinned, its events on one line", async ({ page }) => {
  await page.goto("/history");
  await expect(page.locator("h1")).toContainText(/story of the Church/i);
  await expect(page.locator("#era-apostolic")).toBeVisible();
  await expect(page.locator("#event-pentecost")).toBeVisible();
  // Each event wears the drawn mark, never a coloured dot.
  await expect(page.locator("#event-pentecost [data-timeline-node]")).toHaveCount(1);
  // The era's name pins under the bar.
  const sticky = await page.locator(".history-era-head").first().evaluate((el) => getComputedStyle(el).position);
  expect(sticky).toBe("sticky");
  await expect(page.locator("text=/Application error/i")).toHaveCount(0);
  await expectNoA11yViolations(page);
});

test("a row chooses the event for the rail on a computer, and the rail opens it", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/history");
  const rail = page.locator("aside a[href='/history/first-council-of-nicaea']");
  await openRow(page, "first-council-of-nicaea", async () => {
    await expect(rail).toBeVisible({ timeout: 1_000 });
  });
  await rail.click();
  await expect(page).toHaveURL(/\/history\/first-council-of-nicaea/);
  await expect(page.locator("h1")).toContainText(/Nicaea/);
});

test("a row opens its peek sheet on a phone, and the sheet opens the account", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/history");
  const sheet = page.locator("[data-event-peek='fall-of-constantinople']");
  await openRow(page, "fall-of-constantinople", async () => {
    await expect(sheet).toBeVisible({ timeout: 1_000 });
  });
  await sheet.locator("a[href='/history/fall-of-constantinople']").click();
  await expect(page).toHaveURL(/fall-of-constantinople/);
  // Back is the timeline again, with the row there.
  await page.goBack();
  await expect(page).toHaveURL(/\/history(\?|$|\/$)/);
  await expect(page.locator("#event-fall-of-constantinople")).toBeVisible();
});

test("an event's page: four parts, how sure we are, its sources, and JSON-LD", async ({ page }) => {
  await page.goto("/history/great-schism-1054");
  await expect(page.locator("h1")).toContainText(/1054/);
  for (const part of [/what happened/i, /why it matters/i, /the people/i, /sources/i]) {
    await expect(page.getByRole("region", { name: part })).toHaveCount(1);
  }
  await expect(page.getByRole("region", { name: /sources/i }).locator("li").first()).toBeVisible();
  await expect(page.locator("body")).toContainText(/Historically attested/i);
  const jsonLd = await page.locator("script[type='application/ld+json']").textContent();
  expect(jsonLd).toContain('"@type":"Article"');
  await expectNoA11yViolations(page);
});

test("filters narrow the timeline and are URL-backed", async ({ page }) => {
  await page.goto("/history?cat=councils");
  // Only council-category events remain; a non-council event is absent.
  await expect(page.locator("#event-first-council-of-nicaea")).toBeVisible();
  await expect(page.locator("#event-alaska-mission")).toHaveCount(0);
});
