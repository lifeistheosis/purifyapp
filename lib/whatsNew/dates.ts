/**
 * The two shapes a release date takes, and the conversion between them.
 *
 * The page and the committed file carry "August 28, 2026", which is also the
 * key the changelog nests by. The patch_notes table carries a real date. The
 * admin editor, the pull script and the public read all need both directions,
 * and this file has no "server-only" so every one of them can import it.
 */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-08-28" to "August 28, 2026". Anything else is returned unchanged. */
export function isoToDisplayDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = MONTH_NAMES[Number(m[2]) - 1];
  if (!month) return iso;
  return `${month} ${Number(m[3])}, ${m[1]}`;
}

/** "August 28, 2026" to "2026-08-28". Null when it is not that shape. */
export function displayDateToIso(display: string): string | null {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(display.trim());
  if (!m) return null;
  const idx = MONTH_NAMES.findIndex((n) => n.toLowerCase() === m[1].toLowerCase());
  if (idx < 0) return null;
  return `${m[3]}-${String(idx + 1).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
}
