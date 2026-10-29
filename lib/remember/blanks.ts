import { hintWords, type HintWord } from "./schedule";

/**
 * Which of a verse's words Remember the verse leaves blank (1.8, the owner's
 * "a mix of A and B with a good design" of round 16): the longer words, one
 * from each stretch of the verse so the blanks are spread through it, and
 * always the same ones for the same verse. Nothing here is random, so the
 * card asks the same thing every day the verse comes back, until it is known.
 */

/** A word shorter than this is never blanked: "the", "and" and "him" are not what is remembered. */
export const MIN_BLANK_LETTERS = 4;
/** At most this many blanks, however long the verse. */
export const MAX_BLANKS = 6;

/** How many blanks a verse of `words` words has: about one in six, at least one. */
export function blankCount(words: number): number {
  return Math.max(1, Math.min(MAX_BLANKS, Math.round(words / 6)));
}

/** Its letters, not its marks or its punctuation. */
function letters(word: string): number {
  return (word.match(/\p{L}/gu) ?? []).length;
}

/**
 * The places, in a verse's words (hintWords), of the words to blank. The
 * verse is cut into blankCount stretches of the same length, and in each the
 * longest word of at least MIN_BLANK_LETTERS letters is blanked, the first
 * of two as long. A stretch with none has no blank, and a verse of short
 * words only still has one: its longest.
 */
export function blanksIn(words: readonly HintWord[]): number[] {
  const spoken = words.flatMap((w, i) => (w.word ? [i] : []));
  if (!spoken.length) return [];
  const parts = blankCount(spoken.length);
  const out: number[] = [];
  for (let part = 0; part < parts; part++) {
    const stretch = spoken.slice(Math.floor((part * spoken.length) / parts), Math.floor(((part + 1) * spoken.length) / parts));
    let best = -1;
    let most = MIN_BLANK_LETTERS - 1;
    for (const i of stretch) {
      const count = letters(words[i].word);
      if (count > most) {
        best = i;
        most = count;
      }
    }
    if (best >= 0) out.push(best);
  }
  if (!out.length) {
    let best = spoken[0];
    for (const i of spoken) if (letters(words[i].word) > letters(words[best].word)) best = i;
    out.push(best);
  }
  return out;
}

/** A verse's word as the card sets it, and whether it is one of the blanks. */
export type BlankedWord = HintWord & { blank: boolean };

/** The verse as its words, each marked blank or not. */
export function blankedWords(text: string): BlankedWord[] {
  const words = hintWords(text);
  const blanks = new Set(blanksIn(words));
  return words.map((w, i) => ({ ...w, blank: blanks.has(i) }));
}
