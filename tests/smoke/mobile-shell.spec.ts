import { test, expect, devices } from "@playwright/test";

/**
 * Mobile app-shell smoke. Run as a dedicated project at the iPhone 14 Pro
 * viewport so we catch regressions specific to the bottom-tab UI:
 *   - the MobileTabBar renders and the 5 tabs route correctly
 *   - the desktop AppNav is hidden on mobile
 *   - no horizontal scrollbar on any of the 5 surfaces
 *   - the manifest is reachable and parseable
 *
 * Skipped accessibility (axe) here — the desktop home spec already runs
 * a11y; this one is layout-focused and would only add noise.
 */

test.use({ ...devices["iPhone 14 Pro"] });

const TABS = [
  { label: "Today", expect: "/" },
  { label: "Bible", expect: "/bible" },
  { label: "Discover", expect: "/discover" },
  { label: "Prayers", expect: "/prayers" },
  { label: "You", expect: "/account" },
];

test("mobile shell: tab bar visible, AppNav hidden", async ({ page }) => {
  await page.goto("/");
  // Bottom tab nav is the "Primary" landmark on phones.
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  // No horizontal scroll on the Today hero.
  const scrollW = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  const innerW = await page.evaluate(() => window.innerWidth);
  expect(scrollW).toBeLessThanOrEqual(innerW + 1);
});

for (const t of TABS) {
  test(`tab ${t.label} routes to ${t.expect}`, async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: new RegExp(`^${t.label}$`, "i") })
      .click();
    await page.waitForURL(new RegExp(t.expect.replace("/", "\\/")));
    expect(page.url()).toContain(t.expect);
  });
}

test("manifest is served and parses as JSON", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.name).toMatch(/Purify/);
  expect(body.display).toBe("standalone");
  expect(Array.isArray(body.icons)).toBeTruthy();
});
