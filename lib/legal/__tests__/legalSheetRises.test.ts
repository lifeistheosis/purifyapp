// The Terms rise with their words (1.9, Gate 2.0's run of 2026-11-13).
//
// A legal sheet (components/legal/LegalSheet.tsx) fetched its text only once
// it was open, so the Terms rose on "Loading..." for about a quarter of a
// second, and the words came in under the reader's eyes. The text is now
// fetched ahead (components/legal/LegalLink.tsx: once the link has been on
// the page a moment, and at the first touch), and a sheet that opens after
// that is drawn with its words from its first frame.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("a legal sheet", () => {
  const sheet = code("components/legal/LegalSheet.tsx");
  const link = code("components/legal/LegalLink.tsx");

  it("draws a text already fetched in its first frame", () => {
    expect(sheet).toMatch(/const LOADED: Partial<Record<LegalDoc, Text>> = \{\};/);
    expect(sheet).toMatch(/const here = LOADED\[shown\];/);
    expect(sheet).toMatch(/const Body = here \?\? \(/);
    // Fetched as the sheet opens only when it is not here yet.
    expect(sheet).toMatch(/if \(!open \|\| here\) return;/);
  });

  it("has its text fetched ahead by the link that opens it", () => {
    expect(link).toMatch(/setTimeout\(\(\) => preloadLegal\(doc\), 700\)/);
    expect(link).toMatch(/onPointerDown=\{\(\) => preloadLegal\(doc\)\}/);
    expect(sheet).toMatch(/export function preloadLegal\(doc: LegalDoc\): void \{\s*if \(!LOADED\[doc\]\) void load\(doc\)\.catch\(\(\) => \{\}\);/);
  });
});
