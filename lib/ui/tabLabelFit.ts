// One label size for the whole tab bar, chosen so that every word can be read.
//
// Every tab is an equal-width cell, and at the caption size (12px) "Community"
// needs 68px. The cell is 63px on a 390px iPhone with five tabs, about 57px
// with six, and about 49px in iPad Slide Over, so the label was cut to
// "Comm..." on the most common phones and every narrow iPad window.
//
// This is what UIKit's tab bar does (adjustsFontSizeToFitWidth with a floor),
// with one difference: every label steps down together, so the row keeps a
// single type size instead of one word visibly smaller than its neighbours.
//
// ── Fitted by neighbours, not by cells (1.6) ─────────────────────────────
//
// The first rule asked whether each word fits ITS OWN CELL. That is stricter
// than what a reader sees. A label is centred under its glyph with nothing
// drawn around it, so a word a little wider than its cell touches nothing:
// the words beside it are shorter than their cells, and the space they leave
// is what it reaches into. Held to its own cell on a 390px phone with five
// tabs (measured 2026-10-13, each cell 65.7px): the Filipino for Prayers,
// "Mga Panalangin", 75px wide at the floor, was cut at every size, between
// two short words; the Georgian for Discover was cut the same way; and the
// Greek for Discover, "Ανακαλύψτε", was drawn "Ανακαλύψ…" a third of a pixel
// over its cell, because the bar measured the word and the cell in whole
// pixels (it measures both to a fraction now, in MobileTabBar).
//
// So the row is fitted by NEIGHBOURS: one size at which no two words next to
// each other come closer than a word space, and neither end word leaves the
// bar. Each label is then told how wide it may be drawn. That cap is still
// what stops a word that fits nowhere (below the floor, in a very narrow
// window) from running into the next one: it truncates, as before, only
// later.
//
// The glyphs stay where they are. The other way to give a long word room is
// to give its cell more of the bar, and then the five glyphs are no longer
// evenly spaced, in the languages that have a long word and not in the
// others.

export const TAB_LABEL_MAX_PX = 12;
export const TAB_LABEL_MIN_PX = 10;

/** How near two labels' words may come: a little over a word space at these sizes. */
export const TAB_LABEL_GAP_PX = 5;

export type TabRowMeasure = {
  /** Each label's text width at TAB_LABEL_MAX_PX, in the order they are drawn. */
  naturals: readonly number[];
  /** A cell's own width. Every cell is the same. */
  cell: number;
  /** From one cell's middle to the next: the cell's width and the gap. */
  pitch: number;
  /** How far past its cell an end label may reach: the bar's own padding. */
  edge: number;
};

export type TabRowFit = {
  /** The one label size for the row, in px. */
  size: number;
  /** How wide each label may be drawn at that size, in px. Empty when the row has not laid out. */
  maxWidths: number[];
};

/**
 * The largest size, in px, at which the row's words keep clear of each other
 * and of the bar's edges, clamped to [min, max] and floored to a quarter
 * pixel so a sub-pixel rounding in the browser cannot tip a label that
 * "fits" into an ellipsis; and each label's cap at that size.
 */
export function fitTabRow(
  row: TabRowMeasure,
  max: number = TAB_LABEL_MAX_PX,
  min: number = TAB_LABEL_MIN_PX,
): TabRowFit {
  const { naturals, cell, pitch, edge } = row;
  const count = naturals.length;
  // A row that has not laid out yet: the caption size, and no caps to set.
  if (!count || !(cell > 0) || !(pitch > 0) || naturals.some((w) => !(w > 0))) {
    return { size: max, maxWidths: [] };
  }
  const reach = cell / 2 + Math.max(0, edge);

  let size = max;
  for (let i = 0; i + 1 < count; i++) {
    // Two neighbours' words are a pitch apart, middle to middle. They meet
    // when their two half widths and the space between them use it up.
    size = Math.min(size, ((2 * (pitch - TAB_LABEL_GAP_PX)) / (naturals[i] + naturals[i + 1])) * max);
  }
  // An end word may reach into the bar's padding and no further.
  for (const w of [naturals[0], naturals[count - 1]]) size = Math.min(size, ((2 * reach) / w) * max);
  size = Math.max(min, Math.min(max, Math.floor(size * 4) / 4));

  const widths = naturals.map((w) => (w * size) / max);
  const maxWidths = widths.map((_, i) => {
    // Half of what this label may span: up to a word space short of each
    // neighbour's word as it is drawn, or the bar's edge at an end.
    const left = i > 0 ? pitch - widths[i - 1] / 2 - TAB_LABEL_GAP_PX : reach;
    const right = i < count - 1 ? pitch - widths[i + 1] / 2 - TAB_LABEL_GAP_PX : reach;
    // Never less than its own cell: a label always has that to itself, and a
    // neighbour is never let into it further than a word space short of this
    // label's own word at its full width.
    return Math.max(cell, Math.floor(2 * Math.min(left, right)));
  });
  return { size, maxWidths };
}
