import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getBook } from "@/lib/bible/books";
import { DICTIONARY, fold, letterOf, termsMatching, type DictionaryGroup } from "@/lib/dictionary/terms";
import { buildSearchCorpus } from "@/lib/search/buildCorpus";

const GROUPS: DictionaryGroup[] = ["faith", "worship", "prayer-life", "church", "year"];

/** A screen the app has at a path with no [name] folder in it. */
function fixedScreen(dir: string, segments: string[]): boolean {
  const folders = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const groups = folders.filter((n) => n.startsWith("(") && n.endsWith(")"));
  if (groups.some((g) => fixedScreen(path.join(dir, g), segments))) return true;
  if (segments.length === 0) return fs.existsSync(path.join(dir, "page.tsx"));
  const [head, ...rest] = segments;
  return folders.includes(head) && fixedScreen(path.join(dir, head), rest);
}

describe("the Orthodox dictionary", () => {
  it("holds its words once each, under a group it has", () => {
    expect(DICTIONARY.length).toBeGreaterThanOrEqual(80);
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const term of DICTIONARY) {
      expect(term.id, term.term).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(ids.has(term.id), `two words share the id ${term.id}`).toBe(false);
      ids.add(term.id);
      expect(names.has(fold(term.term)), `${term.term} is listed twice`).toBe(false);
      names.add(fold(term.term));
      expect(term.term.trim(), term.id).toBe(term.term);
      expect(GROUPS, term.id).toContain(term.group);
      expect(letterOf(term.term), term.id).toMatch(/^[A-Z]$/);
      for (const other of term.also ?? []) expect(fold(other), term.id).not.toBe(fold(term.term));
    }
    for (const group of GROUPS) expect(DICTIONARY.some((t) => t.group === group), group).toBe(true);
  });

  it("says each word plainly, in our own words", () => {
    for (const { id, definition } of DICTIONARY) {
      const words = definition.split(/\s+/).filter(Boolean).length;
      expect(words, `${id}: ${words} words`).toBeGreaterThanOrEqual(12);
      expect(words, `${id}: ${words} words`).toBeLessThanOrEqual(60);
      expect(definition, id).toMatch(/[.!?]$/);
      // No em dash anywhere, an en dash only between numbers.
      expect(definition, id).not.toContain("—");
      expect(definition.replace(/\d–\d/g, ""), id).not.toContain("–");
      // A quotation would be a Father's or the Scripture's words in a
      // drafted line: the definitions quote no one.
      expect(definition, id).not.toMatch(/["“”]/);
    }
  });

  it("links only to screens the app has", async () => {
    const corpus = new Set((await buildSearchCorpus()).map((i) => i.href.split("#")[0]));
    const lost: string[] = [];
    for (const term of DICTIONARY) {
      expect((term.see ?? []).length, term.id).toBeLessThanOrEqual(3);
      for (const link of term.see ?? []) {
        expect(link.label.trim(), `${term.id} -> ${link.href}`).not.toBe("");
        const address = link.href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
        const segments = address.split("/").filter(Boolean);
        // A chapter the book has (/bible/psalms/50).
        const book = segments[0] === "bible" && segments.length === 3 ? getBook(segments[1]) : undefined;
        const chapter = Boolean(book && /^\d+$/.test(segments[2]) && Number(segments[2]) >= 1 && Number(segments[2]) <= book.chapters);
        const ok = link.href.startsWith("/") && (corpus.has(address) || fixedScreen("app", segments) || chapter);
        if (!ok) lost.push(`${term.id} -> ${link.href}`);
      }
    }
    expect(lost).toEqual([]);
  });

  it("is found by the word, its other names or its Greek, accents or none", () => {
    const first = (q: string) => termsMatching(q)[0]?.id;
    for (const term of DICTIONARY) {
      expect(termsMatching(term.term).map((t) => t.id), term.term).toContain(term.id);
      if (term.greek) expect(termsMatching(term.greek).map((t) => t.id), term.greek).toContain(term.id);
    }
    const theosis = DICTIONARY.find((t) => fold(t.term) === "theosis");
    if (theosis) expect(first("THEOSIS")).toBe(theosis.id);
    expect(termsMatching("").length).toBe(DICTIONARY.length);
    expect(termsMatching("zzzz-no-such-word")).toEqual([]);
  });

  it("names on its page only words it holds", () => {
    const page = fs.readFileSync("app/(app)/dictionary/page.tsx", "utf8");
    const named = page.match(/in Purify, each said plainly in a sentence or two: ([^.]+?) and the rest\./)?.[1];
    expect(named).toBeTruthy();
    for (const word of named!.split(",").map((w) => w.trim())) {
      expect(DICTIONARY.some((t) => fold(t.term) === fold(word)), word).toBe(true);
    }
  });

  it("puts every word in the one search, opening at its place on the page", async () => {
    const rows = new Map((await buildSearchCorpus()).map((i) => [i.id, i]));
    expect(rows.get("page-dictionary")?.href).toBe("/dictionary");
    for (const term of DICTIONARY) {
      const row = rows.get(`dictionary-${term.id}`);
      expect(row?.href, term.id).toBe(`/dictionary#${term.id}`);
      expect(row?.label, term.id).toBe(term.term);
    }
  });
});
