// The reading modes' row in Settings (build 95 note 18, the owner: "a clean
// scroller with haptic feedback rather than stacks"): where the row moves so
// the page that is on is in sight. The row itself is
// components/settings/ReadingModePages.tsx (ModePages); this is its
// arithmetic, pure, so it is tested directly
// (lib/settings/__tests__/modeRow.test.ts), left to right and in Arabic.

/** A box along the row, as the browser reports it (getBoundingClientRect). */
export type Span = { left: number; right: number };

/**
 * How far to move the row (scrollBy's `left`) so the page that is on stands
 * whole in sight, or null when it already does.
 *
 * `room` is the row's own padding at its start, where a page rests; at its
 * end a page needs `end`, for the check that stands a little outside its
 * corner. When it must move, the page before the one that is on (`lead`, the
 * page itself when it is the first) goes to where a page rests, so the one
 * that is on stands with a neighbour on each side. In a right-to-left row the
 * start is the right edge, and the same move is mirrored.
 */
export function inSightBy({
  row,
  page,
  lead,
  room,
  rtl,
  end = 8,
}: {
  row: Span;
  page: Span;
  lead: Span;
  room: number;
  rtl: boolean;
  end?: number;
}): number | null {
  const before = rtl ? row.right - page.right : page.left - row.left;
  const after = rtl ? page.left - row.left : row.right - page.right;
  if (before >= room - 1 && after >= end) return null;
  return rtl ? lead.right - (row.right - room) : lead.left - (row.left + room);
}
