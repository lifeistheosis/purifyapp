import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { LEARNED_WORDS_SENTENCES, LEARNED_WORDS_TRAVEL, cleanRememberSlice, mergeRemember, travelling, withDeviceWords } from "../keptMerge";

// A quote's words and the reader's own words, learned by heart (build 93
// note 11), may leave the device only once the privacy page says they do.
// The page said of this row "which verse is due when, not its words" (his
// yes to 59), so the switch and the sentence go on together or not at all.

const page = fs.readFileSync("components/legal/PrivacyText.tsx", "utf8").replace(/\s+/g, " ");

const PLACE = { href: "/saints/anthony-the-great/life-of-antony#p-2-93", author: "St. Athanasius the Great", work: "Life of Antony", place: "§93" };
const quote = { kind: "quote", key: "q:abcdefgh012345", text: "Let Christ be as the breath you breathe.", by: "St. Antony the Great", cite: PLACE, addedAt: 100 } as const;
const own = { kind: "own", key: "own:abcdefgh0123", text: "Lord, have mercy.", addedAt: 200 } as const;
const verse = { kind: "verse", key: "john/3/16", book: "john", chapter: 3, verse: 16, label: "John 3:16", addedAt: 300 } as const;

const device = () =>
  cleanRememberSlice({
    entries: { [quote.key]: { box: 2, due: "2026-11-13", at: 7 }, [own.key]: { box: 1, due: "2026-11-12", at: 8 } },
    items: { [quote.key]: quote, [own.key]: own, [verse.key]: verse },
    chosen: { key: own.key, at: 400 },
  });

describe("a quote's words and the reader's own, between devices", () => {
  it("travel only when the privacy page says so, in each of its languages", () => {
    if (LEARNED_WORDS_TRAVEL) {
      expect(page).toContain(LEARNED_WORDS_SENTENCES.en);
      expect(page).toContain(LEARNED_WORDS_SENTENCES.de);
    } else {
      // Off: the page still says what is true today, and promises nothing more.
      expect(page).toContain("(which verse is due when, not its words)");
      expect(page).not.toContain(LEARNED_WORDS_SENTENCES.en);
    }
  });

  it("stay on the device while the switch is off: no word of them is in what leaves", () => {
    const leaving = travelling(device(), false);
    expect(Object.keys(leaving.items)).toEqual([verse.key]);
    const sent = JSON.stringify(leaving);
    expect(sent).not.toContain("breath you breathe");
    expect(sent).not.toContain("have mercy");
    expect(sent).not.toContain("Antony");
    // What the page already names does leave: which is due when, which is chosen, and a verse by its place.
    expect(leaving.entries[own.key]).toEqual({ box: 1, due: "2026-11-12", at: 8 });
    expect(leaving.chosen).toEqual({ key: own.key, at: 400 });
    expect(leaving.items[verse.key]).toEqual(verse);
  });

  it("are still on the device after an exchange while the switch is off", () => {
    const here = device();
    const theirs = travelling(cleanRememberSlice({ entries: { "psalms/22/1": { box: 1, due: "2026-11-12", at: 9 } }, items: {} }), false);
    const merged = mergeRemember(travelling(here, false), theirs);
    const kept = withDeviceWords(merged, here, false);
    expect(kept.items[quote.key]).toEqual(quote);
    expect(kept.items[own.key]).toEqual(own);
    expect(kept.items[verse.key]).toEqual(verse);
    expect(kept.entries["psalms/22/1"]).toBeDefined();
  });

  it("are not read from the server while the switch is off, even if a row holds them", () => {
    const theirs = travelling(cleanRememberSlice({ entries: {}, items: { [own.key]: own } }), false);
    expect(theirs.items).toEqual({});
  });

  it("travel whole once the switch is on", () => {
    const here = device();
    expect(travelling(here, true)).toEqual(here);
    expect(withDeviceWords({ ...here, items: {} }, here, true).items).toEqual({});
  });
});
