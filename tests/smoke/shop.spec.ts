import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

/**
 * Shop smoke. The suite must stay green in BOTH database states:
 *   - migration applied + seeded (full catalog renders)
 *   - tables absent (graceful empty rails, no errors)
 * so catalog-dependent assertions are conditional on data being present.
 * Requires NEXT_PUBLIC_SHOP_ENABLED=1 at build time; when the flag is
 * off every /shop route 404s and this spec is skipped.
 */

test("shop home renders the marketplace shell", async ({ page }) => {
  const response = await page.goto("/shop");
  test.skip(response?.status() === 404, "shop flag is off in this build");

  await expect(page.locator("h1")).toContainText(/Icons for the life of prayer/);
  // Category chips exist and are tappable targets.
  await expect(
    page.locator('nav[aria-label="Browse by category"] a').first(),
  ).toBeVisible();
  // Request + Sell entry points.
  await expect(page.locator('a[href="/shop/request"]').first()).toBeVisible();
  await expect(page.locator('a[href="/shop/sell"]').first()).toBeVisible();
  // Operator decision (2026-07-05): EIKON's parent is not named anywhere.
  await expect(page.locator("body")).not.toContainText(
    "owned and operated by Purify",
  );
  await expect(page.locator("text=/Application error/i")).toHaveCount(0);
  await expectNoA11yViolations(page);
});

test("EIKON storefront tells its operational story without naming its parent", async ({
  page,
}) => {
  const response = await page.goto("/shop/eikon");
  test.skip(
    response?.status() === 404,
    "shop flag off or migration not applied in this environment",
  );

  // The storefront fetches live at runtime. When the catalog is unreachable
  // (key-less CI), the shell renders the graceful "Store not found" state —
  // that path is covered by the catalog fail-soft guarantees, not this spec.
  await expect(page.locator("h1").first()).toBeVisible();
  test.skip(
    /Store not found/i.test(await page.locator("h1").first().innerText()),
    "catalog unreachable in this environment",
  );

  await expect(page.locator("h1")).toContainText(/EIKON/);
  // Operator decision (2026-07-05): no Purify-ownership mentions.
  await expect(page.locator("body")).not.toContainText("A Purify store");
  await expect(page.locator("body")).not.toContainText(
    "owned and operated by Purify",
  );
  // The operational story, honestly told.
  await expect(page.locator("body")).toContainText(/inspected/i);
  // No review theatre: no stars, no ratings, nowhere.
  await expect(page.getByText(/\breviews\b/i)).toHaveCount(0);
  await expect(page.locator("text=/★|☆/")).toHaveCount(0);
  await expectNoA11yViolations(page);
});

test("product page discloses classification, dispatch, and representative image", async ({
  page,
}) => {
  const home = await page.goto("/shop");
  test.skip(home?.status() === 404, "shop flag is off in this build");

  const firstCard = page.locator('a[href^="/shop/icons/"]').first();
  const hasProducts = (await firstCard.count()) > 0;
  test.skip(!hasProducts, "no seeded products in this environment");

  await firstCard.click();
  await expect(page).toHaveURL(/\/shop\/icons\//);
  // Classification badge from the honest vocabulary.
  await expect(
    page.locator(
      "text=/Printed & Mounted|Standard Reproduction|Laminated Icon|Wooden Icon|Hand-Finished Reproduction/",
    ).first(),
  ).toBeVisible();
  // Availability + dispatch window.
  await expect(page.locator("text=/Ready to Ship|Special Order/").first()).toBeVisible();
  await expect(page.locator("text=/Dispatches in/").first()).toBeVisible();
  // Store identity without naming EIKON's parent.
  await expect(page.locator("body")).not.toContainText("owned and operated by Purify");
  await expect(page.locator("body")).toContainText("Sold by");
  // Checkout is dark in this phase: the buy bar shows the honest state.
  await expect(page.locator("text=/Checkout opens soon|Buy now/").first()).toBeVisible();
  await expectNoA11yViolations(page);
});

test("request an icon validates and explains itself", async ({ page }) => {
  const response = await page.goto("/shop/request");
  test.skip(response?.status() === 404, "shop flag is off in this build");

  await expect(page.locator("h1")).toContainText(/Request an icon/i);
  // No obligation language present.
  await expect(page.locator("body")).toContainText(/Nothing is purchased or promised/i);
  // Native validation blocks an empty submit (subject + email required).
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/shop\/request/);
  await expectNoA11yViolations(page);
});

test("sell on purify makes manual review unmistakable", async ({ page }) => {
  const response = await page.goto("/shop/sell");
  test.skip(response?.status() === 404, "shop flag is off in this build");

  await expect(page.locator("h1")).toContainText(/Sell on Purify/);
  await expect(page.locator("body")).toContainText(/reviewed by hand/i);
  await expect(page.locator("body")).toContainText(/nothing is published automatically/i);
  await expectNoA11yViolations(page);
});
