// What the owner's weekly brief says of each test (docs/plans/onboarding-2.0.md,
// "What a ten is", section 6: "every running test says each week: wait,
// version A, version B, or stop"). Admin's panel has said where a test stands
// since 1.9, to whoever opens it. A test nobody opens is a test nobody ends,
// so the brief brings each one's answer to him once a week.
//
// Pure: the rows and the day are handed in, so every answer is tested
// directly (lib/ab/__tests__/briefLines.test.ts). It holds no reader and
// shows no small count, as the panel does (lib/ab/panel.ts, SMALLEST_CELL).

import { tally, verdict, type AbRow, type Verdict } from "./bandit";
import { panelOf, SMALLEST_CELL } from "./panel";
import { runningTest, type AbLit, type AbTest } from "./tests";

export type TestLine = {
  id: string;
  /** The question, as Admin's panel asks it. */
  asks: string;
  /** The week's one answer: "Wait", a version by its name in quotes, or "Stop". */
  word: string;
  /** Where it stands, in the panel's own sentence. */
  line: string;
  /** How far it has come and its last day, in a sentence. */
  progress: string;
  /** True when the answer is his to act on: a version to make permanent, or a test that ended. */
  needsHim: boolean;
};

const n = (x: number) => x.toLocaleString("en-US");
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** The one word: a settled test names its version, an ended one says stop, and every other state waits. */
export function wordOf(v: Pick<Verdict, "state" | "leader">): string {
  if (v.state === "settled" && v.leader) return `"${v.leader}"`;
  if (v.state === "ended") return "Stop";
  return "Wait";
}

/**
 * One line for each test that is running on `today`, and one more for a test
 * whose last day fell in the week the brief reports (from `weekStart`), so
 * its end is said once and not missed. A test that has not begun is not
 * listed: Admin's panel says why it waits. Days are YYYY-MM-DD (UTC).
 */
export function testLines(
  tests: readonly AbTest[],
  rows: readonly AbRow[],
  opts: { today: string; weekStart: string; lit: AbLit },
): TestLine[] {
  const out: TestLine[] = [];
  for (const test of tests) {
    const tallies = tally(test, rows, opts.today);
    const running = runningTest(test.surface, opts.today, opts.lit, tests)?.id === test.id;
    const began = tallies.some((t) => t.shown > 0);
    const endedInWeek = began && test.ends < opts.today && test.ends >= opts.weekStart;
    if (!running && !endedInWeek) continue;

    const v = verdict(test, tallies, opts.today);
    const least = Math.min(...test.arms.map((arm) => tallies.find((t) => t.arm === arm)?.matured ?? 0));
    const have = least < SMALLEST_CELL ? `fewer than ${SMALLEST_CELL}` : n(least);
    const word = wordOf(v);
    out.push({
      id: test.id,
      asks: test.asks,
      word,
      line: panelOf(test, tallies, v, running).line,
      progress: `Its smallest version has ${have} of the ${n(test.needs)} devices it needs past their second week. Its last day ${running ? "is" : "was"} ${longDate(test.ends)}.`,
      needsHim: word !== "Wait",
    });
  }
  return out;
}
