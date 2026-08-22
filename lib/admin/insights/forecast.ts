import { shiftKey } from "./calendar";
import type { Forecast, Point, Series } from "./types";

/**
 * A straight line through the recent past, projected forward.
 *
 * DELIBERATELY THE SIMPLEST THING THAT REPORTS ITS OWN QUALITY. This panel's
 * standing rule is that no number may look more certain than it is, and the
 * honest way to hold that line with one input series is a least-squares fit
 * that publishes its own r squared, so the UI can decline to state a figure
 * when the line does not describe the data. A seasonal or damped-trend model
 * would produce a more confident-looking number from exactly the same
 * information, which is the wrong direction.
 *
 * The fit runs over a WINDOW, not the whole history. The installed-audience
 * export in hand opens with 27 days of zeros before launch; a line through all
 * of it is dragged flat by a month that describes a product nobody could
 * install yet.
 */

const DEFAULT_WINDOW = 28;

/** Least squares on (x = day index, y = value). */
function fitLine(ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };

  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += i;
    sy += ys[i];
    sxy += i * ys[i];
    sxx += i * i;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { slope: 0, intercept: sy / n, r2: 0 };

  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;

  const mean = sy / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssTot += (ys[i] - mean) ** 2;
    ssRes += (ys[i] - predicted) ** 2;
  }
  // A perfectly flat series has zero variance, so r squared is undefined. A
  // flat line through it is a perfect description, so 1 is the honest answer.
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  return { slope, intercept, r2 };
}

// Was a private addDays anchored at UTC MIDNIGHT. The rest of the repo pins
// day arithmetic to UTC NOON on purpose, because a date at midnight can slide
// into the neighbouring day under an offset while noon has twelve hours of
// slack either way. lib/rhythm/dayKey.ts is the ruling on this and its header
// already names four earlier duplicates it replaced; this was quietly a fifth.
// shiftKey is that same frame, so the forecast's future labels and the
// calendar's cell labels are now minted by one reckoning instead of two.

export function forecastSeries(
  series: Series,
  horizonDays: number,
  windowDays = DEFAULT_WINDOW,
): Forecast {
  const measured = series.points.filter((p) => p.value !== null) as {
    day: string;
    value: number;
  }[];

  if (measured.length < 2) {
    return { seriesId: series.id, points: [], slopePerDay: 0, fit: 0, basisDays: measured.length };
  }

  const window = measured.slice(-windowDays);
  const { slope, intercept, r2 } = fitLine(window.map((p) => p.value));

  const lastDay = window[window.length - 1].day;
  const lastX = window.length - 1;

  const points: Point[] = [];
  for (let h = 1; h <= horizonDays; h++) {
    const raw = intercept + slope * (lastX + h);
    points.push({
      day: shiftKey(lastDay, h),
      // Clamped at zero. None of these metrics can go negative, and a
      // projection that shows minus forty installs is not a forecast, it is a
      // straight line that ran out of road.
      value: Math.max(0, Math.round(raw)),
    });
  }

  return {
    seriesId: series.id,
    points,
    slopePerDay: slope,
    fit: r2,
    basisDays: window.length,
  };
}

/**
 * Below this, the UI states the trend direction and refuses to state a number.
 *
 * 0.5 is a judgement call and is written down rather than buried: it is the
 * point at which the line explains less than half the movement, and a figure
 * projected off that is decoration.
 */
export const FIT_FLOOR = 0.5;

export function forecastIsUsable(f: Forecast): boolean {
  return f.points.length > 0 && f.fit >= FIT_FLOOR && f.basisDays >= 7;
}

/**
 * Where a series is heading over a window, as a single number.
 *
 * For a FLOW this is the projected total across the horizon. For a STOCK it is
 * the projected level at the END of it, because a level does not accumulate.
 * Same distinction as windowValue, and for the same reason.
 */
export function projectedFor(
  series: Series,
  f: Forecast,
  horizonDays: number,
): number | null {
  if (f.points.length === 0) return null;
  const slice = f.points.slice(0, horizonDays);
  if (slice.length === 0) return null;

  if (series.kind === "stock") {
    return slice[slice.length - 1].value ?? null;
  }
  return slice.reduce((s, p) => s + (p.value ?? 0), 0);
}
