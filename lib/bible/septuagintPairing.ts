// Pairing Swete's Greek with Brenton's English verse for verse, with no file
// reads, so the reader (lib/bible/greekText.ts) and the build script that tags
// the English word by word (scripts/bible/tag-septuagint-english.mjs) decide
// alike which chapters pair. Plain TypeScript with no imports: the script loads
// it in plain Node with types stripped.

type Verse = { n: number; text: string };

/** Letters only: the two editions punctuate and space differently. */
export function letters(text: string): number {
  return text.replace(/[^\p{L}]/gu, "").length;
}

/** Swete opens a psalm's text with a word in capitals (ΕΛΕΗΣΟΝ in Psalm 50). */
function opensInCapitals(text: string): boolean {
  const word = (text.trim().split(/\s+/)[0] ?? "").replace(/[^\p{L}]/gu, "");
  return word.length >= 2 && word === word.toUpperCase() && word !== word.toLowerCase();
}

/**
 * How many verses Swete gives a psalm's title before its text begins. A short
 * title shares verse 1 with the first line, as in Purify's English; a long
 * one stands as a verse or two of its own (Psalm 50: the title is 1 and 2,
 * "Have mercy on me, O God" is 3), which the English, giving no titles,
 * does not count.
 */
export function titleVerses(book: string, greek: readonly Verse[]): number {
  if (book !== "psalms") return 0;
  const i = greek.findIndex((v) => opensInCapitals(v.text));
  return i > 0 && i <= 2 ? greek[i].n - 1 : 0;
}

// The length check. Matching verse numbers are not enough: Brenton's Exodus 25
// carries a verse of the Hebrew that the Greek lacks and drops one later, so
// the numbers agree while most of the chapter stands a verse apart. A verse's
// Greek and its English run long or short together, so a shift shows in the
// lengths. Gale and Church's alignment (1993) finds the likeliest pairing of
// two runs of lengths; the chapter is paired verse for verse only when that
// pairing is one to one throughout.
//
// Tuned on this corpus, 2026-09-30: of the 858 Old Testament chapters whose
// numbers agree, it keeps 805 and refuses the shifted ones read side by side
// (Exodus 25, Tobit 5, the Song 6, Judith 16, 1 Samuel 21), while keeping
// chapters where only a clause sits across a verse boundary (Job 17:2-3,
// Psalm 129:4-5). The variance comes from the corpus; the odds favour one to
// one strongly, because the numbers already agree.
const VARIANCE = 2.5;
const STEPS: readonly (readonly [number, number, number])[] = [
  [1, 1, -Math.log(0.98)],
  [2, 1, -Math.log(0.009)],
  [1, 2, -Math.log(0.009)],
  [1, 0, -Math.log(0.001)],
  [0, 1, -Math.log(0.001)],
];

/** The complementary error function (Numerical Recipes, error below 1.2e-7). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? r : 2 - r;
}

/** How unlikely it is that `greek` letters of Greek became `english` of English. */
function lengthCost(greek: number, english: number, ratio: number): number {
  const mean = (greek * ratio + english) / 2;
  if (mean === 0) return Infinity;
  const z = Math.abs(greek * ratio - english) / Math.sqrt(VARIANCE * mean);
  return -Math.log(Math.max(erfc(z / Math.SQRT2), 1e-300));
}

/** True when pairing each verse with its own number is the likeliest pairing
 *  of the two runs of lengths, given in the same order. */
export function pairsOneToOne(greek: readonly number[], english: readonly number[]): boolean {
  const n = greek.length;
  if (n === 0 || n !== english.length) return false;
  const ratio = english.reduce((a, b) => a + b, 0) / greek.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(ratio) || ratio === 0) return false;
  const cost = Array.from({ length: n + 1 }, () => new Float64Array(n + 1).fill(Infinity));
  const step = Array.from({ length: n + 1 }, () => new Int8Array(n + 1).fill(-1));
  cost[0][0] = 0;
  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= n; j += 1) {
      for (let k = 0; k < STEPS.length; k += 1) {
        const [a, b, odds] = STEPS[k];
        if (i < a || j < b || cost[i - a][j - b] === Infinity) continue;
        let g = 0;
        let e = 0;
        for (let x = 1; x <= a; x += 1) g += greek[i - x];
        for (let y = 1; y <= b; y += 1) e += english[j - y];
        const c = cost[i - a][j - b] + odds + lengthCost(g, e, ratio);
        // Strictly cheaper only, so a tie stays one to one (tried first).
        if (c < cost[i][j]) {
          cost[i][j] = c;
          step[i][j] = k;
        }
      }
    }
  }
  for (let i = n; i > 0; i -= 1) if (step[i][i] !== 0) return false;
  return true;
}

/**
 * The number to add to an English verse to find its Greek (0 nearly
 * everywhere, 2 in Psalm 50), or null where the chapter cannot be paired verse
 * for verse: the numbers must agree once a psalm's title is stepped past, and
 * the verse lengths must align one to one (pairsOneToOne).
 */
export function pairingOffset(book: string, greek: readonly Verse[], english: readonly Verse[]): number | null {
  const offset = titleVerses(book, greek);
  const kept = greek.filter((v) => v.n > offset);
  const byEnglish = new Map(kept.map((v) => [v.n - offset, v.text]));
  const sameNumbers = kept.length === english.length && english.every((v) => byEnglish.has(v.n));
  if (!sameNumbers) return null;
  const paired = pairsOneToOne(
    english.map((v) => letters(byEnglish.get(v.n) ?? "")),
    english.map((v) => letters(v.text)),
  );
  return paired ? offset : null;
}
