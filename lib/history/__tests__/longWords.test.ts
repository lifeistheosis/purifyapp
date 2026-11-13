// An account's words stay inside a phone's edge (Gate 2.0, 2026-11-13: the
// page's edge, cause 6). The Philokalia's page gave a source note with a bare
// Wikisource address, one "word" of more than 60 characters, and its line ran
// 846px past the screen; 14 such words stand in the notes of data/history.
//
// What a reader would notice if this broke: a line of a source note running
// off the side of the screen, cut where the apps clip the page, its end
// unreadable.
//
// It cannot measure a line (vitest runs with no browser). The walk that does
// is `node scripts/motion-walk.mjs <out>` (the page's edge at rest, three
// heights a screen), on the export.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data/history");
/** Longer than a phone's line holds at the notes' size: about 45 characters at 390px. */
const LONG = /\S{45,}/;

/** Every field of every account that holds a word too long for a line, by its path (`sources.note`). */
function longWordFields(): Map<string, number> {
  const found = new Map<string, number>();
  const walk = (value: unknown, at: string[]) => {
    if (Array.isArray(value)) value.forEach((v) => walk(v, at));
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, [...at, k]);
    else if (typeof value === "string" && LONG.test(value)) found.set(at.join("."), (found.get(at.join(".")) ?? 0) + 1);
  };
  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) walk(JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")), []);
  return found;
}

describe("an account's long words", () => {
  it("stand only where the page lets them break: a source's address (never shown) and its note", () => {
    // A new field with a long word fails here first, to be given the same care.
    expect([...longWordFields().keys()].sort()).toEqual(["sources.note", "sources.url"]);
  });

  it("break where they must in the list of sources, so a bare address in a note wraps inside the screen", () => {
    const src = fs.readFileSync(path.join(ROOT, "components/history/EventArticle.tsx"), "utf8");
    const list = src.slice(src.indexOf("function SourceList("), src.indexOf("function Scripture("));
    expect(list).toContain("{s.note}");
    // On the list itself, so the label and the note under it both break.
    expect(list).toMatch(/<ul className="[^"]*\[overflow-wrap:anywhere\][^"]*">/);
  });
});
