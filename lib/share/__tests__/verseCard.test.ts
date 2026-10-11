import { describe, expect, it } from "vitest";

import { CARD, SIZES, VERSE_BOX, cardFileName, fitVerse, lineHeightFor, wrap, type Measure } from "@/lib/share/verseCard";

/**
 * A verse as a picture: where the words go. The drawing needs a canvas; the
 * arithmetic does not, and the arithmetic is where a verse gets cut off or
 * runs off the edge. Every letter is taken to be half its size wide, which
 * is close to a serif's average and exact enough to test the rules.
 */
const measure: Measure = (text, size) => text.length * size * 0.5;

const JOHN_3_16 =
  "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
const SHORT = "Jesus wept.";
/** Esther 8:9 is the longest verse in the English Bible, about 520 letters. */
const LONGEST =
  "Then were the king's scribes called at that time in the third month, that is, the month Sivan, on the three and twentieth day thereof; and it was written according to all that Mordecai commanded unto the Jews, and to the lieutenants, and the deputies and rulers of the provinces which are from India unto Ethiopia, an hundred twenty and seven provinces, unto every province according to the writing thereof, and unto every people after their language, and to the Jews according to their writing, and according to their language.";

describe("breaking a verse into lines", () => {
  it("never makes a line wider than the box, and never loses a word", () => {
    for (const size of SIZES) {
      const lines = wrap(JOHN_3_16, size, VERSE_BOX.width, measure);
      expect(lines.join(" ")).toBe(JOHN_3_16);
      for (const line of lines) expect(measure(line, size), `${size}px: ${line}`).toBeLessThanOrEqual(VERSE_BOX.width);
    }
  });

  it("gives a word too wide for the line a line of its own, rather than dropping it", () => {
    const lines = wrap("a Mahershalalhashbaz b", 60, 200, measure);
    expect(lines).toEqual(["a", "Mahershalalhashbaz", "b"]);
  });

  it("treats any run of spaces and line breaks as one space", () => {
    expect(wrap("  In the   beginning\nwas the Word  ", 40, 2000, measure)).toEqual(["In the beginning was the Word"]);
  });

  it("does not leave one short word alone on the last line", () => {
    // Twelve letters fit a line. Filled greedily this is "aaaa bbbb cc" then
    // "dd"; evened out, the last two words share the last line.
    const lines = wrap("aaaa bbbb cc dd", 10, 60, measure);
    expect(lines).toEqual(["aaaa bbbb", "cc dd"]);
  });

  it("gives nothing for nothing", () => {
    expect(wrap("   ", 40, 800, measure)).toEqual([]);
  });
});

describe("how large a verse is set", () => {
  it("sets a short verse at the largest size", () => {
    const fit = fitVerse(SHORT, measure);
    expect(fit).toMatchObject({ size: SIZES[0], lines: [SHORT] });
  });

  it("brings a longer verse down until the whole of it fits", () => {
    const fit = fitVerse(JOHN_3_16, measure);
    expect(fit).not.toBeNull();
    expect(fit!.size).toBeLessThan(SIZES[0]);
    expect(fit!.lines.join(" ")).toBe(JOHN_3_16);
    expect(fit!.height).toBeLessThanOrEqual(VERSE_BOX.height);
    // And it is the LARGEST size that fits: the next one up would not.
    const larger = SIZES[SIZES.indexOf(fit!.size as (typeof SIZES)[number]) - 1];
    const lines = wrap(JOHN_3_16, larger, VERSE_BOX.width, measure);
    expect(lines.length * lineHeightFor(larger)).toBeGreaterThan(VERSE_BOX.height);
  });

  it("fits the longest verse in the Bible whole", () => {
    const fit = fitVerse(LONGEST, measure);
    expect(fit).not.toBeNull();
    expect(fit!.lines.join(" ")).toBe(LONGEST);
    expect(fit!.height).toBeLessThanOrEqual(VERSE_BOX.height);
  });

  it("says a passage is too long for one picture, and never cuts it", () => {
    expect(fitVerse(`${LONGEST} ${LONGEST} ${LONGEST}`, measure)).toBeNull();
  });

  it("makes nothing of an empty verse", () => {
    expect(fitVerse("", measure)).toBeNull();
    expect(fitVerse("   ", measure)).toBeNull();
  });

  it("keeps the verse's box inside the picture, clear of the mark and the foot", () => {
    expect(VERSE_BOX.width).toBe(CARD.width - 2 * CARD.margin);
    // Mark 60 and its gap 76 above; the rule, the reference and the name below.
    expect(CARD.top + 60 + 76 + VERSE_BOX.height + 129).toBeLessThan(CARD.height - CARD.bottom - 60);
  });

  it("loosens the lines as the letters get smaller", () => {
    expect(lineHeightFor(92) / 92).toBeLessThan(lineHeightFor(34) / 34);
  });
});

describe("the picture's file name", () => {
  it("is the reference, in plain letters", () => {
    expect(cardFileName("John 3:16")).toBe("purify-john-3-16.png");
    expect(cardFileName("1 Corinthians 13:4–8")).toBe("purify-1-corinthians-13-4-8.png");
    expect(cardFileName("Κατά Ιωάννην 3:16")).toBe("purify-κατα-ιωαννην-3-16.png");
    expect(cardFileName("")).toBe("purify-verse.png");
  });
});
