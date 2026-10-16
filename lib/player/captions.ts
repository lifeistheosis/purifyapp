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
 */
export type CaptionWord = { text: string; at: number };
export type CaptionLine = { at: number; end: number; text: string; words: CaptionWord[]; sub?: string[] };

/** The share of a line's time its words are spread over: the rest is the
 *  breath before the next line. */
const SUNG = 0.86;
/** A line with no next line to end it ends this long after it starts. */
const LAST_LINE = 5;

/** Words weigh their letters, and a little more, so a short word still
 *  takes a moment. */
function weight(word: string): number {
  return word.replace(/[^\p{L}\p{N}]/gu, "").length + 1.6;
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
    const parts = line.text.split(/\s+/).filter(Boolean);
    const weights = parts.map(weight);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const span = (end - line.time) * SUNG;
    let acc = 0;
    const words = parts.map((text, j) => {
      const at = line.time + (span * acc) / total;
      acc += weights[j];
      return { text, at };
    });
    return { at: line.time, end, text: line.text, words, ...(line.sub?.length ? { sub: line.sub } : {}) };
  });
}

/** The line being sung at `t`, or -1 before the first. A line is taken a
 *  breath early, so the eye is there when the voice is. */
export function lineAt(lines: CaptionLine[], t: number, lead = 0.15): number {
  let at = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].at <= t + lead) at = i;
  return at;
}
