// Quote in journal (1.9, docs/1.9-build/JOURNAL.md, "quoting anything"): held
// words land on the page being written, with their source and a way back.
// Scripture for everyone; the rest of the library for Plus, shown with the
// Plus mark; and only the library's own pages offer the library's mark.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAX_BODY } from "../entries";
import { heldCite, heldHref, isLibraryPlace, LIBRARY_PLACES } from "../libraryPlaces";
import { libraryBlock, parsePage, serializePage, verseBlock } from "../page";
import { draftWithQuote, JOURNAL_OPEN_KEY, quoteInJournal, takeJournalOpen } from "../quoteInJournal";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const card = verseBlock("john", 4, 14)!;
const lib = libraryBlock("Lord, have mercy.", "The Jesus Prayer", "/prayers/jesus-prayer/")!;

describe("the quote lands on the page being written", () => {
  it("begins a page when nothing is being written (the sheet adds the line to write on as it opens)", () => {
    const next = draftWithQuote(null, card)!;
    expect(next.kind).toBe("reflection");
    expect(parsePage(next.body).blocks).toEqual([card]);
  });

  it("goes at the end of the page being written, keeping its title, kind and source", () => {
    const kept = { kind: "prayer" as const, body: serializePage({ title: "Evening", blocks: [{ type: "text", text: "Thank You." }] }), editing: "abc" };
    const next = draftWithQuote(kept, lib)!;
    expect(next.kind).toBe("prayer");
    expect(next.editing).toBe("abc");
    expect(parsePage(next.body)).toEqual({ title: "Evening", blocks: [{ type: "text", text: "Thank You." }, lib] });
  });

  it("a verse's note takes no card: the quote begins a page of its own", () => {
    const note = { kind: "reflection" as const, body: "My note on the verse.", editing: "note:john:3:16" };
    const next = draftWithQuote(note, card)!;
    expect(next.editing).toBeUndefined();
    expect(parsePage(next.body).blocks[0]).toEqual(card);
  });

  it("is not laid when the page would pass the server's limit", () => {
    const full = { kind: "reflection" as const, body: "x".repeat(MAX_BODY - 10) };
    expect(draftWithQuote(full, lib)).toBeNull();
  });

  it("asks the journal, once, to open on the page", () => {
    const store = (): Storage => {
      const m = new Map<string, string>();
      return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 };
    };
    const g = globalThis as { window?: unknown };
    g.window = { localStorage: store(), sessionStorage: store() };
    try {
      expect(quoteInJournal(card)).toBe(true);
      expect((g.window as { sessionStorage: Storage }).sessionStorage.getItem(JOURNAL_OPEN_KEY)).toBe("1");
      expect(takeJournalOpen()).toBe(true);
      expect(takeJournalOpen()).toBe(false);
    } finally {
      delete g.window;
    }
  });
});

describe("only the library's pages offer the library's mark", () => {
  it("knows the library's places, and nothing else", () => {
    for (const p of ["/prayers/morning/", "/saints/athanasius-the-great/on-the-incarnation/", "/chants/", "/bible/john/4/"]) expect(isLibraryPlace(p)).toBe(true);
    for (const p of ["/community/", "/shop/", "/account/", "/u/someone/", "/journal/", "/florilegium/", "/", null]) expect(isLibraryPlace(p)).toBe(false);
    expect(LIBRARY_PLACES).not.toContain("community");
  });

  it("cites the page by its heading, or by what the page says it is, and leads back to the words", () => {
    const doc = (h1: string, cite?: string) => ({
      querySelector: (s: string) =>
        s === "[data-cite]" ? (cite ? { getAttribute: () => cite } : null) : s === "main h1" ? { textContent: `  ${h1}\n` } : null,
    });
    expect(heldCite(null, doc("Morning Prayers"))).toBe("Morning Prayers");
    expect(heldCite(null, doc("On the Incarnation", "St. Athanasius, On the Incarnation"))).toBe("St. Athanasius, On the Incarnation");
    const held = { closest: (s: string) => (s === "[id]" ? { id: "p12" } : null) };
    expect(heldHref("/saints/athanasius-the-great/on-the-incarnation/", held)).toBe("/saints/athanasius-the-great/on-the-incarnation/#p12");
    expect(heldHref("/prayers/", { closest: () => ({ id: "bad id with spaces" }) })).toBe("/prayers/");
  });
});

describe("the places that offer it", () => {
  const pill = read("components/native/PressToCopy.tsx");
  const row = read("components/bible/VerseRow.tsx");
  const client = read("components/journal/JournalClient.tsx");
  const blocks = read("components/journal/PageBlocks.tsx");

  it("the hold pill: on the library's pages only, verbatim, cited, and Plus's, shown with the padlock", () => {
    expect(pill).toContain("const library = isLibraryPlace(pathname);");
    expect(pill).toContain("{library && !copied ? (");
    expect(pill).toContain("libraryBlock(text, heldCite(held.current, document), heldHref(pathname ??");
    expect(pill).toMatch(/if \(locked\) \{[\s\S]*?upgrade\.open\("journal"\);[\s\S]*?return;/);
    expect(pill).toContain("{locked ? <PlusLock size={14} /> :");
    expect(pill).toContain('router.push("/journal/")');
  });

  it("a verse's Study: Quote in journal, free, as Scripture is", () => {
    const study = row.slice(row.indexOf('key: "journal"'), row.indexOf('key: "journal"') + 400);
    expect(study).toContain("verseBlock(book, chapter, verse.n)");
    expect(study).toContain("quoteInJournal(card)");
    expect(study).not.toContain("locked");
  });

  it("the journal opens on the page the quote went to", () => {
    expect(client).toMatch(/if \(!mounted \|\| !takeJournalOpen\(\)\) return;[\s\S]*?begin\(kept\);/);
  });

  it("a library quote's card: the words never edited, the library's mark, and the way back", () => {
    const card = blocks.slice(blocks.indexOf("function LibraryCard"), blocks.indexOf("function QuoteCard"));
    expect(card).toContain('t("journal.page.fromLibrary")');
    expect(card).toContain("<Link href={block.href}");
    expect(card).toMatch(/min-h-11/);
    expect(card).not.toMatch(/<textarea|<input/);
  });
});
