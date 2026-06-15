import { test, expect } from "@playwright/test";

/**
 * First-run onboarding gate. A clean install (no engagement keys, no Supabase
 * session) should see the welcome overlay; once dismissed it must not return
 * on reload; and a device with prior app data must never see it at all.
 *
 * Each test runs in a fresh Playwright context, so localStorage starts empty —
 * that IS the clean-install case, no clearing needed. Note: an `addInitScript`
 * runs on every navigation including reload, so we use it only to seed a
 * returning-user key, never to clear (clearing on reload would wipe the very
 * persistence we're asserting). The overlay is mobile-first but renders on any
 * viewport, so these run on the default desktop project.
 */

const WELCOME = /A quiet place to pray/i;

test("clean install shows the welcome overlay", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(WELCOME)).toBeVisible();
});

test("skipping the overlay persists across reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Skip$/ }).click();
  await expect(page.getByText(WELCOME)).toHaveCount(0);

  // The onboarded flag is in localStorage, which survives reload within the
  // same context. The overlay must not return.
  await page.reload();
  await expect(page.getByText(WELCOME)).toHaveCount(0);
});

test("returning users with prior data never see onboarding", async ({
  page,
}) => {
  // Seed a genuine prior-engagement key before any app code runs. A saved
  // calendar preference is enough for the prior-use heuristic.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("purify:calendar.style", "new");
    } catch {
      /* ignore */
    }
  });
  await page.goto("/");
  await expect(page.getByText(WELCOME)).toHaveCount(0);
});
