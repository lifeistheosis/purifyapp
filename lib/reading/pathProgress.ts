/**
 * Where a reader is on a reading path (1.8): the days marked read, kept on
 * the device under purify:path:<id> (components/reading/PathView.tsx writes
 * them), so a path remembers without an account. Client only.
 */
export const pathKey = (id: string) => `purify:path:${id}`;

/** The days marked read, as 0-based indexes; none on the server or when nothing is kept. */
export function readPathDone(id: string): number[] {
  try {
    const raw = window.localStorage.getItem(pathKey(id));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}
