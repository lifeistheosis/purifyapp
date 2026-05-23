import { defineConfig, devices } from "@playwright/test";

/**
 * Purify smoke suite. Spins up `npm run start` against a prebuilt app and
 * runs the seven specs in `tests/smoke/`. Every spec ends with an axe-core
 * assertion — accessibility violations fail the run.
 *
 * Run locally:
 *   npm run build && npm run test:e2e
 *
 * CI runs this via `.github/workflows/ci.yml` after the build step.
 */
export default defineConfig({
 testDir: "./tests/smoke",
 timeout: 60_000,
 expect: { timeout: 10_000 },
 fullyParallel: true,
 forbidOnly: !!process.env.CI,
 retries: process.env.CI ? 2 : 0,
 workers: process.env.CI ? 2 : undefined,
 reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
 use: {
 baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
 trace: "on-first-retry",
 screenshot: "only-on-failure",
 },
 projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
 webServer: {
 command: "npm run start",
 url: "http://localhost:3000",
 timeout: 120_000,
 reuseExistingServer: !process.env.CI,
 stdout: "ignore",
 stderr: "pipe",
 },
});
