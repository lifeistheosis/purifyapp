// Theology, round 3 (1.8, r3-04): the owner's pick of 2026-10-30, "For
// theology, we should do one A, two B and C, hybrid, three, C"
// (Homebase/boards/purify-master/variants/r3-04-theology, INDEX.md), from
// his build 80 notes 21, 23 and 24 (r18/BUILD-80-NOTES.md).
//
// Round 3 r3-13 (the owner's hybrid of B and C, the same day) revamped the
// hub, a doctrine's page and its reading (lib/theology/__tests__/
// revamp.test.ts holds those now). What is still r3-04's is held here: the
// library's search on the four ways' own pages, its kinds as rows, the
// related studies as rows, and no pill clouds.
//
// What a reader would notice if this broke: a cloud of pills again, a search
// pill that hides the last line of a page or sits under the mini player, or
// the library's search failing with no signal. Read as text: the components
// are server ones, and the built pages are measured in the export walk.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { THEOLOGY_SECTIONS, searchLibrary, type TheologySearchItem } from "@/lib/theology/searchKinds";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
/**
 * A file's code without its notes. A JSX note is matched only up to its own
 * end, so it cannot run on from a type's doc comment to the next note.
 */
const code = (file: string) =>
  read(file)
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const EN = JSON.parse(read("lib/i18n/messages/en.json")) as Record<string, string>;

const SEARCH = "components/theology/TheologySearch.tsx";
const SHELF = "components/theology/FathersShelf.tsx";
const RAIL = "components/theology/RelatedRail.tsx";

describe("the library's search on the four ways' own pages", () => {
  it("floats as a pill on the doctrine index and the Topics, Heresies and Apologetics pages", () => {
    for (const file of ["components/theology/TheologyShell.tsx", "app/(app)/topics/[slug]/page.tsx", "app/(app)/heresies/[slug]/page.tsx", "app/(app)/apologetics/[slug]/page.tsx"]) {
      expect(code(file), file).toContain("<TheologySearch />");
    }
    // The doctrine index and the Topics, Heresies and Apologetics indexes wear the shell.
    for (const file of ["app/(app)/theology/doctrine/page.tsx", "app/(app)/topics/page.tsx", "app/(app)/heresies/page.tsx", "app/(app)/apologetics/page.tsx"]) {
      expect(code(file), file).toContain("<TheologyShell");
    }
  });

  it("floats the pill over the tab bar, the mini player and the readings bar, and keeps the page's foot clear of it", () => {
    const pill = /\.theology-search-pill\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    for (const v of ["--tab-bar-h", "--now-playing-h", "--readings-flow-h", "safe-area-inset-bottom"]) expect(pill, v).toContain(v);
    const search = code(SEARCH);
    expect(search).toContain('<div aria-hidden className="h-20" />');
    // It steps aside while a sheet is open.
    expect(search).toContain("useOverlayOpen()");
    // It opens the app's one search, turned to Theology (1.8, the owner's
    // pick of r3-12), which reads the library's list.
    expect(search).toContain('openSearch("theology")');
    expect(code("components/search/CommandPalette.tsx")).toContain('"/theology-search.json"');
  });

  it("is a file in the apps' export, so the search works with no signal", () => {
    const route = code("app/theology-search.json/route.ts");
    expect(route).toContain('export const dynamic = "force-static";');
    expect(route).toContain("buildTheologySearch()");
  });
});

describe("no pill clouds anywhere on Theology", () => {
  it("the related studies are rows", () => {
    const rail = code(RAIL);
    expect(rail).not.toMatch(/flex-wrap/);
    expect(rail).toContain("theology-row ");
  });

  it("the search's kinds are rows, not scope pills", () => {
    const search = code(SEARCH);
    expect(search).not.toMatch(/flex-wrap/);
    expect(search).not.toMatch(/aria-pressed/);
  });
});

describe("the theology library's search", () => {
  const items: TheologySearchItem[] = [
    { slug: "filioque", title: "The Annihilation of the Filioque", href: "/theology/filioque", section: "Doctrine", summary: "The Spirit proceeds from the Father." },
    { slug: "arianism", title: "Arianism", href: "/heresies/arianism", section: "Heresies", summary: "That the Son was created." },
    { slug: "first-nicaea", title: "First Council of Nicaea", href: "/councils/first-nicaea", section: "Councils" },
  ];

  it("finds by the title and by the line under it, in the library's order", () => {
    expect(searchLibrary(items, "filioque", null).map((i) => i.slug)).toEqual(["filioque"]);
    expect(searchLibrary(items, "SON", null).map((i) => i.slug)).toEqual(["arianism"]);
    expect(searchLibrary(items, "the", null).map((i) => i.slug)).toEqual(["filioque", "arianism"]);
  });

  it("lists a whole kind when one is chosen, and nothing before a word or a kind", () => {
    expect(searchLibrary(items, "", "Councils").map((i) => i.slug)).toEqual(["first-nicaea"]);
    expect(searchLibrary(items, "", null)).toEqual([]);
    expect(searchLibrary(items, "nicaea", "Heresies")).toEqual([]);
  });

  it("names its kinds in the hub's order, each in the reader's language", () => {
    expect(THEOLOGY_SECTIONS).toEqual(["Doctrine", "Topics", "Heresies", "Apologetics", "Councils", "Fathers"]);
    // The one search's strip names them (1.8, r3-12).
    const search = code("lib/search/places.ts");
    for (const key of ["study.doctrine", "discover.tile.topics", "discover.tile.heresies", "discover.tile.apologetics", "nav.councils", "bible.fathersTag"]) {
      expect(search).toContain(`"${key}"`);
      expect(EN[key], key).toBeTruthy();
    }
    expect(EN["study.theology.noMatch"]).toContain("{query}");
  });
});

describe("round 3's own files", () => {
  it("carry no em dash", () => {
    for (const file of [SEARCH, SHELF, RAIL, "lib/theology/searchIndex.ts", "lib/theology/searchKinds.ts"]) {
      expect(read(file).includes(String.fromCharCode(0x2014)), file).toBe(false);
    }
  });

  it("keep every motion behind Purify's motion switch", () => {
    for (const rule of [".theology-row", ".theology-card", ".theology-face"]) {
      expect(css, rule).toContain(`:where([data-motion="reduce"]) ${rule} {`);
    }
  });
});
