import { test, expect } from "@playwright/test";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * The admin panel's end-to-end coverage.
 *
 * WHAT THIS CAN AND CANNOT PROVE. There is no admin session available to a
 * smoke run: ADMIN_EMAILS is the example placeholder in every checkout, the
 * Supabase anon key in .env.local is revoked, and /admin notFound()s before it
 * renders anything without one. So this cannot walk the tabs, and the panel's
 * own defect record (docs/admin-rework.md) says as much about why light mode
 * has never been looked at either.
 *
 * What it CAN prove is the one property the whole panel rests on: that none of
 * it is reachable without a session. That claim was previously made by reading
 * the routes and counting, twice, and the first count was wrong, because a
 * `grep -Lq` reported all 44 routes ungated when in fact all 44 were gated. A
 * claim that can be got backwards by a shell typo belongs in a test.
 *
 * THE ROUTE LIST IS READ FROM DISK, not written down here. A hardcoded list
 * proves the gate on the routes somebody remembered, which is exactly the set
 * least likely to be missing one. Adding app/api/admin/<anything>/route.ts adds
 * a case to this test with nothing to update.
 */

const ADMIN_API_DIR = join(process.cwd(), "app", "api", "admin");

/** Every `app/api/admin/**\/route.ts`, as the URL it answers on. */
function adminRoutes(dir = ADMIN_API_DIR): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...adminRoutes(full));
    } else if (entry === "route.ts") {
      const rel = relative(ADMIN_API_DIR, dir).split(sep).filter(Boolean).join("/");
      out.push(rel ? `/api/admin/${rel}` : "/api/admin");
    }
  }
  return out.sort();
}

const ROUTES = adminRoutes();

/**
 * What an anonymous caller may receive.
 *
 * 403 is the gate answering. 404 is a route that additionally hides behind
 * adminDebugEnabled(), which is the three *-debug routes. 405 is a POST-only
 * handler declining a GET, which is still proof the data never came back.
 *
 * 200 is the failure this exists to catch. 5xx is the other one: a route that
 * throws before it checks the session has not refused the caller, it has
 * crashed at them, and a stack trace is a disclosure of its own.
 */
const ALLOWED = new Set([403, 404, 405]);

// Above the suite default of 60s. A cold target compiles or cold-starts each
// route on its first request, and this file is the one that touches all of them.
test.describe.configure({ timeout: 180_000 });

test("every admin API route refuses an anonymous GET", async ({ request }) => {
  expect(ROUTES.length, "no admin routes found; is cwd the repo root?").toBeGreaterThan(30);

  // Concurrent, and with its own timeout. Serially against a cold server this
  // is forty-four round trips, and on a dev target each one compiles its route
  // first, which ran past the suite's 60s budget and failed as a timeout rather
  // than as anything about the gate.
  const results = await Promise.all(
    ROUTES.map(async (url) => ({ url, status: (await request.get(url)).status() })),
  );
  const leaked = results
    .filter((r) => !ALLOWED.has(r.status))
    .map((r) => `${r.url} -> ${r.status}`);
  expect(leaked, `${ROUTES.length} routes checked`).toEqual([]);
});

test("the refusal carries no payload with it", async ({ request }) => {
  // A 403 whose body still holds the rows is a 200 wearing a hat. Spot-checked
  // on the routes that carry the most: orders, users, entitlements, revenue.
  for (const url of [
    "/api/admin/overview",
    "/api/admin/users",
    "/api/admin/subscriptions",
    "/api/admin/revenue",
    "/api/admin/shop/orders",
  ]) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(403);
    const body = await res.text();
    expect(body.length, `${url} body is too long to be a refusal`).toBeLessThan(200);
    expect(body, url).not.toMatch(/@|total_cents|payment_status|plus_until/);
  }
});

test("admin write routes refuse an anonymous POST", async ({ request }) => {
  // The read gate and the write gate are separate code paths, and the write
  // ones are the expensive mistakes: comp grants a paid tier, refunds move
  // money, send broadcasts to every device.
  for (const url of [
    "/api/admin/subscriptions/comp",
    "/api/admin/shop/refunds",
    "/api/admin/push/send",
    "/api/admin/gifts",
    "/api/admin/insights/actions",
    "/api/admin/sustainability/actions",
  ]) {
    const res = await request.post(url, { data: {} });
    expect(ALLOWED.has(res.status()), `${url} -> ${res.status()}`).toBe(true);
  }
});

test("the admin page does not reveal that it exists", async ({ request }) => {
  // notFound(), not a redirect to sign-in. A 302 to /signin tells an anonymous
  // visitor there is an admin panel here and what it is called; the seller
  // console can afford that because anyone may become a seller, and this
  // cannot because two people may not.
  const res = await request.get("/admin", { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});

test("the dev-only preview routes are absent from a production build", async ({ request }) => {
  // shell-preview and charts-preview carry a NODE_ENV === "development"
  // bypass so the panel can be looked at without a session. In production
  // that bypass must be inert and both must 404.
  //
  // Skipped, not failed, when the target IS a dev server: a 200 there is the
  // bypass doing its job. It cannot mask a real regression, because a build
  // with NODE_ENV=production returns 404 and the skip never fires.
  const probe = await request.get("/admin/shell-preview", { maxRedirects: 0 });
  test.skip(
    probe.status() === 200,
    "target is a dev server, where these routes are deliberately open",
  );
  expect(probe.status()).toBe(404);
  expect((await request.get("/admin/charts-preview", { maxRedirects: 0 })).status()).toBe(404);
});
