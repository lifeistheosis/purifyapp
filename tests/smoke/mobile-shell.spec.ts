import { test, expect, devices } from "@playwright/test";
import { NATIVE_UA_TOKEN } from "@/lib/platform/token";

/**
 * Mobile app-shell smoke. Run as a dedicated project at the iPhone 14 Pro
 * viewport so we catch regressions specific to the bottom-tab UI:
 *   - the MobileTabBar renders and the 5 tabs route correctly (native shell)
 *   - mobile WEB gets the marketing home with no tab bar
 *   - no horizontal scrollbar on any of the 5 surfaces
 *   - the manifest is reachable and parseable
 *
 * Since the platform split (56a5875, "split mobile web from the Android app
 * shell"), the tab-bar shell is NATIVE-ONLY: WebOnly/NativeOnly gates over
 * useIsNative() give every browser — including mobile web — the marketing
 * site, and the app shell mounts only inside the Capacitor shell. The shell
 * tests below emulate that shell the same way capacitor.config.ts announces
 * it: by appending NATIVE_UA_TOKEN to the WebView user-agent, which is one
 * of the two signals isNativeClient() accepts (the other, window.Capacitor,
 * doesn't exist in a plain browser).
 *
 * Skipped accessibility (axe) here — the desktop home spec already runs
 * a11y; this one is layout-focused and would only add noise.
 */

// Device emulation comes from the mobile-shell project in
// playwright.config.ts (iPhone 14 Pro viewport, pinned to chromium). Do NOT
// re-add a file-level `test.use({ ...devices[...] })`: the device descriptor
// carries defaultBrowserType webkit, which made every test in this file fail
// at browser launch on CI (only chromium is installed there) — runs #314–#318.

// These are layout/navigation tests, not onboarding tests. Run them as an
// established user so the first-run welcome overlay (FirstRunGate, shown on
// "/" to new visitors on web AND native) doesn't intercept tab taps. A saved
// calendar preference satisfies the prior-use heuristic in
// lib/onboarding/state.ts.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("purify:calendar.style", "new");
    } catch {
      /* ignore */
    }
  });
});

const TABS = [
  { label: "Today", expect: "/" },
  { label: "Bible", expect: "/bible" },
  { label: "Discover", expect: "/discover" },
  { label: "Prayers", expect: "/prayers" },
  { label: "You", expect: "/account" },
];

test.describe("native app shell (Capacitor UA)", () => {
  test.use({
    userAgent: `${devices["iPhone 14 Pro"].userAgent} ${NATIVE_UA_TOKEN}`,
  });

  test("mobile shell: tab bar visible, AppNav hidden", async ({ page }) => {
    await page.goto("/");
    // Bottom tab nav is the "Primary" landmark inside the app shell.
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeVisible();
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
});

test("mobile WEB: marketing home renders, no tab bar", async ({ page }) => {
  // No native UA token here — this is an ordinary phone browser. The split
  // must hold in both directions: web visitors get the marketing site and
  // the app shell never leaks out of the native build.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(
    0,
  );
});

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
  // The desktop AppNav also carries a (hidden) "Back" button, so filter
  // to the visible one: the mobile top bar's.
  await expect(
    page.getByLabel("Back").filter({ visible: true }).first(),
  ).toBeVisible();
  // Reader actions cluster: bookmark + settings. Both exist twice (mobile
  // top bar + desktop toolbar), so assert on the visible instance.
  await expect(
    page.getByLabel("Bookmark this chapter").filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByLabel("Reader settings").filter({ visible: true }).first(),
  ).toBeVisible();
});

test("chapter pill opens the book/chapter picker sheet", async ({ page }) => {
  await page.goto("/bible/john/1");
  // The pill's center label includes the book name + current chapter. A tap
  // that lands before hydration is swallowed, so assert the OUTCOME (the
  // sheet is open) and re-tap until it holds — same flake class as the
  // history expand cards.
  await expect(async () => {
    await page.getByLabel(/Pick a chapter/).click();
    // Sheet renders as a dialog with the book name as its title.
    await expect(page.getByRole("dialog", { name: /John/ })).toBeVisible({
      timeout: 1_500,
    });
  }).toPass({ timeout: 20_000 });
});

test("saint-work reader renders MobileTopBar + section pill", async ({
  page,
}) => {
  await page.goto("/saints/john-chrysostom/paschal-homily");
  // Top bar back button to the saint profile (filter past the hidden
  // desktop AppNav "Back").
  await expect(
    page.getByLabel("Back").filter({ visible: true }).first(),
  ).toBeVisible();
  // Floating section switcher: the label reads "Section N of M".
  await expect(page.getByText(/Section \d+ of \d+/)).toBeVisible();
});

test("/account (signed out) renders the local-profile hero + sign-in path", async ({
  page,
}) => {
  await page.goto("/account");
  // Signed out, the You surface leads with the local-profile hero and
  // offers sign-in as the path to sync (the old Local profile / Public
  // account two-card chooser was retired).
  await expect(
    page.getByText("Your reading life, on this device."),
  ).toBeVisible();
  await expect(
    page.locator('a[href*="/signin"]').filter({ visible: true }).first(),
  ).toBeVisible();
});
