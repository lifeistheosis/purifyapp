// Date arithmetic for the catechism, in the UTC-noon frame lib/calendar/
// orthodox.ts expects.
//
// Split from select.ts so the client can key today's window entry without
// importing the selector, which pulls in node:crypto and the saints registry.
// No imports, on purpose.

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && ISO.test(s);
}

/** "YYYY-MM-DD" to a Date at UTC noon. Throws on anything else. */
export function dateFromIso(date: string): Date {
  const m = ISO.exec(date);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${date}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

/** The UTC calendar day of a Date as "YYYY-MM-DD". */
export function isoFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function addDaysIso(date: string, days: number): string {
  const d = dateFromIso(date);
  d.setUTCDate(d.getUTCDate() + days);
  return isoFromDate(d);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetweenIso(a: string, b: string): number {
  return Math.round((dateFromIso(b).getTime() - dateFromIso(a).getTime()) / 86_400_000);
}
