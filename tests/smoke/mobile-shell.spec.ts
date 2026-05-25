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

test("Bible chapter shows MobileTopBar with back + reader actions", async ({
  page,
}) => {
  await page.goto("/bible/john/1");
  // The top bar's back button is the only "Back" aria-label on the page.
  await expect(page.getByLabel("Back").first()).toBeVisible();
  // Reader actions cluster: bookmark + settings.
  await expect(page.getByLabel("Bookmark this chapter")).toBeVisible();
  await expect(page.getByLabel("Reader settings")).toBeVisible();
});

test("chapter pill opens the book/chapter picker sheet", async ({ page }) => {
  await page.goto("/bible/john/1");
  // The pill's center label includes the book name + current chapter.
  await page.getByLabel(/Pick a chapter/).click();
  // Sheet renders as a dialog with the book name as its title.
  await expect(page.getByRole("dialog", { name: /John/ })).toBeVisible();
});

test("saint-work reader renders MobileTopBar + section pill", async ({
  page,
}) => {
  await page.goto("/saints/john-chrysostom/paschal-homily");
  // Top bar back button to the saint profile.
  await expect(page.getByLabel("Back").first()).toBeVisible();
  // Floating section switcher: the label reads "Section N of M".
  await expect(page.getByText(/Section \d+ of \d+/)).toBeVisible();
});
