// How a chant's words are shown, as the reader keeps it on the device (1.8,
// notes 56 and 59): the words as sung, their transliteration, or both, and
// the English over them.

import { describe, expect, it } from "vitest";

import { parseWordsPrefs, WORDS_DEFAULTS } from "@/lib/chants/wordsPrefs";

describe("the words' view, kept on the device", () => {
  it("opens on the words as they are sung, the English on", () => {
    // The owner: "there should be Arabic, right? But you should also have
    // the option to switch it to English transliteration".
    expect(WORDS_DEFAULTS).toEqual({ view: "original", en: true });
    expect(parseWordsPrefs(null)).toEqual(WORDS_DEFAULTS);
  });

  it("keeps the reader's choice", () => {
    expect(parseWordsPrefs(JSON.stringify({ view: "both", en: false }))).toEqual({ view: "both", en: false });
    expect(parseWordsPrefs(JSON.stringify({ view: "translit", en: true }))).toEqual({ view: "translit", en: true });
  });

  it("reads anything else as the defaults, a choice kept before the switch too", () => {
    expect(parseWordsPrefs("{")).toEqual(WORDS_DEFAULTS);
    expect(parseWordsPrefs(JSON.stringify({ view: "sound" }))).toEqual(WORDS_DEFAULTS);
    // 1.7's sheet kept { translit, en }: the English choice stands, the
    // transliteration now has its own switch on the words.
    expect(parseWordsPrefs(JSON.stringify({ translit: true, en: false }))).toEqual({ view: "original", en: false });
  });
});
