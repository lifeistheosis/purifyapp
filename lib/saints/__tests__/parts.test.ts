// A work's parts as its reader names them (1.8, round 6, the owner's pick A
// of r3-29, "As the Bible reads"; lib/saints/parts.ts): the head of each
// chapter's page, the pill, the running line and the contents all say one
// name, the work's own. Build 86 said "All 603 chapters" at the top and
// "Section 1 of 603" at the foot of the Conferences.
//
// What a reader would notice if this broke: a chapter headed by the wrong
// part ("Conference 2" over Conference 1's words), a part with two names, a
// contents that drops a chapter, or a part the edition leaves out shown as
// if it were there.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { widestNames, wordsLeft } from "@/components/saints/MobileWorkPill";
import { divisionsOf } from "@/lib/saints/divisions";
import { PART_LEVELS, captionOf, neighbours, partsOf, type ContentsEntry, type SectionHead } from "@/lib/saints/parts";
import { SAINTS } from "@/lib/saints/saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");
type Work = { title: string; sections: { n: number; title: string; paragraphs: string[] }[] };
const read = (key: string): Work => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", `${key}.json`), "utf8")) as Work;
const parts = (key: string) => {
  const w = read(key);
  return { w, ...partsOf(w.sections, divisionsOf(key, w), w.title) };
};
const headOf = (heads: SectionHead[], n: number) => heads.find((h) => h.n === n)!;
const groups = (contents: ContentsEntry[]) => contents.filter((e): e is Extract<ContentsEntry, { kind: "group" }> => e.kind === "group");

describe("St John Cassian's Conferences, as the sheet draws them", () => {
  const { w, heads, contents } = parts("john-cassian/conferences");

  it("head each chapter with its conference large, the chapter under it, and its own title", () => {
    const h = headOf(heads, 2);
    expect(h.name).toEqual({ level: "conference", n: 1 });
    expect(h.sub).toEqual({ level: "chapter", n: 2 });
    expect(h.caption).toBe("Of the question of Abbot Moses, who asked what was the goal and what the end of the monk.");
    expect(h.pill).toEqual({ name: { level: "conference", n: 1 }, inner: 2 });
    expect(h.count).toEqual({ name: { level: "chapter", n: 2 }, total: 23 });
    // Conference 10, Chapter 10: "Of the method of continual prayer."
    const c1010 = heads.find((x) => "level" in x.name && x.name.n === 10 && x.sub && "n" in x.sub && x.sub.n === 10)!;
    expect(c1010.caption).toBe("Of the method of continual prayer.");
    expect(c1010.count).toEqual({ name: { level: "chapter", n: 10 }, total: 14 });
    // A chapter the edition prints with no title of its own has none.
    expect(headOf(heads, 110).caption).toBeNull();
    expect(headOf(heads, 110).sub).toEqual({ level: "chapter", n: 18 });
  });

  it("list the conferences as the books sheet lists books, 12 and 22 where they would stand, not in this edition", () => {
    const g = groups(contents);
    expect(g.map((x) => ("n" in x.name ? x.name.n : 0))).toEqual(Array.from({ length: 24 }, (_, k) => k + 1));
    expect(g.filter((x) => x.omitted).map((x) => ("n" in x.name ? x.name.n : 0))).toEqual([12, 22]);
    expect(g.find((x) => "n" in x.name && x.name.n === 1)!.sections).toHaveLength(23);
    // Every chapter once, in the work's order.
    expect(g.flatMap((x) => x.sections.map((s) => s.n))).toEqual(w.sections.map((s) => s.n));
    expect(contents.some((e) => e.kind !== "group")).toBe(false);
  });

  it("turn from the last chapter of one conference to the first of the next", () => {
    const lastOf1 = g1Last();
    const { next } = neighbours(heads, lastOf1);
    expect(next?.name).toEqual({ level: "conference", n: 2 });
    expect(next?.sub).toEqual({ level: "chapter", n: 1 });
    expect(neighbours(heads, w.sections[0].n).prev).toBeNull();
    expect(neighbours(heads, w.sections.at(-1)!.n).next).toBeNull();
    function g1Last() {
      return groups(contents)[0].sections.at(-1)!.n;
    }
  });
});

describe("the other ways a work is divided", () => {
  it("the Institutes: Book 6 is not in this edition", () => {
    const { contents } = parts("john-cassian/institutes");
    expect(groups(contents).filter((x) => x.omitted).map((x) => ("n" in x.name ? x.name.n : 0))).toEqual([6]);
  });

  it("On the Incarnation: the Preface by its title, then the seven books", () => {
    const { heads, contents } = parts("john-cassian/on-the-incarnation");
    expect(contents[0]).toEqual({ kind: "row", n: 1, title: "Preface" });
    expect(groups(contents).map((x) => x.sections.length)).toEqual([6, 7, 16, 13, 15, 23, 31]);
    expect(headOf(heads, 1).name).toEqual({ text: "Preface" });
    expect(headOf(heads, 1).sub).toEqual({ text: "On the Incarnation of the Lord" });
    expect(headOf(heads, 12).name).toEqual({ level: "book", n: 2 });
    expect(headOf(heads, 12).sub).toEqual({ level: "chapter", n: 5 });
  });

  it("a work in one level of large parts: the homily large, the work under it, the verses its title", () => {
    const { w, heads, contents } = parts("john-chrysostom/homilies-on-matthew");
    const h = heads.find((x) => "level" in x.name && x.name.n === 15)!;
    expect(h.name).toEqual({ level: "homily", n: 15 });
    expect(h.sub).toEqual({ text: w.title });
    expect(h.caption).toBe("Matthew 5:1, 2");
    expect(h.pill).toEqual({ name: { level: "homily", n: 15 } });
    expect(contents).toHaveLength(1);
    expect(contents[0].kind).toBe("grid");
  });

  it("a work read by its chapters: the work large, the chapter under it, a title of our own in italic", () => {
    const { w, heads, contents } = parts("ignatius-of-antioch/epistle-to-the-ephesians");
    expect(heads[0].name).toEqual({ text: "Salutation" });
    expect(contents[0]).toEqual({ kind: "row", n: w.sections[0].n, title: "Salutation" });
    expect(heads[1].name).toEqual({ text: w.title });
    expect(heads[1].sub).toEqual({ level: "chapter", n: 1 });
    expect(heads[1].caption).toBe("Praise of the Ephesians");
  });

  it("numbers read from the titles where no scheme gives them: St Gregory's chapters, St Cyprian's letters", () => {
    const oration = parts("gregory-theologian/on-holy-baptism");
    expect(oration.heads[2].sub).toEqual({ level: "chapter", n: 3 });
    expect(oration.heads[2].caption).toBeNull();
    const letters = parts("cyprian-of-carthage/letters-on-the-baptism-of-heretics");
    expect(letters.heads[0].name).toEqual({ level: "letter", n: 69, roman: true });
    expect(letters.heads[0].caption).toBe("To Januarius and the other bishops of Numidia");
  });

  it("a work whose parts have only titles of our own: each by its title", () => {
    const { w, heads, contents } = parts("arsenius-the-great/sayings-of-abba-arsenius");
    expect(contents.every((e) => e.kind === "row")).toBe(true);
    expect(heads[1].name).toEqual({ text: w.sections[1].title });
    expect(heads[1].sub).toEqual({ text: w.title });
    expect(heads[1].count).toBeNull();
  });

  it("a work of one section is one page, with nothing to choose", () => {
    const { w, heads, contents } = parts("anthony-the-great/life-of-antony");
    expect(heads).toHaveLength(1);
    expect(heads[0].name).toEqual({ text: w.title });
    expect(heads[0].sub).toBeNull();
    expect(contents).toEqual([]);
  });

  it("the words of a title after its numbering", () => {
    expect(captionOf("Book 1, on Job 1")).toBe("on Job 1");
    expect(captionOf("Book I, Chapter III. Proof that there is a God")).toBe("Proof that there is a God");
    expect(captionOf("Sermon XXI. On the Feast of the Nativity, I")).toBe("On the Feast of the Nativity, I");
    expect(captionOf("Codex 1" + String.fromCharCode(0x2014) + " Theodore the Presbyter")).toBe("Theodore the Presbyter");
    expect(captionOf("Discourse I")).toBeNull();
    expect(captionOf("Conference 5, Chapter 18")).toBeNull();
  });
});

describe("every work in the library", () => {
  const keys = SAINTS.flatMap((s) => s.works.map((x) => `${s.slug}/${x.slug}`));

  it("heads every section, and lists every section once in its contents", () => {
    expect(keys.length).toBeGreaterThan(140);
    for (const key of keys) {
      const { w, heads, contents } = parts(key);
      expect(heads.map((h) => h.n), key).toEqual(w.sections.map((s) => s.n));
      for (const h of heads) expect(("text" in h.name ? h.name.text : h.name.level).length, `${key} ${h.n}`).toBeGreaterThan(0);
      if (w.sections.length === 1) continue;
      const listed = contents.flatMap((e) => (e.kind === "row" ? [e.n] : e.sections.map((s) => s.n)));
      expect(listed, key).toEqual(w.sections.map((s) => s.n));
    }
  });

  it("names its parts only by names every language has", () => {
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "i18n", "messages", "en.json"), "utf8")) as Record<string, string>;
    for (const level of PART_LEVELS) expect(en[`reading.part.${level}`], level).toMatch(/\{n\}/);
    for (const key of ["reading.part.of", "reading.part.notInEdition", "reading.part.bookmark"]) expect(en[key], key).toBeTruthy();
    for (const key of keys) {
      const { heads } = parts(key);
      for (const h of heads) for (const n of [h.name, h.sub, h.pill.name]) if (n && "level" in n) expect(PART_LEVELS, `${key} ${h.n}`).toContain(n.level);
    }
  });
});

describe("the running line's minutes", () => {
  it("count what is left of the chapter from the line being read", () => {
    // A chapter of one paragraph of 2,072 words (Conference 10, Chapter 10), read halfway.
    expect(wordsLeft([2072], 0, 0.5)).toBe(1036);
    expect(wordsLeft([100, 300, 200], 1, 0.25)).toBe(425);
    expect(wordsLeft([100, 300, 200], 2, 1)).toBe(0);
    expect(wordsLeft([100, 300, 200], 0, -1)).toBe(600);
  });
});

// The pill keeps one width as the parts turn (1.9; the fresh-eyes walk: "a
// council document's Next bar shifts 47px when tapped"). It hugs its name in
// the middle of the screen, so a longer or shorter name moved both arrows out
// from under the finger turning the parts.
describe("the pill's width", () => {
  it("is held by every name of a short work, each once", () => {
    const names = ["On the Symbol of the Faith", "The Ecthesis of the Synod at Nice", "The Canons", "The Canons"];
    expect(widestNames(names)).toEqual(["On the Symbol of the Faith", "The Ecthesis of the Synod at Nice", "The Canons"]);
  });

  it("and by the longest few of a long one, so six hundred names are not drawn under the one shown", () => {
    const names = Array.from({ length: 603 }, (_, i) => `Chapter ${i + 1}`);
    const kept = widestNames(names);
    expect(kept.length).toBe(8);
    for (const n of kept) expect(n.length).toBe("Chapter 603".length);
  });

  it("the pill lays them under the name, unseen, in the name's own place, and both readers hand it every part", () => {
    const pill = fs.readFileSync(path.join(ROOT, "components", "saints", "MobileWorkPill.tsx"), "utf8");
    // The names at the level the pill could fit (lib/saints/__tests__/pillFits.test.ts).
    expect(pill).toContain("const names = heads.map((h, i) => sayPill(pillAt(h, i, level, byPlace)));");
    expect(pill).toContain("const widest = widestNames(names).filter((n) => n !== name);");
    // One cell: the unseen names and the one shown stand in the same place.
    expect(pill).toMatch(/aria-hidden data-pill-width="" className="invisible col-start-1 row-start-1/);
    expect(pill).toMatch(/<span lang=\{nameLang\} dir=\{textDir\(nameLang\)\} className="col-start-1 row-start-1/);
    for (const reader of ["components/saints/WritingReader.tsx", "components/councils/CouncilReader.tsx"]) {
      expect(fs.readFileSync(path.join(ROOT, reader), "utf8"), reader).toContain("<MobileWorkPill head={head} prev={prev} next={next} heads={heads} onGo={go} words={words} />");
    }
  });
});
