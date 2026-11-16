/**
 * A place for a sideways row to stand, held inside the row's own range
 * (components/ui/ScrollRail.tsx).
 *
 * scrollLeft runs from 0 at the start to the overflow at the end left to
 * right, and from 0 at the start down to minus the overflow right to left.
 * Chrome snaps a right-to-left row's range to whole pixels, so a row whose
 * width is fractional can stand a pixel past its start: the shop's chips in
 * Arabic at 390 overflow by 340.81 px and Chrome lets them stand from -340 to
 * +1. A move by a distance that runs into the start ended at +1, the whole
 * row 1 px off its place. The rail's own opening move did that on
 * /shop/category/all/ coming from the shop's front page, where the row is
 * already full when it opens (Gate 6b, 2026-11-16, checkMock's mirror rule:
 * every chip 2 px off its mirrored place, the pixel counted from each side).
 * So the rail asks for a place inside the range, never for a distance.
 */
export function withinRow(left: number, row: { scrollWidth: number; clientWidth: number }, rtl: boolean): number {
  const max = Math.max(0, row.scrollWidth - row.clientWidth);
  return rtl ? Math.min(0, Math.max(-max, left)) : Math.min(max, Math.max(0, left));
}
