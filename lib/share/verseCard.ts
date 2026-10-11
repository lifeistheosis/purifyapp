// A verse as a picture: where each word goes.
//
// This file is the arithmetic and nothing else, so it can be tested without
// a canvas: how the verse is broken into lines, and how large it can be set
// and still fit its box. The drawing is ./drawVerseCard.ts.
//
// The picture is 1080 by 1350, four to five: the tallest shape a feed shows
// whole, and one that sits well in a story with room above and below.

export const CARD = {
  width: 1080,
  height: 1350,
  /** Left and right. */
  margin: 112,
  /** From the top edge to the top of the mark. */
  top: 128,
  /** From the bottom edge to the baseline of the last line. */
  bottom: 118,
} as const;

/** The verse's own box: between the mark above and the reference below. */
export const VERSE_BOX = {
  width: CARD.width - CARD.margin * 2,
  height: 712,
} as const;

/**
 * Sizes the verse is tried at, largest first. A short verse is set large; a
 * long one comes down until it fits. Below the last size a verse is too long
 * for one picture, and `fitVerse` says so.
 */
export const SIZES = [92, 84, 76, 68, 62, 56, 50, 46, 42, 38, 34] as const;

/** Line height as a share of the size: looser as the letters get smaller. */
export function lineHeightFor(size: number): number {
  return Math.round(size * (size >= 68 ? 1.24 : size >= 50 ? 1.3 : 1.36));
}

/** How wide a run of text is at a size. A canvas answers this in the app. */
export type Measure = (text: string, size: number) => number;

/**
 * Break text into lines no wider than `maxWidth`. Words are never split, and
 * a word wider than the line gets a line of its own rather than vanishing.
 */
export function wrap(text: string, size: number, maxWidth: number, measure: Measure): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const tried = line ? `${line} ${word}` : word;
    if (!line || measure(tried, size) <= maxWidth) {
      line = tried;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return balance(lines, size, maxWidth, measure);
}

/**
 * Keep the last line from being one short word under a full block. Words are
 * moved down from the line above while that leaves the two closer in width
 * and nothing overflows.
 */
function balance(lines: string[], size: number, maxWidth: number, measure: Measure): string[] {
  if (lines.length < 2) return lines;
  const out = [...lines];
  for (let guard = 0; guard < 6; guard++) {
    const above = out[out.length - 2].split(" ");
    const last = out[out.length - 1];
    if (above.length < 3) break;
    const moved = above[above.length - 1];
    const newAbove = above.slice(0, -1).join(" ");
    const newLast = `${moved} ${last}`;
    const before = Math.abs(measure(out[out.length - 2], size) - measure(last, size));
    const after = Math.abs(measure(newAbove, size) - measure(newLast, size));
    if (measure(newLast, size) > maxWidth || after >= before) break;
    out[out.length - 2] = newAbove;
    out[out.length - 1] = newLast;
  }
  return out;
}

export type VerseFit = {
  size: number;
  lineHeight: number;
  lines: string[];
  /** The block's height: what the lines take, first cap to last baseline. */
  height: number;
};

/**
 * The largest size at which the whole verse fits its box, or null when it is
 * too long for one picture even at the smallest. Nothing is ever cut short:
 * Scripture is shown whole or not as a picture at all.
 */
export function fitVerse(
  text: string,
  measure: Measure,
  box: { width: number; height: number } = VERSE_BOX,
  sizes: readonly number[] = SIZES,
): VerseFit | null {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  for (const size of sizes) {
    const lines = wrap(clean, size, box.width, measure);
    const lineHeight = lineHeightFor(size);
    const height = lines.length * lineHeight;
    const fits = height <= box.height && lines.every((l) => measure(l, size) <= box.width);
    if (fits) return { size, lineHeight, lines, height };
  }
  return null;
}

/** A file name for the picture: "purify-john-3-16.png". */
export function cardFileName(reference: string): string {
  const slug = reference
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `purify-${slug || "verse"}.png`;
}
