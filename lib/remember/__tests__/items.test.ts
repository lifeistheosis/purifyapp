import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ITEMS_MAX, OWN_MAX, cleanItem, cleanItems, isGone, kindOfKey, mergeItems, ownItem, quoteItem, quoteKey, verseItem, type KeptItem, type LearnItem } from "../items";
import { answer, askedOn, choose, chosenKey, dropItem, dueItem, keepItem, learnablesOf, rememberStore, textOf, verseKey, type SavedVerse } from "../schedule";

// What a reader learns besides their saved verses (build 93 note 11): a
// verse by its place, a quote from a text the app carries, their own words.
// The editorial line is held here at the shape: a quote is never kept
// without whose words they are, the work and the place it opens, and the
// reader's own words have no field a name could stand in.

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
      dispatchEvent: () => true,
    },
  });
});
afterEach(() => {
  // @ts-expect-error -- the node test environment has no window of its own.
  delete globalThis.window;
});

const PLACE = { href: "/saints/anthony-the-great/life-of-antony#p-2-93", author: "St. Athanasius the Great", work: "Life of Antony", place: "§93" };
const WORDS = "Let Christ be as the breath you breathe; in Him put your trust.";

const saved = (book: string, chapter: number, n: number, addedAt: number): SavedVerse => ({ key: verseKey(book, chapter, n), book, chapter, verse: n, label: `${book} ${chapter}:${n}`, addedAt });

describe("a quote to learn", () => {
  it("is kept with whose words they are, the work and the place it opens", () => {
    const quote = quoteItem({ text: WORDS, by: "St. Antony the Great", cite: PLACE }, 10)!;
    expect(quote).toEqual({ kind: "quote", key: quoteKey(PLACE.href, WORDS), text: WORDS, by: "St. Antony the Great", cite: PLACE, addedAt: 10 });
    expect(kindOfKey(quote.key)).toBe("quote");
  });

  it("is not a quote without a name, a work, or a place inside the app", () => {
    expect(quoteItem({ text: WORDS, by: "", cite: PLACE }, 10)).toBeNull();
    expect(quoteItem({ text: WORDS, by: "St. Antony the Great", cite: { ...PLACE, work: "" } }, 10)).toBeNull();
    expect(quoteItem({ text: WORDS, by: "St. Antony the Great", cite: { ...PLACE, href: "" } }, 10)).toBeNull();
    // A link kept on a device or carried from another is never a way out of the app.
    for (const href of ["https://example.com/a", "//example.com", "javascript:alert(1)", "/saints/x?next=//example.com", "saints/x"]) {
      expect(quoteItem({ text: WORDS, by: "St. Antony the Great", cite: { ...PLACE, href } }, 10), href).toBeNull();
    }
  });

  it("is the same item for the same words at the same place, on any device", () => {
    expect(quoteKey(PLACE.href, WORDS)).toBe(quoteKey(PLACE.href, `  ${WORDS}  `));
    expect(quoteKey(PLACE.href, WORDS)).not.toBe(quoteKey(PLACE.href, WORDS.slice(0, -1)));
    expect(quoteKey(PLACE.href, WORDS)).not.toBe(quoteKey("/saints/anthony-the-great/life-of-antony#p-2-94", WORDS));
  });

  it("cannot be made of the reader's own words by a name slipped in beside them", () => {
    const own = ownItem("Lord Jesus Christ, have mercy on me.", 10)!;
    // Read back with a name, a work and a place put beside the words, as a hand-edited store or another device might send it.
    const forged = cleanItem(own.key, { ...own, by: "St. John Chrysostom", cite: PLACE }) as LearnItem;
    expect(forged).toEqual(own);
    expect(Object.keys(forged).sort()).toEqual(["addedAt", "key", "kind", "text"]);
    // And a key says its own kind: own words under a quote's kind are nothing.
    expect(cleanItem(own.key, { ...own, kind: "quote", by: "St. John Chrysostom", cite: PLACE })).toBeNull();
  });
});

describe("the reader's own words", () => {
  it("are one plain line, no longer than a line to say from memory", () => {
    const own = ownItem(`  Lord,\n\nhave\u200b mercy.  `, 5)!;
    expect(own.text).toBe("Lord, have mercy.");
    expect([...ownItem("а".repeat(OWN_MAX + 50), 5)!.text]).toHaveLength(OWN_MAX);
    expect(ownItem("   \n ", 5)).toBeNull();
  });

  it("get a key of their own each time", () => {
    expect(ownItem("Glory to God", 1)!.key).not.toBe(ownItem("Glory to God", 1)!.key);
  });
});

describe("a verse taken by its place", () => {
  it("is kept under the key a saved verse has, so one verse is one item", () => {
    const verse = verseItem({ book: "john", chapter: 3, verse: 16, label: "John 3:16" }, 7)!;
    expect(verse.key).toBe(verseKey("john", 3, 16));
    const list = learnablesOf([saved("john", 3, 16, 1)], { [verse.key]: verse });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "verse", addedAt: 1 });
  });
});

describe("the list a reader keeps", () => {
  it("drops what is not of its shape and keeps the newest when it is over its size", () => {
    const many: Record<string, unknown> = { nonsense: { kind: "own", text: "x", addedAt: 1 }, "own:abcdef": "words" };
    for (let i = 0; i < ITEMS_MAX + 5; i++) many[`own:${String(i).padStart(6, "0")}`] = { kind: "own", text: `line ${i}`, addedAt: i + 1 };
    const clean = cleanItems(many);
    expect(Object.keys(clean)).toHaveLength(ITEMS_MAX);
    expect(clean["own:000000"]).toBeUndefined();
    expect(clean[`own:${String(ITEMS_MAX + 4).padStart(6, "0")}`]).toBeDefined();
  });

  it("merges two devices by the later of an item's adding and its taking off", () => {
    const a = ownItem("first", 10)!;
    const b = ownItem("second", 20)!;
    const here: Record<string, KeptItem> = { [a.key]: a, [b.key]: { gone: 30 } };
    const there: Record<string, KeptItem> = { [a.key]: { gone: 5 }, [b.key]: b };
    const merged = mergeItems(here, there);
    // Taken off before it was added here: it stays. Taken off after it was added there: it goes.
    expect(merged[a.key]).toEqual(a);
    expect(isGone(merged[b.key])).toBe(true);
    // Added again after it was taken off, it is back.
    expect(mergeItems(merged, { [b.key]: { ...b, addedAt: 40 } })[b.key]).toMatchObject({ text: "second", addedAt: 40 });
  });
});

describe("the one the reader chose", () => {
  const john = saved("john", 3, 16, 1);
  const psalm = saved("psalms", 22, 1, 2);

  it("is chosen by taking it up, and asked first while it is new or due", () => {
    const quote = quoteItem({ text: WORDS, by: "St. Antony the Great", cite: PLACE }, 50)!;
    expect(dueItem(learnablesOf([john, psalm], rememberStore().items), "2026-11-11")?.key).toBe(john.key);
    keepItem(quote);
    expect(chosenKey()).toBe(quote.key);
    const list = learnablesOf([john, psalm], rememberStore().items);
    expect(list.map((v) => v.kind)).toEqual(["verse", "verse", "quote"]);
    expect(dueItem(list, "2026-11-11")?.key).toBe(quote.key);
    expect(textOf(quote.key)).toBe(WORDS);
    // Answered, it waits its days, and the longest-kept has its turn tomorrow.
    answer(quote.key, true, "2026-11-11");
    expect(dueItem(list, "2026-11-11")).toBeNull();
    expect(askedOn(list, rememberStore().entries, quote.key, "2026-11-12")?.key).toBe(quote.key);
    answer(quote.key, true, "2026-11-12");
    expect(askedOn(list, rememberStore().entries, quote.key, "2026-11-13")?.key).toBe(john.key);
  });

  it("can be changed at any time, and given up", () => {
    choose(psalm.key);
    expect(dueItem(learnablesOf([john, psalm], {}), "2026-11-11")?.key).toBe(psalm.key);
    choose(john.key);
    expect(chosenKey()).toBe(john.key);
    choose(null);
    expect(chosenKey()).toBeNull();
    expect(dueItem(learnablesOf([john, psalm], {}), "2026-11-11")?.key).toBe(john.key);
  });

  it("goes with the item when it is taken off, and the item leaves its mark", () => {
    const own = ownItem("Lord, have mercy.", 5)!;
    keepItem(own);
    answer(own.key, true, "2026-11-11");
    dropItem(own.key);
    const kept = rememberStore();
    expect(chosenKey()).toBeNull();
    expect(isGone(kept.items[own.key])).toBe(true);
    expect(kept.entries[own.key]).toBeUndefined();
    expect(textOf(own.key)).toBeNull();
    expect(learnablesOf([], kept.items)).toEqual([]);
  });
});
