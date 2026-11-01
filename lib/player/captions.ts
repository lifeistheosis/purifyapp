import type { CaptionSource } from "@/lib/prayers/persistentAudioStore";

/**
 * Live captions (1.7): timed lines turned into words that light one by one
 * as they are sung or read, the way the owner liked the word-by-word text in
 * the ads ("The text is perfect. The text animation is perfect.", 2026-10-13)
 * and asked for captions "if there's chance ... the moving live captions where
 * there's a nice clean design" (2026-10-15), the Prayer Rope Anthem first.
 *
 * A chant's lines carry a start time each, from its timing file beside the
 * recording (lib/chants/media.ts, captionsFor), and since build 86 note 78
 * ("each word timestamped and followed in the lyrics section") each word its
 * own start and end, measured against the recording (a version 2 timing file,
 * `wordTimes` below). Those are taken as given. A line without them (a timing
 * file of version 1, a chapter read aloud) has its words spread over most of
 * the line by their length, which keeps the light at the pace of the voice.
 *
 * 1.8: the same lines light Now Playing's words and a chant's Sing along
 * (the owner's picks of 2026-10-27, rounds 8 and 9), from one clock
 * (lib/player/clock.ts), so the two can never light different lines.
 */
export type CaptionWord = {
  text: string;
  at: number;
  /** When it has been sung, where the timing file says (note 78): lit until then. */
  end?: number;
};
export type CaptionLine = {
  at: number;
  end: number;
  /** What is sung or read: its words light one by one. */
  text: string;
  words: CaptionWord[];
  /** The English of a line sung in another language, drawn over it. */
  en?: string;
  /** Under the sung words: a transliteration. */
  sub?: string[];
  /** A verse's number. */
  n?: number;
  /** `text` is the sung words' sound in Latin letters (a chant's reader chose it). */
  latin?: boolean;
  /** Each sung word's sound, word for word, drawn under it. */
  pairs?: string[];
};

/** The share of a line's time its words are spread over when the line ends
 *  where the next begins: the rest is the breath before the next line. */
const SUNG = 0.86;
/** The same, for a line whose own end is known (a read-aloud verse ends at
 *  the voice's last word, the pause after it already left out): nearly all
 *  of it, or the light runs ahead of the voice. Build 81, the owner: at
 *  each new verse "the words have to pretty much catch up". */
const SPOKEN = 0.97;
/** A line with no next line to end it ends this long after it starts. */
const LAST_LINE = 5;

/** Words weigh their letters, and a little more, so a short word still
 *  takes a moment. */
function weight(word: string): number {
  return word.replace(/[^\p{L}\p{N}]/gu, "").length + 1.6;
}

/** A line's words, in order, for drawing them one span each. */
export function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function captionLines(source: CaptionSource, duration = 0): CaptionLine[] {
  const timed = source.filter((l): l is CaptionSource[number] & { time: number } => typeof l.time === "number");
  return timed.map((line, i) => {
    const next = timed[i + 1]?.time;
    // A timing file's own end wins, so a held note's last word is lit while
    // it is held; otherwise the next line's start, or a little past the last.
    const known = typeof line.end === "number" && line.end > line.time ? line.end : undefined;
    const end =
      known ??
      next ??
      (duration > line.time ? Math.min(duration, line.time + LAST_LINE) : line.time + LAST_LINE);
    const parts = wordsOf(line.text);
    // Each word's own time, where the line has one for every word shown
    // (note 78): the n-th time is the n-th word's, in whichever of the views
    // (the words as sung, their sound, or both) the words are drawn.
    const given = line.wordTimes?.length === parts.length ? line.wordTimes : null;
    const weights = parts.map(weight);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const span = (end - line.time) * (known !== undefined ? SPOKEN : SUNG);
    let acc = 0;
    const words: CaptionWord[] = parts.map((text, j) => {
      if (given) return { text, at: given[j][0], end: given[j][1] };
      const at = line.time + (span * acc) / total;
      acc += weights[j];
      return { text, at };
    });
    return {
      at: line.time,
      end,
      text: line.text,
      words,
      ...(line.en ? { en: line.en } : {}),
      ...(line.sub?.length ? { sub: line.sub } : {}),
      ...(typeof line.n === "number" ? { n: line.n } : {}),
      ...(line.latin ? { latin: true } : {}),
      ...(line.pairs?.length === parts.length ? { pairs: line.pairs } : {}),
    };
  });
}

/** After a chant's last line: once its singing has been over this long,
 *  nothing is lit. A version whose words stop before its recording does (the
 *  Arabic Psalm 135 has words for its first verse only) is then not shown
 *  singing its last line through every verse after it, and its words stand
 *  at rest, as they do with nothing playing. A chapter read aloud keeps its
 *  last verse to the end. */
const WORDS_DONE = 6;

/** The line being sung at `t`, or -1 before the first (and once a chant's
 *  last line is long over, WORDS_DONE). A line is taken a
 *  breath early, so the eye is there when the voice is. And where the line
 *  before it ended in a pause (a read-aloud verse: the voice stops, then the
 *  next verse begins about half a second later), it is taken as soon as that
 *  line is done, so the move to it (LiveCaptions, about half a second) is
 *  over before the voice begins. Through build 81 it was taken 0.15 s before
 *  the voice, so the line was still growing into place while its first
 *  words were read, and the light seemed to catch up with them. A sung line
 *  that ends where the next begins is taken a breath early, as before. */
export function lineAt(lines: CaptionLine[], t: number, lead = 0.15): number {
  let at = -1;
  for (let i = 0; i < lines.length; i++) {
    const before = i > 0 ? lines[i - 1] : null;
    const done = before && before.end < lines[i].at ? before.end : Infinity;
    if (Math.min(lines[i].at - lead, done) <= t) at = i;
  }
  const last = lines[at];
  if (last && at === lines.length - 1 && typeof last.n !== "number" && t > last.end + WORDS_DONE) return -1;
  return at;
}

/** The word being sung at `t` in a line: the last one started, or -1 before the first. */
export function wordAt(words: CaptionWord[], t: number): number {
  let at = -1;
  for (let j = 0; j < words.length; j++) if (words[j].at <= t) at = j;
  return at;
}

/**
 * Where the words' box scrolls to keep the word being sung in sight (build
 * 86 note 78: "each word timestamped and followed in the lyrics section"):
 * null while the word is in sight (inside the box and clear of its fades,
 * `clear` of the height at the top and at the foot), else the scroll that
 * stands the word where the line being sung stands (`anchor`), within what
 * the box can scroll. A line longer than the box (a hymn of the Canon runs to
 * a dozen rows) is followed row by row this way, not only from its start.
 * Positions are in the box's own scroll space: from the top of its content.
 */
export function followWord(
  word: { top: number; bottom: number },
  box: { scrollTop: number; height: number; max: number },
  anchor = 0.3,
  clear = { top: 0.12, foot: 0.22 },
): number | null {
  const lo = box.scrollTop + box.height * clear.top;
  const hi = box.scrollTop + box.height * (1 - clear.foot);
  if (word.top >= lo && word.bottom <= hi) return null;
  return Math.max(0, Math.min(box.max, Math.round(word.top - box.height * anchor)));
}

/**
 * How one line is drawn (1.8): the line to read, large, and what goes under
 * it. A line sung in another language with its English (a chant's Sing
 * along, round 9 A: "the original under each English line") reads the
 * English and carries the sung words under it; any other line is its own
 * words, with its transliteration under them. Nothing is added: every part
 * is a field of the line as the data gives it.
 *
 * The sung part carries how its reader chose to see it (notes 56 and 59):
 * `latin`, its sound in Latin letters in place of the words, or `pairs`,
 * each word's sound to draw under that word.
 *
 * A chant's own page (1.8, sheet r3-18, the owner's pick of 2026-10-31,
 * B's page) puts the sung words first (`english: "under"`): the words as
 * they are sung lead, and the English is a `gloss` under them, which the page
 * shows under the line being sung only (app/globals.css, "Sung words"). Now
 * Playing keeps round 8's order, the English over the sung words.
 */
export type LinePart = { text: string; sung: boolean; latin?: true; pairs?: string[] };
export type LineParts = { main: LinePart; under: LinePart[]; gloss?: string };

export function lineParts(
  line: { text: string; en?: string; sub?: string[]; latin?: boolean; pairs?: string[] },
  english: "over" | "under" = "over",
): LineParts {
  const subs = (line.sub ?? []).map((text) => ({ text, sung: false }));
  const sung: LinePart = {
    text: line.text,
    sung: true,
    ...(line.latin ? { latin: true as const } : {}),
    ...(line.pairs?.length ? { pairs: line.pairs } : {}),
  };
  if (line.en && english === "under") return { main: sung, under: subs, gloss: line.en };
  if (line.en) return { main: { text: line.en, sung: false }, under: [sung, ...subs] };
  return { main: sung, under: subs };
}

/**
 * "Verse 4 of 51" over the words: the verse being read and the chapter's
 * last, or null where the lines are not numbered verses (a chant) or none is
 * being read yet.
 */
export function verseOf(lines: { n?: number }[], current: number): { verse: number; total: number } | null {
  const line = lines[current];
  const last = lines.at(-1);
  if (!line || typeof line.n !== "number" || !last || typeof last.n !== "number") return null;
  return { verse: line.n, total: last.n };
}
