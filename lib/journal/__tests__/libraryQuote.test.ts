import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { libraryPages, pagePassages, passageQuote, passagesWith, quoteNeedsPlus, workAt, workPassages } from "@/lib/journal/libraryQuote";
import { parsePage, serializePage } from "@/lib/journal/page";
import { buildSearchCorpus } from "@/lib/search/buildCorpus";
import { writingFileNamed } from "@/lib/saints/writingFile";

/**
 * The editor's own Quote searches Purify's library (build 98 note 5, his words,
 * 2026-11-15 about 21:14 UTC: "still wanted you to be able to quote from here
 * by linking real works from purify").
 *
 * Until build 98 the editor's Quote laid a quote of one's own only, the words
 * and who said them typed by hand: the plan of 8 November (docs/1.9-build/
 * JOURNAL.md, "In the editor: the Quote block searches the same library") was
 * built only from the library's side. Now Quote opens a search of the app's
 * own corpus; a Father's work opens to its passages; the passage tapped lands
 * as Quote in journal lays one: verbatim, cited, Open back to its place inside
 * the app.
 *
 * What a reader would notice if this broke: Quote in the editor finding no
 * Father, or laying words that are not the Father's, or a quote with no name
 * and no way back; or the library's mark on words of their own.
 */
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("the editor's Quote, from Purify's library", () => {
  it("finds a Father's work with the app's own search, and lays one of its passages cited, word for word", async () => {
    const corpus = await buildSearchCorpus();
    const found = libraryPages(corpus, "On the Incarnation");
    const page = found.find((p) => p.href.startsWith("/saints/athanasius-the-great/on-the-incarnation"));
    expect(page, found.map((p) => p.href).join(", ")).toBeTruthy();
    if (!page) return;
    const work = workAt(page.href);
    expect(work).toEqual({ saint: "athanasius-the-great", work: "on-the-incarnation" });
    // The work's own file, as the apps carry it (app/saints-data/), read the way its route reads it.
    const file = (await writingFileNamed("athanasius-the-great", "on-the-incarnation.json")) as { sections: { n: number; paragraphs: string[] }[] };
    const passages = workPassages(file);
    expect(passages.length).toBeGreaterThan(20);
    // The reader finds the words in the work, and taps the passage.
    const chosen = passagesWith(passages, "became man")[0];
    expect(chosen, "a passage holding the words").toBeTruthy();
    const block = passageQuote(page, chosen);
    expect(block).not.toBeNull();
    if (!block || block.type !== "library") throw new Error("not a library quote");
    // Verbatim: the very words of a paragraph of the work, its spaces only made single.
    const section = file.sections.find((s) => `s${s.n}` === chosen.anchor);
    expect(section?.paragraphs.map((p) => p.replace(/\s+/g, " ").trim())).toContain(block.text);
    // Cited: the Father and the work. Open: back to the work, at the passage's section, inside the app.
    expect(block.cite).toBe(`${page.sublabel}, ${page.label}`);
    expect(block.cite).toMatch(/Athanasius/);
    expect(block.href).toBe(`${page.href.split("#")[0]}#${chosen.anchor}`);
    expect(block.href.startsWith("/saints/athanasius-the-great/on-the-incarnation")).toBe(true);
    // It is kept on the page as a library quote, and comes back as one: never as words of one's own.
    const again = parsePage(serializePage({ title: "", blocks: [block] })).blocks;
    expect(again).toEqual([block]);
  });

  it("searches the library's pages only: no settings, no shop, no Scripture page (a verse lands as its card)", async () => {
    const corpus = await buildSearchCorpus();
    for (const q of ["prayer", "council", "life", "homily"]) {
      for (const p of libraryPages(corpus, q)) {
        expect(["Reading", "Saints", "Prayers", "Councils & Heresies"]).toContain(p.group);
        expect(p.href.startsWith("/bible")).toBe(false);
      }
    }
    expect(libraryPages(corpus, "a")).toEqual([]);
  });

  it("takes a page's passages from its <main>, never its bars, links, buttons or source lines", () => {
    type El = { textContent: string; parents: string[]; id?: string };
    const el = (textContent: string, parents: string[] = [], id?: string): El => ({ textContent, parents, id });
    const all = [
      el("Glory to God for all things, said the Saint as he lay dying, and these were his last words to the brethren.", [], "life"),
      el("Read the full life of this saint in the second volume of the Prologue, with notes.", ["[data-cite]"]),
      el("Settings and more, a line of the page's own furniture that is long enough to count.", ["nav"]),
      el("Short line."),
      el("Glory to God for all things, said the Saint as he lay dying, and these were his last words to the brethren.", [], "life"),
    ];
    const doc = {
      querySelector: (s: string) =>
        s === "main"
          ? {
              querySelectorAll: () =>
                all.map((e) => ({
                  textContent: e.textContent,
                  closest: (sel: string) => (sel === "[id]" ? (e.id ? { id: e.id } : null) : e.parents.some((p) => sel.split(", ").includes(p)) ? {} : null),
                })),
            }
          : null,
    };
    expect(pagePassages(doc)).toEqual([{ text: all[0].textContent, anchor: "life" }]);
    expect(pagePassages({ querySelector: () => null })).toEqual([]);
  });

  it("gives Scripture and words of one's own to everyone, and the rest of the library to Plus", () => {
    expect(quoteNeedsPlus("/bible/john/3")).toBe(false);
    expect(quoteNeedsPlus("/saints/athanasius-the-great/on-the-incarnation")).toBe(true);
    expect(quoteNeedsPlus("/prayers/akathists/jesus")).toBe(true);
    // The editor: Quote opens the library's search, and words of one's own are its last row, as before.
    const tools = read("components/journal/PageBlocks.tsx");
    expect(tools).toContain('onClick={() => (panel === "quote" ? editor.shutPanel() : setPanel("quote"))}');
    expect(tools).toContain('else editor.insert({ type: "quote", text: "", by: "" });');
    const panel = read("components/journal/LibraryQuote.tsx");
    expect(panel).toContain('{locked && quoteNeedsPlus(p.href) ? <PlusMark className="shrink-0" /> : null}');
    expect(panel).toContain('t("journal.page.quoteOwn")');
  });
});
