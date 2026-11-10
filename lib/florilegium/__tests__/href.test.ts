// Where a gathering opens (1.9): its own page on the website; in the apps,
// the one page the bundle carries for every gathering, with the gathering in
// the query, since the bundle has no page for an id no build can know. That
// page has an address of its own (florilegium/gathering), so opening a
// gathering is a page switch, and moves as one (build 89 note 4): on the
// Florilegium's own address with a query, where build 89 opened it, the app
// saw a filter and the gathering arrived with a cut.

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

  it("is the gatherings' own page, named in the query, in the apps", async () => {
    vi.doMock("@/lib/platform/native", () => ({ isNativeClient: () => true }));
    const { gatheringHref } = await import("@/lib/florilegium/href");
    expect(gatheringHref("g1")).toBe("/florilegium/gathering?g=g1");
    expect(gatheringHref("a b/c")).toBe("/florilegium/gathering?g=a%20b%2Fc");
    // Never the Florilegium's own address with a query: that is a filter to the app, not a page.
    expect(gatheringHref("g1").split("?")[0]).not.toBe("/florilegium");
  });

  it("the apps carry that page, and the build leaves only the website's out", async () => {
    const fs = await import("node:fs");
    expect(fs.existsSync("app/(app)/florilegium/gathering/page.tsx")).toBe(true);
    const page = fs.readFileSync("app/(app)/florilegium/gathering/page.tsx", "utf8");
    expect(page).toContain("<FlorilegiumByQuery />");
    expect(fs.readFileSync("components/florilegium/FlorilegiumByQuery.tsx", "utf8")).toContain('useSearchParams().get("g")');
    const build = fs.readFileSync("scripts/native-build.mjs", "utf8");
    expect(build).toContain('["app", "(app)", "florilegium", "[id]"]');
    expect(build).not.toContain('"florilegium", "gathering"');
    expect(build).not.toContain('"florilegium", "begin"');
  });

  it("a starter opens on its own page, the same in the apps and on the website", async () => {
    const { starterHref } = await import("@/lib/florilegium/href");
    expect(starterHref("prologue")).toBe("/florilegium/begin/prologue");
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
