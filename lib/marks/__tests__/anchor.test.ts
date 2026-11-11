import { describe, expect, it } from "vitest";

import { cleanMarks, coversAll, locate, locateAcross, makeMark, pieces, placeMarks, sentenceAround, snapToWords, wholeSpan, withMark, withoutMark, wordSpans, type Mark } from "../anchor";

const TEXT =
  "The kingdom of God, beloved brethren, is beginning to be at hand; the reward of life, and the rejoicing of eternal salvation, and the perpetual gladness and possession lately lost of paradise, are now coming, with the passing away of the world.";

function mark(text: string, words: string, more: Partial<Mark> = {}): Mark {
  const s = text.indexOf(words);
  const m = makeMark(text, s, s + words.length, { color: "yellow", at: "2026-11-11T00:00:00.000Z", ...more });
  if (!m) throw new Error("no mark");
  return m;
}

describe("words and sentences", () => {
  it("finds every word, with its apostrophe or hyphen inside", () => {
    const t = "God's well-beloved Son, the Word.";
    expect(wordSpans(t).map((w) => t.slice(w.s, w.e))).toEqual(["God's", "well-beloved", "Son", "the", "Word"]);
  });

  it("widens a touch inside a word to the word, and a run to whole words", () => {
    const at = TEXT.indexOf("ingdom");
    expect(snapToWords(TEXT, at, at)).toEqual({ s: TEXT.indexOf("kingdom"), e: TEXT.indexOf("kingdom") + 7 });
    const run = snapToWords(TEXT, TEXT.indexOf("ward of"), TEXT.indexOf("ife,"));
    expect(TEXT.slice(run!.s, run!.e)).toBe("reward of life");
  });

  it("answers nothing where there is no word", () => {
    expect(snapToWords("  ,  ", 2, 2)).toBeNull();
  });

  it("takes the whole sentence, and does not stop at St. or a verse's Matt.", () => {
    const t = "He went to St. Basil at Caesarea. There he read Matt. 5 with him! Then he left.";
    const at = t.indexOf("Basil");
    const one = sentenceAround(t, at, at + 5);
    expect(t.slice(one.s, one.e)).toBe("He went to St. Basil at Caesarea.");
    const two = sentenceAround(t, t.indexOf("read"), t.indexOf("read") + 4);
    expect(t.slice(two.s, two.e)).toBe("There he read Matt. 5 with him!");
    const both = sentenceAround(t, at, t.indexOf("read") + 4);
    expect(t.slice(both.s, both.e)).toBe("He went to St. Basil at Caesarea. There he read Matt. 5 with him!");
  });

  it("keeps a sentence's closing quotation mark with it", () => {
    const t = "He said, “Come and see.” And they came.";
    const one = sentenceAround(t, t.indexOf("Come"), t.indexOf("Come") + 4);
    expect(t.slice(one.s, one.e)).toBe("He said, “Come and see.”");
  });

  it("knows a span that is the whole paragraph", () => {
    const t = "  All of it.  ";
    expect(wholeSpan(t)).toEqual({ s: 2, e: 12 });
    expect(coversAll(t, { s: 2, e: 12 })).toBe(true);
    expect(coversAll(t, { s: 2, e: 8 })).toBe(false);
  });
});

describe("making a mark", () => {
  it("remembers its words and what stands either side, without the space at its ends", () => {
    const s = TEXT.indexOf(" the reward of life, ");
    const m = makeMark(TEXT, s, s + " the reward of life, ".length, { color: "blue" })!;
    expect(m.q).toBe("the reward of life,");
    expect(TEXT.slice(m.s, m.e)).toBe(m.q);
    expect(m.pre!.endsWith("at hand; ")).toBe(true);
    expect(m.suf!.startsWith(" and the rejoicing")).toBe(true);
    expect(m.color).toBe("blue");
  });

  it("makes nothing of an empty run", () => {
    expect(makeMark(TEXT, 5, 5)).toBeNull();
    expect(makeMark("a   b", 1, 4)).toBeNull();
  });
});

describe("finding a mark again", () => {
  it("is where it was while the text is the same", () => {
    const m = mark(TEXT, "the reward of life");
    expect(locate(TEXT, m)).toEqual({ s: m.s, e: m.e });
  });

  it("follows its words when a typo before it is mended", () => {
    const m = mark(TEXT, "the reward of life");
    const edited = TEXT.replace("beloved brethren", "dearly beloved brethren");
    const at = locate(edited, m)!;
    expect(edited.slice(at.s, at.e)).toBe("the reward of life");
  });

  it("follows its words when the typo mended is inside them", () => {
    const typo = TEXT.replace("rejoicing", "rejoycing");
    const m = mark(typo, "the rejoycing of eternal salvation");
    const at = locate(TEXT, m)!;
    expect(TEXT.slice(at.s, at.e)).toBe("the rejoicing of eternal salvation");
  });

  it("follows its words when quotation marks are set right", () => {
    const before = 'He saith, "Come unto me, all ye that labour," and again he saith it.';
    const after = "He saith, “Come unto me, all ye that labour,” and again he saith it.";
    const m = mark(before, '"Come unto me, all ye that labour,"');
    const at = locate(after, m)!;
    expect(after.slice(at.s, at.e)).toBe("“Come unto me, all ye that labour,”");
  });

  it("chooses the right one of two alike by what stands either side", () => {
    const t = "Lord, have mercy. And again they said: Lord, have mercy. And a third time.";
    const second = t.lastIndexOf("Lord, have mercy");
    const m = makeMark(t, second, second + 16, { color: "yellow" })!;
    const edited = `Then, ${t}`;
    const at = locate(edited, m)!;
    expect(at.s).toBe(edited.lastIndexOf("Lord, have mercy"));
  });

  it("finds a mark at the very start or the very end whose words changed", () => {
    const typo = "Teh kingdom of God is at hand, and the world passes awya.";
    const fixed = "The kingdom of God is at hand, and the world passes away.";
    const first = makeMark(typo, 0, 11, { color: "yellow" })!;
    expect(fixed.slice(locate(fixed, first)!.s, locate(fixed, first)!.e)).toBe("The kingdom");
    const last = mark(typo, "passes awya.");
    expect(fixed.slice(locate(fixed, last)!.s, locate(fixed, last)!.e)).toBe("passes away.");
  });

  it("does not guess when the words and their surroundings are gone", () => {
    const m = mark(TEXT, "the reward of life");
    expect(locate("Another paragraph altogether, about something else entirely.", m)).toBeNull();
  });

  it("does not take a whole paragraph for a few changed words", () => {
    const m = mark(TEXT, "reward");
    const edited = TEXT.replace("the reward of life, and the rejoicing of eternal salvation, and the perpetual gladness", "a great many other words that were never there before in any edition of this work at all, none");
    expect(locate(edited, m)).toBeNull();
  });

  it("looks in the neighbouring paragraphs when a paragraph was split or one was added", () => {
    const m = mark(TEXT, "the rejoicing of eternal salvation");
    const cut = TEXT.indexOf("the reward");
    const split = ["An opening paragraph.", TEXT.slice(0, cut).trim(), TEXT.slice(cut), "A closing paragraph."];
    const found = locateAcross(split, 1, m)!;
    expect(found.paragraphIdx).toBe(2);
    expect(split[2].slice(found.at.s, found.at.e)).toBe("the rejoicing of eternal salvation");
    expect(locateAcross(["Nothing here.", "Nor here."], 0, m)).toBeNull();
  });

  it("does not carry one short word to another paragraph", () => {
    const m = mark(TEXT, "world");
    expect(locateAcross(["Gone.", "The world is here too."], 0, m)).toBeNull();
  });
});

describe("drawing", () => {
  it("cuts the paragraph at each mark and loses no character", () => {
    const a = mark(TEXT, "the reward of life");
    const b = mark(TEXT, "eternal salvation", { color: "blue" });
    const cut = pieces(TEXT, placeMarks(TEXT, [b, a]));
    expect(cut.map((p) => p.text).join("")).toBe(TEXT);
    expect(cut.filter((p) => p.marks.length).map((p) => p.text)).toEqual(["the reward of life", "eternal salvation"]);
  });

  it("shows the newer of two that overlap", () => {
    const older = mark(TEXT, "the reward of life, and the rejoicing", { at: "2026-11-10T00:00:00.000Z", color: "yellow" });
    const newer = mark(TEXT, "the rejoicing of eternal", { at: "2026-11-11T00:00:00.000Z", color: "blue" });
    const cut = pieces(TEXT, placeMarks(TEXT, [older, newer]));
    const shared = cut.find((p) => p.text === "the rejoicing")!;
    expect(shared.marks.map((m) => m.color)).toEqual(["blue", "yellow"]);
    expect(cut.map((p) => p.text).join("")).toBe(TEXT);
  });

  it("leaves out a mark it cannot place, and draws the rest", () => {
    const lost = { ...mark(TEXT, "the reward of life"), q: "words never written here", pre: "nothing like this before ", suf: " nothing like this after" };
    const kept = mark(TEXT, "paradise");
    expect(placeMarks(TEXT, [lost, kept]).map((p) => p.mark.q)).toEqual(["paradise"]);
  });
});

describe("a paragraph's marks", () => {
  it("adds, replaces by id and takes away", () => {
    const a = mark(TEXT, "paradise");
    const b = mark(TEXT, "kingdom");
    expect(withMark([a], b)).toHaveLength(2);
    expect(withMark([a, b], { ...a, color: "green" }).find((m) => m.id === a.id)!.color).toBe("green");
    expect(withoutMark([a, b], a.id)).toEqual([b]);
    expect(withoutMark([a], a.id)).toBeUndefined();
  });

  it("reads only well formed marks from storage", () => {
    const good = mark(TEXT, "paradise");
    const out = cleanMarks([good, null, { id: 3 }, { id: "x", s: 0, e: 2, q: "ab" }, { id: "y", s: 0, e: 2, q: "ab", color: "NOT A COLOUR", note: "mine" }]);
    expect(out!.map((m) => m.id)).toEqual([good.id, "y"]);
    expect(out![1].color).toBeUndefined();
    expect(cleanMarks("nonsense")).toBeUndefined();
  });
});
