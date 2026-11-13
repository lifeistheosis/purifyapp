// A palette changing on the whole app, as one change (build 95 note 26, the
// owner, 2026-11-13: "make the theme switching smoother its buggy").
//
// Recorded frame by frame on the export, a switch was four changes, each on
// its own clock:
//   - the page cross-faded (the View Transition, 420ms on the house curve);
//   - inside the new picture some forty parts ran colour transitions of
//     their own (the page's ground for 350ms, the switches, the slider's
//     stops, the buttons, the small pages' light), so they arrived late, in
//     their old colours, after the rest; with motion off there was no
//     cross-fade, and the ground still faded on its own;
//   - the tab bar, pictured apart from the page, faded on the browser's
//     default 250ms and its own curve, and was there before the page;
//   - the status bar's strip changed the moment the palette did, before the
//     cross-fade had begun.
// Now: while a palette changes the root says so (SWITCH_ATTR), and nothing
// on the page runs a transition of its own (app/globals.css, "A palette lands
// whole"); every part pictured apart changes with the page, on its curve and
// in its time; and the strip changes when the new picture is half in.
//
// Pure, so the timing is tested directly (lib/reader/__tests__/themeSwitch.test.ts).
// Who sets the attribute is components/theme/AppThemeController.tsx; who
// reads it for the bar is components/native/statusBar.ts.

/** On <html> while a palette changes: "pictured" while it cross-fades, "landing" once it is half in, "instant" when it lands at once. */
export const SWITCH_ATTR = "data-theme-switch";

export type SwitchState = "pictured" | "landing" | "instant";

/** How long the cross-fade takes (app/globals.css, "View Transition tuning"). */
export const SWITCH_MS = 420;

/** The house curve, cubic-bezier(0.22, 1, 0.36, 1) (app/globals.css, --ease-house). */
export const HOUSE_CURVE = [0.22, 1, 0.36, 1] as const;

/** The share of its time a cubic-bezier curve takes to reach `progress`, found by halving. */
export function timeAt(progress: number, [x1, y1, x2, y2]: readonly [number, number, number, number]): number {
  const at = (s: number, a: number, b: number) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (at(mid, y1, y2) < progress) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2, x1, x2);
}

/**
 * When the new picture is half in, from the moment the cross-fade begins:
 * the house curve does most of its work early, so this is 55ms of the 420.
 * The status bar's strip, which cannot fade, changes then: with the page,
 * neither before it nor after.
 */
export const HALF_IN_MS = Math.round(SWITCH_MS * timeAt(0.5, HOUSE_CURVE));

/**
 * The bar, as the root's attributes change. A change of palette is kept
 * (`pending`) while the page is still cross-fading into it, and the bar is
 * painted when the switch says it is half in, or is over. A palette that
 * lands at once, or with no switch at all (the first paint, the gate's
 * answer), is painted as it lands.
 */
export function barStep(pending: boolean, change: { palette: boolean; switching: string | null }): { paint: boolean; pending: boolean } {
  const waiting = pending || change.palette;
  if (!waiting) return { paint: false, pending: false };
  if (change.switching === "pictured") return { paint: false, pending: true };
  return { paint: true, pending: false };
}
