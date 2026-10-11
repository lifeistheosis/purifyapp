// The Discover menu in the desktop nav (components/nav/DiscoverDropdown.tsx).
//
// Each row's label is t(`nav.discoverMenu.${key}`), a computed key, and
// lib/i18n/__tests__/keysExist.test.ts reads literal keys only. So a row
// added without its string passes everything and prints
// "nav.discoverMenu.parishes" in the nav. This reads the list out of the
// source and holds every row to a string and to a page.
//
// It reads the file as text because the component is a client one, and this
// suite runs in plain node with no React and no next/link.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..", "..");

const EN = JSON.parse(
  fs.readFileSync(path.join(ROOT, "lib", "i18n", "messages", "en.json"), "utf8"),
) as Record<string, string>;

const source = fs.readFileSync(
  path.join(ROOT, "components", "nav", "DiscoverDropdown.tsx"),
  "utf8",
);

// Only the list itself: from its declaration to the bracket that closes it.
const start = source.indexOf("export const DISCOVER_CHILDREN");
const block = source.slice(start, source.indexOf("\n];", start));

const rows = [...block.matchAll(/\{\s*key:\s*"([A-Za-z]+)",\s*href:\s*"(\/[a-z-]+)"\s*\}/g)].map(
  (m) => ({ key: m[1], href: m[2] }),
);

describe("the Discover menu", () => {
  it("reads the list", () => {
    // A regex that quietly matched nothing would pass every check below.
    expect(start).toBeGreaterThan(-1);
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });

  it("has an English label for every row", () => {
    const missing = rows.map((r) => `nav.discoverMenu.${r.key}`).filter((k) => !EN[k]);
    expect(missing).toEqual([]);
  });

  it("leads every row to a page that exists", () => {
    const dead = rows
      .filter((r) => !fs.existsSync(path.join(ROOT, "app", "(app)", r.href.slice(1), "page.tsx")))
      .map((r) => r.href);
    expect(dead).toEqual([]);
  });

  it("lists no page twice", () => {
    expect(new Set(rows.map((r) => r.href)).size).toBe(rows.length);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });

  it("includes the way to a parish", () => {
    expect(rows.map((r) => r.href)).toContain("/parishes");
  });
});
