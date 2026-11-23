// The onboarding's counts, summed for the admin (1.8). Pure, so the sums are
// tested directly (lib/admin/__tests__/onboardingSummary.test.ts); the route
// that reads the rows is app/api/admin/onboarding/route.ts.
//
// The owner's ask, 2026-10-26: "What gets clicked, how many people go through
// certain routes, how many Roman Catholics come, how many Protestants come
// ... so we can tailor the updates", said in plain sentences ("I like the a
// Catholic finished ... type of wording"). Every number here is a total of
// rows that hold no reader (lib/onboarding/counting.ts).

import {
  COUNT_ANSWERS,
  COUNT_ROUTES,
  ONBOARDING_STEPS,
  RETURN_DAYS,
  type CountQuestion,
  type CountRoute,
  type CountStep,
  type ReturnDay,
} from "@/lib/onboarding/counting";
import { SMALLEST_CELL } from "@/lib/ab/panel";
import { roadOf, type Road } from "@/lib/onboarding/road";
import { BACKGROUNDS, INTENTS, LEVELS, type Background, type Intent, type Level } from "@/lib/onboarding/space";

export type OnboardingRow = { name: string; props: Record<string, unknown>; ts: string };

type Tally = Record<string, number>;

export type OnboardingSummary = {
  days: number;
  /** Readers who reached each screen, by way in. */
  steps: Record<CountRoute, Record<CountStep, number>>;
  /** Readers who saw the first screen of their way in. */
  began: number;
  /** Where readers left the questions with Skip. */
  skippedAt: Tally;
  skipped: number;
  finished: number;
  /**
   * Each question's answers, as given (not only by those who finished).
   * "What are you looking for?" is every pick from version 4 on, the first
   * pick alone before it.
   */
  answers: Record<CountQuestion, Tally>;
  /**
   * "What are you looking for?" by place in the order tapped: how many put
   * each answer first, and each answer's count at each place (1.8). A row
   * from before places were counted was a first pick.
   */
  picks: { first: Tally; places: Record<string, Tally> };
  /** Those who finished, by what they said and how they came; `road` is the road their answers lead to (countedRoad). */
  finishedBy: { background: Tally; level: Tally; intent: Tally; platform: Tally; door: Tally; route: Tally; account: Tally; road: Tally };
  /** Day 1 steps opened from Today. */
  dayOne: Tally;
  /**
   * Came back after 2, 7 and 30 days: the count, and of how many could have.
   * By road and by first pick too, each with its own "of how many could
   * have" (`ofBy`), so that a road's share is of that road's readers.
   */
  returned: Record<ReturnDay, { count: number; of: number; byBackground: Tally; byDoor: Tally; byRoad: Tally; byIntent: Tally; ofBy: { road: Tally; intent: Tally } }>;
  /** Finishes week by week (weeks starting Monday, UTC), by background. */
  weeks: { week: string; finished: number; byBackground: Tally }[];
  sentences: string[];
};

const DAY = 86_400_000;

/** The group of a reader whose answers lead to no road: a skip, or too little said. */
export const NO_ROAD = "none";

/**
 * The road a count's answers lead to, as far as a count can tell (2.0's plan,
 * row 1: numbers by road from the counts that exist). The rule is the app's
 * own (lib/onboarding/road.ts). Two things a count does not carry, so two
 * roads cannot be told apart here:
 *
 * - whether a practicing reader is coming back after time away, so both stand
 *   under "practicing";
 * - "Another Christian tradition", which is not counted until the privacy page
 *   says it may be (lib/onboarding/count.ts), so those readers stand among
 *   the newcomers and the seekers, by their first pick.
 *
 * "returning" here is only the reader who is Orthodox by family and new to
 * the faith. Admin's table says all of this beside the numbers.
 */
export function countedRoad(props: Record<string, unknown>): Road | typeof NO_ROAD {
  const one = <T extends string>(list: readonly T[], v: unknown): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);
  return (
    roadOf({
      background: one<Background>(BACKGROUNDS, props.background),
      level: one<Level>(LEVELS, props.level),
      intent: one<Intent>(INTENTS, props.intent),
      returning: false,
    }) ?? NO_ROAD
  );
}

function bump(t: Tally, key: unknown) {
  if (typeof key !== "string" || !key) return;
  t[key] = (t[key] ?? 0) + 1;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

/** The Monday of a date's week, YYYY-MM-DD, UTC. */
export function weekOf(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * DAY).toISOString().slice(0, 10);
}

export const BACKGROUND_WORDS: Record<string, [string, string]> = {
  orthodox: ["Orthodox reader", "Orthodox readers"],
  catholic: ["Catholic", "Catholics"],
  protestant: ["Protestant", "Protestants"],
  "other-faith": ["reader of another faith", "readers of another faith"],
  // The question's own words for this answer: "Just curious" (1.8).
  none: ["reader who is just curious", "readers who are just curious"],
  "prefer-not": ["reader who would rather not say", "readers who would rather not say"],
};

/** Each answer to "What are you looking for?", as a sentence says it. */
export const INTENT_WORDS: Record<string, string> = {
  saints: "the saints' lives",
  fathers: "the Fathers' writings",
  gospels: "the Gospels",
  councils: "the councils",
  history: "Church history",
  beliefs: "what the Orthodox believe",
  liturgy: "the Liturgy",
  feasts: "fasts and feasts",
  prayer: "a rule of prayer",
  quiet: "daily quiet",
  study: "study",
};
const LEVEL_WORDS: Record<string, string> = { inquirer: "completely new", learning: "learning", practicing: "practicing" };
export const STEP_WORDS: Record<string, string> = {
  welcome: "the welcome",
  returning: "the welcome back",
  account: "the account screen",
  background: "where they come from",
  level: "how familiar they are",
  role: "priest, deacon or layman",
  rule: "calendar and fast",
  intent: "what to focus on",
  reminders: "reminders",
  handoff: "the last screen",
};

/**
 * The screen each way in opens on (lib/onboarding/counting.ts, routeFor). A
 * reader signed in already is taken straight to the questions, which open on
 * "Where are you coming from?" from version 4 of them and on familiarity
 * before it.
 */
function firstStep(route: CountRoute, v: number): CountStep {
  switch (route) {
    case "new":
      return "welcome";
    case "signup":
      return "account";
    case "signed-in":
      return v >= 4 ? "background" : "level";
    case "returning":
      return "returning";
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function list(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * Sum the rows of the last `days` days before `now`. Rows from before that
 * window may be passed too: finishes from the 30 days before it are what the
 * return counts are measured against ("of how many could have come back").
 */
export function summarizeOnboarding(rows: OnboardingRow[], now: Date, days: number): OnboardingSummary {
  const since = now.getTime() - days * DAY;
  const inWindow = (r: OnboardingRow) => Date.parse(r.ts) >= since;

  const steps = Object.fromEntries(
    COUNT_ROUTES.map((route) => [route, Object.fromEntries(ONBOARDING_STEPS.map((s) => [s, 0])) as Record<CountStep, number>]),
  ) as Record<CountRoute, Record<CountStep, number>>;
  const answers = Object.fromEntries(Object.keys(COUNT_ANSWERS).map((q) => [q, {}])) as Record<CountQuestion, Tally>;
  const finishedBy = { background: {}, level: {}, intent: {}, platform: {}, door: {}, route: {}, account: {}, road: {} } as OnboardingSummary["finishedBy"];
  const picks: OnboardingSummary["picks"] = { first: {}, places: {} };
  let began = 0;
  const skippedAt: Tally = {};
  const dayOne: Tally = {};
  const returned = Object.fromEntries(
    RETURN_DAYS.map((d) => [d, { count: 0, of: 0, byBackground: {}, byDoor: {}, byRoad: {}, byIntent: {}, ofBy: { road: {}, intent: {} } }]),
  ) as OnboardingSummary["returned"];
  const weeks = new Map<string, { finished: number; byBackground: Tally }>();
  let finished = 0;
  let skipped = 0;

  for (const r of rows) {
    const p = r.props ?? {};
    const route = str(p.route) as CountRoute | undefined;
    const t = Date.parse(r.ts);
    if (!Number.isFinite(t)) continue;

    // A finish counts toward each return day's "of" when it is old enough to
    // have come back by now and young enough that its return would fall in
    // the window.
    if (r.name === "onboarding_finished") {
      for (const d of RETURN_DAYS) {
        const due = t + d * DAY;
        if (due <= now.getTime() && due >= since) {
          returned[d].of += 1;
          bump(returned[d].ofBy.road, countedRoad(p));
          bump(returned[d].ofBy.intent, p.intent);
        }
      }
    }
    if (!inWindow(r)) continue;

    switch (r.name) {
      case "onboarding_step": {
        const step = str(p.step) as CountStep | undefined;
        if (route && step && steps[route] && step in steps[route]) {
          steps[route][step] += 1;
          // Began: the first screen of each way in, not every screen seen.
          if (step === firstStep(route, typeof p.v === "number" ? p.v : 3)) began += 1;
        }
        break;
      }
      case "onboarding_answer": {
        const q = str(p.question) as CountQuestion | undefined;
        if (q && answers[q]) bump(answers[q], p.answer);
        const answer = str(p.answer);
        if (q === "intent" && answer) {
          const place = typeof p.place === "number" ? p.place : 1;
          if (place === 1) bump(picks.first, answer);
          bump((picks.places[answer] ??= {}), String(place));
        }
        break;
      }
      case "onboarding_skipped":
        skipped += 1;
        bump(skippedAt, p.at);
        break;
      case "onboarding_finished": {
        finished += 1;
        bump(finishedBy.background, p.background);
        bump(finishedBy.level, p.level);
        bump(finishedBy.intent, p.intent);
        bump(finishedBy.platform, p.platform);
        bump(finishedBy.door, p.door);
        bump(finishedBy.route, route);
        bump(finishedBy.account, p.account === true ? "yes" : "no");
        bump(finishedBy.road, countedRoad(p));
        const w = weekOf(r.ts);
        const wk = weeks.get(w) ?? { finished: 0, byBackground: {} };
        wk.finished += 1;
        bump(wk.byBackground, p.background);
        weeks.set(w, wk);
        break;
      }
      case "onboarding_dayone":
        bump(dayOne, p.key);
        break;
      case "onboarding_returned": {
        const d = p.day as ReturnDay;
        if (returned[d]) {
          returned[d].count += 1;
          bump(returned[d].byBackground, p.background);
          bump(returned[d].byDoor, p.door);
          bump(returned[d].byRoad, countedRoad(p));
          bump(returned[d].byIntent, p.intent);
        }
        break;
      }
    }
  }

  const summary: OnboardingSummary = {
    days,
    steps,
    began,
    skippedAt,
    skipped,
    finished,
    answers,
    picks,
    finishedBy,
    dayOne,
    returned,
    weeks: [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, v]) => ({ week, ...v })),
    sentences: [],
  };
  summary.sentences = sentencesFor(summary);
  return summary;
}

/** One road, or one first pick: how many finished, and how many came back of those who could have. */
export type GroupRow = { key: string; finished: number; back: Record<ReturnDay, { count: number; of: number }> };

/**
 * The sums by road, or by first pick, as Admin's table draws them: every
 * group that finished or could have come back, the most finishes first.
 */
export function byGroup(s: Pick<OnboardingSummary, "finishedBy" | "returned">, by: "road" | "intent"): GroupRow[] {
  const came = (d: ReturnDay) => (by === "road" ? s.returned[d].byRoad : s.returned[d].byIntent);
  const keys = new Set<string>(Object.keys(s.finishedBy[by]));
  for (const d of RETURN_DAYS) for (const k of [...Object.keys(s.returned[d].ofBy[by]), ...Object.keys(came(d))]) keys.add(k);
  return [...keys]
    .map((key) => ({
      key,
      finished: s.finishedBy[by][key] ?? 0,
      back: Object.fromEntries(RETURN_DAYS.map((d) => [d, { count: came(d)[key] ?? 0, of: s.returned[d].ofBy[by][key] ?? 0 }])) as GroupRow["back"],
    }))
    .sort((a, b) => b.finished - a.finished || a.key.localeCompare(b.key));
}

/**
 * The share who came back, or null while fewer than twenty could have: a
 * share of three readers is close to a description of three people, and no
 * finding either (the tests' own rule, lib/ab/panel.ts).
 */
export function shareBack(c: { count: number; of: number }): number | null {
  return c.of >= SMALLEST_CELL ? c.count / c.of : null;
}

/** The week in words, the way the owner reads it. */
export function sentencesFor(s: OnboardingSummary): string[] {
  const out: string[] = [];
  const span = s.days === 7 ? "this week" : `in the last ${s.days} days`;
  if (!s.finished && !s.skipped) {
    out.push(`No reader went through the welcome questions ${span}.`);
    return out;
  }
  out.push(`${plural(s.finished, "reader", "readers")} finished the welcome questions ${span}, and ${s.skipped} skipped them.`);

  const bg = Object.entries(s.finishedBy.background).sort((a, b) => b[1] - a[1]);
  if (bg.length) {
    out.push(
      `Where they come from: ${list(bg.map(([k, n]) => plural(n, BACKGROUND_WORDS[k]?.[0] ?? k, BACKGROUND_WORDS[k]?.[1] ?? k)))}.`,
    );
  }
  const lv = Object.entries(s.finishedBy.level).sort((a, b) => b[1] - a[1]);
  if (lv.length) out.push(`How familiar: ${list(lv.map(([k, n]) => `${n} ${LEVEL_WORDS[k] ?? k}`))}.`);

  const looked = Object.entries(s.answers.intent).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (looked.length) {
    const first = Object.entries(s.picks.first).sort((a, b) => b[1] - a[1])[0];
    out.push(
      `What they look for most: ${list(looked.map(([k, n]) => `${INTENT_WORDS[k] ?? k} (${n})`))}` +
        (first ? `; picked first most often, ${INTENT_WORDS[first[0]] ?? first[0]} (${first[1]}).` : "."),
    );
  }

  const stop = Object.entries(s.skippedAt).sort((a, b) => b[1] - a[1])[0];
  if (stop) out.push(`Most skipped at ${STEP_WORDS[stop[0]] ?? stop[0]} (${stop[1]}).`);

  for (const d of RETURN_DAYS) {
    const r = s.returned[d];
    if (!r.of && !r.count) continue;
    const when = d === 2 ? "after two days" : d === 7 ? "after a week" : "after a month";
    const top = Object.entries(r.byBackground).sort((a, b) => b[1] - a[1])[0];
    const who = top ? `, most of them ${BACKGROUND_WORDS[top[0]]?.[1] ?? top[0]}` : "";
    out.push(`${r.count} came back ${when}, of ${r.of} who could have${who}.`);
  }

  const door = Object.entries(s.finishedBy.door).sort((a, b) => b[1] - a[1])[0];
  if (door) out.push(`The link that brought the most finishers: ${door[0]} (${door[1]}).`);
  return out;
}
