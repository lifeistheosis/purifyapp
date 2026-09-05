import { test, expect, devices } from "@playwright/test";
import { NATIVE_UA_TOKEN } from "@/lib/platform/token";

/**
 * The native shell on a tablet.
 *
 * Runs only in the `tablet-shell` Playwright project (iPad landscape,
 * 1024x768, pinned to chromium). The phone/desktop fork in this codebase is
 * the md breakpoint, and until 1.4 the native shell was assumed never to
 * reach it: MobileTabBar, MobileTopBar and every Sheet are md:hidden. An
 * iPad crosses md, so without the `native:` variant in globals.css a tablet
 * got a screen with no navigation at all. These tests hold that variant in
 * place.
 *
 * Same established-user setup as mobile-shell.spec.ts, for the same reason:
 * the first-run overlay must not intercept the taps.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("purify:calendar.style", "new");
    } catch {
      /* ignore */
    }
  });
});

test.describe("native app shell on a tablet (Capacitor UA, 1024x768)", () => {
  test.use({
    userAgent: `${devices["iPad (gen 7) landscape"].userAgent} ${NATIVE_UA_TOKEN}`,
  });

  test("tab bar stays on screen above md", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerW = await page.evaluate(() => window.innerWidth);
    expect(scrollW).toBeLessThanOrEqual(innerW + 1);
  });

  test("Bible index shows the mobile screen, not the website's", async ({ page }) => {
    await page.goto("/bible");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    // The desktop twin is `hidden md:block native-md-hidden`. Its masthead
    // headpiece must not be painted inside the shell.
    const desktopTwin = page.locator("div.hidden.md\\:block.md\\:native\\:hidden");
    await expect(desktopTwin).toBeHidden();
  });

  test("Bible chapter keeps the mobile top bar and the chapter pill", async ({ page }) => {
    await page.goto("/bible/john/1");
    await expect(page.getByLabel("Back").filter({ visible: true }).first()).toBeVisible();
    await expect(
      page.getByLabel("Reader settings").filter({ visible: true }).first(),
    ).toBeVisible();
    // The desktop chapter sidebar is native-md-hidden in the shell.
    await expect(page.locator("aside.hidden.md\\:block.md\\:native\\:hidden")).toBeHidden();
  });

  test("account stays on the mobile screen instead of bouncing to the desktop dashboard", async ({ page }) => {
    await page.goto("/account");
    await page.waitForTimeout(500);
    expect(page.url()).not.toContain("/account/profile");
  });
});
