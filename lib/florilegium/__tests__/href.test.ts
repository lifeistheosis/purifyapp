// Where a gathering opens (1.9): its own page on the website; in the apps,
// the Florilegium's page with the gathering in the query, since the bundle
// has no page for an id no build can know.

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("@/lib/platform/native");
});

describe("a gathering's address", () => {
  it("is its own page on the website", async () => {
    vi.doMock("@/lib/platform/native", () => ({ isNativeClient: () => false }));
    const { gatheringHref } = await import("@/lib/florilegium/href");
    expect(gatheringHref("g1")).toBe("/florilegium/g1");
  });

  it("is the Florilegium's page, named in the query, in the apps", async () => {
    vi.doMock("@/lib/platform/native", () => ({ isNativeClient: () => true }));
    const { gatheringHref } = await import("@/lib/florilegium/href");
    expect(gatheringHref("g1")).toBe("/florilegium?g=g1");
    expect(gatheringHref("a b/c")).toBe("/florilegium?g=a%20b%2Fc");
  });

  it("is the one way every screen opens a gathering", async () => {
    const fs = await import("node:fs");
    for (const file of ["components/florilegium/FlorilegiaHub.tsx", "components/today/FlorilegiumLineCard.tsx"]) {
      const src = fs.readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/\/florilegium\/\$\{/);
      expect(src, file).toContain("gatheringHref(");
    }
  });
});
