import { test, expect } from "@playwright/test";

/**
 * Regression for the 2026-06-11 community report of a dead
 * Continue-with-Google button (older Safari). This cannot reproduce a
 * legacy-WebKit hydration failure, but it does catch the general
 * failure class: a rendered button whose client handler never wired
 * up. The outbound authorize navigation is intercepted and aborted so
 * the test stays hermetic; observing the request at all proves the
 * handler ran and built the OAuth URL.
 */
test("sign-in Google button has a live click handler", async ({ page }) => {
  await page.route(/auth\/v1\/authorize|accounts\.google\.com/, (route) =>
    route.abort(),
  );
  await page.goto("/signin");
  const google = page.getByRole("button", { name: /Continue with Google/ });
  await expect(google).toBeVisible();
  await expect(google).toBeEnabled();
  const authorize = page.waitForRequest(/auth\/v1\/authorize/, {
    timeout: 10_000,
  });
  await google.click();
  const req = await authorize;
  expect(req.url()).toContain("provider=google");
});

test("sign-in offers non-OAuth fallbacks", async ({ page }) => {
  // The recovery path for anyone whose browser cannot run the OAuth
  // flow: email + password, with Forgot password as the reset route
  // (which also covers magic-link-era accounts).
  await page.goto("/signin");
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Forgot password/i }),
  ).toBeVisible();
});
