// Words as a picture: where everything goes.
//
// This file is the arithmetic and nothing else, so it can be tested without
// a canvas: the picture's sizes and looks, how the words are broken into
// lines, how large they can be set and still fit, and where each part stands.
// The drawing is ./drawVerseCard.ts, and the sheet a reader chooses the look,
// the words and the size in is components/share/PictureSheet.tsx.
//
// 1.8, the owner's "mix of A and B" (Homebase/boards/purify-master/variants/
// 16b-verse-picture-AB.html, r18/choose/11b): the looks (Light, Horizon,
// Christ, Trinity, Plain and the reader's own photo), the words (the reading
// serif, a sans or bold capitals, their size, the reference and the cross on
// or off, left or centre) and the size (Story 9:16, Square, Post 4:5). The
// foot of every picture reads "Purify App", his word, in place of
// purifyapp.net. An icon is never written over: with the Christ or the
// Trinity look the icon stands whole in the upper part, fading into the
// ground, and the words sit under it, with no cross mark then.
//
// It takes any words with a "by" line under them, not only a verse: a
// saint's words and his name are set the same way (The Church today's saint
// window). Nothing is ever cut: words too long to set whole in a look and a
// size are not offered as a picture in it (planPicture answers null).

/** Every picture is this wide, in pixels: what the feeds and stories show at full size. */
export const PICTURE_WIDTH = 1080;

/**
 * The design was drawn 330 pixels wide (the mockup's `k`), so each size
 * below is the design's, times this.
 */
const K = PICTURE_WIDTH / 330;
const k = (n: number) => Math.round(n * K);

/** The three sizes: a story (9:16), a square, and a post (4:5), the tallest a feed shows whole. */
export const SHAPES = {
  story: { width: PICTURE_WIDTH, height: 1920 },
  square: { width: PICTURE_WIDTH, height: 1080 },
  post: { width: PICTURE_WIDTH, height: 1350 },
} as const;
export type Shape = keyof typeof SHAPES;
export const SHAPE_ORDER: readonly Shape[] = ["story", "square", "post"];
/** Each size's proportions, as the sheet names them. */
export const SHAPE_RATIOS: Record<Shape, string> = { story: "9:16", square: "1:1", post: "4:5" };

type LookBase = {
  id: string;
  /** Its name under its tile in the sheet. A look with none shows its tile alone. */
  nameKey?: string;
};
/**
 * A look: a ground drawn here (the light, the horizon, the plain black), an
 * icon that stands whole above the words, or a picture the words are set
 * over, shaded so they read (the reader's own photo; the owner's own
 * pictures, when he makes them).
 */
export type Look =
  | (LookBase & { kind: "light" | "horizon" | "plain" })
  | (LookBase & {
      kind: "icon" | "picture";
      /** A file in the bundle, so the picture is made on the phone with no network. */
      src: string;
      /** The point of the picture kept in view when it is cropped to fill: 0 to 1 across, 0 to 1 down. */
      focus: readonly [number, number];
    });

/**
 * The looks, in the order the sheet shows them. One line each, so a new
 * picture is one line here (and its name in the catalogs, if it has one):
 * `{ id: "candles", kind: "picture", src: "/share/candles.webp", focus: [0.5, 0.5], nameKey: "picture.look.candles" }`.
 * An icon is `kind: "icon"`, and is never written over.
 */
export const LOOKS: readonly Look[] = [
  { id: "light", kind: "light", nameKey: "picture.look.light" },
  { id: "horizon", kind: "horizon", nameKey: "picture.look.horizon" },
  { id: "christ", kind: "icon", src: "/sections/prayers.v4.jpg", focus: [0.5, 0.3], nameKey: "picture.look.christ" },
  { id: "trinity", kind: "icon", src: "/discover/tiles/theology.v2.webp", focus: [0.5, 0.4], nameKey: "picture.look.trinity" },
  { id: "plain", kind: "plain", nameKey: "picture.look.plain" },
];

/** The reader's own photo: chosen on the phone and drawn there, never sent anywhere. Its picture is handed to the drawing. */
export const YOURS: Look = { id: "yours", kind: "picture", src: "", focus: [0.5, 0.5], nameKey: "picture.look.yours" };

/**
 * A Father's portrait as a look (1.8, round 3 r3-04, the Fathers' deck on a
 * doctrine's page): his cover portrait (lib/today/saintFaces.ts, every one
 * opened and its rights recorded), standing whole above his words as an icon
 * does, so the picture shared is the card the reader was looking at. Its
 * picture and where his face sits (0 to 1 down) are carried in its id, so
 * lookOf knows it with no list of its own.
 */
export function portraitLook(src: string, focusY: number): Look {
  const y = Math.max(0, Math.min(1, focusY));
  return { id: `portrait:${y}:${src}`, kind: "icon", src, focus: [0.5, y] };
}

/** The look with this id; the first for one that is not known. */
export function lookOf(id: string): Look {
  if (id === YOURS.id) return YOURS;
  const listed = LOOKS.find((look) => look.id === id);
  if (listed) return listed;
  const portrait = /^portrait:(0(?:\.\d+)?|1):(.+)$/.exec(id);
  if (portrait) return portraitLook(portrait[2], Number(portrait[1]));
  return LOOKS[0];
}

/** The grounds and the ink: black with no tint, the light's a breath warmer, the words off-white. */
export const GROUND = "#0a0a0a";
export const LIGHT_GROUND = "#0d0d0f";
export const INK = "#f4f4f2";

/** The three faces: the reading serif, the sans, and the sans in bold capitals. */
export const FONTS = {
  serif: { face: "serif", weight: 500, size: k(21), capitals: false },
  sans: { face: "sans", weight: 500, size: k(21), capitals: false },
  caps: { face: "sans", weight: 800, size: k(19), capitals: true },
} as const;
export type Font = keyof typeof FONTS;
export const FONT_ORDER: readonly Font[] = ["serif", "sans", "caps"];

/** The words' size, as the slider's five steps: a share of the design's own. The middle is the design. */
export const TEXT_SCALES = [0.72, 0.86, 1, 1.16, 1.32] as const;
/** Never smaller than this, so the words still read on a phone. */
export const MIN_SIZE = 28;
/** Lines as the design sets them. */
export const LINE_HEIGHT = 1.42;

export type Align = "center" | "left";

/** Everything the reader chooses in the sheet. */
export type PictureStyle = {
  /** A look's id (LOOKS, or YOURS). */
  look: string;
  font: Font;
  /** A step of TEXT_SCALES. */
  size: number;
  /** The reference (or the "by" line) under the words. */
  reference: boolean;
  /** The cross over the words. Never over an icon. */
  cross: boolean;
  align: Align;
  shape: Shape;
};

/** As the sheet opens, and what a picture made without the sheet is. */
export const DEFAULT_STYLE: PictureStyle = { look: "light", font: "serif", size: 2, reference: true, cross: true, align: "center", shape: "story" };

/** The words, and who said them or where they are from. */
export type PictureWords = {
  /** The words, whole, as the reader sees them: a verse, or a saint's words. */
  text: string;
  /** The line under them: a verse's reference ("Luke 11:13"), or who said them. */
  reference: string;
  /**
   * A line under that: the Bible the words are from, the work, or a machine
   * translation's label (lib/today/machineVerse.ts). It goes with the
   * reference, unless `keepNote`.
   */
  note?: string;
  /** The note stays with the reference off, and without it there is no picture: a translation never leaves without its label. */
  keepNote?: boolean;
  /** The language of the words, so they are put in capitals by its own rules (Turkish i to İ). */
  lang?: string;
};

/** The parts, at the picture's width (the design's sizes times K). */
export const MARGIN = 0.09;
export const MARK = { height: k(30), gap: k(22) };
export const RULE = { gap: k(20), width: k(34), height: Math.max(1, k(1.5)), after: k(14) };
export const REFERENCE = { size: k(11), tracking: 0.16, min: 24, lineHeight: 1.4, maxLines: 2 };
/**
 * The note under the reference: set in the sans, smaller than the reference,
 * on at most two lines.
 */
export const NOTE = { gapAbove: 46, size: 25, lineHeight: 34, maxLines: 2 } as const;
/** The foot. His word, 2026-10-28: "put Purify App instead of Purifyapp.net as the watermark tag". */
export const FOOT = { text: "Purify App", size: k(10.5), tracking: 0.04, bottom: k(18) } as const;

/**
 * Where the words may stand, as shares of the height: clear of a story's own
 * bars at its top and of the name at the foot. The horizon's edge rises to
 * 0.84 of the height, and nothing is written on it.
 */
const AREA: Record<Shape, readonly [number, number]> = { story: [0.12, 0.86], square: [0.08, 0.87], post: [0.08, 0.87] };
const HORIZON_TOP = 0.8;

/**
 * An icon's place, by size, as shares of the height. It fills the top of the
 * picture (60% of a story or a post) and fades into the ground over its
 * lower half; the words start no higher than where the fade is two thirds
 * dark, so they sit under the icon and never over it. A square is short, so
 * its icon is a little shorter, to leave the words their room.
 */
export const ICON: Record<Shape, { height: number; fadeFrom: number; wordsFrom: number }> = {
  story: { height: 0.6, fadeFrom: 0.3, wordsFrom: 0.5 },
  square: { height: 0.56, fadeFrom: 0.26, wordsFrom: 0.46 },
  post: { height: 0.6, fadeFrom: 0.3, wordsFrom: 0.5 },
};
/** Under an icon the words end this share of the height above the bottom, as the design sets them. */
export const ICON_PAD_BOTTOM = 0.11;
/** The room the name at the foot keeps under the words on any picture: its place, its letters and a gap. */
export const FOOT_CLEAR = FOOT.bottom + FOOT.size + k(18);

/** How wide a run of text is at a size. A canvas answers this in the app. */
export type Measure = (text: string, size: number) => number;
/** One for the words in the chosen face, one for the reference (the sans, bold), one for the note (the sans). */
export type Measures = { words: Measure; reference: Measure; note: Measure };

/** Line height at a size. */
export function lineHeightFor(size: number): number {
  return Math.round(size * LINE_HEIGHT);
}

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

export type WordsFit = {
  size: number;
  lineHeight: number;
  lines: string[];
  /** The block's height: its lines, each a line high. */
  height: number;
};

/** The sizes tried, largest first: from `cap` down to MIN_SIZE, a little smaller each time. */
export function sizesFrom(cap: number): number[] {
  const out: number[] = [];
  for (let size = cap; size > MIN_SIZE; size *= 0.94) out.push(Math.round(size));
  out.push(MIN_SIZE);
  return [...new Set(out)];
}

/**
 * The largest size at which the whole text fits its box, or null when it is
 * too long for the box even at the smallest. Nothing is ever cut short:
 * Scripture is shown whole or not as a picture at all.
 */
export function fitWords(text: string, measure: Measure, box: { width: number; height: number }, sizes: readonly number[]): WordsFit | null {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  for (const size of sizes) {
    const lines = wrap(clean, size, box.width, measure);
    const lineHeight = lineHeightFor(size);
    const height = lines.length * lineHeight;
    if (height <= box.height && lines.every((l) => measure(l, size) <= box.width)) return { size, lineHeight, lines, height };
  }
  return null;
}

/**
 * The note's lines, or null when it does not fit on NOTE.maxLines. A
 * machine translation's label that does not fit means no picture, since a
 * translated verse never leaves without it.
 */
export function fitNote(note: string, measure: Measure, width: number = PICTURE_WIDTH * (1 - 2 * MARGIN)): string[] | null {
  const lines = wrap(note, NOTE.size, width, measure);
  if (lines.length === 0 || lines.length > NOTE.maxLines) return null;
  return lines.every((l) => measure(l, NOTE.size) <= width) ? lines : null;
}

/** Capitals by the words' own language's rules, or the plain ones. */
export function capitals(text: string, lang?: string): string {
  if (lang) {
    try {
      return text.toLocaleUpperCase(lang);
    } catch {
      // A language the engine does not know: plain capitals.
    }
  }
  return text.toUpperCase();
}

/** A run set with its letters spaced out by `tracking` of the size, as the reference and the foot are. */
export function spacedWidth(measure: Measure, text: string, size: number, tracking: number): number {
  return measure(text, size) + tracking * size * Math.max(0, [...text].length - 1);
}

/**
 * The reference in spaced capitals: its own size where it fits the width,
 * smaller where it does not, and over two lines, broken between words, if
 * it is still too wide at the smallest. Null if not even then.
 */
function fitReference(text: string, measure: Measure, width: number): { size: number; lines: string[] } | null {
  const spaced: Measure = (s, size) => spacedWidth(measure, s, size, REFERENCE.tracking);
  for (let size = REFERENCE.size; size >= REFERENCE.min; size -= 2) {
    if (spaced(text, size) <= width) return { size, lines: [text] };
  }
  const lines = wrap(text, REFERENCE.min, width, spaced);
  if (lines.length > REFERENCE.maxLines || lines.some((l) => spaced(l, REFERENCE.min) > width)) return null;
  return { size: REFERENCE.min, lines };
}

/** Where everything goes in one picture: what drawVerseCard.ts paints. */
export type PicturePlan = {
  width: number;
  height: number;
  look: Look;
  align: Align;
  /** Where the lines are set from: their left edge, or their centre. */
  x: number;
  /** The icon's place (an icon look only): from the top down to `bottom`, fading from `fadeFrom`. */
  icon: { bottom: number; fadeFrom: number } | null;
  /** The cross over the words, its top and height. Never with an icon. */
  mark: { top: number; height: number } | null;
  words: { font: Font; size: number; lineHeight: number; lines: string[]; top: number };
  rule: { top: number; width: number; height: number } | null;
  reference: { size: number; tracking: number; lines: string[]; baseline: number; lineHeight: number } | null;
  note: { size: number; lines: string[]; baseline: number; lineHeight: number } | null;
  foot: { text: string; size: number; tracking: number; baseline: number };
};

/**
 * Plan a picture of the words in a style, or null when they do not fit it
 * whole. The words, their reference and its note are one group: centred a
 * little above the middle on a ground, and standing at the foot of an icon,
 * under it.
 */
export function planPicture(input: PictureWords, style: PictureStyle, measures: Measures): PicturePlan | null {
  const shape: Shape = SHAPES[style.shape] ? style.shape : "story";
  const { width, height } = SHAPES[shape];
  const look = lookOf(style.look);
  const icon = look.kind === "icon";
  const font: Font = FONTS[style.font] ? style.font : "serif";
  const margin = Math.round(width * MARGIN);
  const room = width - 2 * margin;
  const x = style.align === "left" ? margin : width / 2;

  const text = input.text.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const set = FONTS[font].capitals ? capitals(text, input.lang) : text;

  // The reference, in spaced capitals.
  const by = input.reference.replace(/\s+/g, " ").trim();
  const reference = style.reference && by ? fitReference(capitals(by, input.lang), measures.reference, room) : null;
  if (style.reference && by && !reference) return null;

  // The note: with the reference, or always when it must stay.
  let noteLines: string[] = [];
  if (input.note && (reference || input.keepNote)) {
    const fitted = fitNote(input.note, measures.note, room);
    if (!fitted && input.keepNote) return null;
    noteLines = fitted ?? [];
  }

  const mark = style.cross && !icon;
  const markBlock = mark ? MARK.height + MARK.gap : 0;
  const referenceLineHeight = reference ? Math.round(reference.size * REFERENCE.lineHeight) : 0;
  const referenceBlock = reference
    ? RULE.gap + RULE.height + RULE.after + Math.round(reference.size * 0.74) + (reference.lines.length - 1) * referenceLineHeight
    : 0;
  const noteBlock = noteLines.length
    ? (reference ? NOTE.gapAbove : RULE.gap + Math.round(NOTE.size * 0.74)) + (noteLines.length - 1) * NOTE.lineHeight
    : 0;

  // The room the group may take, always clear of the name at the foot.
  const iconPlace = ICON[shape];
  const [areaTop, areaEnd] = icon
    ? [Math.round(height * iconPlace.wordsFrom), Math.round(height * (1 - ICON_PAD_BOTTOM))]
    : [Math.round(height * AREA[shape][0]), Math.round(height * (look.kind === "horizon" ? Math.min(HORIZON_TOP, AREA[shape][1]) : AREA[shape][1]))];
  const areaBottom = Math.min(areaEnd, height - FOOT_CLEAR);
  const box = { width: room, height: areaBottom - areaTop - markBlock - referenceBlock - noteBlock };
  if (box.height <= 0) return null;

  const scale = TEXT_SCALES[Math.max(0, Math.min(TEXT_SCALES.length - 1, Math.round(style.size)))] ?? 1;
  const fit = fitWords(set, measures.words, box, sizesFrom(FONTS[font].size * scale));
  if (!fit) return null;

  const group = markBlock + fit.height + referenceBlock + noteBlock;
  const top = icon
    ? areaBottom - group
    : Math.round(Math.min(Math.max((height - group) / 2 - height * 0.02, areaTop), areaBottom - group));

  const wordsTop = top + markBlock;
  const wordsBottom = wordsTop + fit.height;
  const ruleTop = wordsBottom + RULE.gap;
  const referenceBaseline = ruleTop + RULE.height + RULE.after + Math.round((reference?.size ?? 0) * 0.74);
  const lastReferenceBaseline = referenceBaseline + ((reference?.lines.length ?? 1) - 1) * referenceLineHeight;
  const noteBaseline = reference ? lastReferenceBaseline + NOTE.gapAbove : wordsBottom + RULE.gap + Math.round(NOTE.size * 0.74);

  return {
    width,
    height,
    look,
    align: style.align,
    x,
    icon: icon ? { bottom: Math.round(height * iconPlace.height), fadeFrom: Math.round(height * iconPlace.fadeFrom) } : null,
    mark: mark ? { top, height: MARK.height } : null,
    words: { font, size: fit.size, lineHeight: fit.lineHeight, lines: fit.lines, top: wordsTop },
    rule: reference ? { top: ruleTop, width: RULE.width, height: RULE.height } : null,
    reference: reference
      ? { size: reference.size, tracking: REFERENCE.tracking, lines: reference.lines, baseline: referenceBaseline, lineHeight: referenceLineHeight }
      : null,
    note: noteLines.length ? { size: NOTE.size, lines: noteLines, baseline: noteBaseline, lineHeight: NOTE.lineHeight } : null,
    foot: { text: FOOT.text, size: FOOT.size, tracking: FOOT.tracking, baseline: height - FOOT.bottom - Math.round(FOOT.size * 0.3) },
  };
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
