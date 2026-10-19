import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { INTERVALS, KNOWN_EVERY, addDays, answer, dueVerse, firstLetters, hintWords, keepText, textOf, verseKey, type SavedVerse } from "@/lib/remember/schedule";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } },
  });
});
afterEach(() => {
  // @ts-expect-error -- the node test environment has no window of its own.
  delete globalThis.window;
});

const verse = (book: string, chapter: number, n: number, addedAt: number): SavedVerse => ({
  key: verseKey(book, chapter, n),
  book,
  chapter,
  verse: n,
  label: `${book} ${chapter}:${n}`,
  addedAt,
});

describe("Remember a verse", () => {
  const john = verse("john", 3, 16, 1);
  const psalm = verse("psalms", 22, 1, 2);

  it("brings back the longest-saved verse first, once a day", () => {
    expect(dueVerse([psalm, john], "2026-10-16")?.key).toBe(john.key);
    answer(john.key, true, "2026-10-16");
    // Answered today: no second card today.
    expect(dueVerse([psalm, john], "2026-10-16")).toBeNull();
    // Known once, it is back tomorrow, still ahead of the newer one.
    expect(dueVerse([psalm, john], "2026-10-17")?.key).toBe(john.key);
    answer(john.key, true, "2026-10-17");
    // Known twice, it waits two days, and the newer one has its turn.
    expect(dueVerse([psalm, john], "2026-10-18")?.key).toBe(psalm.key);
  });

  it("waits longer each time it is known, and starts over when it is not", () => {
    let day = "2026-10-16";
    const waits: number[] = [];
    for (let i = 0; i < INTERVALS.length + 1; i += 1) {
      const e = answer(john.key, true, day);
      waits.push(Math.round((Date.parse(e.due) - Date.parse(day)) / 86_400_000));
      day = e.due;
    }
    expect(waits).toEqual([...INTERVALS, KNOWN_EVERY]);
    const again = answer(john.key, false, day);
    expect(again).toEqual({ box: 1, due: addDays(day, 1) });
  });

  it("keeps a verse's words for the card", () => {
    expect(textOf(john.key)).toBeNull();
    keepText(john.key, "For God so loved the world");
    expect(textOf(john.key)).toBe("For God so loved the world");
  });

  it("cuts each word to its first letter, punctuation kept", () => {
    expect(firstLetters("For God so loved the world, that he gave")).toBe("F__ G__ s_ l____ t__ w____, t___ h_ g___");
    expect(firstLetters("Ἐν ἀρχῇ ἦν ὁ λόγος")).toBe("Ἐ_ ἀ___ ἦ_ ὁ λ____");
  });

  it("sets the verse out as words, each with its first letter and its punctuation", () => {
    const words = hintWords("Create in me a clean heart, O God; and renew (Selah) the Lord's way.");
    expect(words.map((w) => w.first).join(" ")).toBe("C i m a c h O G a r S t L w");
    expect(words[5]).toEqual({ lead: "", word: "heart", first: "h", tail: "," });
    expect(words[7]).toEqual({ lead: "", word: "God", first: "G", tail: ";" });
    expect(words[10]).toEqual({ lead: "(", word: "Selah", first: "S", tail: ")" });
    // An apostrophe inside a word keeps it one word.
    expect(words[12]).toEqual({ lead: "", word: "Lord's", first: "L", tail: "" });
    expect(words[13].tail).toBe(".");
    // Every letter of the verse is still there, in order, so nothing is lost
    // when the words are shown.
    expect(words.map((w) => w.lead + w.word + w.tail).join(" ")).toBe("Create in me a clean heart, O God; and renew (Selah) the Lord's way.");
  });

  it("keeps a letter's accents with it, and a run with no letter whole", () => {
    expect(hintWords("Ἐν ἀρχῇ ἦν").map((w) => w.first)).toEqual(["Ἐ", "ἀ", "ἦ"]);
    // A letter written with a combining mark (e + U+0301) is one first letter.
    expect(hintWords("éte")[0].first).toBe("é");
    expect(hintWords("Amen. – so")[1]).toEqual({ lead: "–", word: "", first: "", tail: "" });
    expect(hintWords("   ")).toEqual([]);
  });

  it("counts days across a month's end", () => {
    expect(addDays("2026-10-30", 2)).toBe("2026-11-01");
  });
});
