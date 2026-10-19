import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import books from "@/data/bible/books.json";

// "Before you read" (1.7): every book opens with a short word about it, and
// a line each on what it is, who wrote it and when. Drafts for the owner's
// and his priest's read; held here to the house's rules for words.
const DIR = "data/bible/intros";
const facts = JSON.parse(fs.readFileSync(path.join(DIR, "facts.json"), "utf8")) as {
  books: Record<string, { by: string; when: string; about: string }>;
};

describe("the word before each book", () => {
  it("is there for every book, with its three lines", () => {
    const slugs = (books as { slug: string }[]).map((b) => b.slug);
    expect(slugs).toHaveLength(78);
    for (const slug of slugs) {
      expect(fs.existsSync(path.join(DIR, `${slug}.md`)), slug).toBe(true);
      const f = facts.books[slug];
      expect(f, slug).toBeTruthy();
      expect(f.about.split(/\s+/).length, slug).toBeLessThanOrEqual(16);
      expect(f.by.split(/\s+/).length, slug).toBeLessThanOrEqual(8);
      expect(f.when.split(/\s+/).length, slug).toBeLessThanOrEqual(8);
    }
    expect(Object.keys(facts.books).sort()).toEqual([...slugs].sort());
  });

  it("is plain text, with no em dash, no dash made of a spaced hyphen, no markdown", () => {
    for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
      const text = fs.readFileSync(path.join(DIR, file), "utf8");
      expect(text, file).not.toContain("—");
      expect(text, file).not.toMatch(/ - /);
      expect(text, file).not.toMatch(/\*\*|^#/m);
      // An en dash only between numbers (chapters 5–7).
      expect(text.replace(/\d–\d/g, ""), file).not.toContain("–");
    }
    const all = JSON.stringify(facts.books);
    expect(all).not.toContain("—");
    expect(all).not.toMatch(/ - /);
  });
});
