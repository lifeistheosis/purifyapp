// Working out what a good hour looks like, so nobody has to type a target.
//
// ── Why a single number cannot be the goal ──────────────────────────────
//
// "20 page views an hour" is wrong twice a day, every day. Three in the
// morning is not eight in the evening, and a Sunday is not a Tuesday. A fixed
// target is either unreachable overnight or trivially met at peak, and both
// teach the operator to ignore it, which is worse than having no goal.
//
// So the target is derived from what THIS hour, on THIS weekday, has actually
// done before. The comparison is like for like, and it moves as the site
// grows without anyone maintaining it.
//
// ── Median, not mean ───────────────────────────────────────────────────
//
// One post going around on a Tuesday evening drags a four-week mean up enough
// that every subsequent Tuesday looks like a failure. The median ignores the
// spike and keeps describing the ordinary week, which is what a baseline is
// for. The spike is still visible; it is just not the yardstick.
//
// ── It says when it does not know ──────────────────────────────────────
//
// A baseline from one sample is not a baseline. Below MIN_SAMPLES it widens to
// the same hour on any weekday, and if that is still too thin it returns null
// rather than inventing a number. A goal derived from nothing would be graded
// as confidently as one derived from a year.
//
// Pure and synchronous. The measuring is done by the callers in
// app/api/{cron,admin}/hourly-goals.

/** One historical observation of a clock hour. */
export type HourSample = {
  /** 0 = Sunday, matching Date#getUTCDay. */
  weekday: number;
  /** 0-23, UTC. */
  hour: number;
  value: number;
};

/** Below this, a set of samples does not describe anything. */
export const MIN_SAMPLES = 2;

/** How far back to look. Four of each weekday is a month of context. */
export const BASELINE_WEEKS = 4;

export type BaselineBasis = "weekday-hour" | "hour-any-day" | "none";

export type Baseline = {
  /** The typical value, or null when there is not enough to say. */
  value: number | null;
  /** How it was arrived at, so the UI can be honest about confidence. */
  basis: BaselineBasis;
  /** How many observations went into it. */
  samples: number;
};

/** The middle value. Even counts average the two middle ones. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * What this weekday-and-hour normally does.
 *
 * Falls back one step, and only one: from "Tuesdays at 14:00" to "any day at
 * 14:00". It does not fall back to "any hour", because that would compare
 * three in the morning against the evening peak and produce a target that is
 * wrong in the most misleading possible way.
 */
export function baselineFor(
  samples: readonly HourSample[],
  weekday: number,
  hour: number,
): Baseline {
  const sameSlot = samples
    .filter((s) => s.weekday === weekday && s.hour === hour)
    .map((s) => s.value);
  if (sameSlot.length >= MIN_SAMPLES) {
    return {
      value: median(sameSlot),
      basis: "weekday-hour",
      samples: sameSlot.length,
    };
  }

  const sameHour = samples.filter((s) => s.hour === hour).map((s) => s.value);
  if (sameHour.length >= MIN_SAMPLES) {
    return { value: median(sameHour), basis: "hour-any-day", samples: sameHour.length };
  }

  return { value: null, basis: "none", samples: sameHour.length };
}

/**
 * How hard the automatic target pushes. 1.1 asks for a tenth more than
 * typical, which is a stretch that is usually reachable. Above about 1.3 the
 * goal is missed most days and stops being read.
 */
export const DEFAULT_STRETCH = 1.1;

export type AutoTarget = {
  /** The target, or null when the baseline could not be established. */
  target: number | null;
  baseline: Baseline;
  /** Plain sentence for the panel, so the number is never unexplained. */
  explanation: string;
};

/**
 * Turn a baseline into a target.
 *
 * ROUNDS UP, and has a floor of one above the baseline for counts. Without the
 * floor, a stretch of 1.1 on a typical value of 3 rounds to 4 but on a typical
 * value of 1 rounds back to 1, so the quiet hours would set goals that are met
 * by doing exactly as badly as usual.
 */
export function autoTarget(
  baseline: Baseline,
  stretch: number = DEFAULT_STRETCH,
  opts: { isMoney?: boolean } = {},
): AutoTarget {
  if (baseline.value === null) {
    return {
      target: null,
      baseline,
      explanation:
        baseline.samples === 0
          ? "No history for this hour yet. A target appears once there is something to compare against."
          : `Only ${baseline.samples} past ${baseline.samples === 1 ? "hour" : "hours"} to go on, which is not enough to set a fair target.`,
    };
  }

  const raw = baseline.value * Math.max(1, stretch);
  // CEIL AN EPSILON BELOW. 100 * 1.1 is 110.00000000000001 in IEEE 754, so a
  // bare Math.ceil returns 111 and every round target is silently one too
  // high. Caught by a test asserting a stretch of 1.1 on 100 gives 110.
  // 1e-9 is far smaller than any meaningful count or cent and far larger than
  // the representation error being cancelled.
  let target = Math.ceil(raw - 1e-9);
  // Money is already in cents; a one-cent floor would be meaningless, and the
  // ceiling above is enough of a stretch at that resolution.
  if (!opts.isMoney && target <= baseline.value) target = Math.floor(baseline.value) + 1;

  const where =
    baseline.basis === "weekday-hour"
      ? `the same hour on the last ${baseline.samples} of this weekday`
      : `this hour across the last ${baseline.samples} days`;
  return {
    target,
    baseline,
    explanation: `Typically ${round(baseline.value)} in ${where}. Target is ${Math.round(
      (Math.max(1, stretch) - 1) * 100,
    )}% above that.`,
  };
}

function round(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/**
 * The UTC hour slots to sample for a given target slot.
 *
 * Returns the same weekday and hour for each of the last `weeks` weeks, most
 * recent first, EXCLUDING the hour being targeted. Including it would compare
 * an hour against itself and guarantee the goal is met.
 */
export function sampleSlots(
  at: Date,
  weeks: number = BASELINE_WEEKS,
): { start: Date; end: Date }[] {
  const out: { start: Date; end: Date }[] = [];
  for (let w = 1; w <= weeks; w++) {
    const start = new Date(at);
    start.setUTCDate(start.getUTCDate() - 7 * w);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 3_600_000);
    out.push({ start, end });
  }
  return out;
}
