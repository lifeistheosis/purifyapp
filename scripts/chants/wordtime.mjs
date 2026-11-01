// The pure half of timing a chant's words word by word (1.8, build 86 note 78):
// the owner's "each word timestamped and followed in the lyrics section".
// scripts/chants/time-words.mjs runs the speech model and hands its findings
// here; lib/chants/__tests__/wordtime.test.ts holds what is decided here.
//
// Nothing here hears anything. It folds words so that what a speech model
// writes can be compared with the printed words, lines the two up, turns the
// model's token times into each word's start and end inside its line, and
// writes the version 2 timing file, a caption line to a line of the file.

/** A line's words, as the app splits them (lib/player/captions.ts, wordsOf). */
export function wordsOf(text) {
  return String(text).split(/\s+/).filter(Boolean);
}

const CYRILLIC = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ж: "z", з: "z", и: "i", ј: "j", к: "k", л: "l", љ: "lj",
  м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f", х: "h", ц: "c", ч: "c",
  џ: "dz", ш: "s", й: "j", ы: "i", э: "e", ю: "ju", я: "ja", ь: "", ъ: "", щ: "s", ё: "e", є: "e", ї: "i", і: "i",
};

const GREEK_PAIRS = [
  ["ου", "u"], ["ει", "i"], ["οι", "i"], ["υι", "i"], ["αι", "e"], ["αυ", "av"], ["ευ", "ev"], ["γγ", "ng"], ["γκ", "g"], ["μπ", "b"], ["ντ", "d"],
];
const GREEK = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o",
  π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "i", φ: "f", χ: "h", ψ: "ps", ω: "o",
};

/** A character by its code point, so the source carries no raw marks. */
const cp = (...codes) => String.fromCharCode(...codes);
/** Arabic's vowel marks, Quranic marks and the stretching tatweel. */
const AR_MARKS = new RegExp(`[${cp(0x64b)}-${cp(0x65f)}${cp(0x670)}${cp(0x6d6)}-${cp(0x6ed)}${cp(0x640)}]`, "g");
/** Alef with madda, with hamza above or below, and wasla: all alef. */
const AR_ALEFS = new RegExp(`[${cp(0x622)}${cp(0x623)}${cp(0x625)}${cp(0x671)}]`, "g");
/** Anything that is not an Arabic letter. */
const AR_OTHER = new RegExp(`[^${cp(0x621)}-${cp(0x64a)}]`, "g");
/** The combining accents NFD leaves beside a letter. */
const ACCENTS = new RegExp(`[${cp(0x300)}-${cp(0x36f)}]`, "g");

/**
 * A word as it sounds, near enough to compare: no case, marks or stops, and
 * per script the spellings that sound alike made one (Greek's many i's,
 * Arabic's alef forms, Serbian in either alphabet).
 */
export function fold(word, language = "en") {
  const lang = String(language).slice(0, 2);
  let w = String(word).toLowerCase();
  if (lang === "ar") {
    w = w
      .replace(AR_MARKS, "")
      .replace(AR_ALEFS, cp(0x627))
      .replace(new RegExp(cp(0x649), "g"), cp(0x64a))
      .replace(new RegExp(cp(0x629), "g"), cp(0x647))
      .replace(new RegExp(cp(0x624), "g"), cp(0x648))
      .replace(new RegExp(cp(0x626), "g"), cp(0x64a))
      .replace(new RegExp(cp(0x621), "g"), "");
    return w.replace(AR_OTHER, "");
  }
  w = w.normalize("NFD").replace(ACCENTS, "").normalize("NFC");
  if (lang === "el") {
    for (const [a, b] of GREEK_PAIRS) w = w.split(a).join(b);
    w = [...w].map((ch) => GREEK[ch] ?? ch).join("");
  } else {
    w = [...w].map((ch) => CYRILLIC[ch] ?? ch).join("");
    w = w.replace(/đ/g, "dj");
  }
  return w.replace(/[^a-z0-9]/g, "");
}

/** Edit distance, for words of a few letters. */
function distance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

/** How alike two folded words are, 0 to 1. */
export function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  return 1 - distance(a, b) / Math.max(a.length, b.length);
}

/**
 * Which printed words the speech model's own transcript heard: the two lined
 * up in order (a word may be heard as two, or two as one), and a printed
 * word counts as heard where what it lines up with is at least `threshold`
 * alike. Returns one flag a printed word.
 */
export function heardWords(printed, heard, language = "en", threshold = 0.6) {
  const P = printed.map((w) => fold(w, language));
  const H = heard.map((w) => fold(w, language)).filter(Boolean);
  const n = P.length;
  const m = H.length;
  const GAP = -0.35;
  const score = (a, b) => {
    const s = similarity(a, b);
    return s >= 0.5 ? s : s - 0.75;
  };
  const best = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(-Infinity));
  const from = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  best[0][0] = 0;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      const here = best[i][j];
      if (here === -Infinity) continue;
      const step = (di, dj, gain, matched) => {
        const ni = i + di;
        const nj = j + dj;
        if (ni > n || nj > m) return;
        if (here + gain > best[ni][nj]) {
          best[ni][nj] = here + gain;
          from[ni][nj] = { i, j, matched };
        }
      };
      if (i < n) step(1, 0, GAP, false);
      if (j < m) step(0, 1, GAP, false);
      if (i < n && j < m) step(1, 1, score(P[i], H[j]), similarity(P[i], H[j]) >= threshold);
      // A word heard as two, or two as one, only where the joined spelling
      // is very near: a short word must not ride in on its neighbour.
      const merged = (a, b) => {
        const s = similarity(a, b);
        return [s >= MERGED ? s : s - 1.5, s >= Math.max(threshold, MERGED)];
      };
      if (i < n && j + 1 < m) step(1, 2, ...merged(P[i], H[j] + H[j + 1]));
      if (i + 1 < n && j < m) step(2, 1, ...merged(P[i] + P[i + 1], H[j]));
    }
  }
  const flags = new Array(n).fill(false);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const f = from[i][j];
    if (!f) break;
    if (f.matched) for (let k = f.i; k < i; k++) flags[k] = true;
    i = f.i;
    j = f.j;
  }
  return flags;
}

/** How near a word heard as two (or two heard as one) must be to count. */
const MERGED = 0.85;

const round = (x) => Math.round(x * 100) / 100;

/**
 * Each word's start and end inside its line, from where the alignment put
 * each word's start. The first word starts at `at` (where the line is first
 * heard); every start moves forward, inside the line, by at least `least`
 * seconds a word; a word lasts until the next one starts, and the last until
 * `lastEnd` (where the alignment put the end of the words) or the line's end.
 */
export function wordTimes(starts, at, end, lastEnd = end, least = 0.08) {
  const n = starts.length;
  if (!n) return [];
  const room = Math.max(0, end - at);
  const step = Math.min(least, room / (n + 1));
  const out = [];
  let prev = at;
  for (let k = 0; k < n; k++) {
    const latest = end - step * (n - k);
    let t = k === 0 ? at : Math.min(Math.max(starts[k], prev + step), latest);
    if (!Number.isFinite(t)) t = prev + step;
    out.push(t);
    prev = t;
  }
  const finish = Math.min(end, Math.max(out[n - 1] + step, Number.isFinite(lastEnd) ? lastEnd : end));
  return out.map((t, k) => [round(t), round(k + 1 < n ? out[k + 1] : finish)]);
}

/**
 * Where a line too long for one hearing (the speech model hears 30 seconds
 * at a time) is cut: into `parts` pieces of about the same length of words,
 * each cut at the quietest moment within three seconds of where the words'
 * share of the line falls. `quiet(from, to)` gives that moment.
 * Returns the pieces: { from, to, first, count } (first word, word count).
 */
export function cutLongLine(words, at, end, parts, quiet) {
  const weight = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1.6);
  const cum = [0];
  for (const w of weight) cum.push(cum[cum.length - 1] + w);
  const total = cum[cum.length - 1] || 1;
  const pieces = [];
  let first = 0;
  let from = at;
  for (let p = 1; p < parts; p++) {
    // The next piece's first word: where the words' share passes p / parts,
    // with at least one word left for every piece.
    let k = first + 1;
    while (k < words.length - (parts - p) && cum[k] / total < p / parts) k++;
    const share = at + ((end - at) * cum[k]) / total;
    const to = quiet(Math.max(from + 1, share - 3), Math.min(end - 1, share + 3));
    pieces.push({ from, to, first, count: k - first });
    first = k;
    from = to;
  }
  pieces.push({ from, to: end, first, count: words.length - first });
  return pieces;
}

/** A version 2 timing file, a caption line to a line of the file, small in the bundle and readable in a diff. */
export function serializeTiming(timing) {
  const head = { v: timing.v, durationSec: timing.durationSec, ...(timing.made ? { made: timing.made } : {}) };
  const body = timing.lines.map((l) => JSON.stringify(l)).join(",\n");
  return `${JSON.stringify(head).slice(0, -1)},"lines":[\n${body}\n]}\n`;
}
