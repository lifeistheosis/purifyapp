// Your saved as one list (1.7, the owner's note 21): bookmarks and verse
// highlights in one feed, newest first, a verse that is both one row, and the
// chips that hold something. From 1.8 the highlighted paragraphs of the
// Fathers are in it too, under Writings, and Verses holds every verse kept.

import { describe, expect, it } from "vitest";

import type { Bookmark } from "@/lib/bookmarks";
import {
  chipsFor,
  countFor,
  highlightFrom,
  inFilter,
  isSavedFilter,
  matchesQuery,
  passageFrom,
  passageKey,
  savedFeed,
  type SavedHighlight,
  type SavedPassage,
} from "../feed";

const day = (d: number) => Date.parse(`2026-10-${String(d).padStart(2, "0")}T12:00:00Z`);

const verse = (book: string, chapter: number, v: number, at: number): Bookmark => ({
  id: `v-${book}-${chapter}-${v}`,
  kind: "bible-verse",
  book,
  bookName: book,
  chapter,
  verse: v,
  label: `${book} ${chapter}:${v}`,
  addedAt: at,
});

const hl = (book: string, chapter: number, v: number, at: string | null, extra: Partial<SavedHighlight> = {}): SavedHighlight => ({
  book,
  chapter,
  verse: v,
  color: "yellow",
  whole: true,
  words: [],
  at,
  ...extra,
});

const others: Bookmark[] = [
  { id: "p", kind: "prayer", ruleId: "morning", prayerId: "trisagion", label: "Trisagion", addedAt: day(3) },
  { id: "r", kind: "prayer-rule", ruleId: "evening", href: "/prayers/evening", label: "Evening prayers", addedAt: day(4) },
  { id: "s", kind: "saint", saintSlug: "john-chrysostom", label: "St John Chrysostom", addedAt: day(5) },
  { id: "w", kind: "writing-section", saintSlug: "john-chrysostom", saintName: "St John Chrysostom", workSlug: "homilies-on-matthew", workTitle: "Homilies on Matthew", sectionN: 15, sectionTitle: "Homily 15", label: "x", addedAt: day(6) },
  { id: "c", kind: "bible-chapter", book: "psalms", bookName: "Psalms", chapter: 50, label: "Psalms 50", addedAt: day(7) },
  { id: "h", kind: "history-event", eventSlug: "nicaea-i", displayDate: "325", label: "Nicaea", addedAt: day(8) },
  { id: "k", kind: "walkthrough-card", book: "job", bookName: "Job", chapter: 1, cardId: "job-1-5", label: "Job's sons", addedAt: day(9) },
];

describe("reading a highlight off the device", () => {
  it("takes a whole-verse or word highlight, with its colour and date", () => {
    expect(highlightFrom("purify:bible:john:3:16", JSON.stringify({ highlighted: true, color: "blue", at: "2026-10-02T00:00:00Z" }))).toMatchObject({
      book: "john",
      chapter: 3,
      verse: 16,
      color: "blue",
      whole: true,
      at: "2026-10-02T00:00:00Z",
    });
    expect(highlightFrom("purify:bible:john:3:17", JSON.stringify({ highlightedWords: [2, 3] }))).toMatchObject({ whole: false, words: [2, 3], color: "yellow", at: null });
  });

  it("leaves out a verse that has only a note, and anything that is not a verse", () => {
    expect(highlightFrom("purify:bible:john:3:16", JSON.stringify({ note: "Only words." }))).toBeNull();
    expect(highlightFrom("purify:saint:john-chrysostom:homilies-on-matthew:15:2", JSON.stringify({ highlighted: true }))).toBeNull();
    expect(highlightFrom("purify:bible:john:3:16", "{not json")).toBeNull();
  });
});

describe("one list", () => {
  it("a verse that is starred and highlighted is one row, carrying both", () => {
    const feed = savedFeed([verse("john", 3, 16, day(1))], [hl("john", 3, 16, "2026-10-02T12:00:00Z", { color: "rose" })]);
    expect(feed).toHaveLength(1);
    expect(feed[0].bookmark?.kind).toBe("bible-verse");
    expect(feed[0].highlight?.color).toBe("rose");
    // As new as the later of the two.
    expect(feed[0].at).toBe(day(2));
  });

  it("is newest first, and the highlights from before 1.7 come after, in the Bible's order", () => {
    const feed = savedFeed(
      [verse("john", 1, 1, day(10)), ...others],
      [hl("john", 3, 16, "2026-10-12T00:00:00Z"), hl("romans", 8, 28, null), hl("genesis", 1, 1, null), hl("john", 1, 14, null)],
    );
    expect(feed.slice(0, 2).map((i) => i.key)).toEqual(["verse:john:3:16", "verse:john:1:1"]);
    expect(feed.slice(-3).map((i) => i.key)).toEqual(["verse:genesis:1:1", "verse:john:1:14", "verse:romans:8:28"]);
  });
});

describe("the paragraphs of the Fathers", () => {
  it("are read off the device when they are highlighted, with their note and date", () => {
    expect(passageFrom("purify:saint:john-chrysostom:homilies-on-matthew:15:2", JSON.stringify({ highlighted: true, note: "Fasting.", at: "2026-10-02T00:00:00Z" }))).toEqual({
      saintSlug: "john-chrysostom",
      workSlug: "homilies-on-matthew",
      sectionN: 15,
      paragraphIdx: 2,
      note: "Fasting.",
      at: "2026-10-02T00:00:00Z",
    });
    expect(passageFrom("purify:saint:john-chrysostom:homilies-on-matthew:15:3", JSON.stringify({ highlighted: true }))?.at).toBeNull();
  });

  it("leave out a paragraph with only a note, a verse, and anything that does not parse", () => {
    expect(passageFrom("purify:saint:john-chrysostom:homilies-on-matthew:15:2", JSON.stringify({ note: "Only words." }))).toBeNull();
    expect(passageFrom("purify:bible:john:3:16", JSON.stringify({ highlighted: true }))).toBeNull();
    expect(passageFrom("purify:saint:john-chrysostom:homilies-on-matthew:x:2", JSON.stringify({ highlighted: true }))).toBeNull();
    expect(passageFrom("purify:saint:john-chrysostom:homilies-on-matthew:15:2", "{not json")).toBeNull();
  });

  it("are rows of the one list, newest first, the undated after the undated verses", () => {
    const p = (sectionN: number, paragraphIdx: number, at: string | null): SavedPassage => ({ saintSlug: "athanasius-the-great", workSlug: "on-the-incarnation", sectionN, paragraphIdx, at });
    const feed = savedFeed([verse("john", 1, 1, day(10))], [hl("romans", 8, 28, null)], [p(2, 1, null), p(1, 3, "2026-10-11T00:00:00Z"), p(1, 0, null)]);
    expect(feed.map((i) => i.key)).toEqual([
      passageKey(p(1, 3, null)),
      "verse:john:1:1",
      "verse:romans:8:28",
      passageKey(p(1, 0, null)),
      passageKey(p(2, 1, null)),
    ]);
  });
});

describe("the chips", () => {
  const passage: SavedPassage = { saintSlug: "john-chrysostom", workSlug: "homilies-on-matthew", sectionN: 15, paragraphIdx: 2, at: null };
  const feed = savedFeed([verse("john", 3, 16, day(1)), ...others], [hl("john", 3, 16, null), hl("luke", 1, 46, null)], [passage]);

  it("put each kind under its own chip", () => {
    const under = (f: Parameters<typeof inFilter>[1]) => feed.filter((i) => inFilter(i, f)).map((i) => i.bookmark?.id ?? i.key).sort();
    // Every verse kept, starred or only highlighted.
    expect(under("verses")).toEqual(["v-john-3-16", "verse:luke:1:46"]);
    expect(under("highlights")).toEqual([passageKey(passage), "v-john-3-16", "verse:luke:1:46"]);
    // What the Fathers wrote: a section starred, a paragraph highlighted.
    expect(under("writings")).toEqual([passageKey(passage), "w"]);
    expect(under("prayers")).toEqual(["p", "r"]);
    expect(under("saints")).toEqual(["s"]);
    expect(under("readings")).toEqual(["c", "h", "k"]);
    expect(under("icons")).toEqual([]);
    expect(under("all")).toHaveLength(feed.length);
  });

  it("can be named in the address", () => {
    for (const f of ["all", "verses", "highlights", "writings", "prayers", "saints", "readings", "icons", "history"]) expect(isSavedFilter(f), f).toBe(true);
    expect(isSavedFilter("paragraphs")).toBe(false);
    expect(isSavedFilter(null)).toBe(false);
  });

  it("show only chips with something under them, History last and only when there is history", () => {
    expect(chipsFor(feed, 0)).toEqual(["all", "verses", "highlights", "writings", "prayers", "saints", "readings"]);
    expect(chipsFor(feed, 3)).toEqual(["all", "verses", "highlights", "writings", "prayers", "saints", "readings", "history"]);
    const product: Bookmark = { id: "i", kind: "product", productSlug: "theotokos", storeName: "EIKON", priceLabel: "$49", label: "Theotokos", addedAt: day(2) };
    const withIcon = savedFeed([product], []);
    expect(chipsFor(withIcon, 0)).toEqual(["all", "icons"]);
    expect(chipsFor([], 0)).toEqual(["all"]);
    expect(countFor(feed, "highlights", 0)).toBe(3);
    expect(countFor(feed, "history", 7)).toBe(7);
  });
});

describe("search", () => {
  it("finds words in any order, whatever their case and accents", () => {
    expect(matchesQuery("For God so loved the world · John 3:16", "loved WORLD")).toBe(true);
    expect(matchesQuery("Ἐν ἀρχῇ ἦν ὁ λόγος", "αρχη")).toBe(true);
    expect(matchesQuery("Saint Nicholas", "nicholas basil")).toBe(false);
    expect(matchesQuery("Anything", "  ")).toBe(true);
  });
});
