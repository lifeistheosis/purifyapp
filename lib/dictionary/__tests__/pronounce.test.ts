import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DICTIONARY } from "@/lib/dictionary/terms";

/**
 * The read-aloud voice's pronunciation list (2026-10-16, the owner's "the
 * Orthodox term dictionary is gonna also train our voice model"). The voice
 * is handed each listed word as sounds; Homebase/tools/tts-bakeoff/lexicon
 * reads this file. These checks hold it to the dictionary it comes from.
 */
type Word = { term: string; say: string; ipa: string; note?: string; form?: "plural" };
const FILE = path.join(process.cwd(), "data/dictionary/pronounce.json");
const words = JSON.parse(fs.readFileSync(FILE, "utf8")).words as Record<string, Word>;

describe("the voice's pronunciation list", () => {
  it("names only the dictionary's words and their other names", () => {
    const byId = new Map(DICTIONARY.map((t) => [t.id, t]));
    for (const [word, w] of Object.entries(words)) {
      const term = byId.get(w.term);
      expect(term, `${word}: no term ${w.term}`).toBeTruthy();
      const names = [term!.term.replace(/ \(.*\)$/, ""), ...(term!.also ?? [])].map((n) => n.toLowerCase());
      // A plural the dictionary does not list is still that word.
      const named = w.form === "plural" ? names.map((n) => n.slice(0, 6)) : names;
      expect(named, `${word} is not a name of ${w.term}`).toContain(w.form === "plural" ? word.toLowerCase().slice(0, 6) : word.toLowerCase());
    }
  });

  it("gives each word a respelling and sounds with a stress", () => {
    for (const [word, w] of Object.entries(words)) {
      // Syllables by hyphens, the stressed one in capitals (a one-syllable
      // word has none to mark).
      expect(w.say, word).toMatch(/^[A-Za-z]+(-[A-Za-z]+)*$/);
      if (w.say.includes("-")) expect(w.say, word).toMatch(/(^|-)[A-Z]{2,}(-|$)/);
      expect(w.ipa, word).toMatch(/ˈ/);
      // The voice's own symbols: ɡ and ɹ, never the keyboard's g and r.
      expect(w.ipa, word).not.toMatch(/[gr]/);
      expect(JSON.stringify(w), word).not.toMatch(/—/);
    }
  });
});
