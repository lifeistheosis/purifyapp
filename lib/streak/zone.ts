// "Today" for a reader the server cannot see: their calendar day in their
// own time zone, from the IANA name their device reported. Pure.

import type { DayKey } from "@/lib/rhythm/dayKey";

/** An IANA zone the runtime knows, or null. */
export function validZone(tz: unknown): string | null {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

/** The calendar day in `tz` at `now`, as a `YYYY-MM-DD` key. UTC when the zone is unknown. */
export function todayIn(tz: string | null | undefined, now: Date = new Date()): DayKey {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: validZone(tz) ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
