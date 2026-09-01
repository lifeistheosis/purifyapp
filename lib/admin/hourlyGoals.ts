// Goals measured by the hour, and when to say something about them.
//
// ── Why these are not insight_goals ────────────────────────────────────
//
// insight_goals grades imported store reports, and its Point type is
// `day: YYYY-MM-DD`. One point per day. An hourly goal against that series
// would have nothing to measure, and adding 'hourly' to its period check
// would produce a goal that always reads as unmeasured.
//
// These measure LIVE analytics instead, where the granularity actually exists:
// analytics_pageviews.ts and analytics_sessions.first_seen are timestamps with
// indexes on them. Different data, different table, different module.
//
// ── The hard part is not the arithmetic ────────────────────────────────
//
// Counting pageviews in an hour is trivial. Deciding whether to put a
// notification on somebody's phone about it is not, and almost all of this
// file is that decision:
//
//   * ONCE PER HOUR PER GOAL. A cron that runs every five minutes must not
//     send twelve identical pushes. The caller passes what has already been
//     sent this hour and shouldNotify refuses a repeat.
//   * NOT AT 3AM. Quiet hours, with wraparound, because 22:00 to 07:00 is the
//     normal way to write it and is the case naive range checks get wrong.
//   * NOT BEFORE THERE IS ANYTHING TO SAY. Two minutes into an hour, any
//     projection is noise, so pace alerts wait until the hour has run far
//     enough for the number to mean something.
//
// Pure and synchronous, so all of that is testable without a clock, a database
// or a push service.

export type HourlyMetric = "visitors" | "pageviews" | "signups" | "revenue_cents";

export const HOURLY_METRIC_LABEL: Record<HourlyMetric, string> = {
  visitors: "Visitors",
  pageviews: "Page views",
  signups: "Signups",
  revenue_cents: "Revenue",
};

export type HourlyGoal = {
  id: string;
  metric: HourlyMetric;
  /** The number to reach within one clock hour. Cents for revenue. */
  target: number;
  paused: boolean;
  /** Notify when the goal is reached. */
  notifyOnHit: boolean;
  /** Notify at the end of an hour that fell short. */
  notifyOnMiss: boolean;
  /** Local hour, 0-23, when quiet starts. Equal values mean never quiet. */
  quietFromHour: number;
  /** Local hour, 0-23, when quiet ends. */
  quietToHour: number;
};

/**
 * Is this local hour inside the quiet window?
 *
 * WRAPAROUND IS THE POINT. Quiet hours are almost always written across
 * midnight, 22 to 7, and the obvious `h >= from && h < to` is false for every
 * hour of that window. Handled explicitly rather than by normalising, because
 * the normalising version is the one that silently breaks when from equals to.
 *
 * from === to means "never quiet", not "always quiet". Always-quiet would
 * disable every notification with no obvious cause, which is the worse of the
 * two failures to guess wrong.
 */
export function isQuietHour(hour: number, from: number, to: number): boolean {
  if (from === to) return false;
  if (from < to) return hour >= from && hour < to;
  return hour >= from || hour < to;
}

export type HourlyEvaluation = {
  /** The metric's value so far in this hour. */
  value: number;
  target: number;
  /** value / target, clamped at 0 below but NOT above: 3x target is 3. */
  ratio: number;
  hit: boolean;
  /** Minutes elapsed in the hour, 0 to 60. */
  minutesElapsed: number;
  /**
   * What the hour is on course to finish at, or null too early to say.
   *
   * Linear, and honestly so: traffic is not uniform within an hour, so this is
   * a projection and not a prediction. It exists to answer "is this hour going
   * badly", which does not need better than linear.
   */
  pace: number | null;
  /** True when the pace says this hour will fall short. Null when too early. */
  behind: boolean | null;
};

/**
 * A projection needs enough of the hour to have run to mean anything.
 *
 * At two minutes past, one visitor projects to thirty and none projects to
 * zero, and neither is information. Twelve minutes is a fifth of the hour.
 */
export const PACE_MIN_MINUTES = 12;

export function evaluateHourly(
  goal: Pick<HourlyGoal, "target">,
  value: number,
  minutesElapsed: number,
): HourlyEvaluation {
  const target = Math.max(0, goal.target);
  const v = Math.max(0, value);
  const mins = Math.min(60, Math.max(0, minutesElapsed));
  const ratio = target > 0 ? v / target : v > 0 ? 1 : 0;
  const hit = target > 0 ? v >= target : false;

  const pace =
    mins >= PACE_MIN_MINUTES ? (v / mins) * 60 : null;

  return {
    value: v,
    target,
    ratio,
    hit,
    minutesElapsed: mins,
    pace,
    // A hit hour is never "behind", whatever the pace arithmetic says: the
    // goal is already met and the rest of the hour cannot unmake it.
    behind: hit ? false : pace === null ? null : pace < target,
  };
}

export type NotifyKind = "hit" | "miss";

export type NotifyDecision =
  | { notify: false; reason: string }
  | { notify: true; kind: NotifyKind; title: string; body: string };

/** How the value reads in a notification. Revenue is cents; the rest are counts. */
export function formatMetric(metric: HourlyMetric, value: number): string {
  if (metric === "revenue_cents") return `$${(value / 100).toFixed(2)}`;
  return String(Math.round(value));
}

/**
 * Whether to put this on the owner's phone, and what it should say.
 *
 * `alreadySent` is the set of kinds already sent for THIS goal in THIS hour,
 * supplied by the caller from storage. The dedupe lives here rather than in
 * the cron so it is testable, and so a second caller cannot bypass it.
 *
 * `hourEnded` distinguishes the two questions: a hit can be reported the
 * moment it happens, while a miss is only a fact once the hour is over.
 * Reporting a miss mid-hour would be reporting a hunch.
 */
export function shouldNotify(
  goal: HourlyGoal,
  evaluation: HourlyEvaluation,
  opts: {
    localHour: number;
    alreadySent: readonly NotifyKind[];
    hourEnded: boolean;
  },
): NotifyDecision {
  if (goal.paused) return { notify: false, reason: "goal is paused" };
  if (goal.target <= 0) return { notify: false, reason: "no target set" };
  if (isQuietHour(opts.localHour, goal.quietFromHour, goal.quietToHour)) {
    return { notify: false, reason: "quiet hours" };
  }

  const label = HOURLY_METRIC_LABEL[goal.metric];
  const value = formatMetric(goal.metric, evaluation.value);
  const target = formatMetric(goal.metric, goal.target);

  if (evaluation.hit && goal.notifyOnHit && !opts.alreadySent.includes("hit")) {
    return {
      notify: true,
      kind: "hit",
      title: `${label} goal hit`,
      body: `${value} this hour, past ${target}.`,
    };
  }

  // A MISS IS ONLY A FACT AT THE END OF THE HOUR. Before that it is a
  // projection, and a projection is not worth a notification.
  if (
    opts.hourEnded &&
    !evaluation.hit &&
    goal.notifyOnMiss &&
    !opts.alreadySent.includes("miss")
  ) {
    return {
      notify: true,
      kind: "miss",
      title: `${label} hour fell short`,
      body: `${value} against ${target}.`,
    };
  }

  if (evaluation.hit) return { notify: false, reason: "hit already reported" };
  return { notify: false, reason: "nothing to report yet" };
}

/**
 * The key one hour's notifications are recorded under.
 *
 * UTC, and deliberately: the dedupe must not shift when a clock changes. A
 * local key would let a daylight-saving hour repeat and send everything twice.
 * The QUIET WINDOW is local, because that is about the owner being asleep; the
 * bucket is UTC, because that is about identity.
 */
export function hourKeyUtc(at: Date): string {
  return at.toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

/** Minutes elapsed within the clock hour containing `at`. */
export function minutesIntoHour(at: Date): number {
  return at.getUTCMinutes() + at.getUTCSeconds() / 60;
}
