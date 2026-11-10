// How a test learns (1.9): the share of new devices each version is given,
// worked out from the totals. The owner's word of 2026-11-10: "ensure you
// have a A/B test based around this. a self learning criterion etc". The
// design he agreed is docs/1.9-build/notes/onboarding-fable.md, section 10.
//
// The rule, in the order it is applied:
//
//   1. Only devices whose two weeks are behind them are read (MATURE_DAYS):
//      every milestone is something that happened in a device's first two
//      weeks after it was shown its version (./milestones.ts), so a version
//      whose devices are newer is never judged on less time.
//   2. Until every version has `warmup` such devices, the shares are equal.
//   3. Then each version's share is the chance, on the counts so far, that
//      it is the best on the one count the test is judged by (Thompson
//      sampling, worked out exactly rather than drawn, so the same counts
//      always give the same shares).
//   4. Limits: no version falls under `floor` while the test runs, so the
//      system can change its mind; and a version clearly behind on a count
//      that must not get worse is "held", never above an equal share.
//   5. Settled: every version has the readers the test said it needs, one is
//      ahead 19 chances in 20 and is not held. Every new device gets it.
//      Making it permanent is the owner's word, and a commit.
//   6. Past its last day unsettled, a test goes back to the version that was
//      built (its first arm).
//
// Pure: no clock, no network, no random number. lib/ab/__tests__/bandit.test.ts.

import type { Milestone } from "./milestones";
import type { AbTest } from "./tests";

/** A device counts once its fourteenth day after being shown has passed. */
export const MATURE_DAYS = 14;
/** "19 chances in 20". */
export const SURE = 0.95;
/** A version a fifth or more behind on a guardrail is clearly worse. */
export const BEHIND = 0.2;

export type ArmTally = {
  arm: string;
  /** Every device shown this version. */
  shown: number;
  /** Of them, those whose two weeks are behind them. */
  matured: number;
  /** Of the matured, how many reached each milestone. */
  reached: Partial<Record<Milestone, number>>;
};

export type TestState = "waiting" | "learning" | "leaning" | "held" | "settled" | "ended";

export type Verdict = {
  state: TestState;
  /** Each version's share of new devices, summing to 1. */
  weights: Record<string, number>;
  /** The version ahead on the judge, once there is enough to say; null before. */
  leader: string | null;
  /** The chance each version is the best on the judge, null during warmup. */
  best: Record<string, number> | null;
  /** Versions held back, and the count each is behind on. */
  held: { arm: string; guard: Milestone }[];
};

// ── Beta distributions, worked out on a grid ──────────────────────────────

/** Lanczos' approximation of ln Γ(x), x > 0. */
function lnGamma(x: number): number {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
  let y = x;
  let ser = 1.000000000190015;
  for (const c of g) ser += c / ++y;
  const t = x + 5.5;
  return -(t - (x + 0.5) * Math.log(t)) + Math.log((2.5066282746310005 * ser) / x);
}

const GRID = 2000;

/** The density of Beta(a, b) at the middle of each of GRID cells of (0, 1), as probabilities summing to 1. */
function betaCells(a: number, b: number): Float64Array {
  const cells = new Float64Array(GRID);
  const norm = lnGamma(a + b) - lnGamma(a) - lnGamma(b);
  let sum = 0;
  for (let i = 0; i < GRID; i++) {
    const x = (i + 0.5) / GRID;
    const p = Math.exp(norm + (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x));
    cells[i] = p;
    sum += p;
  }
  for (let i = 0; i < GRID; i++) cells[i] /= sum;
  return cells;
}

/** What is believed of a rate after `hits` of `of`, starting from knowing nothing: Beta(1 + hits, 1 + misses). */
function belief(hits: number, of: number): Float64Array {
  const h = Math.max(0, Math.min(hits, of));
  return betaCells(1 + h, 1 + Math.max(0, of - h));
}

/**
 * The chance each rate is the highest. For each, the chance it sits in a
 * cell times the chance every other sits below that cell (half a cell's
 * weight where two share one, so ties split evenly).
 */
export function chanceBest(counts: readonly { hits: number; of: number }[]): number[] {
  const cells = counts.map((c) => belief(c.hits, c.of));
  const below = cells.map((c) => {
    const cum = new Float64Array(GRID);
    let run = 0;
    for (let i = 0; i < GRID; i++) {
      cum[i] = run + c[i] / 2;
      run += c[i];
    }
    return cum;
  });
  const out = cells.map((mine, me) => {
    let p = 0;
    for (let i = 0; i < GRID; i++) {
      let others = 1;
      for (let j = 0; j < cells.length; j++) if (j !== me) others *= below[j][i];
      p += mine[i] * others;
    }
    return p;
  });
  const sum = out.reduce((a, b) => a + b, 0) || 1;
  return out.map((p) => p / sum);
}

/** The chance rate A is under (1 - margin) of rate B. */
export function chanceBehind(a: { hits: number; of: number }, b: { hits: number; of: number }, margin = BEHIND): number {
  const mine = belief(a.hits, a.of);
  const theirs = belief(b.hits, b.of);
  const cum = new Float64Array(GRID + 1);
  for (let i = 0; i < GRID; i++) cum[i + 1] = cum[i] + mine[i];
  let p = 0;
  for (let i = 0; i < GRID; i++) {
    // Everything of A below (1 - margin) of B's cell.
    const edge = ((1 - margin) * (i + 0.5)) / GRID;
    const at = Math.min(GRID, Math.max(0, edge * GRID));
    const whole = Math.floor(at);
    const part = whole < GRID ? (at - whole) * mine[whole] : 0;
    p += theirs[i] * (cum[whole] + part);
  }
  return p;
}

// ── Shares within limits ──────────────────────────────────────────────────

/**
 * Shares in proportion to `want`, none under `floor` and none over its own
 * cap, summing to 1. What a floor needs is taken from the versions above it,
 * in proportion to how far above they stand; what a cap takes off is given
 * to the versions with room under theirs, in proportion to the room. A cap
 * is never under an equal share and a floor never over one, so there is
 * always a way to keep both.
 */
export function shares(want: readonly number[], floor: number, caps: readonly number[]): number[] {
  const n = want.length;
  const lo = Math.min(floor, 1 / n);
  const hi = caps.map((c) => Math.max(c, 1 / n));
  const total = want.reduce((a, b) => a + Math.max(b, 0), 0);
  let w = want.map((x) => (total > 0 ? Math.max(x, 0) / total : 1 / n));
  for (let round = 0; round < 8; round++) {
    // Caps first: what is over is given to the versions with room.
    const over = w.reduce((a, x, i) => a + Math.max(0, x - hi[i]), 0);
    if (over > 1e-12) {
      const room = w.map((x, i) => Math.max(0, hi[i] - x));
      const all = room.reduce((a, b) => a + b, 0);
      w = w.map((x, i) => (x > hi[i] ? hi[i] : x + (all > 0 ? (room[i] / all) * over : 0)));
    }
    // Then floors: what is missing is taken from the versions above theirs.
    const short = w.reduce((a, x) => a + Math.max(0, lo - x), 0);
    if (short > 1e-12) {
      const spare = w.map((x) => Math.max(0, x - lo));
      const all = spare.reduce((a, b) => a + b, 0);
      w = w.map((x, i) => (x < lo ? lo : x - (all > 0 ? (spare[i] / all) * short : 0)));
    }
    if (over <= 1e-12 && short <= 1e-12) break;
  }
  return w;
}

// ── The verdict ───────────────────────────────────────────────────────────

const equal = (arms: readonly string[]) => Object.fromEntries(arms.map((a) => [a, 1 / arms.length]));
const only = (arms: readonly string[], one: string) => Object.fromEntries(arms.map((a) => [a, a === one ? 1 : 0]));

/**
 * What a test's totals say today: the shares, and where the test stands.
 * `today` is YYYY-MM-DD (UTC); `tallies` holds one entry for each arm, in
 * any order (an arm with no rows yet counts as nothing shown).
 */
export function verdict(test: AbTest, tallies: readonly ArmTally[], today: string): Verdict {
  const arms = test.arms;
  const of = (arm: string): ArmTally => tallies.find((t) => t.arm === arm) ?? { arm, shown: 0, matured: 0, reached: {} };
  const rate = (arm: string, what: Milestone) => ({ hits: of(arm).reached[what] ?? 0, of: of(arm).matured });

  if (arms.some((a) => of(a).matured < test.warmup)) {
    // Past its last day with too few to say anything: the version that was built.
    if (today > test.ends) return { state: "ended", weights: only(arms, arms[0]), leader: null, best: null, held: [] };
    return { state: "waiting", weights: equal(arms), leader: null, best: null, held: [] };
  }

  const p = chanceBest(arms.map((a) => rate(a, test.judge)));
  const best = Object.fromEntries(arms.map((a, i) => [a, p[i]]));
  const leader = arms[p.indexOf(Math.max(...p))];

  // A version clearly behind another on a count that must not get worse.
  const held: Verdict["held"] = [];
  for (const arm of arms) {
    for (const guard of test.guards) {
      const behind = arms.some((other) => other !== arm && chanceBehind(rate(arm, guard), rate(other, guard)) >= SURE);
      if (behind) {
        held.push({ arm, guard });
        break;
      }
    }
  }
  const isHeld = (arm: string) => held.some((h) => h.arm === arm);

  const enough = arms.every((a) => of(a).matured >= test.needs);
  if (enough && best[leader] >= SURE && !isHeld(leader)) {
    return { state: "settled", weights: only(arms, leader), leader, best, held };
  }
  if (today > test.ends) return { state: "ended", weights: only(arms, arms[0]), leader, best, held };

  const caps = arms.map((a) => (isHeld(a) ? 1 / arms.length : 1));
  const w = shares(p, test.floor, caps);
  const weights = Object.fromEntries(arms.map((a, i) => [a, w[i]]));
  const state: TestState = isHeld(leader) ? "held" : Math.max(...w) > 1 / arms.length + 0.05 ? "leaning" : "learning";
  return { state, weights, leader, best, held };
}

// ── The totals, from the rows ─────────────────────────────────────────────

export type AbRow = { name: string; props: Record<string, unknown>; ts: string };

/** YYYY-MM-DD, `days` before a day. */
export function daysBefore(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * One test's totals. A "shown" row is kept under the day the device was
 * shown its version, and so is every "reached" row of that device
 * (app/api/track/event files it there), so the matured are simply the rows
 * of a day at least MATURE_DAYS back, and like is compared with like.
 */
export function tally(test: AbTest, rows: readonly AbRow[], today: string): ArmTally[] {
  const ripe = daysBefore(today, MATURE_DAYS);
  const out = new Map<string, ArmTally>(test.arms.map((arm) => [arm, { arm, shown: 0, matured: 0, reached: {} }]));
  for (const row of rows) {
    if (row.props.test !== test.id || typeof row.props.arm !== "string") continue;
    const t = out.get(row.props.arm);
    if (!t) continue;
    const day = row.ts.slice(0, 10);
    if (day < test.begins) continue;
    if (row.name === "ab_exposed") {
      t.shown++;
      if (day <= ripe) t.matured++;
    } else if (row.name === "ab_reached" && day <= ripe) {
      const what = row.props.what as Milestone;
      t.reached[what] = (t.reached[what] ?? 0) + 1;
    }
  }
  return [...out.values()];
}
