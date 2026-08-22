import { seriesIdOf } from "./seriesId";
import type { Point, Series } from "./types";

/**
 * The flow hiding inside a level.
 *
 * WHY THIS EXISTS. A daily goal on a STOCK is meaningless, and a streak built
 * on one would be a lie. `dailyTargetFor` compares a stock to its target whole,
 * so a goal of "reach 800 devices" is met at 932, and at 933, and on every day
 * after, for ever. The streak would be infinite and would describe nothing.
 *
 * The measurement that actually varies day to day is the CHANGE. On the owner's
 * real export it runs from -16 to +41, median +6 across the sixty days since
 * launch, and it is negative about one day in five. That is a real daily
 * performance, and it is already in the file: it just was never surfaced.
 *
 * So every stock gets a companion flow, and daily goals point at the flow while
 * the level keeps the weekly and monthly goals, where "reach 1,500" is a
 * sensible thing to ask.
 *
 * NOTHING IS INVENTED HERE. Every number out is a difference of two numbers in,
 * and a day with no neighbour produces no point rather than a zero.
 */

/** The label given to a stock's derived flow. Used to build its id, so it is
 *  stable across imports the same way a real header is. */
export function deltaHeaderFor(series: Series): string {
  return `${series.source} [daily change]`;
}

export function deltaIdFor(series: Series): string {
  return seriesIdOf(deltaHeaderFor(series));
}

/**
 * A stock's day-over-day change, as a flow series.
 *
 * Returns null for anything that is not a stock, or that has fewer than two
 * measurements, because a change needs two numbers and inventing the first one
 * would be inventing data.
 *
 * GAPS BREAK THE CHAIN DELIBERATELY. If a report covers the 1st and the 5th but
 * nothing between, the difference across those four days is not a daily change,
 * it is four days of change wearing a daily label. Only consecutive calendar
 * days produce a point; anything else is simply absent, which every reader of
 * this data already understands as "not measured".
 */
export function deltaSeries(series: Series): Series | null {
  if (series.kind !== "stock") return null;

  const measured = series.points.filter((p) => p.value !== null) as {
    day: string;
    value: number;
  }[];
  if (measured.length < 2) return null;

  const points: Point[] = [];
  for (let i = 1; i < measured.length; i++) {
    const prev = measured[i - 1];
    const cur = measured[i];
    if (dayAfter(prev.day) !== cur.day) continue;
    points.push({ day: cur.day, value: cur.value - prev.value });
  }
  if (points.length === 0) return null;

  return {
    id: deltaIdFor(series),
    label: labelForDelta(series.label),
    // A flow, which is the entire point: it sums across a week, it can be
    // negative, and a daily target against it means something.
    kind: "flow",
    points,
    source: deltaHeaderFor(series),
  };
}

/**
 * Names the derived series for a human.
 *
 * "Installed audience, total" becomes "Net new installs, total", because
 * "Installed audience, daily change" is accurate and unreadable, and the thing
 * being counted really is installs minus uninstalls.
 */
function labelForDelta(label: string): string {
  if (/installed audience/i.test(label)) {
    return label.replace(/installed audience/i, "Net new installs");
  }
  return `${label}, daily change`;
}

/** The next calendar day, on the UTC-noon frame the rest of the engine uses. */
function dayAfter(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Every series plus a companion flow for each stock.
 *
 * Used at import so the derived series is stored like any other and every
 * downstream consumer, calendar included, treats it identically.
 */
export function withDerived(series: Series[]): Series[] {
  const out: Series[] = [];
  for (const s of series) {
    out.push(s);
    const d = deltaSeries(s);
    if (d) out.push(d);
  }
  return out;
}
