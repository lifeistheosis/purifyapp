import type { Token } from "./load";

/**
 * The Greek beside a chapter, packed for its file (1.9, the full optimize:
 * the owner's "do everything you can that's safe").
 *
 * The interlinear's 1,064 files (app/bible-data/interlinear) wrote every word
 * as an object, `{"w":"ἀρχῇ","s":"746","p":"N-DSF"}`, its three names
 * repeated for each of some 400,000 words: 6.6 MB of the apps' 240 on disk.
 * Packed, a word is the same values in a short array, `["ἀρχῇ","746","N-DSF"]`:
 * the Greek's word, its Strong's number (or "" when it has none and the
 * parse follows), its parse; the English's word and number. The running text
 * is as it was. lib/bible/chapterData.ts unpacks as it reads, so every reader
 * of the Greek sees the very objects it always did, and a word already in the
 * old shape (a website tab open across a deploy) passes through as it is.
 * lib/bible/__tests__/interlinearPack.test.ts holds every chapter to its round trip.
 */

/** A word on the wire: [word], [word, number], or [word, number or "", parse]. */
export type PackedWord = [string] | [string, string] | [string, string, string];

/** The Greek beside a chapter, as its file holds it. */
export type PackedInterlinear = {
  text: Record<number, string>;
  tokens: Record<number, PackedWord[]>;
  english: Record<number, PackedWord[]>;
};

/** The Greek beside a chapter, as the reader draws it (lib/bible/chapterExtras.ts, ChapterInterlinear). */
export type Interlinear = {
  text: Record<number, string>;
  tokens: Record<number, Token[]>;
  english: Record<number, { w: string; s?: string }[]>;
};

export function packWord(t: { w: string; s?: string; p?: string }): PackedWord {
  if (t.p !== undefined) return [t.w, t.s ?? "", t.p];
  if (t.s !== undefined) return [t.w, t.s];
  return [t.w];
}

export function unpackWord(word: PackedWord | Token): Token {
  if (!Array.isArray(word)) return word;
  const [w, s, p] = word;
  const out: Token = { w };
  if (s) out.s = s;
  if (p !== undefined) out.p = p;
  return out;
}

function mapVerses<A, B>(verses: Record<number, A[]>, f: (a: A) => B): Record<number, B[]> {
  const out: Record<number, B[]> = {};
  for (const [n, words] of Object.entries(verses)) out[Number(n)] = words.map(f);
  return out;
}

export function packInterlinear(c: Interlinear): PackedInterlinear {
  return { text: c.text, tokens: mapVerses(c.tokens, packWord), english: mapVerses(c.english, packWord) };
}

/** Never throws on a file short of a part: a part it lacks is empty, as a chapter with none would be. */
export function unpackInterlinear(p: Partial<PackedInterlinear | Interlinear>): Interlinear {
  return {
    text: p.text ?? {},
    tokens: mapVerses<PackedWord | Token, Token>(p.tokens ?? {}, unpackWord),
    english: mapVerses<PackedWord | Token, { w: string; s?: string }>(p.english ?? {}, (w) => {
      const { w: word, s } = unpackWord(w);
      return s === undefined ? { w: word } : { w: word, s };
    }),
  };
}
