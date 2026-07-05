import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./_axe";

/**
 * Seller console + buyer messaging/refund surfaces. Like shop.spec,
 * everything here must stay green with or without the database
 * migration applied, and signed out — these are the gate and
 * graceful-degradation paths, which is exactly what a smoke test can
 * prove without a seller account. The signed-in seller flows are
 * covered by unit tests over the transition/refund/earnings logic.
 */

test("seller console gates signed-out visitors to sign in", async ({ page }) => {
  const response = await page.goto("/shop/seller");
  test.skip(response?.status() === 404, "shop flag is off in this build");

  await expect(page.locator("h1")).toContainText(/Seller console/i);
  const signIn = page.locator('a[href*="/signin"]');
  await expect(signIn.first()).toBeVisible();
  // The gate must not leak console chrome.
  await expect(page.locator("text=/Earnings|Listings/")).toHaveCount(0);
  await expect(page.locator("text=/Application error/i")).toHaveCount(0);
  await expectNoA11yViolations(page);
});

test("console subpages gate too, not just the index", async ({ page }) => {
  const response = await page.goto("/shop/seller/orders");
  test.skip(response?.status() === 404, "shop flag is off in this build");

  await expect(page.locator("h1")).toContainText(/Seller console/i);
  await expect(page.locator('a[href*="/signin"]').first()).toBeVisible();
});

test("buyer messages inbox asks for sign in", async ({ page }) => {
  const response = await page.goto("/shop/messages");
  test.skip(response?.status() === 404, "shop flag is off in this build");

  await expect(page.locator("h1")).toContainText(/Messages/i);
  await expect(page.locator('a[href*="/signin"]').first()).toBeVisible();
  await expectNoA11yViolations(page);
});

test("buyer order detail asks for sign in instead of leaking", async ({ page }) => {
  const response = await page.goto(
    "/shop/orders/00000000-0000-4000-8000-000000000000",
  );
  test.skip(response?.status() === 404, "shop flag is off in this build");

  await expect(page.locator("h1")).toContainText(/Your order/i);
  await expect(page.locator('a[href*="/signin"]').first()).toBeVisible();
});

test("owner dashboard endpoints refuse anonymous callers", async ({ request }) => {
  // Admin routes 403 regardless of the shop flag; the /admin page 404s
  // so the route isn't even revealed.
  for (const url of [
    "/api/admin/shop/stores",
    "/api/admin/shop/listings",
    "/api/admin/shop/conversations",
    "/api/admin/shop/refunds",
    "/api/admin/shop/orders",
  ]) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(403);
  }
  const page = await request.get("/admin");
  expect(page.status()).toBe(404);
});

test("seller APIs refuse anonymous and malformed calls", async ({ request }) => {
  // Signed out: everything seller-side is 403/401, buyer-side 401.
  const orderPatch = await request.patch("/api/shop/seller/orders", {
    data: { orderId: "00000000-0000-4000-8000-000000000000", fulfillmentStatus: "shipped" },
  });
  test.skip(orderPatch.status() === 404, "shop flag is off in this build");
  expect(orderPatch.status()).toBe(403);

  const refundDecision = await request.post("/api/shop/seller/refunds", {
    data: { refundId: "00000000-0000-4000-8000-000000000000", decision: "approved" },
  });
  expect(refundDecision.status()).toBe(403);

  const listing = await request.post("/api/shop/seller/products", {
    data: { title: "x" },
  });
  expect(listing.status()).toBe(403);

  const refundRequest = await request.post("/api/shop/orders/refund-request", {
    data: { orderId: "00000000-0000-4000-8000-000000000000", reason: "damaged" },
  });
  expect(refundRequest.status()).toBe(401);

  const conversation = await request.post("/api/shop/conversations", {
    data: { subject: "hi", body: "hi" },
  });
  expect(conversation.status()).toBe(401);

  const message = await request.post("/api/shop/messages", {
    data: { conversationId: "00000000-0000-4000-8000-000000000000", body: "hi" },
  });
  expect(message.status()).toBe(401);
});
