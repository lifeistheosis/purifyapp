import { test, expect, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

/**
 * Expand an event card and PROVE it stayed expanded. A click that lands
 * before React hydrates is swallowed (or rolled back to the server-rendered
 * collapsed state), after which the link click spends the whole test timeout
 * under a collapsed card's toggle — the exact 60s flake on CI #318 and in
 * local runs. Re-clicking until aria-expanded sticks makes the intent
 * ("expanded") the assertion instead of the single click.
 */
async function expandCard(page: Page, cardId: string) {
  const toggle = page.locator(`#${cardId} button[aria-expanded]`);
  await expect(async () => {
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "true", {
      timeout: 1_000,
    });
  }).toPass({ timeout: 20_000 });
}

test("history timeline renders eras, events, and controls", async ({ page }) => {
 await page.goto("/history");
 await expect(page.locator("h1")).toContainText(/story of the Church/i);
 await expect(page.locator("#era-apostolic")).toBeVisible();
 await expect(page.locator("#event-pentecost")).toBeVisible();
 // The scrubber is a real range input, accessible without dragging.
 await expect(page.locator(".history-scrubber").first()).toBeVisible();
 await expect(page.locator("text=/Application error/i")).toHaveCount(0);
 await expectNoA11yViolations(page);
});

test("event card expands and links to the event page", async ({ page }) => {
 await page.goto("/history");
 const card = page.locator("#event-first-council-of-nicaea");
 await expandCard(page, "event-first-council-of-nicaea");
 await expect(card.locator("a[href='/history/first-council-of-nicaea']")).toBeVisible();
 await card.locator("a[href='/history/first-council-of-nicaea']").click();
 await expect(page).toHaveURL(/\/history\/first-council-of-nicaea/);
 await expect(page.locator("h1")).toContainText(/Nicaea/);
});

test("event deep link renders sources, certainty, and JSON-LD", async ({ page }) => {
 await page.goto("/history/great-schism-1054");
 await expect(page.locator("h1")).toContainText(/1054/);
 await expect(page.locator("section[aria-label='Sources'] li").first()).toBeVisible();
 await expect(page.locator("body")).toContainText(/Historically Attested/i);
 const jsonLd = await page.locator("script[type='application/ld+json']").textContent();
 expect(jsonLd).toContain('"@type":"Article"');
 await expectNoA11yViolations(page);
});

test("filters narrow the timeline and are URL-backed", async ({ page }) => {
 await page.goto("/history?cat=councils");
 // Only council-category cards remain; a non-council event is absent.
 await expect(page.locator("#event-first-council-of-nicaea")).toBeVisible();
 await expect(page.locator("#event-alaska-mission")).toHaveCount(0);
});

test("browser back returns to the timeline", async ({ page }) => {
 await page.goto("/history");
 await expandCard(page, "event-fall-of-constantinople");
 await page.locator("#event-fall-of-constantinople a[href='/history/fall-of-constantinople']").click();
 await expect(page).toHaveURL(/fall-of-constantinople/);
 await page.goBack();
 // Expanding a card writes ?e=<event> into the URL (URL-backed card state),
 // so back lands on the timeline WITH that param — the card comes back open.
 await expect(page).toHaveURL(/\/history(\?|$)/);
 await expect(page.locator("#event-fall-of-constantinople")).toBeVisible();
});
