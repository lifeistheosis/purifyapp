/**
 * How a name too long for its one line glides along it to show itself whole
 * (build 98 note 2: the dock's track title ended in an ellipsis on a long
 * work's or homily's name; 3,659 of the works' 5,366 parts are named longer
 * than two lines of the dock, one past 700 letters, so no fixed room holds
 * them all). The name rests at its start, glides at a reading pace until a
 * copy of it, a gap behind, stands where it began, and begins again there:
 * the same picture, so the loop has no jump. Only the words move, on the
 * compositor (a transform); the line, the cover and the buttons stay. With
 * motion reduced it does not glide (ReaderDock.tsx).
 */

/** The glide's pace: slow enough to read as it goes. */
export const GLIDE_PX_PER_S = 30;
/** How long the name rests at its start before each glide. */
export const GLIDE_REST_MS = 2500;
/** The room between the name and its copy. */
export const GLIDE_GAP_PX = 48;

export type TitleGlide = { keyframes: Keyframe[]; duration: number; to: number };

/**
 * The glide for a name `nameWidth` wide in a line `lineWidth` wide, or null
 * when it fits. In Arabic the name begins at the right and glides rightwards.
 */
export function titleGlide(nameWidth: number, lineWidth: number, rtl: boolean): TitleGlide | null {
  if (!(nameWidth > lineWidth + 1)) return null;
  const period = Math.round(nameWidth + GLIDE_GAP_PX);
  const duration = Math.round(GLIDE_REST_MS + (period / GLIDE_PX_PER_S) * 1000);
  const rest = GLIDE_REST_MS / duration;
  const to = rtl ? period : -period;
  return {
    duration,
    to,
    keyframes: [
      { transform: "translateX(0px)", offset: 0 },
      { transform: "translateX(0px)", offset: rest, easing: "linear" },
      { transform: `translateX(${to}px)`, offset: 1 },
    ],
  };
}
