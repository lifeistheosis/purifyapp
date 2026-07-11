import { afterEach, describe, expect, it, vi } from "vitest";

import { checkoutReturnOrigin, SITE_URL } from "@/lib/site";

// F-14: behind Render's proxy the request origin is http://localhost:10000,
// so Stripe return URLs derived from it strand buyers on a dead page after
// paying or cancelling (observed live 2026-07-11). Return URLs must use the
// canonical SITE_URL everywhere except genuine local development.

describe("checkoutReturnOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses SITE_URL when the proxy presents localhost outside development", () => {
    // vitest runs with NODE_ENV=test, i.e. not development.
    expect(checkoutReturnOrigin("http://localhost:10000")).toBe(SITE_URL);
    expect(checkoutReturnOrigin("http://127.0.0.1:3000")).toBe(SITE_URL);
  });

  it("uses SITE_URL for any non-localhost origin", () => {
    expect(checkoutReturnOrigin("https://purifyapp.net")).toBe(SITE_URL);
    expect(checkoutReturnOrigin("https://purifyapp.onrender.com")).toBe(SITE_URL);
  });

  it("keeps the localhost origin only in genuine local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(checkoutReturnOrigin("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("never returns localhost in development for a deployed origin", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(checkoutReturnOrigin("https://purifyapp.net")).toBe(SITE_URL);
  });
});
