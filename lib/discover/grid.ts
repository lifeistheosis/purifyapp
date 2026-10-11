// Discover's library grid on a phone: which entries are drawn as full rows.
//
// The grid is two across. The library's entries are tiles, and the list ends
// on a few closing entries that are ways out of the library and not wings of
// it (Find a parish, then Settings). Each closing entry takes a whole row and
// says what is behind it, so the tiles stay one block and the ways out sit
// quietly under it. Settings was the first to be drawn so (the owner,
// 2026-10-05: "stretch it so it fits two spots").
//
// One exception keeps every row full. When the library is an odd count, its
// last tile has an empty slot beside it, so the first closing entry takes
// that slot as an ordinary tile.
//
// Here and not in components/mobile/DiscoverMobile.tsx because vitest
// collects lib/** only, and "no row is ever half empty" is a claim worth
// holding for every count the feature flags can produce.

/**
 * How many entries at the end of the phone's list are closing entries: Find a
 * parish, then Settings. Here so the component and the test read one number.
 * It counts from the end, so it is only true while the list ends on exactly
 * those entries, and lib/discover/__tests__/grid.test.ts holds the list to it.
 */
export const DISCOVER_CLOSING = 2;

/**
 * True when the entry at `index` is drawn as a full row.
 *
 * `total` is the length of the whole list, `closing` how many entries at its
 * end are closing entries.
 */
export function isClosingRow(index: number, total: number, closing: number): boolean {
  const library = total - closing;
  if (index < library) return false;
  if (index === library && library % 2 === 1) return false;
  return true;
}
