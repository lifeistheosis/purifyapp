// Every glyph in the tab bar at the same size.
//
// The bar's six glyphs were drawn at different times for different jobs, each
// in a 24-unit drawing, and none fills its drawing the same way. The sun's
// lines are 17 units wide and 12 tall and sit in the top half. The church's
// are 12 wide and 19 tall. The cart's are a 16 unit square. Each was then
// drawn in the same 22px box, so the row was six sizes at four heights, and
// the owner asked for one (2026-10-13).
//
// The glyphs are not redrawn. Two of them, the sun and the church, are used
// all over the app at other sizes. Instead the bar hands each one a viewBox,
// which every glyph accepts, and that is what this works out: from where a
// glyph's lines really are (measured from the drawing, not judged by eye) to
// a viewBox that draws them centred and at one size, and the line weight that
// keeps its lines as thick on the screen as they were.
//
// ONE SIZE means the keyline every icon set uses, because a square and a
// spire of the same height do not look the same size. A glyph that is tall or
// wide is drawn LONG_SIDE along its long side. A glyph about as wide as it is
// tall is drawn SQUARE_SIDE, a little less, so that it does not look bigger
// than the spire beside it. Both count the lines' own thickness.
//
// Held by lib/ui/__tests__/tabGlyphFrame.test.ts. The measured boxes live
// with the tabs in components/nav/MobileTabBar.tsx, and section 25 of
// scripts/export-walk.mjs measures the drawn glyphs in a built app and holds
// them to this.

/** The side of every glyph's drawing, in its own units. */
export const DRAWING = 24;
/** The long side of a tall or a wide glyph, in those units, lines included. */
export const LONG_SIDE = 20;
/** The side of a glyph about as wide as it is tall. */
export const SQUARE_SIDE = 18;
/** How far from square a glyph may be and still be treated as one. */
const SQUARE_WITHIN = 0.12;

/** Where a glyph's lines are in its drawing, without their thickness: x, y, width, height. */
export type GlyphBox = readonly [x: number, y: number, w: number, h: number];

export type GlyphFrame = {
  /** Hand this to the glyph's <svg>. */
  viewBox: string;
  /** How much larger than its own drawing the glyph is now drawn. */
  scale: number;
  /** The stroke width to hand the glyph for a line `weight` units thick on the screen. */
  strokeFor: (weight: number) => number;
  /** The glyph's size as drawn, lines included, in units of the drawing. */
  drawn: { w: number; h: number };
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The frame that draws a glyph at the bar's one size.
 *
 * `weight` is how thick its lines are to be on the screen, in units of the
 * drawing: the size is worked out with the lines at that thickness, so a
 * glyph of thin lines and one of thick lines end up the same size overall.
 */
export function frameGlyph(box: GlyphBox, weight: number): GlyphFrame {
  const [x, y, w, h] = box;
  const squarish = Math.abs((w + weight) / (h + weight) - 1) <= SQUARE_WITHIN;
  const side = squarish ? SQUARE_SIDE : LONG_SIDE;
  const scale = (side - weight) / Math.max(w, h);
  const view = DRAWING / scale;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return {
    viewBox: `${round(cx - view / 2)} ${round(cy - view / 2)} ${round(view)} ${round(view)}`,
    scale,
    strokeFor: (lines) => round(lines / scale),
    drawn: { w: w * scale + weight, h: h * scale + weight },
  };
}
