// The privacy page in German says what the English says, paragraph for
// paragraph (2026-11-09: the German page had fallen behind by a whole
// section, the shop and payments, the prayer features, the catechism,
// welcome-question, screen and lock counts, the ambassador links, and three
// lines of "What we don't" that had come to say the opposite of the English).
//
// The two pages are written block for block alike, so what this holds is
// their shape: the same blocks in the same order (every heading, paragraph,
// list and list item, with its own look), the same technical names (each
// table, key and address in <code>), and the same links. A paragraph added to
// one page and not the other fails here. Only English and German have a page
// of their own; every other language is shown the English one.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

// The two texts, which the page and the legal sheet draw (build 90 note 1).
const text = fs.readFileSync("components/legal/PrivacyText.tsx", "utf8");
const english = text.slice(text.indexOf("function PrivacyEn()"), text.indexOf("function PrivacyDe()"));
const german = text.slice(text.indexOf("function PrivacyDe()"));
// The page writes the English; its other languages are drawn on the device
// (1.9, the reader's language in the apps), each named here.
const source = fs.readFileSync("components/privacy/PrivacyInReadersLanguage.tsx", "utf8");

/** Each block, in order: its tag and its look. */
const blocks = (page: string) =>
  [...page.matchAll(/<(h1|h2|p|ul|li|div)\b(?:\s+className=(?:"([^"]*)"|\{`([^`]*)`\}))?[^>]*>/g)].map(
    (m) => `${m[1]}.${(m[2] ?? m[3] ?? "").trim().replace(/\s+/g, " ")}`,
  );
/** Each technical name the page shows, in order. */
const codes = (page: string) =>
  [...page.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
/** Each link, in order. */
const links = (page: string) => [...page.matchAll(/\bhref="([^"]+)"/g)].map((m) => m[1]);

describe("the German privacy page is level with the English", () => {
  it("has the same blocks, in the same order", () => {
    expect(blocks(english).length).toBeGreaterThan(80);
    expect(blocks(german)).toEqual(blocks(english));
  });

  it("names the same tables, keys and addresses", () => {
    expect(codes(german)).toEqual(codes(english));
  });

  it("links to the same places", () => {
    expect(links(german)).toEqual(links(english));
  });

  it("is the only other language with a page of its own", () => {
    expect([...source.matchAll(/^\s+([a-z]{2,3}): \(\) => import\("\.\/Privacy[A-Z][a-z]+"\)/gm)].map((m) => m[1])).toEqual(["de"]);
  });
});
