/**
 * How many browsers one account may have subscribed, and which to let go
 * when another asks (audit F-42).
 *
 * The hourly reminder run and every Community alert make one request per
 * subscribed browser. With no ceiling, one account could hold any number of
 * rows and slow the run for everybody. A reader has a phone's browser, a
 * computer's, perhaps a tablet's and a second computer's: ten is far more
 * than anyone needs and far fewer than anyone could abuse. The newest are
 * kept, so a reader who really has moved to a new browser is never refused.
 *
 * Pure, so the route's one decision is tested without a database.
 */
export const MAX_BROWSERS = 10;

/**
 * The endpoints to delete so that, with `incoming` saved, the account holds
 * no more than `max`. `mine` is the account's rows, in any order. A browser
 * saving again is not a new browser and lets nothing go.
 */
export function endpointsToLetGo(
  mine: readonly { endpoint: string; created_at: string | null }[],
  incoming: string,
  max: number = MAX_BROWSERS,
): string[] {
  const others = mine.filter((r) => r.endpoint !== incoming);
  if (others.length < max) return [];
  // Oldest first; a row with no date is the oldest of all.
  const oldestFirst = [...others].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  return oldestFirst.slice(0, others.length - (max - 1)).map((r) => r.endpoint);
}
