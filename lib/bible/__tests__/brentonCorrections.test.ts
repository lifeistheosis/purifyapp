// The printed readings of Brenton that the ingest source gets wrong, pinned.
//
// scripts/ingest-bible.mjs takes Brenton's Septuagint from bolls.life, whose
// text has slips the printed book does not have, and it overwrites the chapter
// files. Eleven verses were put right against the page in October 2026: Job
// 1:1 had reached readers as "and than man was true", and Psalm 118:99 as
// "thy testimonies are my medication". Two things can undo them,
// and both are quiet: a re-run of the ingest without the corrections, and an
// edit to the list of them (scripts/lib/brenton-corrections.mjs).
//
// So the readings are typed out here, apart from the list, and the list is
// held to them. The ingest itself is not run: it needs the network and it
// rewrites the corpus. What is tested is the step it calls.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  BRENTON_CORRECTIONS,
  PRINTED_BOOK,
  applyBrentonCorrections,
  correctionsLeftOver,
  pageUrl,
} from "@/scripts/lib/brenton-corrections.mjs";

type Chapter = { book: string; chapter: number; source: string; verses: { n: number; text: string }[] };

const DATA = path.join(process.cwd(), "data", "bible");

function chapter(book: string, n: number): Chapter {
  return JSON.parse(fs.readFileSync(path.join(DATA, book, `${n}.json`), "utf8")) as Chapter;
}

function verse(book: string, ch: number, n: number): string {
  const found = chapter(book, ch).verses.find((v) => v.n === n);
  if (!found) throw new Error(`${book} ${ch}:${n} is not in data/bible`);
  return found.text;
}

/**
 * Each verse whole, as Bagster's printing of 1900 has it. Read on the page
 * scan (archive.org, septuagintversio1900bren; the leaf is beside each) on
 * 2026-10-06, not copied from the list and not from the electronic text.
 * Italics and small capitals are the page's; the words are these.
 */
const PRINTED = [
  // leaf 65
  ["genesis", 40, 8, "And they said to him, We have seen a dream, and there is no interpreter of it. And Joseph said to them, Is not the interpretation of them through God? tell them then to me."],
  // leaf 401
  ["1-samuel", 24, 7, "And David said to his men, The Lord forbid it me, that I should do this thing to my lord the anointed of the Lord, to lift my hand against him; for he is the anointed of the Lord."],
  // leaf 402
  ["1-samuel", 24, 17, "And it came to pass when David had finished speaking these words to Saul, that Saul said, Is this thy voice, son David? and Saul lifted up his voice, and wept."],
  // leaf 402
  ["1-samuel", 24, 18, "And Saul said to David, Thou art more righteous than I, for thou hast recompensed me good, but I have recompensed thee evil."],
  // leaf 402
  ["1-samuel", 24, 20, "And if any one should find his enemy in distress, and should send him forth in a good way, then the Lord will reward him good, as thou hast done this day."],
  // leaf 406
  ["1-samuel", 26, 17, "And Saul recognised the voice of David, and said, Is this thy voice, son David? and David said, I am thy servant, my lord, O king."],
  // leaf 677
  ["job", 1, 1, "There was a certain man in the land of Ausis, whose name was Job; and that man was true, blameless, righteous, and godly, abstaining from everything evil."],
  // leaf 678
  ["job", 1, 16, "While he was yet speaking, there came another messenger, and said to Job, Fire has fallen from heaven, and burnt up the sheep, and devoured the shepherds likewise; and I having escaped alone am come to tell thee."],
  // leaf 785
  ["psalms", 118, 99, "I have more understanding than all my teachers; for thy testimonies are my meditation."],
  // leaf 785
  ["psalms", 118, 100, "I understand more than the aged; because I have sought out thy commandments."],
  // leaves 1293 and 1294
  ["1-maccabees", 1, 63, "Wherefore they chose rather to die, that they might not be defiled with meats, and that they might not profane the holy covenant: so then they died."],
] as const;

const key = (book: string, ch: number, n: number) => `${book} ${ch}:${n}`;

/** A pinned verse by its place. */
function printed(book: string, ch: number, n: number): string {
  const pin = PRINTED.find((p) => p[0] === book && p[1] === ch && p[2] === n);
  if (!pin) throw new Error(`${key(book, ch, n)} is not pinned`);
  return pin[3];
}

describe("the printed readings in data/bible", () => {
  it.each(PRINTED)("%s %i:%i reads as the printed book has it", (book, ch, n, text) => {
    expect(verse(book, ch, n)).toBe(text);
  });

  it("has every correction on the list applied, and none of the wrong words left", () => {
    for (const c of BRENTON_CORRECTIONS) {
      const text = verse(c.book, c.chapter, c.verse);
      expect(text.split(c.printed).length - 1, `${key(c.book, c.chapter, c.verse)}: "${c.printed}"`).toBe(1);
      expect(text, key(c.book, c.chapter, c.verse)).not.toContain(c.wrong);
    }
  });
});

describe("the list of corrections", () => {
  it("has a pin above for every entry, and an entry for every pin", () => {
    // A correction nobody pinned can be lost to a re-ingest unseen; a pin with
    // no correction is a reading the next re-ingest will overwrite.
    const listed = BRENTON_CORRECTIONS.map((c) => key(c.book, c.chapter, c.verse));
    const pinned = PRINTED.map(([book, ch, n]) => key(book, ch, n));
    expect([...listed].sort()).toEqual([...pinned].sort());
    expect(new Set(listed).size, "one entry a verse").toBe(listed.length);
  });

  it("only names Brenton's text, and says where each reading was read", () => {
    for (const c of BRENTON_CORRECTIONS) {
      const where = key(c.book, c.chapter, c.verse);
      expect(chapter(c.book, c.chapter).source, where).toBe("brenton-lxx-pd");
      expect(Number.isInteger(c.leaf) && c.leaf > 0, where).toBe(true);
      expect(pageUrl(c), where).toBe(
        `https://archive.org/download/${PRINTED_BOOK}/page/leaf${c.leaf}_${c.crop}_w1450_h520.jpg`,
      );
    }
  });

  it("can tell a corrected verse from an uncorrected one", () => {
    // If one string held the other, "already corrected" and "still wrong"
    // would look the same to the ingest, and to the test above.
    for (const c of BRENTON_CORRECTIONS) {
      const where = key(c.book, c.chapter, c.verse);
      expect(c.printed.includes(c.wrong), where).toBe(false);
      expect(c.wrong.includes(c.printed), where).toBe(false);
    }
  });
});

describe("applying the corrections to a fetched chapter", () => {
  /** Three verses of Job 1 as the source serves them: the two with a slip, and one without. */
  const served = () => [
    { n: 1, text: "There was a certain man in the land of Ausis, whose name was Job; and than man was true, blameless, righteous, and godly, abstaining from everything evil." },
    { n: 2, text: "And he had seven sons and three daughters." },
    { n: 16, text: "While he was yet speaking, there came another messenger, and said to Job, Fire has fallen from heaven, and burnt up the sheep, and devoured the shepherds like wise; and I having escaped alone am come to tell thee." },
  ];

  it("puts the printed words in, and touches nothing else", () => {
    const verses = served();
    const applied = applyBrentonCorrections("job", 1, verses);
    expect(applied.map((c) => c.verse)).toEqual([1, 16]);
    expect(verses[0].text).toBe(printed("job", 1, 1));
    expect(verses[1].text).toBe("And he had seven sons and three daughters.");
    expect(verses[2].text).toBe(printed("job", 1, 16));
  });

  it("rebuilds every corrected chapter in data/bible from what the source serves", () => {
    // The source's chapter is ours with the slips put back.
    const chapters = new Map(BRENTON_CORRECTIONS.map((c) => [`${c.book} ${c.chapter}`, c]));
    for (const [id, { book, chapter: ch }] of chapters) {
      const ours = chapter(book, ch).verses;
      const fetched = ours.map((v) => ({ ...v }));
      for (const c of BRENTON_CORRECTIONS.filter((x) => x.book === book && x.chapter === ch)) {
        const v = fetched.find((x) => x.n === c.verse)!;
        v.text = v.text.split(c.printed).join(c.wrong);
      }
      expect(fetched, id).not.toEqual(ours);
      applyBrentonCorrections(book, ch, fetched);
      expect(fetched, id).toEqual(ours);
    }
  });

  it("leaves a chapter the list does not name alone", () => {
    const verses = served();
    expect(applyBrentonCorrections("job", 2, verses)).toEqual([]);
    expect(applyBrentonCorrections("matthew", 1, verses)).toEqual([]);
    expect(verses).toEqual(served());
  });

  it("stops when the source no longer has the wrong words", () => {
    // Changed to something else: read the page, do not guess.
    const changed = served();
    changed[0].text = changed[0].text.replace("and than man", "and this man");
    expect(() => applyBrentonCorrections("job", 1, changed)).toThrow(/job 1:1: .*0 times, not once.*leaf677_/);

    // Corrected upstream: still a stop, so a person takes the entry off.
    const corrected = served();
    corrected[0].text = corrected[0].text.replace("and than man", "and that man");
    expect(() => applyBrentonCorrections("job", 1, corrected)).toThrow(/job 1:1: .*already has the printed words/);
  });

  it("stops when the wrong words stand twice, or the verse is gone", () => {
    const twice = served();
    twice[2].text += " and devoured the shepherds like wise";
    expect(() => applyBrentonCorrections("job", 1, twice)).toThrow(/job 1:16: .*2 times, not once/);

    const short = served().filter((v) => v.n !== 16);
    expect(() => applyBrentonCorrections("job", 1, short)).toThrow(/job 1:16: .*no verse 16/);
  });

  it("names the corrections a run never reached", () => {
    const job = applyBrentonCorrections("job", 1, served());
    const left = correctionsLeftOver(job).map((c) => key(c.book, c.chapter, c.verse));
    expect(left).toEqual([
      "genesis 40:8",
      "1-samuel 24:7",
      "1-samuel 24:17",
      "1-samuel 24:18",
      "1-samuel 24:20",
      "1-samuel 26:17",
      "psalms 118:99",
      "psalms 118:100",
      "1-maccabees 1:63",
    ]);
    expect(correctionsLeftOver(BRENTON_CORRECTIONS)).toEqual([]);
  });
});
