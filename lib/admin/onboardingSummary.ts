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

export type OnboardingRow = { name: string; props: Record<string, unknown>; ts: string };

type Tally = Record<string, number>;

export type OnboardingSummary = {
  days: number;
  /** Readers who reached each screen, by way in. */
  steps: Record<CountRoute, Record<CountStep, number>>;
  /** Where readers left the questions with Skip. */
  skippedAt: Tally;
  skipped: number;
  finished: number;
  /** Each question's answers, as given (not only by those who finished). */
  answers: Record<CountQuestion, Tally>;
  /** Those who finished, by what they said and how they came. */
  finishedBy: { background: Tally; level: Tally; intent: Tally; platform: Tally; door: Tally; route: Tally; account: Tally };
  /** Day 1 steps opened from Today. */
  dayOne: Tally;
  /** Came back after 2, 7 and 30 days: the count, and of how many could have. */
  returned: Record<ReturnDay, { count: number; of: number; byBackground: Tally; byDoor: Tally }>;
  /** Finishes week by week (weeks starting Monday, UTC), by background. */
  weeks: { week: string; finished: number; byBackground: Tally }[];
  sentences: string[];
};

const DAY = 86_400_000;

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

const BACKGROUND_WORDS: Record<string, [string, string]> = {
  orthodox: ["Orthodox reader", "Orthodox readers"],
  catholic: ["Catholic", "Catholics"],
  protestant: ["Protestant", "Protestants"],
  "other-faith": ["reader of another faith", "readers of another faith"],
  none: ["reader of no faith", "readers of no faith"],
  "prefer-not": ["reader who would rather not say", "readers who would rather not say"],
};
const LEVEL_WORDS: Record<string, string> = { inquirer: "completely new", learning: "learning", practicing: "practicing" };
const STEP_WORDS: Record<string, string> = {
  welcome: "the welcome",
  returning: "the welcome back",
  account: "the account screen",
  background: "where they come from",
  level: "how familiar they are",
  rule: "calendar and fast",
  intent: "what to focus on",
  reminders: "reminders",
  handoff: "the last screen",
};

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
  const finishedBy = { background: {}, level: {}, intent: {}, platform: {}, door: {}, route: {}, account: {} } as OnboardingSummary["finishedBy"];
  const skippedAt: Tally = {};
  const dayOne: Tally = {};
  const returned = Object.fromEntries(
    RETURN_DAYS.map((d) => [d, { count: 0, of: 0, byBackground: {}, byDoor: {} }]),
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
        if (due <= now.getTime() && due >= since) returned[d].of += 1;
      }
    }
    if (!inWindow(r)) continue;

    switch (r.name) {
      case "onboarding_step": {
        const step = str(p.step) as CountStep | undefined;
        if (route && step && steps[route] && step in steps[route]) steps[route][step] += 1;
        break;
      }
      case "onboarding_answer": {
        const q = str(p.question) as CountQuestion | undefined;
        if (q && answers[q]) bump(answers[q], p.answer);
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
        }
        break;
      }
    }
  }

  const summary: OnboardingSummary = {
    days,
    steps,
    skippedAt,
    skipped,
    finished,
    answers,
    finishedBy,
    dayOne,
    returned,
    weeks: [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, v]) => ({ week, ...v })),
    sentences: [],
  };
  summary.sentences = sentencesFor(summary);
  return summary;
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
