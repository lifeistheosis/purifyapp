// How a chant's words are shown, as the reader keeps it on the device (1.8,
// notes 56 and 59): the words as sung, their transliteration, or both. The
// English is always there since sheet r3-18 (the owner's pick of 2026-10-31):
// under the line being sung on a chant's page, over the words in Now Playing.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { parseWordsPrefs, WORDS_DEFAULTS } from "@/lib/chants/wordsPrefs";

describe("the words' view, kept on the device", () => {
  it("opens on the words as they are sung, the English on", () => {
    // The owner: "there should be Arabic, right? But you should also have
    // the option to switch it to English transliteration".
    expect(WORDS_DEFAULTS).toEqual({ view: "original", en: true });
    expect(parseWordsPrefs(null)).toEqual(WORDS_DEFAULTS);
  });

  it("keeps the reader's choice of view", () => {
    expect(parseWordsPrefs(JSON.stringify({ view: "both", en: true }))).toEqual({ view: "both", en: true });
    expect(parseWordsPrefs(JSON.stringify({ view: "translit", en: true }))).toEqual({ view: "translit", en: true });
  });

  it("keeps the English on, whatever was kept before r3-18", () => {
    // The sheet that turned the English off went with the button beside
    // Share that note 61 found arriving late: an "off" kept from before would
    // hide it for good, with nothing left to turn it back on.
    expect(parseWordsPrefs(JSON.stringify({ view: "both", en: false }))).toEqual({ view: "both", en: true });
    expect(fs.readFileSync("components/chants/ChantWords.tsx", "utf8")).not.toMatch(/setWordsPrefs\(\{\s*en:/);
  });

  it("reads anything else as the defaults, a choice kept before the switch too", () => {
    expect(parseWordsPrefs("{")).toEqual(WORDS_DEFAULTS);
    expect(parseWordsPrefs(JSON.stringify({ view: "sound" }))).toEqual(WORDS_DEFAULTS);
    // 1.7's sheet kept { translit, en }: the transliteration now has its own
    // switch on the words, and the English is always there.
    expect(parseWordsPrefs(JSON.stringify({ translit: true, en: false }))).toEqual({ view: "original", en: true });
  });
});
