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

test("category page hydrates, loads its grid, and search narrows it", async ({
  page,
}) => {
  // Regression guard for the live-broken /shop/category/* pages: a
  // Suspense-wrapped client child failed to hydrate on the static export,
  // so the products fetch never fired and the page sat on its skeleton
  // forever. This asserts the grid actually renders and the search box —
  // proof the client component is alive — filters it.
  const response = await page.goto("/shop/category/all");
  test.skip(response?.status() === 404, "shop flag is off in this build");

  await expect(page.locator("h1")).toContainText(/All icons/);
  // A live search input proves hydration; a stuck page would have none.
  const search = page.locator('input[type="search"]');
  await expect(search).toBeVisible();

  // The grid must leave its skeleton and show real product links.
  const cards = page.locator('a[href^="/shop/icons/"]');
  await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  const total = await cards.count();
  expect(total).toBeGreaterThan(0);

  // Typing a term no product can match empties the grid (client filtering
  // is wired). Uses a nonsense token so it holds for any seed data.
  await search.fill("zzzznomatch");
  await expect(page.locator("body")).toContainText(/Nothing matches/i);

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
  // Flag-off builds cannot render the DYNAMIC shop segments at all: with no
  // store slugs enumerable at build (key-less env), the request becomes
  // on-demand static generation, and the shop layout's notFound() there is
  // DYNAMIC_SERVER_USAGE — a 500, not a 404. Reproduced against a
  // CI-identical local build 2026-07-11; unreachable in prod (flag on renders
  // 200 for unknown slugs, verified live). Residual tracked in the audit
  // ledger under F-15.
  test.skip(
    (response?.status() ?? 0) >= 500,
    "dynamic shop segments are unrenderable in flag-off environments",
  );

  // The storefront fetches live at runtime. When the shop backend is
  // unreachable (key-less CI) the shell renders one of two graceful states
  // instead of the storefront: "Store not found" (API answered 404) or
  // ShopError with a retry button (API errored — CI #319 landed here, the
  // placeholder-env API route dies before it can 404). Both are covered by
  // the catalog fail-soft guarantees, not this spec.
  const h1 = page.locator("h1").first();
  const retry = page.getByRole("button", { name: /Try again/i });
  await expect(h1.or(retry).first()).toBeVisible();
  test.skip(
    (await retry.count()) > 0 ||
      /Store not found/i.test(await h1.innerText().catch(() => "")),
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

  // The 2026-07-05 decision was "no review theatre: no stars, no ratings,
  // nowhere", and this asserted the storefront never said "reviews" at
  // all. Reviews v2 (6c7d3007) then shipped store-level reviews behind a
  // delivery gate on purpose, which is the real-reviewer answer to the
  // same concern, and the owner confirmed on 2026-08-01 that the feature
  // stands and this assertion was the stale half.
  //
  // What is still asserted is the part that was actually objected to:
  // decorative star glyphs, and any invitation to review from someone who
  // has not bought. NOTE this does NOT assert that every displayed review
  // has an order behind it. It cannot: the store-reviews read path returns
  // every row for the store with no delivery filter, so an admin-seeded
  // row is shown with a verified-buyer badge. Logged in the audit ledger.
  await expect(page.locator("text=/★|☆/")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /post your review|submit review/i }),
  ).toHaveCount(0);
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
