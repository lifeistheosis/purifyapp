// St Cyril on John: no section, and no note on John's rail, opens inside a
// sentence the section before left open (1.9, F-49).
//
// The ingest cut a section at each italic quotation of John. Where the
// italics stand inside St Cyril's own sentence, 614 of the 1,070 sections
// began in the middle of one (Updates' count, 2026-11-10), and so did their
// notes on John's rail: John 1:1 opened "mete out heaven with the span".
// On 2026-11-11 each open sentence was carried forward into the section it
// runs on in, and thirty-two openings the ingest had dropped were put back
// from the transcription (scripts/mend-cyril-john-openings.mjs).
//
// What a reader would notice if this broke: a Father's page, or his note
// under a verse, that begins with a small letter in the middle of a thought;
// or a highlight that has slid to another paragraph.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { endsOpen, mend, mendSections, splitOpen } from "../../../scripts/mend-cyril-john-openings.mjs";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = <T,>(p: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8")) as T;

type Section = { n: number; title: string; paragraphs: string[] };
type Note = { author: string; work: string; summary?: boolean; text: string; at?: { work: string; section: number; paragraph: number } };

const WORK = read<{ sections: Section[] }>("data/saints/cyril-of-alexandria/commentary-on-john.json");
const BEFORE = read<{ words: number; sha256: string; paragraphs: [number, number][] }>("lib/saints/__tests__/fixtures/cyril-john-before.json");
const LEADS = read<{ leads: { section: number; lead: string; before: string }[] }>("scripts/cyril-john/lost-leads.json").leads;
const SECTION = new Map(WORK.sections.map((s) => [s.n, s]));
/** What stood as section 452: the translator's words, not St Cyril's. */
const NOT_HIS = "God rested the seventh day, as being a memorial of a promise that we too shall rest, as he says above that our rest on that day signifies this.";

const said = (paragraphs: string[]) => paragraphs.filter((p) => p.trim() !== "").join("\n\n");
const firstWords = (s: Section) => s.paragraphs.find((p) => p.trim() !== "") ?? "";
const opensSmall = (text: string) => /^[\s"“‘(\[]*[a-z]/.test(text);

function railNotes(): { where: string; note: Note }[] {
  const dir = path.join(ROOT, "data/bible/commentary/john");
  const out: { where: string; note: Note }[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f))) {
    const chapter = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Record<string, Note[]>;
    for (const [verse, notes] of Object.entries(chapter)) {
      for (const note of notes) if (/Cyril of Alexandria/.test(note.author) && !note.summary) out.push({ where: `John ${file.replace(".json", "")}:${verse}`, note });
    }
  }
  return out;
}

/**
 * Sections that still open with a small letter, each because the print does.
 * The transcription (tertullian.org, LFC 43 and 48) was read at every one.
 */
const PRINT_OPENS_SMALL: Record<number, string> = {
  181: "the lemma is the second half of John 3:36, which the print begins \"and he that believeth not the Son\"",
  331: "the lemma is John 6:32 from \"but My Father giveth you\", as the print has it under its verse number",
  347: "the lemma is the second half of John 6:37, \"and him that cometh to Me\"",
  361: "the lemma is John 6:42, which begins \"and said\" in the print, under its verse number",
  460: "Isaiah 53:8 quoted on past its question mark: \"Who then shall declare the generation of the Only-Begotten? for His Life is taken away\"",
  638: "the lemma after the print's own colon: \"when he adds: and do see\"",
  2012: "the print's reference to the verses, \"xviii. 24, 25, 26, 27\", before the lemma",
};

describe("St Cyril on John, the work", () => {
  it("leaves no sentence open at the end of a section", () => {
    const open = WORK.sections.slice(0, -1).filter((s) => endsOpen(s.paragraphs.at(-1) ?? ""));
    expect(open.map((s) => s.n)).toEqual([]);
  });

  it("opens every section on the beginning of a sentence, but where the print itself does not", () => {
    const small = WORK.sections.filter((s) => opensSmall(firstWords(s))).map((s) => s.n);
    expect(small).toEqual(Object.keys(PRINT_OPENS_SMALL).map(Number).sort((a, b) => WORK.sections.findIndex((s) => s.n === a) - WORK.sections.findIndex((s) => s.n === b)));
    // The first of them all, which the rail shows under John 1:1.
    expect(SECTION.get(2)?.paragraphs[0].startsWith("But since it was necessary in some sort to mete out heaven with the span,")).toBe(true);
    expect(SECTION.get(1)?.paragraphs.at(-1)).toBe("");
  });

  it("moved no reader's mark: every section has its number and as many paragraphs as before", () => {
    expect(WORK.sections.map((s) => [s.n, s.paragraphs.length])).toEqual(BEFORE.paragraphs);
    expect(new Set(WORK.sections.map((s) => s.n)).size).toBe(1070);
  });

  it("has every word it had, in the same order, and no new word but the openings put back", () => {
    const leadOf = new Map(LEADS.map((l) => [l.section, l.lead]));
    const words: string[] = [];
    for (const s of WORK.sections) {
      // The one thing taken out: the translator's footnote that stood as section 452.
      if (s.n === 452) words.push(...NOT_HIS.split(/\s+/));
      s.paragraphs.forEach((p, i) => {
        const lead = i === 0 ? leadOf.get(s.n) : undefined;
        if (lead) expect(p.startsWith(`${lead} `), `section ${s.n} opens with its lead`).toBe(true);
        words.push(...(lead ? p.slice(lead.length) : p).split(/\s+/).filter(Boolean));
      });
    }
    expect(words.length).toBe(BEFORE.words);
    expect(createHash("sha256").update(words.join(" ")).digest("hex")).toBe(BEFORE.sha256);
  });

  it("keeps a paragraph that was all one open sentence as an empty slot, and no section is left without words", () => {
    const slots = WORK.sections.flatMap((s) => s.paragraphs.filter((p) => p === ""));
    // Four older ones stand at the head of section 453 (Book 5's table of chapters, F-49).
    // And section 452, which was not his at all (below).
    expect(slots.length).toBe(93);
    expect(WORK.sections.filter((s) => said(s.paragraphs) === "").map((s) => s.n)).toEqual([452]);
    for (const s of WORK.sections) for (const p of s.paragraphs) expect(p, `section ${s.n}`).toBe(p.trim());
  });

  it("has back the thirty-two openings the ingest dropped, as the transcription has them", () => {
    expect(LEADS.length).toBe(32);
    expect(SECTION.get(250)?.paragraphs[0].startsWith("30 I can of Mine Own Self do nothing:")).toBe(true);
    expect(SECTION.get(14)?.paragraphs[0].startsWith("Another. If the Son is fulness (for of His fulness have all we received)")).toBe(true);
    for (const l of LEADS) expect(SECTION.get(l.section)?.paragraphs[0].startsWith(`${l.lead} ${l.before}`), `section ${l.section}`).toBe(true);
  });

  it("has nothing left to mend", () => {
    const again = mend(ROOT);
    expect([again.carried.length, again.restored.length, again.rewritten]).toEqual([0, 0, 0]);
  });
});

describe("St Cyril on John, section 452", () => {
  it("shows none of the translator's footnote as St Cyril's: the section is a slot, off the rail and out of the reader", async () => {
    // Book 4 ends on the translator's footnote a: "S. Cyril seems to be
    // alluding to the words that God rested the seventh day, as being a
    // memorial of a promise that we too shall rest, as he says above that our
    // rest on that day signifies this." The ingest cut at its italics and
    // made the rest a section of the commentary, "Book 4, on John 7:24", and
    // a note under his name on John 7:24. Emptied on the arbiter's word of
    // 2026-11-11, as section 453's table of chapters was.
    expect(SECTION.get(452)?.paragraphs).toEqual([""]);
    for (const s of WORK.sections) for (const p of s.paragraphs) expect(p.includes("God rested the seventh day, as being a memorial of a promise"), `section ${s.n}`).toBe(false);
    const rail = read<Record<string, Note[]>>("data/bible/commentary/john/7.json");
    const all = Object.values(rail).flat();
    expect(all.some((n) => n.at?.section === 452)).toBe(false);
    expect(all.some((n) => n.text.includes("memorial of a promise that we too shall rest"))).toBe(false);
    // The reader is given the work without it: no empty page to turn to, no line of the contents, nothing renumbered.
    const { loadWriting, withWords } = await import("../load");
    const shown = await loadWriting("cyril-of-alexandria", "commentary-on-john");
    expect(shown?.sections.length).toBe(1069);
    expect(shown?.sections.some((s) => s.n === 452)).toBe(false);
    expect(shown?.sections.find((s) => s.n === 453)?.title).toBe("Book 5, on John 7:25");
    const whole = { sections: [{ n: 1, title: "a", paragraphs: ["One."] }, { n: 2, title: "b", paragraphs: ["", "Two."] }] };
    expect(withWords(whole)).toBe(whole);
  });
});

describe("St Cyril on John, on the rail", () => {
  const notes = railNotes();

  it("says each note in its section's own words, as the work now has them", () => {
    // 1,071 before section 452's, which was the translator's, came off the rail.
    expect(notes.length).toBe(1070);
    for (const { where, note } of notes) {
      expect(note.at?.work, where).toBe("cyril-of-alexandria/commentary-on-john");
      const section = SECTION.get(note.at?.section ?? -1);
      expect(section, where).toBeTruthy();
      if (!section) continue;
      const whole = said(section.paragraphs);
      expect(whole.includes(note.text), `${where}, section ${section.n}`).toBe(true);
      expect(note.text.length, where).toBeGreaterThan(0);
    }
  });

  it("opens no note inside a sentence, but where the print itself opens small", () => {
    const small = notes.filter(({ note }) => opensSmall(note.text));
    for (const { where, note } of small) expect(PRINT_OPENS_SMALL[note.at?.section ?? -1], `${where} opens "${note.text.slice(0, 40)}"`).toBeTruthy();
    expect(small.length).toBe(Object.keys(PRINT_OPENS_SMALL).length);
    const first = notes.find(({ note }) => note.at?.section === 2)?.note.text ?? "";
    expect(first.startsWith("But since it was necessary in some sort to mete out heaven with the span,")).toBe(true);
  });
});

describe("the mend itself", () => {
  it("knows an open ending from the print's own", () => {
    expect(endsOpen("But since it was necessary in some sort to")).toBe(true);
    expect(endsOpen("Wherefore He also said,")).toBe(true);
    expect(endsOpen("For YE (He says)")).toBe(true);
    expect(endsOpen("For the Holy Spirit was not yet [given];")).toBe(true);
    expect(endsOpen("He Himself doeth the works.\"")).toBe(false);
    expect(endsOpen("makes mention of His own glory in the words:")).toBe(false);
    expect(endsOpen("clear: by saying:----")).toBe(false);
    expect(endsOpen("CHAPTER V. That the Son will not be excluded from being true God, even though He named God the Father")).toBe(false);
    expect(endsOpen("")).toBe(false);
  });

  it("takes only the open sentence, and the whole paragraph when it is all one", () => {
    expect(splitOpen("He is God. Wherefore He also said,")).toEqual({ kept: "He is God.", open: "Wherefore He also said," });
    expect(splitOpen("But since it was necessary in some sort to")).toEqual({ kept: "", open: "But since it was necessary in some sort to" });
  });

  it("carries a sentence on through a section that is all one open sentence, adding and removing no paragraph", () => {
    const sections = [
      { n: 1, title: "a", paragraphs: ["One. And so the Lord"] },
      { n: 2, title: "b", paragraphs: ["said unto them, that"] },
      { n: 3, title: "c", paragraphs: ["they should watch. Two.", "Three."] },
    ];
    const { carried } = mendSections(sections, []);
    expect(sections.map((s) => s.paragraphs)).toEqual([["One."], [""], ["And so the Lord said unto them, that they should watch. Two.", "Three."]]);
    expect(carried.map((c) => [c.from, c.to, c.whole])).toEqual([[1, 2, false], [2, 3, true]]);
    expect(mendSections(sections, []).carried).toEqual([]);
  });
});
