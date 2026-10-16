// Link integrity for the reading room's editor's shelf.
//
// Every href in lib/reading/curated.ts must resolve to real, hosted content:
// a saint+work whose JSON exists. A fabricated or dead link fails here, which
// keeps the "real content only" guarantee enforced in CI. We read the data/
// JSON directly (not via the server-only loaders) so this runs in the plain
// node environment.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SAINTS } from "@/lib/saints/saints";
import { WHERE_TO_BEGIN, allCuratedHrefs } from "@/lib/reading/curated";
import { BEGIN_ORDER, ENTRIES } from "@/lib/reading/entries";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const SAINTS_DIR = path.join(ROOT, "data", "saints");

// A registered work whose body JSON also exists on disk.
function workResolves(saintSlug: string, workSlug: string): boolean {
  const saint = SAINTS.find((s) => s.slug === saintSlug);
  if (!saint) return false;
  if (!saint.works.some((w) => w.slug === workSlug)) return false;
  return fs.existsSync(path.join(SAINTS_DIR, saintSlug, `${workSlug}.json`));
}

function hrefResolves(href: string): boolean {
  const parts = href.replace(/^\//, "").split("/");
  return parts[0] === "saints" && parts.length === 3 && workResolves(parts[1], parts[2]);
}

describe("the reading room's editor's shelf", () => {
  it("every curated href resolves to real content", () => {
    const dead = allCuratedHrefs().filter((href) => !hrefResolves(href));
    expect(dead).toEqual([]);
  });

  it("names each work once", () => {
    expect(new Set(WHERE_TO_BEGIN).size).toBe(WHERE_TO_BEGIN.length);
    expect(WHERE_TO_BEGIN.length).toBeGreaterThanOrEqual(6);
  });

  it("is the works marked as first reads, in its own order, and no work shown twice", () => {
    const marked = Object.entries(ENTRIES)
      .filter(([, e]) => e.begin)
      .map(([k]) => k)
      .sort();
    expect([...BEGIN_ORDER].sort()).toEqual(marked);
    for (const key of BEGIN_ORDER) expect(ENTRIES[key].sameAs, key).toBeUndefined();
  });
});
