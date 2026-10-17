/**
 * The words on a book's poster (1.7.1, the owner's notes of 2026-10-17: "the
 * text is optimized", and then the reading room's covers as posters, "simply
 * the image", the title on it), worked out from the words themselves, so that
 * every title is whole at every size a poster is drawn
 * (components/covers/WorkCover.tsx): no title cut short, no word wider than
 * the poster, no line ending on "St." or on "of", and an author that never
 * meets the title.
 *
 * THE MEASURE. A poster's type is sized in container units (`cqw`, a
 * hundredth of the poster's own width): a fixed part and a part that grows
 * with the poster, so a small poster keeps its type a little larger for its
 * size than a large one does, as a title does on a thumbnail. Its lines are
 * worked out here from the width of every letter of the two faces the app
 * loads, Lora SemiBold for the title and DM Sans Medium for the author, at
 * the narrowest width the poster is drawn at. A wider poster gives every line
 * more room, so a title that fits there fits at every width.
 *
 * THE BREAKS. The browser balances the lines (`text-wrap: balance`); this file
 * says only where a line may not end. "St." stays with the name after it, a
 * title of honour stays with the name it is part of ("Holy Theotokos"), and a
 * small word (of, the, on, to, and ...) goes down to the next line with the
 * word after it, whenever the two fit on one line: "Homilies on the Gospel of
 * John" is set "Homilies / on the Gospel / of John", never "Homilies on the /
 * Gospel of / John". Each of these is a no-break space between two words;
 * nothing is added, taken out or put in another order.
 *
 * THE SIZE. Each title is tried at its scale's full size and at a few steps
 * smaller, and the one kept is the largest that fits the foot of the poster
 * with the author under it, unless a step smaller sets it better (no small
 * word left alone at the start or the end). The author is tried the same way
 * and may take two lines, three for the longest names. Hyphens are left as
 * they are: a title with one may break after it
 * (docs/1.7-build/notes/cover-titles.md).
 *
 * lib/reading/__tests__/coverText.test.ts holds every book in the room to
 * these rules at every size it is drawn.
 */

/** Advance widths, thousandths of an em, of U+0020 to U+007E (measured in Chromium from the faces app/layout.tsx loads). */
const LORA_SEMIBOLD =
  "263,261,333,857,568,893,678,195,299,299,529,530,251,477,237,696,631,392,534,559,545,542,576,466,569,577,250,266,530,530,530,493,794,654,648,692,754,623,563,756,798,370,425,702,595,954,769,777,628,779,667,588,647,757,690,1009,682,656,606,377,696,377,823,798,433,521,576,523,597,539,359,556,614,312,288,575,299,911,628,572,600,574,464,478,404,611,527,808,542,543,513,357,250,357,530";
const DM_SANS_MEDIUM =
  "256,269,315,820,588,822,749,171,383,383,490,559,202,552,215,403,690,328,576,595,621,613,630,535,616,630,219,243,559,559,559,529,1018,678,614,723,694,571,542,764,691,246,514,606,537,855,703,777,591,777,605,588,572,664,681,984,624,597,553,334,403,334,639,680,220,557,635,583,636,579,350,570,589,251,253,527,237,907,588,598,635,636,382,511,405,587,539,781,520,571,468,441,246,441,559";
/** Beyond ASCII, by code point: the no-break space, curly quotes, dashes and the accents the library uses. */
const LORA_EXTRA: Record<number, number> = {
  0xa0: 263, 0x2019: 198, 0x2018: 223, 0x201c: 415, 0x201d: 390, 0x2013: 572, 0x2014: 844,
  0xe9: 539, 0xe8: 539, 0xe1: 521, 0xe0: 521, 0xf6: 572, 0xfc: 611, 0xe7: 523, 0xf1: 628,
  0xed: 312, 0xf3: 572, 0xfa: 611, 0xe2: 521, 0xea: 539, 0xee: 312, 0xf4: 572, 0xfb: 611,
  0xeb: 539, 0xef: 312, 0x101: 521, 0x14d: 572, 0xc9: 623,
};
const SANS_EXTRA: Record<number, number> = {
  0xa0: 256, 0x2019: 224, 0x2018: 224, 0x201c: 394, 0x201d: 394, 0x2013: 677, 0x2014: 887,
  0xe9: 579, 0xe8: 579, 0xe1: 557, 0xe0: 557, 0xf6: 598, 0xfc: 587, 0xe7: 583, 0xf1: 588,
  0xed: 237, 0xf3: 598, 0xfa: 587, 0xe2: 557, 0xea: 579, 0xee: 237, 0xf4: 598, 0xfb: 587,
  0xeb: 579, 0xef: 237, 0x101: 557, 0x14d: 598, 0xc9: 571,
};
/** A letter of another script (an author's "Anonymous" in Russian or Greek): a little wider than most Latin ones. */
const OTHER = 640;

type Face = { ascii: number[]; extra: Record<number, number> };
const SERIF: Face = { ascii: LORA_SEMIBOLD.split(",").map(Number), extra: LORA_EXTRA };
const SANS: Face = { ascii: DM_SANS_MEDIUM.split(",").map(Number), extra: SANS_EXTRA };

/** A text's width in ems. The sum of its letters runs about one percent over the kerned width, which errs the safe way. */
export function emWidth(text: string, face: "serif" | "sans"): number {
  const f = face === "serif" ? SERIF : SANS;
  let sum = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    sum += code >= 32 && code <= 126 ? f.ascii[code - 32] : (f.extra[code] ?? OTHER);
  }
  return sum / 1000;
}

export type CoverScale = "tiny" | "shelf" | "large";
export type CoverSize = "sm" | "md" | "lg" | "row" | "grid" | "hero";

/**
 * A scale's measures, in hundredths of the poster's width (`cqw`), the
 * poster being two wide by three tall (150 tall). Type is `[px, cqw]`: a
 * fixed part and a part that grows with the poster.
 */
export type Geometry = {
  /** The words' side padding, and how far above the poster's foot they sit. */
  padX: number;
  foot: number;
  /** The most the words may rise above that, so the face over them stays clear. */
  room: number;
  /** How far above the words the fade under them begins. */
  fade: number;
  title: readonly [number, number];
  titleLead: number;
  /** The author: null on a thumbnail, whose row names him beside it. */
  author: readonly [number, number] | null;
  authorLead: number;
  /** The room between the title's last line and the author. */
  gap: number;
  /**
   * A poster with no picture (no settled icon of the book's saint): its title
   * this much larger, in the middle of the room from `aloneTop` down to the
   * author, with `rule` taken by the short line over the author.
   */
  alone: number;
  aloneTop: number;
  rule: number;
};

export const GEOMETRY: Record<CoverScale, Geometry> = {
  tiny: { padX: 8, foot: 8, room: 86, fade: 30, title: [4.6, 7.2], titleLead: 1.12, author: null, authorLead: 1.22, gap: 0, alone: 1.12, aloneTop: 12, rule: 0 },
  shelf: { padX: 8, foot: 8, room: 80, fade: 30, title: [4.6, 7.25], titleLead: 1.12, author: [8, 2.2], authorLead: 1.22, gap: 3, alone: 1.2, aloneTop: 12, rule: 10 },
  large: { padX: 8, foot: 7, room: 70, fade: 28, title: [6.25, 6.25], titleLead: 1.12, author: [9.5, 1.6], authorLead: 1.25, gap: 3, alone: 1.2, aloneTop: 12, rule: 9 },
};

/** Each size: its scale, and the narrowest plate it is drawn at (WorkCover.tsx WIDTH; a grid cell is a third of a 360px phone, and narrower screens take two). */
export const SIZES: Record<CoverSize, { scale: CoverScale; min: number }> = {
  sm: { scale: "tiny", min: 72 },
  md: { scale: "shelf", min: 120 },
  lg: { scale: "large", min: 160 },
  row: { scale: "shelf", min: 112 },
  grid: { scale: "shelf", min: 100 },
  hero: { scale: "large", min: 188 },
};

const TITLE_STEPS = [1, 0.94, 0.88, 0.82, 0.76, 0.7] as const;
const AUTHOR_STEPS = [1, 0.93, 0.86] as const;
/** The most lines the browser balances (Chromium balances six at most). */
const MAX_LINES = 6;
/** Room kept free on every line, for rounding and the kerning the sum leaves out. */
const SLACK = 0.97;

/** Small words that go down to the next line with the word after them. */
const SMALL = new Set([
  "a", "an", "the", "of", "and", "or", "nor", "on", "in", "to", "for", "with", "from", "at", "by", "as",
  "into", "unto", "upon", "against", "under", "over", "before", "after", "about", "among", "between", "through",
  "without", "within", "our", "his", "her", "its", "their", "my", "thy", "your",
]);
/** "St." and its kin, which never end a line. */
const PREFIX = /^(?:St|Sts|S|Ss)\.$/;
/** Titles of honour that are part of a name ("Holy Theotokos", "Blessed Mary", "Mother Isidora"). */
const HONOUR = new Set(["Holy", "Blessed", "Apostle", "Prophet", "Mother", "Deaconess", "Archangel", "Evangelist"]);

const NBSP = String.fromCharCode(0xa0);
const isSmall = (w: string) => SMALL.has(w.toLowerCase());
const isName = (w: string) => /^\p{Lu}/u.test(w) && !isSmall(w) && !PREFIX.test(w);

/**
 * The pieces a word can be broken into at the end of a line: a word breaks
 * only after a hyphen between two letters ("God-" "bearer"). Walked by hand,
 * not split by a lookbehind, which Safari before 16.4 cannot even parse.
 */
function pieces(word: string): string[] {
  const out: string[] = [];
  const letter = /\p{L}/u;
  const chars = [...word];
  let start = 0;
  for (let i = 1; i < chars.length - 1; i++) {
    if (chars[i] === "-" && letter.test(chars[i - 1]) && letter.test(chars[i + 1])) {
      out.push(chars.slice(start, i + 1).join(""));
      start = i + 1;
    }
  }
  out.push(chars.slice(start).join(""));
  return out;
}

type Unit = { width: number; lead: number; text: string; words: number };

/**
 * The runs of text no line may break inside, in ems: words held together by
 * a no-break space, cut only after a hyphen. `lead` is the space before a run
 * (none after a hyphen).
 */
function unitsOf(words: string[], held: boolean[], face: "serif" | "sans"): Unit[] {
  const space = emWidth(" ", face);
  const units: Unit[] = [];
  let cur: Unit | null = null;
  words.forEach((word, i) => {
    const parts = pieces(word);
    parts.forEach((part, j) => {
      const w = emWidth(part, face);
      if (cur && j === 0 && i > 0 && held[i - 1]) {
        cur.width += space + w;
        cur.text += NBSP + part;
        cur.words += 1;
      } else {
        if (cur) units.push(cur);
        cur = { width: w, lead: j > 0 ? 0 : i > 0 ? space : 0, text: part, words: j === 0 ? 1 : 0 };
      }
    });
  });
  if (cur) units.push(cur);
  return units;
}

/** The lines a measure gives the runs, filled one after the other. */
function fill(units: Unit[], measure: number): Unit[][] {
  const lines: Unit[][] = [];
  let line: Unit[] = [];
  let width = 0;
  for (const u of units) {
    if (line.length && width + u.lead + u.width > measure) {
      lines.push(line);
      line = [];
      width = 0;
    }
    width += (line.length ? u.lead : 0) + u.width;
    line.push(u);
  }
  if (line.length) lines.push(line);
  return lines;
}

/**
 * The lines as `text-wrap: balance` sets them: the narrowest measure that
 * keeps the same number of lines, filled one after the other (as Chromium
 * does it).
 */
function balance(units: Unit[], measure: number): Unit[][] {
  const count = fill(units, measure).length;
  if (count <= 1) return fill(units, measure);
  let lo = Math.max(...units.map((u) => u.width));
  let hi = measure;
  for (let i = 0; i < 24 && hi - lo > 0.001; i++) {
    const mid = (lo + hi) / 2;
    if (fill(units, mid).length <= count) hi = mid;
    else lo = mid;
  }
  return fill(units, hi);
}

/** The width in ems of words i..j, as held together. */
function spanWidth(words: string[], i: number, j: number, face: "serif" | "sans"): number {
  // A hyphen can still break the span, so only its longest unbroken run counts.
  const held = words.map(() => true);
  return Math.max(...unitsOf(words.slice(i, j + 1), held, face).map((u) => u.width));
}

/**
 * Where a line may not end, for a measure in ems: which spaces become
 * no-break spaces. A hold that would make a run wider than the line is not
 * made.
 */
function holds(words: string[], measure: number, face: "serif" | "sans", tail: boolean): boolean[] {
  const n = words.length;
  const held = new Array<boolean>(Math.max(0, n - 1)).fill(false);
  const fits = (i: number, j: number) => spanWidth(words, i, j, face) <= measure;
  /** The last word of the run that starts at i, as held so far. */
  const end = (i: number) => {
    let j = i;
    while (j < n - 1 && held[j]) j++;
    return j;
  };
  // "St." before a name, always.
  for (let i = 0; i < n - 1; i++) if (PREFIX.test(words[i])) held[i] = true;
  // A short last word with the word before it ("Anchored One", "Fig Tree"),
  // when that is asked for and fits.
  if (tail && n >= 3 && shortWord(words[n - 1]) && fits(n - 2, n - 1)) held[n - 2] = true;
  // A title of honour with the name after it, from the name back.
  for (let i = n - 2; i >= 0; i--) {
    if (HONOUR.has(words[i]) && isName(words[i + 1]) && fits(i, end(i + 1))) held[i] = true;
  }
  // A run of small words with the word after them, as many of them as fit;
  // what cannot go down stays up with the word before it, where that fits,
  // so no small word stands on a line alone.
  for (let i = 0; i < n - 1; ) {
    if (!isSmall(words[i]) || /[,;:]$/.test(words[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n - 1 && isSmall(words[j + 1]) && !/[,;:]$/.test(words[j + 1])) j++;
    const last = end(j + 1);
    let down = j + 1;
    for (let k = i; k <= j; k++) {
      if (fits(k, last)) {
        for (let m = k; m <= j; m++) held[m] = true;
        down = k;
        break;
      }
    }
    if (down > i && i > 0) {
      let start = i - 1;
      while (start > 0 && held[start - 1]) start--;
      if (fits(start, down - 1)) for (let m = i - 1; m < down - 1; m++) held[m] = true;
    }
    i = j + 1;
  }
  return held;
}

type Laid = { text: string; lines: string[]; overflow: boolean; flaws: number };

/** A last word this short is an orphan alone on its line. */
const shortWord = (w: string) => w.replace(/[^\p{L}]/gu, "").length <= 4;

/**
 * A text set at a measure in ems: its held spaces, its balanced lines, and
 * how good they are. A short last word is tried both on its own and held to
 * the word before it, and the better setting is kept.
 */
function lay(text: string, measure: number, face: "serif" | "sans"): Laid {
  const words = text.trim().split(/\s+/);
  const plain = layWith(words, measure, face, false);
  if (words.length < 3 || !shortWord(words[words.length - 1])) return plain;
  const held = layWith(words, measure, face, true);
  return held.flaws < plain.flaws ? held : plain;
}

function layWith(words: string[], measure: number, face: "serif" | "sans", tail: boolean): Laid {
  const held = holds(words, measure, face, tail);
  const units = unitsOf(words, held, face);
  const lines = balance(units, measure);
  const joined = words.map((w, i) => w + (i < words.length - 1 ? (held[i] ? NBSP : " ") : "")).join("");
  const wordsOf = (l: Unit[]) => l.flatMap((u) => u.text.split(NBSP));
  let flaws = 0;
  if (lines.length > 1) {
    const first = wordsOf(lines[0]);
    const last = wordsOf(lines[lines.length - 1]);
    // A short word alone on the first line. A title may open on its article
    // alone ("The / Anchored One"), as a poster's often does.
    if (first.length === 1 && first[0].length <= 3 && !/^(?:the|a|an)$/i.test(first[0])) flaws += 1.5;
    // A word alone on the last line: a short one ("of / John") is an orphan,
    // a long one ("The Paschal / Homily") is how a short title sets.
    if (last.length === 1 && lines[lines.length - 1].length === 1) flaws += last[0].length <= 4 ? 2.5 : 0.5;
    lines.slice(0, -1).forEach((l, i) => {
      const w = wordsOf(l);
      const tail = w[w.length - 1];
      if (i === 0 && w.every(isSmall)) {
        // A title may open on its small words ("On the / Incarnation").
        flaws += 1;
      } else if (w.every((x) => isSmall(x) && x.length <= 4)) {
        // But a line of short ones alone further down ("Tractates / on / the
        // Gospel") is a hole in it.
        flaws += 12;
      } else if (PREFIX.test(tail)) {
        flaws += 10;
      } else if (isSmall(tail)) {
        // A small word that could not go down with its word.
        flaws += 1.5;
      }
    });
  }
  return {
    text: joined,
    lines: lines.map((l) => l.map((u, i) => (i && u.lead ? " " : "") + u.text).join("")),
    overflow: units.some((u) => u.width > measure),
    flaws,
  };
}

export type CoverWords = {
  /** The title with its no-break spaces. */
  title: string;
  /** The author with his, or null when the cover shows none. */
  author: string | null;
  /** The title's size, as a part of the scale's full size. */
  titleFit: number;
  authorFit: number;
  /** The lines this sets at the narrowest plate, for the tests and the contact sheet. */
  titleLines: string[];
  authorLines: string[];
  /**
   * Null when the words fit. Else (no book in the room: the longest books in
   * print on a 72px thumbnail, whose row prints the title beside it) the
   * title's lines that do fit, and the cover ends it there.
   */
  clamp: number | null;
};

/**
 * The words for one poster: where their lines may break, and how large they
 * are set. A poster that waits for its picture, or lost it, keeps the words
 * of one with a picture, so nothing moves when it comes; `picture: false` is
 * a book that has none, whose title stands larger in the middle.
 */
export function coverWords({ title, author, size, picture = true }: { title: string; author?: string | null; size: CoverSize; picture?: boolean }): CoverWords {
  const { scale, min } = SIZES[size];
  const g = GEOMETRY[scale];
  const unit = min / 100;
  const measurePx = min * ((100 - 2 * g.padX) / 100) * SLACK;
  const shown = g.author && author ? author : null;
  // With a picture the words rise from the foot as far as `room`; without
  // one the title has the plate from `aloneTop` down to the rule.
  const room = (picture ? g.room : 150 - g.aloneTop - g.foot - (shown ? g.rule : 0)) * unit;
  const titleFull = (g.title[0] + g.title[1] * unit) * (picture ? 1 : g.alone);

  const authorTries = shown
    ? AUTHOR_STEPS.map((f, step) => {
        const px = (g.author![0] + g.author![1] * unit) * f;
        const laid = lay(shown, measurePx / px, "sans");
        return { f, laid, cost: step * 0.8 + laid.flaws * 0.6, height: laid.lines.length * g.authorLead * px + g.gap * unit, ok: !laid.overflow && laid.lines.length <= 3 };
      })
    : [{ f: 1, laid: null as Laid | null, cost: 0, height: 0, ok: true }];

  let best: { score: number; t: Laid; tf: number; a: (typeof authorTries)[number] } | null = null;
  for (const a of authorTries.filter((x) => x.ok)) {
    for (const [step, tf] of TITLE_STEPS.entries()) {
      const px = titleFull * tf;
      const t = lay(title, measurePx / px, "serif");
      if (t.overflow || t.lines.length > MAX_LINES) continue;
      if (t.lines.length * g.titleLead * px + a.height > room) continue;
      // Each step smaller costs about as much as an orphan; the flaws in the
      // lines cost what lay() says; the author's, a little less.
      const score = step * 1.5 + t.flaws + a.cost;
      if (!best || score < best.score - 1e-9) best = { score, t, tf, a };
    }
  }
  if (!best) {
    // Nothing fits: the smallest steps, the author on his fewest lines, and
    // the title's lines that the room left holds.
    const tf = TITLE_STEPS[TITLE_STEPS.length - 1];
    const px = titleFull * tf;
    const t = lay(title, measurePx / px, "serif");
    const a = [...authorTries].sort((x, y) => x.height - y.height)[0] ?? null;
    const clamp = Math.max(1, Math.floor((room - (a?.height ?? 0)) / (g.titleLead * px)));
    return {
      title: t.text,
      author: a?.laid ? a.laid.text : null,
      titleFit: tf,
      authorFit: a?.f ?? 1,
      titleLines: t.lines.slice(0, clamp),
      authorLines: a?.laid ? a.laid.lines : [],
      clamp,
    };
  }
  return {
    title: best.t.text,
    author: best.a.laid ? best.a.laid.text : null,
    titleFit: best.tf,
    authorFit: best.a.f,
    titleLines: best.t.lines,
    authorLines: best.a.laid ? best.a.laid.lines : [],
    clamp: null,
  };
}
