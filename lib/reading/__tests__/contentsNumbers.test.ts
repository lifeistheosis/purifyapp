// What a reader would notice if this broke: the Confessions' contents reading
// "1 Book I", then "102 Book II" to "113 Book XIII" (the owner's screenshot,
// 2026-10-26), or a number beside every title that already says it.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { divisionsOf, sectionLabel } from "@/lib/saints/divisions";

import { contentsNumbers, titleSays } from "../contentsNumbers";

type Work = { sections: { n: number; title: string; paragraphs: string[] }[] };
const work = (key: string): Work =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "saints", `${key}.json`), "utf8"));
const labelled = (key: string) => {
  const w = work(key);
  const d = divisionsOf(key, w);
  return w.sections.map((s) => ({ title: s.title, label: d ? (sectionLabel(d, w, s.n) ?? "") : String(s.n) }));
};

describe("a work's contents", () => {
  it("number the Confessions by its books, which their titles already say", () => {
    const books = labelled("augustine-of-hippo/confessions");
    expect(books.map((b) => b.label)).toEqual(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"]);
    expect(contentsNumbers(books)).toBeNull();
  });

  it("keep the numbers where the titles do not say them", () => {
    const chapters = labelled("john-of-damascus/exact-exposition-of-the-orthodox-faith");
    const numbers = contentsNumbers(chapters);
    expect(numbers?.[0]).toBe("I.1");
    expect(numbers?.length).toBe(chapters.length);
    expect(contentsNumbers([{ title: "Who May Speak of God", label: "1" }, { title: "The Two Natures", label: "2" }])).toEqual(["1", "2"]);
  });

  it("read a number as a whole word of the title", () => {
    expect(titleSays("Book II", "II")).toBe(true);
    expect(titleSays("Book III", "II")).toBe(false);
    expect(titleSays("Homily 8, Matthew 2:11", "8")).toBe(true);
    expect(titleSays("Homily 8, Matthew 2:11", "11")).toBe(false);
    expect(titleSays("Sermon 1, Luke 2:1-7", "1")).toBe(true);
  });

  it("leave out a section the edition does not number", () => {
    expect(contentsNumbers([{ title: "The salutation", label: "" }, { title: "Chapter 1", label: "1" }])).toBeNull();
  });
});
