// The tab's name in the phone's top bar, made to fit (1.7.1).
//
// The bar (components/mobile/MobileHeader.tsx) holds the tab's name on the
// left; on the right the Premium pill, search and the bell. The streak joined
// the bar on the owner's word of 2026-10-17 ("put the streak at the top, like
// right next to plus"), and that took about 40px from the name on every
// phone: on a 320px one "Entdecken" and "Молитвы" did not fit, nor did the
// Filipino "Mga Panalangin" at 360px, which the export walk holds whole. It
// left the bar in 1.8 (his pick A of round 15, "Lighter, no streak"), and the
// fitting stays for the pill's longer words and the smallest phones.
//
// So the name steps down in size until it fits, as the tab bar's labels do
// (lib/ui/tabLabelFit.ts) and as UIKit's adjustsFontSizeToFitWidth does, and
// only below a floor is it cut. A name that fits keeps the bar's size, so on
// most phones in most languages nothing changes.

/** The bar's title size, text-lede. */
export const TITLE_MAX_PX = 19;
/** The smallest the name is drawn before it is cut instead. */
export const TITLE_MIN_PX = 13.5;

/**
 * The size, in px, at which a name `natural` px wide at `max` fits in `room`
 * px: `max` when it fits already, never under `min`. Floored to a quarter
 * pixel, a quarter pixel short of the room, so a browser's rounding cannot
 * tip a name that fits into an ellipsis.
 */
export function fitTitle(natural: number, room: number, max: number = TITLE_MAX_PX, min: number = TITLE_MIN_PX): number {
  if (!(natural > 0) || !(room > 0) || natural <= room) return max;
  const size = ((room - 0.25) / natural) * max;
  return Math.max(min, Math.min(max, Math.floor(size * 4) / 4));
}
