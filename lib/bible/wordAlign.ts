/**
 * From a word the reader taps in the English to the Greek word it renders
 * (1.9, the verse strip's word tap, the owner's "tap the English word").
 *
 * The English is tagged word by word with the Strong's number of the Greek it
 * renders (data/bible/english-tagged, read through /bible-data/interlinear).
 * Its words are the verse's own words, one for one, in 98.2% of verses
 * (counted 2026-11-06 over 27,700); where an edition adds or splits a word,
 * the two lists are walked side by side and a word with no partner gives no
 * Greek rather than the wrong one.
 *
 * Several English words can render one Greek word ("the Word" for Λόγος), so
 * a run of English words with one number counts as one occurrence, as the
 * interlinear's own hover counts them (components/bible/VerseRow.tsx); the
 * Nth occurrence in the English is the Nth Greek word with that number.
 */

export type Tagged = { w: string; s?: string | null };

const norm = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/** The tagged word the reader's word `idx` (of the verse's words) is, or null. */
export function taggedIndex(words: readonly string[], tags: readonly Tagged[], idx: number): number | null {
  if (idx < 0 || idx >= words.length) return null;
  if (words.length === tags.length && norm(words[idx]) === norm(tags[idx]?.w ?? "")) return idx;
  let j = 0;
  for (let i = 0; i < words.length; i++) {
    const want = norm(words[i]);
    let k = j;
    while (k < tags.length && k < j + 3 && norm(tags[k].w) !== want) k++;
    const found = k < tags.length && norm(tags[k].w) === want;
    if (i === idx) return found ? k : null;
    if (found) j = k + 1;
  }
  return null;
}

/** The Greek word the tagged English word `k` renders, or null where it renders none. */
export function greekFor(tags: readonly Tagged[], greek: readonly Tagged[], k: number): number | null {
  const s = tags[k]?.s;
  if (!s) return null;
  let occ = -1;
  let prev: string | null | undefined;
  for (let i = 0; i <= k; i++) {
    const si = tags[i].s;
    if (si === s && prev !== s) occ++;
    prev = si;
  }
  let n = -1;
  let last: number | null = null;
  for (let g = 0; g < greek.length; g++) {
    if (greek[g].s !== s) continue;
    last = g;
    if (++n === occ) return g;
  }
  // More English runs than Greek words with that number: the nearest is the last.
  return last;
}
