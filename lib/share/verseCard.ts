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
  /** A look's id (LOOKS, or YOURS); for a quote's picture, a QUOTE_LOOKS id. */
  look: string;
  /** A quote's layout (Portrait, Page, Seal). A verse's picture has none. */
  layout?: QuoteLayout;
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

// ---------------------------------------------------------------------------
// A saint's words, a council's, or a saying of the Desert Fathers, as a
// picture (1.8, round 3: Homebase/boards/purify-master/variants/
// r3-11-quote-cards.html and r3-11b-quote-looks.html). The owner picked all
// three layouts on 2026-10-30: "they all look really good. Let's do all of
// them. A, B, and C. Incorporate all those designs. Those are fire."
//
//   portrait  his cover portrait on the side he looks from, so he looks into
//             his words, fading into the ground before a word begins; the
//             words beside him in Lora capitals with one word lit; his name,
//             what he was and the work under them; a hairline frame signed
//             Purify App in a gap at its foot.
//   page      the picture whole as a plate in a book, never cut and never
//             written over; the words under it as a page, a large first
//             letter opening them; his name and the work under a short rule.
//             Nothing lit: a page is quiet.
//   seal      the words large and alone, their quotation mark hung in the
//             margin, one word lit; he is a seal under them, his face struck
//             in its middle, his name round its edge from a cross at the top.
//
// Then his looks (r3-11b, the same hour: "be broad all around ... dark,
// light, pink ... flowers, freaking fire ... the space one"), each one row of
// data below, read by all three layouts: the ground, the ink, the lit word's
// colour and halo, how a portrait is toned, the seal's kind and the flowers.
// The share pictures take colour; the app's own screens stay black, white and
// grey, and gold is only ever a flame's own colour. Sea and Stone were drawn
// on the sheet and left out (a third dark blue-black, and words cut in stone
// read worst on a phone); each would be one more row here.
//
// As above, this half is the arithmetic and the data, testable without a
// canvas; ./drawVerseCard.ts paints a plan, with no canvas filter anywhere
// (a filter is not in every phone's web view): silver is a saturation blend,
// a look's cast a colour blend, every fade a mask.

/** The three layouts, in the order the sheet's Layout row shows them. */
export type QuoteLayout = "portrait" | "page" | "seal";
export const LAYOUT_ORDER: readonly QuoteLayout[] = ["portrait", "page", "seal"];
export const LAYOUT_KEYS: Readonly<Record<QuoteLayout, string>> = {
  portrait: "picture.layout.portrait",
  page: "picture.layout.page",
  seal: "picture.layout.seal",
};

export type Rgb = readonly [number, number, number];

/**
 * How a picture is toned: silver (black and white, the owner allows it), a
 * cast of a colour over it, by a colour blend or a soft light. Nothing at
 * all keeps its own colours.
 */
export type Tone = { silver?: boolean; grade?: string; gradeAlpha?: number; blend?: "color" | "soft-light" };

/** A look of a quote's picture: one row, read by every layout. */
export type QuoteLook = {
  id: string;
  /** Its name under its swatch. */
  nameKey: string;
  /** The ground drawn under everything: plain black, the brand's horizon, the fire, a paper, the dawn sky. */
  ground: "night" | "space" | "fire" | "paper" | "dawn";
  /** A paper's top and foot, the light it takes from above, and Blush's two blooms of colour. */
  paper?: { top: string; bottom: string; light: number; bloom?: boolean };
  /** White ink on a dark ground; a portrait sinks into the dark round his face. */
  dark: boolean;
  /** The words' ink, and how strong the words are set in it. */
  ink: Rgb;
  body: number;
  /** The one lit word: white and glowing on the dark looks, the look's deep ink with a white halo on the light ones. */
  lit: string;
  litGlow: string;
  /** The cross, the hairlines and the rules. */
  cross: string;
  crossGlow?: string;
  rule: string;
  /** The portrait's tone, and the plate's on the Page where it differs. */
  portrait: Tone;
  plate?: Tone;
  /** The seal: struck metal, the brand's eclipse, metal lit by the fire, or wax in the look's own colour. */
  seal: { kind: "metal" | "eclipse" | "ember" | "wax"; wax?: string };
  /** Flowers growing up from the foot, from the public-domain plates (FLOWER_PLATES). */
  flowers?: "roses" | "lavender" | "olive";
  /** Where a drawn ground rises at the foot (the planet's edge, the flames), as a share of the height: no word stands below it. */
  floor?: number;
  /** The name at the foot lit from behind, so it reads over the flames. */
  footGlow?: string;
  /** The light the Page's plate throws, where it is not a shadow (the fire's). */
  plateGlow?: string;
  /** The grain over the whole picture. */
  grain: number;
  /** The swatch's two colours, as the sheet drew them. */
  swatch: readonly [string, string];
};

const INK_WHITE: Rgb = [244, 244, 242];
const HALO_WHITE = "rgba(255,255,255,1)";

/**
 * The nine looks, in the order of the sheet's Look row: the dark ones, then
 * the light. One row each: a new look is one more row here and its name in
 * the catalogs.
 */
export const QUOTE_LOOKS: readonly QuoteLook[] = [
  {
    id: "night",
    nameKey: "picture.look.night",
    ground: "night",
    dark: true,
    ink: INK_WHITE,
    body: 0.86,
    lit: "#ffffff",
    litGlow: "rgba(255,255,255,0.85)",
    cross: "#f4f4f2",
    crossGlow: "rgba(255,255,255,0.6)",
    rule: "rgba(244,244,242,0.2)",
    portrait: { silver: true },
    seal: { kind: "metal" },
    grain: 0.2,
    swatch: ["#0a0a0a", "#1d1d20"],
  },
  {
    id: "space",
    nameKey: "picture.look.space",
    ground: "space",
    dark: true,
    floor: 0.8,
    ink: INK_WHITE,
    body: 0.86,
    lit: "#ffffff",
    litGlow: "rgba(255,255,255,0.85)",
    cross: "#ffffff",
    crossGlow: "rgba(255,255,255,0.7)",
    rule: "rgba(255,255,255,0.18)",
    portrait: { silver: true },
    plate: { silver: true },
    seal: { kind: "eclipse" },
    grain: 0.18,
    swatch: ["#000000", "#2a2a2a"],
  },
  {
    id: "fire",
    nameKey: "picture.look.fire",
    ground: "fire",
    dark: true,
    floor: 0.8,
    footGlow: "rgba(20,4,0,1)",
    plateGlow: "rgba(255,110,40,0.55)",
    ink: [255, 241, 228],
    body: 0.9,
    lit: "#fff6ea",
    litGlow: "rgba(255,140,50,0.95)",
    cross: "#fff1e2",
    crossGlow: "rgba(255,130,40,0.85)",
    rule: "rgba(255,200,160,0.25)",
    portrait: { grade: "rgba(255,150,80,1)", gradeAlpha: 0.32, blend: "soft-light" },
    seal: { kind: "ember" },
    grain: 0.22,
    swatch: ["#1a0804", "#ff7a2e"],
  },
  {
    id: "day",
    nameKey: "picture.look.day",
    ground: "paper",
    paper: { top: "#f3f2ee", bottom: "#ebe9e3", light: 0.45 },
    dark: false,
    ink: [22, 22, 24],
    body: 0.7,
    lit: "#000000",
    litGlow: HALO_WHITE,
    cross: "#18181a",
    rule: "rgba(20,20,22,0.2)",
    portrait: {},
    seal: { kind: "wax", wax: "#1e1e21" },
    grain: 0.14,
    swatch: ["#f1f0ec", "#d9d7d1"],
  },
  {
    id: "blush",
    nameKey: "picture.look.blush",
    ground: "paper",
    paper: { top: "#fbeded", bottom: "#f1d4da", light: 0.55, bloom: true },
    dark: false,
    ink: [76, 40, 54],
    body: 0.86,
    lit: "#b0365f",
    litGlow: HALO_WHITE,
    cross: "#a3436a",
    rule: "rgba(120,50,75,0.22)",
    portrait: {},
    seal: { kind: "wax", wax: "#c25a7f" },
    grain: 0.14,
    swatch: ["#f7dfe3", "#e6a8bb"],
  },
  {
    id: "rose",
    nameKey: "picture.look.rose",
    ground: "paper",
    paper: { top: "#f8f3ea", bottom: "#f0e8da", light: 0.5 },
    dark: false,
    ink: [62, 38, 42],
    body: 0.86,
    lit: "#9c2443",
    litGlow: HALO_WHITE,
    cross: "#8a2a40",
    rule: "rgba(110,50,60,0.22)",
    portrait: {},
    seal: { kind: "wax", wax: "#8e1f35" },
    flowers: "roses",
    grain: 0.12,
    swatch: ["#f6efe3", "#d77c93"],
  },
  {
    id: "dawn",
    nameKey: "picture.look.dawn",
    ground: "dawn",
    dark: false,
    ink: [30, 34, 52],
    body: 0.86,
    lit: "#7d2f55",
    litGlow: HALO_WHITE,
    cross: "#283049",
    rule: "rgba(30,34,52,0.2)",
    portrait: {},
    seal: { kind: "wax", wax: "#5f6f98" },
    grain: 0.12,
    swatch: ["#9fb2d6", "#f4cfc6"],
  },
  {
    id: "lavender",
    nameKey: "picture.look.lavender",
    ground: "paper",
    paper: { top: "#f2edf7", bottom: "#e2d8ee", light: 0.55 },
    dark: false,
    ink: [48, 38, 66],
    body: 0.86,
    lit: "#64459e",
    litGlow: HALO_WHITE,
    cross: "#5b4683",
    rule: "rgba(70,50,110,0.2)",
    portrait: {},
    seal: { kind: "wax", wax: "#7b67ad" },
    flowers: "lavender",
    grain: 0.12,
    swatch: ["#ece5f3", "#a48fcf"],
  },
  {
    id: "olive",
    nameKey: "picture.look.olive",
    ground: "paper",
    paper: { top: "#efeee2", bottom: "#e2e0cc", light: 0.5 },
    dark: false,
    ink: [44, 50, 32],
    body: 0.86,
    lit: "#4f5a22",
    litGlow: HALO_WHITE,
    cross: "#48511f",
    rule: "rgba(60,70,30,0.22)",
    portrait: {},
    seal: { kind: "wax", wax: "#5d6b30" },
    flowers: "olive",
    grain: 0.12,
    swatch: ["#ebe9da", "#8c9a5a"],
  },
];

/** The look with this id; Night for one that is not known. */
export function quoteLookOf(id: string): QuoteLook {
  return QUOTE_LOOKS.find((look) => look.id === id) ?? QUOTE_LOOKS[0];
}

/** As the sheet opens on a quote: his portrait, on Night, as a post (4:5), as r3-11b draws the sheet. */
export const QUOTE_STYLE: PictureStyle = { ...DEFAULT_STYLE, look: "night", layout: "portrait", shape: "post" };

/**
 * The flower plates, public domain, each opened and cleaned (the numbered
 * details painted out, the paper lifted to white so a multiply blend lets it
 * vanish into the ground) and carried in the bundle as small WebP:
 * docs/licensing/SHARE_FLOWERS.md. Their sizes are here so a plan knows how
 * high they reach before they load; the test reads each file's own.
 */
export const FLOWER_PLATES = {
  "rose-centifolia": { src: "/share/flowers/rose-centifolia.webp", width: 520, height: 642 },
  "rose-regalis": { src: "/share/flowers/rose-regalis.webp", width: 520, height: 722 },
  lavender: { src: "/share/flowers/lavender.webp", width: 258, height: 560 },
  olive: { src: "/share/flowers/olive.webp", width: 471, height: 470 },
} as const;
export type FlowerPlate = keyof typeof FLOWER_PLATES;

/** Where a set of flowers grows: its plate on each side, its middle (a share of the width, and how far under the foot), its width and its lean. */
type Bed = { plate: FlowerPlate; x: number; below: number; width: number; rotate: number };
const BEDS: Readonly<Record<NonNullable<QuoteLook["flowers"]>, { left: Bed; right: Bed }>> = {
  roses: {
    left: { plate: "rose-centifolia", x: 0.15, below: 0.05, width: 0.46, rotate: 0.12 },
    right: { plate: "rose-regalis", x: 0.87, below: 0.06, width: 0.44, rotate: -0.12 },
  },
  lavender: {
    left: { plate: "lavender", x: 0.09, below: 0.05, width: 0.26, rotate: 0.08 },
    right: { plate: "lavender", x: 0.92, below: 0.06, width: 0.26, rotate: -0.1 },
  },
  olive: {
    left: { plate: "olive", x: 0.1, below: 0.08, width: 0.46, rotate: 0.6 },
    right: { plate: "olive", x: 0.9, below: 0.09, width: 0.46, rotate: -0.62 },
  },
};

/** A flower plate where it grows in one picture. */
export type PlacedFlower = { plate: FlowerPlate; cx: number; cy: number; width: number; height: number; rotate: number };

/**
 * A look's flowers, growing up from the corners of the foot on the words'
 * side or both, and how high each side reaches, so the words keep clear of
 * them. A look with none answers no flowers and the foot as the top.
 */
export function flowerBeds(look: QuoteLook, W: number, H: number, where: "left" | "right" | "both"): { flowers: PlacedFlower[]; tops: { left: number; right: number } } {
  const tops = { left: H, right: H };
  const flowers: PlacedFlower[] = [];
  if (!look.flowers) return { flowers, tops };
  const beds = BEDS[look.flowers];
  for (const side of ["left", "right"] as const) {
    if (where !== "both" && where !== side) continue;
    const bed = beds[side];
    const plate = FLOWER_PLATES[bed.plate];
    const width = W * bed.width;
    const height = (width * plate.height) / plate.width;
    const cx = W * bed.x;
    const cy = H + W * bed.below;
    flowers.push({ plate: bed.plate, cx, cy, width, height, rotate: bed.rotate });
    tops[side] = Math.min(tops[side], cy - ((width / 2) * Math.abs(Math.sin(bed.rotate)) + (height / 2) * Math.abs(Math.cos(bed.rotate))));
  }
  return { flowers, tops };
}

/** The app's cross (public/purify-cross-mark.png), its width over its height: the test reads the file's own. */
export const CROSS_ASPECT = 177 / 311;

/** The way a face looks across its picture, as the viewer sees it. */
export type Gaze = "left" | "right" | "ahead";

/**
 * His face for a quote's picture: the cover portrait (lib/today/saintFaces.ts,
 * every one opened and its rights recorded), where the face sits in it (0 to
 * 1 across and down), the way he looks, and the seal's square where it is not
 * cut round the face (a council's: the Cross over the throne). `fallback` is
 * the picture the app carries, drawn when the cover cannot be had (no
 * signal), with its own face.
 */
export type QuoteFace = {
  src: string;
  point: readonly [number, number];
  looks: Gaze;
  /** The seal's middle and its side, as shares of the picture's width. */
  seal?: readonly [number, number, number];
  fallback?: { src: string; point: readonly [number, number]; looks: Gaze } | null;
};

/** Who the words are, and what the picture prints round them. Every part is the app's own data; none is a sample. */
export type QuoteSubject = {
  /** "St. John Chrysostom", "The Seventh Ecumenical Council", "Abba Moses". */
  name: string;
  /** Over the cross on the Portrait: his byname ("Golden-Mouth"), the council's place and year, "From the Desert Fathers". */
  head?: string;
  /** Under his name: the first of his titles and his repose, the council's name, the work the saying is kept in. */
  byline?: string;
  /** The work and its place: "The First Theological Oration, Chapter 3". */
  source?: string;
  /** The Page's running head and its right side: "In his own words", and his feast. */
  pageHead?: string;
  pageRight?: string;
  /** The Page's line under his name, where it says more than `source`: a council's document and its council, the Father a saying is kept by. */
  pageSource?: string;
  /** Round the seal: "St. John Chrysostom · †407". */
  ring: string;
  /** The one word lit, where one plainly carries the line; chosen by hand and stored with the words. */
  lit?: string;
  /** His face, when there is a picture of him the app may share. */
  face?: QuoteFace | null;
  /** The reader's language, for the capitals of the running head and the furniture. */
  lang?: string;
};

/** The picture a plan stands on, once it has loaded: its pixels, where the face is, which way he looks. */
export type QuotePicture = { width: number; height: number; point: readonly [number, number]; looks: Gaze; seal?: readonly [number, number, number] };

/** A face of type in a quote's picture, at a size. */
export type QuoteFont = { family: "serif" | "sans"; weight: number; italic?: boolean; size: number };

/**
 * What a canvas answers about type, so the plan can be made without one: a
 * run's width, and a letter's ink (how high it rises over its baseline and
 * how far it reaches either side of its pen), for the large first letter.
 */
export type QuoteMeasure = {
  width: (font: QuoteFont, text: string) => number;
  ink: (font: QuoteFont, text: string) => { ascent: number; left: number; right: number };
};

/** What each run of type is, so the drawing knows its ink. */
export type QuoteRole = "words" | "lit" | "head" | "name" | "byline" | "source" | "mark" | "initial";

/** One run of type, set from its left edge at its baseline. */
export type QuoteRun = { text: string; x: number; y: number; font: QuoteFont; track: number; role: QuoteRole };

/** Where everything goes in a quote's picture: what drawVerseCard.ts paints. */
export type QuotePlan = {
  width: number;
  height: number;
  layout: QuoteLayout;
  look: QuoteLook;
  /** Portrait: his picture's column, and where his face is set across it. */
  portrait: { x: number; width: number; faceX: number; side: "left" | "right" } | null;
  /** Page: the plate, the picture whole. */
  plate: { x: number; y: number; width: number; height: number } | null;
  /** Seal: its middle and its radius, and the words round its edge. */
  seal: { cx: number; cy: number; r: number; ring: string } | null;
  flowers: PlacedFlower[];
  /** Portrait: the hairline frame, its inset and the gap at its foot for the name. */
  frame: { inset: number; gap: number } | null;
  /** The cross: over the Portrait's words between two hairlines, or the Page's in place of a picture. */
  cross: { cx: number; top: number; height: number; glow: number; hairlines: readonly { x: number; y: number; width: number }[] } | null;
  /** Short rules: the Page's under its running head and over his name. */
  rules: readonly { x: number; y: number; width: number; height: number }[];
  runs: readonly QuoteRun[];
  /** The glow under the lit word, in the picture's pixels. */
  litGlow: number;
  foot: { text: string; x: number; y: number; size: number; track: number; framed: boolean };
};

/** The words' faces in each of the three fonts the reader chooses, by layout. */
const QUOTE_FACES: Readonly<Record<QuoteLayout, Readonly<Record<Font, { family: "serif" | "sans"; weight: number; capitals: boolean; track: number }>>>> = {
  // Lora capitals, spaced a little, as the sheet sets them.
  portrait: {
    serif: { family: "serif", weight: 500, capitals: true, track: 0.035 },
    sans: { family: "sans", weight: 500, capitals: true, track: 0.035 },
    caps: { family: "sans", weight: 800, capitals: true, track: 0.02 },
  },
  // A book's page: the reading serif at its book weight.
  page: {
    serif: { family: "serif", weight: 400, capitals: false, track: 0 },
    sans: { family: "sans", weight: 400, capitals: false, track: 0 },
    caps: { family: "sans", weight: 800, capitals: true, track: 0 },
  },
  seal: {
    serif: { family: "serif", weight: 500, capitals: false, track: 0 },
    sans: { family: "sans", weight: 500, capitals: false, track: 0 },
    caps: { family: "sans", weight: 800, capitals: true, track: 0 },
  },
};

/** The marks round the Seal's words: opened in the margin, closed after the last. */
const OPEN_QUOTE = "“";
const CLOSE_QUOTE = "”";

/**
 * Capitals for the furniture (the head, the source, the running head). The
 * registry's names and works are English and take English capitals; a line
 * from the catalog takes its own language's (Turkish i is İ), told by a
 * letter beyond English in it. Georgian is left as it is written, since its
 * capitals (Mtavruli) are not in every face the picture is set in.
 */
export function furnitureCapitals(text: string, lang?: string): string {
  if (/[Ⴀ-ჿ]/.test(text)) return text;
  return /(?![A-Za-z])\p{L}/u.test(text) ? capitals(text, lang) : text.toUpperCase();
}

/**
 * Where the one lit word stands in a line: its first whole occurrence, any
 * case (the Portrait sets the words in capitals), or null. A word is whole
 * when no letter touches it on either side.
 */
export function litSpan(line: string, lit: string | undefined): [number, number] | null {
  if (!lit) return null;
  const low = line.toLowerCase();
  const want = lit.toLowerCase();
  for (let from = 0; from <= low.length; ) {
    const at = low.indexOf(want, from);
    if (at < 0) return null;
    const before = at === 0 ? " " : low[at - 1];
    const after = at + want.length >= low.length ? " " : low[at + want.length];
    if (!/\p{L}/u.test(before) && !/\p{L}/u.test(after)) return [at, at + want.length];
    from = at + 1;
  }
  return null;
}

/** A run's width with its letters spaced by `track`, as it is drawn: letter by letter when spaced. */
function runWidth(m: QuoteMeasure, font: QuoteFont, text: string, track: number): number {
  if (!track) return m.width(font, text);
  const letters = [...text];
  return letters.reduce((sum, ch) => sum + m.width(font, ch), 0) + track * Math.max(0, letters.length - 1);
}

/**
 * Lines no wider than widthAt(i), words never split, and the last kept from
 * being one short word under a full block (as wrap above evens them).
 */
function wrapQuote(text: string, width: (line: string) => number, widthAt: (i: number) => number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const tried = line ? `${line} ${word}` : word;
    if (!line || width(tried) <= widthAt(lines.length)) line = tried;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  for (let guard = 0; guard < 6 && lines.length > 1; guard++) {
    const n = lines.length;
    const above = lines[n - 2].split(" ");
    if (above.length < 3) break;
    const moved = above.pop();
    const newAbove = above.join(" ");
    const newLast = `${moved} ${lines[n - 1]}`;
    const before = Math.abs(width(lines[n - 2]) - width(lines[n - 1]));
    const after = Math.abs(width(newAbove) - width(newLast));
    if (width(newLast) > widthAt(n - 1) || after >= before) break;
    lines[n - 2] = newAbove;
    lines[n - 1] = newLast;
  }
  return lines;
}

type Fitted = { font: QuoteFont; track: number; lines: string[]; lineHeight: number };

/** The largest size, from `max` down to `min`, at which the whole text fits its box; null when it never does. Nothing is cut. */
function fitQuote(
  m: QuoteMeasure,
  text: string,
  faceAt: (size: number) => { font: QuoteFont; track: number },
  max: number,
  min: number,
  widthAt: (i: number) => number,
  maxHeight: number,
  leading: number,
): Fitted | null {
  if (maxHeight <= 0) return null;
  for (let size = max; ; size = Math.max(min, Math.floor(size * 0.955))) {
    const { font, track } = faceAt(size);
    const width = (line: string) => runWidth(m, font, line, track);
    const lines = wrapQuote(text, width, widthAt);
    const lineHeight = Math.round(size * leading);
    if (lines.length && lines.length * lineHeight <= maxHeight && lines.every((l, i) => width(l) <= widthAt(i) + 0.5)) return { font, track, lines, lineHeight };
    if (size <= min) return null;
  }
}

/** The words' lines as runs, the lit word its own run, set about `x` or from it. */
function wordRuns(
  m: QuoteMeasure,
  fit: Fitted,
  top: number,
  x: number,
  align: Align,
  lit: string | undefined,
): QuoteRun[] {
  const runs: QuoteRun[] = [];
  let done = !lit;
  const { font, track, lineHeight } = fit;
  fit.lines.forEach((line, i) => {
    const y = top + i * lineHeight + lineHeight / 2 + font.size * 0.35;
    let parts: [string, boolean][] = [[line, false]];
    if (!done) {
      const span = litSpan(line, lit);
      if (span) {
        parts = [
          [line.slice(0, span[0]), false],
          [line.slice(span[0], span[1]), true],
          [line.slice(span[1]), false],
        ];
        done = true;
      }
    }
    let at = align === "center" ? x - runWidth(m, font, line, track) / 2 : x;
    for (const [text, on] of parts) {
      if (!text) continue;
      runs.push({ text, x: at, y, font, track, role: on ? "lit" : "words" });
      at += runWidth(m, font, text, track) + track;
    }
  });
  return runs;
}

/** Lines of furniture as runs: centred about `x` or from it. */
function lineRuns(m: QuoteMeasure, lines: string[], font: QuoteFont, track: number, x: number, align: Align | "right", first: number, step: number, role: QuoteRole): QuoteRun[] {
  return lines.map((text, i) => {
    const w = runWidth(m, font, text, track);
    const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    return { text, x: left, y: first + i * step, font, track, role };
  });
}

/** Spaced letters come apart in a script whose letters join (Arabic): there it is set whole. */
function trackFor(text: string, track: number): number {
  return /[؀-ۿݐ-ݿ]/.test(text) ? 0 : track;
}

/** "Purify App" at the foot: on the frame's line in a gap of it, or where every picture of the app is signed. */
function footOf(m: QuoteMeasure, W: number, H: number, framed: { inset: number } | null): QuotePlan["foot"] {
  const font: QuoteFont = { family: "sans", weight: 600, size: FOOT.size };
  const track = FOOT.size * FOOT.tracking;
  const w = runWidth(m, font, FOOT.text, track);
  return {
    text: FOOT.text,
    x: W / 2 - w / 2,
    y: framed ? H - framed.inset + FOOT.size * 0.34 : H - FOOT.bottom - Math.round(FOOT.size * 0.3),
    size: FOOT.size,
    track,
    framed: Boolean(framed),
  };
}

type PlanArgs = {
  m: QuoteMeasure;
  text: string;
  lang?: string;
  subject: QuoteSubject;
  style: PictureStyle;
  picture: QuotePicture | null;
  look: QuoteLook;
  W: number;
  H: number;
  scale: number;
};

/** A: the portrait beside his words. */
function planPortrait({ m, text, lang, subject, style, picture, look, W, H, scale }: PlanArgs): QuotePlan | null {
  const story = H / W > 1.5;
  const side = picture ? (picture.looks === "left" ? "right" : "left") : null;
  const pw = W * (story ? 0.64 : 0.6);
  const portrait = side ? { x: side === "left" ? 0 : W - pw, width: pw, faceX: side === "left" ? W * 0.26 : W * 0.74 - (W - pw), side } : null;
  const wordsSide = side === "left" ? "right" : side === "right" ? "left" : "both";
  const beds = flowerBeds(look, W, H, wordsSide);

  const inset = W * 0.034;
  const footW = runWidth(m, { family: "sans", weight: 600, size: FOOT.size }, FOOT.text, FOOT.size * FOOT.tracking);
  const frame = { inset, gap: footW / 2 + W * 0.022 };

  const [x0, x1] = !side ? [W * 0.16, W * 0.84] : side === "left" ? [W * (story ? 0.545 : 0.53), W * 0.93] : [W * 0.07, W * (story ? 0.455 : 0.47)];
  const cw = x1 - x0;
  const align: Align = style.align === "left" ? "left" : "center";
  const x = align === "center" ? (x0 + x1) / 2 : x0;

  const hs = W * 0.0195;
  const headFont: QuoteFont = { family: "sans", weight: 700, size: hs };
  const headText = subject.head ? furnitureCapitals(subject.head, subject.lang) : "";
  const headTrack = trackFor(headText, hs * 0.24);
  const head = headText ? wrapQuote(headText, (l) => runWidth(m, headFont, l, headTrack), () => cw) : [];
  const crossH = style.cross ? W * (story ? 0.056 : 0.05) : 0;

  const ns = W * (story ? 0.034 : 0.031);
  const nameFont: QuoteFont = { family: "serif", weight: 500, italic: true, size: ns };
  const bs = W * 0.0195;
  const byFont: QuoteFont = { family: "sans", weight: 500, size: bs };
  const ss = W * 0.0158;
  const srcFont: QuoteFont = { family: "sans", weight: 700, size: ss };
  const by = style.reference;
  const names = by ? wrapQuote(subject.name, (l) => m.width(nameFont, l), () => cw) : [];
  const bylines = by && subject.byline ? wrapQuote(subject.byline, (l) => m.width(byFont, l), () => cw) : [];
  const srcText = by && subject.source ? furnitureCapitals(subject.source, subject.lang) : "";
  const srcTrack = trackFor(srcText, ss * 0.2);
  const sources = srcText ? wrapQuote(srcText, (l) => runWidth(m, srcFont, l, srcTrack), () => cw) : [];

  const headBlock = head.length ? head.length * hs * 1.55 + W * 0.03 : 0;
  const crossBlock = crossH ? crossH + W * 0.036 : 0;
  const nameBlock = names.length ? W * 0.042 + names.length * ns * 1.25 : 0;
  const byBlock = bylines.length ? W * 0.008 + bylines.length * bs * 1.45 : 0;
  const srcBlock = sources.length ? W * 0.02 + sources.length * ss * 1.6 : 0;
  const fixed = headBlock + crossBlock + nameBlock + byBlock + srcBlock;

  const areaTop = H * (story ? 0.13 : 0.085);
  const flowersTop = wordsSide === "both" ? Math.min(beds.tops.left, beds.tops.right) : beds.tops[wordsSide];
  const areaBottom = Math.min(H * (story ? 0.85 : 0.915), flowersTop - W * 0.035, look.floor ? H * look.floor - W * 0.03 : H);
  const face = QUOTE_FACES.portrait[style.font] ?? QUOTE_FACES.portrait.serif;
  const set = capitals(text, lang);
  const words = fitQuote(
    m,
    set,
    (size) => ({ font: { family: face.family, weight: face.weight, size }, track: size * face.track }),
    Math.round(W * (story ? 0.05 : 0.046) * scale),
    Math.round(W * 0.022),
    () => cw,
    areaBottom - areaTop - fixed,
    1.38,
  );
  if (!words) return null;

  const group = fixed + words.lines.length * words.lineHeight;
  let y = areaTop + (areaBottom - areaTop - group) / 2 - H * 0.008;
  const runs: QuoteRun[] = [];
  runs.push(...lineRuns(m, head, headFont, headTrack, x, align, y + hs * 0.9, hs * 1.55, "head"));
  y += headBlock;
  let cross: QuotePlan["cross"] = null;
  if (crossH) {
    const cwid = crossH * CROSS_ASPECT;
    const ly = y + crossH * 0.36;
    const ll = W * 0.07;
    const cx = align === "center" ? x : x + cwid / 2;
    const hairlines = align === "center" ? [{ x: cx - cwid / 2 - W * 0.022 - ll, y: ly - 1, width: ll }, { x: cx + cwid / 2 + W * 0.022, y: ly - 1, width: ll }] : [{ x: cx + cwid / 2 + W * 0.022, y: ly - 1, width: ll }];
    cross = { cx, top: y, height: crossH, glow: 20, hairlines };
  }
  y += crossBlock;
  runs.push(...wordRuns(m, words, y, x, align, subject.lit));
  y += words.lines.length * words.lineHeight;
  if (names.length) {
    y += W * 0.042;
    runs.push(...lineRuns(m, names, nameFont, 0, x, align, y + ns * 0.8, ns * 1.25, "name"));
    y += names.length * ns * 1.25;
  }
  if (bylines.length) {
    y += W * 0.008;
    runs.push(...lineRuns(m, bylines, byFont, 0, x, align, y + bs * 0.95, bs * 1.45, "byline"));
    y += bylines.length * bs * 1.45;
  }
  if (sources.length) {
    y += W * 0.02;
    runs.push(...lineRuns(m, sources, srcFont, srcTrack, x, align, y + ss * 0.9, ss * 1.6, "source"));
  }

  return {
    width: W,
    height: H,
    layout: "portrait",
    look,
    portrait,
    plate: null,
    seal: null,
    flowers: beds.flowers,
    frame,
    cross,
    rules: [],
    runs,
    litGlow: 26,
    foot: footOf(m, W, H, frame),
  };
}

type Initial = { text: string; font: QuoteFont; left: number; indent: number; lines: number } | null;
type PageFit = { body: Fitted; initial: Initial };

/**
 * The page's words at one size under a first letter three lines tall, or
 * two, or none for words too short to want one; null when they do not fit.
 */
function fitPage(m: QuoteMeasure, text: string, face: { family: "serif" | "sans"; weight: number }, size: number, w: number, maxHeight: number, leading: number): PageFit | null {
  if (maxHeight <= 0) return null;
  const font: QuoteFont = { family: face.family, weight: face.weight, size };
  const lineHeight = Math.round(size * leading);
  const width = (line: string) => m.width(font, line);
  const first = [...text][0] ?? "";
  if (/\p{L}/u.test(first)) {
    const rest = text.slice(first.length);
    const capHeight = m.ink(font, "H").ascent;
    const weight = Math.max(600, face.weight);
    const rise = m.ink({ ...font, weight, size: 100 }, first).ascent || 70;
    for (const n of [3, 2]) {
      const initialFont: QuoteFont = { family: face.family, weight, size: (((n - 1) * lineHeight + capHeight) / rise) * 100 };
      const ink = m.ink(initialFont, first);
      const indent = ink.right + ink.left + size * 0.42;
      const lines = wrapQuote(rest, width, (i) => (i < n ? w - indent : w));
      if (lines.length < (n === 3 ? 5 : 2)) continue;
      if (lines.length * lineHeight > maxHeight) continue;
      if (!lines.every((l, i) => width(l) <= (i < n ? w - indent : w) + 0.5)) continue;
      return { body: { font, track: 0, lines, lineHeight }, initial: { text: first, font: initialFont, left: -ink.left, indent, lines: n } };
    }
  }
  // Words a line long, or that open with a mark, want no large first letter.
  const lines = wrapQuote(text, width, () => w);
  if (lines.length > 2 || lines.length * lineHeight > maxHeight || !lines.every((l) => width(l) <= w + 0.5)) return null;
  return { body: { font, track: 0, lines, lineHeight }, initial: null };
}

/** B: the page, under the picture as a plate. */
function planPage({ m, text, lang, subject, style, picture, look, W, H, scale }: PlanArgs): QuotePlan | null {
  const story = H / W > 1.5;
  const beds = flowerBeds(look, W, H, "both");
  const mx = W * 0.1;
  const tw = W - 2 * mx;
  const runs: QuoteRun[] = [];
  const rules: { x: number; y: number; width: number; height: number }[] = [];

  // The running head, as a book's: his words, and his feast.
  const hs = W * 0.0165;
  const hFont: QuoteFont = { family: "sans", weight: 700, size: hs };
  const headY = H * (story ? 0.12 : 0.072);
  const leftHead = subject.pageHead ? furnitureCapitals(subject.pageHead, subject.lang) : "";
  const rightHead = subject.pageRight ? furnitureCapitals(subject.pageRight, subject.lang) : "";
  const lTrack = trackFor(leftHead, hs * 0.2);
  const rTrack = trackFor(rightHead, hs * 0.2);
  const lw = leftHead ? runWidth(m, hFont, leftHead, lTrack) : 0;
  const rw = rightHead ? runWidth(m, hFont, rightHead, rTrack) : 0;
  if (leftHead && lw <= tw) runs.push({ text: leftHead, x: mx, y: headY, font: hFont, track: lTrack, role: "head" });
  if (rightHead && lw + rw + W * 0.04 <= tw) runs.push({ text: rightHead, x: W - mx - rw, y: headY, font: hFont, track: rTrack, role: "head" });
  rules.push({ x: mx, y: headY + W * 0.02, width: tw, height: 2 });

  const top0 = headY + W * 0.072;
  const footTop = Math.min(H - (story ? H * 0.115 : W * 0.11), Math.min(beds.tops.left, beds.tops.right) - W * 0.02, look.floor ? H * (look.floor + 0.04) - W * 0.03 : H);
  const avail = footTop - top0;

  const ns = W * 0.031;
  const ss = W * 0.0195;
  const nameFont: QuoteFont = { family: "serif", weight: 500, italic: true, size: ns };
  const srcFont: QuoteFont = { family: "sans", weight: 500, size: ss };
  const by = style.reference;
  const names = by ? wrapQuote(subject.name, (l) => m.width(nameFont, l), () => tw) : [];
  const pageSource = by ? (subject.pageSource ?? subject.source ?? "") : "";
  const sources = pageSource ? wrapQuote(pageSource, (l) => m.width(srcFont, l), () => tw) : [];
  const attribution = names.length || sources.length ? W * 0.075 + 2 + names.length * ns * 1.3 + sources.length * ss * 1.5 : 0;

  const face = QUOTE_FACES.page[style.font] ?? QUOTE_FACES.page.serif;
  const set = face.capitals ? capitals(text, lang) : text;
  const sizes: number[] = [];
  for (let s = Math.round(W * (story ? 0.06 : 0.054) * scale); s >= Math.round(W * 0.026); s = Math.floor(s * 0.955)) sizes.push(s);
  const ratio = picture && picture.width ? picture.height / picture.width : 0;
  const widths: number[] = [];
  if (picture) {
    const most = ratio < 1 ? W * 0.8 : W * (story ? 0.56 : 0.44);
    const least = ratio < 1 ? W * 0.6 : W * 0.24;
    for (let p = most; p >= least - 0.5; p -= W * 0.02) widths.push(p);
  } else widths.push(0);
  const comfortable = W * (story ? 0.045 : 0.039) * scale;
  let chosen: { pw: number; ph: number; gap: number; fit: PageFit } | null = null;
  search: for (const pass of [0, 1]) {
    for (const size of sizes) {
      if (pass === 0 && size < comfortable) break;
      for (const pw of widths) {
        const ph = picture ? pw * ratio : W * 0.1;
        const gap = W * (picture ? 0.075 : 0.06);
        const fit = fitPage(m, set, face, size, tw, avail - ph - gap - attribution, 1.5);
        if (fit) {
          chosen = { pw, ph, gap, fit };
          break search;
        }
      }
    }
  }
  if (!chosen) return null;
  const { pw, ph, gap, fit } = chosen;
  const body = fit.body;
  const group = ph + gap + body.lines.length * body.lineHeight + attribution;
  const pTop = top0 + Math.max(0, avail - group) * 0.4;
  const wTop = pTop + ph + gap;

  const plate = picture ? { x: (W - pw) / 2, y: pTop, width: pw, height: ph } : null;
  const cross = picture ? null : { cx: W / 2, top: pTop, height: W * 0.1, glow: 22, hairlines: [] };

  const initial = fit.initial;
  if (initial) {
    runs.push({ text: initial.text, x: mx - initial.left, y: wTop + (initial.lines - 1) * body.lineHeight + body.lineHeight / 2 + body.font.size * 0.35, font: initial.font, track: 0, role: "initial" });
  }
  body.lines.forEach((line, i) => {
    const x = initial && i < initial.lines ? mx + initial.indent : mx;
    runs.push({ text: line, x, y: wTop + i * body.lineHeight + body.lineHeight / 2 + body.font.size * 0.35, font: body.font, track: 0, role: "words" });
  });
  let y = wTop + body.lines.length * body.lineHeight;
  if (attribution) {
    y += W * 0.045;
    rules.push({ x: mx, y, width: W * 0.05, height: 2 });
    y += 2 + W * 0.03;
    runs.push(...lineRuns(m, names, nameFont, 0, mx, "left", y + ns * 0.85, ns * 1.3, "name"));
    y += names.length * ns * 1.3;
    runs.push(...lineRuns(m, sources, srcFont, 0, mx, "left", y + ss, ss * 1.5, "byline"));
  }

  return {
    width: W,
    height: H,
    layout: "page",
    look,
    portrait: null,
    plate,
    seal: null,
    flowers: beds.flowers,
    frame: null,
    cross,
    rules,
    runs,
    litGlow: 0,
    foot: footOf(m, W, H, null),
  };
}

/** C: the words large and alone, and his seal. */
function planSeal({ m, text, lang, subject, style, look, W, H, scale }: PlanArgs): QuotePlan | null {
  const story = H / W > 1.5;
  const beds = flowerBeds(look, W, H, "right");
  const reserve = beds.tops.right < H;
  const mx = W * 0.1;
  const D = W * (story ? 0.25 : 0.22);
  const R = D / 2;
  const sealCY = Math.min(story ? H * 0.785 - R : H - W * 0.135 - R, look.floor ? H * look.floor - R - W * 0.05 : H);
  const areaTop = story ? H * 0.15 : W * 0.12;
  const areaBottom = sealCY - R - W * 0.075;
  const face = QUOTE_FACES.seal[style.font] ?? QUOTE_FACES.seal.serif;
  const set = `${face.capitals ? capitals(text, lang) : text}${CLOSE_QUOTE}`;
  const words = fitQuote(
    m,
    set,
    (size) => ({ font: { family: face.family, weight: face.weight, size }, track: 0 }),
    Math.round(W * 0.1 * scale),
    Math.round(W * 0.036),
    () => W - 2 * mx,
    areaBottom - areaTop,
    1.2,
  );
  if (!words) return null;
  const h = words.lines.length * words.lineHeight;
  const top = areaTop + (areaBottom - areaTop - h) * (story ? 0.44 : 0.36);
  const runs: QuoteRun[] = [];
  // The opening mark hung in the margin, so the words' left edge stays straight.
  const markW = m.width(words.font, OPEN_QUOTE);
  runs.push({ text: OPEN_QUOTE, x: mx - words.font.size * 0.04 - markW, y: top + words.lineHeight / 2 + words.font.size * 0.35, font: words.font, track: 0, role: "mark" });
  runs.push(...wordRuns(m, words, top, mx, "left", subject.lit));

  if (style.reference) {
    const x = mx + D + W * 0.042;
    const avail = (reserve ? W * 0.66 : W - mx) - x;
    const ns = W * (story ? 0.036 : 0.033);
    const nameFont: QuoteFont = { family: "serif", weight: 500, italic: true, size: ns };
    const bs = W * 0.0205;
    const byFont: QuoteFont = { family: "sans", weight: 500, size: bs };
    const ss = W * 0.0158;
    const srcFont: QuoteFont = { family: "sans", weight: 700, size: ss };
    const names = wrapQuote(subject.name, (l) => m.width(nameFont, l), () => avail);
    const bylines = subject.byline ? wrapQuote(subject.byline, (l) => m.width(byFont, l), () => avail) : [];
    const srcText = subject.source ? furnitureCapitals(subject.source, subject.lang) : "";
    const srcTrack = trackFor(srcText, ss * 0.2);
    const sources = srcText ? wrapQuote(srcText, (l) => runWidth(m, srcFont, l, srcTrack), () => avail) : [];
    const blockH = names.length * ns * 1.22 + (bylines.length ? W * 0.008 + bylines.length * bs * 1.45 : 0) + (sources.length ? W * 0.016 + sources.length * ss * 1.6 : 0);
    let y = sealCY - blockH / 2;
    runs.push(...lineRuns(m, names, nameFont, 0, x, "left", y + ns * 0.82, ns * 1.22, "name"));
    y += names.length * ns * 1.22;
    if (bylines.length) {
      y += W * 0.008;
      runs.push(...lineRuns(m, bylines, byFont, 0, x, "left", y + bs * 0.95, bs * 1.45, "byline"));
      y += bylines.length * bs * 1.45;
    }
    if (sources.length) {
      y += W * 0.016;
      runs.push(...lineRuns(m, sources, srcFont, srcTrack, x, "left", y + ss * 0.9, ss * 1.6, "source"));
    }
  }

  return {
    width: W,
    height: H,
    layout: "seal",
    look,
    portrait: null,
    plate: null,
    seal: { cx: mx + R, cy: sealCY, r: R, ring: furnitureCapitals(subject.ring, subject.lang) },
    flowers: beds.flowers,
    frame: null,
    cross: null,
    rules: [],
    runs,
    litGlow: 34,
    foot: footOf(m, W, H, null),
  };
}

/**
 * Plan a quote's picture in a layout and a look, or null when the words do
 * not fit it whole. `picture` is his face once it has loaded (the cover, or
 * the carried picture with no signal), or null: then the Portrait keeps its
 * column alone, the Page has the cross where the plate would be, and the
 * Seal has the cross at its heart.
 */
export function planQuote(input: PictureWords, subject: QuoteSubject, style: PictureStyle, m: QuoteMeasure, picture: QuotePicture | null): QuotePlan | null {
  const shape: Shape = SHAPES[style.shape] ? style.shape : "post";
  const { width: W, height: H } = SHAPES[shape];
  const text = input.text.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const layout: QuoteLayout = style.layout && LAYOUT_ORDER.includes(style.layout) ? style.layout : "portrait";
  const scale = TEXT_SCALES[Math.max(0, Math.min(TEXT_SCALES.length - 1, Math.round(style.size)))] ?? 1;
  const args: PlanArgs = { m, text, lang: input.lang, subject, style, picture: picture && picture.width && picture.height ? picture : null, look: quoteLookOf(style.look), W, H, scale };
  return layout === "page" ? planPage(args) : layout === "seal" ? planSeal(args) : planPortrait(args);
}
