// The reader's side of a work in parts and of a note stored as a span
// (lib/saints/writingClient.ts, lib/bible/chapterData.ts), against a bundle
// that answers the way the build writes it.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetChapterData, loadChapterCommentary } from "@/lib/bible/chapterData";
import { fetchWorkSection, fetchWorkTitle, fetchWriting, forgetWritings } from "@/lib/saints/writingClient";
import { PART_BYTES, spanOf, splitWork, workFileName, type WholeWork } from "@/lib/saints/writingParts";

const long = (word: string) => Array.from({ length: 12 }, (_, i) => `${word} paragraph ${i}. ${"word ".repeat(PART_BYTES / 60)}`);
const WORK: WholeWork = {
  title: "Homilies on the Gospel of John",
  source: "NPNF I 14",
  sections: [1, 2, 3, 4, 5].map((n) => ({ n, title: `Homily ${n}`, paragraphs: long(`h${n}`) })),
};
const SMALL: WholeWork = { title: "On the Incarnation", sections: [{ n: 1, title: "One", paragraphs: ["Whole in its file."] }] };

let files: Record<string, unknown>;
let asked: string[];

beforeEach(() => {
  forgetWritings();
  forgetChapterData();
  const { index, parts } = splitWork(WORK);
  expect(parts.length).toBeGreaterThan(2);
  files = { "/saints-data/john-chrysostom/homilies-on-john.json": index, "/saints-data/athanasius-the-great/on-the-incarnation.json": SMALL };
  parts.forEach((part, n) => (files[`/saints-data/john-chrysostom/${workFileName("homilies-on-john", n)}`] = part));
  asked = [];
  vi.stubGlobal("fetch", async (path: string) => {
    asked.push(path);
    return path in files ? { ok: true, json: async () => structuredClone(files[path]) } : { ok: false, json: async () => null };
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("a work, read", () => {
  it("is whole again from its index and parts, and a whole file is read as it is", async () => {
    expect(await fetchWriting("john-chrysostom", "homilies-on-john")).toEqual(WORK);
    expect(await fetchWriting("athanasius-the-great", "on-the-incarnation")).toEqual(SMALL);
    expect(await fetchWriting("nobody", "nothing")).toBeNull();
  });

  it("reads one part for one section, and each file once", async () => {
    const section = await fetchWorkSection("john-chrysostom", "homilies-on-john", 4);
    expect(section).toEqual(WORK.sections[3]);
    expect(asked.filter((p) => /\.p\d+\.json$/.test(p))).toHaveLength(1);
    await fetchWorkSection("john-chrysostom", "homilies-on-john", 4);
    expect(await fetchWorkTitle("john-chrysostom", "homilies-on-john")).toBe("Homilies on the Gospel of John");
    expect(asked).toHaveLength(2);
    expect(await fetchWorkSection("john-chrysostom", "homilies-on-john", 99)).toBeNull();
    expect(await fetchWorkSection("athanasius-the-great", "on-the-incarnation", 1)).toEqual(SMALL.sections[0]);
  });

  it("is not whole when a part cannot be read, and asks again the next time", async () => {
    const missing = "/saints-data/john-chrysostom/homilies-on-john.p1.json";
    const part = files[missing];
    delete files[missing];
    expect(await fetchWriting("john-chrysostom", "homilies-on-john")).toBeNull();
    files[missing] = part;
    expect(await fetchWriting("john-chrysostom", "homilies-on-john")).toEqual(WORK);
  });
});

describe("a chapter's commentary, read", () => {
  const words = WORK.sections[2].paragraphs[4].slice(10, 400);
  const at = { work: "john-chrysostom/homilies-on-john", section: 3, paragraph: 4, place: "Homily 3" };
  const own = { author: "St. Bede", work: "On John", citation: "PL 92", text: "His own words, kept in the chapter's file." };
  const pointed = { author: "St. John Chrysostom", work: "Homilies on John", citation: "NPNF1-14", at };

  beforeEach(() => {
    files["/bible-data/commentary/john/1.json"] = {
      "1": [own, { ...pointed, text: "", span: spanOf(WORK.sections[2], words) }],
      "2": [{ ...pointed, text: "", span: spanOf(WORK.sections[2], words) }],
    };
  });

  it("hands the reader every note with its words, and no span", async () => {
    const commentary = await loadChapterCommentary("john", 1);
    expect(commentary).toEqual({ "1": [own, { ...pointed, text: words }], "2": [{ ...pointed, text: words }] });
    // The work's index and the one part: not the whole work.
    expect(asked.filter((p) => p.startsWith("/saints-data/"))).toHaveLength(2);
    const before = asked.length;
    expect(await loadChapterCommentary("john", 1)).toBe(commentary);
    expect(asked).toHaveLength(before);
  });

  it("leaves out a note whose work cannot be read, shows nothing in its place, and reads again later", async () => {
    const index = "/saints-data/john-chrysostom/homilies-on-john.json";
    const kept = files[index];
    delete files[index];
    expect(await loadChapterCommentary("john", 1)).toEqual({ "1": [own] });
    files[index] = kept;
    await Promise.resolve();
    expect(await loadChapterCommentary("john", 1)).toEqual({ "1": [own, { ...pointed, text: words }], "2": [{ ...pointed, text: words }] });
  });

  it("answers null for a chapter with no file", async () => {
    expect(await loadChapterCommentary("obadiah", 1)).toBeNull();
  });
});
