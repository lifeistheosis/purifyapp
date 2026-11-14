// A reader's profile, opened the first time (build 97 note 6): what stands
// from the card's first frame, and how a row that comes later arrives.

/** Whether Follow stands on a reader's card: from its first frame for a signed-in viewer, never on their own. */
export function followShown(signedIn: boolean, mine: boolean, relation: { mine: boolean } | null): boolean {
  return signedIn && !mine && !relation?.mine;
}

/** Follow as drawn: the viewer's last tap on this card, else the relation once it is read, else not yet following. */
export function followingNow(chosen: boolean | null, relation: { following: boolean } | null): boolean {
  return chosen ?? relation?.following ?? false;
}

/** The house's curve and time (app/globals.css, --ease-house and --duration-base). */
export const HOUSE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const HOUSE_MS = 320;

/** A row arriving under a card already drawn: its height from nothing on the house curve, its words fading in. */
export const ROW_OPENS: Keyframe[] = [
  { gridTemplateRows: "0fr", opacity: 0 },
  { gridTemplateRows: "1fr", opacity: 1 },
];

/** True when the app's motion is off (html[data-motion="reduce"], or the device asks). */
export function motionStill(doc: Document): boolean {
  if (doc.documentElement.dataset.motion === "reduce") return true;
  return typeof doc.defaultView?.matchMedia === "function" && doc.defaultView.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Opens a row (a grid of one row, its child clipped) as it mounts, so the
 * rows below it ease down instead of jumping in one frame. With motion off it
 * is simply there.
 */
export function openRow(el: HTMLElement | null): Animation | null {
  if (!el || typeof el.animate !== "function" || motionStill(el.ownerDocument)) return null;
  return el.animate(ROW_OPENS, { duration: HOUSE_MS, easing: HOUSE_EASE, fill: "backwards" });
}
