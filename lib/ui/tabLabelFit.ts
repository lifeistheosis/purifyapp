// One label size for the whole tab bar, chosen so the longest label fits.
//
// Every tab is an equal-width cell, and at the caption size (12px) "Community"
// needs 68px. The cell is 63px on a 390px iPhone, about 57px on the Android
// build with its sixth tab, and about 49px in iPad Slide Over, so the label
// was cut to "Comm..." on the most common phones and every narrow iPad window.
//
// This is what UIKit's tab bar does (adjustsFontSizeToFitWidth with a floor),
// with one difference: every label steps down together, so the row keeps a
// single type size instead of one word visibly smaller than its neighbours.
// Below the floor the size holds and the label truncates as before, which is
// still the right answer for a very long word in a narrow window.

export const TAB_LABEL_MAX_PX = 12;
export const TAB_LABEL_MIN_PX = 10;

export type TabLabelMeasure = {
  /** The label's text width at TAB_LABEL_MAX_PX. */
  natural: number;
  /** The width its cell gives it. */
  available: number;
};

/**
 * The largest size, in px, at which every label fits its cell, clamped to
 * [min, max] and floored to a quarter pixel so a sub-pixel rounding in the
 * browser cannot tip a label that "fits" into an ellipsis.
 */
export function fitTabLabelSize(
  labels: readonly TabLabelMeasure[],
  max: number = TAB_LABEL_MAX_PX,
  min: number = TAB_LABEL_MIN_PX,
): number {
  let size = max;
  for (const { natural, available } of labels) {
    if (!(natural > 0) || !(available > 0)) continue;
    if (natural <= available) continue;
    size = Math.min(size, (available / natural) * max);
  }
  const floored = Math.floor(size * 4) / 4;
  return Math.max(min, Math.min(max, floored));
}
