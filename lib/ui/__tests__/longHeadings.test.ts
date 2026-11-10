// A heading's long words stay inside a phone's width (1.9, build 90; the
// arbiter's yes of 2026-11-10 to a general rule, held at 320 in German and the
// other long languages). The rule lives in its own block of app/globals.css:
// in every language a word too long for its line breaks inside itself rather
// than running past the edge, and in the long languages a heading hyphenates
// where the language allows. This holds the stylesheet to the list in
// lib/ui/longHeadings.ts; the export walk's section 61 measures the pages.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import { LONG_HEADING_LANGUAGES } from "@/lib/ui/longHeadings";

const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
const at = css.indexOf("A heading's long words stay inside a phone's width");
const block = at >= 0 ? css.slice(at, css.indexOf("\n}\n", css.indexOf("@layer base {", at)) + 3) : "";

describe("a heading's long words stay inside a phone's width", () => {
  it("has its own block in app/globals.css, in the base layer, so a component's own wrapping wins", () => {
    expect(block, "the block's comment heads it").not.toBe("");
    expect(block).toContain("@layer base {");
  });

  it("breaks a word too long for its line in every language, and only such a word", () => {
    expect(block).toMatch(/:where\(h1, h2, h3\) \{\s*overflow-wrap: break-word;\s*\}/);
    // anywhere would also shrink a heading's narrowest width and move layouts; break-word does not.
    expect(block).not.toContain("overflow-wrap: anywhere");
  });

  it("hyphenates headings in the long languages, and only those", () => {
    const rule = /:where\(h1, h2, h3\):where\(([^)]*(?:\)[^{]*)?)\) \{\s*hyphens: auto;\s*\}/.exec(block);
    expect(rule, "the hyphenation rule").not.toBeNull();
    const langs = [...rule![0].matchAll(/:lang\(([a-z-]+)\)/g)].map((m) => m[1]);
    expect(langs).toEqual([...LONG_HEADING_LANGUAGES]);
    expect(LONG_HEADING_LANGUAGES).toContain("de");
    const codes = LOCALES.map((l) => l.code as string);
    for (const l of LONG_HEADING_LANGUAGES) expect(codes, l).toContain(l);
  });

  it("hyphenates nothing else in the app's headings by default", () => {
    // English and the rest keep their words whole: one hyphenation rule, scoped by :lang.
    expect(css.match(/hyphens:\s*auto/g)?.length).toBe(1);
  });
});
