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

// A gathered line opens where it came from (build 93 note 19, the owner:
// "when you click the verse in the Florilegium, it just takes you to the
// book. It doesn't take you to the actual verse"). A gathering's page wrote
// the chapter alone; every other link to a verse in the app ends in the
// verse, which the Bible's page takes to the reading place and lights.
describe("where a gathered line opens", () => {
  it("a verse opens the Bible at that verse", async () => {
    const { lineHref } = await import("@/lib/florilegium/href");
    // His line: the Song of the Theotokos, "He hath filled the hungry with good things".
    const line = { id: "1", addedAt: 1, kind: "scripture" as const, text: "He hath filled the hungry with good things; and the rich he hath sent empty away.", reference: "Luke 1:53", book: "luke", chapter: 1, verse: 53 };
    expect(lineHref(line)).toBe("/bible/luke/1#v53");
    // The form the Bible's page answers (components/bible/VerseFocusFlash.tsx).
    expect(lineHref(line)!.split("#")[1]).toMatch(/^v\d+$/);
  });

  it("a Father's line opens where it was gathered, and one with no place opens nothing", async () => {
    const { lineHref } = await import("@/lib/florilegium/href");
    const said = { id: "2", addedAt: 2, kind: "father" as const, text: "words", author: "St. Athanasius the Great" };
    expect(lineHref({ ...said, href: "/saints/athanasius-the-great/on-the-incarnation#p12" })).toBe("/saints/athanasius-the-great/on-the-incarnation#p12");
    expect(lineHref(said)).toBeNull();
  });

  it("is the one place that writes that address: the gathering's page and Today's card both draw from it", async () => {
    const fs = await import("node:fs");
    const page = fs.readFileSync("components/florilegium/FlorilegiumDetail.tsx", "utf8");
    const card = fs.readFileSync("components/today/FlorilegiumLineCard.tsx", "utf8");
    expect(page).toContain("const href = lineHref(item);");
    expect(card).toContain("href: lineHref(item),");
    // Neither writes a Bible address of its own any more.
    for (const src of [page, card]) expect(src).not.toMatch(/`\/bible\/\$\{item\.book\}/);
  });
});

