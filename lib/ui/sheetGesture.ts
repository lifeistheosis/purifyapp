// Who takes a finger that moves in a sheet's body: the sheet, or what scrolls
// under the finger (lib/ui/useDraggableSheet.ts asks this once per gesture).
//
// WHY THIS EXISTS. Build 97 note 8, the owner on the Plus preview's Ambience
// page, whose Bible window scrolls inside the upgrade sheet: "when you hold
// down to scroll on the Bible in this context and your thumb reaches outside
// the Bible (because you are scrolling down to read it starts closing the
// whole entire window)". The sheet asked only about its own body: a pull down
// was the sheet's whenever the body was at its top, so with the window read
// part way down, a thumb drawn down the verses dragged the whole sheet away
// and it closed on release (reproduced with real touch at 390 wide: the
// window at 423px never moved, the sheet went 409px down and closed).
//
// The rule. A gesture that begins in a window that scrolls inside the sheet
// belongs to that window while the window has room to scroll that way. The
// room is read when the finger lands and the choice is made once, when the
// finger has moved far enough to have a direction: a scroll is never handed to
// the sheet halfway, however far the thumb travels past the window's edge.
// A window with no room that way leaves the gesture to the sheet's own rules,
// as before. The handle and the header drag the sheet as they always did.

/** Whether the windows under a finger could scroll further up or down. */
export type Room = {
  /** There is more above: a finger drawn down would scroll it. */
  above: boolean;
  /** There is more below: a finger drawn up would scroll it. */
  below: boolean;
};

export const NO_ROOM: Room = { above: false, below: false };

/** What roomUnder reads of an element: a DOM Element satisfies it. */
export type ScrollBox = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  parentElement: ScrollBox | null;
};

/** A scroll position this close to an end counts as the end (a phone's
 *  scroll positions carry fractions of a pixel). */
const EDGE_PX = 1;

/**
 * The room of every window that scrolls between the touched element and the
 * sheet's body (the body itself not counted: the sheet's own rules ask about
 * it). `overflowY` reads an element's computed overflow-y; a window is an
 * element the reader can scroll (auto, scroll or overlay).
 */
export function roomUnder<T extends ScrollBox>(
  target: T | null,
  body: T,
  overflowY: (el: T) => string,
): Room {
  let above = false;
  let below = false;
  for (let el = target; el && el !== body; el = el.parentElement as T | null) {
    if (!/^(auto|scroll|overlay)$/.test(overflowY(el))) continue;
    if (el.scrollHeight - el.clientHeight < EDGE_PX) continue;
    if (el.scrollTop >= EDGE_PX) above = true;
    if (el.scrollHeight - el.clientHeight - el.scrollTop >= EDGE_PX) below = true;
  }
  return { above, below };
}

/**
 * Whether the sheet takes a gesture whose finger has moved `dy` px (positive
 * is down) past the slop. `room` is what the windows under the finger had when
 * it landed, `bodyTop` the sheet body's scrollTop, `atHalf` whether the sheet
 * rests at its half height.
 */
export function sheetTakes({ dy, room, bodyTop, atHalf }: { dy: number; room: Room; bodyTop: number; atHalf: boolean }): boolean {
  if (dy === 0) return false;
  // A window that scrolls inside the sheet keeps a gesture it has room for.
  if (dy > 0 ? room.above : room.below) return false;
  // A pull down when the body is at its top; a pull up while the sheet rests
  // at half, so the first swipe opens it rather than scrolling words hidden
  // below the edge of the screen.
  return dy > 0 ? bodyTop <= 0 : atHalf;
}
