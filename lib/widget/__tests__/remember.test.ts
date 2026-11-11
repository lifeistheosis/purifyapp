import { describe, expect, it } from "vitest";

import { stepWords } from "@/lib/remember/blanks";
import type { LearnItem } from "@/lib/remember/items";
import { verseKey, type RememberStore, type SavedVerse } from "@/lib/remember/schedule";

import { REMEMBER_DAYS, rememberEntry, rememberFaces, widgetVerse, type RememberFace } from "../remember";

// Remember the verse on the home screen widget (1.9, s4-07): what the app
// hands the widget, worked out from the reader's saved verses and the
// schedule kept on the device (lib/widget/remember.ts says why).

const JOHN = "For God so loved the world, that he gave his only begotten Son";
const PSALM = "The Lord is my shepherd; I shall not want.";

const verse = (book: string, chapter: number, n: number, addedAt: number, label: string): SavedVerse => ({
  key: verseKey(book, chapter, n),
  book,
  chapter,
  verse: n,
  label,
  addedAt,
});

const john = verse("john", 3, 16, 1, "John 3:16");
const psalm = verse("psalms", 23, 1, 2, "Psalms 23:1");

/** The card's words in English, and a book named in another language when asked. */
const WORDS: Record<string, string> = {
  "remember.line": "A verse you saved. Say it from memory, then check.",
  "remember.lineBlanks": "Say the missing words, then check.",
  "remember.lineFirst": "Say each word from its first letter, then check.",
  "remember.backTomorrow": "It comes back tomorrow.",
  "remember.backIn": "It comes back in {count} days.",
  "remember.known": "Known by heart. It comes back once a month.",
  "remember.addedByYou": "Added by you",
  "remember.lineMemory": "Say it from memory, then check.",
};
const t = (key: string, vars?: Record<string, string | number>) => {
  const word = WORDS[key];
  if (!word) return key;
  return word.replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name] ?? ""));
};
const serbian = (key: string, vars?: Record<string, string | number>) => (key === "bible.books.john" ? "Јован" : t(key, vars));

const TODAY = "2026-11-09";
const store = (over: Partial<RememberStore> = {}): RememberStore => ({
  entries: {},
  texts: { [john.key]: JOHN, [psalm.key]: PSALM },
  items: {},
  ...over,
});
const days = (entry: ReturnType<typeof rememberFaces>): Record<string, RememberFace> => {
  if (!entry || "none" in entry) throw new Error("expected days");
  return entry.days;
};

describe("the widget's verse at each step", () => {
  it("leaves the card's blanks blank, each as long as its word, and keeps the rest", () => {
    const shown = widgetVerse(JOHN, 1)!;
    const words = stepWords(JOHN, 1);
    const blanked = words.filter((w) => w.blank).map((w) => w.word);
    expect(blanked.length).toBeGreaterThan(0);
    for (const word of blanked) expect(shown.split(/[\s,;.]+/)).not.toContain(word);
    for (const w of words.filter((w) => !w.blank)) expect(shown).toContain(w.word);
    // Every word keeps its place, and its punctuation.
    expect(shown.split(" ")).toHaveLength(words.length);
    expect(shown.match(/[,;.]/g)).toEqual(JOHN.match(/[,;.]/g));
  });

  it("gives each word its first letter in the second step", () => {
    expect(widgetVerse(PSALM, 2)).toBe("T__ L___ i_ m_ s_______; I s____ n__ w___.");
    // A letter with its accents is one letter.
    expect(widgetVerse("ἐν ἀρχῇ", 2)).toBe("ἐ_ ἀ___");
  });

  it("shows no words at the third step, which is said from memory", () => {
    expect(widgetVerse(JOHN, 3)).toBeNull();
  });
});

describe("the faces the widget is handed", () => {
  it("asks the reader to save a verse when none is saved", () => {
    expect(rememberFaces({ saved: [], store: store(), today: TODAY, t })).toEqual({ none: true });
  });

  it("has a face for each of the next seven days, keyed by the civil day", () => {
    const faces = days(rememberFaces({ saved: [psalm, john], store: store(), today: TODAY, t }));
    expect(Object.keys(faces)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(Object.keys(faces)).toHaveLength(REMEMBER_DAYS);
  });

  it("brings the longest-saved verse first, at its step, as the card on Today does", () => {
    const faces = days(rememberFaces({ saved: [psalm, john], store: store(), today: TODAY, t }));
    expect(faces[TODAY]).toEqual({
      ref: "John 3:16",
      step: 1,
      words: widgetVerse(JOHN, 1),
      line: "Say the missing words, then check.",
    });
    // Known twice, a verse is asked by its first letters; four times, from memory.
    const second = days(rememberFaces({ saved: [john], store: store({ entries: { [john.key]: { box: 2, due: TODAY } } }), today: TODAY, t }));
    expect(second[TODAY]).toMatchObject({ step: 2, words: widgetVerse(JOHN, 2), line: "Say each word from its first letter, then check." });
    const third = days(rememberFaces({ saved: [john], store: store({ entries: { [john.key]: { box: 4, due: TODAY } } }), today: TODAY, t }));
    expect(third[TODAY]).toMatchObject({ step: 3, words: null, line: "A verse you saved. Say it from memory, then check." });
  });

  it("never shows a blanked word of a verse not yet answered", () => {
    const faces = days(rememberFaces({ saved: [psalm, john], store: store(), today: TODAY, t }));
    const hidden = stepWords(JOHN, 1).filter((w) => w.blank).map((w) => w.word);
    for (const face of Object.values(faces)) {
      if (face.done) continue;
      for (const word of hidden) expect(face.words ?? "").not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });

  it("names the book in the reader's language", () => {
    const faces = days(rememberFaces({ saved: [john], store: store(), today: TODAY, t: serbian }));
    expect(faces[TODAY].ref).toBe("Јован 3:16");
  });

  it("shows the whole verse once it is answered today, and when it comes back", () => {
    const answered = store({ answeredOn: TODAY, answeredKey: john.key, entries: { [john.key]: { box: 2, due: "2026-11-11" } } });
    const faces = days(rememberFaces({ saved: [psalm, john], store: answered, today: TODAY, t }));
    expect(faces[TODAY]).toEqual({ ref: "John 3:16", words: JOHN, line: "It comes back in 2 days.", done: true });
    // Tomorrow the next verse waits; the answered one returns on its day.
    expect(faces["2026-11-10"]).toMatchObject({ ref: "Psalms 23:1", step: 1 });
    expect(faces["2026-11-11"]).toMatchObject({ ref: "John 3:16", step: 2 });
    // Known by heart, it comes back once a month.
    const known = store({ answeredOn: TODAY, answeredKey: john.key, entries: { [john.key]: { box: 6, due: "2026-12-09" } } });
    expect(days(rememberFaces({ saved: [john], store: known, today: TODAY, t }))[TODAY].line).toBe("Known by heart. It comes back once a month.");
  });

  it("keeps the same verse on the days ahead while it is not answered", () => {
    const faces = days(rememberFaces({ saved: [psalm, john], store: store(), today: TODAY, t }));
    for (const face of Object.values(faces)) expect(face.ref).toBe("John 3:16");
  });

  it("shows the verse that comes back first, by its reference alone, on a day with nothing due (build 89, note 18)", () => {
    // The widget said "Open Purify to refresh" on such a day, and opening the
    // app handed over the same empty day: stuck until a verse came due.
    const waiting = store({ entries: { [john.key]: { box: 3, due: "2026-11-12" }, [psalm.key]: { box: 5, due: "2026-11-20" } } });
    const faces = days(rememberFaces({ saved: [john, psalm], store: waiting, today: TODAY, t }));
    expect(Object.keys(faces)).toHaveLength(REMEMBER_DAYS);
    expect(faces[TODAY]).toEqual({ ref: "John 3:16", words: null, line: "It comes back in 3 days." });
    expect(faces["2026-11-10"]).toEqual({ ref: "John 3:16", words: null, line: "It comes back in 2 days." });
    expect(faces["2026-11-11"]).toEqual({ ref: "John 3:16", words: null, line: "It comes back tomorrow." });
    // The day it is due, it is asked again, at its step.
    expect(faces["2026-11-12"]).toMatchObject({ ref: "John 3:16", step: 2 });
  });

  it("leaves no day of the seven without a face while a verse is saved", () => {
    const known = store({ entries: { [john.key]: { box: 6, due: "2026-12-09" } } });
    const faces = days(rememberFaces({ saved: [john], store: known, today: TODAY, t }));
    expect(Object.keys(faces)).toHaveLength(REMEMBER_DAYS);
    for (const face of Object.values(faces)) expect(face).toEqual({ ref: "John 3:16", words: null, line: "Known by heart. It comes back once a month." });
  });

  it("shows the reference alone for a verse whose words were never fetched", () => {
    const faces = days(rememberFaces({ saved: [john], store: store({ texts: {} }), today: TODAY, t }));
    expect(faces[TODAY]).toMatchObject({ ref: "John 3:16", words: null, line: "A verse you saved. Say it from memory, then check." });
  });

  it("shows the verse that comes back first today when an answer from before 1.9 does not say which verse", () => {
    const old = store({ answeredOn: TODAY, entries: { [john.key]: { box: 1, due: "2026-11-10" }, [psalm.key]: { box: 0, due: TODAY } } });
    const faces = days(rememberFaces({ saved: [john, psalm], store: old, today: TODAY, t }));
    // The psalm was due today, but one verse a day is asked and today's is answered: it comes back tomorrow.
    expect(faces[TODAY]).toEqual({ ref: "Psalms 23:1", words: null, line: "It comes back tomorrow." });
    expect(faces["2026-11-10"]).toMatchObject({ ref: "John 3:16" });
  });

  // Build 93 note 11: a quote and the reader's own words, on the widget as on the card.
  const PLACE = { href: "/saints/anthony-the-great/life-of-antony#p-2-93", author: "St. Athanasius the Great", work: "Life of Antony", place: "§93" };
  const quote: LearnItem = { kind: "quote", key: "q:abcdefgh012345", text: "Let Christ be as the breath you breathe.", by: "St. Antony the Great", cite: PLACE, addedAt: 5 };
  const own: LearnItem = { kind: "own", key: "own:abcdefgh0123", text: "Lord Jesus Christ, have mercy on me.", addedAt: 6 };

  it("names whose words a quote is where a verse names its place, and words the reader put in as added by them", () => {
    const chosenQuote = store({ items: { [quote.key]: quote, [own.key]: own }, chosen: { key: quote.key, at: 9 } });
    const faces = days(rememberFaces({ saved: [john], store: chosenQuote, today: TODAY, t }));
    // The one chosen is asked first, with its own words, never fetched.
    expect(faces[TODAY]).toMatchObject({ ref: "St. Antony the Great", step: 1, line: "Say the missing words, then check." });
    expect(faces[TODAY].words).toBe(widgetVerse(quote.text, 1));
    const chosenOwn = store({ items: { [own.key]: own }, chosen: { key: own.key, at: 9 } });
    expect(days(rememberFaces({ saved: [], store: chosenOwn, today: TODAY, t }))[TODAY]).toMatchObject({ ref: "Added by you", step: 1 });
  });

  it("never calls a quote or the reader's own words a verse they saved", () => {
    // Said from memory, the third step: the line that names no verse.
    const known = store({ items: { [own.key]: own }, entries: { [own.key]: { box: 4, due: TODAY } } });
    expect(days(rememberFaces({ saved: [], store: known, today: TODAY, t }))[TODAY]).toEqual({ ref: "Added by you", step: 3, words: null, line: "Say it from memory, then check." });
  });

  it("has faces for a reader who saved no verse but learns their own words", () => {
    const only = store({ items: { [own.key]: own } });
    expect(rememberFaces({ saved: [], store: only, today: TODAY, t })).not.toEqual({ none: true });
    expect(rememberFaces({ saved: [], store: store({ items: { [own.key]: { gone: 9 } } }), today: TODAY, t })).toEqual({ none: true });
  });

  it("is nothing to hand over without a day to start from", () => {
    expect(rememberFaces({ saved: [john], store: store(), today: "Nov 9", t })).toBeUndefined();
    expect(rememberEntry(undefined)).toBeUndefined();
    expect(JSON.parse(rememberEntry({ none: true })!)).toEqual({ none: true });
  });
});
