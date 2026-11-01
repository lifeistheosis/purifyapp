// Every chapter title in the library is whole (1.8, the owner's note 79 and
// sheet r3-29: "fix all of them").
//
// Where an edition's heading broke over a line, the ingest kept the first
// line as the title and stood the rest as the chapter's first paragraph, or
// lost it: St John Cassian's Conference 1, Chapter 2 was titled "Of the
// question of Abbot Moses, who asked what was the goal and what" and its
// words opened "the end of the monk." 204 of the Conferences' 492 titles were
// cut so (five had lost the rest), 79 of the 111 chapters On the Incarnation
// filed after them, 163 of the Institutes' 268 (12 lost), 140 of St
// Augustine's Harmony of the Gospels' 150 (one lost); his Sermons on Selected
// Lessons had 32 headings cut at 140 characters, and St John Chrysostom's
// Homily 39 on Acts its second chapter. Each title is now the edition's
// heading whole (NPNF II 11, NPNF I 6, NPNF I 11), and the paragraph that
// held its rest is an empty slot, so no reader's highlight, note or kept
// place, all kept by section and paragraph, moves.
//
// What a reader would notice if this broke: a chapter's heading that stops
// mid-sentence, and a first paragraph of a few words that finishes it.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SAINTS } from "@/lib/saints/saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");
type Work = { sections: { n: number; title: string; paragraphs: string[] }[] };
const read = (saint: string, work: string): Work =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${work}.json`), "utf8")) as Work;

const WORKS = SAINTS.flatMap((s) => s.works.map((w) => ({ key: `${s.slug}/${w.slug}`, work: read(s.slug, w.slug) })));
const section = (key: string, n: number) => WORKS.find((w) => w.key === key)!.work.sections.find((s) => s.n === n)!;

/** A title ends here when it was cut: a comma, an article, a preposition, a joining word. */
const OPEN_END =
  /(?:,|\b(?:a|an|the|of|in|on|to|with|by|for|from|into|upon|against|through|at|about|before|after|under|over|between|among|towards?|and|or|nor|but|that|whether|than|if|because|while|when|where|how|why|what|which|who|whom|whose))$/i;
/** How a title or a sentence closes. */
const CLOSED = /[.?!"')\]:;”’]$/;

/** Titles that end on such a word whole, as the edition or our own heading has them. */
const ENDS_SO: Record<string, string> = {
  "apostle-james-zebedee/first-of-the-martyrs 1": "our heading, Matthew 20:22's own words: The cup that I shall drink of",
  "justin-martyr/dialogue-with-trypho 34": "ANF's heading, whole: ... whose faults Christians shudder at",
  "justin-martyr/first-apology 11": "ANF's heading, whole: What kingdom Christians look for",
  "lawrence-the-archdeacon/the-treasures-of-the-church 3": "our heading: After",
};

/**
 * First paragraphs that open in lower case under a titled chapter, and are
 * not a title's rest. The Exact Exposition IV.7 lost its opening words at the
 * ingest ("The words" and the Greek before "ageneton"): a paragraph's head,
 * not a title's, and not mended here.
 */
const OPENS_LOW: Record<string, string> = {
  "john-of-damascus/exact-exposition-of-the-orthodox-faith 79": "the paragraph's own opening words were lost, not the title's",
};

describe("every chapter title in the library", () => {
  it("covers every work the library registers", () => {
    expect(WORKS.length).toBeGreaterThan(140);
  });

  it("never stops on a comma or a word that cannot end a heading", () => {
    const cut: string[] = [];
    for (const { key, work } of WORKS) {
      for (const s of work.sections) {
        if (OPEN_END.test(s.title.trim()) && !ENDS_SO[`${key} ${s.n}`]) cut.push(`${key} ${s.n}: ${s.title.slice(-60)}`);
      }
    }
    expect(cut).toEqual([]);
  });

  it("never leaves its rest as the chapter's first paragraph", () => {
    const rest: string[] = [];
    for (const { key, work } of WORKS) {
      for (const s of work.sections) {
        // A title with a caption after its numbers ("Book 8, Chapter 21. ...").
        const m = /^(?:Book|Conference|Sermon|Homily|Chapter|Part|Discourse)\b[^.]*\.\s+(.+)$/.exec(s.title.trim());
        const first = (s.paragraphs[0] ?? "").trim();
        if (!m || CLOSED.test(m[1]) || !first) continue;
        if (/^[a-z]/.test(first) && !OPENS_LOW[`${key} ${s.n}`]) rest.push(`${key} ${s.n}: ${s.title.slice(-40)} | ${first.slice(0, 40)}`);
      }
    }
    expect(rest).toEqual([]);
  });

  it("keeps the exceptions above true: each is a title or a paragraph that still exists", () => {
    for (const where of [...Object.keys(ENDS_SO), ...Object.keys(OPENS_LOW)]) {
      const [key, n] = where.split(" ");
      expect(section(key, Number(n)), where).toBeDefined();
    }
  });
});

describe("the editions mended (NPNF II 11, NPNF I 6, NPNF I 11)", () => {
  it("St John Cassian: every heading is the edition's, whole, and the slot of its rest stays empty", () => {
    for (const key of ["john-cassian/conferences", "john-cassian/institutes"]) {
      for (const s of WORKS.find((w) => w.key === key)!.work.sections) {
        // The edition's headings close on a full stop, a question or a quotation;
        // a chapter it prints with no heading is titled by its numbers alone.
        const bare = /^(?:Conference|Book) \d+, Chapter \d+$/.test(s.title);
        expect(bare || CLOSED.test(s.title), `${key} ${s.n}: ${s.title.slice(-60)}`).toBe(true);
      }
    }
    const c12 = section("john-cassian/conferences", 2);
    expect(c12.title).toBe("Conference 1, Chapter 2. Of the question of Abbot Moses, who asked what was the goal and what the end of the monk.");
    expect(c12.paragraphs[0]).toBe("");
    expect(c12.paragraphs[1].startsWith("All the arts and sciences, said he")).toBe(true);
    // One the cleaning of 1.8 had emptied: restored from the edition.
    expect(section("john-cassian/conferences", 9).title.endsWith("cannot remain with a man.")).toBe(true);
    expect(section("john-cassian/institutes", 22).title).toBe("Book 2, Chapter 11. Of the system according to which the Psalms are said among the Egyptians.");
    // Conference 5, Chapter 18 has no heading in the edition: its first line is Serapion's words, back in its paragraph.
    const c518 = section("john-cassian/conferences", 110);
    expect(c518.title).toBe("Conference 5, Chapter 18");
    expect(c518.paragraphs[0].startsWith("Serapion: Everybody is perfectly agreed that there are eight principal faults which affect a monk.")).toBe(true);
  });

  it("St Augustine's Harmony: each chapter's words open on its first numbered paragraph", () => {
    for (const s of WORKS.find((w) => w.key === "augustine-of-hippo/harmony-of-the-gospels")!.work.sections) {
      const first = s.paragraphs.find((p) => p.trim()) ?? "";
      expect(/^\d+\. /.test(first), `${s.n}: ${first.slice(0, 50)}`).toBe(true);
    }
    expect(section("augustine-of-hippo/harmony-of-the-gospels", 2).title).toBe(
      "Book 1, Chapter 2. On the Order of the Evangelists, and the Principles on Which They Wrote",
    );
    expect(section("augustine-of-hippo/harmony-of-the-gospels", 22).title).toBe("Book 1, Chapter 22. Of the Opinion Entertained by the Gentiles Regarding Our God");
  });

  it("St Augustine's Sermons: no heading is cut at 140 characters", () => {
    for (const s of WORKS.find((w) => w.key === "augustine-of-hippo/sermons-on-selected-lessons")!.work.sections) {
      const heading = s.title.replace(/^Sermon \d+\. /, "");
      // The cut fell mid-word ("Concer"); a heading ends on a stop or a citation now.
      expect(heading.length === 140 && !CLOSED.test(heading), `Sermon ${s.n}: ${heading.slice(-40)}`).toBe(false);
    }
    expect(section("augustine-of-hippo/sermons-on-selected-lessons", 2).title.endsWith('"Then Jesus cometh from Galilee to the Jordan unto John, to be baptized of him." Concerning the Trinity.')).toBe(true);
  });

  it("St John Chrysostom's Homily 39 on Acts names both its chapters", () => {
    expect(section("john-chrysostom/homilies-on-acts", 39).title).toBe("Homily 39, Acts 17:32-34, 18:1");
  });
});
