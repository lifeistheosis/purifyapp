import { keyOf, type DayKey } from "@/lib/rhythm/dayKey";
import { standingFor } from "./grade";
import type { Forecast, Goal, Period, Series, Standing } from "./types";

/**
 * The calendar's arithmetic. All of it, so all of it is testable.
 *
 * vitest here runs `environment: "node"` over `lib/**\/__tests__` only, so a
 * decision made inside a component is a decision no test can reach. Everything
 * with a branch in it lives in this file and the grid component stays a
 * rendering of what these functions return.
 *
 * DAY KEYS ARE LABELS, NOT INSTANTS, and that is the whole reason this file is
 * simple. A Play Console export says "Aug 18, 2026"; `toDayKey` in csv.ts turns
 * it into "2026-08-18". A cell asks for "2026-08-18". They match by string
 * equality and no timezone conversion happens anywhere between them.
 *
 * The one place a zone genuinely matters is which cell is TODAY, and that is
 * resolved by the caller through `todayKey()` in lib/rhythm/dayKey.ts, which
 * reads the operator's own calendar day. This file never calls the clock: every
 * function takes the day it should treat as today. That keeps it pure and it
 * satisfies the noFrozenDay rule, which fails any file resolving "now" outside
 * a client component and which scans components/admin as well as app.
 *
 * All stepping is done on the UTC-noon frame, matching lib/rhythm/dayKey.ts.
 * Noon rather than midnight because a date pinned at midnight can slide into
 * the previous day under a DST offset; noon has twelve hours of slack either
 * way. `forecast.ts` had a private midnight-anchored `addDays` that this file
 * replaces.
 */

/** A key parsed back into the UTC-noon frame, ready for stepping. */
export function dateOf(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
}

/** `n` days after `key`, as a key. Negative steps backwards. */
export function shiftKey(key: DayKey, n: number): DayKey {
  const d = dateOf(key);
  d.setUTCDate(d.getUTCDate() + n);
  return keyOf(d);
}

/** Sunday of the week containing `key`. Sunday-first matches the reader's grid. */
export function startOfWeek(key: DayKey): DayKey {
  return shiftKey(key, -dateOf(key).getUTCDay());
}

export function startOfMonth(key: DayKey): DayKey {
  return `${key.slice(0, 7)}-01`;
}

/** Real length of the month containing `key`. Day 0 of the next month. */
export function daysInMonth(key: DayKey): number {
  const d = dateOf(key);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)).getUTCDate();
}

export type CalCell = {
  key: DayKey;
  /** Day of month, for the tile's corner. */
  day: number;
  /** False for the leading and trailing days of adjacent months. */
  inMonth: boolean;
  isToday: boolean;
};

/**
 * 42 cells, six weeks, Sunday first.
 *
 * The same shape the reader's calendar uses. Forty-two rather than a variable
 * count so the grid never changes height between months, which is what the
 * brief means by switching views without layout shift.
 *
 * Cells carry four primitives and nothing else. monthGrid.shape.test.ts records
 * what happens otherwise: 42 cells each carrying a resolved record once made up
 * 75% of a page payload.
 */
export function monthCells(year: number, monthIndex: number, todayKey: DayKey): CalCell[] {
  const first = new Date(Date.UTC(year, monthIndex, 1, 12));
  const gridStart = dateOf(shiftKey(keyOf(first), -first.getUTCDay()));
  const out: CalCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    const key = keyOf(d);
    out.push({
      key,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === monthIndex,
      isToday: key === todayKey,
    });
  }
  return out;
}

/** The seven cells of the week containing `anchor`. */
export function weekCells(anchor: DayKey, todayKey: DayKey): CalCell[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const key = shiftKey(start, i);
    return {
      key,
      day: dateOf(key).getUTCDate(),
      inMonth: true,
      isToday: key === todayKey,
    };
  });
}

export type Selection = { kind: Period; anchor: DayKey };

/**
 * The inclusive day range a selection covers.
 *
 * `daily` is one day. `weekly` is Sunday to Saturday around the anchor.
 * `monthly` is the calendar month, its real length, not 30.
 */
export function rangeOf(sel: Selection): { from: DayKey; to: DayKey } {
  if (sel.kind === "daily") return { from: sel.anchor, to: sel.anchor };
  if (sel.kind === "weekly") {
    const from = startOfWeek(sel.anchor);
    return { from, to: shiftKey(from, 6) };
  }
  const from = startOfMonth(sel.anchor);
  return { from, to: shiftKey(from, daysInMonth(sel.anchor) - 1) };
}

/**
 * What a single day is expected to deliver, given a goal stated over a window.
 *
 * THE STOCK AND FLOW SPLIT DECIDES THIS, and getting it wrong produces a
 * calendar that is confidently nonsense.
 *
 * A FLOW accumulates: impressions on Monday plus impressions on Tuesday is a
 * meaningful total, so a monthly target of 30,000 is 1,000 a day and a day is
 * measured against its share.
 *
 * A STOCK does not: an installed audience of 932 is a level, not a day's
 * earnings, and 932 divided by 31 is not a target for anything. A stock is
 * compared to the target WHOLE on every day, which is what "are we at 1,000
 * installs yet" actually means.
 *
 * Returns null when there is nothing to measure against, which the UI paints as
 * an uncoloured cell rather than as a failure.
 */
export function dailyTargetFor(
  goal: Goal | null,
  series: Series | null,
  dayKey: DayKey,
): number | null {
  if (!goal || !series || goal.paused) return null;
  if (goal.seriesId !== series.id) return null;
  if (goal.target <= 0) return null;

  if (series.kind === "stock") return goal.target;

  if (goal.period === "daily") return goal.target;
  if (goal.period === "weekly") return goal.target / 7;
  return goal.target / daysInMonth(dayKey);
}

export type CellMetrics = {
  key: DayKey;
  /** Measured value, or null when the report does not cover this day. */
  actual: number | null;
  /** Forecast value, only ever set for days after the last measured one. */
  predicted: number | null;
  target: number | null;
  standing: Standing | null;
  isFuture: boolean;
  /** True when a real measurement exists. Distinguishes a zero from a gap. */
  hasData: boolean;
};

/**
 * Everything one tile needs, resolved from the series, its forecast and a goal.
 *
 * `actual` null and `actual` zero are different facts and are kept apart all
 * the way to the tile: a day before the report began is blank, a day with no
 * installs shows 0. Collapsing them invents data.
 *
 * A day is FUTURE relative to the last measured point, not relative to the
 * clock. A report that stops on the 18th makes the 19th a forecast even if
 * today is the 25th, which is the honest reading: nothing measured it.
 */
export function cellMetrics(
  series: Series | null,
  forecast: Forecast | null,
  dayKey: DayKey,
  target: number | null,
): CellMetrics {
  const empty: CellMetrics = {
    key: dayKey,
    actual: null,
    predicted: null,
    target,
    standing: null,
    isFuture: false,
    hasData: false,
  };
  if (!series) return empty;

  const point = series.points.find((p) => p.day === dayKey);
  const lastMeasured = lastMeasuredDay(series);
  const isFuture = lastMeasured !== null && dayKey > lastMeasured;

  if (point && point.value !== null) {
    return {
      key: dayKey,
      actual: point.value,
      predicted: null,
      target,
      standing: target && target > 0 ? standingFor(point.value / target) : null,
      isFuture: false,
      hasData: true,
    };
  }

  if (isFuture && forecast) {
    const f = forecast.points.find((p) => p.day === dayKey);
    if (f && f.value !== null) {
      return {
        key: dayKey,
        actual: null,
        predicted: f.value,
        target,
        // A forecast is never given a standing. Colouring a cell green for a
        // number nobody measured would make a projection look like an
        // achievement, which is the failure this whole engine is built to
        // avoid.
        standing: null,
        isFuture: true,
        hasData: false,
      };
    }
  }

  return { ...empty, isFuture };
}

/** The last day the series actually measured, or null if it measured nothing. */
export function lastMeasuredDay(series: Series): DayKey | null {
  for (let i = series.points.length - 1; i >= 0; i--) {
    const p = series.points[i];
    if (p.value !== null) return p.day;
  }
  return null;
}

/** Month label for the grid header. Built from parts, never from a locale Date. */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(year: number, monthIndex: number): string {
  return `${MONTH_NAMES[monthIndex] ?? ""} ${year}`;
}

/** "18 Aug" for a tile or a modal heading. */
export function shortDayLabel(key: DayKey): string {
  const d = dateOf(key);
  return `${d.getUTCDate()} ${(MONTH_NAMES[d.getUTCMonth()] ?? "").slice(0, 3)}`;
}

export const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
