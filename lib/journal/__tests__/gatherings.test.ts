import { describe, expect, it } from "vitest";

import type { FlorilegiumItem } from "@/lib/florilegium/florilegium";
import type { JournalRecord } from "@/lib/journal/entries";
import { draftInGathering, gatheringNotebook, gatheringOf, lineBlock, notebookChoices, pagesIn, renameNotebook, sameNotebook, writingIn } from "@/lib/journal/gatherings";
import { parsePage, tidyBlocks, type PageBlock } from "@/lib/journal/page";

/**
 * The Florilegium and the journal's notebooks as one (build 93 note 19, the
 * owner on 2026-11-11: "I want the Florigelium and the notebook system like
 * intertwined").
 *
 * Before, they met nowhere: a notebook was a name on pages, a gathering its
 * own list. They are joined by the name: a gathering's notebook is the one
 * that bears its name, and nothing new is kept anywhere for it.
 */

const label = (b: Extract<PageBlock, { type: "verse" }>) => `${b.book} ${b.chapter}:${b.from}`;
const record = (id: string, body: string, at: string, more: Partial<JournalRecord> = {}): JournalRecord => ({ id, kind: "reflection", body, createdAt: at, updatedAt: at, ...more });

const verse: FlorilegiumItem = { id: "v", addedAt: 1, kind: "scripture", text: "In the beginning was the Word.", reference: "John 1:1", book: "john", chapter: 1, verse: 1 };
const father: FlorilegiumItem = { id: "f", addedAt: 2, kind: "father", text: "A line kept from a work.", author: "A Father", work: "A work", href: "/saints/a-saint/a-work/#p3" };
const unplaced: FlorilegiumItem = { id: "u", addedAt: 3, kind: "father", text: "A line with no place to return to.", author: "A Father" };

describe("a gathering's notebook is the one that bears its name", () => {
  it("the name is kept as a page keeps a notebook's: one line, no brackets, within its length", () => {
    expect(gatheringNotebook("  The Prologue\nof John ")).toBe("The Prologue of John");
    expect(gatheringNotebook("On [the] Incarnation")).toBe(parsePage("# t\n\n[[notebook On the Incarnation]]").notebook);
    expect(gatheringNotebook("x".repeat(200)).length).toBeLessThanOrEqual(60);
  });

  it("two names are one notebook whatever their capitals and spaces, and no name is no notebook", () => {
    expect(sameNotebook("Advent 2026", "advent 2026 ")).toBe(true);
    expect(sameNotebook("Advent 2026", "Advent 2027")).toBe(false);
    expect(sameNotebook("", "")).toBe(false);
    expect(sameNotebook(undefined, "Advent")).toBe(false);
  });
});

describe("a gathering's pages", () => {
  const records = [
    record("a", "# The first\n\n[[notebook Advent 2026]]\n\nWords of the first.", "2026-11-01T08:00:00.000Z"),
    record("b", "[[notebook advent 2026]]\n\nNo title, only words.\n\n[[verse john 1:1]]", "2026-11-09T08:00:00.000Z", { kind: "prayer" }),
    record("c", "# Elsewhere\n\n[[notebook Lent 2027]]\n\nNot of this gathering.", "2026-11-10T08:00:00.000Z"),
    record("d", "# In no notebook\n\nWords.", "2026-11-10T09:00:00.000Z"),
    record("e", "# Taken away\n\n[[notebook Advent 2026]]\n\nGone.", "2026-11-10T10:00:00.000Z", { deletedAt: "2026-11-10T11:00:00.000Z" }),
  ];

  it("are the journal's pages whose notebook bears its name, newest first", () => {
    const pages = pagesIn("Advent 2026", records, label);
    expect(pages.map((p) => p.id)).toEqual(["b", "a"]);
    expect(pages[1]).toEqual({ id: "a", kind: "reflection", title: "The first", words: "Words of the first.", at: "2026-11-01T08:00:00.000Z" });
  });

  it("a page with no title is known by its words, a card named by what it is", () => {
    const [b] = pagesIn("Advent 2026", records, label);
    expect(b.title).toBe("");
    expect(b.kind).toBe("prayer");
    expect(b.words).toBe("No title, only words.\njohn 1:1");
  });

  it("a page taken away is not one of them, and a gathering with no pages has none", () => {
    expect(pagesIn("Advent 2026", records, label).some((p) => p.id === "e")).toBe(false);
    expect(pagesIn("The Beatitudes", records, label)).toEqual([]);
    expect(pagesIn("", records, label)).toEqual([]);
  });
});

describe("a gathered line as a card on a page", () => {
  it("a verse is a verse card: where it is, and no words of its own", () => {
    expect(lineBlock(verse)).toEqual({ type: "verse", book: "john", chapter: 1, from: 1, to: 1 });
  });

  it("a Father's line gathered from a place in the app is a quote from the library, with that place as its way back", () => {
    expect(lineBlock(father)).toEqual({ type: "library", text: "A line kept from a work.", cite: "A Father, A work", href: "/saints/a-saint/a-work/#p3" });
  });

  it("one with no place to return to is a quote with its source named, and never wears the library's mark", () => {
    expect(lineBlock(unplaced)).toEqual({ type: "quote", text: "A line with no place to return to.", by: "A Father" });
    // A way out of the app is no way back: the line is still kept, as a quote.
    expect(lineBlock({ ...father, href: "https://example.com/elsewhere" })?.type).toBe("quote");
  });
});

describe("the page a reader writes in a gathering", () => {
  const MAX = 20_000;

  it("with nothing being written, a new page in the gathering's notebook", () => {
    const next = draftInGathering(null, "Advent 2026", null, MAX)!;
    expect(next.kind).toBe("reflection");
    const page = parsePage(next.body);
    expect(page.notebook).toBe("Advent 2026");
    expect(page.title).toBe("");
  });

  it("from a gathered line, the page opens with that line as its card, and the editor gives the line to write on", () => {
    const page = parsePage(draftInGathering(null, "Advent 2026", lineBlock(verse), MAX)!.body);
    expect(page.blocks).toEqual([{ type: "verse", book: "john", chapter: 1, from: 1, to: 1 }]);
    expect(tidyBlocks(page.blocks).at(-1)).toEqual({ type: "text", text: "" });
    expect(page.notebook).toBe("Advent 2026");
  });

  it("the page being written in this gathering goes on, with every word of it, and takes the card at its end", () => {
    const waiting = { kind: "prayer" as const, body: "# Half a page\n\n[[notebook advent 2026]]\n\nHalf a thought." };
    expect(writingIn(waiting, "Advent 2026")).toBe(true);
    const next = draftInGathering(waiting, "Advent 2026", lineBlock(father), MAX)!;
    expect(next.kind).toBe("prayer");
    const page = parsePage(next.body);
    expect(page.title).toBe("Half a page");
    // Its notebook's name stays as its writer has it.
    expect(page.notebook).toBe("advent 2026");
    expect(page.blocks.map((b) => b.type)).toEqual(["text", "library"]);
    expect(page.blocks[0]).toEqual({ type: "text", text: "Half a thought." });
  });

  it("a gathered line is laid once: asked for again, the page is as it was", () => {
    const once = draftInGathering(null, "Advent 2026", lineBlock(verse), MAX)!;
    const twice = draftInGathering(once, "Advent 2026", lineBlock(verse), MAX)!;
    expect(parsePage(twice.body).blocks.filter((b) => b.type === "verse")).toHaveLength(1);
    const withFather = draftInGathering(twice, "Advent 2026", lineBlock(father), MAX)!;
    const again = draftInGathering(withFather, "Advent 2026", lineBlock(father), MAX)!;
    expect(parsePage(again.body).blocks.map((b) => b.type)).toEqual(["verse", "library"]);
  });

  // What waits and is another page is not taken for this one, and is not
  // written over: the device's side keeps it first (waiting.test.ts).
  it("a page begun somewhere else is another page: a new one begins here, with none of its words", () => {
    for (const body of ["# Half a page\n\nHalf a thought.", "[[notebook Lent 2027]]\n\nWords for another notebook."]) {
      const waiting = { kind: "reflection" as const, body };
      expect(writingIn(waiting, "Advent 2026")).toBe(false);
      const next = draftInGathering(waiting, "Advent 2026", null, MAX)!;
      const page = parsePage(next.body);
      expect(page.notebook).toBe("Advent 2026");
      expect(page.title).toBe("");
      expect(next.body).not.toContain("Half a thought.");
      expect(next.body).not.toContain("Words for another notebook.");
    }
  });

  it("an entry being changed, or a verse's note, is never taken for it, even one in this gathering", () => {
    for (const editing of ["11111111-1111-4111-8111-111111111111", "note:john:1:1"]) {
      const waiting = { kind: "reflection" as const, body: "[[notebook Advent 2026]]\n\nKept words being changed.", editing };
      expect(writingIn(waiting, "Advent 2026")).toBe(false);
      const next = draftInGathering(waiting, "Advent 2026", null, MAX)!;
      expect(next.editing).toBeUndefined();
      expect(next.body).not.toContain("Kept words being changed.");
      expect(parsePage(next.body).notebook).toBe("Advent 2026");
    }
  });

  it("a page that would grow past the server's limit is not made", () => {
    const waiting = { kind: "reflection" as const, body: `[[notebook Advent 2026]]\n\n${"x".repeat(60)}` };
    expect(draftInGathering(waiting, "Advent 2026", lineBlock(father), 100)).toBeNull();
  });
});

describe("a page's notebook choice offers the reader's gatherings first", () => {
  it("gatherings by name, then the other notebooks; the page's own left out, and no name twice", () => {
    const offered = notebookChoices(["The Prologue of John", "Advent 2026"], ["advent 2026", "Lent 2027", "Parish notes"], "Lent 2027");
    expect(offered).toEqual([
      { name: "The Prologue of John", gathering: true },
      { name: "Advent 2026", gathering: true },
      { name: "Parish notes", gathering: false },
    ]);
  });

  it("a gathering's name is offered as a page keeps it, two gatherings of one name once, and no more than fit", () => {
    expect(notebookChoices(["On [the] Incarnation", "on the incarnation", "  "], [], undefined)).toEqual([{ name: "On the Incarnation", gathering: true }]);
    const many = Array.from({ length: 30 }, (_, i) => `Gathering ${i + 1}`);
    expect(notebookChoices(many, ["A notebook"], undefined)).toHaveLength(12);
    expect(notebookChoices([], [], "Advent 2026")).toEqual([]);
  });

  it("a notebook is known as a gathering's by its name alone", () => {
    const gatherings = [{ id: "g1", name: "The Prologue of John", lines: 5 }];
    expect(gatheringOf("the prologue of john", gatherings)?.id).toBe("g1");
    expect(gatheringOf("Advent 2026", gatherings)).toBeUndefined();
    expect(gatheringOf(null, gatherings)).toBeUndefined();
  });
});

describe("a gathering renamed takes its pages with it", () => {
  const records = [
    record("a", "# One\n\n[[notebook Advent 2026]]\n[[tags fasting]]\n\nWords.", "2026-11-01T08:00:00.000Z"),
    record("b", "[[notebook Lent 2027]]\n\nElsewhere.", "2026-11-02T08:00:00.000Z"),
    record("c", "[[notebook Advent 2026]]\n\nGone.", "2026-11-03T08:00:00.000Z", { deletedAt: "2026-11-04T08:00:00.000Z" }),
  ];

  it("every page of the old name bears the new one, and nothing else of it changes", () => {
    const changed = renameNotebook(records, "advent 2026", "The Nativity Fast");
    expect(changed.map((r) => r.id)).toEqual(["a"]);
    const page = parsePage(changed[0].body);
    expect(page.notebook).toBe("The Nativity Fast");
    expect(page.title).toBe("One");
    expect(page.tags).toEqual(["fasting"]);
    expect(page.blocks).toEqual(parsePage(records[0].body).blocks);
    expect(changed[0].createdAt).toBe(records[0].createdAt);
  });

  it("the same name, or no name, changes nothing", () => {
    expect(renameNotebook(records, "Advent 2026", "ADVENT 2026")).toEqual([]);
    expect(renameNotebook(records, "Advent 2026", "  ")).toEqual([]);
    expect(renameNotebook(records, "The Beatitudes", "Something")).toEqual([]);
  });
});
