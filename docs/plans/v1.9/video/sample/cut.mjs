// The sample's cut: how long it runs, where the picture stands, and the order
// the pieces of Today arrive in. Nothing here is drawn: each piece is found in
// the app's own page (the native export) by what it is, and take.mjs moves it.
//
// One screen is built and one change of screen follows. Today may change with
// the fifteen screens' redesign: this cut shows the motion, not Today's final
// look, and when Today changes only PIECES changes.

import { near } from "../scenes.mjs";

export const CUT = {
  /** The film's length. His yes was to five seconds (2026-11-13, about 18:53 UTC). */
  seconds: 5,
  /** The film begins this long before the pieces are let go: the screen arrives bare, the app's own ground. */
  lead: 0.3,
  /** The finger comes down this long after the pieces are let go, when the last has been at rest for a beat. */
  tapAfter: 2.75,
  /** The app is left this long after the next screen has opened, so the film ends on a still screen. */
  restAfter: 2.2,
  /** The one tap: the button that opens the day's saint. `pick` finds it in the app's page; `opens` is where the app takes the reader. */
  next: { name: "Hymns of the feast", pick: '[data-today-build] > header a[href^="/saints/"]', opens: "/saints/nicholas-the-wonderworker/" },
  /** The picture stands whole under the words while Today is built, then moves in a little on the page that opens. */
  cam: [[4.55, near(330, 1.86), 1.25]],
  /** The four moments checkMock reads: the pieces arriving, Today whole, the change of screen, the next screen at rest. */
  checks: [["the pieces arriving", 1.1], ["Today whole", 2.85], ["the change of screen", 3.4], ["the next screen", 4.9]],
};

/**
 * The pieces of Today, in the order they arrive. Each is the app's own element.
 *   pick   how it is found in the app's page
 *   from   the side of the screen it comes in from ("above", "below", "start", "end"), or "near":
 *          it is already carried in by the piece that holds it, and settles its last few pixels
 *   at     seconds after the pieces are let go
 *   for    how long it travels, on the house curve
 *   each   when `pick` finds several (`count` of them), how long after the one before each sets off
 *   size   how small it starts (1 when not given)
 *   why    the reason, for the page
 */
export const PIECES = [
  { name: "the top bar", pick: "header[data-tab-topbar]", from: "above", at: 0, for: 0.7, why: "The screen's name comes first, so everything after it is read as Today." },
  { name: "the top bar's buttons", pick: "header[data-tab-topbar] [data-tab-actions] > *", from: "near", by: -34, at: 0.2, each: 0.07, count: 3, for: 0.55, why: "Plus, search and the bell drop into their places one after another: the buttons he asked to see move." },
  { name: "the day's line", pick: "[data-today-build] > header > p", from: "start", at: 0.22, for: 0.75, why: "The date and the fast, from the reading side." },
  { name: "the saint's picture", pick: "[data-today-build] > header > div:nth-of-type(1) > span", from: "start", at: 0.34, for: 0.85, size: 0.8, why: "St Nicholas arrives before his name, as an icon is seen before it is read." },
  { name: "the saint's name", pick: "[data-today-build] > header > div:nth-of-type(1) > h2", from: "end", at: 0.42, for: 0.85, why: "His name comes from the other side and meets his picture." },
  { name: "Hymns of the feast", pick: "[data-today-build] > header > div:nth-of-type(2) > a:nth-of-type(1)", from: "start", at: 0.62, for: 0.8, why: "The two buttons come from opposite sides and close like a clasp." },
  { name: "Morning prayers", pick: "[data-today-build] > header > div:nth-of-type(2) > a:nth-of-type(2)", from: "end", at: 0.7, for: 0.8, why: "The day's one bright button is the last of the pair to land, so the eye ends on it." },
  { name: "the streak", pick: "[data-today-build] > button", from: "below", at: 0.9, for: 0.9, size: 0.94, why: "The cards rise from below in the order they are read, each a little after the one above it." },
  { name: "the week's days", pick: "[data-today-build] > button span.justify-between > span.relative", from: "near", by: 14, at: 1.42, each: 0.045, count: 7, for: 0.45, why: "Monday to Sunday set down one by one, so the row reads as a week." },
  { name: "the Nativity Fast", pick: "[data-today-build] > a[data-nativity-star]", from: "below", at: 1.08, for: 0.95, size: 0.94, why: "The fast's night is the screen's one picture, so it has the longest travel." },
  { name: "the verse of the day", pick: "[data-today-build] > div > article", from: "below", at: 1.26, for: 0.95, size: 0.94, why: "The last card comes to rest under the tab bar, which says there is more below." },
  { name: "the tab bar", pick: "nav[data-tab-bar]", from: "below", at: 1.5, for: 0.75, why: "The way round the app arrives last and closes the screen." },
  { name: "the five tabs", pick: "nav[data-tab-bar] li", from: "near", by: 30, at: 1.72, each: 0.06, count: 5, for: 0.5, why: "Today, Bible, Discover, Prayers, You: each steps up into the bar in turn." },
];

/** When the last piece has come to rest, in seconds after they are let go. */
export const BUILT = Math.max(...PIECES.map((p) => p.at + p.for + (p.each ?? 0) * ((p.count ?? 1) - 1)));
