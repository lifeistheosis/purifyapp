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

  it("the host needs no device, and the marks are painted without the words", () => {
    expect(read("components/reading/MarkHost.tsx")).not.toMatch(/^"use client";/);
    const layer = read("components/reading/MarksLayer.tsx");
    // It reads the words from the page, and takes none as a prop.
    expect(layer).toContain("export function MarksLayer() {");
    expect(layer).toContain("lineBoxes(found.el,");
  });
});
