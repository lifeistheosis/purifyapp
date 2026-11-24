/**
 * His milestones, counted (the Goals page; the plan is
 * docs/plans/goals-milestones.md, the hand-over docs/handoffs/admin-milestones.md).
 *
 * One number leads: recurring subscription income a week, after the stores'
 * share. A monthly member counts their own price times 12 over 52, a yearly
 * member their price over 52, from their own events. Everything else on the
 * page is worked out from the same kept events (public.plus_events, from 1.9's
 * release) each time the page opens. Pure: the route reads, this counts.
 *
 * What is counted, and what is not:
 *   - Plus, monthly and yearly. Pro (the EIKON Box membership) is left out
 *     until his word on whether it counts after the cost of its box.
 *   - Never: test money, grants, gifts and comps (not in the events as paid),
 *     trials that have not paid, his own account (`ownerIds`).
 *   - A member who joined before 1.9 first shows at their next renewal, so the
 *     number fills in over the first month (monthly) and year (yearly).
 *
 * Honest by construction: before four full weeks are kept there is no rate,
 * no day and no aim (`enoughOn` says when there will be); a level is reached
 * when the number has stood at or over it at the end of four weeks running,
 * and is kept once reached; a figure that cannot be read is left out, never
 * guessed. His marks are counted after the app's own monthly costs (his yes
 * of 2026-11-24): each step stands on the costs, `bills`.
 */

import { PLAN_PRICE_CENTS } from "@/lib/premium/plans";
import { afterStoreCents, counts, isRefund, planOf, tally, weekOf, type PlusFact } from "./plusHistory";

// ── The page's figures ───────────────────────────────────────────────────

export type GoalStepId = "bills" | "tenth" | "quarter" | "half" | "first" | "second";

export type GoalStep = {
  id: GoalStepId;
  /** Its plain name: "Halfway", or the name he gave a mark. */
  name: string;
  /** What the number must reach, in cents a week. */
  weeklyCents: number;
  /** The day it was reached (held four weeks running), or null. */
  reachedOn: string | null;
  /** Weeks running the number has stood at or over it, before it is reached (0 to 3). */
  heldWeeks: number;
  /** More paying members it needs at today's mix; null once reached. */
  moreMembers: number | null;
  /** The day it is reached at the last four weeks' pace; null without one. For a step the number already stands over, the day its four weeks are up. */
  byPace: string | null;
  /** The day it is reached at 5% a week; null without four weeks. */
  byFive: string | null;
};

export type Mover = {
  id: "readers" | "begin" | "pay" | "leave";
  /** This week: a count for readers, a share (0 to 1) for the rest. */
  value: number;
  /** His own last four weeks, bettered by 5%. */
  aim: number;
};

export type ReleaseLine = {
  version: string;
  from: string;
  /** The next release's day, or null for the newest. */
  to: string | null;
  joined: number;
  left: number;
  /** The share of paying members who left a month, over its days. */
  leftAMonth: number | null;
  /** The share of trials that paid. */
  trialsPaid: number | null;
};

export type GoalMark = { name: string; weeklyCents: number };

export type GoalsData = {
  /** Today, YYYY-MM-DD, UTC. */
  today: string;
  /** The Monday this week began. */
  week: string;
  /** Null once four full weeks are kept; until then, the Monday they will be. */
  enoughOn: string | null;
  weeklyCents: number;
  /** On last week, as a share; null before two weeks. */
  growth: number | null;
  /** The number's average gain a week over the last four, in cents. */
  paceCents: number | null;
  paying: { monthly: number; yearly: number };
  /** Paying members with no kept event yet, counted at list price (est.); their share of weeklyCents. */
  carried: { members: number; weeklyCents: number };
  thisWeek: { joined: number; left: number };
  steps: GoalStep[];
  /** The step reached this week, for its moment at the head. */
  justReached: GoalStepId | null;
  movers: Mover[] | null;
  lever: "joining" | "leaving" | "monthly" | null;
  /** New members a month that only replace the ones who leave. */
  standStill: number | null;
  releases: ReleaseLine[];
  rating: { stars: number | null; store: string; held: boolean | null };
  refunds: { count: number; payments: number; low: boolean };
  mix: {
    monthlyCents: number;
    yearlyCents: number;
    /** The monthly share of the number a month ago. */
    monthlyShareBefore: number | null;
    leftMonthly: { left: number; of: number } | null;
    leftYearly: { left: number; of: number } | null;
    renewalOff: number;
    cardFailed: number;
    /** The next step's members, if every new one were monthly, or yearly. */
    allMonthly: number | null;
    allYearly: number | null;
  };
  extra: { monthCents: number; orders: number } | null;
  marks: GoalMark[];
  /** Weeks in a row the number has grown on the week before, and the longest such run. */
  streak: { weeks: number; best: number };
  /** Days left in this week, today included (weeks run Monday to Sunday, UTC). */
  daysLeft: number;
  /** Weeks with all four quests met. */
  perfectWeeks: number;
  /** Badges: each for a real event in the kept numbers, earned on a day or not yet. */
  badges: { id: string; name: string; how: string; earnedOn: string | null; /** 1 (easy, green) to 5 (gold). */ tier: number }[];
  /** Personal bests, each a real figure and the day it was set. */
  records: { name: string; value: number; unit: "money" | "count" | "weeks" | "share"; on: string | null; isNew: boolean }[];
  /** The email when he hits a goal: on unless he turns it off (set by the route, not counted). */
  mail?: boolean;
};


// ── The measure ──────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
/** A renewal can land a little after the period it renews ends. */
const GRACE_MS = 3 * DAY_MS;

export type MilestonesInput = {
  facts: readonly PlusFact[];
  /** The first kept event, or null when none is kept yet. */
  since: string | null;
  now: Date;
  /** His own account(s), never counted. */
  ownerIds: ReadonlySet<string>;
  /** His two marks, a week, after the app's costs; empty until he sets them. */
  marks: readonly GoalMark[];
  /** Every active expense line, in cents a month. */
  monthlyCostsCents: number;
  /** Releases from data/changelog/patches.json: a version and its day. */
  releases: readonly { version: string; date: string }[];
  /** New accounts by UTC day (analytics), or null when they could not be read. */
  signupsByDay: ReadonlyMap<string, number> | null;
  /** The store's rating, when it can be read. */
  rating: { stars: number | null; store: string } | null;
  /** Shop sales this month, when they can be read. */
  extra: { monthCents: number; orders: number } | null;
  /**
   * Accounts paying by the entitlements (a store or Stripe, Plus now) whether
   * or not an event of theirs is kept. Those with no kept event joined before
   * 1.9 began keeping them (2026-11-17) and have not renewed since; they are
   * counted as carried over (CARRIED_WEEKLY_CENTS each, est.) until their
   * first event lands. His yes, 2026-11-24 ("recommended do that").
   */
  payingIds?: readonly string[];
};

/** A carried-over member a week: the monthly list price less the stores' 15%, as a week. */
export const CARRIED_WEEKLY_CENTS = Math.round((PLAN_PRICE_CENTS.plusMonthly * 0.85 * 12) / 52);

/** Monthly or yearly, read word by word from the store's product name, as planOf reads the plan. */
export function periodOf(productId: string | null | undefined): "monthly" | "yearly" | null {
  const words = new Set((productId ?? "").toLowerCase().split(/[^a-z0-9]+/));
  const monthly = ["monthly", "month", "months", "p1m", "1m"].some((w) => words.has(w));
  const yearly = ["annual", "annually", "yearly", "year", "years", "p1y", "1y"].some((w) => words.has(w));
  return monthly === yearly ? null : monthly ? "monthly" : "yearly";
}

/** What one paid event is worth a week, after the store's share, by its period. */
export function weeklyValueCents(f: PlusFact): number {
  const period = periodOf(f.product_id);
  if (!period) return 0;
  const cents = afterStoreCents(f);
  if (cents <= 0) return 0;
  return Math.round(period === "monthly" ? (cents * 12) / 52 : cents / 52);
}

/** Plus, or a product whose name names no plan; never Pro (see the head of this file). */
const isPlusish = (f: PlusFact) => planOf(f.product_id) !== "box";

type Member = { period: "monthly" | "yearly" | null; weeklyCents: number; until: number | null };

/** Opens a paid period: a first purchase that is not a trial, or any renewal (a trial that paid among them). */
const opens = (f: PlusFact) => (f.type === "INITIAL_PURCHASE" && f.period_type !== "TRIAL") || f.type === "RENEWAL" || f.type === "PRODUCT_CHANGE" || f.type === "UNCANCELLATION";
/** Ends it: a paid membership that ran out, or a purchase given back. */
const ends = (f: PlusFact) => (f.type === "EXPIRATION" && f.period_type !== "TRIAL") || isRefund(f);

/**
 * Who is paying at moment `t`, and what each is worth a week: each member's
 * events up to `t`, in order, opening and ending paid periods.
 */
export function payingAt(facts: readonly PlusFact[], t: number, ownerIds: ReadonlySet<string>): Map<string, Member> {
  const out = new Map<string, Member>();
  for (const f of facts) {
    if (!f.user_id || ownerIds.has(f.user_id) || !counts(f) || !isPlusish(f)) continue;
    if (Date.parse(f.event_at) > t) break;
    if (ends(f)) out.delete(f.user_id);
    else if (opens(f)) {
      const value = weeklyValueCents(f);
      const seen = out.get(f.user_id);
      // An uncancellation or a change with no price keeps what the member was worth.
      out.set(f.user_id, {
        period: periodOf(f.product_id) ?? seen?.period ?? null,
        weeklyCents: value > 0 ? value : (seen?.weeklyCents ?? 0),
        until: f.expires_at ? Date.parse(f.expires_at) : (seen?.until ?? null),
      });
    }
  }
  for (const [id, m] of out) if (m.until !== null && t >= m.until + GRACE_MS) out.delete(id);
  return out;
}

const sum = (m: Map<string, Member>) => [...m.values()].reduce((n, x) => n + x.weeklyCents, 0);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const mondayOf = (ms: number) => Date.parse(`${weekOf(new Date(ms).toISOString())}T00:00:00Z`);

/** Members a sum of money a week stands for, at a worth a member: rounded up, never a fraction of a person. */
const membersFor = (cents: number, perMember: number) => (perMember > 0 ? Math.ceil(cents / perMember) : null);

export function milestones(input: MilestonesInput): GoalsData {
  const { now, ownerIds } = input;
  const t = now.getTime();
  const facts = [...input.facts].sort((a, b) => Date.parse(a.event_at) - Date.parse(b.event_at));
  const mine = facts.filter((f) => !f.user_id || !ownerIds.has(f.user_id)).filter(isPlusish);
  const thisMonday = mondayOf(t);

  // The weeks kept whole: from the first Monday on or after the first event.
  const sinceMs = input.since ? Date.parse(input.since) : t;
  const firstMonday = mondayOf(sinceMs) === sinceMs ? sinceMs : mondayOf(sinceMs) + WEEK_MS;
  const fullWeeks = Math.max(0, Math.floor((thisMonday - firstMonday) / WEEK_MS));
  const enough = fullWeeks >= 4;
  const enoughOn = enough ? null : iso(firstMonday + 4 * WEEK_MS);

  // The number at the start, at the end of each whole week, and now.
  const ends_ = Array.from({ length: fullWeeks + 1 }, (_, i) => firstMonday + i * WEEK_MS);
  const atEnd = ends_.map((ms) => payingAt(facts, ms - 1, ownerIds));
  const values = atEnd.map(sum);
  const nowPaying = payingAt(facts, t, ownerIds);
  // Carried over: paying now, with no kept event at all (see payingIds).
  const known = new Set(facts.map((f) => f.user_id).filter((id): id is string => !!id));
  const carriedCount = (input.payingIds ?? []).filter((id) => !known.has(id) && !ownerIds.has(id)).length;
  const carriedCents = carriedCount * CARRIED_WEEKLY_CENTS;
  const keptCents = sum(nowPaying);
  const weeklyCents = keptCents + carriedCents;
  const last = values.length > 1 ? values[values.length - 1] : null;
  // Growth compares kept with kept: the carried were never in the history.
  const growth = fullWeeks >= 1 && last !== null && last > 0 ? (keptCents - last) / last : null;
  const paceCents = enough ? Math.round((values[values.length - 1] - values[values.length - 5]) / 4) : null;

  // The streak: whole weeks in a row the number grew on the week before.
  let run = 0;
  let best = 0;
  let bestEnd = -1;
  for (let i = 1; i < values.length; i++) {
    run = values[i] > values[i - 1] ? run + 1 : 0;
    if (run > best) {
      best = run;
      bestEnd = i;
    }
  }
  const streak = { weeks: run, best };

  // The steps: the app's own bills, then a tenth, a quarter and half of his first mark, then his marks, each on the costs.
  const costs = Math.round((input.monthlyCostsCents * 12) / 52);
  const [m1, m2] = input.marks;
  const plan: { id: GoalStepId; name: string; weeklyCents: number }[] = [{ id: "bills", name: "Pays its own bills", weeklyCents: costs }];
  if (m1 && m1.weeklyCents > 0) {
    plan.push(
      { id: "tenth", name: "A tenth of the way", weeklyCents: costs + Math.round(m1.weeklyCents / 10) },
      { id: "quarter", name: "A quarter of the way", weeklyCents: costs + Math.round(m1.weeklyCents / 4) },
      { id: "half", name: "Halfway", weeklyCents: costs + Math.round(m1.weeklyCents / 2) },
      { id: "first", name: m1.name || "The first mark", weeklyCents: costs + m1.weeklyCents },
    );
    if (m2 && m2.weeklyCents > m1.weeklyCents) plan.push({ id: "second", name: m2.name || "The second mark", weeklyCents: costs + m2.weeklyCents });
  }
  const perMember = nowPaying.size + carriedCount > 0 ? weeklyCents / (nowPaying.size + carriedCount) : 0;
  const weeksTo = (target: number) => {
    if (paceCents === null || paceCents <= 0) return null;
    return Math.ceil((target - weeklyCents) / paceCents);
  };
  const steps: GoalStep[] = plan.map((p) => {
    // Reached: at or over it at the end of four whole weeks running (values[1..] are week ends).
    let held = 0;
    let reachedOn: string | null = null;
    for (let i = 1; i < values.length; i++) {
      held = values[i] >= p.weeklyCents ? held + 1 : 0;
      if (held >= 4 && !reachedOn) reachedOn = iso(ends_[i]);
    }
    const toGo = Math.max(0, p.weeklyCents - weeklyCents);
    const over = toGo === 0;
    const pace = weeksTo(p.weeklyCents);
    return {
      ...p,
      reachedOn,
      heldWeeks: reachedOn ? 0 : Math.min(3, held),
      moreMembers: reachedOn || over ? null : membersFor(toGo, perMember),
      byPace: reachedOn ? null : over ? iso(thisMonday + (4 - Math.min(3, held)) * WEEK_MS) : enough && pace !== null ? iso(t + pace * WEEK_MS) : null,
      byFive: reachedOn || over || !enough || weeklyCents <= 0 ? null : iso(t + Math.ceil(Math.log(p.weeklyCents / weeklyCents) / Math.log(1.05)) * WEEK_MS),
    };
  });
  const justReached = steps.find((s) => s.reachedOn && Date.parse(s.reachedOn) >= thisMonday)?.id ?? null;

  // This week, and each whole week: joined, left, trials, and new readers.
  const weekFacts = (from: number, to: number) => mine.filter((f) => counts(f) && Date.parse(f.event_at) >= from && Date.parse(f.event_at) < to);
  const signups = (from: number, to: number) => {
    if (!input.signupsByDay) return null;
    let n = 0;
    for (let d = from; d < to; d += DAY_MS) n += input.signupsByDay.get(iso(d)) ?? 0;
    return n;
  };
  const thisTally = tally(weekFacts(thisMonday, t + 1));
  const weekMover = (from: number, to: number, payingAtStart: number) => {
    const w = tally(weekFacts(from, to));
    const readers = signups(from, to);
    const ended = w.trialsPaid + w.trialsEnded;
    return {
      readers,
      begin: readers && readers > 0 ? (w.trials + (w.joined - w.trialsPaid)) / readers : null,
      pay: ended > 0 ? w.trialsPaid / ended : null,
      leave: payingAtStart > 0 ? w.left / payingAtStart : null,
    };
  };
  const pastWeeks = ends_.slice(0, -1).map((from, i) => weekMover(from, from + WEEK_MS, atEnd[i].size));
  const current = weekMover(thisMonday, t + 1, payingAt(facts, thisMonday - 1, ownerIds).size);
  const aimOf = (key: "readers" | "begin" | "pay" | "leave", upTo: number) => {
    const last4 = pastWeeks.slice(Math.max(0, upTo - 4), upTo).map((w) => w[key]);
    if (last4.length < 4 || last4.some((v) => v === null)) return null;
    const avg = (last4 as number[]).reduce((a, b) => a + b, 0) / 4;
    return key === "leave" ? avg * 0.95 : avg * 1.05;
  };
  const MOVERS = ["readers", "begin", "pay", "leave"] as const;
  const moversOf = (w: (typeof pastWeeks)[number], upTo: number): Mover[] =>
    MOVERS.flatMap((id) => {
      const value = w[id];
      const aim = aimOf(id, upTo);
      return value === null || aim === null ? [] : [{ id, value, aim }];
    });
  const movers = enough ? moversOf(current, pastWeeks.length) : null;
  const met = (m: Mover) => (m.id === "leave" ? m.value <= m.aim : m.value >= m.aim);
  const perfect = pastWeeks.map((w, i) => {
    const ms = moversOf(w, i);
    return ms.length === 4 && ms.every(met);
  });
  const perfectWeeks = perfect.filter(Boolean).length;

  // The one lever: the quest furthest behind its aim; the leaving one asks for fewer leaving.
  let lever: GoalsData["lever"] = null;
  if (movers && movers.length) {
    const behind = movers
      .filter((m) => !met(m))
      .map((m) => ({ m, by: m.id === "leave" ? m.value / Math.max(m.aim, 1e-9) : m.aim / Math.max(m.value, 1e-9) }))
      .sort((a, b) => b.by - a.by)[0];
    lever = behind ? (behind.m.id === "leave" ? "leaving" : "joining") : null;
  }

  // Monthly and yearly, and who left in the last 30 days.
  const monthAgo = payingAt(facts, t - 30 * DAY_MS, ownerIds);
  const byPeriod = (m: Map<string, Member>, p: "monthly" | "yearly") => [...m.values()].filter((x) => x.period === p);
  const monthlyCents = byPeriod(nowPaying, "monthly").reduce((n, x) => n + x.weeklyCents, 0);
  const yearlyCents = byPeriod(nowPaying, "yearly").reduce((n, x) => n + x.weeklyCents, 0);
  const beforeTotal = sum(monthAgo);
  const leftOf = (p: "monthly" | "yearly") => {
    const was = [...monthAgo.entries()].filter(([, x]) => x.period === p);
    return was.length ? { left: was.filter(([id]) => !nowPaying.has(id)).length, of: was.length } : null;
  };
  const leftMonthly = enough ? leftOf("monthly") : null;
  const leftYearly = enough ? leftOf("yearly") : null;
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const monthTally = tally(mine.filter((f) => counts(f) && Date.parse(f.event_at) >= monthStart && Date.parse(f.event_at) <= t));
  const payments = mine.filter((f) => counts(f) && Date.parse(f.event_at) >= monthStart && Date.parse(f.event_at) <= t && afterStoreCents(f) > 0).length;
  const next = steps.find((s) => !s.reachedOn) ?? null;
  const toGoNext = next ? Math.max(0, next.weeklyCents - weeklyCents) : 0;
  const avgOf = (p: "monthly" | "yearly") => {
    const xs = byPeriod(nowPaying, p);
    return xs.length ? xs.reduce((n, x) => n + x.weeklyCents, 0) / xs.length : 0;
  };
  const leftLast30 = [...monthAgo.keys()].filter((id) => !nowPaying.has(id)).length;

  // Each release's line, newest first, from the first kept day.
  const rel = [...input.releases].sort((a, b) => b.date.localeCompare(a.date));
  const releases: ReleaseLine[] = [];
  for (let i = 0; i < rel.length; i++) {
    const fromMs = Date.parse(`${rel[i].date}T00:00:00Z`);
    const toDate = i > 0 ? rel[i - 1].date : null;
    const toMs = toDate ? Date.parse(`${toDate}T00:00:00Z`) : t + 1;
    if (toMs <= sinceMs) break;
    const w = tally(weekFacts(Math.max(fromMs, sinceMs), toMs));
    const atStart = payingAt(facts, Math.max(fromMs, sinceMs), ownerIds).size;
    const months = Math.max(1, (toMs - Math.max(fromMs, sinceMs)) / (30 * DAY_MS));
    const ended = w.trialsPaid + w.trialsEnded;
    releases.push({
      version: rel[i].version,
      from: rel[i].date,
      to: toDate,
      joined: w.joined,
      left: w.left,
      leftAMonth: atStart > 0 ? w.left / atStart / months : null,
      trialsPaid: ended > 0 ? w.trialsPaid / ended : null,
    });
  }

  // Badges, each for a real event in the kept numbers.
  const weekEnd = (i: number) => iso(ends_[i]);
  const firstWhere = (ok: (i: number) => boolean) => {
    for (let i = 1; i < values.length; i++) if (ok(i)) return weekEnd(i);
    return null;
  };
  const firstPaid = mine.find((f) => counts(f) && opens(f) && afterStoreCents(f) > 0);
  let streakAt4: string | null = null;
  for (let i = 1, r = 0; i < values.length; i++) {
    r = values[i] > values[i - 1] ? r + 1 : 0;
    if (r >= 4 && !streakAt4) streakAt4 = weekEnd(i);
  }
  const bestEndValue = Math.max(0, ...values.slice(1));
  const recordNow = weeklyCents > 0 && weeklyCents > bestEndValue;
  let lastRecord: string | null = null;
  for (let i = 1, top = 0; i < values.length; i++) {
    if (values[i] > top) {
      top = values[i];
      lastRecord = iso(ends_[i - 1]);
    }
  }
  const monthlyShareAt = (i: number) => {
    const all = sum(atEnd[i]);
    return all > 0 ? byPeriod(atEnd[i], "monthly").reduce((n, x) => n + x.weeklyCents, 0) / all : 0;
  };
  let keeper: string | null = null;
  for (let i = 3, r = 0; i < pastWeeks.length; i++) {
    r = 0;
    for (let j = i - 3; j <= i; j++) if (pastWeeks[j].leave !== null && (pastWeeks[j].leave as number) < 0.01) r++;
    if (r === 4 && !keeper) keeper = iso(ends_[i + 1]);
  }
  let cleanMonth: string | null = null;
  for (let m = Date.UTC(new Date(sinceMs).getUTCFullYear(), new Date(sinceMs).getUTCMonth() + 1, 1); ; ) {
    const nextM = Date.UTC(new Date(m).getUTCFullYear(), new Date(m).getUTCMonth() + 1, 1);
    if (nextM > t) break;
    const inMonth = mine.filter((f) => counts(f) && Date.parse(f.event_at) >= m && Date.parse(f.event_at) < nextM);
    if (inMonth.some((f) => afterStoreCents(f) > 0) && !inMonth.some(isRefund)) {
      cleanMonth = iso(nextM);
      break;
    }
    m = nextM;
  }
  const badges: GoalsData["badges"] = [
    { id: "first", name: "First member", how: "Your first paying member", earnedOn: firstPaid ? firstPaid.event_at.slice(0, 10) : null, tier: 1 },
    { id: "hundred", name: "100 members", how: "100 paying at once", earnedOn: firstWhere((i) => atEnd[i].size >= 100), tier: 2 },
    { id: "perfect", name: "Perfect week", how: "All four quests in one week", earnedOn: (() => { const i = perfect.indexOf(true); return i < 0 ? null : iso(ends_[i + 1]); })(), tier: 3 },
    { id: "streak", name: "Hot streak", how: "Four weeks of growth in a row", earnedOn: streakAt4, tier: 3 },
    { id: "record", name: "Record week", how: "Beat your best week", earnedOn: recordNow ? iso(thisMonday) : lastRecord, tier: 4 },
    { id: "monthly", name: "Monthly first", how: "Monthly is 70% of the number", earnedOn: firstWhere((i) => monthlyShareAt(i) >= 0.7), tier: 2 },
    { id: "keeper", name: "Keeper", how: "Under 1% leaving four weeks running", earnedOn: keeper, tier: 4 },
    { id: "refunds", name: "Clean month", how: "A month with no refunds", earnedOn: cleanMonth, tier: 3 },
    { id: "five-hundred", name: "500 members", how: "500 paying at once", earnedOn: firstWhere((i) => atEnd[i].size >= 500), tier: 5 },
  ];

  // Personal bests.
  const joinedByWeek = ends_.slice(0, -1).map((from) => tally(weekFacts(from, from + WEEK_MS)).joined);
  const records: GoalsData["records"] = [];
  if (weeklyCents > 0 || bestEndValue > 0) {
    const at = recordNow ? null : values.slice(1).indexOf(bestEndValue);
    records.push({ name: "Best week", value: Math.max(weeklyCents, bestEndValue), unit: "money", on: recordNow ? iso(thisMonday) : at !== null && at >= 0 ? iso(ends_[at]) : null, isNew: recordNow });
  }
  const mostJoined = Math.max(0, ...joinedByWeek);
  if (mostJoined > 0) records.push({ name: "Most joined in a week", value: mostJoined, unit: "count", on: iso(ends_[joinedByWeek.indexOf(mostJoined)]), isNew: false });
  if (best > 0) records.push({ name: "Longest streak", value: best, unit: "weeks", on: bestEnd > 0 ? iso(ends_[bestEnd]) : null, isNew: false });

  const nowDay = (now.getUTCDay() + 6) % 7;
  return {
    today: iso(t),
    week: iso(thisMonday),
    enoughOn,
    weeklyCents,
    growth,
    paceCents,
    paying: { monthly: byPeriod(nowPaying, "monthly").length, yearly: byPeriod(nowPaying, "yearly").length },
    carried: { members: carriedCount, weeklyCents: carriedCents },
    thisWeek: { joined: thisTally.joined, left: thisTally.left },
    steps,
    justReached,
    movers,
    lever,
    standStill: enough ? leftLast30 : null,
    releases,
    rating: { stars: input.rating?.stars ?? null, store: input.rating?.store ?? "Google Play", held: null },
    refunds: { count: monthTally.refunds, payments, low: monthTally.refunds <= Math.max(1, Math.floor(payments * 0.02)) },
    mix: {
      monthlyCents,
      yearlyCents,
      monthlyShareBefore: enough && beforeTotal > 0 ? byPeriod(monthAgo, "monthly").reduce((n, x) => n + x.weeklyCents, 0) / beforeTotal : null,
      leftMonthly,
      leftYearly,
      renewalOff: monthTally.renewalOff,
      cardFailed: monthTally.cardFailed,
      allMonthly: next && toGoNext > 0 ? membersFor(toGoNext, avgOf("monthly")) : null,
      allYearly: next && toGoNext > 0 ? membersFor(toGoNext, avgOf("yearly")) : null,
    },
    extra: input.extra,
    marks: [...input.marks],
    streak,
    daysLeft: 7 - nowDay,
    perfectWeeks,
    badges,
    records,
  };
}

/** The goals an email is for: reached within the last fortnight, so the first run never mails old news. */
export function goalsToMail(steps: readonly GoalStep[], now: Date, withinDays = 14): GoalStep[] {
  const since = now.getTime() - withinDays * DAY_MS;
  return steps.filter((s) => s.reachedOn !== null && Date.parse(`${s.reachedOn}T00:00:00Z`) >= since);
}
