import { parseCsv, toDayKey, toNumber, type CsvTable } from "./csv";
import { labelOf, seriesIdOf } from "./seriesId";
import type { Dataset, Point, Series, SeriesKind } from "./types";

/**
 * Turn a pasted report into named series.
 *
 * Shape-agnostic by design: it finds the date column, treats every other
 * numeric column as a series, and names each one from its header. That handles
 * the two Play Console exports in hand without either being special-cased, and
 * it handles the next report the operator pastes without a code change.
 *
 * The one thing it does interpret is STOCK versus FLOW, because that decision
 * cannot be recovered from the numbers and getting it wrong is not a cosmetic
 * error. See SeriesKind in types.ts.
 */

/** Columns that are commentary, not measurement. */
const IGNORED = /^(notes?|comments?|annotations?)$/i;

const DATE_HEADER = /^(date|day|dates)$/i;

/**
 * Header text that means a level rather than a count of events.
 *
 * "Installed audience" is Play Console's name for the number of devices that
 * currently have the app. It is the only stock in these two reports, and the
 * words below are the ones that reliably mark one.
 */
const STOCK_WORDS =
  /(installed audience|active (users|devices)|total (users|installs|subscribers)|audience|subscribers|retained)/i;

export function kindOf(header: string): SeriesKind {
  return STOCK_WORDS.test(header) ? "stock" : "flow";
}

/**
 * Both of these now live in ./seriesId, parsed from the Play Console header
 * shape rather than slugged from the whole string.
 *
 * The old seriesId cut at 80 characters, and a Play Console metric prefix is 61
 * of them, so the DIMENSION was what got truncated: "All countries / regions"
 * was being stored as "...all-countries-regio" in real data. The dimension is
 * the only part that tells one column from its siblings, so it was the worst
 * possible thing to cut. Re-exported here so the twenty call sites that import
 * from this module keep working.
 */
export { labelOf as shortLabel, seriesIdOf as seriesId };

export type IngestResult = {
  dataset: Dataset | null;
  /** Fatal reasons there is no dataset. Empty when there is one. */
  errors: string[];
};

/**
 * @param text     raw pasted or dropped CSV
 * @param name     what to call this dataset, usually the file name
 * @param stampIso the import time, passed in rather than read from the clock
 *                 so the result is a pure function of its inputs and a test
 *                 can assert on it
 */
export function ingestCsv(text: string, name: string, stampIso: string): IngestResult {
  const table: CsvTable = parseCsv(text);
  const errors: string[] = [];

  if (table.headers.length === 0) {
    return { dataset: null, errors: ["That did not look like a CSV. There were no columns."] };
  }

  const dateIdx = table.headers.findIndex((h) => DATE_HEADER.test(h.trim()));
  if (dateIdx < 0) {
    return {
      dataset: null,
      errors: [
        `No date column. The first row names: ${table.headers.slice(0, 6).join(", ")}${table.headers.length > 6 ? ", ..." : ""}. One column has to be called Date or Day.`,
      ],
    };
  }

  // Which columns are worth reading. Everything that is not the date and not
  // commentary is a candidate; a candidate with no numbers at all is dropped
  // below, which is how a stray text column removes itself.
  const candidates = table.headers
    .map((h, i) => ({ header: h, i }))
    .filter(({ header, i }) => i !== dateIdx && header.trim() !== "" && !IGNORED.test(header.trim()));

  if (candidates.length === 0) {
    return { dataset: null, errors: ["There was a date column but nothing to measure beside it."] };
  }

  const days: (string | null)[] = table.rows.map((r) => toDayKey(r[dateIdx] ?? null));
  const unreadableDates = days.filter((d) => d === null).length;

  const series: Series[] = [];
  for (const { header, i } of candidates) {
    const points: Point[] = [];
    let numeric = 0;
    for (let r = 0; r < table.rows.length; r++) {
      const day = days[r];
      if (!day) continue;
      const value = toNumber(table.rows[r][i] ?? null);
      if (value !== null) numeric += 1;
      points.push({ day, value });
    }
    // A column with no numbers anywhere is not a series, it is a label the
    // report happened to carry. Dropping it here keeps it out of the goal
    // picker, where it would be an option that can never be measured.
    if (numeric === 0) continue;

    // Same day twice keeps the LAST, which is what a corrected export means.
    const byDay = new Map<string, Point>();
    for (const p of points) byDay.set(p.day, p);
    const sorted = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));

    series.push({
      id: seriesIdOf(header),
      label: labelOf(header),
      kind: kindOf(header),
      points: sorted,
      source: header,
    });
  }

  if (series.length === 0) {
    return {
      dataset: null,
      errors: ["No column held any numbers, so there is nothing to measure."],
    };
  }

  const allDays = series.flatMap((s) => s.points.map((p) => p.day)).sort();
  const warnings = [...table.warnings];
  if (unreadableDates > 0) {
    warnings.push(
      `${unreadableDates} row${unreadableDates === 1 ? "" : "s"} had a date that could not be read and were skipped. Dates like "May 24, 2026" and "2026-05-24" both work; "05/24/2026" is ambiguous and is refused rather than guessed.`,
    );
  }

  return {
    dataset: {
      id: seriesIdOf(name) || "dataset",
      label: name,
      series,
      importedAt: stampIso,
      rowCount: table.rows.length,
      firstDay: allDays[0] ?? null,
      lastDay: allDays[allDays.length - 1] ?? null,
      warnings,
    },
    errors,
  };
}

/**
 * The same question as windowValue, asked of an explicit day range.
 *
 * windowValue takes the last N MEASURED points, which is right for "the last 30
 * days" and wrong for "August", because a report with gaps would silently reach
 * further back than the range asked for. This bounds by label instead, so a
 * range covering days the report never measured reports what it actually has
 * and says how much of the range that was.
 *
 * The stock and flow rule is identical, and deliberately shares its reasoning
 * with windowValue: a level is read at its latest point inside the range, a
 * count is summed across it.
 */
export function rangeValue(
  series: Series,
  fromDay: string,
  toDay: string,
): { value: number; covered: number; days: number } {
  const inRange = series.points.filter(
    (p) => p.value !== null && p.day >= fromDay && p.day <= toDay,
  ) as { day: string; value: number }[];

  // Inclusive count of calendar days the range spans, so "covered 12 of 31"
  // can be said out loud rather than implied.
  const from = new Date(`${fromDay}T12:00:00Z`).getTime();
  const to = new Date(`${toDay}T12:00:00Z`).getTime();
  const days =
    Number.isFinite(from) && Number.isFinite(to) && to >= from
      ? Math.round((to - from) / 86_400_000) + 1
      : 0;

  if (inRange.length === 0) return { value: 0, covered: 0, days };

  if (series.kind === "stock") {
    return { value: inRange[inRange.length - 1].value, covered: inRange.length, days };
  }
  return {
    value: inRange.reduce((s, p) => s + p.value, 0),
    covered: inRange.length,
    days,
  };
}

/**
 * The value of a series over a window ending at its last measured day.
 *
 * A FLOW is summed: impressions over seven days is the total.
 * A STOCK is taken at its latest point, because a level does not add up. The
 * window still matters for a stock, though, in the other direction: `change`
 * reports how much the level MOVED across it, which is what a growth goal is
 * actually about.
 */
export function windowValue(
  series: Series,
  days: number,
): { value: number; change: number | null; covered: number } {
  const measured = series.points.filter((p) => p.value !== null) as { day: string; value: number }[];
  if (measured.length === 0) return { value: 0, change: null, covered: 0 };

  const slice = measured.slice(-days);
  const covered = slice.length;

  if (series.kind === "stock") {
    const latest = slice[slice.length - 1].value;
    // The point just before the window, so the change spans the whole window
    // rather than the window minus one.
    const priorIdx = measured.length - slice.length - 1;
    const prior = priorIdx >= 0 ? measured[priorIdx].value : slice[0].value;
    return { value: latest, change: latest - prior, covered };
  }

  const sum = slice.reduce((s, p) => s + p.value, 0);
  const priorSlice = measured.slice(-(days * 2), -days);
  const priorSum = priorSlice.reduce((s, p) => s + p.value, 0);
  return {
    value: sum,
    change: priorSlice.length > 0 ? sum - priorSum : null,
    covered,
  };
}
