import type { CaptionSource } from "@/lib/prayers/persistentAudioStore";

/**
 * Live captions (1.7): timed lines turned into words that light one by one
 * as they are sung or read, the way the owner liked the word-by-word text in
 * the ads ("The text is perfect. The text animation is perfect.", 2026-10-13)
 * and asked for captions "if there's chance ... the moving live captions where
 * there's a nice clean design" (2026-10-15), the Prayer Rope Anthem first.
 *
 * A chant's lines carry a start time each, from its timing file beside the
 * recording (lib/chants/media.ts, captionsFor). Its words do not, yet: until they are
 * measured, each line's words are spread over most of the line by their
 * length, which keeps the light at the pace of the singing. A read-aloud
 * voice will hand over each word's own time, and this takes those as given.
 *
 * 1.8: the same lines light Now Playing's words and a chant's Sing along
 * (the owner's picks of 2026-10-27, rounds 8 and 9), from one clock
 * (lib/player/clock.ts), so the two can never light different lines.
 */
export type CaptionWord = { text: string; at: number };
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
    const weights = parts.map(weight);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const span = (end - line.time) * (known !== undefined ? SPOKEN : SUNG);
    let acc = 0;
    const words = parts.map((text, j) => {
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
    };
  });
}

/** The line being sung at `t`, or -1 before the first. A line is taken a
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
  return at;
}

/**
 * How one line is drawn (1.8): the line to read, large, and what goes under
 * it. A line sung in another language with its English (a chant's Sing
 * along, round 9 A: "the original under each English line") reads the
 * English and carries the sung words under it; any other line is its own
 * words, with its transliteration under them. Nothing is added: every part
 * is a field of the line as the data gives it.
 */
export type LinePart = { text: string; sung: boolean };
export type LineParts = { main: LinePart; under: LinePart[] };

export function lineParts(line: { text: string; en?: string; sub?: string[] }): LineParts {
  const subs = (line.sub ?? []).map((text) => ({ text, sung: false }));
  if (line.en) return { main: { text: line.en, sung: false }, under: [{ text: line.text, sung: true }, ...subs] };
  return { main: { text: line.text, sung: true }, under: subs };
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
