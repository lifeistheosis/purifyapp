import { startOfDayLocal, type FastKind } from "@/lib/calendar/orthodox";

/**
 * The fasting tracker's pure core: types and the streak arithmetic, kept
 * free of React and localStorage so it is trivially testable and safe to
 * import on the server. The client store and hook live in ./tracker.
 *
 * A reader marks each day against the calendar's fast rule. Only days that
 * actually carry a fast (strict / wine-oil / fish / generic fast) count;
 * fast-free and normal days are transparent, they neither extend nor break
 * a streak, so the count reads as "fasting days kept in a row" across the
 * ordinary Wednesday/Friday gaps.
 */

export type CheckinStatus = "kept" | "partial" | "broken";

export type FastCheckin = {
  /** crypto.randomUUID(); shared with the synced server row. */
  id: string;
  /** The marked day as a local "YYYY-MM-DD" key. */
  day: string;
  status: CheckinStatus;
  /** Snapshot of the day's FastKind at mark time, for honest history. */
  fastKind: FastKind;
  /** The reader's own optional note. */
  note?: string;
  /** Date.now() of the last write. */
  updatedAt: number;
};

/** Days that carry a fast the reader can keep. */
export function isFastingDay(kind: FastKind): boolean {
  return (
    kind === "strict" ||
    kind === "wine-oil" ||
    kind === "fish" ||
    kind === "fast"
  );
}

/** Local calendar-day key, "YYYY-MM-DD", in the reader's own timezone. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * The reader's local calendar day, resolved to UTC noon, which is the frame
 * fastingStatus() reads (its feast constants are Date.UTC(...,12)). Passing a
 * raw local-midnight date would cross the UTC boundary for readers ahead of
 * UTC and compute the previous day's rule. Always feed fastingStatus this.
 */
export const localDayToUtcNoon = startOfDayLocal;

/**
 * The current streak: consecutive fasting days, scanning back from today,
 * that were kept or partially kept. Rules:
 *   - non-fasting days are skipped (they neither count nor break),
 *   - a "kept" or "partial" fasting day extends the streak,
 *   - a "broken" fasting day ends it,
 *   - an unmarked PAST fasting day ends it,
 *   - today, if a fasting day left unmarked, is forgiven (the day is not
 *     over): it neither counts nor breaks, so the streak survives until
 *     tomorrow.
 *
 * `kindOf` supplies the FastKind for any date (i.e. fastingStatus(d).kind).
 * The scan is bounded so a brand-new reader with no marks returns 0 fast.
 */
export function computeStreak(
  statusByDay: Map<string, CheckinStatus>,
  kindOf: (d: Date) => FastKind,
  today: Date,
  maxScan = 400,
): number {
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < maxScan; i++) {
    if (isFastingDay(kindOf(cursor))) {
      const st = statusByDay.get(dayKey(cursor));
      if (st === "kept" || st === "partial") {
        streak++;
      } else if (st === "broken") {
        break;
      } else if (i !== 0) {
        // an unmarked fasting day in the past ends the streak; today is forgiven
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Lifetime tallies for the tracker's summary row. */
export function summarize(checkins: FastCheckin[]): {
  kept: number;
  partial: number;
  broken: number;
  total: number;
} {
  let kept = 0;
  let partial = 0;
  let broken = 0;
  for (const c of checkins) {
    if (c.status === "kept") kept++;
    else if (c.status === "partial") partial++;
    else if (c.status === "broken") broken++;
  }
  return { kept, partial, broken, total: kept + partial + broken };
}
