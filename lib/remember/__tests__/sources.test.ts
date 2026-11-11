import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { Florilegium } from "@/lib/florilegium/florilegium";

import { cleanItem, isGone, quoteItem } from "../items";
import { carriedQuotes, foundQuote, gatheredQuotes } from "../sources";

// The three doors a quote comes through to be learned by heart (build 93
// note 11). The editorial line: under a Father's name only what a text the
// app carries prints, with the place it stands at.

const ROOT = process.cwd();

/** The paragraph a place opens, read from the library's own file: /saints/<saint>/<work>#p-<section>-<paragraph>. */
function paragraphAt(href: string): string | null {
  const m = /^\/saints\/([a-z0-9-]+)\/([a-z0-9-]+)#p-(\d+)-(\d+)$/.exec(href);
  if (!m) return null;
  const file = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", m[1], `${m[2]}.json`), "utf8")) as { sections: { n: number; paragraphs: string[] }[] };
  return file.sections.find((s) => s.n === Number(m[3]))?.paragraphs[Number(m[4])] ?? null;
}

const plainWords = (s: string) => (s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) ?? []).join(" ");

describe("the app's own quotes to learn", () => {
  const offers = carriedQuotes();

  it("are there, each once, each a quote that can be kept", () => {
    expect(offers.length).toBeGreaterThanOrEqual(20);
    expect(new Set(offers.map((o) => o.key)).size).toBe(offers.length);
    for (const o of offers) {
      const item = quoteItem(o, 1);
      expect(item, o.text.slice(0, 40)).not.toBeNull();
      expect(item!.key).toBe(o.key);
    }
  });

  it("stand word for word in the paragraph their place opens", () => {
    for (const o of offers) {
      const paragraph = paragraphAt(o.cite.href);
      expect(paragraph, o.cite.href).toBeTruthy();
      expect(plainWords(paragraph!), `${o.by}: ${o.text.slice(0, 40)}`).toContain(plainWords(o.text));
    }
  });

  it("name a saint only over words in a work of his own, or as Today's sayings name the speaker by hand", () => {
    const sayings = (JSON.parse(fs.readFileSync(path.join(ROOT, "data", "today", "sayings.json"), "utf8")) as { sayings: { text: string; attribution: string }[] }).sayings;
    for (const o of offers) {
      const saying = sayings.find((s) => s.text.trim() === o.text);
      if (saying) expect(o.by).toBe(saying.attribution);
      else expect(o.by).toBe(o.cite.author);
    }
  });
});

describe("a line the reader gathered", () => {
  const book = (items: Florilegium["items"]): Florilegium => ({ id: "f", title: "Mine", createdAt: 1, updatedAt: 1, items });

  it("is offered when the app's page wrote its author, its work and its address", () => {
    const [o] = gatheredQuotes([
      book([
        { id: "1", addedAt: 5, kind: "father", text: "The glory of God is a living man.", author: "St. Irenaeus of Lyons", work: "Against Heresies", href: "/saints/irenaeus-of-lyons/against-heresies#p-4-20" },
        { id: "2", addedAt: 6, kind: "father", text: "No work named", author: "St. Basil the Great", href: "/theology/trinity" },
        { id: "3", addedAt: 7, kind: "father", text: "No address", author: "St. Basil the Great", work: "On the Holy Spirit" },
        { id: "4", addedAt: 8, kind: "scripture", text: "Jesus wept.", reference: "John 11:35", book: "john", chapter: 11, verse: 35 },
      ]),
    ]);
    expect(o).toMatchObject({ by: "St. Irenaeus of Lyons", cite: { work: "Against Heresies", href: "/saints/irenaeus-of-lyons/against-heresies#p-4-20" } });
    expect(gatheredQuotes([book([])])).toEqual([]);
  });
});

describe("a line Who said it found", () => {
  const cite = { kind: "father", href: "/saints/john-chrysostom/paschal-homily#p-1-4", author: "St. John Chrysostom", work: "The Paschal Homily", place: "" } as const;

  it("is learned in the book's own words, never the paste", () => {
    const o = foundQuote({ match: "close", cite, excerpt: "… and Let no one fear death, for the Saviour's death hath set us free. He hath …", words: "Let no one fear death, for the Saviour's death hath set us free." })!;
    expect(o.text).toBe("Let no one fear death, for the Saviour's death hath set us free.");
    expect(o.by).toBe("St. John Chrysostom");
    const kept = cleanItem(o.key, { kind: "quote", ...o, addedAt: 3 });
    expect(kept && !isGone(kept) && kept.kind).toBe("quote");
  });

  it("falls back to the excerpt, its cut marks off, for an answer from before the words came with it", () => {
    expect(foundQuote({ match: "exact", cite, excerpt: "… Let no one fear death …" })!.text).toBe("Let no one fear death");
  });

  it("goes by the work's name where no one signed the work", () => {
    const council = { kind: "father", href: "/councils/nicaea-i/creed#p-1-0", author: "", work: "The Creed of Nicaea", place: "" } as const;
    expect(foundQuote({ match: "exact", cite: council, excerpt: "We believe in one God", words: "We believe in one God" })!.by).toBe("The Creed of Nicaea");
  });
});
