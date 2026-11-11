// "The same features that the Bible section has, ensure that the other works
// also has, including the lives of the saints" (the owner, 2026-11-10), and
// build 93 note 13: any words, not only the whole paragraph.
//
// Every text he named says where its paragraphs' marks are kept, mounts the
// page's one selection tool, and never hands its words to the device a second
// time to do it (AGENTS.md, "A page carries what it shows").

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parsePlace, placeAttr, type MarkPlace } from "../placeAttr";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("where a paragraph's marks are kept", () => {
  const places: MarkPlace[] = [
    { kind: "saint", saintSlug: "cyprian-of-carthage", workSlug: "on-the-mortality", sectionN: 2, paragraphIdx: 0 },
    { kind: "text", text: "council", slug: "first-nicaea", doc: "the-twenty-canons", sectionN: 7, paragraphIdx: 1 },
    { kind: "text", text: "life", slug: "anthony-the-great", doc: "-", sectionN: 1, paragraphIdx: 3 },
    { kind: "text", text: "theology", slug: "papacy", doc: "-", sectionN: 0, paragraphIdx: 0 },
    { kind: "text", text: "history", slug: "pentecost", doc: "-", sectionN: 4, paragraphIdx: 2 },
  ];

  it("is written on the paragraph and read back the same", () => {
    for (const p of places) expect(parsePlace(placeAttr(p))).toEqual(p);
  });

  it("is refused when it is not a place", () => {
    for (const bad of [null, "", "saint|a|b|1", "text|sermon|x|-|1|0", "text|life|Not A Slug|-|1|0", "saint|a|b|one|0", "text|life|x|-|1|-2"]) expect(parsePlace(bad)).toBeNull();
  });
});

describe("every text he named", () => {
  const TEXTS: [string, string, string][] = [
    ["a council's document", "components/councils/CouncilSections.tsx", 'text: "council"'],
    ["a saint's life", "components/saints/LifeSection.tsx", 'text: "life"'],
    ["a theology study", "components/theology/StudyPartText.tsx", 'text: "theology" as const'],
    ["a history page", "components/history/EventArticle.tsx", 'text: "history"'],
  ];

  it.each(TEXTS)("%s says where its paragraphs' marks are kept, around words the page wrote", (_name, file, kind) => {
    const code = read(file);
    expect(code).toContain("<MarkHost");
    expect(code).toContain(kind);
    expect(code).toContain("data-mk-text=");
    // The page's own drawing: no client component is handed the words.
    expect(code).not.toMatch(/^"use client";/);
  });

  it("each mounts the page's marks and its selection", () => {
    for (const file of ["app/(app)/councils/[slug]/[document]/page.tsx", "components/saints/SaintLife.tsx", "app/(app)/theology/[topic]/read/page.tsx", "components/history/EventArticle.tsx"]) {
      expect(read(file), file).toContain("<ReadingMarks />");
    }
    expect(read("components/saints/WritingReader.tsx")).toContain("<SelectionToolsLazy />");
  });

  it("our own telling is never signed with a saint's or a council's name", () => {
    // A life, a history page and a study are Purify's words: a copy or a picture of them says so.
    for (const file of ["components/saints/LifeSection.tsx", "components/theology/StudyPartText.tsx", "components/history/EventArticle.tsx"]) {
      expect(read(file), file).toMatch(/name[=:] ?"Purify"/);
    }
  });

  it("a passage an event's account quotes is signed with its own source", () => {
    const article = read("components/history/EventArticle.tsx");
    expect(article).toContain("name={block.source ?? at.title}");
    expect(article).toContain("cite={block.source ? `${block.source} (quoted in ${at.title})` : `Quoted in ${at.title}`}");
  });

  it("arrives after the page without a boundary of its own, so no page switch is pictured twice", () => {
    // Fable Theology's finding of 2026-11-11 (scripts/route-motion.mjs): a part fetched with next/dynamic and
    // no server side is a Suspense boundary in the page's first draw, and its retry was pictured as a second switch.
    const lazy = read("components/reading/SelectionToolsLazy.tsx");
    expect(lazy).not.toMatch(/from "next\/dynamic"/);
    expect(lazy).not.toMatch(/\bdynamic\(/);
    expect(lazy).toContain('import("./SelectionTools")');
    expect(lazy).toContain('import("./MarksLayer")');
    expect(lazy).toContain("if (on) setPart(() => part);");
  });

  it("the host needs no device, and the marks are painted without the words", () => {
    expect(read("components/reading/MarkHost.tsx")).not.toMatch(/^"use client";/);
    const layer = read("components/reading/MarksLayer.tsx");
    // It reads the words from the page, and takes none as a prop.
    expect(layer).toContain("export function MarksLayer() {");
    expect(layer).toContain("lineBoxes(found.el,");
  });
});

// Build 93 note 17: "Refine the works note system, and it should be very
// similar to the Bible's UI when you hold down a verse." His pictures showed
// a boxed field inside the text with a resize grip, "Esc to close" on a phone,
// and the old sheet laid over the note's own buttons.
describe("a note on words of a text", () => {
  const row = read("components/saints/ParagraphRow.tsx");
  const tools = read("components/reading/SelectionTools.tsx");
  const sheet = read("components/reading/WordsNoteSheet.tsx");

  it("is written in the house's own sheet, the one a verse's note is written in", () => {
    expect(sheet).toContain("<JournalComposer");
    expect(read("components/bible/VerseNoteSheet.tsx")).toContain("<JournalComposer");
    for (const code of [row, tools]) expect(code).toContain("<WordsNoteSheet");
  });

  it("is never a field in the text, and carries no keyboard's hints", () => {
    for (const code of [row, tools]) {
      expect(code).not.toContain("<textarea");
      expect(code).not.toContain("bible.escToClose");
      expect(code).not.toContain("bible.noteSaveHint");
      expect(code).not.toContain("resize-y");
    }
  });

  it("opens with nothing laid over it: the card and the handles step aside while it is written", () => {
    expect(tools).toMatch(/\{sel &&\s+mode === "tools" &&\s+createPortal\(/);
    expect(tools).toContain('sel.touch && !sel.native && first && last && mode === "tools"');
    // And a tap inside the sheet is not a tap elsewhere: the selection stays until the note is done.
    expect(tools).toContain('busy.current = mode === "note" || picture !== null || naming !== undefined;');
  });

  it("says what it is a note on", () => {
    expect(read("components/journal/JournalComposer.tsx")).toContain('draft.editing?.startsWith("note:words:") ? "saints.words.note" : "bible.notePlaceholder"');
  });
});

